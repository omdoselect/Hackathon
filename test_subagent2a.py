import json
from agents.subagent2a import run_subagent2a

# Load one job to test
with open("data/recommended_jobs.json", "r") as f:
    data = json.load(f)

# Take first recommended job
first_job = data['recommended_jobs'][0]
print(f"Testing with: {first_job['company']} — {first_job['role']}")

result = run_subagent2a(first_job)

print("\n========================================")
print("Sub-Agent 2A Output:")
print("========================================")
print(json.dumps(result, indent=2))
