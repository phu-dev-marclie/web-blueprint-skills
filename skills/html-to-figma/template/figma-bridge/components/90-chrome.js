// Global page chrome: Header and Footer, filled from project.json → chrome.
// This is a starting point: rewrite it to mirror the site's own header/footer markup when they differ
// (keep the component names "Header" and "Footer" — H.build() places them on every page).
// - Header states (signed in, a mega menu open…): make "Header" a variant set (e.g. Account=…, Menu=…); pages pick a
//   state with project.json → pages[].header = {"Account": "Signed in"}. Default variant = the normal state.
// - Mobile screens (pages[].device "mobile") use "Header/Mobile" and "Footer/Mobile": build them from the site at the
//   mobile width and set the Typography mode Mobile on them (node.setExplicitVariableModeForCollection) so they
//   preview at mobile sizes on the Components page.
// - Running marquees (logo strips, wordmarks): 2–3 copies in a clipped row + kit edgeFade(row, {axis: "x", ratio,
//   mode: "alpha", color}) after finalize, matching the site's mask-image.
const chromeContainer = (o, kids) => frame("Container", { w: CONTAINER, wVar: "layout/container", ...o }, kids);
const CH = PROJECT.chrome || {};

COMPONENT_DEFS["Header"] = async () => {
  const header = finalize(await frame("Header", { component: true, cross: "center", fill: "bg/page", stroke: { color: "border/default", sides: ["bottom"] }, w: TOKENS.grid.page, wVar: "layout/page" }, [
    chromeContainer({}, [
      (CH.utility || []).length ? frame("Utility bar", { dir: "h", main: "end", gap: 24, p: [12, 0, 0, 0], w: "fill" }, CH.utility.map((s) => text(s, "Body/Micro", s))) : null,
      frame("Main bar", { dir: "h", main: "between", cross: "center", p: [8, 0, 16, 0], w: "fill" }, [
        inst(variant(C["Brand/Logo"], { Theme: "Light" }), {}, { name: "Logo" }),
        frame("Navigation", { dir: "h", gap: 32, cross: "center" }, [
          ...(CH.nav || []).map((n) => inst(C["Nav/Item"], { Label: n.label, "Has menu": !!n.menu }, { name: n.label })),
          CH.cta ? btn(CH.cta, { Size: "Small" }, { name: "CTA" }) : null,
        ]),
      ]),
    ]),
  ]));
  header.description = "Global header: utility row + main navigation.";
  return header;
};

COMPONENT_DEFS["Footer"] = async () => {
  const F = CH.footer || {};
  const links = (col) =>
    frame(col.title, { gap: 16, w: span(2) }, [
      text("Title", "Label/Overline", col.title, { color: "text/on-dark" }),
      frame("Links", { gap: 8, w: "fill" }, col.links.map((s) => text(s, "Body/XS", s, { color: "text/on-dark-muted" }))),
    ]);
  const footer = finalize(await frame("Footer", { component: true, cross: "center", fill: "bg/inverse", w: TOKENS.grid.page, wVar: "layout/page" }, [
    chromeContainer({}, [
      frame("Sitemap", { dir: "h", gap: 24, p: [56, 0], w: "fill" }, [
        frame("Company", { gap: 16, w: span(4) }, [
          inst(variant(C["Brand/Logo"], { Theme: "Dark" }), {}, { name: "Logo" }),
          F.tagline ? text("Tagline", "Body/XS", F.tagline, { color: "text/on-dark-muted", w: span(3) }) : null,
          (F.contact || []).length ? frame("Contact details", { gap: 4, w: "fill" }, F.contact.map((s, i) => text(i ? s : "Company name", i ? "Body/XS" : "Body/XS Strong", s, { color: "text/on-dark" }))) : null,
        ]),
        ...(F.columns || []).map(links),
      ]),
      frame("Legal bar", { dir: "h", main: "between", cross: "center", p: [24, 0, 40, 0], w: "fill", stroke: { color: "border/on-dark", sides: ["top"] } }, [
        text("Copyright", "Body/Micro", F.legal || "©", { color: "text/on-dark-faint" }),
        frame("Policies", { dir: "h", gap: 16 }, (F.legalLinks || []).map((s) => text(s, "Body/Micro Underline", s, { color: "text/on-dark-faint" }))),
      ]),
    ]),
  ]));
  footer.description = "Global footer: brand, sitemap columns, legal line.";
  return footer;
};
