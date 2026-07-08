import os
import re
import fitz  # PyMuPDF
import docx
from typing import Dict, Any, List

# Safe spaCy model loader
spacy_loaded = False
nlp = None
try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
        spacy_loaded = True
    except OSError:
        print("spaCy model 'en_core_web_sm' not found. Downloading...")
        import subprocess
        import sys
        try:
            subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"], check=True)
            nlp = spacy.load("en_core_web_sm")
            spacy_loaded = True
        except Exception as err:
            print(f"Failed to download spaCy model programmatically: {err}")
except ImportError:
    print("WARNING: spaCy package not installed. Running in mock/heuristic-only mode.")

EMAIL_REGEX = re.compile(r'[\w\.-]+@[\w\.-]+\.\w+')
PHONE_REGEX = re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')

def parse_pdf(file_path: str) -> str:
    """Extract text from PDF using PyMuPDF."""
    text = ""
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text()
    except Exception as e:
        print(f"Error parsing PDF {file_path}: {e}")
    return text

def parse_docx(file_path: str) -> str:
    """Extract text from DOCX using python-docx."""
    text = ""
    try:
        doc = docx.Document(file_path)
        fullText = []
        for para in doc.paragraphs:
            fullText.append(para.text)
        text = '\n'.join(fullText)
    except Exception as e:
        print(f"Error parsing DOCX {file_path}: {e}")
    return text

def extract_text(file_path: str) -> str:
    """Detect file type and parse."""
    _, ext = os.path.splitext(file_path.lower())
    if ext == '.pdf':
        return parse_pdf(file_path)
    elif ext in ['.docx', '.doc']:
        return parse_docx(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

def clean_text(text: str) -> str:
    """Perform basic text cleaning."""
    cleaned = re.sub(r'\s+', ' ', text)
    return cleaned.strip()

def extract_contact_info(text: str) -> Dict[str, Any]:
    """Extract email, phone, and name from text using regex and spaCy."""
    email_match = EMAIL_REGEX.search(text)
    email = email_match.group(0) if email_match else ""

    phone_match = PHONE_REGEX.search(text)
    phone = phone_match.group(0) if phone_match else ""

    name = ""
    if spacy_loaded and nlp:
        try:
            doc = nlp(text[:500])  # Scan the first 500 characters
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    name = ent.text
                    break
        except Exception as e:
            print(f"spaCy NER parsing error: {e}")
            
    if not name:
        # Fallback to the first line that has words
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            candidate = lines[0]
            if len(candidate.split()) <= 4 and not any(char.isdigit() for char in candidate):
                name = candidate
            else:
                name = "Candidate"
    
    return {
        "name": name,
        "email": email,
        "phone": phone
    }

def extract_skills_heuristic(text: str) -> List[str]:
    """Extract skills from a predefined keyword vocabulary."""
    vocab = [
        "python", "javascript", "typescript", "java", "c++", "c#", "ruby", "php", "go", "rust",
        "react", "angular", "vue", "next.js", "svelte", "express", "django", "fastapi", "flask",
        "spring", "laravel", "sql", "postgresql", "mysql", "mongodb", "redis", "cassandra",
        "html", "css", "tailwind", "bootstrap", "sass", "docker", "kubernetes", "aws", "azure", "gcp",
        "git", "github", "gitlab", "ci/cd", "jenkins", "terraform", "ansible", "linux", "nginx",
        "machine learning", "deep learning", "artificial intelligence", "natural language processing",
        "nlp", "computer vision", "tensorflow", "pytorch", "keras", "scikit-learn", "pandas",
        "numpy", "scipy", "llm", "rag", "langchain", "llama-index", "embeddings", "faiss", "vector db",
        "rest api", "graphql", "grpc", "microservices", "agile", "scrum", "project management"
    ]
    
    found_skills = []
    text_lower = text.lower()
    
    for skill in vocab:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill.title())
            
    return found_skills
