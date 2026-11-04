---
name: "source-command-replace-wp"
description: "Migrated source command `replace-wp`"
---

# source-command-replace-wp

Use this skill when the user asks to run the migrated source command `replace-wp`.

## Command Template

# replace-wp

Replace ALL content on a WordPress site with new business content. Use this when the user provides WordPress credentials and a new business profile and wants the entire site rewritten.

## What you need from the user

1. **WordPress URL** (e.g. `https://solar.local`)
2. **Username** and **Application Password**
3. **Business profile** — name, description, services, projects, team, FAQs, testimonials, etc.

---

## Phase 0 — Discover site structure

Before writing anything, map the site:

```bash
# Test REST API access
curl -sk -u "USER:PASS" "https://SITE/wp-json/wp/v2/settings" | python -m json.tool

# List all pages
curl -sk -u "USER:PASS" "https://SITE/wp-json/wp/v2/pages?per_page=100&_fields=id,title,slug,status" | python -m json.tool

# List custom post types
curl -sk -u "USER:PASS" "https://SITE/wp-json/wp/v2/types" | python -m json.tool

# List existing posts per CPT
curl -sk -u "USER:PASS" "https://SITE/wp-json/wp/v2/CPT_SLUG?per_page=100&_fields=id,title,status"
```

Find MySQL connection details from Local by Flywheel conf.yml or from memory.

---

## Phase 1 — Site settings & page titles (REST API)

```bash
# Update site title and tagline
curl -sk -X POST -u "USER:PASS" \
  -H "Content-Type: application/json" \
  -d '{"title":"NEW SITE TITLE","description":"NEW TAGLINE"}' \
  "https://SITE/wp-json/wp/v2/settings"

# Update each page title/slug
curl -sk -X POST -u "USER:PASS" \
  -H "Content-Type: application/json" \
  -d '{"title":"About Us","slug":"about-us"}' \
  "https://SITE/wp-json/wp/v2/pages/PAGE_ID"
```

---

## Phase 2 — Custom Post Types (REST API)

For each CPT (services, projects, team, FAQs, testimonials):

1. **Delete** all existing posts:
```bash
# Get all IDs
curl -sk -u "USER:PASS" "https://SITE/wp-json/wp/v2/CPT_SLUG?per_page=100&_fields=id"
# Delete each
curl -sk -X DELETE -u "USER:PASS" "https://SITE/wp-json/wp/v2/CPT_SLUG/ID?force=true"
```

2. **Create** new posts with business content. **Always include `featured_media`** pointing to an existing media file:
```bash
curl -sk -X POST -u "USER:PASS" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Service Name",
    "content": "<p>Full description here.</p>",
    "status": "publish",
    "featured_media": ATTACHMENT_ID
  }' \
  "https://SITE/wp-json/wp/v2/CPT_SLUG"
```

### Finding available media for featured images

```bash
# List existing media attachments
curl -sk -u "USER:PASS" "https://SITE/wp-json/wp/v2/media?per_page=100&_fields=id,title,source_url" | python -m json.tool
```

If the user uploads images with a recognizable filename (e.g., `businessname.webp`), find their IDs:
```sql
SELECT ID, post_title, guid FROM wp_posts
WHERE post_type='attachment' AND guid LIKE '%businessname%'
ORDER BY ID;
```

Assign images sequentially to post types:
- Group 1 (images 1–N_services) → services
- Group 2 → projects
- Group 3 → team members
- Group 4 → FAQs
- Group 5 → testimonials
- Group 6 → blog posts
- Remaining → pages (Home, About, Services, Projects, Contact, Blog, Gallery)

For posts where `featured_media` wasn't set at creation time, insert directly via MySQL:
```sql
INSERT INTO wp_postmeta (post_id, meta_key, meta_value)
VALUES (POST_ID, '_thumbnail_id', 'ATTACHMENT_ID')
ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value);
```

---

## Phase 3 — Blog posts (REST API)

Same as CPT but using `post` type. Write 5 English articles relevant to the business:

```bash
curl -sk -X POST -u "USER:PASS" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Article Title",
    "content": "<p>Article body...</p>",
    "status": "publish",
    "featured_media": ATTACHMENT_ID
  }' \
  "https://SITE/wp-json/wp/v2/posts"
```

---

## Phase 4 — Bricks Builder templates (Direct MySQL)

Bricks stores layout as PHP serialized arrays in `wp_postmeta` with `meta_key = _bricks_page_content_2`.
This cannot be edited via REST API — requires direct MySQL.

### MySQL connection (Local by Flywheel)

```bash
MYSQL="C:/Users/PV/AppData/Roaming/Local/lightning-services/mysql-8.0.35+4/bin/win64/bin/mysql.exe"
"$MYSQL" --default-character-set=utf8mb4 -h 127.0.0.1 -P PORT -u root -proot local -e "SQL;"
```

### Step 1 — Find all Bricks templates with text

```sql
SELECT p.ID, p.post_title, p.post_type,
       LEFT(pm.meta_value, 200) as preview
FROM wp_posts p
JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE pm.meta_key = '_bricks_page_content_2'
  AND pm.meta_value != ''
ORDER BY p.post_type, p.ID;
```

### Step 2 — Extract all text strings

Run a Python script to parse the serialized PHP and dump all text fields:

```python
import subprocess, re, sys

MYSQL = "C:/Users/PV/AppData/Roaming/Local/lightning-services/mysql-8.0.35+4/bin/win64/bin/mysql.exe"

def run_sql(sql):
    result = subprocess.run(
        [MYSQL, "--default-character-set=utf8mb4", "-h", "127.0.0.1",
         "-P", "PORT", "-u", "root", "-proot", "local", "-e", sql],
        capture_output=True, text=True, encoding='utf-8'
    )
    return result.stdout

# Get all meta values
output = run_sql("SELECT post_id, meta_value FROM wp_postmeta WHERE meta_key='_bricks_page_content_2' AND meta_value!=''")

# Find all s:N:"text"; strings that look like visible content
pattern = re.compile(r's:\d+:"([^"]{10,})"')
for match in pattern.finditer(output):
    text = match.group(1)
    # Skip CSS, URLs, shortcodes, icon classes
    if any(x in text for x in ['px', 'rgb', 'http', 'fa-', '{%', '<%']):
        continue
    print(repr(text))
```

### Step 3 — Replace text with PHP serialization helper

```python
def php_replace(data: str, old: str, new: str) -> tuple[str, bool]:
    """Replace a PHP serialized string value, recalculating byte length."""
    old_bytes = len(old.encode('utf-8'))
    new_bytes = len(new.encode('utf-8'))
    pattern = f's:{old_bytes}:"{old}";'
    replacement = f's:{new_bytes}:"{new}";'
    if pattern in data:
        return data.replace(pattern, replacement), True
    return data, False

def update_meta(post_id: int, new_value: str):
    """Write updated meta_value back to DB via temp SQL file."""
    import tempfile, os, subprocess
    escaped = new_value.replace("\\", "\\\\").replace("'", "\\'")
    sql = f"UPDATE wp_postmeta SET meta_value='{escaped}' WHERE post_id={post_id} AND meta_key='_bricks_page_content_2';"
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='utf-8') as f:
        f.write(sql)
        tmpfile = f.name
    subprocess.run([MYSQL, "--default-character-set=utf8mb4", "-h", "127.0.0.1",
                    "-P", "PORT", "-u", "root", "-proot", "local", "--execute",
                    f"source {tmpfile}"])
    os.unlink(tmpfile)
```

### Step 4 — Common Bricks text field keys to replace

Text lives under these keys inside the serialized structure:
- `text` — main text/HTML content of a text element
- `inner_title` — section heading
- `content` — description block
- `description` — subtitle
- Button labels, stat counters, icon-box headings

When replacing multi-line or HTML content, include the full stored value (e.g., `<p>Old text</p>`).

### Step 5 — Verify replacements

```sql
-- Check a specific template
SELECT meta_value FROM wp_postmeta
WHERE post_id = TEMPLATE_ID AND meta_key = '_bricks_page_content_2';
```

---

## Phase 5 — ACF global options (MySQL)

ACF global options are stored in `wp_options` with keys prefixed `options_`:

```sql
SELECT option_name, option_value FROM wp_options
WHERE option_name LIKE 'options_%'
ORDER BY option_name;
```

Update each:
```sql
UPDATE wp_options SET option_value='New Value'
WHERE option_name='options_FIELD_NAME';
```

---

## Phase 5b — ACF fields on CPT posts (MySQL) ⚠️ REQUIRED

**Always fill all ACF fields on every CPT post.** Empty ACF fields will cause blank/broken display in Bricks templates.

### Step 1 — Discover all ACF field groups and fields

```sql
-- List field groups
SELECT ID, post_title FROM wp_posts WHERE post_type='acf-field-group' AND post_status='publish';

-- List all fields with their field keys
SELECT f.ID, f.post_title as label, f.post_name as field_key,
       f.post_excerpt as meta_name, g.post_title as group_name
FROM wp_posts f
JOIN wp_posts g ON f.post_parent = g.ID
WHERE f.post_type = 'acf-field'
ORDER BY g.ID, f.menu_order;
```

### Step 2 — Check which fields are empty on each CPT

```sql
SELECT p.ID, p.post_title, p.post_type, pm.meta_key, pm.meta_value
FROM wp_posts p
JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type IN ('YOUR_CPT_SLUGS')
  AND p.post_status = 'publish'
  AND pm.meta_key NOT LIKE '\_%'
ORDER BY p.post_type, p.ID, pm.meta_key;
```

If no rows appear → ACF fields have never been filled. Must INSERT both value row and `_field_key` reference row.

### Step 3 — Insert ACF values (always upsert both rows)

```sql
-- Value row
INSERT INTO wp_postmeta (post_id, meta_key, meta_value)
VALUES (POST_ID, 'meta_name', 'value')
ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value);

-- Field key reference row (required by ACF to recognize the field)
INSERT INTO wp_postmeta (post_id, meta_key, meta_value)
VALUES (POST_ID, '_meta_name', 'field_XXXXXXX')
ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value);
```

### Typical ACF fields to fill per post type

| Post type | Common fields |
|---|---|
| Services | `cover_image` (attachment ID) |
| Projects | Project name, location, year, water volume/capacity, facility type, company role |
| Team | `pozicija`/position, `bio` (multi-sentence biography) |
| Testimonials | `datum_recenzije` / review date (format: `Ymd` e.g. `20240315`) |

---

## Phase 5c — Taxonomies & Categories ⚠️ REQUIRED

**Always assign every post to a taxonomy term.** Posts with no category/tag will be invisible in filtered views.

### Step 1 — Discover all taxonomies and existing terms

```sql
SELECT tt.taxonomy, t.term_id, t.name, t.slug, tt.term_taxonomy_id, tt.count
FROM wp_terms t
JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
ORDER BY tt.taxonomy, t.term_id;
```

### Step 2 — Rename any old/foreign-language terms to English

```sql
UPDATE wp_terms SET name='New Name', slug='new-slug' WHERE term_id=ID;
```

### Step 3 — Assign posts to taxonomy terms

```sql
-- Assign a term to a post
INSERT INTO wp_term_relationships (object_id, term_taxonomy_id, term_order)
VALUES (POST_ID, TERM_TAXONOMY_ID, 0)
ON DUPLICATE KEY UPDATE term_order = 0;

-- Remove old/wrong assignment first if needed
DELETE tr FROM wp_term_relationships tr
JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
WHERE tr.object_id = POST_ID AND tt.taxonomy = 'taxonomy_name';
```

### Step 4 — Update term counts

```sql
UPDATE wp_term_taxonomy tt
SET count = (
  SELECT COUNT(*) FROM wp_term_relationships tr
  WHERE tr.term_taxonomy_id = tt.term_taxonomy_id
)
WHERE taxonomy IN ('category', 'post_tag', 'YOUR_CUSTOM_TAXONOMY');
```

### Typical taxonomy assignments

| Post type | Taxonomy | Notes |
|---|---|---|
| `post` (blog) | `category` | Assign to topic-based category; remove from "Uncategorized" |
| `post` (blog) | `post_tag` | Optional tags for topics |
| Projects CPT | custom taxonomy (e.g. `vrsta-projekti`) | Assign type: Commercial / Residential / Special Projects |
| Services CPT | custom taxonomy if exists | Assign service category |

---

## Phase 6 — Legal/utility pages

Update via REST API:
- Privacy/Legal Notice page — replace company name, address, contact info
- Cookie Policy — replace company references

---

## Phase 7 — Verification checklist

```bash
# Site title
curl -sk -u "USER:PASS" "https://SITE/wp-json/wp/v2/settings" | python -c "import sys,json; d=json.load(sys.stdin); print(d['title'], '|', d['description'])"

# CPT counts
for CPT in usluga projekti tim cesta_pitanja iskustva_klijenata; do
  echo -n "$CPT: "
  curl -sk -u "USER:PASS" "https://SITE/wp-json/wp/v2/$CPT?per_page=100" | python -c "import sys,json; print(len(json.load(sys.stdin)), 'posts')"
done

# Featured images on all CPT posts
SELECT p.post_type, COUNT(*) as total,
       SUM(CASE WHEN pm.meta_value IS NOT NULL THEN 1 ELSE 0 END) as has_thumbnail
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key = '_thumbnail_id'
WHERE p.post_type IN ('usluga','projekti','tim','cesta_pitanja','iskustva_klijenata','post')
  AND p.post_status = 'publish'
GROUP BY p.post_type;
```

---

## Key rules

- **Always assign featured images** when creating posts — pass `featured_media` in the REST payload or insert `_thumbnail_id` via MySQL afterward
- **Always fill ALL ACF fields** on every CPT post — discover fields first, then insert both value row and `_field_key` reference row
- **Always assign taxonomy terms** to every post — rename foreign-language terms to English, then assign and update counts
- **Never leave posts in "Uncategorized"** — always move blog posts to a meaningful category
- **Bricks content cannot be edited via REST** — always use direct MySQL + PHP serialization
- **PHP serialized string byte length** must match UTF-8 byte count, not character count
- **Write Python scripts to files**, not inline heredocs, to avoid shell escaping issues
- **Use `ON DUPLICATE KEY UPDATE`** for safe upsert when inserting post meta
- All content must be in **English** and relevant to the new business
