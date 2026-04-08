"use client";

import { useState } from "react";

type AnalysisResponse = {
  matchScore: number;
  gaps: string[];
  keywords: string[];
  summary: string;
  gap_skills: string[];
  resume_improvements: string[];
  keyword_suggestions: string[];
};

const defaultJob = `Data Analyst\nWe are looking for a Data Analyst with SQL and Python experience. Nice to have: ETL, dashboarding.`;

const defaultResume = `Resume Highlights\n- Built dashboards in Tableau\n- Strong SQL background\n- Worked on reporting pipelines`;

export default function Home() {
  const [jobText, setJobText] = useState(defaultJob);
  const [resumeText, setResumeText] = useState(defaultResume);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobText, resumeText }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed. Please try again.");
      }

      const data = (await response.json()) as AnalysisResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>AI Job Intelligence & Resume Optimizer</h1>
      <p>
        Paste a job posting and your resume to see match score, missing skills,
        and improvement hints.
      </p>

      <section className="panel grid">
        <div>
          <h2>Job Posting</h2>
          <textarea
            value={jobText}
            onChange={(event) => setJobText(event.target.value)}
          />
        </div>
        <div>
          <h2>Resume</h2>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
          />
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </section>

      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {result && (
        <section className="results panel">
          <h2>Results</h2>
          <p>
            <strong>Match score:</strong>{" "}
            {(result.matchScore * 100).toFixed(0)}%
          </p>
          <p>
            <strong>Summary:</strong> {result.summary}
          </p>
          <div>
            <strong>Missing skills:</strong>
            <div>
              {result.gaps.length === 0
                ? "None detected."
                : result.gaps.map((gap) => (
                    <span key={gap} className="pill">
                      {gap}
                    </span>
                  ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <strong>Keywords to highlight:</strong>
            <div>
              {result.keywords.map((keyword) => (
                <span key={keyword} className="pill">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <strong>LLM skill gaps:</strong>
            <div>
              {result.gap_skills.length === 0
                ? "None detected."
                : result.gap_skills.map((gap) => (
                    <span key={gap} className="pill">
                      {gap}
                    </span>
                  ))}
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <strong>Suggested resume bullets:</strong>
            <ul>
              {result.resume_improvements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: 20 }}>
            <strong>Suggested keywords:</strong>
            <div>
              {result.keyword_suggestions.map((keyword) => (
                <span key={keyword} className="pill">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
