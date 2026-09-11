import json
import threading
import io
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import PyPDF2
from agents.agent1 import run_agent1
from agents.agent2 import run_agent2

app = FastAPI()

# ── CORS for Frontend ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ── Agent Status Tracker ──
agent_status = {
    "is_running": False,
    "current_step": "idle",
    "completed": False,
    "error": None
}


# ── POST /api/setup-candidate ──
@app.post("/api/setup-candidate")
async def setup_candidate(
    name: str = Form(...),
    current_title: str = Form(...),
    experience_years: float = Form(...),
    skills: str = Form(...),
    location: str = Form(...),
    expected_salary_lpa: float = Form(...),
    preferred_roles: str = Form(...),
    resume: UploadFile = File(...)
):
    pdf_bytes = await resume.read()
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))

    resume_text = ""
    for page in pdf_reader.pages:
        text = page.extract_text()
        if text:
            resume_text += text + "\n"

    candidate_profile = {
        "candidate_id": "CAND-001",
        "name": name,
        "current_title": current_title,
        "experience_years": experience_years,
        "skills": [s.strip() for s in skills.split(",")],
        "location": location,
        "expected_salary_lpa": expected_salary_lpa,
        "preferred_roles": [r.strip() for r in preferred_roles.split(",")],
        "resume": {
            "raw_text": resume_text,
            "summary": "",
            "work_experience": [],
            "projects": [],
            "certifications": []
        }
    }

    with open("data/candidate_profile.json", "w") as f:
        json.dump(candidate_profile, f, indent=2)

    return {
        "message": "Candidate profile saved successfully",
        "candidate_name": name,
        "resume_pages": len(pdf_reader.pages),
        "resume_text_length": len(resume_text)
    }


# ── GET /api/status ──
@app.get("/api/status")
def get_status():
    return agent_status


# ── GET /api/candidate ──
@app.get("/api/candidate")
def get_candidate():
    try:
        with open("data/candidate_profile.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"message": "No candidate profile found"}


# ── GET /api/jobs ──
@app.get("/api/jobs")
def get_jobs():
    with open("data/jobs.json", "r") as f:
        return json.load(f)


# ── GET /api/recommended-jobs ──
@app.get("/api/recommended-jobs")
def get_recommended_jobs():
    try:
        with open("data/recommended_jobs.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"message": "Run autopilot first"}


# ── GET /api/results ──
@app.get("/api/results")
def get_results():
    try:
        with open("data/agent2_results.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"message": "Run autopilot first"}


# ── POST /api/start-autopilot ──
@app.post("/api/start-autopilot")
def start_autopilot():
    global agent_status

    if agent_status["is_running"]:
        return {"message": "Autopilot already running"}

    def run_agents():
        global agent_status
        try:
            agent_status["is_running"] = True
            agent_status["completed"] = False
            agent_status["error"] = None

            agent_status["current_step"] = "Agent 1 running — scanning jobs..."
            run_agent1()

            agent_status["current_step"] = "Agent 2 running — tailoring resumes..."
            run_agent2()

            agent_status["current_step"] = "Completed"
            agent_status["completed"] = True
            agent_status["is_running"] = False

        except Exception as e:
            agent_status["error"] = str(e)
            agent_status["is_running"] = False
            agent_status["current_step"] = "Error"

    thread = threading.Thread(target=run_agents)
    thread.start()

    return {"message": "Autopilot started"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
