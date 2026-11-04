// "Foundations" page: live specimens bound to the variables and text styles (re-run after foundations.js).
// Run with: H.runStep("build/foundations-board.js")
const FP = page("Foundations", { create: true });
await figma.setCurrentPageAsync(FP);
for (const n of [...FP.children]) n.remove();

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const byName = Object.fromEntries(collections.map((c) => [c.name, c]));
const all = await figma.variables.getLocalVariablesAsync();
const inCol = (name) => all.filter((v) => byName[name] && v.variableCollectionId === byName[name].id);
const toHex = (c) => "#" + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase() + (c.a !== undefined && c.a < 1 ? " · " + Math.round(c.a * 100) + "%" : "");
async function resolve(v) {
  let val = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
  let alias = null;
  while (val && val.type === "VARIABLE_ALIAS") {
    const target = await figma.variables.getVariableByIdAsync(val.id);
    alias = alias || target.name;
    val = target.valuesByMode[Object.keys(target.valuesByMode)[0]];
  }
  return { alias, value: typeof val === "object" ? toHex(val) : val };
}
const paintOf = (v) => figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v);
async function swatch(v) {
  const { alias, value } = await resolve(v);
  return frame(v.name, { gap: 8, w: 160 }, [
    frame("Swatch", { r: "m", fill: paintOf(v), stroke: { color: "border-subtle" }, w: 160, h: 80 }),
    text("Name", "Body/XS Strong", v.name, { color: "text-title", w: "fill" }),
    text("Value", "Body/Micro", (alias ? alias + " · " : "") + value, { color: "text-body-dark", w: "fill" }),
  ]);
}
const block = (title, note, kids) =>
  frame(title, { gap: 32, w: "fill" }, [
    frame("Heading", { gap: 8, w: "fill" }, [
      text("Title", "Heading/H2", title, { color: "text-title", w: "fill" }),
      text("Note", "Body/MD", note, { color: "text-body-dark", w: span(8) }),
    ]),
    ...kids,
  ]);
const SAMPLE = (PROJECT.name || "Design system") + " — clear, calm, consistent.";
const modeValues = (v) => Object.values(v.valuesByMode).map((x) => (typeof x === "number" ? x + "px" : x)).join(" / ");
const metaRow = (name, value, sample) =>
  frame(name, { dir: "h", gap: 32, cross: "center", p: [16, 0], w: "fill", stroke: { color: "border-subtle", sides: ["bottom"] } }, [
    frame("Meta", { gap: 4, w: span(3) }, [
      text("Name", "Body/XS Strong", name, { color: "text-title", w: "fill" }),
      text("Value", "Body/Micro", value, { color: "text-body-dark", w: "fill" }),
    ]),
    sample,
  ]);

// fonts (font-family, font-family-display) and the text-* font-size scale
const typoVars = inCol("Typography");
const fontRows = typoVars.filter((v) => v.resolvedType === "STRING").map((v) => {
  const styleName = (TOKENS.type.find((t) => t[1] === v.name) || [])[0];
  return metaRow(v.name, modeValues(v).split(" / ")[0], styleName ? text("Sample", styleName, SAMPLE, { color: "text-title", w: "fill" }) : null);
});
const sizeRows = typoVars.filter((v) => /^text-/.test(v.name)).map((v) => metaRow(v.name, modeValues(v), null));

// colour: Theme roles, component variables, surface overrides (what layers use), then the Brand + Neutrals palettes
const colourRows = [];
const swatchGroup = async (label, vars) =>
  vars.length && colourRows.push(frame("Group · " + label, { gap: 16, w: "fill" }, [
    text("Label", "Label/Overline", label, { color: "text-title" }),
    frame("Swatches", { dir: "h", gap: 16, wrap: true, w: "fill" }, await Promise.all(vars.map(swatch))),
  ]));
await swatchGroup("Theme", inCol("Theme"));
await swatchGroup("Components", inCol("Components"));
const bySurface = {};
for (const v of inCol("Surfaces")) (bySurface[v.name.split("/")[0]] ||= []).push(v);
for (const [key, vars] of Object.entries(bySurface)) await swatchGroup(`Surface ${key} — [data-surface="${key}"] re-points`, vars);
await swatchGroup("Brand (hidden from pickers — change these to re-theme)", inCol("Brand"));
await swatchGroup("Neutrals (hidden from pickers)", inCol("Neutrals"));

// type scale
const styles = await figma.getLocalTextStylesAsync();
const typeRows = styles.map((s) =>
  metaRow(s.name, `${s.fontName.family} ${s.fontName.style} · ${s.fontSize}/${s.lineHeight.value} · ${s.letterSpacing.value}%${s.description ? " · " + s.description : ""}`,
    text("Sample", s.name, s.fontSize > 40 ? "Aa Bb Cc 123" : SAMPLE, { color: "text-title", w: "fill" })));

// spacing, radius, grid
const dims = inCol("Spacing");
const valueOf = (v) => v.valuesByMode[Object.keys(v.valuesByMode)[0]];
const bar = async (v, h) => {
  const b = await frame("Bar", { r: "s", fill: "accent", w: 8, h });
  Object.assign(SIZE.get(b), { w: valueOf(v), wVar: v.name });
  return b;
};
const spaceVars = dims.filter((x) => x.scopes.includes("GAP")).sort((a, b) => valueOf(a) - valueOf(b));
const spaceRows = await Promise.all(spaceVars.map(async (v) =>
  frame(v.name, { dir: "h", gap: 24, cross: "center", w: "fill" }, [text("Name", "Body/XS", `${v.name} · ${valueOf(v)}px`, { color: "text-title", w: 240 }), bar(v, 16)])));
const radii = await Promise.all(dims.filter((x) => x.name.startsWith("radius-")).map(async (v) => {
  const box = await frame("Sample", { fill: "bg-surface-2", stroke: { color: "border-light" }, w: 96, h: 96 });
  for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) box.setBoundVariable(f, v);
  return frame(v.name, { gap: 8 }, [box, text("Name", "Body/XS", v.name, { color: "text-title" })]);
}));
const spanRows = await Promise.all(dims.filter((x) => x.name.startsWith("figma/col-")).map(async (v) =>
  frame(v.name, { dir: "h", gap: 24, cross: "center", w: "fill" }, [text("Name", "Body/XS", `${v.name} · ${valueOf(v)}px`, { color: "text-title", w: 240 }), bar(v, 24)])));
const G = TOKENS.grid;

const board = await frame("Foundations", { gap: 96, p: [96, G.margin], fill: "bg-body", w: G.page, wVar: "figma/page" }, [
  block("Naming", "Variables carry the Bricks token names of the site (bricks-bem-html): text-title here is var(--text-title) in Bricks, shown as code syntax in Dev Mode. <surface>/<token> (inverse/btn-bg) is the value a [data-surface] gives that token. figma/… are Figma-only helpers with no Bricks token (frame width, column spans, 4px literals, per-style line heights).", []),
  block("Fonts", "Change font-family or font-family-display in the Typography collection to switch every body or heading text style at once. The new family must have the same style names (Regular, Medium, Semi Bold, Bold).", [frame("Font variables", { w: "fill" }, fontRows)]),
  block("Color", "Theme roles alias the Brand and Neutrals palettes, component variables alias the roles, surfaces re-point some of them — as in the Bricks Style Manager. Layers use roles, component variables and surface tokens only.", colourRows),
  block("Typography", "Every text layer uses one of these styles; each style's size is bound to a text-* variable (Desktop / Mobile modes). Line heights sit on the 4px grid.", [frame("Font sizes", { w: "fill" }, sizeRows), frame("Type scale", { w: "fill" }, typeRows)]),
  block("Spacing", "space-* = the Bricks spacing scale on the 4px grid; figma/px-N = literals of the class CSS. Auto-layout gaps and paddings are bound to these variables.", [frame("Scale", { gap: 12, w: "fill" }, spaceRows)]),
  block("Radius", "Corner radii bound to the radius-* variables.", [frame("Radii", { dir: "h", gap: 32 }, radii)]),
  block("Layout grid", `Desktop ${G.page}: ${G.columns} columns × ${G.column}px, ${G.gutter}px gutters (layout-gutter), ${CONTAINER}px content width, ${G.margin}px side margins. Widths of 1–${G.columns} columns are variables (figma/col-N); bind a frame's width to one to keep it on the grid.`, [frame("Column spans", { gap: 12, w: "fill" }, spanRows)]),
]);
finalize(board);
board.x = 0;
board.y = 0;
const gridStyle = (await figma.getLocalGridStylesAsync()).find((g) => g.name.startsWith("Desktop/"));
if (gridStyle) await board.setGridStyleIdAsync(gridStyle.id);
return { size: [board.width, board.height], variables: all.length, styles: styles.length };
