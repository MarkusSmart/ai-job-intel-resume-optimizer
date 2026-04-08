import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const LlmInsightsSchema = z.object({
  gap_skills: z.array(z.string()).min(0),
  resume_improvements: z.array(z.string()).min(1).max(5),
  keyword_suggestions: z.array(z.string()).min(0),
  summary: z.string(),
});

export type LlmInsights = z.infer<typeof LlmInsightsSchema>;

const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

const buildPrompt = (jobText: string, resumeText: string) => [
  {
    role: "system",
    content:
      "You are a resume optimization assistant. Provide concise, structured guidance tailored to the job posting.",
  },
  {
    role: "user",
    content: `Job posting:\n${jobText}\n\nResume:\n${resumeText}\n\nReturn gaps, bullet improvements, keyword suggestions, and a short summary.`,
  },
];

const stubResponse = (gaps: string[]): LlmInsights => ({
  gap_skills: gaps,
  resume_improvements: [
    "Rewrite one bullet to quantify impact (metrics, % improvement, or scale).",
    "Add a bullet that highlights SQL and Python usage tied to business outcomes.",
    "Include a bullet that mentions dashboards or reporting for stakeholders.",
  ],
  keyword_suggestions: ["SQL", "Python", "ETL", "Dashboarding"],
  summary: "Good foundation, but add missing core skills and quantify results.",
});

export const generateLlmInsights = async ({
  jobText,
  resumeText,
  gaps,
}: {
  jobText: string;
  resumeText: string;
  gaps: string[];
}): Promise<LlmInsights> => {
  if (!process.env.OPENAI_API_KEY) {
    return stubResponse(gaps);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: defaultModel,
    input: buildPrompt(jobText, resumeText),
    text: {
      format: zodTextFormat(LlmInsightsSchema, "resume_insights"),
    },
  });

  return response.output_parsed ?? stubResponse(gaps);
};
