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

@app.get("/")
def read_root():
    return {
        "message": "Welcome to AI Resume Screener API",
        "status": "online",
        "gemini_configured": bool(settings.GEMINI_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
