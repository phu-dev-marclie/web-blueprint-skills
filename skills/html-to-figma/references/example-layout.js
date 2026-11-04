// Reference layout module — copy to <project>/figma-bridge/layouts/<layout>.js and adapt.
// One file per section layout (the value project.json → sections.layout returns, here "faq-split").
// EXTRACT runs in the rendered page (browser): pure DOM reading, returns JSON. Helpers: txt q qa visible mediaOf crumbs rich.
// BUILD runs in Figma: returns one section frame built only from frame/text/inst (auto layout, tokens, styles).
// Everything outside EXTRACT/BUILD is file-local (each file is wrapped in its own block).

EXTRACT["faq-split"] = (sec) => ({
  eyebrow: txt(q(sec, ".eyebrow")),
  title: txt(q(sec, "h2")),
  lede: txt(q(sec, "h2 ~ p")),
  items: qa(sec, "details").map((d) => ({
    question: txt(q(d, "summary")),
    answer: qa(d, "p").map(txt).join("\n\n"),
    open: d.open,
  })),
});

BUILD["faq-split"] = async (d, env) =>
  // section(): full-width band + container + the site's vertical rhythm. Columns via span(n). Colours are Bricks
  // token names; ink(env, …) reads them through the section's surface (inverse/… on a dark band).
  section("FAQ", env, { dir: "h", gap: "layout-gutter" }, [
    frame("Heading column", { gap: 8, w: span(4) }, [
      d.eyebrow ? eyebrow(d.eyebrow, env) : null,
      text("Title", "Heading/H2", d.title, { color: ink(env, "text-title", "text-contrast"), w: "fill" }),
      d.lede ? text("Lede", "Body/XS", d.lede, { color: ink(env, "surface-text-muted"), w: "fill" }) : null,
    ]),
    frame("Questions", { w: span(8), stroke: { color: ink(env, "border-strong"), sides: ["top"] } }, d.items.map((it) =>
      inst(variant(C["Accordion/Item"], { State: it.open ? "Open" : "Closed" }), { Question: it.question, Answer: it.answer }, { name: "Q · " + it.question.slice(0, 40), w: "fill" }))),
  ]);
