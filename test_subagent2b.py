import json
from agents.subagent2a import run_subagent2a
from agents.subagent2b import run_subagent2b

# Load recommended jobs
with open("data/recommended_jobs.json", "r") as f:
    data = json.load(f)

# Take first recommended job
first_job = data['recommended_jobs'][0]
print(f"Testing with: {first_job['company']} — {first_job['role']}")

# Run Sub-Agent 2A first
print("\nRunning Sub-Agent 2A...")
jd_analysis = run_subagent2a(first_job)

# Run Sub-Agent 2B with 2A output
print("\nRunning Sub-Agent 2B...")
result = run_subagent2b(first_job, jd_analysis)

print("\n========================================")
print("Sub-Agent 2B Output:")
print("========================================")
print(json.dumps(result, indent=2))
