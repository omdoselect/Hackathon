import React, { useState } from "react";
import jobs from "../data/jobs";
import candidateProfile from "../data/candidate_profile.json";

const PROFILE_STORAGE_KEY = "candidate_profile_editor";

const normalizeProfile = (profile = {}) => ({
  skills: Array.isArray(profile.skills) ? profile.skills : [],
});

const loadProfile = () => {
  if (typeof window === "undefined") {
    return normalizeProfile(candidateProfile);
  }

  const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);

  if (!savedProfile) {
    return normalizeProfile(candidateProfile);
  }

  try {
    return normalizeProfile(JSON.parse(savedProfile));
  } catch (err) {
    return normalizeProfile(candidateProfile);
  }
};

const matchScore = (job, profile) => {
  const profileSkills = (profile.skills || []).map((s) => s.toLowerCase());
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
  const matched = jobSkills.filter((s) => profileSkills.includes(s));
  return Math.round((matched.length / jobSkills.length) * 100);
};

const SkillTag = ({ skill, matched }) => (
  <span className={`skill-tag ${matched ? "skill-matched" : ""}`}>{skill}</span>
);

const JobCard = ({ job, profile, onApply }) => {
  const [applied, setApplied] = useState(false);
  const [saved, setSaved] = useState(false);
  const score = matchScore(job, profile);
  const profileSkills = (profile.skills || []).map((s) => s.toLowerCase());

  const handleApply = () => {
    setApplied(true);
    onApply(job);
  };

  return (
    <div className={`job-card ${applied ? "job-applied" : ""}`}>
      <div className="job-card-header">
        <div className="job-logo" style={{ background: job.logoColor }}>
          {job.logo}
        </div>
        <div className="job-meta">
          <h3 className="job-title">{job.title}</h3>
          <p className="job-company">{job.company}</p>
          <div className="job-tags">
            <span className="job-tag">📍 {job.location}</span>
            <span className="job-tag">💼 {job.experience}</span>
            <span className="job-tag">💰 {job.salary}</span>
            <span className="job-tag">🕐 {job.posted}</span>
          </div>
        </div>
        <div className="job-card-right">
          <div className={`match-badge ${score >= 70 ? "match-high" : score >= 40 ? "match-mid" : "match-low"}`}>
            {score}% match
          </div>
          <button
            className={`btn-save ${saved ? "saved" : ""}`}
            onClick={() => setSaved(!saved)}
            title={saved ? "Unsave" : "Save job"}
          >
            {saved ? "★" : "☆"}
          </button>
        </div>
      </div>

      <p className="job-description">{job.description}</p>

      <div className="job-skills">
        {job.skills.map((skill) => (
          <SkillTag
            key={skill}
            skill={skill}
            matched={profileSkills.includes(skill.toLowerCase())}
          />
        ))}
      </div>

      <div className="job-card-footer">
        <span className="job-type-badge">{job.type}</span>
        <button
          className={`btn-apply ${applied ? "btn-applied" : ""}`}
          onClick={handleApply}
          disabled={applied}
        >
          {applied ? "✓ Applied" : "Apply Now"}
        </button>
      </div>
    </div>
  );
};

const JobsList = () => {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [toast, setToast] = useState(null);

  const profile = loadProfile();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApply = (job) => {
    setAppliedJobs((prev) => [...prev, job.id]);
    showToast(`Applied to ${job.title} at ${job.company}!`);
  };

  const filtered = jobs.filter((job) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.skills.some((s) => s.toLowerCase().includes(q));
    const matchLocation =
      !locationFilter || job.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchSearch && matchLocation;
  });

  const locations = [...new Set(jobs.map((j) => j.location).filter(Boolean))];

  return (
    <div className="page-layout">
      <main className="main-content">
        <div className="jobs-toolbar">
          <div className="toolbar-group">
            <button
              className={`filter-btn ${!locationFilter ? "active" : ""}`}
              onClick={() => setLocationFilter("")}
            >
              All locations
            </button>
            {locations.map((loc) => (
              <button
                key={loc}
                className={`filter-btn ${locationFilter === loc ? "active" : ""}`}
                onClick={() => setLocationFilter(loc === locationFilter ? "" : loc)}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        <div className="top-skills-row">
          <span className="top-skills-label">Top skills</span>
          <div className="skill-list">
            {profile.skills?.slice(0, 8).map((s) => (
              <span key={s} className="skill-tag skill-matched">{s}</span>
            ))}
          </div>
        </div>

        <div className="search-bar-container">
          <input
            className="search-input"
            type="text"
            placeholder="Search by job title, company, or skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <div className="results-header">
          <span className="results-count">{filtered.length} jobs found</span>
          {locationFilter && (
            <span className="active-filter">
              {locationFilter}
              <button onClick={() => setLocationFilter("")}>✕</button>
            </span>
          )}
        </div>

        <div className="jobs-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No jobs match your search.</p>
              <button onClick={() => { setSearch(""); setLocationFilter(""); }}>
                Clear filters
              </button>
            </div>
          ) : (
            filtered.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                profile={profile}
                onApply={handleApply}
              />
            ))
          )}
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default JobsList;
