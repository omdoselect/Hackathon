import React, { useState, useRef } from "react";
import candidateProfile from "../data/candidate_profile.json";
import { extractTextFromPDF, parseResumeTextToProfile, mergeProfiles } from "../utils/pdfParser";

const Section = ({ title, children }) => (
  <div className="profile-section">
    <h3 className="section-title">{title}</h3>
    {children}
  </div>
);

const PROFILE_STORAGE_KEY = "candidate_profile_editor";
const PROFILE_SAVED_KEY = "candidate_profile_editor_saved";

const normalizeProfile = (profile = {}) => ({
  candidate_id: profile.candidate_id || "",
  name: profile.name || "",
  experience_years: Number(profile.experience_years) || 0,
  current_title: profile.current_title || "",
  location: profile.location || "",
  expected_salary_lpa: Number(profile.expected_salary_lpa) || 0,
  preferred_roles: Array.isArray(profile.preferred_roles) ? profile.preferred_roles : [],
  skills: Array.isArray(profile.skills) ? profile.skills : [],
  education: {
    degree: profile.education?.degree || "",
    university: profile.education?.university || "",
  },
  contact: {
    email: profile.contact?.email || "",
    phone: profile.contact?.phone || "",
  },
  resume: {
    summary: profile.resume?.summary || "",
    work_experience: Array.isArray(profile.resume?.work_experience)
      ? profile.resume.work_experience.map((item) => ({
          title: item.title || "",
          company: item.company || "",
          years: Number(item.years) || 0,
          description: item.description || "",
          technologies: Array.isArray(item.technologies) ? item.technologies : [],
        }))
      : [],
    projects: Array.isArray(profile.resume?.projects)
      ? profile.resume.projects.map((item) => ({
          name: item.name || "",
          description: item.description || "",
          technologies: Array.isArray(item.technologies) ? item.technologies : [],
        }))
      : [],
    certifications: Array.isArray(profile.resume?.certifications) ? profile.resume.certifications : [],
  },
});

const hasText = (value) => typeof value === "string" && value.trim().length > 0;

const hasFilledArray = (value) => Array.isArray(value) && value.length > 0;

const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

const isProfileComplete = (profile) => {
  const workExperience = profile.resume?.work_experience || [];
  const projects = profile.resume?.projects || [];

  return [
    hasText(profile.candidate_id),
    hasText(profile.name),
    isPositiveNumber(profile.experience_years),
    hasText(profile.current_title),
    hasText(profile.location),
    isPositiveNumber(profile.expected_salary_lpa),
    hasFilledArray(profile.preferred_roles),
    hasFilledArray(profile.skills),
    hasText(profile.education?.degree),
    hasText(profile.education?.university),
    hasText(profile.contact?.email),
    hasText(profile.contact?.phone),
    hasText(profile.resume?.summary),
    hasFilledArray(profile.resume?.certifications),
    hasFilledArray(workExperience),
    workExperience.every((item) =>
      hasText(item.title) &&
      hasText(item.company) &&
      isPositiveNumber(item.years) &&
      hasText(item.description) &&
      hasFilledArray(item.technologies)
    ),
    hasFilledArray(projects),
    projects.every((item) =>
      hasText(item.name) &&
      hasText(item.description) &&
      hasFilledArray(item.technologies)
    ),
  ].every(Boolean);
};

const Profile = () => {
  const [profile, setProfile] = useState(() => {
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
  });
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [parsedJson, setParsedJson] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isProfileSaved, setIsProfileSaved] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(PROFILE_SAVED_KEY) === "true";
  });
  const fileRef = useRef();

  const completionFields = [
    profile.name,
    profile.current_title,
    profile.location,
    profile.resume?.summary,
    profile.education?.degree,
    profile.skills?.length > 0,
    profile.resume?.work_experience?.length > 0,
    profile.resume?.projects?.length > 0,
  ];
  const completionPct = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100
  );
  const canSaveProfile = isProfileComplete(profile);

  const updateProfileValue = (key, value) => {
    setIsProfileSaved(false);
    setSaveStatus(null);
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const updateNestedProfileValue = (parentKey, key, value) => {
    setIsProfileSaved(false);
    setSaveStatus(null);
    setProfile((prev) => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey] || {}),
        [key]: value,
      },
    }));
  };

  const updateResumeValue = (key, value) => {
    setIsProfileSaved(false);
    setSaveStatus(null);
    setProfile((prev) => ({
      ...prev,
      resume: {
        ...(prev.resume || {}),
        [key]: value,
      },
    }));
  };

  const parseListValue = (value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const updateResumeListItem = (listKey, index, field, value) => {
    setIsProfileSaved(false);
    setSaveStatus(null);
    setProfile((prev) => ({
      ...prev,
      resume: {
        ...(prev.resume || {}),
        [listKey]: (prev.resume?.[listKey] || []).map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const addResumeListItem = (listKey, template) => {
    setIsProfileSaved(false);
    setSaveStatus(null);
    setProfile((prev) => ({
      ...prev,
      resume: {
        ...(prev.resume || {}),
        [listKey]: [...(prev.resume?.[listKey] || []), template],
      },
    }));
  };

  const removeResumeListItem = (listKey, index) => {
    setIsProfileSaved(false);
    setSaveStatus(null);
    setProfile((prev) => ({
      ...prev,
      resume: {
        ...(prev.resume || {}),
        [listKey]: (prev.resume?.[listKey] || []).filter((_, i) => i !== index),
      },
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadStatus({ type: "error", msg: "Only PDF files are supported." });
      return;
    }

    setUploading(true);
    setUploadStatus({ type: "loading", msg: `Reading ${file.name}…` });
    setParsedJson(null);

    try {
      const text = await extractTextFromPDF(file);
      const parsed = parseResumeTextToProfile(text, profile);
      const merged = normalizeProfile(mergeProfiles(profile, parsed));

      setProfile(merged);
      setParsedJson(merged);
      setUploadStatus({
        type: "success",
        msg: `Resume "${file.name}" parsed and profile updated successfully.`,
      });
    } catch (err) {
      setUploadStatus({ type: "error", msg: err.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(parsedJson || profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidate_profile_${profile.candidate_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveProfile = () => {
    if (!canSaveProfile) {
      setSaveStatus("Fill all required fields before saving.");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizeProfile(profile)));
      window.localStorage.setItem(PROFILE_SAVED_KEY, "true");
    }

    setParsedJson(normalizeProfile(profile));
    setIsProfileSaved(true);
    setSaveStatus("Profile changes saved locally.");
  };

  return (
    <div className="profile-page">
      {/* Profile Header */}
      {isProfileSaved && (
      <div className="profile-header-card">
        <div className="profile-header-left">
          <div className="avatar-circle">
            {profile.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="profile-header-info">
            <h2 className="profile-name">{profile.name}</h2>
            <p className="profile-headline">{profile.current_title}</p>
            <div className="profile-meta-row">
              <span>📍 {profile.location}</span>
              <span>💼 {profile.experience_years} years experience</span>
              <span>💰 ₹{profile.expected_salary_lpa} LPA expected</span>
            </div>
            <div className="candidate-id-badge">ID: {profile.candidate_id}</div>
          </div>
        </div>

        <div className="profile-header-right">
          <div className="completion-ring">
            <svg viewBox="0 0 80 80" className="ring-svg">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke={completionPct >= 75 ? "#16a34a" : completionPct >= 50 ? "#f59e0b" : "#3b82f6"}
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - completionPct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
              />
              <text x="40" y="45" textAnchor="middle" className="ring-text" fontSize="14" fontWeight="700">
                {completionPct}%
              </text>
            </svg>
            <p className="ring-label">Profile complete</p>
          </div>
        </div>
      </div>
      )}

      {!isProfileSaved && (
        <div className="profile-pending-card">
          <h3 className="section-title">Complete and save the profile</h3>
          <p className="pending-copy">
            The profile summary at the top will appear after all required fields are filled and you save the form.
          </p>
        </div>
      )}

      {/* Resume Upload Card */}
      <div className="upload-card">
        <div className="upload-card-header">
          <h3>📄 Resume</h3>
          <p className="upload-sub">Upload your PDF resume — we'll parse it and update your profile automatically.</p>
        </div>
        <div className="upload-zone" onClick={() => fileRef.current.click()}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <span className="upload-icon">⬆</span>
          <span>{uploading ? "Parsing resume…" : "Click to upload PDF resume"}</span>
          <span className="upload-hint">PDF only · max 10MB</span>
        </div>

        {uploadStatus && (
          <div className={`upload-status upload-${uploadStatus.type}`}>
            {uploadStatus.type === "loading" && <span className="spinner" />}
            {uploadStatus.type === "success" && "✓ "}
            {uploadStatus.type === "error" && "✗ "}
            {uploadStatus.msg}
          </div>
        )}

        {parsedJson && (
          <div className="upload-actions">
            <button className="btn-outline-sm" onClick={() => setShowJson(!showJson)}>
              {showJson ? "Hide" : "View"} parsed JSON
            </button>
            <button className="btn-primary-sm" onClick={downloadJson}>
              ⬇ Download profile JSON
            </button>
          </div>
        )}

        {showJson && parsedJson && (
          <pre className="json-preview">{JSON.stringify(parsedJson, null, 2)}</pre>
        )}
      </div>

      <div className="profile-body">
        <Section title="Edit candidate profile">
            <div className="editor-grid">
              <div className="field-group">
                <label>Candidate ID</label>
                <input
                  value={profile.candidate_id || ""}
                  onChange={(e) => updateProfileValue("candidate_id", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Name</label>
                <input
                  value={profile.name || ""}
                  onChange={(e) => updateProfileValue("name", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Current title</label>
                <input
                  value={profile.current_title || ""}
                  onChange={(e) => updateProfileValue("current_title", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Location</label>
                <input
                  value={profile.location || ""}
                  onChange={(e) => updateProfileValue("location", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Experience years</label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.experience_years || 0}
                  onChange={(e) => updateProfileValue("experience_years", Number(e.target.value))}
                />
              </div>

              <div className="field-group">
                <label>Expected salary (LPA)</label>
                <input
                  type="number"
                  value={profile.expected_salary_lpa || 0}
                  onChange={(e) => updateProfileValue("expected_salary_lpa", Number(e.target.value))}
                />
              </div>

              <div className="field-group">
                <label>Preferred roles</label>
                <input
                  value={profile.preferred_roles?.join(", ") || ""}
                  onChange={(e) => updateProfileValue("preferred_roles", parseListValue(e.target.value))}
                />
              </div>

              <div className="field-group">
                <label>Skills</label>
                <input
                  value={profile.skills?.join(", ") || ""}
                  onChange={(e) => updateProfileValue("skills", parseListValue(e.target.value))}
                />
              </div>

              <div className="field-group">
                <label>Education degree</label>
                <input
                  value={profile.education?.degree || ""}
                  onChange={(e) => updateNestedProfileValue("education", "degree", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>University</label>
                <input
                  value={profile.education?.university || ""}
                  onChange={(e) => updateNestedProfileValue("education", "university", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Email</label>
                <input
                  value={profile.contact?.email || ""}
                  onChange={(e) => updateNestedProfileValue("contact", "email", e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Phone</label>
                <input
                  value={profile.contact?.phone || ""}
                  onChange={(e) => updateNestedProfileValue("contact", "phone", e.target.value)}
                />
              </div>

              <div className="field-group wide">
                <label>Resume summary</label>
                <textarea
                  value={profile.resume?.summary || ""}
                  rows={4}
                  onChange={(e) => updateResumeValue("summary", e.target.value)}
                />
              </div>

              <div className="field-group wide">
                <label>Certifications</label>
                <input
                  value={profile.resume?.certifications?.join(", ") || ""}
                  onChange={(e) => updateResumeValue("certifications", parseListValue(e.target.value))}
                />
              </div>

              <div className="field-group wide">
                <label>Work experience</label>
                {(profile.resume?.work_experience || []).map((exp, index) => (
                  <div key={`${exp.title || "role"}-${index}`} className="sub-form-card">
                    <div className="sub-form-header">
                      <strong>Experience {index + 1}</strong>
                      <button
                        type="button"
                        className="remove-item-btn"
                        onClick={() => removeResumeListItem("work_experience", index)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="editor-grid nested-grid">
                      <div className="field-group">
                        <label>Title</label>
                        <input
                          value={exp.title || ""}
                          onChange={(e) => updateResumeListItem("work_experience", index, "title", e.target.value)}
                        />
                      </div>

                      <div className="field-group">
                        <label>Company</label>
                        <input
                          value={exp.company || ""}
                          onChange={(e) => updateResumeListItem("work_experience", index, "company", e.target.value)}
                        />
                      </div>

                      <div className="field-group">
                        <label>Years</label>
                        <input
                          type="number"
                          step="0.1"
                          value={exp.years || 0}
                          onChange={(e) => updateResumeListItem("work_experience", index, "years", Number(e.target.value))}
                        />
                      </div>

                      <div className="field-group">
                        <label>Technologies</label>
                        <input
                          value={exp.technologies?.join(", ") || ""}
                          onChange={(e) =>
                            updateResumeListItem(
                              "work_experience",
                              index,
                              "technologies",
                              parseListValue(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="field-group wide">
                        <label>Description</label>
                        <textarea
                          rows={3}
                          value={exp.description || ""}
                          onChange={(e) => updateResumeListItem("work_experience", index, "description", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="add-item-btn"
                  onClick={() =>
                    addResumeListItem("work_experience", {
                      title: "",
                      company: "",
                      years: 0,
                      description: "",
                      technologies: [],
                    })
                  }
                >
                  + Add work experience
                </button>
              </div>

              <div className="field-group wide">
                <label>Projects</label>
                {(profile.resume?.projects || []).map((project, index) => (
                  <div key={`${project.name || "project"}-${index}`} className="sub-form-card">
                    <div className="sub-form-header">
                      <strong>Project {index + 1}</strong>
                      <button
                        type="button"
                        className="remove-item-btn"
                        onClick={() => removeResumeListItem("projects", index)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="editor-grid nested-grid">
                      <div className="field-group">
                        <label>Name</label>
                        <input
                          value={project.name || ""}
                          onChange={(e) => updateResumeListItem("projects", index, "name", e.target.value)}
                        />
                      </div>

                      <div className="field-group">
                        <label>Technologies</label>
                        <input
                          value={project.technologies?.join(", ") || ""}
                          onChange={(e) =>
                            updateResumeListItem(
                              "projects",
                              index,
                              "technologies",
                              parseListValue(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="field-group wide">
                        <label>Description</label>
                        <textarea
                          rows={3}
                          value={project.description || ""}
                          onChange={(e) => updateResumeListItem("projects", index, "description", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="add-item-btn"
                  onClick={() =>
                    addResumeListItem("projects", {
                      name: "",
                      description: "",
                      technologies: [],
                    })
                  }
                >
                  + Add project
                </button>
              </div>
            </div>

            <div className="editor-actions">
              <button
                type="button"
                className="btn-primary-sm"
                onClick={handleSaveProfile}
                disabled={!canSaveProfile}
              >
                Save changes
              </button>
              {saveStatus && <span className={`save-feedback ${canSaveProfile ? "save-feedback-success" : "save-feedback-error"}`}>{saveStatus}</span>}
            </div>
          </Section>
      </div>
    </div>
  );
};

export default Profile;
