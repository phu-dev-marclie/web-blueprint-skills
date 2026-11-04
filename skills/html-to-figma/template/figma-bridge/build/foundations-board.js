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
    frame("Swatch", { r: "md", fill: paintOf(v), stroke: { color: "border/subtle" }, w: 160, h: 80 }),
    text("Name", "Body/XS Strong", v.name, { w: "fill" }),
    text("Value", "Body/Micro", (alias ? alias + " · " : "") + value, { color: "text/muted", w: "fill" }),
  ]);
}
const block = (title, note, kids) =>
  frame(title, { gap: 32, w: "fill" }, [
    frame("Heading", { gap: 8, w: "fill" }, [
      text("Title", "Heading/H2", title, { w: "fill" }),
      text("Note", "Body/MD", note, { color: "text/muted", w: span(8) }),
    ]),
    ...kids,
  ]);
const SAMPLE = (PROJECT.name || "Design system") + " — clear, calm, consistent.";

// fonts
const fontRows = await Promise.all(inCol("Typography").map(async (v) => {
  const role = v.name.split("/")[1];
  const styleName = (TOKENS.type.find((t) => t[1] === role) || [])[0];
  return frame("Font · " + role, { dir: "h", gap: 32, cross: "center", p: [16, 0], w: "fill", stroke: { color: "border/subtle", sides: ["bottom"] } }, [
    frame("Meta", { gap: 4, w: span(3) }, [
      text("Name", "Body/XS Strong", v.name, { w: "fill" }),
      text("Value", "Body/Micro", String((await resolve(v)).value), { color: "text/muted", w: "fill" }),
    ]),
    styleName ? text("Sample", styleName, SAMPLE, { w: "fill" }) : null,
  ]);
}));

// colour
const groups = {};
for (const v of inCol("Color")) (groups[v.name.split("/")[0]] ||= []).push(v);
const colourRows = [];
for (const [g, vars] of Object.entries(groups)) {
  colourRows.push(frame("Group · " + g, { gap: 16, w: "fill" }, [
    text("Label", "Label/Overline", g),
    frame("Swatches", { dir: "h", gap: 16, wrap: true, w: "fill" }, await Promise.all(vars.map(swatch))),
  ]));
}
colourRows.push(frame("Group · primitives", { gap: 16, w: "fill" }, [
  text("Label", "Label/Overline", "Primitives (hidden from pickers — change these to re-theme)"),
  frame("Swatches", { dir: "h", gap: 16, wrap: true, w: "fill" }, await Promise.all(inCol("Primitives").map(swatch))),
]));

// type scale
const styles = await figma.getLocalTextStylesAsync();
const typeRows = styles.map((s) =>
  frame(s.name, { dir: "h", gap: 32, cross: "center", p: [16, 0], w: "fill", stroke: { color: "border/subtle", sides: ["bottom"] } }, [
    frame("Meta", { gap: 4, w: span(3) }, [
      text("Name", "Body/XS Strong", s.name, { w: "fill" }),
      text("Spec", "Body/Micro", `${s.fontName.family} ${s.fontName.style} · ${s.fontSize}/${s.lineHeight.value} · ${s.letterSpacing.value}%`, { color: "text/muted", w: "fill" }),
    ]),
    text("Sample", s.name, s.fontSize > 40 ? "Aa Bb Cc 123" : SAMPLE, { w: "fill" }),
  ])
);

// spacing, radius, grid
const dims = inCol("Spacing");
const valueOf = (v) => v.valuesByMode[Object.keys(v.valuesByMode)[0]];
const bar = async (v, h) => {
  const b = await frame("Bar", { r: "sm", fill: "accent/signature", w: 8, h });
  Object.assign(SIZE.get(b), { w: valueOf(v), wVar: v.name });
  return b;
};
const spaceRows = await Promise.all(dims.filter((x) => x.name.startsWith("space/")).map(async (v) =>
  frame(v.name, { dir: "h", gap: 24, cross: "center", w: "fill" }, [text("Name", "Body/XS", v.name, { w: 160 }), bar(v, 16)])));
const radii = await Promise.all(dims.filter((x) => x.name.startsWith("radius/")).map(async (v) => {
  const box = await frame("Sample", { fill: "bg/subtle", stroke: { color: "border/default" }, w: 96, h: 96 });
  for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) box.setBoundVariable(f, v);
  return frame(v.name, { gap: 8 }, [box, text("Name", "Body/XS", v.name)]);
}));
const spanRows = await Promise.all(dims.filter((x) => x.name.startsWith("layout/col-")).map(async (v) =>
  frame(v.name, { dir: "h", gap: 24, cross: "center", w: "fill" }, [text("Name", "Body/XS", `${v.name} · ${valueOf(v)}px`, { w: 160 }), bar(v, 24)])));
const G = TOKENS.grid;

const board = await frame("Foundations", { gap: 96, p: [96, G.margin], fill: "bg/page", w: G.page, wVar: "layout/page" }, [
  block("Fonts", "Change font/heading or font/body in the Typography variable collection to switch every heading or body text style at once. The new family must have the same style names (Regular, Medium, Semi Bold, Bold).", [frame("Font roles", { w: "fill" }, fontRows)]),
  block("Color", "Semantic tokens (Color collection) alias the primitives. Layers use only semantic tokens, so changing one primitive re-colours every use.", colourRows),
  block("Typography", "Every text layer uses one of these styles; edit a style to update all of its uses. Line heights sit on the 4px grid.", [frame("Type scale", { w: "fill" }, typeRows)]),
  block("Spacing", "4px base grid. Auto-layout gaps and paddings are bound to these variables.", [frame("Scale", { gap: 12, w: "fill" }, spaceRows)]),
  block("Radius", "Corner radii bound to variables.", [frame("Radii", { dir: "h", gap: 32 }, radii)]),
  block("Layout grid", `Desktop ${G.page}: ${G.columns} columns × ${G.column}px, ${G.gutter}px gutters, ${CONTAINER}px content width, ${G.margin}px side margins. Widths of 1–${G.columns} columns are variables (layout/col-N); bind a frame's width to one to keep it on the grid.`, [frame("Column spans", { gap: 12, w: "fill" }, spanRows)]),
]);
finalize(board);
board.x = 0;
board.y = 0;
const gridStyle = (await figma.getLocalGridStylesAsync()).find((g) => g.name.startsWith("Desktop/"));
if (gridStyle) await board.setGridStyleIdAsync(gridStyle.id);
return { size: [board.width, board.height], variables: all.length, styles: styles.length };
