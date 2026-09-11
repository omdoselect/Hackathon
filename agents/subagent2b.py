import json
from utils.llm_client import call_llm


def load_candidate_profile():
    with open("data/candidate_profile.json", "r") as f:
        return json.load(f)


def run_subagent2b(job: dict, jd_analysis: dict) -> dict:
    print(f"\n    Sub-Agent 2B — Resume Tailoring")
    print(f"    Tailoring resume for {job['company']}...")

    # ── LOAD CANDIDATE PROFILE ──
    candidate = load_candidate_profile()
    resume = candidate['resume']

    prompt = f"""
    You are Sub-Agent 2B — Resume Tailoring Agent.

    You have received JD analysis from Sub-Agent 2A.
    Your job is to tailor the candidate resume
    specifically for this job.

    CANDIDATE PROFILE:
    Name: {candidate['name']}
    Current Title: {candidate['current_title']}
    Experience: {candidate['experience_years']} years
    Skills: {', '.join(candidate['skills'])}

    ORIGINAL RESUME:
    Summary: {resume['summary']}

    Work Experience:
    {json.dumps(resume['work_experience'], indent=2)}

    Projects:
    {json.dumps(resume['projects'], indent=2)}

    Certifications:
    {json.dumps(resume['certifications'], indent=2)}

    JD ANALYSIS FROM SUB-AGENT 2A:
    Company: {jd_analysis['company']}
    Role: {jd_analysis['role']}
    What Company Wants: {jd_analysis['jd_understanding']['what_company_wants']}
    Role Level: {jd_analysis['jd_understanding']['role_level']}
    Culture: {jd_analysis['jd_understanding']['culture_hints']}
    Tone: {jd_analysis['resume_focus']['tone']}

    Must Have Skills: {', '.join(jd_analysis['must_have_skills'])}
    Good To Have: {', '.join(jd_analysis['good_to_have_skills'])}
    ATS Keywords: {', '.join(jd_analysis['ats_keywords'])}
    Highlight These: {', '.join(jd_analysis['resume_focus']['highlight_these'])}
    Avoid These: {', '.join(jd_analysis['resume_focus']['avoid_these'])}

    YOUR TASK:
    Follow these steps internally:

    STEP 1 — ANALYSE GAPS:
    Compare candidate skills with must have skills.
    Find what is strong and what is missing.

    STEP 2 — REWRITE SUMMARY:
    Rewrite the summary section using:
    - ATS keywords from JD analysis
    - Tone matching the company culture
    - Highlighting what company wants
    Keep it 3-4 lines maximum.

    STEP 3 — REWRITE SKILLS:
    Reorder skills to put must have skills first.
    Add missing skills only if candidate
    genuinely has them in their experience.

    STEP 4 — REPHRASE EXPERIENCE BULLETS:
    For each work experience, rephrase
    1-2 bullet points using JD keywords.
    Never change company names or dates.
    Never fabricate experience.

    STEP 5 — HIGHLIGHT PROJECTS:
    Reorder projects to put most relevant first.
    Add JD keywords to project descriptions
    where they naturally fit.

    STRICT RULES:
    - Never change company names
    - Never change employment dates
    - Never add fake skills or experience
    - Never change education details
    - Keep everything truthful

    Return ONLY this complete JSON:
    {{
        "tailored_summary": "rewritten summary here",
        "tailored_skills": ["skill1", "skill2"],
        "tailored_experience": [
            {{
                "title": "MERN Stack Developer",
                "company": "TechNova Solutions",
                "years": 2.0,
                "original_description": "original text",
                "tailored_description": "rewritten text",
                "technologies": ["tech1", "tech2"]
            }}
        ],
        "tailored_projects": [
            {{
                "name": "project name",
                "original_description": "original text",
                "tailored_description": "rewritten text",
                "technologies": ["tech1", "tech2"]
            }}
        ],
        "changes_made": [
            "change 1 description",
            "change 2 description"
        ],
        "gap_analysis": {{
            "strong_matches": ["skill1", "skill2"],
            "missing_skills": ["skill1", "skill2"],
            "overall_fit": "strong/moderate/weak"
        }}
    }}

    JSON only. No markdown. No explanation.
    Think step by step but return only JSON.
    """

    print(f"      Sending resume + JD analysis to Gemini...")
    raw = call_llm(prompt)
    raw = raw.replace("```json", "").replace("```", "").strip()
    result = json.loads(raw)

    print(f"      ✓ Summary rewritten")
    print(f"      ✓ Skills reordered: {', '.join(result['tailored_skills'][:5])}...")
    print(f"      ✓ Experience rephrased")
    print(f"      ✓ Projects reordered")
    print(f"      ✓ Overall fit: {result['gap_analysis']['overall_fit']}")
    print(f"      ✓ Changes made: {len(result['changes_made'])}")
    for change in result['changes_made']:
        print(f"         - {change}")

    final_output = {
        "job_id": job['job_id'],
        "company": job['company'],
        "role": job['role'],
        "tailored_resume": {
            "summary": result['tailored_summary'],
            "skills": result['tailored_skills'],
            "work_experience": result['tailored_experience'],
            "projects": result['tailored_projects'],
            "certifications": candidate['resume']['certifications']
        },
        "changes_made": result['changes_made'],
        "gap_analysis": result['gap_analysis']
    }

    print(f"    ✓ Sub-Agent 2B Complete for {job['company']}")
    return final_output
