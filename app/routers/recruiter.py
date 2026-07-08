import os
import shutil
import csv
import re
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.database.database import get_db, SessionLocal
from app.database.models import User, Resume, JobDescription, CandidateJobMatch
from app.services.auth import get_current_recruiter, get_current_user, verify_rate_limit
from app.services.parser import extract_text, extract_contact_info, extract_skills_heuristic
from app.services.embedding import embedding_service
from app.services.gemini import gemini_service
from app.services.pdf_generator import generate_recruiter_report_pdf

router = APIRouter(prefix="/api/recruiter", tags=["Recruiter Portal"], dependencies=[Depends(verify_rate_limit)])

# Pydantic Schemas
class JobCreate(BaseModel):
    title: str
    description: str
    required_skills: Optional[str] = ""
    min_experience: Optional[int] = 0

class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    required_skills: str
    min_experience: int
    created_at: Any

    class Config:
        from_attributes = True

def process_resumes_background(job_id: int, recruiter_id: int, resumes_data: List[Dict[str, Any]]):
    """
    Background Task executing text embedding, FAISS indexing, Gemini comparison, 
    and hybrid score calculation. Avoids blocking client request thread.
    """
    db = SessionLocal()
    try:
        job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
        if not job:
            return

        # Prepare list for FAISS index build
        saved_resumes = [{"resume_id": r["resume_id"], "text": r["text"]} for r in resumes_data]
        
        # Build/Update FAISS Index
        try:
            embedding_service.create_and_save_index(job_id, saved_resumes)
        except Exception as e:
            print(f"Background FAISS index creation error: {e}")

        # Search FAISS index to get cosine similarity scores
        similarity_matches = {}
        try:
            search_res = embedding_service.search_index(job_id, job.description, k=len(saved_resumes))
            for r_id, score in search_res:
                # normalize score from [0, 1] to [0, 100] percentage range
                similarity_matches[r_id] = min(max(int(score * 100), 0), 100)
        except Exception as e:
            print(f"Background FAISS search error: {e}")

        # Process each resume via Gemini & apply hybrid scoring formula
        for r_item in resumes_data:
            r_id = r_item["resume_id"]
            r_text = r_item["text"]
            
            # Fetch match entry
            match_entry = db.query(CandidateJobMatch).filter(
                CandidateJobMatch.job_id == job_id,
                CandidateJobMatch.resume_id == r_id
            ).first()

            if not match_entry:
                continue

            similarity_pct = similarity_matches.get(r_id, 50)

            try:
                # Gemini comparison
                gemini_res = gemini_service.analyze_candidate_vs_job(
                    resume_text=r_text,
                    job_title=job.title,
                    job_description=job.description,
                    required_skills=job.required_skills
                )
                
                skill_m = gemini_res.get("skill_match", 50)
                exp_m = gemini_res.get("experience_match", 50)
                edu_m = gemini_res.get("education_match", 50)
                ats = gemini_res.get("ats_score", 50)
                recomm = gemini_res.get("recommendation", "")
                rec_notes = gemini_res.get("recruiter_notes", "")
                
                # Hybrid Overall Score Weight calculation:
                # Semantic Similarity: 40%
                # Skills: 25%
                # Experience: 15%
                # Education: 10%
                # ATS: 10%
                overall = (
                    (similarity_pct * 0.40) + 
                    (skill_m * 0.25) + 
                    (exp_m * 0.15) + 
                    (edu_m * 0.10) + 
                    (ats * 0.10)
                )
                
            except Exception as e:
                print(f"Background Gemini evaluation error: {e}")
                overall = similarity_pct
                skill_m = 50
                exp_m = 50
                edu_m = 50
                ats = 50
                recomm = "AI evaluation timed out. Rankings based on embedding cosine similarity."
                rec_notes = "Error executing automated qualitative assessment."

            match_entry.overall_score = round(overall, 1)
            match_entry.similarity_score = similarity_pct
            match_entry.skill_match_score = skill_m
            match_entry.experience_match_score = exp_m
            match_entry.education_match_score = edu_m
            match_entry.ats_score = ats
            match_entry.ai_recommendation = recomm
            match_entry.recruiter_notes = rec_notes
            match_entry.status = "Completed"
            
            db.commit()

    except Exception as e:
        print(f"Fatal background execution exception: {e}")
        # Mark remaining as Failed
        for r_item in resumes_data:
            r_id = r_item["resume_id"]
            db.query(CandidateJobMatch).filter(
                CandidateJobMatch.job_id == job_id,
                CandidateJobMatch.resume_id == r_id
            ).update({"status": "Failed"})
            db.commit()
    finally:
        db.close()


@router.post("/job", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    db_job = JobDescription(
        recruiter_id=current_user.id,
        title=job_in.title,
        description=job_in.description,
        required_skills=job_in.required_skills,
        min_experience=job_in.min_experience
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("/jobs", response_model=List[JobResponse])
def get_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    return db.query(JobDescription).filter(JobDescription.recruiter_id == current_user.id).order_by(JobDescription.created_at.desc()).all()

@router.get("/job/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/job/{job_id}/upload-resumes")
def upload_resumes_for_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    resumes_to_process = []
    job_upload_dir = os.path.join(settings.UPLOAD_DIR, f"job_{job_id}")
    os.makedirs(job_upload_dir, exist_ok=True)

    for file in files:
        filename = file.filename
        _, ext = os.path.splitext(filename.lower())
        if ext not in [".pdf", ".docx"]:
            continue 

        file_path = os.path.join(job_upload_dir, filename)
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            print(f"Error saving {filename}: {e}")
            continue

        try:
            text = extract_text(file_path)
            if not text.strip():
                continue
        except Exception as e:
            print(f"Error parsing {filename}: {e}")
            if os.path.exists(file_path):
                os.remove(file_path)
            continue

        # Heuristic initial details
        contact_info = extract_contact_info(text)
        skills = extract_skills_heuristic(text)
        
        parsed_data = {
            "name": contact_info["name"] or filename.split(".")[0],
            "email": contact_info["email"],
            "phone": contact_info["phone"],
            "skills": skills,
            "education": [],
            "experience": []
        }

        # Create active Resume entry
        db_resume = Resume(
            user_id=current_user.id,
            filename=filename,
            file_path=file_path,
            extracted_text=text,
            parsed_json=parsed_data
        )
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)

        # Create Match row with status="Processing"
        match_entry = CandidateJobMatch(
            job_id=job.id,
            resume_id=db_resume.id,
            status="Processing"
        )
        db.add(match_entry)
        db.commit()

        resumes_to_process.append({
            "resume_id": db_resume.id,
            "text": text
        })

    if not resumes_to_process:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to save or process any resumes."
        )

    # Dispatch to background executor
    background_tasks.add_task(
        process_resumes_background,
        job_id=job.id,
        recruiter_id=current_user.id,
        resumes_data=resumes_to_process
    )
    
    return {"message": f"Successfully queued {len(resumes_to_process)} resumes for background processing."}

@router.get("/job/{job_id}/rankings")
def get_job_rankings(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    matches = db.query(CandidateJobMatch).filter(CandidateJobMatch.job_id == job_id).all()
    
    results = []
    for m in matches:
        resume = m.resume
        results.append({
            "match_id": m.id,
            "resume_id": resume.id,
            "name": resume.parsed_json.get("name", resume.filename),
            "email": resume.parsed_json.get("email", ""),
            "filename": resume.filename,
            "status": m.status,
            "overall_score": m.overall_score,
            "similarity_score": m.similarity_score,
            "skill_match": m.skill_match_score,
            "experience_match": m.experience_match_score,
            "education_match": m.education_match_score,
            "ats_score": m.ats_score,
            "recommendation": m.ai_recommendation,
            "recruiter_notes": m.recruiter_notes,
            "skills": resume.parsed_json.get("skills", [])
        })
        
    results.sort(key=lambda x: x["overall_score"], reverse=True)
    return results

@router.get("/job/{job_id}/compare-candidates")
def compare_candidates(
    job_id: int,
    resume_ids: str,  # comma-separated string e.g. "1,2"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    # Verify job details
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    ids_list = []
    try:
        ids_list = [int(i.strip()) for i in resume_ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resume ID list format")

    if len(ids_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 resume IDs for comparison")

    resumes = db.query(Resume).filter(Resume.id.in_(ids_list)).all()
    if len(resumes) != len(ids_list):
        raise HTTPException(status_code=404, detail="One or more candidate resumes not found")

    # Format data for AI
    payload = [{
        "id": r.id,
        "name": r.parsed_json.get("name", r.filename),
        "text": r.extracted_text or ""
    } for r in resumes]

    # Compare via Gemini
    comparison_res = gemini_service.compare_candidates_ai(
        job_title=job.title,
        job_description=job.description,
        resumes=payload
    )

    return comparison_res

@router.get("/job/{job_id}/analytics")
def get_job_analytics(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    matches = db.query(CandidateJobMatch).filter(
        CandidateJobMatch.job_id == job_id,
        CandidateJobMatch.status == "Completed"
    ).all()

    if not matches:
        return {
            "average_ats": 0.0,
            "hiring_funnel": {"Strong Hire": 0, "Interview": 0, "Reject": 0},
            "top_skills": [],
            "missing_skills": [],
            "experience_dist": {"0-2 years": 0, "3-5 years": 0, "6-9 years": 0, "10+ years": 0},
            "education_dist": {"B.S.": 0, "M.S.": 0, "PhD": 0, "Other": 0}
        }

    total_ats = 0.0
    hiring_funnel = {"Strong Hire": 0, "Interview": 0, "Reject": 0}
    skills_map = {}
    missing_map = {}
    
    exp_dist = {"0-2 years": 0, "3-5 years": 0, "6-9 years": 0, "10+ years": 0}
    edu_dist = {"B.S.": 0, "M.S.": 0, "PhD": 0, "Other": 0}

    for m in matches:
        resume = m.resume
        total_ats += m.ats_score
        
        # hiring funnel category from recommendation text
        rec_text = (m.ai_recommendation or "").lower()
        if "strong hire" in rec_text:
            hiring_funnel["Strong Hire"] += 1
        elif "reject" in rec_text or "not recommended" in rec_text:
            hiring_funnel["Reject"] += 1
        else:
            hiring_funnel["Interview"] += 1

        # skills breakdown
        p_json = resume.parsed_json or {}
        for skill in p_json.get("skills", []):
            skills_map[skill] = skills_map.get(skill, 0) + 1
            
        for skill in p_json.get("missing_skills", []):
            missing_map[skill] = missing_map.get(skill, 0) + 1

        # heuristic experience mapping from min_experience / overall experience
        # Parse years of experience from description text or project scopes
        desc_text = (resume.extracted_text or "").lower()
        years_found = re.findall(r'(\d+)\+?\s*years?\s*experience', desc_text)
        years = int(years_found[0]) if years_found else 0
        
        if years <= 2:
            exp_dist["0-2 years"] += 1
        elif years <= 5:
            exp_dist["3-5 years"] += 1
        elif years <= 9:
            exp_dist["6-9 years"] += 1
        else:
            exp_dist["10+ years"] += 1

        # education categories
        edu_str = " ".join([e.get("degree", "") for e in p_json.get("education", [])]).lower()
        if "phd" in edu_str or "doctor" in edu_str:
            edu_dist["PhD"] += 1
        elif "master" in edu_str or "m.s." in edu_str or "ms " in edu_str:
            edu_dist["M.S."] += 1
        elif "bachelor" in edu_str or "b.s." in edu_str or "bs " in edu_str:
            edu_dist["B.S."] += 1
        else:
            edu_dist["Other"] += 1

    # sort and slice top 10
    top_skills = [{"name": k, "count": v} for k, v in sorted(skills_map.items(), key=lambda x: x[1], reverse=True)[:10]]
    missing_skills = [{"name": k, "count": v} for k, v in sorted(missing_map.items(), key=lambda x: x[1], reverse=True)[:10]]

    return {
        "average_ats": round(total_ats / len(matches), 1),
        "hiring_funnel": hiring_funnel,
        "top_skills": top_skills,
        "missing_skills": missing_skills,
        "experience_dist": exp_dist,
        "education_dist": edu_dist
    }

@router.delete("/job/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    db.delete(job)
    db.commit()
    return {"message": "Job description and associated rankings deleted successfully"}

# Export Features
@router.get("/job/{job_id}/download/csv")
def download_rankings_csv(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    matches = db.query(CandidateJobMatch).filter(CandidateJobMatch.job_id == job_id).all()
    sorted_matches = sorted(matches, key=lambda x: x.overall_score, reverse=True)
    
    f = StringIO()
    writer = csv.writer(f)
    writer.writerow([
        "Rank", "Candidate Name", "Email", "Resume Filename",
        "Overall Score", "Embeddings Similarity", "Skill Match",
        "Experience Match", "Education Match", "ATS Score", "AI Recommendation"
    ])
    
    for idx, m in enumerate(sorted_matches):
        resume = m.resume
        name = resume.parsed_json.get("name", resume.filename)
        email = resume.parsed_json.get("email", "")
        
        writer.writerow([
            idx + 1,
            name,
            email,
            resume.filename,
            f"{m.overall_score}%",
            f"{m.similarity_score}%",
            f"{m.skill_match_score}%",
            f"{m.experience_match_score}%",
            f"{m.education_match_score}%",
            f"{m.ats_score}%",
            m.ai_recommendation
        ])
        
    f.seek(0)
    output = f.getvalue()
    filename = f"Rankings_{job.title.replace(' ', '_')}.csv"
    
    return StreamingResponse(
        iter([output]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/job/{job_id}/download/pdf")
def download_rankings_pdf(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.recruiter_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    matches = db.query(CandidateJobMatch).filter(CandidateJobMatch.job_id == job_id).all()
    
    records = []
    for m in matches:
        resume = m.resume
        records.append({
            "name": resume.parsed_json.get("name", resume.filename),
            "email": resume.parsed_json.get("email", ""),
            "overall_score": m.overall_score,
            "similarity_score": m.similarity_score,
            "skill_match": m.skill_match_score,
            "experience_match": m.experience_match_score,
            "education_match": m.education_match_score
        })
        
    records.sort(key=lambda x: x["overall_score"], reverse=True)
    
    buffer = generate_recruiter_report_pdf(job.title, records)
    filename = f"Rankings_{job.title.replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
