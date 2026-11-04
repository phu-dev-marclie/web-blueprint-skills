// Fresh-import loader for the agent tools. Bun caches ES modules by file path (query strings do not bust it),
// so each call copies tools/*.js into a unique folder under figma-bridge/.tool-cache and imports from there.
//   const T = await (await import("file:///<project>/figma-bridge/tools/load.js")).load();   // T.H, T.A, T.D
import { mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const TOOLS = import.meta.dir;
const CACHE = resolve(TOOLS, "..", ".tool-cache");

export async function load() {
  rmSync(CACHE, { recursive: true, force: true });
  const dir = join(CACHE, String(Date.now()));
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(TOOLS)) if (f.endsWith(".js") && f !== "load.js") copyFileSync(join(TOOLS, f), join(dir, f));
  const url = (f) => "file:///" + join(dir, f).replace(/\\/g, "/");
  return { H: await import(url("harness.js")), A: await import(url("assemble.js")), D: await import(url("diff.js")) };
}
