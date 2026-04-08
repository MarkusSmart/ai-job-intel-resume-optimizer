import { analyzeResume, ProcessedJob } from "@/lib/analyze";
import { generateLlmInsights } from "@/lib/llm";
import { readFile } from "fs/promises";
import path from "path";

type AnalyzePayload = {
  jobText?: string;
  resumeText?: string;
};

const dataPath = path.join(process.cwd(), "data", "processed_jobs.json");

export async function POST(request: Request) {
  const payload = (await request.json()) as AnalyzePayload;

  if (!payload.jobText || !payload.resumeText) {
    return Response.json(
      { error: "jobText and resumeText are required." },
      { status: 400 }
    );
  }

  const raw = await readFile(dataPath, "utf-8");
  const processedJobs = JSON.parse(raw) as ProcessedJob[];

  const result = analyzeResume({
    jobText: payload.jobText,
    resumeText: payload.resumeText,
    processedJobs,
  });

  const insights = await generateLlmInsights({
    jobText: payload.jobText,
    resumeText: payload.resumeText,
    gaps: result.gaps,
  });

  return Response.json({
    ...result,
    ...insights,
  });
}
