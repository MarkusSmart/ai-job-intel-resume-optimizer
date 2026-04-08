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
});
