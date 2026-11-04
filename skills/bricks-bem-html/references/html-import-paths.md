# Three ways HTML becomes Bricks — and how to prepare HTML for all of them

| Path | When | Classes | Components | Repeatable |
| --- | --- | --- | --- | --- |
| **A. `spec_builder.py` → `bricks_apply.php`** (this skill) | converting/rebuilding an area with exact control, labels, components, pixel parity | global classes, CSS in `_cssCustom` | yes (abilities) | yes — re-run updates by name |
| **B. Code2Bricks Quick Import** (plugin, GUI) | designer/dev pastes a section into the builder | Global (default) or Element classes; Insert → CSS editor or Style panel | no — extract afterwards ("Save as component") | CSS merges on re-import, HTML always creates new elements |
| **C. Bricks ability `commit-html-css-page-import`** (skill `bricks-html-css-to-bricks`) | one empty page body or header/footer interior via MCP | proposes global classes | no | idempotency key per import |

Whatever the path, the HTML written under this skill's rules imports cleanly: every element
lands with its own class, and no CSS falls into page/root-level CSS.

## How converters map HTML (Code2Bricks / Bricks importer)

| HTML | Bricks element |
| --- | --- |
| `section`, `header`, `nav`, `main`, `footer`, `article`, `aside`, `div` | Section / Div with the tag preserved |
| `h1`–`h6` | Heading |
| `p` (with inline `strong`, `em`, `a`, `br`, `code`) | Text Basic — inline formatting stays inside one text element |
| `a` (block-level, own class) | Text Link (or Div with tag `a` when it has children) |
| `img` | Image |
| `<i data-icon="name">` / inline `<svg>` icon | SVG element, source **SVG icon** from the site icon set (this skill's importer resolves names; after a GUI import, switch pasted inline SVGs to the icon set so the icon stays managed) |
| `ul/ol/li` | Div with tag |
| `form`, `iframe`, `video`, `canvas`, unknown widgets | **Code element** (not editable visually) — avoid in designs meant for editing; use Bricks Form/Video elements instead |
| `<script>` | Code element (Code2Bricks) — prefer an enqueued file + `data-*` hooks |
| `<style>` rules on a class in the HTML | that class's CSS |
| rules on an id | the element with that id |
| **any other selector** (`.card h3`, `section > p`, `[data-x] .y`) | **root / page-level CSS** — this is the "CSS hidden somewhere" problem; the BEM lint forbids these selectors so nothing ends up there |

Consequences for authoring:
- Inline formatting inside a paragraph is fine and stays editable as rich text; do not split
  a sentence into many spans just to class them.
- A link that is a design element (button, card link, nav link) is its own element with its
  own class; a link inside running text is not.
- Prefer **global classes** (shared, have a Style panel); element-level classes have no Style
  panel and cannot be converted.

## One home per property: Style panel vs custom CSS

Bricks stores styles in two places: Style-panel settings and custom CSS. A property must live in
one of them, never both.
- This skill writes **custom CSS** (`%root%`) — exact, reviewable, lintable.
- Designers who want sliders: convert supported declarations to the Style panel afterwards
  (Code2Bricks **Convert CSS → UI**, or Bricks 2.4 *CSS Sync* in Bricks → Settings → Builder).
  Use **one** mechanism: Code2Bricks locks its Convert while Bricks CSS Sync is on.
- What converts: spacing, typography, borders, backgrounds, layout on the class itself, and
  `@media` that matches a Bricks breakpoint width. What stays in CSS: descendant/state
  selectors, `@keyframes`, `!important`, free-form `@media`, some `var()`/colour functions.
  → Author media queries at the **site's Bricks breakpoint widths** when designers should be
  able to edit responsive values in the panel; otherwise they stay in code (fine, but say so).

## Importing with Code2Bricks (path B) — checklist

1. Lint the snippet first (`bem_lint.py`) — 0 errors.
2. One section per import; select the target Section/Div first (it becomes the parent).
3. Quick Import → CSS mode **Global classes**; Insert **CSS editor** (or Style panel if the
   team edits in the panel — not together with Bricks CSS Sync).
4. Check the Structure panel after the import: element types (Heading, Text, Image…), no Code
   elements, labels; rename labels to readable names.
5. Turn repeated parts into Components (select root → Save as component), add properties,
   replace the other copies with instances.
6. Classes already on the site are reused and their CSS merged — review the diff when
   re-importing a changed snippet.

Code2Bricks' **BEM Generator** names an existing tree from a block name; **Make Parent** promotes
a subtree to its own block (a component candidate) and component instances are excluded by
default. **Update Classes** renames classes in place everywhere they are used — use it instead
of creating a second set of names.

Its built-in "clickable card" recipe uses `%root% a:after`; under these rules give the link
its own class and style `.card__link::after { content: ""; position: absolute; inset: 0; }`.
