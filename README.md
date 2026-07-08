<div align="center">
  
  # 🔍 AI Resume Screener & Semantic Ranking Platform
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![FastAPI Core](https://img.shields.io/badge/FastAPI-0.111.0-emerald.svg?logo=fastapi&logoColor=white)](backend/requirements.txt)
  [![Vite Client](https://img.shields.io/badge/Vite-5.2.11-violet.svg?logo=vite&logoColor=white)](frontend/package.json)
  [![Google Gemini AI](https://img.shields.io/badge/Gemini--2.5--Flash-AI%20Engine-indigo.svg?logo=google&logoColor=white)](https://ai.google.dev/)
  [![Vector Search](https://img.shields.io/badge/FAISS--cpu-1.8.0-blue.svg)](backend/requirements.txt)

  An enterprise-grade, high-velocity AI talent screening and resume optimization portal.
</div>

---

## 📖 Project Overview
This platform serves as a modern applicant matching workspace, delivering dual-portal solutions for candidates seeking to bypass screening algorithms and recruiters filtering applicants at high volumes.

Traditional keyword matching systems fail because they ignore semantics. By combining **Sentence Transformers (`all-MiniLM-L6-v2`)**, **FAISS Vector Indexes**, and **Google Gemini 2.5 Flash API**, this application provides automated structured parsing, gap analysis, career suggestions, and a hybrid multi-weighted overall matching score.

---

## 🎯 Problem Statement & Solution

### The Problem
- **Recruiters**: Spending dozens of hours manually reviewing unaligned resumes, or relying on outdated keyword ATS tools that reject highly qualified candidates who lack exact phrase matches.
- **Candidates**: Submitting resumes into black-hole tracking systems with no insight into keyword gaps, formatting alignment, or styling incompatibilities.

### The Solution
- **Semantic Mapping**: Candidates are ranked by actual semantic compatibility of their skills and experience using high-density vector representation rather than text matches.
- **Background Scaling**: Resumes are parsed in the background via FastAPI workers, allowing recruiters to drag and drop hundreds of files at once without timing out.
- **Generative Refinement**: Candidates receive actionable rewrite recommendations, learning roadmaps, and career estimations, and can discuss their resume structure directly with an AI coach.

---

## 🚀 Advanced Features

### 👤 Candidate Dashboard
- **Resume Rewrite Assistant**: Provides section-by-section original vs. optimized phrasing comparisons with detail logs on why the rewrite performs better in ATS algorithms.
- **Skill Gap & Learning Roadmap**: Identifies present vs. missing technologies, detailing step-by-step actions and timelines to acquire missing items.
- **Career Directions & Salary Estimator**: Suggests suited roles, fit percentages, market salary brackets (Low, Median, High), and technical assessment difficulty ratings.
- **AI Career Coach Chatbot**: Offers a database-backed chat interface allowing candidates to discuss their resume optimization interactively.
- **Version Log History**: Uploads and compares multiple iterations of the same resume, tracking past formatting ATS scores.

### 💼 Recruiter Portal
- **Hybrid Matching Engine**: Scores candidates using a weighted formula:
  $$\text{Overall Fit} = (40\% \times \text{FAISS Vector Similarity}) + (25\% \times \text{Skills Match}) + (15\% \times \text{Experience Match}) + (10\% \times \text{Education Match}) + (10\% \times \text{ATS Score})$$
- **Bulk Screen Dropbox**: Process hundreds of files concurrently inside asynchronous FastAPI worker tasks.
- **Recruiter Notes Generator**: Produces summarized qualitative hiring highlights, candidate pros/cons, and recommended interview questions.
- **Side-by-Side Comparison Matrix**: Selects multiple profiles to review side-by-side technical fit, pros, cons, and final recruitment rank.
- **Analytics Dashboard**: Aggregates demographics including top present skills, common skill gaps, average ATS score, and distribution graphs.

---

## 🏗️ System Architecture & Workflows

### Complete Platform Architecture
```mermaid
graph TD
    User([User Client]) -->|HTTPS Requests| Frontend[React Single Page Application]
    
    subgraph Frontend Client
        Router[React Router & Protected Route Guards]
        State[Local Token & Theme Storage]
        UI[Glassmorphic SaaS Views]
        UI --> Router
    end
    
    Frontend -->|JWT Bearer Token| Gateway[FastAPI Router Gateway]
    
    subgraph FastAPI Backend Core
        Auth[JWT Token & Refresh Manager]
        Rate[Rate Limiting Middleware]
        Parser[PyMuPDF / docx Parser]
        Embed[Sentence Transformers Embedder]
        Vector[FAISS Index Engine]
        GeminiService[Gemini 2.5 Flash Client]
        BG[FastAPI BackgroundTasks Queue]
        
        Gateway --> Rate
        Rate --> Auth
        Auth --> Parser
        Parser --> Embed
        Embed --> Vector
        Parser --> GeminiService
        Gateway --> BG
    end
    
    subgraph Storage Layer
        DB[(SQLite / PostgreSQL DB)]
        Disk[(Local Uploads Storage)]
        FAISS_Store[(FAISS Index files)]
        
        DB <--> UserTable[Users & Refresh Tokens]
        DB <--> ResumeTable[Resumes & Versions]
        DB <--> MatchTable[Candidate Job Matches]
        DB <--> ChatTable[Chat History Log]
        
        Vector --> FAISS_Store
        Parser --> Disk
    end
```

### Resume Processing Pipeline
```mermaid
sequenceDiagram
    participant C as Recruiter / Candidate
    participant API as FastAPI Upload Router
    participant BG as Background Task Manager
    participant P as Document Parser
    participant FAISS as FAISS Indexer
    participant GEM as Gemini AI Client
    participant DB as SQL Database

    C->>API: Upload File(s) (PDF/DOCX)
    activate API
    API->>DB: Save Resume Row (Status: Processing)
    API->>API: Queue Background Processing Task
    API-->>C: Immediate Upload Success Response
    deactivate API
    
    activate BG
    BG->>P: Extract raw text from file
    P-->>BG: Raw Text Content
    BG->>FAISS: Generate Dense Embeddings & Update Index
    FAISS-->>BG: FAISS cosine similarity scores
    BG->>GEM: Request deep match details & career analytics
    GEM-->>BG: Matched Metrics & Recommendations JSON
    BG->>BG: Execute Multi-Weighted Hybrid Scoring
    BG->>DB: Update Resume & Match details (Status: Completed)
    deactivate BG
```

### Authentication Flow
```mermaid
sequenceDiagram
    participant User as React UI Client
    participant API as FastAPI Auth Router
    participant JWT as JWT & Passlib Service
    participant DB as SQL Database

    User->>API: Login credentials (Email, Password)
    API->>DB: Fetch user password hash
    DB-->>API: Password Hash
    API->>JWT: Verify plain password against hash
    JWT-->>API: Validated (True)
    API->>JWT: Generate Access Token (1 Day) & Refresh Token (7 Days)
    API->>DB: Save Refresh Token row
    API-->>User: JSON response (Access token, Refresh token, Role)
    
    Note over User, API: Token Expiration scenario
    User->>API: Request with Expired Access Token
    API-->>User: 401 Unauthorized Response
    User->>API: Request /refresh with Refresh Token
    API->>DB: Verify Refresh token exists & not revoked
    DB-->>API: Token validated
    API->>DB: Revoke old refresh token (Token Rotation)
    API->>JWT: Generate new Access & Refresh Token pair
    API->>DB: Save new Refresh Token
    API-->>User: JSON response (New Access & Refresh Token pair)
```

---

## 🗄️ Database ER Diagram
```mermaid
erDiagram
    users ||--o{ resumes : uploads
    users ||--o{ job_descriptions : creates
    users ||--o{ refresh_tokens : owns
    resumes ||--o{ candidate_job_matches : evaluated_in
    resumes ||--o{ chat_messages : chats
    job_descriptions ||--o{ candidate_job_matches : matches
    resumes ||--o{ resumes : "self-reference (parent_id)"

    users {
        int id PK
        string email UK
        string hashed_password
        string full_name
        string role "candidate / recruiter"
        datetime created_at
    }

    resumes {
        int id PK
        int user_id FK
        string filename
        string file_path
        string extracted_text
        json parsed_json "ATS, Gaps, Roadmap, Salary, Difficulty"
        int parent_id FK "self-reference for version history"
        int version_number
        boolean is_active
        datetime created_at
    }

    job_descriptions {
        int id PK
        int recruiter_id FK
        string title
        text description
        string required_skills
        int min_experience
        datetime created_at
    }

    candidate_job_matches {
        int id PK
        int job_id FK
        int resume_id FK
        float overall_score "Weighted Hybrid"
        float similarity_score "FAISS vector cosine score"
        float skill_match_score "Gemini parsed"
        float experience_match_score "Gemini parsed"
        float education_match_score "Gemini parsed"
        float ats_score "ATS optimization score"
        text ai_recommendation
        text recruiter_notes
        string status "Processing / Completed / Failed"
        datetime created_at
    }

    refresh_tokens {
        int id PK
        string token UK
        int user_id FK
        datetime expires_at
        boolean revoked
        datetime created_at
    }

    chat_messages {
        int id PK
        int resume_id FK
        string role "user / assistant"
        text content
        datetime created_at
    }
```

---

## 🔒 Security Features
- **Token Rotation**: Implements JWT Access and Refresh Tokens rotation policies, invalidating previous refresh tokens on new exchanges.
- **In-Memory Rate Limiting**: Gated API endpoints limit anonymous or active user IPs to 120 calls per minute to block DDoS attacks.
- **Input Sanitization**: Gated FastAPI schemas block SQL injection, cross-site scriptings, and execute string sanitization before saving records.
- **File Validation**: Strict file parser verification restricts mime types and extensions to only valid `.pdf` and `.docx` payloads.

---

## ⚡ Performance Optimizations
- **FastAPI Background Tasks**: Heavy parsing, embeddings indexing, and Gemini queries execute inside background worker threads, keeping HTTP response times under 300ms.
- **FAISS Cosine FlatIP index**: Dense 384-dimension vectors generated by `all-MiniLM-L6-v2` utilize L2-normalized embeddings, resolving similarities via flat inner product (cosine similarity) calculations under 5ms.
- **Client Code Splitting & Caching**: Vite splits major dashboards and Recharts panels into dynamically loaded modules. Access and refresh token configurations are cached in secure localStorage buffers.

---

## ⚙️ Environment Variables
Configure your variables inside a `.env` file located in the project root:
```env
# Gemini configuration
GEMINI_API_KEY=your_google_gemini_api_key_here

# Backend Database details
DATABASE_URL=sqlite:///./database/resume_screener.db

# JWT cryptography configuration
JWT_SECRET=supersecretjwtkeyforresumeanalysisapp
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Frontend configurations
VITE_API_URL=http://localhost:8000
```

---

## 🛠️ Installation & Setup

### Docker setup (Recommended)
Launch the application with Docker and Docker Compose:
```bash
# Build and run containers in detached mode
docker-compose up --build -d
```
Access the portals:
- **Frontend Dashboard**: http://localhost:5173
- **FastAPI OpenAPI Reference**: http://localhost:8000/docs

### Local manual installation

#### 1. Setup Backend Server
```bash
cd backend
python -m venv venv
source venv/bin/activate # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
python app/main.py
```

#### 2. Setup Frontend client
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing Suite
Execute the pytest suite to confirm system and database compilation:
```bash
cd backend
pytest tests/test_backend.py -v
```

---

## 🗺️ Roadmap
- [ ] Connect PostgreSQL adapter models for deployment scale.
- [ ] Integrate third-party email notifications (e.g. SendGrid) to auto-alert shortlisted candidates.
- [ ] Incorporate custom weights adjustments directly from the Recruiter matching dashboard.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
