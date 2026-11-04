// Core components every site needs. Built in this order by H.buildComponents() (later defs may use earlier ones).
// Conventions: variants "Prop=Value, Prop=Value"; text/boolean component properties for everything a page changes;
// all colours/spacing/radii via tokens; nested instances that pages override are exposed (isExposedInstance).

// Button: Type × Size × Theme × State, coloured by the Bricks button variables (btn-*, btn-secondary-*).
// Theme=Dark reads the dark surface's re-pointed values (inverse/btn-bg …, kit themed()). When icon components
// exist (H.harvestIcons → components/00-assets.js, built first), every variant gets a leading icon slot:
// "Show icon" + "Icon" (instance swap), used by kit btnIcon(label, iconKey).
COMPONENT_DEFS["Button"] = async () => {
  const LOOK = {
    Primary: { Default: ["btn-bg", "btn-border", "btn-fg"], Hover: ["btn-bg-hover", "btn-border-hover", "btn-fg-hover"] },
    Secondary: { Default: [null, "btn-secondary-border", "btn-secondary-fg"], Hover: ["btn-secondary-bg-hover", "btn-secondary-border-hover", "btn-secondary-fg-hover"] },
  };
  const SIZES = { Large: { p: [16, 32], style: "Label/Button LG" }, Small: { p: [8, 16], style: "Label/Button SM" } };
  const ICON = Object.keys(C).find((k) => /^Icon\/[a-z0-9]/.test(k));
  const vs = [];
  for (const theme of ["Light", "Dark"])
    for (const type of ["Primary", "Secondary"])
      for (const size of ["Large", "Small"])
        for (const state of ["Default", "Hover"]) {
          const [fill, line, ink] = LOOK[type][state].map((t) => t && themed(theme, t));
          vs.push(finalize(await frame(`Type=${type}, Size=${size}, Theme=${theme}, State=${state}`, { component: true, dir: "h", gap: 8, main: "center", cross: "center", p: SIZES[size].p, r: "full", fill, stroke: { color: line } }, [
            ICON ? icon(ICON.slice(5), { name: "Icon", size: 16, color: ink }) : null,
            text("Label", SIZES[size].style, "Button", { color: ink }),
          ])));
        }
  const set = variantSet(vs, { name: "Button", wrap: true, w: 1000, gap: 16, fill: twoToneFill("bg-surface-3", "bg-base", true), description: "Primary = filled, Secondary = outline (btn-* variables). Theme=Dark on dark surfaces. Large/Small." });
  setTextProp(set, "Label", "Label", "Button");
  if (ICON) {
    setBoolProp(set, "Icon", "Show icon", false);
    setSwapProp(set, "Icon", "Icon", C[ICON]);
  }
  return set;
};

// Inline text link with arrow and bottom rule.
COMPONENT_DEFS["Link/Arrow"] = async () => {
  const c = finalize(await frame("Link/Arrow", { component: true, dir: "h", gap: 4, cross: "center", p: [0, 0, 4, 0], stroke: { color: "surface-link", sides: ["bottom"] } }, [
    text("Label", "Label/Link", "Link label", { color: "surface-link" }),
    text("Arrow", "Label/Link", "→", { color: "surface-link" }),
  ]));
  textProp(c, "Label", "Label", "Link label");
  boolProp(c, "Arrow", "Show arrow", true);
  return c;
};

COMPONENT_DEFS["Icon/Arrow circle"] = async () =>
  finalize(await frame("Icon/Arrow circle", { component: true, dir: "h", main: "center", cross: "center", r: "full", stroke: { color: "surface-link" }, w: 40, h: 40 }, [
    text("Arrow", "Body/MD", "→", { color: "surface-link" }),
  ]));

// Image slot. Pages override the instance FILL with the photo and turn "Show caption" off; without a photo the
// caption carries the art-direction note. Designers replace images the same way: select → Fill → image.
COMPONENT_DEFS["Image/Placeholder"] = async () => {
  const c = finalize(await frame("Image/Placeholder", { component: true, main: "center", cross: "center", p: 16, fill: "photo-bg", stroke: { color: "photo-border" }, clip: true, w: span(3), h: 432 }, [
    text("Caption", "Body/Micro", "Image · description of the photo", { color: "photo-fg", align: "CENTER", w: "fill" }),
  ]));
  textProp(c, "Caption", "Caption", "Image · description of the photo");
  boolProp(c, "Caption", "Show caption", true);
  c.description = "Image slot. Replace the image: select the instance → Fill → choose image (turn 'Show caption' off). Resize freely; crop with the fill's Crop/Fill mode.";
  return c;
};

// Brand/Logo, Theme=Light|Dark. If the team pasted the real logo (a vector) into an existing Brand/Logo component,
// that artwork is cloned (never redrawn); Dark recolours dark fills to white. Otherwise a wordmark placeholder.
COMPONENT_DEFS["Brand/Logo"] = async () => {
  const existing = page("Components").children.find((n) => n.name === "Brand/Logo");
  const root = existing && (existing.type === "COMPONENT_SET" ? existing.children.find((v) => v.name === "Theme=Light") : existing);
  const art = root && root.findOne((n) => n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION");
  const H = 44;
  const isDark = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 0.5;
  const make = async (theme) => {
    if (!art) {
      return finalize(await frame("Theme=" + theme, { component: true, dir: "h", gap: 12, cross: "center", h: H }, [
        frame("Mark", { dir: "h", main: "center", cross: "center", r: "full", fill: themed(theme, "photo-bg"), w: H, h: H }, [
          text("Placeholder", "Body/Micro", "LOGO", { color: themed(theme, "photo-fg") }),
        ]),
        text("Wordmark", "Brand/Wordmark", (PROJECT.name || "Brand").toUpperCase(), { color: theme === "Dark" ? "text-contrast" : "text-title" }),
      ]));
    }
    const c = figma.createComponent();
    c.name = "Theme=" + theme;
    c.layoutMode = "HORIZONTAL";
    c.primaryAxisSizingMode = "AUTO";
    c.counterAxisSizingMode = "AUTO";
    c.counterAxisAlignItems = "CENTER";
    c.fills = [];
    const v = art.clone();
    v.name = "Logo artwork";
    if (v.height !== H) v.rescale(H / v.height);
    if (theme === "Dark" && v.type === "VECTOR") {
      const net = v.vectorNetwork;
      const regions = net.regions.map((r) => ({ ...r, fills: (r.fills || []).map((p) => (p.type === "SOLID" && isDark(p.color) ? { ...p, color: { r: 1, g: 1, b: 1 } } : p)) }));
      await v.setVectorNetworkAsync({ ...net, regions });
    }
    c.appendChild(v);
    return c;
  };
  return variantSet([await make("Light"), await make("Dark")], { name: "Brand/Logo", fill: twoToneFill("bg-surface-3", "bg-base"), description: "Logo. Light for light surfaces (header), Dark for dark surfaces (footer). Paste the real vector into Theme=Light and rebuild to update both." });
};

COMPONENT_DEFS["Nav/Item"] = async () => {
  const c = finalize(await frame("Nav/Item", { component: true, dir: "h", gap: 4, cross: "center", p: [8, 0] }, [
    text("Label", "Label/Nav", "Nav item", { color: "text-title" }),
    text("Chevron", "Body/Micro", "▾", { color: "text-title" }),
  ]));
  textProp(c, "Label", "Label", "Nav item");
  boolProp(c, "Chevron", "Has menu", true);
  return c;
};

COMPONENT_DEFS["Breadcrumb/Item"] = async () => {
  const vs = [];
  for (const state of ["Link", "Current"]) {
    vs.push(finalize(await frame(`State=${state}`, { component: true, dir: "h", gap: 8, cross: "center" }, [
      text("Label", state === "Link" ? "Body/Micro Underline" : "Body/Micro", "Page", { color: state === "Link" ? "surface-link" : "surface-text-muted" }),
      state === "Link" ? text("Separator", "Body/Micro", "›", { color: "surface-text-muted" }) : null,
    ])));
  }
  const set = variantSet(vs, { name: "Breadcrumb/Item", description: "One crumb. Link shows the › separator; Current is the last crumb." });
  setTextProp(set, "Label", "Label", "Page");
  return set;
};

COMPONENT_DEFS["Accordion/Item"] = async () => {
  const vs = [];
  for (const state of ["Closed", "Open"]) {
    vs.push(finalize(await frame(`State=${state}`, { component: true, w: span(8), p: [0, 0, state === "Open" ? 24 : 0, 0], stroke: { color: "border-light", sides: ["bottom"] } }, [
      frame("Summary", { dir: "h", main: "between", cross: "center", gap: 24, p: [20, 0], w: "fill" }, [
        text("Question", "Heading/H6", "Question", { color: "text-title", w: "fill", grow: false }),
        text("Icon", "Body/LG", state === "Open" ? "−" : "+", { color: "surface-link" }),
      ]),
      text("Answer", "Body/MD", "Answer", { color: "surface-text-muted", w: "fill" }),
    ])));
  }
  vs[0].findOne((n) => n.name === "Answer").visible = false;
  const set = variantSet(vs, { name: "Accordion/Item", dir: "v", description: "FAQ / disclosure row. State=Open shows the answer." });
  setTextProp(set, "Question", "Question", "Question");
  setTextProp(set, "Answer", "Answer", "Answer");
  return set;
};

COMPONENT_DEFS["Form/Field"] = async () => {
  const vs = [];
  for (const type of ["Input", "Select", "Textarea"]) {
    vs.push(finalize(await frame(`Type=${type}`, { component: true, gap: 8, w: span(3) }, [
      text("Label", "Label/Field", "Field label", { color: "text-title" }),
      frame("Control", {
        dir: "h", main: type === "Select" ? "between" : "start", cross: type === "Textarea" ? "start" : "center",
        p: type === "Textarea" ? [12, 16] : [0, 16], r: "s", fill: "bg-surface", stroke: { color: "border-dark" }, w: "fill", h: type === "Textarea" ? 96 : 44,
      }, [
        // Non-empty default + fill width: Figma lays out an EMPTY fill-width text at 0 px, and long values set on an
        // instance then wrap one character per line.
        text("Value", "Body/XS", type === "Select" ? "Please choose" : "Placeholder", { color: "text-body-dark", w: type === "Select" ? undefined : "fill", grow: type === "Select" }),
        type === "Select" ? text("Chevron", "Body/Micro", "▾", { color: "text-title" }) : null,
      ]),
    ])));
  }
  const set = variantSet(vs, { name: "Form/Field", description: "Label + control. Value = placeholder or entered text. Set the instance width to the column span." });
  setTextProp(set, "Label", "Label", "Field label");
  setTextProp(set, "Value", "Value", "Placeholder");
  return set;
};

const choice = (name, round) => async () => {
  const vs = [];
  for (const state of ["Off", "On"]) {
    vs.push(finalize(await frame(`State=${state}`, { component: true, dir: "h", gap: 12, cross: "start", w: span(4) }, [
      frame("Box", { dir: "h", main: "center", cross: "center", r: round ? "full" : "s", fill: state === "On" ? "active" : "bg-surface", stroke: { color: state === "On" ? "active" : "border-dark" }, w: 16, h: 16 }, [
        state === "On" ? text("Mark", "Body/Micro", round ? "●" : "✓", { color: "text-contrast" }) : null,
      ]),
      text("Label", "Body/Caption", "Option label", { w: "fill" }),
    ])));
  }
  const set = variantSet(vs, { name, dir: "v" });
  setTextProp(set, "Label", "Label", "Option label");
  return set;
};
COMPONENT_DEFS["Form/Checkbox"] = choice("Form/Checkbox", false);
COMPONENT_DEFS["Form/Radio"] = choice("Form/Radio", true);

COMPONENT_DEFS["Tag"] = async () => {
  const c = finalize(await frame("Tag", { component: true, dir: "h", cross: "center", p: [4, 12], r: "s", fill: "bg-surface-3" }, [text("Label", "Body/Micro", "Tag")]));
  textProp(c, "Label", "Label", "Tag");
  return c;
};

COMPONENT_DEFS["Tab/Underline"] = async () => {
  const vs = [];
  for (const state of ["Active", "Default"]) {
    vs.push(finalize(await frame(`State=${state}`, { component: true, dir: "h", cross: "center", p: [12, 0], stroke: state === "Active" ? { color: "active", sides: ["bottom"], w: 2 } : undefined }, [
      text("Label", "Label/Nav", "Tab", { color: state === "Active" ? "text-title" : "surface-text-muted" }),
    ])));
  }
  const set = variantSet(vs, { name: "Tab/Underline", description: "Horizontal tab; place tabs in a row with a border-light bottom hairline." });
  setTextProp(set, "Label", "Label", "Tab");
  return set;
};
