import json
from utils.llm_client import call_llm


def load_candidate_profile():
    with open("data/candidate_profile.json", "r") as f:
        return json.load(f)


def load_recommended_jobs():
    with open("data/recommended_jobs.json", "r") as f:
        return json.load(f)


def get_slim_candidate(candidate):
    return {
        "name": candidate['name'],
        "title": candidate['current_title'],
        "experience_years": candidate['experience_years'],
        "skills": candidate['skills']
    }


# def get_slim_resume(candidate):
#     resume = candidate['resume']
#     return {
#         "summary": resume['summary'],
#         "work_experience": [
#             {
#                 "title": exp['title'],
#                 "company": exp['company'],
#                 "years": exp['years'],
#                 "description": exp['description'],
#                 "technologies": exp['technologies']
#             }
#             for exp in resume['work_experience']
#         ],
#         "projects": [
#             {
#                 "name": p['name'],
#                 "description": p['description'],
#                 "technologies": p['technologies']
#             }
#             for p in resume['projects']
#         ],
#         "certifications": resume['certifications']
#     }
def get_slim_resume(candidate):
    return {
        "resume_text": candidate['resume']['raw_text']
    }


def get_slim_job(job):
    return {
        "job_id": job['job_id'],
        "company": job['company'],
        "role": job['role'],
        "location": job['location'],
        "experience_required": job['experience_required'],
        "skills_required": job['skills_required'],
        "salary_range": job['salary_range'],
        "responsibilities": job['job_description']['responsibilities'],
        "requirements": job['job_description']['requirements'],
        "good_to_have": job['job_description']['good_to_have']
    }


def process_job(candidate, slim_resume, job, index, total):
    print(f"\n  ── Job {index}/{total}: {job['company']} — {job['role']} ──")

    slim_candidate = get_slim_candidate(candidate)
    slim_job = get_slim_job(job)

    prompt = f"""
    You are Agent 2 — Resume Tailoring and
    ATS Evaluation Agent.

    You are a professional resume expert and
    ATS specialist. Process this job application
    completely in one pass.

    CANDIDATE PROFILE:
    {json.dumps(slim_candidate)}

    ORIGINAL RESUME:
    {json.dumps(slim_resume)}

    JOB TO APPLY FOR:
    {json.dumps(slim_job)}

    Think through these steps internally:

    INTERNAL STEP 1 — JD ANALYSIS:
    Read the job description carefully.
    Understand what the company really wants.
    Identify must have skills and ATS keywords.
    Determine the tone of the company culture.

    INTERNAL STEP 2 — GAP ANALYSIS:
    Compare candidate skills vs job requirements.
    Find what is strong and what is missing.
    Score original resume against JD keywords.
    Be strict and realistic with ATS scoring.
    This is the ATS BEFORE score out of 100.

    INTERNAL STEP 3 — RESUME TAILORING:
    Rewrite summary using JD keywords and tone.
    Reorder skills putting must have skills first.
    Rephrase 1-2 experience bullets per job
    using JD keywords naturally.
    Highlight most relevant project first.
    Keep everything 100 percent truthful.
    Never add fake skills or experience.
    Never change company names or dates.

    INTERNAL STEP 4 — ATS EVALUATION:
    Score the tailored resume against same keywords.
    Be honest and realistic with scoring.
    This is the ATS AFTER score out of 100.
    Calculate improvement = after minus before.

    INTERNAL STEP 5 — DECISION:
    If ATS after >= 70 then decision is APPLY.
    If ATS after < 70 then decision is SKIP.
    Give clear reason for the decision.

    Return ONLY this JSON and nothing else:
    {{
        "jd_analysis": {{
            "what_company_wants": "core goal",
            "must_have_skills": ["s1", "s2"],
            "good_to_have_skills": ["s1", "s2"],
            "ats_keywords": ["k1", "k2"],
            "tone": "startup/enterprise/product",
            "role_level": "junior/mid/senior"
        }},
        "gap_analysis": {{
            "strong_matches": ["s1", "s2"],
            "missing_skills": ["s1", "s2"],
            "overall_fit": "strong/moderate/weak"
        }},
        "ats_score_before": 52,
        "keywords_before": {{
            "found": ["k1", "k2"],
            "missing": ["k1", "k2"]
        }},
        "tailored_resume": {{
            "summary": "rewritten summary here",
            "skills": ["skill1", "skill2"],
            "work_experience": [
                {{
                    "title": "MERN Stack Developer",
                    "company": "TechNova Solutions",
                    "years": 2.0,
                    "tailored_description": "rephrased description",
                    "technologies": ["t1", "t2"]
                }}
            ],
            "projects": [
                {{
                    "name": "project name",
                    "tailored_description": "rephrased description",
                    "technologies": ["t1", "t2"]
                }}
            ]
        }},
        "changes_made": [
            "change 1 description",
            "change 2 description"
        ],
        "ats_score_after": 84,
        "keywords_after": {{
            "found": ["k1", "k2"],
            "missing": ["k1", "k2"]
        }},
        "improvement": 32,
        "decision": "APPLY",
        "decision_reason": "ATS score 84 meets threshold of 70"
    }}

    JSON only. No markdown. No explanation.
    Think deeply through all 5 steps
    but return only the final JSON.
    """

    print(f"    Sending to Gemini...")
    raw = call_llm(prompt)
    raw = raw.replace("```json", "").replace("```", "").strip()
    result = json.loads(raw)

    # ── PRINT PROGRESS BAR ──
    def progress_bar(score):
        filled = int(score / 10)
        empty = 10 - filled
        return f"[{'█' * filled}{'░' * empty}]"

    print(f"\n    JD Analysis:")
    print(f"      Company wants: {result['jd_analysis']['what_company_wants']}")
    print(f"      Must have:     {', '.join(result['jd_analysis']['must_have_skills'])}")
    print(f"      ATS Keywords:  {', '.join(result['jd_analysis']['ats_keywords'][:5])}...")

    print(f"\n    Gap Analysis:")
    print(f"      Strong match:  {', '.join(result['gap_analysis']['strong_matches'])}")
    print(f"      Missing:       {', '.join(result['gap_analysis']['missing_skills'])}")
    print(f"      Overall fit:   {result['gap_analysis']['overall_fit']}")

    print(f"\n    ATS Score:")
    print(f"      Before: {result['ats_score_before']:>3}/100  {progress_bar(result['ats_score_before'])}")
    print(f"      After:  {result['ats_score_after']:>3}/100  {progress_bar(result['ats_score_after'])}")
    print(f"      Improvement: +{result['improvement']} points")

    print(f"\n    Changes Made:")
    for change in result['changes_made']:
        print(f"      - {change}")

    decision_symbol = "✓" if result['decision'] == "APPLY" else "✗"
    print(f"\n    Decision: {decision_symbol} {result['decision']}")
    print(f"    Reason:   {result['decision_reason']}")

    return {
        "job_id": job['job_id'],
        "company": job['company'],
        "role": job['role'],
        "location": job['location'],
        "match_score": job.get('match_score', 0),
        "jd_analysis": result['jd_analysis'],
        "gap_analysis": result['gap_analysis'],
        "ats_score_before": result['ats_score_before'],
        "keywords_before": result['keywords_before'],
        "tailored_resume": result['tailored_resume'],
        "changes_made": result['changes_made'],
        "ats_score_after": result['ats_score_after'],
        "keywords_after": result['keywords_after'],
        "improvement": result['improvement'],
        "decision": result['decision'],
        "decision_reason": result['decision_reason']
    }


def run_agent2():
    print("\n========================================")
    print("  AGENT 2 — Resume Tailoring Agent")
    print("========================================")

    # ── LOAD DATA ──
    candidate = load_candidate_profile()
    recommended_data = load_recommended_jobs()
    recommended_jobs = recommended_data['recommended_jobs']
    slim_resume = get_slim_resume(candidate)

    print(f"\n  Candidate: {candidate['name']}")
    print(f"  Jobs to process: {len(recommended_jobs)}")

    results = []
    applied = []
    skipped = []

    # ── PROCESS EACH JOB ──
    for i, rec_job in enumerate(recommended_jobs, 1):
        try:
            # Find full job details from jobs.json
            with open("data/jobs.json", "r") as f:
                all_jobs = json.load(f)

            full_job = next(
                (j for j in all_jobs if j['job_id'] == rec_job['job_id']),
                None
            )

            if not full_job:
                print(f"  ✗ Job {rec_job['job_id']} not found in jobs.json")
                continue

            # Add match score from agent 1
            full_job['match_score'] = rec_job.get('match_score', 0)

            result = process_job(
                candidate,
                slim_resume,
                full_job,
                i,
                len(recommended_jobs)
            )

            results.append(result)

            if result['decision'] == 'APPLY':
                applied.append(result)
            else:
                skipped.append(result)

        except json.JSONDecodeError as e:
            print(f"  ✗ JSON parsing error for {rec_job['company']}: {e}")
            continue
        except Exception as e:
            print(f"  ✗ Error processing {rec_job['company']}: {e}")
            continue

    # ── FINAL OUTPUT ──
    final_output = {
        "agent": "Resume Tailoring Agent",
        "candidate_id": candidate['candidate_id'],
        "candidate_name": candidate['name'],
        "total_processed": len(results),
        "total_applied": len(applied),
        "total_skipped": len(skipped),
        "applied_jobs": applied,
        "skipped_jobs": skipped
    }

    # ── SAVE OUTPUT ──
    with open("data/agent2_results.json", "w") as f:
        json.dump(final_output, f, indent=2)

    # ── PRINT FINAL SUMMARY ──
    print("\n========================================")
    print("  AGENT 2 FINAL RESULTS")
    print("========================================")
    print(f"  Total Processed: {len(results)}")
    print(f"  Total Applied:   {len(applied)}")
    print(f"  Total Skipped:   {len(skipped)}")

    if applied:
        print("\n  Applied Jobs:")
        for job in applied:
            print(f"    ✓ {job['company']} — {job['role']}")
            print(f"      ATS: {job['ats_score_before']} → {job['ats_score_after']} ↑ +{job['improvement']}")

    if skipped:
        print("\n  Skipped Jobs:")
        for job in skipped:
            print(f"    ✗ {job['company']} — {job['role']}")
            print(f"      ATS: {job['ats_score_before']} → {job['ats_score_after']}")
            print(f"      Reason: {job['decision_reason']}")

    print("\n  ✓ Results saved to data/agent2_results.json")
    print("\n✓ Agent 2 Complete")
    print("========================================\n")

    return final_output


if __name__ == "__main__":
    run_agent2()
