import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const project = process.cwd();
const source = resolve(project, "delivery-app", "dist");
const target = resolve(project, "public", "alimentacao-app");

if (!source.startsWith(project) || !target.startsWith(resolve(project, "public"))) {
  throw new Error("Invalid delivery build path.");
}

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true, force: true });
console.log("Delivery application copied to public/alimentacao-app.");
