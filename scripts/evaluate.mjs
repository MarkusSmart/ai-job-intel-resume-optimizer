import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeResume } from "../lib/analyze.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const processedJobsPath = path.join(root, "data", "processed_jobs.json");
const casesPath = path.join(root, "evaluation", "cases.json");
const resultsPath = path.join(root, "evaluation", "results.json");

const scoreRatio = (matched, total) => (total === 0 ? 0 : matched / total);

const buildStubInsights = (gaps) => ({
  gap_skills: gaps,
  resume_improvements: [
    "Quantify impact in at least one bullet.",
    "Mirror the job language for the strongest matched skills.",
    "Add one bullet tied directly to the missing core requirement.",
  ],
  keyword_suggestions: gaps.length > 0 ? gaps : ["sql", "python"],
  summary:
    gaps.length === 0
      ? "Strong match for the role."
      : "Good foundation, but key skills are still missing.",
});

const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const includesKeyword = (haystack, needle) =>
  haystack.includes(needle.toLowerCase());

const analyzeResumeBaseline = ({ jobText, resumeText, processedJobs }) => {
  if (processedJobs.length === 0) {
    return {
      matchScore: 0,
      gaps: [],
      keywords: [],
      summary: "No processed jobs available for comparison.",
      metadata: {
        matchedJobId: null,
        matchedJobTitle: null,
        jobSelectionScore: 0,
        titleMatched: false,
        mustHaveMatched: [],
        niceToHaveMatched: [],
      },
    };
  }

  const normalizedJobText = jobText.toLowerCase();
  const normalizedResumeText = resumeText.toLowerCase();

  const matchedJob =
    processedJobs.find((job) =>
      normalizedJobText.includes(job.title.toLowerCase())
    ) ?? processedJobs[0];

  const mustFound = matchedJob.must_haves.filter((item) =>
    includesKeyword(normalizedResumeText, item)
  );
  const niceFound = matchedJob.nice_to_haves.filter((item) =>
    includesKeyword(normalizedResumeText, item)
  );

  const mustRatio = scoreRatio(mustFound.length, matchedJob.must_haves.length);
  const niceRatio = scoreRatio(niceFound.length, matchedJob.nice_to_haves.length);
  const gaps = matchedJob.must_haves.filter(
    (item) => !includesKeyword(normalizedResumeText, item)
  );

  return {
    matchScore: 0.7 * mustRatio + 0.3 * niceRatio,
    gaps,
    keywords: matchedJob.keywords,
    summary:
      gaps.length === 0
        ? "Strong match based on core requirements."
        : "Some core requirements are missing.",
    metadata: {
      matchedJobId: matchedJob.id,
      matchedJobTitle: matchedJob.title,
      jobSelectionScore: normalizedJobText.includes(matchedJob.title.toLowerCase())
        ? 1
        : 0,
      titleMatched: normalizedJobText.includes(matchedJob.title.toLowerCase()),
      mustHaveMatched: [],
      niceToHaveMatched: [],
    },
  };
};

const sortStrings = (values) => [...values].sort((left, right) => left.localeCompare(right));

const setMetrics = (predicted, expected) => {
  const predictedSet = new Set(predicted.map(normalize));
  const expectedSet = new Set(expected.map(normalize));
  const intersection = [...predictedSet].filter((item) => expectedSet.has(item));

  if (predictedSet.size === 0 && expectedSet.size === 0) {
    return {
      precision: 1,
      recall: 1,
      f1: 1,
      exactMatch: true,
    };
  }

  const precision = scoreRatio(intersection.length, predictedSet.size);
  const recall = scoreRatio(intersection.length, expectedSet.size);
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    precision,
    recall,
    f1,
    exactMatch:
      sortStrings([...predictedSet]).join("|") ===
      sortStrings([...expectedSet]).join("|"),
  };
};

const average = (values) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const evaluateSystem = async ({ label, analyzeCase, jobs, cases }) => {
  const results = [];

  for (const evaluationCase of cases) {
    const analysis = analyzeCase({
      jobText: evaluationCase.jobText,
      resumeText: evaluationCase.resumeText,
      processedJobs: jobs,
    });

    const response = {
      ...analysis,
      ...buildStubInsights(analysis.gaps),
    };

    const gapMetrics = setMetrics(
      analysis.gaps,
      evaluationCase.expectedMissingSkills
    );
    const matchedJobCorrect =
      analysis.metadata.matchedJobId === evaluationCase.expectedMatchedJobId;
    const taskSuccess =
      matchedJobCorrect &&
      gapMetrics.exactMatch &&
      response.resume_improvements.length > 0 &&
      response.summary.length > 0;

    results.push({
      id: evaluationCase.id,
      kind: evaluationCase.kind,
      notes: evaluationCase.notes,
      expectedMatchedJobId: evaluationCase.expectedMatchedJobId,
      actualMatchedJobId: analysis.metadata.matchedJobId,
      expectedMissingSkills: evaluationCase.expectedMissingSkills,
      actualMissingSkills: analysis.gaps,
      gapMetrics,
      matchedJobCorrect,
      taskSuccess,
      matchScore: analysis.matchScore,
      selectionScore: analysis.metadata.jobSelectionScore,
      llmOutputValid:
        response.resume_improvements.length >= 1 &&
        response.resume_improvements.length <= 5 &&
        Array.isArray(response.keyword_suggestions),
    });
  }

  const representativeResults = results.filter((result) => result.kind === "representative");
  const failureResults = results.filter((result) => result.kind === "failure");

  return {
    label,
    summary: {
      outputQuality: {
        averageGapF1: average(results.map((result) => result.gapMetrics.f1)),
        exactGapMatchRate: average(
          results.map((result) => (result.gapMetrics.exactMatch ? 1 : 0))
        ),
      },
      endToEndTaskSuccess: {
        allCases: average(results.map((result) => (result.taskSuccess ? 1 : 0))),
        representativeCases: average(
          representativeResults.map((result) => (result.taskSuccess ? 1 : 0))
        ),
      },
      upstreamComponent: {
        metric: "reference_job_selection_accuracy",
        accuracyAllCases: average(
          results.map((result) => (result.matchedJobCorrect ? 1 : 0))
        ),
        accuracyRepresentativeCases: average(
          representativeResults.map((result) =>
            result.matchedJobCorrect ? 1 : 0
          )
        ),
      },
      failureCaseCount: failureResults.filter((result) => !result.taskSuccess).length,
    },
    cases: results,
  };
};

const main = async () => {
  const [jobsRaw, casesRaw] = await Promise.all([
    readFile(processedJobsPath, "utf-8"),
    readFile(casesPath, "utf-8"),
  ]);

  const jobs = JSON.parse(jobsRaw);
  const cases = JSON.parse(casesRaw);

  const improvedWithResults = await evaluateSystem({
    label: "improved",
    analyzeCase: analyzeResume,
    jobs,
    cases,
  });

  const baseline = await evaluateSystem({
    label: "baseline",
    analyzeCase: analyzeResumeBaseline,
    jobs,
    cases,
  });

  const output = {
    generatedAt: new Date().toISOString(),
    datasetSize: jobs.length,
    caseCount: cases.length,
    systems: {
      baseline,
      improved: improvedWithResults,
    },
    comparison: {
      outputQualityDelta:
        improvedWithResults.summary.outputQuality.averageGapF1 -
        baseline.summary.outputQuality.averageGapF1,
      exactGapMatchDelta:
        improvedWithResults.summary.outputQuality.exactGapMatchRate -
        baseline.summary.outputQuality.exactGapMatchRate,
      endToEndDelta:
        improvedWithResults.summary.endToEndTaskSuccess.allCases -
        baseline.summary.endToEndTaskSuccess.allCases,
      upstreamDelta:
        improvedWithResults.summary.upstreamComponent.accuracyAllCases -
        baseline.summary.upstreamComponent.accuracyAllCases,
    },
  };

  await mkdir(path.dirname(resultsPath), { recursive: true });
  await writeFile(resultsPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(
    JSON.stringify(
      {
        resultsPath: path.relative(root, resultsPath),
        comparison: output.comparison,
        improvedSummary: improvedWithResults.summary,
        baselineSummary: baseline.summary,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exit(1);
});
