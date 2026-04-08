import { readFile, writeFile } from "fs/promises";
import path from "path";

const root = process.cwd();
const rawPath = path.join(root, "data", "jobs.json");
const processedPath = path.join(root, "data", "processed_jobs.json");

const normalizeArray = (items) =>
  Array.from(
    new Set(
      (items || [])
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
    )
  );

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const run = async () => {
  const raw = JSON.parse(await readFile(rawPath, "utf-8"));

  const processed = raw.map((job, index) => {
    const title = job.title?.trim() || "Unknown Role";
    const company = job.company?.trim() || "Unknown";
    const id = `${slugify(title)}-${slugify(company)}-${index + 1}`;

    return {
      id,
      title,
      company,
      level: job.level?.trim() || "Unknown",
      location: job.location?.trim() || "Unknown",
      raw_text: job.description?.trim() || "",
      skills: normalizeArray(job.skills),
      keywords: normalizeArray(job.keywords),
      responsibilities: normalizeArray(job.responsibilities),
      must_haves: normalizeArray(job.must_haves),
      nice_to_haves: normalizeArray(job.nice_to_haves),
      updated_at: new Date().toISOString().slice(0, 10),
    };
  });

  await writeFile(processedPath, JSON.stringify(processed, null, 2), "utf-8");
  console.log(`Wrote ${processed.length} records to data/processed_jobs.json`);
};

run().catch((error) => {
  console.error("ETL failed:", error);
  process.exit(1);
});
