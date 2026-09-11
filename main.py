from agents.agent1 import run_agent1
from agents.agent2 import run_agent2

def main():
    print("\n========================================")
    print("   NAUKRI AUTOPILOT — AGENTIC AI")
    print("========================================")

    # ── RUN AGENT 1 ──
    agent1_result = run_agent1()

    print("\n  Agent 1 Complete!")
    print(f"  Passing {agent1_result['total_jobs_recommended']} jobs to Agent 2...")
    print("\n  Starting Agent 2...")

    # ── RUN AGENT 2 ──
    agent2_result = run_agent2()

    # ── FINAL SUMMARY ──
    print("\n========================================")
    print("   AUTOPILOT COMPLETE")
    print("========================================")
    print(f"  Candidate:       {agent1_result['candidate_name']}")
    print(f"  Jobs Scanned:    {agent1_result['total_jobs_scanned']}")
    print(f"  Jobs Matched:    {agent1_result['total_jobs_recommended']}")
    print(f"  Jobs Applied:    {agent2_result['total_applied']}")
    print(f"  Jobs Skipped:    {agent2_result['total_skipped']}")
    print("========================================\n")

if __name__ == "__main__":
    main()
