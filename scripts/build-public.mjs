import {copyFile, mkdir} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname, join, resolve} from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const dir of ["public/web", "public/data"]) await mkdir(join(root, dir), {recursive: true});
for (const name of ["index.html", "favicon.svg", "style.css", "guide.css", "motion.css", "app.js"]) {
  await copyFile(join(root, "web", name), join(root, "public/web", name));
}
await copyFile(join(root, "data/demo.json"), join(root, "public/data/demo.json"));
console.log("Public research desk assets ready in public/");
