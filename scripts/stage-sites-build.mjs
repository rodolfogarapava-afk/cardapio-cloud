import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const project = process.cwd();
const output = resolve(project, ".output");
const dist = resolve(project, "dist");

if (!dist.startsWith(project) || dist === project) {
  throw new Error("Invalid Sites staging directory.");
}

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "server"), { recursive: true });
await mkdir(resolve(dist, "static"), { recursive: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });
await cp(resolve(output, "server"), resolve(dist, "server"), { recursive: true });
await cp(resolve(output, "public"), resolve(dist, "static"), { recursive: true });
await cp(resolve(output, "server", "index.mjs"), resolve(dist, "server", "index.js"));
await cp(resolve(project, ".openai", "hosting.json"), resolve(dist, ".openai", "hosting.json"));
