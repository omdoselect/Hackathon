import json
from utils.llm_client import call_llm


def load_candidate_profile():
    with open("data/candidate_profile.json", "r") as f:
        return json.load(f)


def load_jobs():
    with open("data/jobs.json", "r") as f:
        return json.load(f)


def run_agent1():
    print("\n========================================")
    print("  AGENT 1 — JD Recommendation Agent")
    print("========================================")

    # ── LOAD DATA ──
    print("\n  Loading candidate profile...")
    candidate = load_candidate_profile()
    print(f"  ✓ Candidate: {candidate['name']}")
    print(f"  ✓ Role: {candidate['current_title']}")
    print(f"  ✓ Experience: {candidate['experience_years']} years")
    print(f"  ✓ Skills: {', '.join(candidate['skills'][:5])}...")

    print("\n  Loading job postings...")
    jobs = load_jobs()
    print(f"  ✓ Total Jobs Loaded: {len(jobs)}")

    # ── MINOR STEP 1: UNDERSTAND CANDIDATE ──
    print("\n  Minor Step 1: Understanding candidate...")

    step1_prompt = f"""
    You are Agent 1 — JD Recommendation Agent.

    Analyse this candidate profile and understand
    who they are and what jobs suit them.

    CANDIDATE PROFILE:
    {json.dumps(candidate, indent=2)}

    Return ONLY this JSON and nothing else:
    {{
        "candidate_summary": "one line about candidate",
        "strong_skills": ["skill1", "skill2"],
        "weak_areas": ["area1", "area2"],
        "ideal_job_titles": ["title1", "title2"],
        "experience_level": "junior/mid/senior"
    }}

    JSON only. No markdown. No explanation.
    """

    step1_raw = call_llm(step1_prompt)
    step1_raw = step1_raw.replace("```json", "").replace("```", "").strip()
    step1 = json.loads(step1_raw)

    print(f"  ✓ Summary: {step1['candidate_summary']}")
    print(f"  ✓ Strong Skills: {', '.join(step1['strong_skills'])}")
    print(f"  ✓ Experience Level: {step1['experience_level']}")

    # ── MINOR STEP 2: EXTRACT CANDIDATE KEYWORDS ──
    print("\n  Minor Step 2: Extracting candidate keywords...")

    step2_prompt = f"""
    You are Agent 1 — JD Recommendation Agent.

    Based on this candidate understanding:
    {json.dumps(step1, indent=2)}

    Extract the most important keywords
    for job matching.

    Return ONLY this JSON and nothing else:
    {{
        "primary_keywords": ["keyword1", "keyword2"],
        "secondary_keywords": ["keyword1", "keyword2"],
        "role_keywords": ["keyword1", "keyword2"]
    }}

    JSON only. No markdown. No explanation.
    """

    step2_raw = call_llm(step2_prompt)
    step2_raw = step2_raw.replace("```json", "").replace("```", "").strip()
    step2 = json.loads(step2_raw)

    print(f"  ✓ Primary Keywords: {', '.join(step2['primary_keywords'])}")
    print(f"  ✓ Role Keywords: {', '.join(step2['role_keywords'])}")

    # ── MINOR STEP 3: SCAN AND SCORE JOBS ──
    print("\n  Minor Step 3: Scanning and scoring all jobs...")

    step3_prompt = f"""
    You are Agent 1 — JD Recommendation Agent.

    Candidate Understanding:
    {json.dumps(step1, indent=2)}

    Candidate Keywords:
    {json.dumps(step2, indent=2)}

    ALL JOB POSTINGS:
    {json.dumps(jobs, indent=2)}

    Score each job from 0 to 100 based on:
    - Skills match (40 points)
    - Experience match (25 points)
    - Role match (20 points)
    - Location match (10 points)
    - Salary match (5 points)

    Return ONLY this JSON and nothing else:
    {{
        "scored_jobs": [
            {{
                "job_id": "JOB-001",
                "company": "Zomato",
                "role": "MERN Stack Developer",
                "location": "Bangalore",
                "match_score": 92,
                "matched_skills": ["skill1"],
                "missing_skills": ["skill2"],
                "match_reason": "why this matches"
            }}
        ]
    }}

    JSON only. No markdown. No explanation.
    """

    step3_raw = call_llm(step3_prompt)
    step3_raw = step3_raw.replace("```json", "").replace("```", "").strip()
    step3 = json.loads(step3_raw)

    print(f"  ✓ All {len(step3['scored_jobs'])} jobs scored")

    # ── MINOR STEP 4: FILTER BY THRESHOLD ──
    print("\n  Minor Step 4: Filtering jobs by threshold...")

    recommended = []
    rejected = []

    for job in step3['scored_jobs']:
        if job['match_score'] >= 60:
            job['priority'] = 'High' if job['match_score'] >= 80 else 'Medium'
            recommended.append(job)
        else:
            rejected.append({
                "job_id": job['job_id'],
                "company": job['company'],
                "role": job['role'],
                "match_score": job['match_score'],
                "rejection_reason": job['match_reason']
            })

    print(f"  ✓ Recommended: {len(recommended)} jobs")
    print(f"  ✗ Rejected: {len(rejected)} jobs")

    # ── FINAL OUTPUT ──
    final_output = {
        "agent": "JD Recommendation Agent",
        "candidate_id": candidate['candidate_id'],
        "candidate_name": candidate['name'],
        "total_jobs_scanned": len(jobs),
        "total_jobs_recommended": len(recommended),
        "total_jobs_rejected": len(rejected),
        "recommended_jobs": recommended,
        "rejected_jobs": rejected
    }

    # ── PRINT RESULTS ──
    print("\n========================================")
    print("  AGENT 1 RESULTS")
    print("========================================")
    print(f"  Total Scanned:     {final_output['total_jobs_scanned']}")
    print(f"  Total Recommended: {final_output['total_jobs_recommended']}")
    print(f"  Total Rejected:    {final_output['total_jobs_rejected']}")

    print("\n  Recommended Jobs:")
    for i, job in enumerate(final_output['recommended_jobs']):
        print(f"\n    {i+1}. {job['company']} — {job['role']}")
        print(f"       Match Score: {job['match_score']}/100")
        print(f"       Priority:    {job['priority']}")
        print(f"       Matched:     {', '.join(job['matched_skills'])}")
        print(f"       Missing:     {', '.join(job['missing_skills'])}")
        print(f"       Reason:      {job['match_reason']}")

    print("\n  Rejected Jobs:")
    for job in final_output['rejected_jobs']:
        print(f"    ✗ {job['company']} — {job['role']} ({job['match_score']}/100)")

    # ── SAVE OUTPUT TO FILE ──
    output_path = "data/recommended_jobs.json"
    with open(output_path, "w") as f:
        json.dump(final_output, f, indent=2)
    print(f"\n  ✓ Recommended jobs saved to {output_path}")

    print("\n✓ Agent 1 Complete")

    print("========================================\n")

    return final_output


if __name__ == "__main__":
    run_agent1()
