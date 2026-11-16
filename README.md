# 🎮 PS1 Online — Chơi game PlayStation 1 trên trình duyệt

Chơi game PS1 ngay trên trình duyệt: người chơi tải file đĩa game của mình lên
(`.iso` / `.bin` / `.cue` / `.pbp` / `.chd` / `.zip`) rồi chơi luôn, không cần cài đặt.
Kèm **Cheat Engine (GameShark)** và **nút lưu / nạp nhanh save state**.

Trang chạy bằng [EmulatorJS](https://emulatorjs.org) 4.2.3 (nhân PCSX ReARMed),
dùng WebAssembly nên game chạy hoàn toàn trên máy người chơi — file game không
tải lên máy chủ nào cả.

## ✨ Tính năng

- **Nạp game từ máy:** kéo thả hoặc chọn file `.iso`, `.bin`, `.cue`, `.img`,
  `.mdf`, `.pbp`, `.chd`, `.zip` (chứa đĩa game). File được đưa thẳng vào trình
  giả lập dưới dạng `File` object.
- **BIOS tùy chọn:** một số game chạy ổn không cần BIOS (nhờ HLE). Nếu game
  không boot, nạp thêm file BIOS PS1 của bạn (`scph5500.bin` / `scph5501.bin` /
  `scph5502.bin`).
- **💾 Lưu / nạp nhanh (Save State):**
  - *Lưu nhanh / Nạp nhanh* — chụp toàn bộ trạng thái game vào khe 1, lưu trong
    trình duyệt (IndexedDB), nạp lại là chơi tiếp đúng chỗ đó, kể cả giữa trận.
  - *Tải file save* — tải file `.state` về máy để giữ lâu dài hoặc chia sẻ.
  - *Nạp file save* — nạp lại file `.state` đã lưu trước đó.
  - *Xuất / Nạp thẻ nhớ* — file `.srm` (memory card) của game.
- **🎩 Cheat Engine (GameShark):** thêm mã theo từng game, bật/tắt từng mã,
  áp dụng ngay trong lúc chơi. Mã nhiều dòng nối bằng `+`
  (vd: `80128FB4+00C8`). Mã được lưu trên trình duyệt của bạn.
- **Điều khiển thêm:** tạm dừng, tua nhanh, toàn màn hình; thanh công cụ của
  EmulatorJS có sẵn nút Cheat, Cài đặt phím, Chụp màn hình…
- **Giao diện tiếng Việt** (`EJS_language = 'vi-VN'`).

## 🚀 Dùng thử

Mở trang đã deploy (GitHub Pages) hoặc chạy local:

```bash
# Cách nhanh nhất: mở bằng một static server (tránh lỗi CORS khi mở file://)
python3 -m http.server 8000
# rồi mở http://localhost:8000
```

1. Chuẩn bị file đĩa game PS1 của bạn.
2. Kéo thả file vào ô nạp game, bấm **Bắt đầu chơi**.
3. Chơi bằng bàn phím (chỉnh phím trong ⚙️ Cài đặt của trình giả lập).

## 🛠 Kỹ thuật

- Trang tĩnh duy nhất: `index.html` + `style.css` + `app.js`, không cần build.
- EmulatorJS nạp từ CDN đã ghim phiên bản: `https://cdn.emulatorjs.org/4.2.3/data/loader.js`
  (`EJS_pathtodata` trỏ cùng CDN).
- Cấu hình chính trong `app.js` → `startGame()`:
  `EJS_core = 'psx'`, `EJS_gameUrl = File`, `EJS_biosUrl = File | ''`,
  `EJS_gameName` (khóa save state / cheat theo game),
  `EJS_defaultOptions = { 'save-state-location': 'browser' }`.
- Save state dùng API của `EJS_emulator.gameManager`:
  `getState()` / `loadState(bytes)` / `quickSave(1)` / `quickLoad(1)`.
- Cheat nạp sẵn qua `EJS_cheats = [[tên, mã]]`, đồng bộ lúc chơi qua
  `EJS_emulator.cheatChanged(bật, mã, chỉ_số)`.
- GitHub Pages không cấp header COOP/COEP nên `SharedArrayBuffer` không chạy;
  nhân `pcsx_rearmed` không cần threads nên không ảnh hưởng.

## ⚖️ Bản quyền

Repo này **không chứa game, BIOS hay file ROM nào**. Người chơi cần tự dump đĩa
game và BIOS từ máy PS1 của mình và chỉ dùng cho game mình sở hữu hợp pháp.
