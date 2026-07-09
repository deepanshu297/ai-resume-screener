import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.database import engine, Base
from app.routers import auth, candidate, recruiter
from app.config import settings

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Resume Screener API",
    description="Backend services for parsing, evaluating, and ranking resumes using AI and FAISS embeddings.",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(candidate.router)
app.include_router(recruiter.router)

from fastapi.responses import FileResponse
from fastapi import HTTPException

@app.get("/download-project-zip")
def download_project_zip():
    zip_path = "C:/Users/Admin/.gemini/antigravity/scratch/ai-resume-screener.zip"
    if os.path.exists(zip_path):
        return FileResponse(zip_path, filename="ai-resume-screener.zip", media_type="application/zip")
    raise HTTPException(status_code=404, detail="Zip file not found")

@app.get("/")
def read_root():
    return {
        "message": "Welcome to AI Resume Screener API",
        "status": "online",
        "gemini_configured": bool(settings.GEMINI_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
