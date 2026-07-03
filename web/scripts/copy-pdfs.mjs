// Copies the provenance PDFs (root-level source-pdfs/) into this app's public/ so Next
// serves them for #page=N deep links. Runs on predev/prebuild (cwd = web/).
// public/source-pdfs is git-ignored (no 41MB duplicate in git).
// Needs Vercel "Include files outside the Root Directory" = ON (default) so ../source-pdfs
// is present at build. ponytail: build-time copy; if it outgrows Vercel static limits,
// stream via a route handler or move to blob storage.
import { cpSync, existsSync, mkdirSync } from "node:fs";

const src = "../source-pdfs";
const dest = "public/source-pdfs";

if (!existsSync(src)) {
  console.warn(`[copy-pdfs] ${src} not found — skipping (provenance links will 404).`);
  process.exit(0);
}
mkdirSync("public", { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[copy-pdfs] ${src} -> ${dest}`);
