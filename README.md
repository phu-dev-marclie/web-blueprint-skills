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

## Skill nào dùng khi nào (tránh chồng chéo)

Một số skill có trigger hoặc quy tắc trùng nhau. Quy ước của bộ này:

| Tình huống | Dùng | Ghi chú |
|---|---|---|
| Wireframe / sitemap / content cả website | `ux-wireframe` | `wireframe-content` chỉ dùng khi cần brief nội dung dạng markdown để dán vào Figma |
| Viết HTML/CSS sẽ dựng trong Bricks | `bricks-bem-html` (class prefix `w-`) | Chỉ dùng `bricks-naming-conventions` cho site đã có quy ước riêng: theo quy ước có sẵn, đừng ép prefix `w-` |
| Figma → Bricks | `bricks-mcp` (đọc site + sinh section) + `bricks-bem-html` (class, components) | `bricks-figma-to-bricks` / `bricks-html-css-to-bricks` dùng khi site kết nối qua Bricks abilities |
| HTML → Figma | `html-to-figma` | |
| Design tokens / biến Bricks | `bricks-bem-html` (`tokens.py` → Style Manager) | `bricks-design-systems` / `bricks-seed-design-system` dùng để sửa trực tiếp trên site |
| Thiết kế, critique, polish UI | `impeccable` | Phase 7 của `ux-wireframe` có quy trình refine riêng; trong dự án wireframe thì theo `ux-wireframe` |
| Content model, code tuỳ biến, SEO | `wordpress-blueprint` (ACF UI, FluentSnippets, Rank Math, không Gutenberg) | **Xung đột quy tắc:** `wp-plugin-development`, `wp-block-*`, `bricks-custom-elements`, `bricks-child-theme-patterns` hướng dẫn viết plugin, block hoặc child theme PHP. Trên site theo blueprint, chỉ dùng chúng khi thật sự cần custom element hoặc plugin |
| Thao tác trực tiếp trên site | Đã cài Novamira → `novamira`; đã có Bricks abilities → `bricks-start-here`; đã có MCP Bricks → `bricks-mcp` | Mỗi việc chỉ đi qua một kênh |
