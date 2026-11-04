# web-blueprint-skills

Bộ Agent Skills để làm website WordPress + Bricks Builder: nghiên cứu → sitemap → wireframe → UI mockup → Bricks (BEM, tokens, components) → Figma → ảnh web.
Dùng được với Claude Code, Codex và các agent hỗ trợ chuẩn Agent Skills (`SKILL.md`).

## Cài đặt

Clone repo rồi chạy script cài. Script copy toàn bộ `skills/*` vào `~/.agents/skills/` và tạo link sang `~/.claude/skills/` để Claude Code cũng thấy.

```powershell
# Windows (PowerShell)
git clone https://github.com/phu-dev-marclie/web-blueprint-skills.git
cd web-blueprint-skills
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

```bash
# macOS / Linux
git clone https://github.com/phu-dev-marclie/web-blueprint-skills.git
cd web-blueprint-skills
bash install.sh
```

Script sẽ ghi đè skill trùng tên trong `~/.agents/skills/`. Riêng ở `~/.claude/skills/`, nếu đã có một thư mục thật (không phải link) trùng tên thì script bỏ qua thư mục đó và in cảnh báo.

**Vì sao phải cài vào `~/.agents/skills/`:** `bricks-bem-html` và `bricks-mcp` gọi script theo đường dẫn cố định `~/.agents/skills/bricks-bem-html/scripts/...`. Cài chỗ khác thì lint, `spec_builder` và `bricks_apply.php` sẽ không chạy.

Cập nhật: `git pull` rồi chạy lại script.

## Danh sách skill (60)

| Nhóm | Skill | Nguồn / license |
|---|---|---|
| Quy trình riêng | `ux-wireframe`, `wireframe-content`, `bricks-bem-html`, `bricks-mcp`, `html-to-figma`, `gen-image-web`, `wordpress-blueprint`, `source-command-replace-wp` | Tác giả repo |
| Bricks Builder (45) | `bricks-start-here`, `bricks-components`, `bricks-design-systems`, `bricks-query-loops`, `bricks-element-schemas`, … mọi thư mục `bricks-*` còn lại | [codeerhq/bricks-skills](https://github.com/codeerhq/bricks-skills) v0.1.1, GPL-2.0 |
| WordPress core | `wp-block-development`, `wp-block-themes`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops` | [WordPress/agent-skills](https://github.com/WordPress/agent-skills), GPL-2.0-or-later |
| Thiết kế UI | `impeccable` 4.8.0 | [pbakaus/impeccable](https://github.com/pbakaus/impeccable), Apache-2.0 |
| Vận hành site | `novamira` | Novamira CLI (`npm i -g @novamira/cli`) |

Chi tiết license nằm ở `THIRD_PARTY_NOTICES.md` và thư mục `licenses/`.

## Yêu cầu theo skill

- `ux-wireframe`, `bricks-bem-html`, `html-to-figma`: Python 3.10+; Node.js nếu chạy browser checks.
- `bricks-bem-html` (`bricks_apply.php`), `wp-wpcli-and-ops`: WP-CLI trên site WordPress.
- `bricks-mcp`: MCP server của Bricks đã cấu hình trong agent.
- `bricks-*` (codeer): Bricks abilities / Bricks AI trên site; xem `bricks-start-here`.
- `novamira`: Node.js 22+ và `@novamira/cli`.
- `gen-image-web`: Higgsfield MCP.
- `source-command-replace-wp`: viết cho Local WP trên Windows. Trước khi dùng, sửa `MYSQL=` (đường dẫn `mysql.exe`) và `PORT` cho hợp với máy của bạn.
- `bricks-skills-update`: chỉ chạy được khi cài bản gốc `codeerhq/bricks-skills` vào `~/.bricks/skills/bricks-skills`. Muốn nhận bản Bricks mới nhất thì cài theo README của upstream.

## Skill nào dùng khi nào

Quy trình chuẩn của bộ này. Các skill có trigger trùng nhau đã được ghi rõ phạm vi trong `description`.

| Tình huống | Dùng | Không dùng / ghi chú |
|---|---|---|
| Wireframe, sitemap, IA, content cả website | `ux-wireframe` | `wireframe-content` chỉ dùng khi cần một brief nội dung markdown riêng, không làm wireframe |
| HTML → Bricks | `bricks-bem-html` | Không dùng `bricks-html-css-to-bricks` / `bricks-figma-to-bricks`; quy trình không đi từ Figma sang Bricks |
| Đặt tên class Bricks | `bricks-bem-html` (prefix `w-`, `references/class-system.md`) | Ưu tiên hơn `bricks-naming-conventions` và mọi quy ước khác, kể cả trên site đã có quy ước riêng |
| Design tokens / biến Bricks | `bricks-bem-html` (`tokens.py` → Style Manager) | `bricks-design-systems` / `bricks-seed-design-system` chỉ để sửa trực tiếp trên site, theo tên token của `bricks-bem-html` |
| HTML → Figma | `html-to-figma` | |
| Thiết kế, critique, polish UI | `impeccable` | Trong dự án wireframe, phase 7 của `ux-wireframe` quyết định |
| Quản trị WordPress (wp-admin, plugin quen thuộc, thiết lập site) | `wordpress-blueprint` (ACF UI, FluentSnippets, Rank Math, không Gutenberg) | Đây là quy trình quản trị, không phải quy chuẩn viết code |
| Viết code plugin, block, theme, REST, Bricks element | `wp-plugin-development`, `wp-block-development`, `wp-block-themes`, `wp-rest-api`, `bricks-custom-elements` | Theo chuẩn viết code của từng skill; `wordpress-blueprint` chỉ quyết định nơi đặt content model và snippet của site |
| Kết nối, thao tác trên site | `novamira` | `bricks-mcp` chỉ khi gọi rõ `/bricks-mcp` |
