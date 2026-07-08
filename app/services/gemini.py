import json
import re
import time
import google.generativeai as genai
from typing import Dict, Any, List
from app.config import settings

class GeminiService:
    def __init__(self):
        self._model = None
        self._initialized = False

    def _initialize(self):
        if not self._initialized:
            api_key = settings.GEMINI_API_KEY
            if not api_key:
                print("WARNING: GEMINI_API_KEY environment variable not set. Using dry-run mock mode.")
            else:
                genai.configure(api_key=api_key)
                self._model = genai.GenerativeModel("gemini-2.5-flash")
            self._initialized = True

    def get_model(self):
        self._initialize()
        return self._model

    def _call_gemini_json(self, prompt: str, system_instruction: str = None) -> Dict[str, Any]:
        """Calls Gemini API requesting JSON output, with retries and fallback."""
        model = self.get_model()
        if not model:
            return self._get_mock_response(prompt)

        max_retries = 3
        backoff = 1.0

        for attempt in range(max_retries):
            try:
                config = genai.types.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.2
                )
                
                kwargs = {"generation_config": config}
                full_prompt = prompt
                if system_instruction:
                    full_prompt = f"{system_instruction}\n\nUser Content:\n{prompt}"

                response = model.generate_content(full_prompt, **kwargs)
                text = response.text.strip()
                return json.loads(text)
            except Exception as e:
                print(f"Gemini API Error (Attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(backoff)
                    backoff *= 2
                else:
                    print("Gemini API failed all retries. Returning fallback structure.")
                    return self._get_mock_response(prompt)

    def analyze_candidate_resume(self, resume_text: str) -> Dict[str, Any]:
        """Generates comprehensive analysis of a single resume including advanced features."""
        system_instruction = (
            "You are an expert ATS parser, senior recruiter, and professional resume writer. "
            "Analyze the resume text and return a structured JSON response matching the required schema. "
            "Do not include any Markdown wrapping. Return pure JSON only."
        )

        prompt = f"""
        Extract details and evaluate the following resume:
        ---
        {resume_text}
        ---

        The output MUST be a valid JSON object matching this schema exactly:
        {{
            "name": "Candidate Name",
            "email": "Email Address",
            "phone": "Phone Number",
            "education": [
                {{"degree": "Degree/Major", "school": "University Name", "year": "Graduation Year"}}
            ],
            "experience": [
                {{"role": "Job Title", "company": "Company Name", "duration": "Dates", "description": "Key achievements"}}
            ],
            "projects": [
                {{"title": "Project Title", "description": "Details"}}
            ],
            "certifications": ["Cert 1"],
            "skills": ["Skill 1"],
            "ats_score": 75,
            "ats_explanation": "Structure and readability details.",
            "summary": "Professional summary of background.",
            
            // NEW SaaS Features
            "rewrite_suggestions": [
                {{"section": "Experience / Project Title", "original": "Original text line", "suggestion": "Suggested premium rephrasing", "reason": "Why this suggestion improves ATS score"}}
            ],
            "skill_gap_analysis": [
                {{"skill": "Skill name", "status": "Missing" or "Present", "demand_level": "High" or "Medium" or "Low"}}
            ],
            "learning_roadmap": [
                {{"step": 1, "topic": "Skill or Topic name", "actions": ["Action 1", "Action 2"], "timeline": "e.g. Weeks 1-2"}}
            ],
            "career_suggestions": [
                {{"title": "Recommended Job Title", "reason": "Alignment details", "fit_percentage": 85}}
            ],
            "salary_estimation": {{
                "low": 85000,
                "median": 105000,
                "high": 130000,
                "currency": "USD"
            }},
            "interview_difficulty": {{
                "level": "Easy" or "Medium" or "Hard",
                "reason": "Justification of this prediction based on depth of experience"
            }},
            "missing_skills": ["List", "of", "missing", "keywords"],
            "strengths": ["Strength 1"],
            "weaknesses": ["Weakness 1"],
            "improvements": ["Improvement 1"],
            "interview_questions": [
                {{"question": "Prep question", "suggested_answer": "Expected points"}}
            ],
            "cover_letter": "A standard tailored cover letter."
        }}
        """

        return self._call_gemini_json(prompt, system_instruction)

    def analyze_candidate_vs_job(self, resume_text: str, job_title: str, job_description: str, required_skills: str) -> Dict[str, Any]:
        """Compares a candidate resume against a specific Job Description."""
        system_instruction = (
            "You are an expert HR Director. You are evaluating a resume against a specific Job Description. "
            "Provide quantitative metrics and qualitative recommendation. "
            "Do not include any Markdown wrapping. Return pure JSON only."
        )

        prompt = f"""
        Compare the candidate's resume with the Job Description:

        Job Title: {job_title}
        Job Description: {job_description}
        Required Skills: {required_skills}

        Candidate Resume Text:
        ---
        {resume_text}
        ---

        The output MUST be a valid JSON object matching this schema exactly:
        {{
            "overall_score": 85, // Gemini estimate
            "similarity_score": 80, // Semantic match estimate
            "skill_match": 85, // percentage
            "experience_match": 90, // score
            "education_match": 75, // score
            "ats_score": 80, // score
            "recommendation": "Detailed quantitative fit analysis.",
            "recruiter_notes": "SaaS recruiter hiring assessment highlights. Specific points for interviewers to focus on, and potential reservations."
        }}
        """

        return self._call_gemini_json(prompt, system_instruction)

    def chat_with_resume(self, resume_text: str, chat_history: List[Dict[str, str]], new_message: str) -> str:
        """Acts as an AI career advisor discussing the user's resume."""
        model = self.get_model()
        if not model:
            return "Mock AI Career Coach: I see you uploaded a resume. Make sure to highlight Python and React skills!"

        # Construct conversational context
        history_formatted = ""
        for msg in chat_history:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_formatted += f"{role}: {msg['content']}\n"

        prompt = f"""
        You are an expert AI Career Coach. You have full access to the user's parsed resume details.
        
        Resume Content:
        ---
        {resume_text}
        ---

        Chat History:
        {history_formatted}
        
        New User Message: {new_message}
        
        Provide a helpful, professional, and encouraging response advising the user directly on their career, resume optimization, or interview prep. Keep it concise, actionable, and conversational.
        """
        
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Chat error: {e}")
            return "I apologize, but I encountered an error communicating with the AI model. Let me know if I can help you with anything else!"

    def compare_candidates_ai(self, job_title: str, job_description: str, resumes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Provides side-by-side candidate comparison matrix for recruiters."""
        system_instruction = (
            "You are a talent acquisition manager. Compare the uploaded candidate profiles side-by-side. "
            "Return a clean JSON comparison. Return pure JSON only."
        )

        candidates_data = ""
        for idx, r in enumerate(resumes):
            candidates_data += f"Candidate {idx+1} (ID: {r['id']}, Name: {r['name']}):\n{r['text'][:3000]}\n\n"

        prompt = f"""
        Compare the candidates for the position:
        Job Title: {job_title}
        Job Description: {job_description}

        Candidate Profiles:
        {candidates_data}

        The output MUST be a valid JSON object matching this schema exactly:
        {{
            "comparison_summary": "High-level summary of candidate matchups...",
            "candidates": [
                {{
                    "id": 1,
                    "name": "Alex Mercer",
                    "pros": ["Strong technical experience", "Solid cloud background"],
                    "cons": ["Lacks experience in React frontend"],
                    "suitability_verdict": "Best suited for core backend tasks."
                }}
            ],
            "verdict_ranking": "Candidate 1 ranked first because... followed by Candidate 2..."
        }}
        """

        return self._call_gemini_json(prompt, system_instruction)

    def _get_mock_response(self, prompt: str) -> Dict[str, Any]:
        """Provides a logical mock response with expanded SaaS properties."""
        if "verdict_ranking" in prompt:
            return {
                "comparison_summary": "Both candidates demonstrate strong technical profiles but Candidate A presents broader full-stack experience.",
                "candidates": [
                    {
                        "id": 1,
                        "name": "Alex Mercer",
                        "pros": ["4+ years backend FastAPI development", "Docker containerization deployment skills"],
                        "cons": ["Familiar with basic React, lacks commercial dashboard exposure"],
                        "suitability_verdict": "Excellent fit for backend API and devops integrations."
                    },
                    {
                        "id": 2,
                        "name": "Jane Smith",
                        "pros": ["Strong frontend styling React/TypeScript", "User experience focus"],
                        "cons": ["Limited database optimization work history"],
                        "suitability_verdict": "Great fit for user-facing panel design."
                    }
                ],
                "verdict_ranking": "Alex Mercer is recommended first due to deeper backend microservice architectural alignment, with Jane Smith as a close second for UI roles."
            }
        elif "overall_score" in prompt:
            return {
                "overall_score": 82,
                "similarity_score": 75,
                "skill_match": 80,
                "experience_match": 85,
                "education_match": 90,
                "ats_score": 80,
                "recommendation": "Interview: Candidate fits core educational requirements and has decent experience.",
                "recruiter_notes": "Ask candidate about backend optimization. Focus interview on Docker workflows and database transaction handling. Candidate is weak in testing frameworks."
            }
        else:
            return {
                "name": "Alex Mercer",
                "email": "alex.mercer@example.com",
                "phone": "+1 (555) 019-2834",
                "education": [
                    {"degree": "B.S. in Computer Science", "school": "State University", "year": "2020"}
                ],
                "experience": [
                    {"role": "Software Engineer", "company": "Tech Solutions Inc.", "duration": "2020 - Present", "description": "Developed web applications using React and FastAPI. Managed databases and deployed services using Docker."}
                ],
                "projects": [
                    {"title": "E-Commerce System", "description": "Created scalable inventory management system using FastAPI, PostgreSQL, and React."}
                ],
                "certifications": ["AWS Certified Solutions Architect"],
                "skills": ["Python", "FastAPI", "React", "TypeScript", "Docker", "SQL", "Git"],
                "ats_score": 82,
                "ats_explanation": "The resume has a clean single-column structure and standard font formatting, ensuring excellent parser compatibility.",
                "summary": "Motivated Software Engineer with 4+ years of experience in backend development and modern frontend frameworks.",
                "rewrite_suggestions": [
                    {
                        "section": "Software Engineer (Experience)",
                        "original": "Developed web applications using React and FastAPI.",
                        "suggestion": "Architected high-throughput responsive dashboards utilizing React and optimized FastAPI endpoints, accelerating rendering cycles by 15%.",
                        "reason": "Quantifies accomplishments and uses action verbs which rate higher in modern ATS algorithms."
                    }
                ],
                "skill_gap_analysis": [
                    {"skill": "React", "status": "Present", "demand_level": "High"},
                    {"skill": "FastAPI", "status": "Present", "demand_level": "High"},
                    {"skill": "Kubernetes", "status": "Missing", "demand_level": "High"},
                    {"skill": "CI/CD (GitHub Actions)", "status": "Missing", "demand_level": "Medium"}
                ],
                "learning_roadmap": [
                    {
                        "step": 1,
                        "topic": "CI/CD Pipelines",
                        "actions": ["Build a GitHub Actions workflow to run pytest", "Deploy Docker images automatically to Registry"],
                        "timeline": "Weeks 1-2"
                    },
                    {
                        "step": 2,
                        "topic": "Orchestration with Kubernetes",
                        "actions": ["Complete Minikube local routing tutorials", "Deploy multi-service compose files on local cluster"],
                        "timeline": "Weeks 3-5"
                    }
                ],
                "career_suggestions": [
                    {"title": "Full Stack Engineer", "reason": "Candidate has solid experience in both React and FastAPI.", "fit_percentage": 90},
                    {"title": "DevOps Engineer", "reason": "AWS Certifications combined with Docker usage supports transition to cloud ops.", "fit_percentage": 75}
                ],
                "salary_estimation": {
                    "low": 90000,
                    "median": 115000,
                    "high": 140000,
                    "currency": "USD"
                },
                "interview_difficulty": {
                    "level": "Medium",
                    "reason": "Core engineering components are present but cloud orchestration and automated testing questions will test depth of backend senior skills."
                },
                "missing_skills": ["Kubernetes", "CI/CD (GitHub Actions)"],
                "strengths": ["Strong FastAPI & React combinations", "Docker containerization experience"],
                "weaknesses": ["Lacks testing framework mentions", "No automated CI/CD keywords"],
                "improvements": ["Incorporate achievements metrics", "Detail cloud deployment workflows"],
                "interview_questions": [
                    {
                        "question": "Can you explain how you optimized e-commerce DB queries?",
                        "suggested_answer": "Discuss index setups, lazy loading adjustments in SQLAlchemy, and query profiles."
                    }
                ],
                "cover_letter": "Dear Hiring Manager,\n\nI am writing to express my strong interest in the Software Engineer position. With a B.S. in CS and 4 years experience building robust APIs with FastAPI and responsive frontends with React..."
            }

gemini_service = GeminiService()
