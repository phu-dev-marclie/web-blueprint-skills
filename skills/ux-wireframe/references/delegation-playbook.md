# Delegation playbook

Split by **page or template family**, never by arbitrary file count. The orchestrator keeps
everything that decides how the site *is*: SSOT, sitemap, design direction, `base.css`,
`components.css`, partials (+ `header.css` / `footer.css`), build and QA. Agents write copy, compose
fragments and style the sections they own (`assets/sections/<layout>.css`) inside those decisions.

## Wave plan

| Wave | Runs in parallel | Owner | Blocking dependency |
| --- | --- | --- | --- |
| 1 | research reads (4–6 `read` calls in one block); scouts for long extractions (detail pages → JSON with per-field source, `null` when not stated) | orchestrator / scouts | — |
| 2 | write `Business-information.md` | orchestrator | wave 1 |
| 3 | write `sitemap.md` (+ gap analysis vs reference sitemaps) | orchestrator | SSOT |
| 4 | reference teardown in a browser; concept routes; `design-direction.md`; archetype; project components in `components.css` + partials + section stylesheets the orchestrator owns | orchestrator | sitemap |
| 5 | one agent per authored page: content `.md` then fragment + the `assets/sections/<layout>.css` files of its own sections; one agent per generated family: `data/*.json` + `_templates/*.html` | agents | design direction + components.css |
| 6 | render + build + static QA | orchestrator | all fragments |
| 7 | browser QA + design review | orchestrator | build |
| 8 | UI mockup refine (phase 7): reference probe + `design.md` + skins in `base.css` / `components.css` / `assets/sections/*.css` | orchestrator | gates of wave 7 pass + user's reference |
| 9 | feedback rounds (`iteration-loop.md`): fan out per page only when ≥ 4 pages change; same contract | orchestrator / agents | review |

Waves 4 and 8 are not delegated: the concept, catalogue and stylesheets must come from one mind
or the pages drift into different sites. If the run is interactive, show the concept to the
user at the end of wave 4 and the palette + fonts during wave 8.

## Shared `context` block (identical for every agent in a wave)

```
# Goal            one sentence + working directory
# MUST READ FIRST Business-information.md, sitemap.md, design-direction.md (§4 concept,
#                 §5 grammar, §7 the agent's page table, §8 catalogue, §8b markup contract,
#                 §8c component catalogue), assets/components.css (+ header.css / footer.css),
#                 the phase-4/5 references, interactions-contract.md, skill bricks-bem-html
#                 (references/class-system.md)
# Constraints     language, glossary, CTA set, forbidden strings, archetype widget rules,
#                 "shared files are read-only"
# Contract        content skeleton (incl. claims ledger); <section class="w-{layout}" id="slug"
#                 data-layout="{layout}" data-surface="…" data-brx="section"> › <div
#                 class="w-{layout}__container" data-brx="container"> › w-{layout}__… elements
#                 (data-brx block/div); every class w- and every element its own class exactly
#                 as in §8b; one stylesheet per section the agent owns: assets/sections/{layout}.css
#                 (grid for ≥ 2 columns, flex column for one, flex row for inline runs; column
#                 ceilings 5/5/3/3/2; never set container width or side padding); across blocks
#                 only `.w-{layout} .w-{component}` in that file; no shared layout classes; rich
#                 text in a data-prose block; §8c components only, roots with
#                 data-component="Group: Variant", per-instance values with data-prop; repeated
#                 sections as Bricks templates (data-brx-template + data-brx-template-mode
#                 element|insert: element = one structure + content, insert = same section and
#                 container classes);
#                 never style or select [data-layout]; token contract (phase 5): tokens only
#                 from tokens.css (never define one), 4 px spacing literals, --text-<step> +
#                 --line-height-<step>, one colour role per text role, @media only at the Bricks
#                 breakpoints 1279 / 991 / 767 / 478, <i data-icon> icons, no glyphs, no text in CSS content:
# Copy rules      paste phase-4 "write for the reader" table, "don't sell the website",
#                 claim scope, image rule (full brief inside .w-photo, no captions/notes)
# Link inventory  every page that will exist (authored + generated) and every cross-page anchor
# Non-goals       no build in place, no edits to base.css / components.css / partials /
#                 header.css / footer.css / engine / other agents' section files or pages,
#                 never hand-edit generated fragments (line 2 `<!-- wf:generated`)
# Verify          build + qa on a throwaway copy; zero problems AND zero warnings for own pages
#                 (incl. bem_lint --prefix w- 0 errors)

## Per-agent `task` block

```
# Target      exact file paths this agent owns
# Change      section by section from design-direction §7 (layout, composition, why)
# Acceptance  countable: "11 sections, data-layout sequence = […]", "1 data-chooser with
#             4 results", "0 commerce markup", "copy matches content .md verbatim",
#             "bem_lint --prefix w- 0 errors / 0 warnings in own files", "data-component values ⊆ §8c",
#             "one assets/sections/<layout>.css per own layout"
```

## Rules that prevent rework

- **One owner per file.**
- **Shared files are read-only** for agents: `tokens.py` (and its generated `tokens.css`), `base.css`,
  `components.css`, `header.css`, `footer.css`, other agents' section stylesheets, the generated
  `sections.css`, engine, `_partials/*`, `build.py`, `qa.py`, `handoff.py`. A missing token, component
  or composition detail is reported back; the orchestrator adds it (token to `tokens.py`, component to
  `components.css`, and the layout or component catalogue when it is a new layout or a new repeated part).
- **Do not let agents run the build in place.** They verify on a throwaway copy.
- **Acceptance criteria must be countable** — including the expected `data-layout` sequence,
  `bem_lint --prefix w-` 0 errors and only §8c components.
- **Repeat the constraints in every wave.** Agents have no conversation history.
- **Give agents the link inventory** or they invent hrefs.

## Reconciliation after each wave

- `qa.py` COMPOSITION block: sequences match design-direction §7; no unknown layouts.
- anchor ids referenced across pages exist (`#enquiry`, `#apply`).
- naming of the same product/fact across pages; URL patterns not in the sitemap.
- copy across agents: grep the built pages for the project's `meta_phrases` and for facts
  that appear with different values (country lists, durations, counts).
- every page the wave added has a place in the IA table, header/footer and sitemap §2.
