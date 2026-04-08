import { analyzeResume } from "./analyze";
import type { AnalysisResponse, LlmInsights, ProcessedJob } from "./types";

export type JobsProvider = {
  list: () => Promise<ProcessedJob[]>;
};

export type LlmProvider = {
  generate: (input: {
    jobText: string;
    resumeText: string;
    gaps: string[];
  }) => Promise<LlmInsights>;
};

export const createAnalysisPipeline = ({
  jobsProvider,
  llmProvider,
}: {
  jobsProvider: JobsProvider;
  llmProvider: LlmProvider;
}) => ({
  analyze: async ({
    jobText,
    resumeText,
  }: {
    jobText: string;
    resumeText: string;
  }): Promise<AnalysisResponse> => {
    const jobs = await jobsProvider.list();
    const analysis = analyzeResume({
      jobText,
      resumeText,
      processedJobs: jobs,
    });

    const insights = await llmProvider.generate({
      jobText,
      resumeText,
      gaps: analysis.gaps,
    });

    return {
      ...analysis,
      ...insights,
    };
  },
});
