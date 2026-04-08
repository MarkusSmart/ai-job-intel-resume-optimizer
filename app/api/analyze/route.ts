import { createFileJobsProvider } from "@/lib/jobs";
import { generateLlmInsights } from "@/lib/llm";
import { createAnalysisPipeline } from "@/lib/pipeline";

type AnalyzePayload = {
  jobText?: string;
  resumeText?: string;
};

const pipeline = createAnalysisPipeline({
  jobsProvider: createFileJobsProvider(),
  llmProvider: { generate: generateLlmInsights },
});

export async function POST(request: Request) {
  const payload = (await request.json()) as AnalyzePayload;

  if (!payload.jobText || !payload.resumeText) {
    return Response.json(
      { error: "jobText and resumeText are required." },
      { status: 400 }
    );
  }

  const result = await pipeline.analyze({
    jobText: payload.jobText,
    resumeText: payload.resumeText,
  });

  return Response.json(result);
}
