# CLAUDE.md — [Project Name] Content Project

> AI entry point. Read first before generating any page.

---

## 1. Project purpose

Generate **wireframe-ready content** for the [Project Name] website. Output paste-able into Figma frames. **Not SEO content. Not spec data. Content brief.**

---

## 2. Load order (BẮT BUỘC trước khi generate page)

1. `CLAUDE.md` (this file)
2. `_foundations/facts.md` — source of truth, do not invent facts
3. `_foundations/brand-voice.md` — blacklist words
4. `_foundations/personas.md` — primary persona of the page
5. `_foundations/ux-patterns.md` — CTA labels
6. `sitemap.md` — section design for the page
7. `<skill>/FORMAT.md` — output format spec

---

## 3. Hard rules

### 3.1 NO

- `*italic*` anywhere
- `Heading: text` label-colon pattern
- SEO meta blocks (title, description, OG image, keywords)
- Code-fence ` ```text ` around paragraphs
- Internal-links list, NEEDS_INPUT list, Self-check section in page files
- Alt text in page files
- Emoji
- Blacklist words: [add project blacklist — start with `luxury`, `luxurious`, `5-star`, `best`, `amazing`, `incredible`, `breathtaking`, `stunning`, `unforgettable`, `magical`, `paradise`, `sanctuary`, `oasis`, `haven`]

### 3.2 YES

| Element | Markdown |
|---|---|
| Page name | `# [Project] — [Page name]` |
| Section name | `## [Section name]` |
| Hero / section headline | `### [Headline]` |
| Card | `` #### `Tag` · Card title `` (inline) |
| Item | `` #### `Tag` · Item title `` |
| FAQ question | `#### Question text?` |
| Review | `` #### Author Name, City — `Tag` `` |
| Card title (inside non-H4 card) | `**Card title**` |
| Tag / chip | `` `Tag` `` |
| Button / CTA | `**[ Button label ]**` |
| Quote | `> Quote text` |
| Stats bar items | `**stat 1 · stat 2 · stat 3**` |
| Section break | `---` |
| Body | Plain paragraph |
| Subtitle | Plain paragraph below heading |

### 3.3 Form (special case)

Forms describe field structure. Use `**Label:** value` pattern:

```
#### Field 1

**Label:** Full name
**Placeholder:** Jane Doe
**Required:** Yes
```

---

## 4. CTAs (standard for this project)

| Context | Label |
|---|---|
| Primary CTA (most pages) | `[fill in]` |
| Primary CTA (pricing page) | `[fill in if different]` |
| Secondary — explore product | `[fill in]` |
| Secondary — gallery | `[fill in]` |
| Secondary — reviews | `[fill in]` |
| Email | `[fill in]` |
| Form submit | `[fill in]` |

Edit this table when you add a page that introduces a new CTA — keep wording consistent across pages.

---

## 5. Voice (quick)

- Tone keywords: [fill in 3 keywords, e.g. *Effortless · Curated · Warm*]
- Specifics over labels: write `[example specific]` not `[example label]`.
- Active voice. We / you, not third-person.
- Numbers ≤ 12 written out (`six bedrooms`, `eight minutes`).

---

## 6. Page generation workflow

1. Confirm page slug (e.g. `/about`).
2. Read load order in §2.
3. Generate in `pages/[NN]-[slug].md` per format in §3.
4. Self-check: no italic, no blacklist, format matches.
5. Report file path + 1-sentence summary.

---

## 7. Reference

`pages/[NN]-[slug].md` — canonical example. When unsure about format, mirror an existing page in this project (or `examples/villa-t-home.md` in the skill).

---

## 8. Wireframes (Phase E, optional)

- **Wireframe library:** `[path to wireframe-library/, or leave blank to use the skill's catalog-only mode]`
- Catalog: `<skill>/references/library-catalog/INDEX.md` (43 categories, 890 layouts) — read before selecting any layout.
- Spec: `<skill>/WIREFRAME.md` — read in full before generating the first `.html` page.
- Output: `wireframes/[NN]-[slug].html` per page + `wireframes/index.html`.
- Skip list: sections with no matching layout category (e.g. `Submit States`, `Validation Messages`) render as an HTML comment, not a section — see `WIREFRAME.md` §3.
