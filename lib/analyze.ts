import type { AnalysisMetadata, AnalysisResult, ProcessedJob } from "./types";

type AnalyzeInput = {
  jobText: string;
  resumeText: string;
  processedJobs: ProcessedJob[];
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const conceptAliases: Record<string, string[]> = {
  experimentation: [
    "experimentation",
    "experiment design",
    "a b testing",
    "ab testing",
    "a b test",
    "ab test",
    "running experiments",
    "run experiments",
    "experiments",
  ],
  dashboarding: ["dashboarding", "dashboards", "dashboard"],
  etl: ["etl", "data pipelines", "data pipeline", "pipelines", "pipeline"],
  "power bi": ["power bi", "powerbi"],
  "data modeling": [
    "data modeling",
    "data modelling",
    "dimensional modeling",
    "dimensional modelling",
  ],
  aws: ["aws", "amazon web services"],
};

const aliasLookup = new Map<string, string>();

for (const [canonical, aliases] of Object.entries(conceptAliases)) {
  for (const alias of aliases) {
    aliasLookup.set(normalize(alias), canonical);
  }
}

const unique = <T>(values: T[]) => Array.from(new Set(values));

const canonicalizeConcept = (value: string) =>
  aliasLookup.get(normalize(value)) ?? normalize(value);

const conceptVariants = (value: string) => {
  const canonical = canonicalizeConcept(value);
  return unique([canonical, ...(conceptAliases[canonical] ?? [])].map(normalize));
};

const includesPhrase = (haystack: string, phrase: string) =>
  ` ${haystack} `.includes(` ${normalize(phrase)} `);

const includesConcept = (haystack: string, concept: string) =>
  conceptVariants(concept).some((variant) => includesPhrase(haystack, variant));

const buildTitleVariants = (title: string) => {
  const normalizedTitle = normalize(title);
  const tokens = normalizedTitle.split(" ").filter(Boolean);

  if (tokens.length < 2) {
    return [normalizedTitle];
  }

  const acronym = tokens.slice(0, -1).map((token) => token[0]).join("");
  return unique([
    normalizedTitle,
    acronym.length > 1 ? `${acronym} ${tokens[tokens.length - 1]}` : "",
  ]).filter(Boolean);
};

const ratio = (matched: number, total: number) =>
  total === 0 ? 0 : matched / total;

type JobSelection = {
  job: ProcessedJob;
  metadata: AnalysisMetadata;
};

const emptyMetadata = (): AnalysisMetadata => ({
  matchedJobId: null,
  matchedJobTitle: null,
  jobSelectionScore: 0,
  titleMatched: false,
  mustHaveMatched: [],
  niceToHaveMatched: [],
});

const selectBestJob = (
  normalizedJobText: string,
  processedJobs: ProcessedJob[]
): JobSelection => {
  const scoredJobs = processedJobs.map((job) => {
    const mustHaveMatched = job.must_haves.filter((item) =>
      includesConcept(normalizedJobText, item)
    );
    const niceToHaveMatched = job.nice_to_haves.filter((item) =>
      includesConcept(normalizedJobText, item)
    );
    const keywordMatches = job.keywords.filter((item) =>
      includesConcept(normalizedJobText, item)
    ).length;
    const titleMatched = buildTitleVariants(job.title).some((variant) =>
      includesPhrase(normalizedJobText, variant)
    );

    return {
      job,
      metadata: {
        matchedJobId: job.id,
        matchedJobTitle: job.title,
        jobSelectionScore:
          mustHaveMatched.length * 4 +
          niceToHaveMatched.length * 2 +
          keywordMatches +
          (titleMatched ? 6 : 0),
        titleMatched,
        mustHaveMatched,
        niceToHaveMatched,
      },
    };
  });

  const bestMatch = scoredJobs.sort((left, right) => {
    if (right.metadata.jobSelectionScore !== left.metadata.jobSelectionScore) {
      return right.metadata.jobSelectionScore - left.metadata.jobSelectionScore;
    }

    return (
      right.metadata.mustHaveMatched.length - left.metadata.mustHaveMatched.length
    );
  })[0];

  return bestMatch ?? { job: processedJobs[0], metadata: emptyMetadata() };
};

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
      metadata: emptyMetadata(),
    };
  }

  const jobTextNormalized = normalize(jobText);
  const resumeNormalized = normalize(resumeText);

  const { job: matchedJob, metadata } = selectBestJob(
    jobTextNormalized,
    processedJobs
  );

  const mustFound = matchedJob.must_haves.filter((item) =>
    includesConcept(resumeNormalized, item)
  );
  const niceFound = matchedJob.nice_to_haves.filter((item) =>
    includesConcept(resumeNormalized, item)
  );

  const mustRatio = ratio(mustFound.length, matchedJob.must_haves.length);
  const niceRatio = ratio(niceFound.length, matchedJob.nice_to_haves.length);

  const matchScore = 0.7 * mustRatio + 0.3 * niceRatio;
  const gaps = matchedJob.must_haves.filter(
    (item) => !includesConcept(resumeNormalized, item)
  );

  return {
    matchScore,
    gaps,
    keywords: matchedJob.keywords,
    summary:
      gaps.length === 0
        ? "Strong match based on core requirements."
        : "Some core requirements are missing.",
    metadata,
  };
};
