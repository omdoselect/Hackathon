// PDF text extraction utility
// Uses pdfjs-dist v2 (Node 14 compatible)

export async function extractTextFromPDF(file) {
  try {
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");

    // v2 worker setup
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (err) {
    console.error("PDF parsing error:", err);
    throw new Error("Could not read PDF. Please ensure it is a valid PDF file.");
  }
}

// Parse raw resume text into structured JSON matching candidate_profile.json schema
export function parseResumeTextToProfile(text, existingProfile = {}) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const findSection = (keywords) =>
    lines.findIndex((l) =>
      keywords.some((kw) => l.toLowerCase().includes(kw.toLowerCase()))
    );

  const allSectionHeaders = [
    "experience", "education", "skills", "projects",
    "certifications", "summary", "objective", "work history",
  ];

  const getLinesUntilNextSection = (startIdx) => {
    const result = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      const isNewSection = allSectionHeaders.some(
        (kw) => lines[i].toLowerCase().includes(kw) && lines[i].length < 40
      );
      if (isNewSection) break;
      result.push(lines[i]);
    }
    return result;
  };

  // Name
  const name = existingProfile.name || lines[0] || "Unknown";

  // Email
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  const email = emailMatch ? emailMatch[0] : null;

  // Phone
  const phoneMatch = text.match(/(\+91[-\s]?)?[6-9]\d{9}/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  // Location
  const cities = ["Bangalore", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Noida", "Gurugram"];
  const locationMatch = cities.find((c) => text.toLowerCase().includes(c.toLowerCase()));
  const location = locationMatch || existingProfile.location || "India";

  // Skills
  const knownSkills = [
    "JavaScript", "TypeScript", "React", "React.js", "Node.js", "Express", "Express.js",
    "MongoDB", "Mongoose", "REST API", "Redux", "HTML5", "CSS3", "Tailwind",
    "Git", "GitHub", "JWT", "Docker", "AWS", "CI/CD", "Python", "Java",
    "SQL", "PostgreSQL", "MySQL", "GraphQL", "Angular", "Vue",
  ];
  const foundSkills = knownSkills.filter((skill) =>
    text.toLowerCase().includes(skill.toLowerCase())
  );
  const skills = foundSkills.length > 0 ? foundSkills : existingProfile.skills || [];

  // Summary
  const summaryIdx = findSection(["summary", "objective", "about me", "profile"]);
  let summary = existingProfile.resume?.summary || "";
  if (summaryIdx !== -1) {
    const summaryLines = getLinesUntilNextSection(summaryIdx);
    if (summaryLines.length > 0) summary = summaryLines.join(" ").substring(0, 500);
  }

  // Experience years
  const expMatch = text.match(/(\d+(\.\d+)?)\s*(years?|yrs?)\s*(of\s*)?(experience|exp)/i);
  const experienceYears = expMatch ? parseFloat(expMatch[1]) : existingProfile.experience_years || 0;

  // Education
  const educationIdx = findSection(["education", "qualification", "academic"]);
  let education = existingProfile.education || {};
  if (educationIdx !== -1) {
    const edLines = getLinesUntilNextSection(educationIdx);
    const degreeKeywords = ["B.Tech", "B.E.", "M.Tech", "MBA", "BCA", "MCA", "B.Sc", "M.Sc"];
    const degreeLine = edLines.find((l) => degreeKeywords.some((kw) => l.includes(kw)));
    if (degreeLine) {
      education = {
        ...education,
        degree: degreeLine.split(/[,@–-]/)[0].trim(),
        university: edLines[edLines.indexOf(degreeLine) + 1] || education.university || "",
      };
    }
  }

  return {
    candidate_id: existingProfile.candidate_id || `CAND-${Date.now().toString().slice(-5)}`,
    name,
    experience_years: experienceYears,
    current_title: existingProfile.current_title || "Software Engineer",
    location,
    expected_salary_lpa: existingProfile.expected_salary_lpa || null,
    preferred_roles: existingProfile.preferred_roles || [],
    skills,
    education,
    contact: { email, phone },
    resume: {
      summary,
      work_experience: existingProfile.resume?.work_experience || [],
      projects: existingProfile.resume?.projects || [],
      certifications: existingProfile.resume?.certifications || [],
    },
    _resume_parsed_at: new Date().toISOString(),
    _raw_text_preview: text.substring(0, 300) + "...",
  };
}

export function mergeProfiles(existing, parsed) {
  return {
    ...existing,
    ...parsed,
    skills: [...new Set([...(existing.skills || []), ...(parsed.skills || [])])],
    education: { ...existing.education, ...parsed.education },
    contact: { ...(existing.contact || {}), ...parsed.contact },
    resume: {
      summary: parsed.resume?.summary || existing.resume?.summary || "",
      work_experience: existing.resume?.work_experience || parsed.resume?.work_experience || [],
      projects: existing.resume?.projects || parsed.resume?.projects || [],
      certifications: existing.resume?.certifications || parsed.resume?.certifications || [],
    },
    _resume_parsed_at: parsed._resume_parsed_at,
  };
}
