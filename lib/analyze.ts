import type { AnalysisResult, ProcessedJob } from "./types";

type AnalyzeInput = {
  jobText: string;
  resumeText: string;
  processedJobs: ProcessedJob[];
};

const normalize = (text: string) => text.toLowerCase();

const includesKeyword = (haystack: string, needle: string) =>
  haystack.includes(needle.toLowerCase());

const ratio = (matched: number, total: number) =>
  total === 0 ? 0 : matched / total;

export const analyzeResume = ({
  jobText,
  resumeText,
  processedJobs,
}: AnalyzeInput): AnalysisResult => {
  if (processedJobs.length === 0) {
    return {
      matchScore: 0,
      gaps: [],
      keywords: [],
      summary: "No processed jobs available for comparison.",
    };
  }

  const jobTextNormalized = normalize(jobText);
  const resumeNormalized = normalize(resumeText);

  const matchedJob =
    processedJobs.find((job) =>
      jobTextNormalized.includes(job.title.toLowerCase())
    ) ?? processedJobs[0];

  const mustFound = matchedJob.must_haves.filter((item) =>
    includesKeyword(resumeNormalized, item)
  );
  const niceFound = matchedJob.nice_to_haves.filter((item) =>
    includesKeyword(resumeNormalized, item)
  );

  const mustRatio = ratio(mustFound.length, matchedJob.must_haves.length);
  const niceRatio = ratio(niceFound.length, matchedJob.nice_to_haves.length);

  const matchScore = 0.7 * mustRatio + 0.3 * niceRatio;
  const gaps = matchedJob.must_haves.filter(
    (item) => !includesKeyword(resumeNormalized, item)
  );

  return {
    matchScore,
    gaps,
    keywords: matchedJob.keywords,
    summary:
      gaps.length === 0
        ? "Strong match based on core requirements."
        : "Some core requirements are missing.",
  };
};
