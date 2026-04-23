export type ProcessedJob = {
  id: string;
  title: string;
  company: string;
  level: string;
  location: string;
  raw_text: string;
  skills: string[];
  keywords: string[];
  responsibilities: string[];
  must_haves: string[];
  nice_to_haves: string[];
  updated_at: string;
};

export type AnalysisMetadata = {
  matchedJobId: string | null;
  matchedJobTitle: string | null;
  jobSelectionScore: number;
  titleMatched: boolean;
  mustHaveMatched: string[];
  niceToHaveMatched: string[];
};

export type AnalysisResult = {
  matchScore: number;
  gaps: string[];
  keywords: string[];
  summary: string;
  metadata: AnalysisMetadata;
};

export type LlmInsights = {
  gap_skills: string[];
  resume_improvements: string[];
  keyword_suggestions: string[];
  summary: string;
};

export type AnalysisResponse = AnalysisResult & LlmInsights;
