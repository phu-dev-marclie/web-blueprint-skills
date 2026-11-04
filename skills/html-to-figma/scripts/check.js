// Syntax-check every Figma-side file of a project before sending it to Figma (a syntax error in one module
// would otherwise fail every build).   bun check.js <project>/figma-bridge
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root || !existsSync(join(root, "project.json"))) {
  console.error("usage: bun check.js <project>/figma-bridge");
  process.exit(2);
}
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const read = (p) => readFileSync(join(root, p), "utf8");
const list = (d) => (existsSync(join(root, d)) ? readdirSync(join(root, d)).filter((f) => f.endsWith(".js")).sort().map((f) => d + "/" + f) : []);
const prelude = "const PROJECT = {}; const TOKENS = {}; const DATA = {};";
const projectKit = existsSync(join(root, "build/project-kit.js")) ? [read("build/project-kit.js")] : [];
const base = [prelude, read("build/lib.js"), read("build/kit.js"), ...projectKit].join("\n;\n");

let bad = 0;
const check = (label, src) => {
  try {
    new AsyncFunction("figma", src);
  } catch (e) {
    bad++;
    console.log(`✗ ${label}: ${e.message}`);
  }
};
for (const f of ["build/lib.js", "build/kit.js"]) check(f, [prelude, read(f)].join("\n;\n"));
if (projectKit.length) check("build/project-kit.js", base);
// Build steps run after lib + kit (+ project kit): a const they declare must not clash with a kit global.
for (const f of list("build").filter((f) => !/\/(lib|kit|project-kit)\.js$/.test(f))) check(f, base + "\n;\n" + read(f));
for (const f of [...list("components"), ...list("layouts")]) check(f, base + "\n;\n{\n" + read(f) + "\n}");
// Layout files are also evaluated in the browser (EXTRACT); they must parse as plain script there too.
for (const f of list("layouts")) {
  try {
    new Function(read(f));
  } catch (e) {
    bad++;
    console.log(`✗ ${f} (browser): ${e.message}`);
  }
}
try {
  JSON.parse(read("project.json"));
  JSON.parse(read("tokens.json"));
} catch (e) {
  bad++;
  console.log("✗ json: " + e.message);
}
console.log(bad ? `${bad} problem(s)` : "all files parse");
process.exit(bad ? 1 : 0);
