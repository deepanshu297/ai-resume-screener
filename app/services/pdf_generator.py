from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from typing import Dict, Any, List
import io

def build_pdf_buffer(story: list) -> io.BytesIO:
    """Build PDF from story elements and return as BytesIO buffer."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_ats_report_pdf(resume_data: Dict[str, Any]) -> io.BytesIO:
    """Generate a premium ATS Report PDF for candidate."""
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#1E1B4B'), # Dark indigo
        spaceAfter=15
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#4F46E5'), # Indigo
        spaceAfter=15
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#1E293B'), # Slate 800
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'), # Slate 700
        spaceAfter=8
    )
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=5
    )
    
    story = []
    
    # Header
    name = resume_data.get('name', 'Candidate')
    story.append(Paragraph(f"ATS Optimization Report", title_style))
    story.append(Paragraph(f"Prepared for: <b>{name}</b>", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Score Section Table
    score = resume_data.get('ats_score', 0)
    score_color = '#10B981' if score >= 80 else ('#F59E0B' if score >= 60 else '#EF4444')
    
    score_html = f"<font size='48' color='{score_color}'><b>{score}</b></font><font size='18' color='#64748B'> / 100</font>"
    score_p = Paragraph(score_html, ParagraphStyle('ScoreP', alignment=TA_CENTER))
    
    explanation_p = Paragraph(
        f"<b>ATS Analysis Summary:</b><br/>{resume_data.get('ats_explanation', 'No explanation provided.')}",
        body_style
    )
    
    data = [[score_p, explanation_p]]
    table = Table(data, colWidths=[150, 380])
    table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
    ]))
    story.append(table)
    story.append(Spacer(1, 20))
    
    # Strengths
    story.append(Paragraph("Key Resume Strengths", h1_style))
    for strg in resume_data.get('strengths', []):
        story.append(Paragraph(f"• {strg}", bullet_style))
    story.append(Spacer(1, 10))
    
    # Weaknesses
    story.append(Paragraph("Areas of Improvement & Weaknesses", h1_style))
    for weak in resume_data.get('weaknesses', []):
        story.append(Paragraph(f"• {weak}", bullet_style))
    story.append(Spacer(1, 10))
    
    # Missing Skills
    story.append(Paragraph("Detected Missing Industry-Standard Keywords/Skills", h1_style))
    missing = resume_data.get('missing_skills', [])
    if missing:
        story.append(Paragraph(", ".join(missing), body_style))
    else:
        story.append(Paragraph("None detected! Your skill set aligns perfectly with standard ATS templates.", body_style))
    story.append(Spacer(1, 10))
    
    # Improvement Action plan
    story.append(Paragraph("Actionable Recommendations", h1_style))
    for imp in resume_data.get('improvements', []):
        story.append(Paragraph(f"<b>Recommendation:</b> {imp}", bullet_style))
        
    return build_pdf_buffer(story)

def generate_resume_summary_pdf(resume_data: Dict[str, Any]) -> io.BytesIO:
    """Generate Candidate Resume Summary Profile PDF."""
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E1B4B'),
        spaceAfter=5
    )
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=15
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#4F46E5'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )
    
    story = []
    
    # Profile Name
    name = resume_data.get('name', 'Candidate Profile')
    story.append(Paragraph(name, title_style))
    
    # Contact Info Meta
    email = resume_data.get('email', '')
    phone = resume_data.get('phone', '')
    meta_parts = []
    if email: meta_parts.append(f"Email: {email}")
    if phone: meta_parts.append(f"Phone: {phone}")
    story.append(Paragraph(" | ".join(meta_parts), meta_style))
    
    # Professional Summary
    story.append(Paragraph("Professional Summary", h1_style))
    story.append(Paragraph(resume_data.get('summary', 'No summary generated.'), body_style))
    story.append(Spacer(1, 10))
    
    # Skills
    story.append(Paragraph("Key Skills", h1_style))
    skills = resume_data.get('skills', [])
    if skills:
        story.append(Paragraph(", ".join(skills), body_style))
    story.append(Spacer(1, 10))
    
    # Experience
    story.append(Paragraph("Professional Experience", h1_style))
    experience = resume_data.get('experience', [])
    for exp in experience:
        role = exp.get('role', 'Developer')
        company = exp.get('company', 'Company')
        duration = exp.get('duration', '')
        desc = exp.get('description', '')
        
        story.append(Paragraph(f"<b>{role}</b> at {company} ({duration})", body_style))
        story.append(Paragraph(desc, ParagraphStyle('DescStyle', parent=body_style, leftIndent=10, fontSize=9, leading=12)))
        story.append(Spacer(1, 5))
        
    # Education
    story.append(Paragraph("Education", h1_style))
    education = resume_data.get('education', [])
    for edu in education:
        degree = edu.get('degree', 'Degree')
        school = edu.get('school', 'School')
        year = edu.get('year', '')
        story.append(Paragraph(f"<b>{degree}</b> - {school} ({year})", body_style))
        
    return build_pdf_buffer(story)

def generate_cover_letter_pdf(resume_data: Dict[str, Any]) -> io.BytesIO:
    """Generate Cover Letter PDF."""
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E1B4B'),
        spaceAfter=15
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=12
    )
    
    story = []
    story.append(Paragraph("Tailored Cover Letter", title_style))
    story.append(Spacer(1, 10))
    
    cl_text = resume_data.get('cover_letter', '')
    if not cl_text:
        cl_text = "Dear Hiring Manager,\n\n[Please upload your resume to generate a cover letter]"
        
    # Format line breaks
    for block in cl_text.split('\n'):
        if block.strip():
            story.append(Paragraph(block.strip(), body_style))
        else:
            story.append(Spacer(1, 6))
            
    return build_pdf_buffer(story)

def generate_recruiter_report_pdf(job_title: str, matches: List[Dict[str, Any]]) -> io.BytesIO:
    """Generates Recruiter ranking comparison PDF report."""
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E1B4B'),
        spaceAfter=5
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=20
    )
    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )
    td_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )
    td_bold_style = ParagraphStyle(
        'TableCellBold',
        parent=td_style,
        fontName='Helvetica-Bold'
    )
    
    story = []
    story.append(Paragraph("Candidate Screening & Ranking Report", title_style))
    story.append(Paragraph(f"Target Job: <b>{job_title}</b> | Candidates Ranked: {len(matches)}", subtitle_style))
    
    # Table headers
    headers = [
        Paragraph("Rank", th_style),
        Paragraph("Name & Contact", th_style),
        Paragraph("Overall Match", th_style),
        Paragraph("Similarity", th_style),
        Paragraph("Skills", th_style),
        Paragraph("Exp Match", th_style),
        Paragraph("Edu Match", th_style)
    ]
    
    table_data = [headers]
    
    for idx, match in enumerate(matches):
        rank = str(idx + 1)
        name = match.get('name', 'Candidate')
        email = match.get('email', '')
        contact_info = f"<b>{name}</b><br/><font color='#64748B' size='8'>{email}</font>"
        
        table_data.append([
            Paragraph(rank, td_bold_style),
            Paragraph(contact_info, td_style),
            Paragraph(f"{int(match.get('overall_score', 0))}%", td_bold_style),
            Paragraph(f"{int(match.get('similarity_score', 0))}%", td_style),
            Paragraph(f"{int(match.get('skill_match', 0))}%", td_style),
            Paragraph(f"{int(match.get('experience_match', 0))}%", td_style),
            Paragraph(f"{int(match.get('education_match', 0))}%", td_style)
        ])
        
    # Table styling
    col_widths = [40, 150, 80, 65, 65, 65, 65]
    table = Table(table_data, colWidths=col_widths)
    
    table_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4F46E5')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ])
    table.setStyle(table_style)
    
    story.append(table)
    
    return build_pdf_buffer(story)
