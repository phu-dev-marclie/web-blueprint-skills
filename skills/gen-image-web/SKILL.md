---
name: "gen-image-web"
description: "Lập kế hoạch, viết prompt, generate (Higgsfield MCP), QC, đặt tên ảnh lifestyle/banner/poster cho website có sản phẩm thật, qua từng vòng test–QC–cải tiến."
---

# gen-image-web — Quy trình tạo ảnh AI cho website (Claude + Higgsfield MCP)

AI đóng vai: **người lập kế hoạch + prompt engineer + art director + QC + quản lý file**. Người dùng là người duyệt và ra lệnh generate. Mọi thứ đi qua file `.md` kế hoạch thân thiện với AI, làm theo từng vòng: **chuẩn bị → test → QC → cải tiến prompt → chạy tiếp**.

---

## 0. LUẬT CỨNG (không bao giờ vi phạm)

| # | Luật |
|---|---|
| R1 | **Không bao giờ tự generate.** Chỉ gọi tool generate khi người dùng gõ đúng lệnh **„Hãy generate đi"** (hoặc tương đương rõ ràng). „Làm", „duyệt", „chuẩn bị" ≠ generate. |
| R2 | **Luôn viết/cập nhật file kế hoạch `.md` trước khi hành động.** Mỗi thay đổi prompt = tăng version (v1.0 → v1.1 …) + ghi changelog. |
| R3 | Chỉ **2K**, **1 biến thể / ảnh** (`count: 1`). |
| R4 | **Chỉ 1 ảnh reference cho mỗi ảnh generate.** Cần nhiều sản phẩm → ghép thành **1 ảnh composite** (xem §4). |
| R5 | Mỗi vòng mới **phải cải tiến prompt trước** dựa trên QC + góp ý người dùng. |
| R6 | Luôn **test nhỏ trước** (3–6 ảnh), người dùng tải ảnh về → nói „QC đi" → AI QC → đề xuất v mới → chờ duyệt. |
| R7 | **Model mặc định: Nano Banana Pro** (`nano_banana_pro`). Chỉ dùng model khác khi người dùng yêu cầu. (Bài học: GPT Image 2 giữ nhãn tốt nhưng ảnh bẹt, nhãn như sticker, trông ghép — người dùng không thích.) |
| R8 | Chữ nhỏ trên bao bì được phép mờ, nhưng **hình dáng, màu, tên thương hiệu phải giữ nguyên**, nhìn là nhận ra sản phẩm. |
| R9 | **Mọi ảnh phải có sản phẩm**, độ phủ sản phẩm cân bằng (mỗi SP ≥ N ảnh), ưu tiên ảnh combo nhiều SP. |
| R10 | Tên file: `NN-{PREFIX}_{Phase}_{ID}_{slot}_{model}_v{x.y}[_{AR}].png` — `NN` là số thứ tự toàn cục bắt đầu **01**, tăng liên tục, không dùng lại. Ghi „NN tiếp theo" trong file kế hoạch. |
| R11 | Ảnh tuỳ chọn (optional) chỉ chạy khi người dùng nói rõ. Lệnh „Hãy generate đi" chung chung = chỉ chạy hàng đợi bắt buộc. |
| R12 | Không ghi file nháp/preview vào thư mục của người dùng. Preview/resize để QC → scratchpad của phiên. |
| R13 | Không xoá ảnh cũ (kể cả ảnh bị loại) — giữ làm dự phòng. |

Phong cách giao tiếp: như người bạn thân, đa góc nhìn, giải thích ngắn „vì sao", đề xuất phương án A/B kèm credit, hỏi khi cần làm rõ. Trả lời bằng ngôn ngữ của người dùng; prompt luôn viết tiếng Anh.

---

## 1. CẤU TRÚC THƯ MỤC DỰ ÁN

```
<project>/
  Business-Information.md        # nguồn sự thật: thương hiệu, màu, danh sách SP, luật compliance
  image-product/                 # packshot gốc của khách
  image-gen/
    IMAGE-GEN-PLAN.md            # kế hoạch chính (luật, registry SP, block prompt, phase, log, changelog)
    POSTER-PLAN.md               # (nếu có poster) kế hoạch riêng
    refs/                        # composite + script build_composites.py
    qc/                          # QC-phase-N.md, AUDIT-product-coverage.md
    output/phase-N/ …            # ảnh người dùng tải về, AI đổi tên theo R10
```

Nếu thư mục người dùng được kết nối qua device bridge: làm việc với file **trên máy người dùng** (`device_bash`: đọc, sửa `.md`, đổi tên ảnh). Chỉ **stage ảnh lên cloud để nhìn** (Read ảnh) khi QC.

---

## 2. CÁC GIAI ĐOẠN

### Giai đoạn 0 — Tiếp nhận (không generate)
1. Đọc `Business-Information.md` (hoặc hỏi): tên thương hiệu, thị trường/ngôn ngữ, màu thương hiệu (hex), tone, danh sách SP chính thức, **luật compliance** (vd FSMP/thực phẩm chức năng: không hứa chữa bệnh, không ống tiêm, không cân/thước dây…).
2. Liệt kê ảnh SP có sẵn; ghi độ phân giải, nền, SP nào thiếu ảnh.
3. Hỏi (AskUserQuestion) những điểm quyết định: các trang/slot cần ảnh (hero, banner, category, blog, poster…), tỉ lệ khung (16:9 desktop, 3:4/4:5 mobile…), người mẫu hay không, ngân sách credit, model.

### Giai đoạn 1 — Viết `IMAGE-GEN-PLAN.md` (v1.0)
Gồm các mục (AI-friendly, có bảng, có checklist):
1. **STATUS** (phase hiện tại, NN tiếp theo, credit còn lại).
2. **LUẬT** R1–R13 (copy từ skill + luật riêng dự án).
3. **REGISTRY SẢN PHẨM**: mã P01…, tên, loại bao bì (hộp ngang/hộp đứng/lọ/chai), mô tả ngắn màu–hình, **BRAND_LOCK** (chuỗi chữ phải đọc đúng từng ký tự), file ref, `media_id` (điền sau khi upload).
4. **KHỐI PROMPT** (§3) có version.
5. **SHOT LIST** theo phase: ID, slot web, AR, ref, model, SHOT text (tiếng Anh), AVOID riêng.
6. **KẾ HOẠCH CHẠY**: phase test → các phase sản xuất; credit ước tính.
7. **GENERATION LOG**: NN, ID, job_id, kết quả QC.
8. **CHANGELOG**.
→ Trình người dùng, chờ duyệt.

### Giai đoạn 2 — Chuẩn bị reference
- Composite nhiều SP → 1 ảnh (§4). Đặt tên `C01-HERO`, `C02-…`.
- Upload: **chỉ dùng `media_upload_widget`** (upload trực tiếp PUT thường bị proxy chặn). Gọi widget là tool duy nhất trong lượt; người dùng upload rồi gửi lại `media_id`. Ghi ngay vào registry.
- Tạo project/folder Higgsfield một lần (`create_project` hoặc dùng folder người dùng cho) → dùng cùng `folder_id` cho mọi generate.

### Giai đoạn 3 — Vòng test (3–6 ảnh)
Chọn concept đại diện (1 SP đơn, 1 combo, 1 có tay/người). Có thể so 2 model cùng prompt. Chờ „Hãy generate đi".

### Giai đoạn 4 — Vòng QC (sau khi người dùng nói „QC đi")
1. Đổi tên file theo R10 (map theo job_id trong tên file `hf_…_{jobid}.png`).
2. Stage ảnh → resize ~1400px trong scratchpad → Read từng ảnh.
3. Chấm theo §5, viết `qc/QC-<vòng>.md`.
4. Rút **bài học** → đề xuất block/shot version mới + hàng đợi vòng sau (NN, ID, AR, ref, credit) → ghi vào plan → chờ duyệt + „Hãy generate đi".
5. Làm lại ảnh hỏng = ảnh mới với NN mới (không ghi đè).

### Giai đoạn 5 — Sản xuất theo phase
Lặp 3–4. Định kỳ làm `AUDIT-product-coverage.md`: đếm mỗi SP xuất hiện bao nhiêu ảnh → bổ sung combo cho SP thiếu.

### Giai đoạn 6 — Poster / nền quảng cáo không chữ (nếu cần)
Dùng `POSTER-PLAN.md` + block poster (§3.2). Mỗi poster làm 2 bản: 16:9 (desktop) + 3:4 (mobile).

### Giai đoạn 7 — Hoàn tất
- Danh sách **POST-FIX** (lỗi chữ nhỏ sửa bằng Photoshop): NN, lỗi, cách sửa.
- Đề xuất file **asset mapping** (slot web → file ảnh).

---

## 3. KHỐI PROMPT (template — thay `{…}`)

Prompt cuối = **SHOT + STYLE + FIDELITY (+BRAND_LOCK) + INTEGRATION + EXPOSURE + AVOID (+AVOID riêng)**.

### 3.1. Ảnh lifestyle / banner

**STYLE_LIFESTYLE**
```
Photorealistic editorial lifestyle photograph for a premium {market} {category} brand. Natural window light, soft realistic shadows, true-to-life colours, gentle contrast, subtle film grain. Calm, clean, trustworthy mood; colour accents in {brand colours}. Medium-format camera look, shallow but not extreme depth of field.
```

**FIDELITY_SINGLE**
```
Product fidelity: the reference image shows the exact product packaging. Reproduce it faithfully — identical shape, three-dimensional proportions and depth, colours, main graphics and label layout; do not redesign it. The brand name on the packaging must read exactly, letter for letter: "{BRAND_LOCK}". Small print may be soft or unreadable, but never replace it with different legible words or numbers. It is a real carton/bottle with true depth. Show the product exactly once, upright, front label clearly visible, turned naturally at most 20 degrees from the camera, large enough in the frame that the brand name is clearly legible, at a realistic real-world size, grounded with a natural contact shadow.
```

**FIDELITY_MULTI** (composite)
```
Product fidelity: the reference image is a line-up of {N} different products: {LIST — mô tả màu/hình + (tên)}. Place all {N} products in the scene, each exactly once — no duplicates, no missing items, no extra or invented products. Reproduce each packaging faithfully — identical shape, three-dimensional proportions and depth, colours, main graphics and label layout; do not redesign any of them. Brand names must read exactly, letter for letter: {"LOCK1", "LOCK2", …}. Small print may be soft or unreadable, but never replace it with different legible words or numbers. Keep their real relative sizes as in the reference. Each is a real carton/bottle with true depth, front labels clearly visible, turned naturally at most 20 degrees from the camera, large enough that each brand name is clearly legible, grounded with natural contact shadows. Treat the reference as a precise product photograph: copy every label's layout, colours, logo and brand name exactly as printed; do not reinterpret, simplify, restyle or invent any label. Arrange the products in the same left-to-right order as in the reference. Every front label faces the camera. All bottles are identical white plastic supplement bottles with white screw caps — only their printed labels differ; never change the bottle material, colour or cap. All cartons are flat printed cardboard boxes exactly as in the reference. Never invent or substitute a brand name. No product may cover or hide another product's front label; leave small gaps between them.
```
(Chỉnh câu „bottles/cartons" theo vật liệu thật của SP.)

**Câu hộp nằm ngang** (thêm khi SP là hộp rộng hơn cao)
```
This carton is landscape-shaped (wider than tall): it stands on its long bottom edge so all printed text reads horizontally; never rotate it onto its short side.
```

**INTEGRATION** (chống loá, chống cảm giác „dán ảnh")
```
Lighting integration: the reference is a flat packshot on white — copy only the packaging design, never its lighting. Relight the product(s) to match this scene: same light direction, colour temperature and softness as the surroundings, soft bounce colour from nearby surfaces, realistic reflections only where the material allows, and contact shadows consistent with every other object. The product(s) look photographed in the same shot, not composited. No glare or blown highlights on the packaging.
```

**EXPOSURE**
```
Balanced exposure: mid-tone background, no pure-white or pure-black areas, the product is the clearest and sharpest element; negative space stays calm and mid-toned for overlay text.
```

**AVOID** (+ luật compliance dự án)
```
Avoid: any text, captions, watermarks or logos other than the printed packaging; extra or invented products; redesigned packaging; distorted hands or extra fingers; plastic-looking skin; cheap stock-photo look; CGI or 3D-render look; blown-out highlights; pasted-on collage look; sparkle stars, lens starbursts, glitter effects; {compliance items: syringes, weighing scales, measuring tapes, spilled pills…}.
```

### 3.2. Poster studio (nền quảng cáo không chữ — web tự chèn chữ)

**STYLE_STUDIO**
```
Premium studio advertising photograph for a premium {market} {category} brand. {BACKDROP} Crafted lighting: a large soft key light plus one crisp directional light that casts clean, graphic shadows onto the backdrop, and a subtle rim light separating the product from the background. Bold, minimal, confident composition with generous empty negative space for a headline. Tactile, real props only where specified. Tack-sharp product, true-to-life colours, rich but natural contrast, protected highlights, no haze, subtle fine film grain. Photorealistic, medium-format camera, 80mm lens.
```
- `{BACKDROP}` studio: `Seamless paper backdrop in one colour, smooth and even with a soft gradient, no visible seams, edges or studio equipment.`
- `{BACKDROP}` bầu trời: `Clean, natural bright sky background with soft real clouds, no studio equipment visible.`
- **Không dùng** cụm „DTC campaigns" — khiến NBP vẽ lại bao bì.

**INTEGRATION_STUDIO**
```
Lighting integration: the reference is a flat packshot on white — copy only the packaging design, never its lighting. Light the product(s) with this studio setup: the same key-light direction as the props, a soft coloured bounce from the backdrop tinting its edges, and shadows cast onto the backdrop consistent with every other object. The product(s) stand or rest physically with real contact shadows and look photographed in the same shot, not composited.
```

**Bố cục 16:9** (nối cuối SHOT): `Keep the product group fully inside the frame with a comfortable margin of at least 8% from the right and bottom edges; nothing touches or is cut by the frame edge. Props and plinths also stay fully inside the frame.`

**Bố cục 3:4** (thay câu vị trí/vùng trống của SHOT): `Vertical 3:4 poster: the product group sits in the lower half, horizontally centred, with at least 8% margin from every edge; the upper 45% is empty backdrop for a headline.`

**AVOID_POSTER**
```
Avoid: any text, letters, words, numbers, typography, captions, arrows, icons, badges, frames or graphic overlays anywhere in the image (only the printed packaging may carry text); extra or invented products; redesigned packaging; loosely scattered or spilled pills; distorted hands or extra fingers; plastic-looking skin; cheap stock-photo look; CGI or 3D-render look; blown-out highlights; visible studio stands or backdrop edges; pasted-on collage look; sparkle stars, lens starbursts, glitter effects, flat sticker-like labels, splash effects that look artificial.
```

**Mẫu SHOT poster** (1 SP): `Studio poster: a seamless {colour} backdrop. The product {box/bottle} stands on {plinth} in the right third, beside {1–2 real props liên quan công dụng}; a hard key light casts a clean shadow to the left. The left half is empty backdrop for a headline.`
Concept hay dùng: phông màu thương hiệu + bục đá/acrylic/gỗ; bóng khung cửa sổ; trái cây cắt đôi; tay trao/nâng SP giữa trời xanh; bục đá dưới bầu trời (combo); giỏ lưới + tay nhấc SP (combo).

---

## 4. COMPOSITE REFERENCE (nhiều SP → 1 ref)
Script Python (Pillow): tách nền trắng từng packshot, scale theo **chiều cao thật** (cm) của SP, xếp hàng ngang trên canvas trắng, khoảng cách đều, thứ tự trái→phải cố định (prompt nói „same left-to-right order"). Lưu `refs/Cxx-NAME.png`, ghi thứ tự + LIST mô tả vào plan. Combo tối đa 4 SP; nếu NBP vẫn vẽ lại nhãn → giảm còn 2–3.

---

## 5. QC — thang chấm

| Mã | Tiêu chí |
|---|---|
| Q1 | Tên thương hiệu đọc đúng từng ký tự (BRAND_LOCK) |
| Q2 | Hình dáng/tỉ lệ/màu bao bì đúng, không bị thiết kế lại (vật liệu lọ, màu nắp, tên giả) |
| Q3 | Đủ SP, không trùng, không SP bịa; hộp ngang không bị dựng đứng |
| Q4 | Bố cục: vùng trống cho chữ, lề ≥ 8%, không bị cắt mép |
| Q5 | Người/tay tự nhiên, không lỗi ngón |
| Q6 | Compliance + không có chữ/biểu tượng lạ |
| Q7 | Ánh sáng hoà hợp: không loá, không „dán ảnh", bóng đổ khớp |

Kết luận mỗi ảnh: ✅ dùng · ⚠️ dùng được có lưu ý (crop/POST-FIX) · ❌ làm lại. File QC gồm: bảng chấm (NN, poster, AR, Q1–Q7 tóm tắt, kết luận), tổng kết, **bài học → thay đổi prompt**, hàng đợi vòng sau.

---

## 6. HIGGSFIELD MCP — thông số kỹ thuật

- **NBP:** `model: "nano_banana_pro"`, `resolution: "2k"`, `count: 1`, media role `image_references`, ~2 credit/ảnh (backend hiển thị `nano_banana_2`).
- **GPT Image 2** (chỉ khi được yêu cầu): `model: "gpt_image_2"`, `resolution: "2k"`, `quality: "high"`, role `image`, ~6.5 credit, không có 4:5.
- Luôn truyền `folder_id` của dự án.
- Nhiều ảnh: `generate_image_batch` (≤12/lô, `index` = NN) → `jobs_wait` (≤12, lặp tới khi terminal) → **một** `show_generation_by_ids` cho cả đợt (nếu output quá lớn, đọc file kết quả bằng `jq`) → `balance` để đối chiếu credit.
- Ghi **job_id** vào log ngay sau khi submit (trước khi chờ).
- Build prompt bằng script Python từ các block (tránh gõ sai), rồi dán nguyên văn vào lệnh gọi.
- Upload ref: `media_upload_widget` (không PUT trực tiếp).

---

## 7. BÀI HỌC ĐÃ KIỂM CHỨNG
1. Nhãn sai chữ („boriemon", „Loxemon") → BRAND_LOCK + SP đứng thẳng, mặt trước, đủ to; nêu rõ „a"/„o" nếu dễ nhầm (vd `spelled L-a-x-e-m-o-n`).
2. SP cầm trên tay dễ méo → ưu tiên đặt SP trên bề mặt; nếu có tay, SP đứng thẳng, nhãn hướng camera.
3. Loá sáng / cảm giác ghép → khối INTEGRATION + EXPOSURE (không copy ánh sáng packshot).
4. Hộp ngang bị dựng đứng → câu „landscape-shaped carton".
5. NBP thêm sao lấp lánh → cấm `sparkle stars, lens starbursts`.
6. Model đẩy SP sát mép → luật lề 8% + „props stay inside frame".
7. Combo NBP hỏng ngẫu nhiên (đổi vật liệu lọ, bịa tên) → khoá vật liệu bao bì, „never invent a brand name", giữ thứ tự như ref, tư thế đơn giản (đứng thẳng); hỏng thì chạy lại 1 lần với NN mới.
8. Mô tả đúng loại bao bì khó (vd D3 là „small rectangular cardboard tablet box, NOT a drink carton").
9. Cảnh bầu trời phải bỏ câu „seamless paper backdrop".
10. Chữ nhỏ sai → POST-FIX Photoshop, không tốn credit chạy lại.

---

## 8. MẪU TRẢ LỜI SAU MỖI BƯỚC
- Sau generate: bảng NN/poster/AR/thay-cho, credit dùng + còn lại, nơi ghi log, thư mục cần tải về, nhắc „QC đi".
- Sau QC: số ✅/⚠️/❌, ảnh thay thế ảnh nào, nhận định nguyên nhân, đề xuất version mới + hàng đợi + credit, nhắc „Hãy generate đi" (và hỏi các mục tuỳ chọn).