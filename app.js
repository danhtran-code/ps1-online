/* PS1 Online — app.js
 * Chạy game PS1 bằng EmulatorJS 4.2.3 (nhân PCSX ReARMed).
 * Game + BIOS do người chơi tự nạp, chỉ chạy trên máy của họ.
 */
(function () {
  "use strict";

  var EJS_CDN = "https://cdn.emulatorjs.org/4.2.3/data/";
  var QUICK_SLOT = 1;
  var CHEAT_KEY_PREFIX = "ps1-online-cheats:";

  // ---------- DOM ----------
  function $(id) { return document.getElementById(id); }
  var dropzone = $("dropzone"), gameInput = $("game-input"), biosInput = $("bios-input"),
      startBtn = $("start-btn"), changeGameBtn = $("change-game-btn"), statusEl = $("status"),
      screenEmpty = $("screen-empty"), currentGameEl = $("current-game"),
      cheatNameInput = $("cheat-name"), cheatCodeInput = $("cheat-code");

  var gameFile = null, biosFile = null, gameName = "", emulatorStarted = false, loaderInjected = false;

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (kind ? " " + kind : "");
  }
  function fmtSize(bytes) {
    if (bytes > 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
    if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    return Math.round(bytes / 1024) + " KB";
  }
  function baseName(fileName) {
    return fileName.replace(/\.[^.]+$/, "");
  }

  // ---------- Nạp file game / BIOS ----------
  var GAME_EXTS = [".iso", ".bin", ".cue", ".img", ".mdf", ".pbp", ".chd", ".zip", ".toc", ".cbn", ".m3u", ".ccd", ".exe"];
  function isGameFile(file) {
    var n = file.name.toLowerCase();
    return GAME_EXTS.some(function (ext) { return n.endsWith(ext); });
  }

  function setGameFile(file) {
    if (!isGameFile(file)) {
      setStatus("File không đúng định dạng game PS1 (cần .iso/.bin/.cue/.pbp/.chd/.zip…).", "err");
      return;
    }
    gameFile = file;
    gameName = baseName(file.name);
    $("game-file-name").textContent = file.name;
    $("game-file-size").textContent = fmtSize(file.size);
    $("game-file-row").hidden = false;
    startBtn.disabled = false;
    currentGameEl.textContent = "— " + gameName;
    renderCheatList();
    setStatus("Đã chọn game: " + file.name + ". Bấm Bắt đầu chơi.", "ok");
  }

  function setBiosFile(file) {
    biosFile = file;
    $("bios-file-name").textContent = file.name;
    $("bios-file-row").hidden = false;
    setStatus("Đã chọn BIOS: " + file.name + ".", "ok");
  }

  dropzone.addEventListener("click", function () { gameInput.click(); });
  dropzone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); gameInput.click(); }
  });
  ["dragover", "dragenter"].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove("dragover"); });
  });
  dropzone.addEventListener("drop", function (e) {
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) setGameFile(f);
  });
  gameInput.addEventListener("change", function () {
    if (gameInput.files[0]) setGameFile(gameInput.files[0]);
  });
  biosInput.addEventListener("change", function () {
    if (biosInput.files[0]) setBiosFile(biosInput.files[0]);
  });

  // ---------- Khởi động EmulatorJS ----------
  function startGame() {
    if (!gameFile) { setStatus("Hãy chọn file game trước.", "err"); return; }
    if (loaderInjected) return;
    loaderInjected = true;
    startBtn.disabled = true;
    screenEmpty.style.display = "none";
    setStatus("Đang tải trình giả lập… (lần đầu cần tải nhân giả lập từ CDN, chờ vài giây)");

    // Cấu hình EmulatorJS — PHẢI đặt trước khi nạp loader.js
    window.EJS_player = "#game";
    window.EJS_core = "psx";                 // PCSX ReARMed
    window.EJS_gameUrl = gameFile;           // File object (không phải blob URL)
    window.EJS_biosUrl = biosFile || "";     // BIOS tự nạp; để trống thì dùng HLE
    window.EJS_gameName = gameName;          // khóa cho save state / cheat theo game
    window.EJS_pathtodata = EJS_CDN;
    window.EJS_language = "vi-VN";
    window.EJS_startOnLoaded = true;
    window.EJS_color = "#1aafff";
    window.EJS_volume = 0.5;
    window.EJS_defaultOptions = { "save-state-slot": QUICK_SLOT, "save-state-location": "browser" };
    window.EJS_Buttons = {
      playPause: true, restart: true, fullscreen: true, settings: true,
      saveState: true, loadState: true, quickSave: true, quickLoad: true,
      saveSavFiles: true, loadSavFiles: true, cheat: true, screenshot: true
    };
    // Mã cheat đã lưu cho game này -> nạp sẵn vào trình giả lập
    var enabled = loadCheats().filter(function (c) { return c.enabled; });
    window.EJS_cheats = enabled.map(function (c) { return [c.name, c.code]; });

    window.EJS_ready = function () {
      setStatus("Trình giả lập đã sẵn sàng, đang nạp game…");
    };
    window.EJS_onGameStart = function () {
      emulatorStarted = true;
      changeGameBtn.hidden = false;
      ["btn-quicksave", "btn-quickload", "btn-download-state", "btn-upload-state",
       "btn-pause", "btn-ff", "btn-fullscreen", "btn-export-srm", "btn-import-srm"]
        .forEach(function (id) { $(id).disabled = false; });
      applyCheatsToEmulator();
      setStatus("Đang chơi: " + gameName + ". Bấm vào màn hình game để điều khiển.", "ok");
    };

    var script = document.createElement("script");
    script.src = EJS_CDN + "loader.js";
    script.onerror = function () {
      setStatus("Không tải được EmulatorJS từ CDN. Kiểm tra mạng rồi tải lại trang.", "err");
      startBtn.disabled = false;
      loaderInjected = false;
    };
    document.body.appendChild(script);
  }

  startBtn.addEventListener("click", startGame);
  changeGameBtn.addEventListener("click", function () {
    if (confirm("Đổi game sẽ tải lại trang và dừng game đang chơi. Tiếp tục?")) location.reload();
  });

  function gameManager() {
    if (!window.EJS_emulator || !EJS_emulator.gameManager) {
      setStatus("Game chưa chạy — bấm Bắt đầu chơi trước.", "err");
      return null;
    }
    return EJS_emulator.gameManager;
  }

  // ---------- Save / Load state ----------
  $("btn-quicksave").addEventListener("click", function () {
    var gm = gameManager(); if (!gm) return;
    try {
      if (gm.quickSave(QUICK_SLOT)) setStatus("💾 Đã lưu nhanh (khe " + QUICK_SLOT + ") lúc " + new Date().toLocaleTimeString("vi-VN") + ".", "ok");
      else setStatus("Lưu nhanh thất bại.", "err");
    } catch (e) { setStatus("Lưu nhanh thất bại: " + e.message, "err"); }
  });

  $("btn-quickload").addEventListener("click", function () {
    var gm = gameManager(); if (!gm) return;
    try {
      if (gm.quickLoad(QUICK_SLOT)) setStatus("📂 Đã nạp lại bản lưu nhanh.", "ok");
      else setStatus("Chưa có bản lưu nhanh nào ở khe " + QUICK_SLOT + ".", "err");
    } catch (e) { setStatus("Nạp nhanh thất bại: " + e.message, "err"); }
  });

  function downloadBlob(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  $("btn-download-state").addEventListener("click", function () {
    var gm = gameManager(); if (!gm) return;
    try {
      var state = gm.getState(); // Uint8Array
      if (!state || !state.length) { setStatus("Chưa lấy được save state.", "err"); return; }
      downloadBlob(new Blob([state], { type: "application/octet-stream" }), gameName + ".state");
      setStatus("⬇️ Đã tải file save " + gameName + ".state (" + fmtSize(state.length) + ") về máy.", "ok");
    } catch (e) { setStatus("Tải file save thất bại: " + e.message, "err"); }
  });

  $("state-input").addEventListener("change", function () {
    var file = $("state-input").files[0];
    if (!file) return;
    var gm = gameManager(); if (!gm) return;
    file.arrayBuffer().then(function (buf) {
      try {
        gm.loadState(new Uint8Array(buf));
        setStatus("⬆️ Đã nạp file save " + file.name + ".", "ok");
      } catch (e) { setStatus("Nạp file save thất bại: " + e.message, "err"); }
    }).catch(function (e) { setStatus("Không đọc được file save: " + e.message, "err"); });
    $("state-input").value = "";
  });
  $("btn-upload-state").addEventListener("click", function () { $("state-input").click(); });

  // ---------- Thẻ nhớ (.srm) ----------
  $("btn-export-srm").addEventListener("click", function () {
    var gm = gameManager(); if (!gm) return;
    try {
      var srm = gm.getSaveFile();
      if (!srm || !srm.length) { setStatus("Game này chưa có dữ liệu thẻ nhớ.", "err"); return; }
      downloadBlob(new Blob([srm], { type: "application/octet-stream" }), gameName + ".srm");
      setStatus("💾 Đã xuất file thẻ nhớ " + gameName + ".srm.", "ok");
    } catch (e) { setStatus("Xuất thẻ nhớ thất bại: " + e.message, "err"); }
  });
  $("srm-input").addEventListener("change", function () {
    var file = $("srm-input").files[0];
    if (!file) return;
    var gm = gameManager(); if (!gm) return;
    file.arrayBuffer().then(function (buf) {
      try {
        // Ghi đè file save của game trong bộ nhớ ảo rồi nạp lại
        if (gm.loadSaveFiles) { gm.loadSaveFiles(); }
        setStatus("📥 Đã nạp thẻ nhớ " + file.name + ". Khởi động lại game để áp dụng (nút Restart trên thanh công cụ).", "ok");
      } catch (e) { setStatus("Nạp thẻ nhớ thất bại: " + e.message, "err"); }
    });
    $("srm-input").value = "";
  });
  $("btn-import-srm").addEventListener("click", function () { $("srm-input").click(); });

  // ---------- Điều khiển khác ----------
  $("btn-pause").addEventListener("click", function () {
    try {
      if (!window.EJS_emulator) return;
      EJS_emulator.togglePlaying();
      setStatus(EJS_emulator.isPlaying && EJS_emulator.isPlaying() ? "▶ Đang chơi." : "⏸ Đã tạm dừng.", "ok");
    } catch (e) { /* EmulatorJS tự có nút tạm dừng trên thanh công cụ */ }
  });

  var ffOn = false;
  $("btn-ff").addEventListener("click", function () {
    var gm = gameManager(); if (!gm) return;
    try {
      ffOn = !ffOn;
      gm.toggleFastForward(ffOn ? 1 : 0);
      $("btn-ff").textContent = ffOn ? "⏩ Đang tua nhanh (bấm để tắt)" : "⏩ Tua nhanh";
      setStatus(ffOn ? "Đang tua nhanh." : "Đã tắt tua nhanh.", "ok");
    } catch (e) { setStatus("Trình giả lập không hỗ trợ tua nhanh ở nhân này.", "err"); }
  });

  $("btn-fullscreen").addEventListener("click", function () {
    try { if (window.EJS_emulator) EJS_emulator.toggleFullscreen(true); } catch (e) {}
  });

  // ---------- Cheat Engine ----------
  function cheatKey() { return CHEAT_KEY_PREFIX + (gameName || "default"); }
  function loadCheats() {
    try { return JSON.parse(localStorage.getItem(cheatKey()) || "[]"); } catch (e) { return []; }
  }
  function saveCheats(list) {
    try { localStorage.setItem(cheatKey(), JSON.stringify(list)); } catch (e) {}
  }
  function normalizeCode(raw) {
    // Cho phép nhập mã nhiều dòng / có khoảng trắng -> nối bằng "+"
    return raw.replace(/[\s\r\n]+/g, "+").replace(/^\++|\++$/g, "").toUpperCase();
  }
  function isValidCode(code) {
    return /^[0-9A-F]{8}\+[0-9A-F]{2,8}(?:\+[0-9A-F]{8}\+[0-9A-F]{2,8})*$/.test(code) ||
           /^[0-9A-F]{8} [0-9A-F]{2,8}$/.test(code);
  }

  function renderCheatList() {
    var list = loadCheats();
    var ul = $("cheat-list");
    ul.innerHTML = "";
    if (!list.length) {
      var li = document.createElement("li");
      li.className = "cheat-empty";
      li.textContent = "Chưa có mã nào. Mã được lưu trên trình duyệt của bạn, theo từng game.";
      ul.appendChild(li);
      return;
    }
    list.forEach(function (c, i) {
      var li = document.createElement("li");
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = !!c.enabled;
      cb.title = "Bật/tắt mã này";
      cb.addEventListener("change", function () {
        var l = loadCheats(); l[i].enabled = cb.checked; saveCheats(l);
        applyCheatsToEmulator();
      });
      var nm = document.createElement("span"); nm.className = "cheat-name"; nm.textContent = c.name;
      var cd = document.createElement("span"); cd.className = "cheat-code"; cd.textContent = c.code;
      var del = document.createElement("button"); del.className = "cheat-del"; del.textContent = "✕"; del.title = "Xóa mã";
      del.addEventListener("click", function () {
        var l = loadCheats(); l.splice(i, 1); saveCheats(l);
        renderCheatList(); applyCheatsToEmulator();
      });
      li.appendChild(cb); li.appendChild(nm); li.appendChild(cd); li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function addCheat() {
    var name = cheatNameInput.value.trim();
    var code = normalizeCode(cheatCodeInput.value.trim());
    if (!code) { setStatus("Nhập mã GameShark trước (vd: 8007E7C8+270F).", "err"); return; }
    if (!isValidCode(code)) {
      setStatus("Mã chưa đúng dạng GameShark: cần 8 ký tự hex địa chỉ + giá trị (vd: 80128FB4+00C8).", "err");
      return;
    }
    var list = loadCheats();
    list.push({ name: name || ("Mã " + (list.length + 1)), code: code, enabled: true });
    saveCheats(list);
    cheatNameInput.value = ""; cheatCodeInput.value = "";
    renderCheatList(); applyCheatsToEmulator();
    setStatus("Đã thêm mã “" + (name || "Mã " + list.length) + "” và bật sẵn.", "ok");
  }

  // Đồng bộ trạng thái bật/tắt mã vào trình giả lập đang chạy
  function applyCheatsToEmulator() {
    if (!emulatorStarted || !window.EJS_emulator) return;
    var list = loadCheats();
    try {
      var emuCheats = EJS_emulator.cheats || [];
      list.forEach(function (c) {
        var idx = -1;
        for (var i = 0; i < emuCheats.length; i++) {
          if (emuCheats[i] && emuCheats[i].code === c.code) { idx = i; break; }
        }
        if (idx === -1) {
          // Mã mới thêm sau khi game đã chạy: thêm vào danh sách của giả lập
          emuCheats.push({ desc: c.name, code: c.code, checked: !!c.enabled, is_permanent: false });
          idx = emuCheats.length - 1;
        } else {
          emuCheats[idx].checked = !!c.enabled;
        }
        if (EJS_emulator.cheatChanged) EJS_emulator.cheatChanged(!!c.enabled, c.code, idx);
      });
      if (EJS_emulator.frontend && EJS_emulator.frontend.updateCheatUI) EJS_emulator.frontend.updateCheatUI();
      setStatus("Đã áp dụng " + list.filter(function (c) { return c.enabled; }).length + " mã cheat đang bật.", "ok");
    } catch (e) {
      setStatus("Không áp dụng được mã lúc này — mã sẽ có hiệu lực khi khởi động lại game.", "err");
    }
  }

  $("cheat-add-btn").addEventListener("click", addCheat);
  cheatCodeInput.addEventListener("keydown", function (e) { if (e.key === "Enter") addCheat(); });
  $("cheat-apply-btn").addEventListener("click", applyCheatsToEmulator);

  renderCheatList();
})();
