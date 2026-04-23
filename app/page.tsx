"use client";

import { useMemo, useState, useTransition } from "react";

type AnalysisResponse = {
  matchScore: number;
  gaps: string[];
  keywords: string[];
  summary: string;
  metadata: {
    matchedJobId: string | null;
    matchedJobTitle: string | null;
    jobSelectionScore: number;
    titleMatched: boolean;
    mustHaveMatched: string[];
    niceToHaveMatched: string[];
  };
  gap_skills: string[];
  resume_improvements: string[];
  keyword_suggestions: string[];
};

type Scenario = {
  name: string;
  label: string;
  jobText: string;
  resumeText: string;
};

type AnalysisSnapshot = {
  id: string;
  label: string;
  score: number;
  role: string;
  gaps: string[];
};

const defaultJob = `Data Analyst
We are looking for a Data Analyst with SQL and Python experience. Nice to have: ETL, dashboarding.`;

const defaultResume = `Resume Highlights
- Built dashboards in Tableau
- Strong SQL background
- Worked on reporting pipelines`;

const scenarios: Scenario[] = [
  {
    name: "data-analyst",
    label: "Analyst Sprint",
    jobText:
      "Data Analyst role. Must have SQL and Python. Nice to have ETL, dashboarding, and stakeholder reporting.",
    resumeText:
      "Resume Highlights\n- Built Tableau dashboards for operations\n- Strong SQL background\n- Owned reporting pipelines and KPI reporting",
  },
  {
    name: "product-ds",
    label: "Experiment Ops",
    jobText:
      "Product Data Scientist role. Must have Python, SQL, and experimentation. Nice to have dbt and causal inference.",
    resumeText:
      "Resume Highlights\n- Built growth dashboards in Python and SQL\n- Worked with product managers on release analysis\n- Comfortable with A/B testing and experimentation design",
  },
  {
    name: "bi-developer",
    label: "BI Command",
    jobText:
      "BI Developer role. Must have SQL, data modeling, and Power BI. Nice to have Airflow and AWS.",
    resumeText:
      "Resume Highlights\n- Built Power BI executive dashboards\n- Created SQL models for finance reporting\n- Maintained ETL jobs and orchestration workflows",
  },
];

const countWords = (text: string) =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const buildScoreLabel = (score: number) => {
  if (score >= 0.8) {
    return "Launch-ready";
  }

  if (score >= 0.55) {
    return "Promising";
  }

  return "Needs tuning";
};

const buildSignalDensity = (text: string) => {
  const signalWords = [
    "sql",
    "python",
    "etl",
    "dashboard",
    "power bi",
    "dbt",
    "airflow",
    "experimentation",
    "analytics",
    "stakeholder",
  ];

  const normalized = text.toLowerCase();
  return signalWords.filter((word) => normalized.includes(word)).length;
};

export default function Home() {
  const [jobText, setJobText] = useState(defaultJob);
  const [resumeText, setResumeText] = useState(defaultResume);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisSnapshot[]>([]);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draftStats = useMemo(
    () => ({
      jobWords: countWords(jobText),
      resumeWords: countWords(resumeText),
      jobSignalDensity: buildSignalDensity(jobText),
      resumeSignalDensity: buildSignalDensity(resumeText),
    }),
    [jobText, resumeText]
  );

  const actionPlan = useMemo(() => {
    if (!result) {
      return [];
    }

    const primaryGap = result.gaps[0];
    const firstImprovement = result.resume_improvements[0];
    const firstKeyword = result.keyword_suggestions[0];

    return [
      primaryGap
        ? `Add one resume bullet that proves ${primaryGap} with an outcome or metric.`
        : "Your core must-have coverage looks strong; shift focus to stronger outcome bullets.",
      firstImprovement ?? "Refine one bullet so it mirrors the job language more closely.",
      firstKeyword
        ? `Thread the keyword "${firstKeyword}" into a high-impact experience bullet.`
        : "Highlight the strongest matching keywords near the top of the resume.",
    ];
  }, [result]);

  const latestScoreLabel = result ? buildScoreLabel(result.matchScore) : "Standby";
  const loading = isPending;

  const handleAnalyze = async () => {
    setError(null);
    setCopyMessage(null);

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

      startTransition(() => {
        setResult(data);
        setHistory((current) => [
          {
            id: `${Date.now()}`,
            label: buildScoreLabel(data.matchScore),
            score: data.matchScore,
            role: data.metadata.matchedJobTitle ?? "Unknown role",
            gaps: data.gaps,
          },
          ...current,
        ].slice(0, 4));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    }
  };

  const loadScenario = (scenario: Scenario) => {
    setJobText(scenario.jobText);
    setResumeText(scenario.resumeText);
    setResult(null);
    setError(null);
    setCopyMessage(null);
  };

  const clearDrafts = () => {
    setJobText("");
    setResumeText("");
    setResult(null);
    setError(null);
    setCopyMessage(null);
  };

  const swapTexts = () => {
    setJobText(resumeText);
    setResumeText(jobText);
    setResult(null);
    setError(null);
    setCopyMessage(null);
  };

  const copyReport = async () => {
    if (!result || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    const report = [
      "AI Job Intelligence Report",
      `Match score: ${(result.matchScore * 100).toFixed(0)}%`,
      `Readiness: ${buildScoreLabel(result.matchScore)}`,
      `Reference job used: ${result.metadata.matchedJobTitle ?? "Unknown"}`,
      `Missing skills: ${result.gaps.join(", ") || "None detected"}`,
      `Summary: ${result.summary}`,
      "Suggested resume bullets:",
      ...result.resume_improvements.map((item) => `- ${item}`),
    ].join("\n");

    await navigator.clipboard.writeText(report);
    setCopyMessage("Report copied.");
  };

  return (
    <main className="shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />

      <section className="hero panel">
        <div className="hero-copy">
          <div className="eyebrow-row">
            <span className="eyebrow">Assignment 6 Evolution</span>
            <span className="status-chip">{latestScoreLabel}</span>
          </div>
          <h1>AI Job Intelligence & Resume Optimizer</h1>
          <p className="hero-text">
            A sharper, more futuristic command center for testing resume
            readiness against structured job requirements and AI guidance.
          </p>
          <div className="hero-grid">
            <article className="metric-tile">
              <span className="metric-label">Job Draft</span>
              <strong>{draftStats.jobWords}</strong>
              <span>{draftStats.jobSignalDensity} detected skill signals</span>
            </article>
            <article className="metric-tile">
              <span className="metric-label">Resume Draft</span>
              <strong>{draftStats.resumeWords}</strong>
              <span>{draftStats.resumeSignalDensity} detected skill signals</span>
            </article>
            <article className="metric-tile">
              <span className="metric-label">Session Snapshots</span>
              <strong>{history.length}</strong>
              <span>Recent analyses saved in this session</span>
            </article>
          </div>
        </div>
        <div className="hero-orbit">
          <div className="orbital-frame">
            <div className="orbital-ring orbital-ring-one" />
            <div className="orbital-ring orbital-ring-two" />
            <div className="orbital-core">
              <span>Resume</span>
              <strong>Signal Mesh</strong>
              <small>Structured match + AI explanation</small>
            </div>
          </div>
        </div>
      </section>

      <section className="scenario-strip">
        {scenarios.map((scenario) => (
          <button
            key={scenario.name}
            className="scenario-card"
            type="button"
            onClick={() => loadScenario(scenario)}
          >
            <span>{scenario.label}</span>
            <strong>{scenario.jobText.split(".")[0]}</strong>
          </button>
        ))}
      </section>

      <section className="workspace-grid">
        <section className="panel composer-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Input Console</span>
              <h2>Mission Inputs</h2>
            </div>
            <div className="toolbar">
              <button className="secondary-button" type="button" onClick={swapTexts}>
                Swap
              </button>
              <button className="secondary-button" type="button" onClick={clearDrafts}>
                Clear
              </button>
            </div>
          </div>

          <div className="panel grid input-grid">
            <div>
              <h3>Job Posting</h3>
              <label htmlFor="job-posting">Job Posting</label>
              <textarea
                id="job-posting"
                aria-label="Job Posting"
                value={jobText}
                onChange={(event) => setJobText(event.target.value)}
                placeholder="Paste the target role, responsibilities, and must-have skills."
              />
            </div>
            <div>
              <h3>Resume</h3>
              <label htmlFor="resume-text">Resume</label>
              <textarea
                id="resume-text"
                aria-label="Resume"
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste your resume bullets, projects, and skills."
              />
            </div>
          </div>

          <div className="control-row">
            <button className="primary-button" onClick={handleAnalyze} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze"}
            </button>
            <p className="microcopy">
              Deterministic skill matching selects the reference role first,
              then the AI layer generates resume guidance.
            </p>
          </div>

          {error && <p className="error-text">{error}</p>}
        </section>

        <aside className="panel side-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Quick Futures</span>
              <h2>Enhancement Deck</h2>
            </div>
          </div>

          <div className="future-list">
            <article className="future-card">
              <span className="future-badge">Now</span>
              <strong>Scenario presets</strong>
              <p>Instantly load realistic test roles for cleaner demos.</p>
            </article>
            <article className="future-card">
              <span className="future-badge">Now</span>
              <strong>Session snapshots</strong>
              <p>Keep the last few analyses visible for quick comparison.</p>
            </article>
            <article className="future-card">
              <span className="future-badge">Next</span>
              <strong>Report export</strong>
              <p>Copy a compact recruiter-facing summary to reuse elsewhere.</p>
            </article>
            <article className="future-card">
              <span className="future-badge future-badge-alt">Later</span>
              <strong>Document ingest</strong>
              <p>Extend the app with PDF parsing and tracked resume versions.</p>
            </article>
          </div>

          <div className="snapshot-block">
            <div className="snapshot-heading">
              <h3>Recent snapshots</h3>
              <span>{history.length}/4</span>
            </div>
            {history.length === 0 ? (
              <p className="empty-state">Run an analysis to populate your mission log.</p>
            ) : (
              <div className="snapshot-list">
                {history.map((item) => (
                  <article key={item.id} className="snapshot-card">
                    <div>
                      <strong>{item.role}</strong>
                      <span>{item.label}</span>
                    </div>
                    <div className="snapshot-score">
                      {(item.score * 100).toFixed(0)}%
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>

      {result && (
        <section className="results results-shell">
          <section className="panel results-hero">
            <div className="results-headline">
              <div>
                <span className="section-kicker">Analysis Output</span>
                <h2>Results</h2>
                <p>{result.summary}</p>
              </div>
              <div className="score-orb">
                <span>Match score:</span>
                <strong>{(result.matchScore * 100).toFixed(0)}%</strong>
                <small>{buildScoreLabel(result.matchScore)}</small>
              </div>
            </div>

            <div className="signal-grid">
              <article className="signal-card">
                <span>Reference job used</span>
                <strong>{result.metadata.matchedJobTitle ?? "Unknown"}</strong>
                <small>
                  Selection score {result.metadata.jobSelectionScore}
                </small>
              </article>
              <article className="signal-card">
                <span>Core matches</span>
                <strong>{result.metadata.mustHaveMatched.length}</strong>
                <small>Must-have requirements recognized</small>
              </article>
              <article className="signal-card">
                <span>Nice-to-have matches</span>
                <strong>{result.metadata.niceToHaveMatched.length}</strong>
                <small>Bonus skills already present</small>
              </article>
            </div>

            <div className="progress-stack">
              <div>
                <div className="progress-labels">
                  <span>Core fit</span>
                  <span>{result.metadata.mustHaveMatched.length} hits</span>
                </div>
                <div className="progress-rail">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, result.matchScore * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="progress-labels">
                  <span>Selection evidence</span>
                  <span>{result.metadata.jobSelectionScore}</span>
                </div>
                <div className="progress-rail secondary-rail">
                  <div
                    className="progress-fill secondary-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        result.metadata.jobSelectionScore * 4
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="results-grid">
            <section className="panel insights-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">AI Guidance</span>
                  <h3>Action Plan</h3>
                </div>
                <button className="secondary-button" type="button" onClick={copyReport}>
                  Copy report
                </button>
              </div>
              {copyMessage && <p className="copy-message">{copyMessage}</p>}
              <ol className="action-list">
                {actionPlan.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <div className="stack-block">
                <strong>Suggested resume bullets:</strong>
                <ul>
                  {result.resume_improvements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="panel taxonomy-panel">
              <span className="section-kicker">Coverage Map</span>
              <h3>Signal clusters</h3>

              <div className="stack-block">
                <strong>Missing skills:</strong>
                <div className="pill-wrap">
                  {result.gaps.length === 0
                    ? "None detected."
                    : result.gaps.map((gap) => (
                        <span key={gap} className="pill pill-alert">
                          {gap}
                        </span>
                      ))}
                </div>
              </div>

              <div className="stack-block">
                <strong>Keywords to highlight:</strong>
                <div className="pill-wrap">
                  {result.keywords.map((keyword) => (
                    <span key={keyword} className="pill">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="stack-block">
                <strong>Suggested keywords:</strong>
                <div className="pill-wrap">
                  {result.keyword_suggestions.map((keyword) => (
                    <span key={keyword} className="pill pill-cyan">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel model-panel">
              <span className="section-kicker">Model Overlay</span>
              <h3>LLM skill gaps</h3>
              <div className="pill-wrap">
                {result.gap_skills.length === 0
                  ? "None detected."
                  : result.gap_skills.map((gap) => (
                      <span key={gap} className="pill pill-violet">
                        {gap}
                      </span>
                    ))}
              </div>

              <div className="timeline">
                <article className="timeline-item">
                  <span>01</span>
                  <div>
                    <strong>Structured role match</strong>
                    <p>Choose the closest stored role and calculate deterministic fit.</p>
                  </div>
                </article>
                <article className="timeline-item">
                  <span>02</span>
                  <div>
                    <strong>Gap extraction</strong>
                    <p>Identify must-have gaps before prompting the AI layer.</p>
                  </div>
                </article>
                <article className="timeline-item">
                  <span>03</span>
                  <div>
                    <strong>Resume guidance</strong>
                    <p>Generate concise bullets and keyword suggestions for revision.</p>
                  </div>
                </article>
              </div>
            </section>

            <details className="panel debug-panel">
              <summary>Neural trace and debug metadata</summary>
              <div className="debug-grid">
                <div>
                  <strong>Selection evidence:</strong>
                  <p>
                    {result.metadata.mustHaveMatched.length} must-have match(es),{" "}
                    {result.metadata.niceToHaveMatched.length} nice-to-have match(es),
                    score {result.metadata.jobSelectionScore}
                  </p>
                </div>
                <div>
                  <strong>Title matched directly:</strong>
                  <p>{result.metadata.titleMatched ? "Yes" : "No"}</p>
                </div>
                <div>
                  <strong>Matched must-haves:</strong>
                  <div className="pill-wrap">
                    {result.metadata.mustHaveMatched.length === 0
                      ? "None"
                      : result.metadata.mustHaveMatched.map((item) => (
                          <span key={item} className="pill pill-outline">
                            {item}
                          </span>
                        ))}
                  </div>
                </div>
                <div>
                  <strong>Matched nice-to-haves:</strong>
                  <div className="pill-wrap">
                    {result.metadata.niceToHaveMatched.length === 0
                      ? "None"
                      : result.metadata.niceToHaveMatched.map((item) => (
                          <span key={item} className="pill pill-outline">
                            {item}
                          </span>
                        ))}
                  </div>
                </div>
              </div>
            </details>
          </section>
        </section>
      )}
    </main>
  );
}
