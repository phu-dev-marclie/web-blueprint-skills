---
name: bricks-mcp
description: |
  Kênh phụ: kết nối Claude Code với WordPress Bricks Builder qua MCP để đọc dữ liệu website (pages, elements, settings, fonts, breakpoints)
  và sinh HTML/CSS/JS paste vào Bricks (HTML Element). Class theo hệ `w-` của bricks-bem-html.

  Chỉ dùng khi người dùng gọi rõ "bricks-mcp", "/bricks-mcp" hoặc yêu cầu làm việc qua Bricks MCP.
  Không dùng cho: kết nối/thao tác site thông thường (→ novamira), chuyển HTML sang Bricks (→ bricks-bem-html),
  wireframe (→ ux-wireframe).
argument-hint: "[figma-url]"
license: MIT
metadata:
  author: phu
  version: "1.0.0"
---

# Bricks MCP — Figma to Bricks Builder

Kết nối Claude Code với WordPress Bricks Builder. Đọc dữ liệu site, chuyển đổi Figma design thành HTML/CSS/JS để paste vào Bricks.

## Khi nào kích hoạt

- User gọi rõ `bricks-mcp` / `/bricks-mcp` hoặc yêu cầu làm việc qua Bricks MCP
- Kết nối site mặc định là `novamira`; HTML → Bricks mặc định là `bricks-bem-html`

---

## Bước 1 — Kết nối & Đọc dữ liệu site

Gọi các MCP tools sau để hiểu site context (chạy song song khi có thể):

| Tool | Mục đích |
|------|----------|
| `get_builder_guide` | Element types, settings reference, CSS gotchas, workflow |
| `get_site_info` | Site name, WP version, Bricks version |
| `bricks:get_breakpoints` | Responsive breakpoints (keys + widths) |
| `bricks:get_element_schemas` (catalog_only=true) | Danh sách element types có sẵn |

**Quan trọng:** Luôn gọi `get_builder_guide` TRƯỚC khi tạo/sửa page.

### Đọc page hiện tại
```
page:get    post_id={id}  view=summary   → xem cấu trúc element tree
page:get    post_id={id}  view=detail    → xem chi tiết settings
page:list   bricks_only=true             → liệt kê tất cả Bricks pages
```

### Đọc CSS & scripts
```
code:get_page_css      post_id={id}   → custom CSS của page
code:get_page_scripts  post_id={id}   → custom JS của page
```

---

## Bước 2 — Phân tích thiết kế Figma

Khi user đưa Figma URL, trích xuất `fileKey` và `nodeId` từ URL:
```
URL: https://figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
```

Gọi Figma MCP:
```
get_design_context  fileKey={fileKey}  nodeId={nodeId}  clientLanguages=html,css
```

Từ kết quả, trích xuất:
1. **Layout structure** — flex/grid directions, gaps, dimensions
2. **Spacing values** → map sang CSS variables (xem bảng bên dưới)
3. **Typography** → font-family, font-size, font-weight, line-height
4. **Colors** → map sang CSS variables
5. **Assets** → download URLs cho images/icons (hết hạn 7 ngày)
6. **Component name** → dùng làm BEM block name

---

## Hệ thống class & component (bắt buộc khi dựng native Bricks)

Khi section cần **chỉnh sửa được trong Bricks** (Structure có tên, class, CSS trong class, component),
KHÔNG paste vào HTML Element — làm theo skill **`bricks-bem-html`**:
- Mọi element có class BEM riêng; CSS của class chỉ style chính element đó (`%root%`), không `.block h3`, không `[data-layout] …`.
- Phần lặp lại (button từng loại, card, nav link…) → Bricks Component + properties; style nằm ở class.
- Kiểm tra: `python ~/.agents/skills/bricks-bem-html/scripts/bem_lint.py <css> <html>` → 0 error.
- Đưa vào Bricks: `spec_builder.py` → `bricks_apply.php` (backup, classes, components, Save_Pipeline).

Paste HTML Element (bên dưới) chỉ dùng cho embed một lần, không cần chỉnh trong builder.

## Bước 3 — Generate HTML/CSS/JS

### Quy tắc BEM CSS

- Tên class theo hệ của `bricks-bem-html` (`references/class-system.md`), ưu tiên hơn mọi quy ước khác
- Block name: `w-` + tên section (e.g. "Feature Section 94" → `.w-feature-why`)
- Element: `__` separator (e.g. `.w-feature-why__card-title`)
- Modifier: `--` separator (e.g. `.w-feature-why__row--three-col`)
- Tất cả selectors phải bắt đầu bằng block name → tránh CSS conflict

### Quy tắc Layout

- **CSS Grid** cho layout 2D (rows + columns cùng lúc, ví dụ: `grid-template-columns: 1fr 2fr 1fr`)
- **Flexbox** cho layout 1D (chỉ row HOẶC column)
- KHÔNG dùng hardcoded pixel widths cho layout — dùng `fr`, `%`, hoặc `calc()`
- Dùng `align-items: stretch` (mặc định của Grid) để card/image lấp đầy chiều cao

### Quy tắc CSS Variables

**CRITICAL — KHÔNG dùng fallback values:**
```css
/* ✅ ĐÚNG */
padding: var(--space-m);
font-size: var(--text-l);

/* ❌ SAI — gây lỗi trên Bricks */
padding: var(--space-m, 28px);
font-size: var(--text-l, 22px);
```

### Quy tắc Typography

Font-family sử dụng tên font Bricks custom trực tiếp — KHÔNG qua `var()`:
```css
/* ✅ ĐÚNG */
font-family: font-heading;
font-family: font-body;

/* ❌ SAI */
font-family: var(--font-heading);
font-family: 'Poppins', sans-serif;
```

| Loại text | Font | Weight |
|-----------|------|--------|
| Headings, tagline, card titles | `font-heading` | 600 (SemiBold) |
| Body text, descriptions, meta | `font-body` | 400 (Regular) |
| Badges, bold labels | `font-body` | 500 (Medium) |

### Responsive Breakpoints

Desktop-first approach. 4 breakpoints:

| Breakpoint | max-width | Bricks key | Mô tả |
|------------|-----------|------------|-------|
| Laptop | 1200px | `laptop` | Giảm font heading |
| Tablet | 991px | `tablet_portrait` | Stack 2 cột, giảm gap |
| Mobile landscape | 767px | `mobile_landscape` | Stack 1 cột |
| Mobile portrait | 478px | `mobile_portrait` | Giảm padding, font nhỏ |

### Output format

File tự chứa đầy đủ — paste trực tiếp vào Bricks > HTML Element:

```html
<style>
  /* BEM CSS — block: .{block-name} */
  .block-name { ... }
  .block-name__element { ... }
  @media (max-width: 1200px) { ... }
  @media (max-width: 991px) { ... }
  @media (max-width: 767px) { ... }
  @media (max-width: 478px) { ... }
</style>

<section class="block-name">
  <!-- HTML structure -->
</section>

<script>
  // JS nếu cần (slider, animation, etc.)
</script>
```

Lưu file vào: `D:\Claudetodesign\design-to-bricks\{block-name}.html`

---

## Tham khảo: CSS Variables (Bricks Core Framework)

### Spacing
| Variable | ~Value |
|----------|--------|
| `--space-4xs` | ~5px |
| `--space-3xs` | ~7px |
| `--space-2xs` | ~10px |
| `--space-xs` | ~14px |
| `--space-s` | ~20px |
| `--space-m` | ~28px |
| `--space-l` | ~40px |
| `--space-xl` | ~56px |
| `--space-2xl` | ~79px |
| `--space-3xl` | ~112px |
| `--space-4xl` | ~158px |

### Typography sizes
| Variable | ~Value |
|----------|--------|
| `--text-xs` | ~12px |
| `--text-s` | ~14px |
| `--text-m` | ~16.5px |
| `--text-l` | ~22px |
| `--text-xl` | ~31px |
| `--text-2xl` | ~39px |
| `--text-3xl` | ~52px |
| `--text-4xl` | ~69px |

### Colors
| Variable | Mô tả |
|----------|-------|
| `--primary` | Brand blue (#0d73fc) |
| `--primary-l-1` → `--primary-l-4` | Primary lighter variants |
| `--primary-d-1` → `--primary-d-4` | Primary darker variants |
| `--text-title` | Heading text (#000501) |
| `--text-body` | Body text (#363636) |
| `--text-body-dark` | Muted body text (#838383) |
| `--text-contrast` | White text on dark bg |
| `--text-tagline` | Tagline text |
| `--text-highlight` | Accent/highlight text (primary blue) |

### Backgrounds
| Variable | Mô tả |
|----------|-------|
| `--bg-body` | Page background |
| `--bg-base` | Base background |
| `--bg-base-l-1` → `--bg-base-l-4` | Base lighter variants |
| `--bg-base-d-1` → `--bg-base-d-4` | Base darker variants |
| `--bg-surface` | Surface background |
| `--bg-surface-2` | Secondary surface (#f0f6ff) |
| `--bg-special` | Special/dark section bg |

### Borders & Radius
| Variable | Mô tả |
|----------|-------|
| `--border-light` | Light border (#cbcbcb) |
| `--border-dark` | Dark border |
| `--radius-xs` | ~4px |
| `--radius-s` | ~8px |
| `--radius-m` | ~12px |
| `--radius-l` | ~20px |
| `--radius-xl` | ~28px |
| `--radius-full` | 9999px (pill) |

### Dark opacity modifiers
| Variable | Value |
|----------|-------|
| `--dark-5` | rgba(0,0,0,0.05) |
| `--dark-10` | rgba(0,0,0,0.10) |
| `--dark-20` → `--dark-90` | rgba(0,0,0,0.20→0.90) |

---

## Tham khảo: Cách paste vào Bricks

1. Mở Bricks Editor trên page cần thêm section
2. Click **+** → tìm element **HTML** (category: General) → kéo vào canvas
3. Click vào HTML element → panel bên trái → field **Code**
4. Paste toàn bộ nội dung file `.html` (bao gồm `<style>`, HTML, `<script>`)
5. Đóng panel → section render trực tiếp trên canvas
6. **Thay ảnh Figma** bằng ảnh từ WordPress Media Library (Figma URLs hết hạn 7 ngày)

---

## Bảo mật

- KHÔNG commit hoặc log credentials/API keys
- KHÔNG sửa `.claude.json` trừ khi user yêu cầu
- KHÔNG push code trực tiếp lên production mà không hỏi user
- Figma asset URLs hết hạn 7 ngày — luôn nhắc user thay bằng ảnh thật
