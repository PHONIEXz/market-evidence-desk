import {copyFile, mkdir, rm} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname, join, resolve} from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const dir of ["public/web", "public/data"]) await mkdir(join(root, dir), {recursive: true});
await rm(join(root, "public/web/app.js"), {force: true});
for (const name of [
  "index.html", "research.html", "compare.html", "sources.html", "agent.html", "method.html",
  "favicon.svg", "style.css", "guide.css", "motion.css", "site.js", "comparison.js", "disagreement.js",
  "research.js", "compare-page.js", "sources-page.js", "agent-page.js",
]) {
  await copyFile(join(root, "web", name), join(root, "public/web", name));
}
await copyFile(join(root, "data/demo.json"), join(root, "public/data/demo.json"));
console.log("Public research desk assets ready in public/");
