import json
from utils.llm_client import call_llm


def run_subagent2a(job: dict) -> dict:
    print(f"\n    Sub-Agent 2A — JD Analysis")
    print(f"    Analysing JD for {job['company']}...")

    prompt = f"""
    You are Sub-Agent 2A — JD Analysis Agent.

    You will analyse this job description
    step by step internally and return
    a complete analysis.

    JOB DETAILS:
    {json.dumps(job, indent=2)}

    Follow these steps internally:

    STEP 1 — UNDERSTAND THE JD:
    Read the full JD carefully.
    Understand what the company truly wants.
    Identify the role level and work culture.

    STEP 2 — EXTRACT SKILLS:
    Based on your Step 1 understanding,
    identify which skills are absolutely
    mandatory vs nice to have.

    STEP 3 — EXTRACT ATS KEYWORDS:
    Based on the JD text, identify exact
    keywords an ATS system would scan for.
    Include technical terms, tools, and
    methodologies mentioned in the JD.

    STEP 4 — IDENTIFY RESUME FOCUS:
    What must a resume highlight to
    impress this specific company?
    What should be avoided?

    Now return ONLY this complete JSON:
    {{
        "jd_understanding": {{
            "what_company_wants": "core goal of role",
            "role_level": "junior/mid/senior",
            "culture_hints": "work culture hints",
            "jd_summary": "2 line summary of role"
        }},
        "skills": {{
            "must_have": ["skill1", "skill2"],
            "good_to_have": ["skill1", "skill2"]
        }},
        "keywords": {{
            "ats_keywords": ["keyword1", "keyword2"],
            "technical_keywords": ["keyword1", "keyword2"],
            "soft_skill_keywords": ["keyword1", "keyword2"]
        }},
        "resume_focus": {{
            "highlight_these": ["thing1", "thing2"],
            "avoid_these": ["thing1", "thing2"],
            "tone": "startup/enterprise/product"
        }}
    }}

    JSON only. No markdown. No explanation.
    Think step by step but return only JSON.
    """

    print(f"      Sending JD to Gemini...")
    raw = call_llm(prompt)
    raw = raw.replace("```json", "").replace("```", "").strip()
    result = json.loads(raw)

    print(f"      ✓ Company wants: {result['jd_understanding']['what_company_wants']}")
    print(f"      ✓ Role level: {result['jd_understanding']['role_level']}")
    print(f"      ✓ Must have: {', '.join(result['skills']['must_have'])}")
    print(f"      ✓ ATS Keywords: {', '.join(result['keywords']['ats_keywords'][:5])}...")
    print(f"      ✓ Highlight: {', '.join(result['resume_focus']['highlight_these'][:3])}")
    print(f"      ✓ Tone: {result['resume_focus']['tone']}")

    final_output = {
        "job_id": job['job_id'],
        "company": job['company'],
        "role": job['role'],
        "jd_understanding": result['jd_understanding'],
        "must_have_skills": result['skills']['must_have'],
        "good_to_have_skills": result['skills']['good_to_have'],
        "ats_keywords": result['keywords']['ats_keywords'],
        "technical_keywords": result['keywords']['technical_keywords'],
        "soft_skill_keywords": result['keywords']['soft_skill_keywords'],
        "resume_focus": result['resume_focus']
    }

    print(f"    ✓ Sub-Agent 2A Complete for {job['company']}")
    return final_output
