import { analyzeResume } from "./analyze";
import type { ProcessedJob } from "./types";

const baseJob: ProcessedJob = {
  id: "job-1",
  title: "Data Analyst",
  company: "ExampleCo",
  level: "Mid",
  location: "Remote",
  raw_text: "We are hiring a Data Analyst.",
  skills: ["sql", "python", "statistics"],
  keywords: ["sql", "python", "etl", "dashboarding"],
  responsibilities: ["build dashboards", "analyze data"],
  must_haves: ["sql", "python"],
  nice_to_haves: ["etl", "dashboarding"],
  updated_at: "2026-04-08",
};

describe("analyzeResume", () => {
  it("computes weighted match score from must-haves and nice-to-haves", () => {
    const result = analyzeResume({
      jobText: "Data Analyst role",
      resumeText: "Experienced in SQL and dashboarding.",
      processedJobs: [baseJob],
    });

    expect(result.matchScore).toBeCloseTo(0.5, 5);
  });

  it("returns missing must-have skills as gaps", () => {
    const result = analyzeResume({
      jobText: "Data Analyst role",
      resumeText: "Strong SQL background.",
      processedJobs: [baseJob],
    });

    expect(result.gaps).toEqual(["python"]);
  });

  it("selects the best reference job from skill evidence even when the title differs", () => {
    const biJobText =
      "BI Developer role. Must have SQL, data modeling, and Power BI. Nice to have Airflow.";
    const result = analyzeResume({
      jobText: biJobText,
      resumeText: "Built Power BI dashboards with strong SQL and data modeling.",
      processedJobs: [
        baseJob,
        {
          ...baseJob,
          id: "job-3",
          title: "Business Intelligence Developer",
          must_haves: ["sql", "data modeling", "power bi"],
          nice_to_haves: ["airflow", "aws"],
          keywords: ["sql", "power bi", "airflow", "aws"],
        },
      ],
    });

    expect(result.metadata.matchedJobTitle).toBe("Business Intelligence Developer");
    expect(result.gaps).toEqual([]);
  });

  it("treats common experimentation synonyms as evidence for the skill", () => {
    const productJob: ProcessedJob = {
      ...baseJob,
      id: "job-2",
      title: "Product Data Scientist",
      must_haves: ["python", "sql", "experimentation"],
      nice_to_haves: ["dbt"],
      keywords: ["python", "sql", "a/b testing", "dbt"],
    };

    const result = analyzeResume({
      jobText: "Product data scientist role with Python, SQL, and experimentation.",
      resumeText: "Python, SQL, and A/B testing experience across growth teams.",
      processedJobs: [productJob],
    });

    expect(result.gaps).toEqual([]);
    expect(result.matchScore).toBeCloseTo(0.7, 5);
  });
});
