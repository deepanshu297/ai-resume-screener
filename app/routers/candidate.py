import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.database.database import get_db
from app.database.models import User, Resume, ChatMessage
from app.services.auth import get_current_candidate, get_current_user, verify_rate_limit
from app.services.parser import extract_text, extract_contact_info, extract_skills_heuristic
from app.services.gemini import gemini_service
from app.services.pdf_generator import (
    generate_ats_report_pdf,
    generate_resume_summary_pdf,
    generate_cover_letter_pdf
)
from app.config import settings

router = APIRouter(prefix="/api/candidate", tags=["Candidate Portal"], dependencies=[Depends(verify_rate_limit)])

class ChatRequest(BaseModel):
    message: str

@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate)
):
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Only PDF and DOCX files are allowed."
        )

    user_upload_dir = os.path.join(settings.UPLOAD_DIR, f"user_{current_user.id}")
    os.makedirs(user_upload_dir, exist_ok=True)
    
    file_path = os.path.join(user_upload_dir, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save upload: {e}"
        )

    # Parse and extract text
    try:
        raw_text = extract_text(file_path)
        if not raw_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract text from the document."
            )
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed parsing file contents: {e}"
        )

    # Process details using spaCy + Gemini
    try:
        contact_info = extract_contact_info(raw_text)
        analysis = gemini_service.analyze_candidate_resume(raw_text)
        
        # Merge heuristics fallback
        for k in ["name", "email", "phone"]:
            if not analysis.get(k) and contact_info.get(k):
                analysis[k] = contact_info[k]

        h_skills = extract_skills_heuristic(raw_text)
        g_skills = analysis.get("skills", [])
        combined_skills = list(set(g_skills + h_skills))
        analysis["skills"] = combined_skills
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI evaluation failed: {e}"
        )

    # Version Tracking check
    # Check if a resume with this filename already exists for this candidate
    existing_resume = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.filename == filename,
        Resume.parent_id == None
    ).first()

    parent_id = None
    version_number = 1

    if existing_resume:
        # Find latest version child or parent
        latest_child = db.query(Resume).filter(
            Resume.parent_id == existing_resume.id
        ).order_by(Resume.version_number.desc()).first()
        
        parent_id = existing_resume.id
        if latest_child:
            version_number = latest_child.version_number + 1
        else:
            version_number = 2
            
        # Deactivate old active files
        db.query(Resume).filter(
            Resume.user_id == current_user.id,
            Resume.filename == filename
        ).update({"is_active": False})

    # Save to database
    db_resume = Resume(
        user_id=current_user.id,
        filename=filename,
        file_path=file_path,
        extracted_text=raw_text,
        parsed_json=analysis,
        parent_id=parent_id,
        version_number=version_number,
        is_active=True
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    
    return {
        "message": "Resume uploaded and analyzed successfully",
        "resume_id": db_resume.id,
        "filename": db_resume.filename,
        "version": db_resume.version_number,
        "analysis": db_resume.parsed_json
    }

@router.get("/resumes")
def get_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate)
):
    # Only list active (latest version) resumes on primary dashboard lists
    resumes = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.is_active == True
    ).order_by(Resume.created_at.desc()).all()
    
    results = []
    for r in resumes:
        results.append({
            "id": r.id,
            "filename": r.filename,
            "created_at": r.created_at,
            "ats_score": r.parsed_json.get("ats_score", 0) if r.parsed_json else 0,
            "name": r.parsed_json.get("name", "Unknown") if r.parsed_json else "Unknown",
            "email": r.parsed_json.get("email", "") if r.parsed_json else "",
            "version_number": r.version_number
        })
    return results

@router.get("/resume/{resume_id}")
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if current_user.role == "candidate" and resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this resume")
        
    return {
        "id": resume.id,
        "filename": resume.filename,
        "created_at": resume.created_at,
        "version_number": resume.version_number,
        "parent_id": resume.parent_id,
        "analysis": resume.parsed_json
    }

@router.get("/resume/{resume_id}/versions")
def get_resume_versions(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # The root parent is either the resume itself (if parent_id is null) or the parent_id row
    root_id = resume.id if not resume.parent_id else resume.parent_id
    
    versions = db.query(Resume).filter(
        Resume.user_id == current_user.id,
        (Resume.id == root_id) | (Resume.parent_id == root_id)
    ).order_by(Resume.version_number.desc()).all()

    return [{
        "id": v.id,
        "version_number": v.version_number,
        "filename": v.filename,
        "created_at": v.created_at,
        "ats_score": v.parsed_json.get("ats_score", 0) if v.parsed_json else 0,
        "is_active": v.is_active
    } for v in versions]

@router.delete("/resume/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Delete local file
    if os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except Exception as e:
            print(f"Error deleting file {resume.file_path}: {e}")
            
    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted successfully"}

# Chatbot Assistant endpoints
@router.get("/resume/{resume_id}/chat-history")
def get_chat_history(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    history = db.query(ChatMessage).filter(ChatMessage.resume_id == resume.id).order_by(ChatMessage.created_at.asc()).all()
    return [{"role": msg.role, "content": msg.content, "created_at": msg.created_at} for msg in history]

@router.post("/resume/{resume_id}/chat")
def chat_assistant(
    resume_id: int,
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_candidate)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Get recent messages history
    history = db.query(ChatMessage).filter(ChatMessage.resume_id == resume.id).order_by(ChatMessage.created_at.desc()).limit(10).all()
    # Reverse so they are chronologically correct
    history = history[::-1]
    
    chat_list = [{"role": m.role, "content": m.content} for m in history]

    # Save user message
    user_msg = ChatMessage(resume_id=resume.id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()

    # Call Gemini Coach
    coach_reply = gemini_service.chat_with_resume(
        resume_text=resume.extracted_text or "",
        chat_history=chat_list,
        new_message=request.message
    )

    # Save coach message
    coach_msg = ChatMessage(resume_id=resume.id, role="assistant", content=coach_reply)
    db.add(coach_msg)
    db.commit()

    return {"reply": coach_reply}

# PDF Downloads
@router.get("/resume/{resume_id}/download/ats")
def download_ats_report(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if current_user.role == "candidate" and resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    buffer = generate_ats_report_pdf(resume.parsed_json)
    filename = f"ATS_Report_{resume.filename.split('.')[0]}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/resume/{resume_id}/download/summary")
def download_summary(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if current_user.role == "candidate" and resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    buffer = generate_resume_summary_pdf(resume.parsed_json)
    filename = f"Summary_{resume.filename.split('.')[0]}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/resume/{resume_id}/download/cover-letter")
def download_cover_letter(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if current_user.role == "candidate" and resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    buffer = generate_cover_letter_pdf(resume.parsed_json)
    filename = f"Cover_Letter_{resume.filename.split('.')[0]}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
