# wireframe-content

A Claude [Skill](https://docs.claude.com/en/docs/claude-code/skills) that generates **wireframe-ready website content briefs** in compact markdown — every page organised by section, with element types (heading, subtitle, body, card, tag, button) clearly distinguishable so a designer can paste each block straight into a Figma frame. It can then optionally render that content as **browser-previewable HTML wireframes**, built from a 890-layout reference image library instead of invented structure.

The skill captures a 5-phase workflow (the 5th optional) proven on a full villa-rental site (21 pages) and generalises to any conversion-focused website: rental, e-commerce, SaaS, agency, restaurant, portfolio.

## When to use it

Whenever you want to **plan and write website content for design**, e.g.:

- "I'm designing a website, I need content"
- "Wireframe / Figma mockup content"
- "Sitemap with copy"
- "Page-by-page content brief"
- "Landing page sections + copy"

...or when you want an **HTML wireframe you can open in a browser**, e.g.:

- "Build an HTML wireframe of this site"
- "Give me a browser preview of the wireframe"
- "Turn this content brief into a clickable mockup"

## Contents

| Path | Purpose |
|------|---------|
| `SKILL.md` | Skill entry point (frontmatter + overview) |
| `PROCESS.md` | The 5-phase workflow |
| `FORMAT.md` | Output format spec for wireframe content blocks |
| `WIREFRAME.md` | Phase E spec — turns a content brief into HTML wireframes using the layout library |
| `templates/` | Reusable brief templates (sitemap, personas, brand voice, UX patterns, …) |
| `references/conversion-patterns.md` | Conversion copy patterns |
| `references/library-catalog/` | Machine-readable catalog of all 890 layouts in `wireframe-library/` (`INDEX.md` + 43 category files) |
| `examples/` | Worked example: a villa-rental site |

## Phase E — HTML wireframes

Once a content brief is done (Phases A–D), Phase E turns it into real HTML: one `wireframes/[NN]-[slug].html` per page plus `wireframes/index.html`, styled with a self-contained `wireframe.css`. Instead of inventing generic sections, each one is picked from `references/library-catalog/` — a vision-built catalog covering all 890 `.webp` layouts in `wireframe-library/` — and traced back to its source image with an HTML comment. This phase is optional and only runs when you actually ask for a wireframe preview or mockup; see `WIREFRAME.md` for the full spec.

## Install

Copy this folder into your Claude skills directory:

```bash
git clone https://github.com/phutruong-dev/wireframe-content-skills.git ~/.claude/skills/wireframe-content
```

Then invoke it in Claude Code with `/wireframe-content`.
