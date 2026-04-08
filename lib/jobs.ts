import { readFile } from "fs/promises";
import path from "path";
import type { ProcessedJob } from "./types";

export type JobsProvider = {
  list: () => Promise<ProcessedJob[]>;
};

export const createFileJobsProvider = (filePath?: string): JobsProvider => {
  const resolvedPath =
    filePath ??
    path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "data",
      "processed_jobs.json"
    );

  return {
    list: async () => {
      const raw = await readFile(resolvedPath, "utf-8");
      return JSON.parse(raw) as ProcessedJob[];
    },
  };
};
