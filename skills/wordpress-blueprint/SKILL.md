---
name: wordpress-blueprint
description: "The owner's admin workflow for setting up and running WordPress sites in wp-admin with familiar plugins: content model, site code and SEO in ACF UI, FluentSnippets and Rank Math (never a custom site plugin or PHP registration for the content model), business information in one ACF Options Page, FAQs as an ACF post type + topic taxonomy queried by Bricks, blog posts as standard posts in the classic editor (no Gutenberg), plugin setup routines, and migrating a site to these rules. Use when administering a WordPress site the owner's way: CPT, taxonomy, options page, field, snippet, SEO/schema, FAQ, business data, editor setup, blog content model, plugin setup, site audit, or migrating a site plugin / functions.php / acf-json. Not for writing plugin, block, theme or Bricks element code: that follows wp-plugin-development, wp-block-development, wp-block-themes, wp-rest-api and bricks-custom-elements. Update it whenever the owner states a new WordPress rule."
---

# WordPress blueprint

The owner's standing requirements for every WordPress site. Owner's core rule: everything on the site must be
**visible and editable in wp-admin** by the owner, without a developer — the content model is built in ACF's own UI,
every piece of site-specific code is a FluentSnippets snippet, SEO is Rank Math, and blog posts are plain WordPress
posts. No "core" / "site functionality" plugin written for the site, no registration in PHP.

**Scope.** This is the owner's site-admin workflow: configuring a site through wp-admin and the familiar plugins
(ACF, FluentSnippets, Rank Math, Bricks) and the routines for setting them up. Writing plugin, block, theme or Bricks
custom-element code is a different job: it follows the coding skills (`wp-plugin-development`, `wp-block-development`,
`wp-block-themes`, `wp-rest-api`, `bricks-custom-elements`) and their code standards. The rules here still decide
where a site's own content model and small site snippets live.

**Keeping this skill current:** when the owner states a new rule or preference for WordPress work, add it to the
matching section here (or a new section) in the same task, and mirror the file to every skills folder that holds a
copy (`~/.agents/skills/wordpress-blueprint`, `~/.claude/skills/wordpress-blueprint`).

## Blog posts

- Blog / guide articles are the core `post` type — never a CPT for blog content.
- The body is written in the **classic (TinyMCE) WYSIWYG editor** and stored in `post_content`, rendered by the
  theme's / builder's Post Content element. Headings H2 (sections) / H3, paragraphs, lists, images, blockquote for a
  tip or callout — styled as prose by tag rules in one place (theme style / base stylesheet), not per-post classes.
- Use core fields instead of custom ones: title (H1 / card title / breadcrumb), excerpt (lede / card text / fallback
  description), featured image (hero / card / og:image), publish & modified dates (order, „updated” as `<time>`),
  sticky (lead / featured card), categories / taxonomies (topics, filters). No ACF field group on posts for the body,
  CTA, FAQ, SEO or card data; shared blocks (CTA, closing band, related posts, recommendations) are template content or
  automatic queries.
- Table of contents generated from the content's H2s (ids added on render; an editor's own id wins); reading time
  computed from the word count; related posts by shared taxonomy terms.
- The **block editor (Gutenberg) is off site-wide** (posts, pages, CPTs, widgets) and its frontend styles are
  dequeued — a FluentSnippets snippet.
- SEO checks for posts: one H1, `BlogPosting` + `BreadcrumbList` schema, `article:published_time` / `modified_time`,
  content in the RSS feed and WordPress search, no test / „Hello world” posts published.

## Where each thing goes

| What | Where | Never |
| --- | --- | --- |
| Custom post type | ACF → Post Types (database) | `register_post_type()` in a plugin / theme / snippet |
| Taxonomy | ACF → Taxonomies (database) | `register_taxonomy()` in code |
| Options page | ACF → Options Pages (database) | `acf_add_options_page()` in code |
| Field group / fields | ACF → Field Groups (database) | `acf_add_local_field_group()`, an `acf-json` folder in a plugin, `acf/settings/load_json` filters |
| Hooks, filters, extra schema nodes, permalink tweaks, admin notices, ACF validation (`acf/validate_value`, `acf/prepare_field`…) | FluentSnippets PHP snippet, group named after the site | a custom plugin, `functions.php` of the theme |
| SEO titles, descriptions, robots, canonicals, Open Graph, sitemaps, base JSON-LD | Rank Math (its box on posts / terms, Titles & Meta templates) | ACF „SEO” fields, a hand-written SEO module, the builder's own SEO / OG tags (turn them off) |
| Business information (brand / legal name, phones, e-mail, address, geo, map link, socials, house rules…) | One ACF **Options Page** (e.g. „Business information”), tabs per topic; every template, schema node, e-mail and plugin reads it | values typed into pages, templates, components, snippets or plugin settings |
| FAQ (questions + answers shown anywhere on the site) | ACF **post type** `faq` + **taxonomy** of topics, queried with Bricks loops (see „FAQ”) | accordion items typed by hand into pages, FAQ repeaters per page, the same question retyped on several pages |
| Site CSS / JS that is not part of a builder's design system | FluentSnippets CSS / JS snippet | theme files edited by hand |
| Builder glue that the builder loads from files (Bricks custom elements, dynamic-data providers, query types, the child theme's assets) | the builder's child theme | snippets (custom elements must be files) |
| A real product with its own release cycle, tests, DB tables (booking engine, payments…) | its own plugin | snippets |
| Content (texts, images) | WordPress / ACF fields | code, hard-coded strings |

ACF JSON sync stays **off** (database only) unless the owner asks for it: no `acf-json` folder in the theme, so ACF never
shows „Sync available” and the UI is the single source.

## Field design (ACF)

Every field must be understandable and safe for a non-developer editor:

- **No encoded mini-languages** in text fields (`ko=para gosti=2|4 …`, JSON, CSS values, shortcodes): use checkboxes,
  selects, true/false, numbers, relationships with human labels — a template tag builds whatever string the frontend
  needs from them.
- **Nothing stored twice.** A value derivable from another field or a taxonomy (a floor label that repeats the floor
  term, a bed count that equals the bed rows) is computed by a template tag, not typed again — two copies drift.
- **Per-item overrides are exceptions only:** empty = the global setting (and the code must really fall back to the
  setting, not to a hard-coded default); never pre-fill every item with the global value.
- **Guest-facing text blocks are written per item, not assembled.** A section like „Important to know” on a product
  / apartment page is one plain-text repeater on that item (icon select, title, text), prefilled with the full list
  — what the editor sees in the item is exactly what the page shows. Don't build it from global options, booking
  settings and template literals; the repeated rows across items are the owner's accepted cost (machine values for
  bookings stay in their own settings fields — note in AGENTS.md that both must be updated together).
- **Only fields something reads** — check with a search (Bricks data, components, child theme, plugins, snippets)
  before adding; remove unused fields together with their stored values and empty tabs.
- Labels and instructions in **one language** (the editors' language), short, with an example of a good value;
  unique labels inside a group; tabs by topic; long choice lists laid out horizontally, repeaters with checkboxes in
  block layout.
- Auditing a field group: per field list label, type, instructions, how many items have a value, and who reads it
  (search `acf_<name>` in Bricks data and the name in code — generic names give false hits, verify by hand); compare
  candidate duplicates with their source; snapshot every page that prints the fields and diff after the change.

## Business information

- One ACF Options Page holds every fact about the business; field names are stable API (`phone`, `phone_href`,
  `email`, `street`, `postcode`, `city`, `geo_lat`, `geo_lng`, `maps_url`, `instagram_url`…).
- **Only fields the site actually reads.** No speculative fields „for later” (e.g. a languages checkbox nobody prints):
  every field must have a consumer (a template tag, schema, e-mail, plugin) — check with a search before adding, and
  remove a field (plus its empty tab and stored option) once nothing reads it.
- Read it everywhere instead of typing it: Bricks `{acf_<name>}` (options context), PHP `get_field( '<name>', 'option' )`
  (schema `LodgingBusiness` / `Organization`, e-mails, booking plugin), Rank Math Local SEO / knowledge graph kept equal.
- Audit for typed copies (phone, e-mail, street, postcode, social URLs) in Bricks data, components and post content;
  replace them with the option tags.

## FAQ

- Model (ACF UI): post type `faq` „FAQ” — question = title, answer = ACF **WYSIWYG** field (toolbar basic, no media,
  required), order = „Order” (page-attributes), supports title / page-attributes / revisions; taxonomy of topics
  (hierarchical, checkbox UI, admin column) with a term number field for the topic order; a **relationship** field on
  pages („featured questions”, ordered, max ~8) for FAQ blocks on other pages. One FAQ post per question — a page that
  needs the question links it, never retypes it.
- SEO-friendly by design: the FAQ post type is **not public** (`public` / `publicly_queryable` false, excluded from
  search, no archive, no rewrite, no query var) — no thin single URLs, nothing in the sitemap; the questions live in
  the pages that show them, server-rendered in the HTML (`<details>` / `<summary>`, answer visible to crawlers), one H2
  per topic with an anchor (`id` = topic slug) and a topic nav, and a `FAQPage` node with exactly the questions of that
  page merged into the SEO plugin's graph (Rank Math: `rank_math/json_ld`; one FAQPage per page).
- Bricks: FAQ page = term loop of the topics (ordered by the term field, `hide_empty`) › H2 `{term_name}` + accordion
  component looping `faq` posts of the loop term, `menu_order`; other pages = accordion looping the page's relationship
  field (`objectType: acf_<field>`). Accordion props: question `{post_title}`, answer `{acf_<answer>}` in a `div` with
  `data-prose` (the WYSIWYG adds its own `<p>`). Never `{post_content}` for answers in Bricks (it enqueues the block
  library CSS).
- Answers are **plain text the editor can read and change** — no shortcodes or code-like placeholders in editable
  content, no explanatory message fields cluttering the edit screen (owner's choice: simplicity over automatic values).
  Answers that repeat values from settings (deposit %, minimum stay, check-in times…) are typed as numbers; list
  those questions in the site's `AGENTS.md` so they are updated together with the settings.
- Migration from hand-placed accordions: export question / answer / group per page, resolve dynamic tags to their
  current values (plain text), create topics (slug = old anchor) and posts, merge duplicates across pages (keep the
  richer answer), set the relationship fields, rebuild the sections as loops, then diff the rendered pages (anchors,
  H2, topic links, questions, answers, links, FAQPage) before / after.

## Rich text in templates

CMS rich text that cannot carry classes (post content, WYSIWYG fields) sits in a container with `data-prose`
(the BEM lint skips it); the base stylesheet / theme style holds its tag rules: `[data-prose] > :first-child` /
`> :last-child` lose their outer margins, variants carry typography (`[data-prose="article"]` for blog posts).

## SEO with Rank Math

- Values live in Rank Math: post meta `rank_math_title` / `rank_math_description` (posts, pages, CPTs, front page),
  the same keys as term meta, CPT archives and taxonomy templates in option `rank-math-options-titles`
  (`pt_<type>_archive_title|description`, `tax_<tax>_title|description`). Migrating old SEO fields = copy into these
  keys (an existing Rank Math value wins), then delete the fields **and** their stored meta / options.
- Turn off the builder's duplicate tags (Bricks → Settings: „Disable Bricks Open Graph meta tags” + „Disable Bricks SEO
  meta tags”) and check every page has exactly one `og:title`, one canonical (indexable pages), one JSON-LD graph.
- Extra schema (LodgingBusiness, Apartment, ItemList, deeper breadcrumbs…) goes **into Rank Math's graph** from a
  snippet: `add_filter( 'rank_math/json_ld', fn, 100 )`, keyed nodes (`publisher` = the organization, `BreadcrumbList`
  …); upgrade the publisher instead of printing a second organization. Rank Math runs the graph through
  `wp_kses_post_deep()`: every value becomes a string, `false` → `""`, `true` → `"1"` — use
  `https://schema.org/False` / `True` for booleans. Breadcrumb schema needs Rank Math breadcrumbs on (label home).
- Rank Math removes every `wp_robots` filter and replaces core canonicals and sitemaps: other plugins' noindex /
  canonical / sitemap rules must also hook `rank_math/frontend/robots` (`[ 'index' => 'noindex', 'follow' => 'follow' ]`),
  `rank_math/frontend/canonical`, `rank_math/sitemap/posts_to_exclude`, `rank_math/sitemap/exclude_post_type`.
  Noindex pages get no canonical (by design).
- „Discourage search engines” (`blog_public = 0`) makes Rank Math print `noindex, nofollow` and no canonical on every
  page: verify robots / canonical with it temporarily off, then restore the owner's value. Clear the sitemap cache
  (`\RankMath\Sitemap\Cache::invalidate_storage()`) after changing exclusions.

## Writing a snippet (FluentSnippets, plugin slug `easy-code-manager`)

- One snippet per concern, short descriptive name `Site · What it does`, group = site name, tag = site slug,
  type PHP, run „Everywhere”, no conditions unless needed.
- PHP snippets **without conditions run on `setup_theme`** (after `plugins_loaded`, before `init`): hooks on
  `plugins_loaded` never fire — check SEO-plugin constants etc. directly; `init`, `wp`, `wp_head`, `acf/*` are fine.
  Snippets **with conditions run on `wp`** — too late for `init`, rewrite, query or admin hooks.
- Code is stored without the opening `<?php`; no `namespace` (one file per snippet, included with `require_once`).
  Prefix every global class / function / hook with the site prefix (`KP_Seo`, `kp_seo_canonical`); a class used by
  another snippet is fine as long as it is only called from hooks (load order is not guaranteed).
- Name hooks and translation domains after the site, never after a removed plugin.
- Programmatic create (migrations, agents): `FluentSnippets\App\Helpers\Helper::createSnippet( [ 'meta' => $meta,
  'code' => $code ] )` (validates + writes the file header), then `(new Snippet())->updateSnippet( $file, $code,
  $meta + [ 'status' => 'published' ] )`, then `Helper::cacheSnippetIndex()`. Meta keys: name, description, tags,
  group, type (`PHP` | `css` | `js` | `php_content`), status, run_at (`all` | `backend` | `wp_head` …), priority,
  condition `[ 'status' => 'no', 'run_if' => 'assertive', 'items' => [ [] ] ]`. Lint the code first
  (`php -l` on `<?php` + code). Storage: `wp-content/fluent-snippet-storage/` (never edit `index.php` by hand).

## Creating ACF objects programmatically (migrations only — afterwards they are edited in the UI)

- Start from the instance defaults and save through ACF so the result is a normal UI item:
  `acf_update_internal_post_type( array_replace_recursive( acf_get_internal_post_type_instance( 'acf-post-type' )
  ->get_settings_array(), $settings ), 'acf-post-type' )` — same for `acf-taxonomy`, `acf-ui-options-page`.
  Keys: `post_type_<x>`, `taxonomy_<x>`, `ui_options_page_<x>`; set `advanced_configuration` so every setting shows.
- Mapping notes: custom rewrite slug = `rewrite.permalink_rewrite = custom_permalink` + `slug` (placeholders like
  `apartmani/%kuca%` survive a UI save); `rewrite => false` = `no_permalink`; `query_var => false` = `'none'`;
  `has_archive` string = `has_archive true` + `has_archive_slug`; `menu_icon` = `[ 'type' => 'dashicons', 'value' =>
  'dashicons-…' ]`; only explicitly set labels.
- Field groups from JSON: `acf_import_field_group( $json )` keeps every key. **Strip `local` / `local_file` /
  `modified` first** — an imported `"local": "json"` is stored and the group still looks like a JSON group.
- ACF registers its post types and taxonomies on `acf/init` priority 6: deactivate the old code first (two
  registrations of the same key conflict), then create, then `wp rewrite flush`.

## Migrating a site plugin / functions.php / acf-json

1. Back up the database (SQLite: use the backup API, the WAL holds uncommitted pages; MySQL: `wp db export`) and copy
   the plugin folder out of `wp-content`.
2. Snapshot before: registration args of every CPT / taxonomy (`get_post_type_object`, `get_taxonomy`), the
   `rewrite_rules` option (set **and order**), every field group's flattened field keys + locations, options pages,
   and the rendered output of key URLs (status, title, description, canonical, JSON-LD types, H1, text hash).
3. Convert: model → ACF UI objects; remaining PHP → snippets (drop the plugin's bootstrap, ACF JSON path filters,
   CLI importers the owner no longer needs). Update every consumer of the old code (other plugins' hooks / comments).
4. Deactivate + delete the plugin, create the ACF objects and snippets, flush rewrites.
5. Snapshot after and diff: registration args, rewrite rules identical in set and order, field keys identical, URL
   output identical; run the site's test suites; open the ACF / FluentSnippets screens and an edit screen of each
   post type in the browser; save one migrated post type in the ACF UI and diff again.
6. Document in the site's `AGENTS.md`: what lives in ACF, which snippets exist and what each does.

## Migrating ACF-built posts to classic blog posts

1. Back up the database; archive every ACF value of the posts to JSON (`get_field( $name, $id, false )`) before deleting.
2. Build `post_content` from the repeaters as plain HTML (H2 with the old section id, paragraphs, H3 + list for steps /
   places, images as `size-large wp-image-<ID>`, blockquote for tips, FAQ as H2 + H3 + paragraph). Guard empty ACF
   repeaters: `(array) false` is `[ false ]` — filter rows with `is_array`. Dry-run one post and read the HTML.
3. Map duplicate fields to core ones (title, excerpt, featured image, dates, sticky), then delete the field group and
   every meta row of its fields (name, `_name`, `name_%` sub rows).
4. Rebuild the single template on the Post Content element (prose class + tag rules), TOC / read time / share /
   related from the content and taxonomies; replace every dynamic tag of the removed fields (templates, components,
   index loops). Bricks writes to `_bricks_page_content_2` need a logged-in user (`wp … --user=1`).
5. Verify every post renders (no leftover `{acf_…}` tags, one H1, TOC anchors match), feed + search contain the body,
   lint the page classes, check 4 widths in the browser.
