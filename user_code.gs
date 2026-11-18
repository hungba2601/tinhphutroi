/**
 * =========================================================================
 * BACKEND GOOGLE APPS SCRIPT CHO CÁC TRƯỜNG THÀNH VIÊN (user_code.gs)
 * Tác giả: Nguyễn Phi Hùng | Zalo: 0938750424
 * =========================================================================
 * 
 * HƯỚNG DẪN CÀI ĐẶT & TRIỂN KHAI:
 * 1. Mở Google Sheet của bạn.
 * 2. Đổi tên Sheet1 thành "DATA" và thêm một Sheet mới tên là "DULIEU".
 *    Hoặc chạy hàm initialSetup() trong trình soạn thảo Apps Script để tự tạo cấu trúc tự động.
 * 3. Vào menu: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 4. Xóa hết code cũ và dán toàn bộ nội dung file này vào. Nhấn Ctrl + S để lưu.
 * 5. Để đồng bộ toàn bộ giáo viên từ Sheet DATA sang Sheet DULIEU theo đúng thứ tự cố định:
 *    - Chọn hàm 'dongBoSheetDuLieu' từ danh sách hàm và nhấn nút 'Chạy' (Run).
 * 6. Nhấn nút "Triển khai" (Deploy) -> "Quản lý bản triển khai" -> Sửa hoặc "Triển khai mới":
 *    - Loại: "Ứng dụng web" (Web App).
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me / tài khoản của bạn).
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 * 7. Nhấn "Triển khai" (Deploy) -> Cấp quyền nếu Google hỏi -> Sao chép URL Web App.
 * =========================================================================
 */

/**
 * KIỂM TRA TRẠNG THÁI KHÓA KÊ KHAI TOÀN TRƯỜNG
 */
function isSystemLocked() {
  try {
    const val = PropertiesService.getScriptProperties().getProperty("IS_SYSTEM_LOCKED");
    return val === "true";
  } catch (e) {
    return false;
  }
}

/**
 * THIẾT LẬP TRẠNG THÁI KHÓA KÊ KHAI TOÀN TRƯỜNG
 */
function setSystemLocked(isLocked) {
  try {
    PropertiesService.getScriptProperties().setProperty("IS_SYSTEM_LOCKED", isLocked ? "true" : "false");
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * LẤY CẤU HÌNH HIỂN THỊ CỘT KÊ KHAI (CỘT 3: BD HSG & CỘT 4: DẠY TS10)
 */
function getColumnConfig() {
  try {
    const props = PropertiesService.getScriptProperties();
    const showBdHsg = props.getProperty("CONFIG_SHOW_BD_HSG");
    const showDayTs10 = props.getProperty("CONFIG_SHOW_DAY_TS10");
    return {
      showBdHsg: showBdHsg === null || showBdHsg === undefined ? true : showBdHsg === "true",
      showDayTs10: showDayTs10 === null || showDayTs10 === undefined ? true : showDayTs10 === "true"
    };
  } catch (e) {
    return { showBdHsg: true, showDayTs10: true };
  }
}

/**
 * THIẾT LẬP CẤU HÌNH HIỂN THỊ CỘT KÊ KHAI
 */
function setColumnConfig(showBdHsg, showDayTs10) {
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty("CONFIG_SHOW_BD_HSG", showBdHsg ? "true" : "false");
    props.setProperty("CONFIG_SHOW_DAY_TS10", showDayTs10 ? "true" : "false");
    return true;
  } catch (e) {
    return false;
  }
}

// Tên các trang tính theo quy định
const SHEET_DATA = "DATA";       // Cột A: Tài khoản | Cột B: Tên GV | Cột C: Ngày sinh | Cột D: Quyền | Cột E: Mật khẩu
const SHEET_DULIEU = "DULIEU";   // Cột A: TK        | Cột B: TÊN GV | Cột C: DỮ LIỆU GV NHẬP DANG JSON
const SHEET_HOA_NHAP = "HOA NHAP";             // Cột A: TÊN HỌC SINH | Cột B: NGÀY SINH | Cột C: LỚP | Cột D: LOẠI HÒA NHẬP
const SHEET_DULIEU_HOA_NHAP = "dulieu_hoanhap"; // Cột A: TK GV | Cột B: TÊN GV | Cột C: DỮ LIỆU KHAI BÁO TIẾT HÒA NHẬP DẠNG JSON

/**
 * Xử lý yêu cầu HTTP GET
 */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || "ping";

    if (action === "ping") {
      let sheetName = "";
      let sheetsCount = 0;
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        sheetName = ss.getName();
        sheetsCount = ss.getSheets().length;
      } catch (e) {}
      return jsonResponse({
        success: true,
        message: "Google Apps Script Backend đang kết nối và hoạt động tốt! (Tác giả: Nguyễn Phi Hùng - Zalo: 0938750424)",
        sheetName: sheetName,
        sheetsCount: sheetsCount,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "initialSetup") {
      const setupRes = initialSetup();
      return jsonResponse(setupRes);
    }

    if (action === "login") {
      return handleLogin(params.tai_khoan || params.taiKhoan, params.mat_khau || params.matKhau);
    }

    if (action === "getData") {
      return handleGetData(params.tai_khoan || params.taiKhoan);
    }

    if (action === "getColumnConfig") {
      return jsonResponse({ success: true, columnConfig: getColumnConfig() });
    }

    if (action === "getLockStatus") {
      return jsonResponse({ success: true, isLocked: isSystemLocked() });
    }

    if (action === "syncDuLieu" || action === "syncData") {
      return jsonResponse(syncDuLieuWithData(true));
    }

    if (action === "syncHoaNhap" || action === "syncDuLieuHoaNhap") {
      return jsonResponse(syncDuLieuHoaNhapWithData(true));
    }

    if (action === "getHoaNhapStudents") {
      return handleGetHoaNhapStudents();
    }

    if (action === "getHoaNhapData") {
      return handleGetHoaNhapData(params.taiKhoan || params.tai_khoan);
    }

    return jsonResponse({ success: false, message: "Hành động không hợp lệ: " + action });
  } catch (err) {
    return jsonResponse({ success: false, message: "Lỗi hệ thống: " + err.toString() });
  }
}

/**
 * Xử lý yêu cầu HTTP POST (Xác thực, Lưu dữ liệu, Đổi mật khẩu)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;

    switch (action) {
      case "ping": {
        let sheetName = "";
        let sheetsCount = 0;
        try {
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          sheetName = ss.getName();
          sheetsCount = ss.getSheets().length;
        } catch (e) {}
        return jsonResponse({
          success: true,
          message: "Google Apps Script Backend đang kết nối và hoạt động tốt!",
          sheetName: sheetName,
          sheetsCount: sheetsCount,
          timestamp: new Date().toISOString()
        });
      }

      case "initialSetup": {
        const setupRes = initialSetup();
        return jsonResponse(setupRes);
      }

      case "login":
        return handleLogin(payload.taiKhoan || payload.tai_khoan, payload.matKhau || payload.mat_khau);

      case "saveData":
        return handleSaveData(payload.taiKhoan || payload.tai_khoan, payload.tenGv || payload.ten_gv, payload.dataJson, payload.isAdmin);

      case "resetDeclaration":
      case "clearDeclaration":
        return handleResetDeclaration(payload);

      case "getData":
        return handleGetData(payload.taiKhoan || payload.tai_khoan);

      case "setLock":
      case "toggleLock":
      case "setLockStatus": {
        const lockVal = payload.isLocked === true || payload.isLocked === "true";
        setSystemLocked(lockVal);
        return jsonResponse({
          success: true,
          isLocked: lockVal,
          message: lockVal ? "Đã khóa sổ kê khai toàn trường thành công!" : "Đã mở khóa kê khai cho toàn bộ giáo viên thành công!"
        });
      }

      case "getLockStatus":
        return jsonResponse({ success: true, isLocked: isSystemLocked() });

      case "getColumnConfig":
        return jsonResponse({ success: true, columnConfig: getColumnConfig() });

      case "saveColumnConfig":
      case "setColumnConfig": {
        const showBdHsg = payload.showBdHsg !== false && payload.showBdHsg !== "false";
        const showDayTs10 = payload.showDayTs10 !== false && payload.showDayTs10 !== "false";
        setColumnConfig(showBdHsg, showDayTs10);
        return jsonResponse({
          success: true,
          columnConfig: { showBdHsg: showBdHsg, showDayTs10: showDayTs10 },
          message: "Đã lưu cấu hình hiển thị cột kê khai thành công!"
        });
      }

      case "changePassword":
        return handleChangePassword(payload.taiKhoan || payload.tai_khoan, payload.oldPassword, payload.newPassword);

      case "adminResetPassword":
      case "adminChangePassword": {
        const callerRole = String(payload.callerRole || "").trim().toLowerCase();
        if (callerRole === "bgh") {
          return jsonResponse({ success: false, message: "Tài khoản Ban Giám Hiệu (BGH) không có quyền đổi mật khẩu giáo viên!" });
        }
        return handleAdminResetPassword(payload);
      }

      case "getAdminSummary":
      case "getAdminData":
        return handleGetAdminSummary(payload.taiKhoan || payload.tai_khoan);

      case "createAccount":
      case "addAccount": {
        const callerRole = String(payload.callerRole || "").trim().toLowerCase();
        if (callerRole === "bgh") {
          return jsonResponse({ success: false, message: "Tài khoản Ban Giám Hiệu (BGH) không có quyền thêm mới tài khoản!" });
        }
        return handleCreateAccount(payload);
      }

      case "updateAccount":
      case "editAccount": {
        const callerRole = String(payload.callerRole || "").trim().toLowerCase();
        if (callerRole === "bgh") {
          return jsonResponse({ success: false, message: "Tài khoản Ban Giám Hiệu (BGH) không có quyền chỉnh sửa thông tin tài khoản giáo viên!" });
        }
        return handleUpdateAccount(payload);
      }

      case "deleteAccount": {
        const callerRole = String(payload.callerRole || "").trim().toLowerCase();
        if (callerRole === "bgh") {
          return jsonResponse({ success: false, message: "Tài khoản Ban Giám Hiệu (BGH) không có quyền xóa tài khoản giáo viên!" });
        }
        return handleDeleteAccount(payload.taiKhoan || payload.tai_khoan);
      }

      case "syncDuLieu":
      case "syncData":
        return jsonResponse(syncDuLieuWithData(true));

      case "syncHoaNhap":
      case "syncDuLieuHoaNhap":
        return jsonResponse(syncDuLieuHoaNhapWithData(true));

      case "getHoaNhapStudents":
        return handleGetHoaNhapStudents();

      case "getHoaNhapData":
        return handleGetHoaNhapData(payload.taiKhoan || payload.tai_khoan);

      case "saveHoaNhapData":
        return handleSaveHoaNhapData(payload.taiKhoan || payload.tai_khoan, payload.dataJson);

      default:
        return jsonResponse({ success: false, message: "Hành động không xác định: " + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: "Lỗi xử lý POST: " + err.toString() });
  }
}

/**
 * ĐỊNH DẠNG NGÀY SINH (Tránh lỗi đối tượng Date của Google Sheets chuyển thành ISO string)
 */
function formatBirthDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const d = ("0" + val.getDate()).slice(-2);
    const m = ("0" + (val.getMonth() + 1)).slice(-2);
    const y = val.getFullYear();
    return d + "/" + m + "/" + y;
  }
  return String(val).trim();
}

/**
 * CHUẨN HÓA SỐ ĐIỆN THOẠI / TÀI KHOẢN:
 * Nếu là dãy 9 chữ số (thiếu số 0 ở đầu do Google Sheets lưu dạng số), tự động thêm số 0 vào đầu
 */
function normalizeUsername(tk) {
  if (tk === undefined || tk === null) return "";
  let s = String(tk).trim();
  if (/^\d{9}$/.test(s)) {
    return "0" + s;
  }
  return s;
}

/**
 * KIỂM TRA SO SÁNH KHỚP TÀI KHOẢN:
 * So khớp chính xác hoặc chuẩn hóa (bất kể người dùng gõ có số 0 hay không có số 0 ở đầu)
 */
function isSuperAdmin(role) {
  if (!role) return false;
  const r = String(role).trim().toLowerCase();
  return r === "admin" || r === "quantri" || r === "quản trị" || r === "superadmin";
}

function isRoleBgh(role) {
  if (!role) return false;
  const r = String(role).trim().toLowerCase();
  return r === "bgh" || r === "ban giám hiệu" || r === "bangiamhieu";
}

function isRoleAdmin(role) {
  return isSuperAdmin(role) || isRoleBgh(role);
}

function isUsernameMatch(tk1, tk2) {
  if (!tk1 || !tk2) return false;
  const s1 = String(tk1).trim().toLowerCase();
  const s2 = String(tk2).trim().toLowerCase();
  if (s1 === s2) return true;
  if (normalizeUsername(s1) === normalizeUsername(s2)) return true;
  return s1.replace(/^0+/, "") === s2.replace(/^0+/, "");
}

/**
 * XÁC ĐỊNH CHỈ MỤC CÁC CỘT TRONG SHEET DATA (0-based)
 * Tự động ánh xạ theo tiêu đề; nếu chưa có cột Ngày sinh sẽ tự động chèn cạnh cột Tên
 */
function getSheetDataCols(sheetData) {
  const lastCol = Math.max(5, sheetData.getLastColumn());
  const header = sheetData.getRange(1, 1, 1, lastCol).getValues()[0];
  let colTk = 0;
  let colTenGv = 1;
  let colNgaySinh = -1;
  let colQuyen = 2;
  let colMatKhau = 3;

  for (let c = 0; c < header.length; c++) {
    const h = String(header[c] || "").trim().toLowerCase();
    if (h.includes("tài khoản") || h === "tk") colTk = c;
    else if (h.includes("tên") || h.includes("họ và tên")) colTenGv = c;
    else if (h.includes("ngày sinh") || h.includes("ngaysinh") || h.includes("sinh") || h.includes("dob")) colNgaySinh = c;
    else if (h.includes("quyền") || h.includes("quyen") || h.includes("role")) colQuyen = c;
    else if (h.includes("mật khẩu") || h.includes("matkhau") || h.includes("mk") || h.includes("pass")) colMatKhau = c;
  }

  // Nếu trong Sheet DATA chưa có cột Ngày sinh -> tự động chèn ngay sau cột Tên
  if (colNgaySinh === -1) {
    try {
      const insertIdx = colTenGv + 2; // 1-based index
      sheetData.insertColumnAfter(colTenGv + 1);
      sheetData.getRange(1, insertIdx).setValue("Ngày sinh")
        .setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff");
      colNgaySinh = colTenGv + 1;
      if (colQuyen >= colNgaySinh) colQuyen++;
      if (colMatKhau >= colNgaySinh) colMatKhau++;
    } catch (e) {
      if (header.length >= 5) {
        colNgaySinh = 2;
        colQuyen = 3;
        colMatKhau = 4;
      }
    }
  }

  return { colTk, colTenGv, colNgaySinh, colQuyen, colMatKhau };
}

/**
 * ĐỒNG BỘ TOÀN BỘ GIÁO VIÊN TỪ SHEET DATA SANG SHEET DULIEU THEO THỨ TỰ CỐ ĐỊNH:
 * - Giữ nguyên 100% thứ tự các giáo viên từ Sheet DATA (hàng 2 -> N).
 * - Cột A: TK (luôn định dạng Văn bản Text '@' để giữ số 0 ở đầu)
 * - Cột B: TÊN GV
 * - Cột C: DỮ LIỆU GV NHẬP DANG JSON (giữ nguyên dữ liệu đã khai báo trước đó của giáo viên nếu có, hoặc để trống "")
 * - Không bao giờ làm mất dữ liệu khai báo của bất kỳ ai!
 */
/**
 * TÌM SHEET THEO TÊN LINH HOẠT (Không phân biệt hoa thường, có hoặc không có dấu)
 */
function getSheetFlexible(ss, targetName, aliases) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(targetName);
  if (sheet) return sheet;
  if (aliases && Array.isArray(aliases)) {
    for (let i = 0; i < aliases.length; i++) {
      sheet = ss.getSheetByName(aliases[i]);
      if (sheet) return sheet;
    }
  }
  const allSheets = ss.getSheets();
  const cleanTarget = targetName.toLowerCase().replace(/\s+/g, '');
  for (let j = 0; j < allSheets.length; j++) {
    const sName = allSheets[j].getName().toLowerCase().replace(/\s+/g, '');
    if (sName === cleanTarget) return allSheets[j];
  }
  return null;
}

/**
 * KHỞI TẠO SHEET "HOA NHAP" (PHÂN HỆ 2)
 * Cột A: TÊN HỌC SINH | Cột B: NGÀY SINH | Cột C: LỚP | Cột D: LOẠI HÒA NHẬP
 */
function initHoaNhapSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetHN = getSheetFlexible(ss, SHEET_HOA_NHAP, ["HOA NHẬP", "HOANHAP", "Hoa Nhap", "Hòa Nhập"]);
  if (!sheetHN) {
    sheetHN = ss.insertSheet(SHEET_HOA_NHAP);
    sheetHN.appendRow(["TÊN HỌC SINH", "NGÀY SINH", "LỚP", "LOẠI HÒA NHẬP"]);
    const headerRange = sheetHN.getRange(1, 1, 1, 4);
    headerRange.setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
    sheetHN.setColumnWidth(1, 220);
    sheetHN.setColumnWidth(2, 130);
    sheetHN.setColumnWidth(3, 100);
    sheetHN.setColumnWidth(4, 250);
    sheetHN.getRange("B:B").setNumberFormat("@");

    // Thêm học sinh mẫu ban đầu
    sheetHN.appendRow(["Nguyễn Văn An", "15/04/2012", "6A1", "Khuyết tật phát triển trí tuệ"]);
    sheetHN.appendRow(["Trần Thị Bình", "20/09/2011", "7A2", "Khuyết tật học tập"]);
    sheetHN.appendRow(["Lê Hoàng Cường", "05/11/2010", "8A3", "Khuyết tật vận động nhẹ"]);
    sheetHN.getRange(2, 2, 3, 1).setNumberFormat("@");
  }
  return sheetHN;
}

/**
 * ĐỒNG BỘ SHEET "dulieu_hoanhap" THEO ĐÚNG THỨ TỰ TÀI KHOẢN TRÊN SHEET DATA:
 * - Cột A: TK GV (Toàn bộ tài khoản GV từ Sheet DATA theo đúng thứ tự)
 * - Cột B: TÊN GV (Họ và tên giáo viên tương ứng từ Sheet DATA)
 * - Cột C: DỮ LIỆU KHAI BÁO TIẾT HÒA NHẬP DẠNG JSON
 * - Bảo toàn 100% dữ liệu JSON đã kê khai trước đó của từng giáo viên
 */
function syncDuLieuHoaNhapWithData(forceRebuild) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return { success: false, message: "Không tìm thấy sheet DATA trong bảng tính!" };
  }

  // Tự động đảm bảo sheet HOA NHAP cũng đã tồn tại
  initHoaNhapSheet(ss);

  let sheetDuLieuHN = getSheetFlexible(ss, SHEET_DULIEU_HOA_NHAP, ["dulieu_hoanhap", "DULIEU_HOANHAP", "DULIEU_HOA_NHAP"]);
  if (!sheetDuLieuHN) {
    sheetDuLieuHN = ss.insertSheet(SHEET_DULIEU_HOA_NHAP);
  }

  const cols = getSheetDataCols(sheetData);
  const dataValuesRaw = sheetData.getDataRange().getValues();
  const dataValuesDisplay = sheetData.getDataRange().getDisplayValues();

  // 1. Đọc dữ liệu JSON hiện có trong Sheet dulieu_hoanhap (nếu có)
  const existingJsonMap = {};
  const duLieuLastRow = sheetDuLieuHN.getLastRow();
  const duLieuLastCol = Math.max(2, sheetDuLieuHN.getLastColumn());
  if (duLieuLastRow > 1) {
    const duLieuValues = sheetDuLieuHN.getRange(1, 1, duLieuLastRow, duLieuLastCol).getValues();
    const duLieuDisplay = sheetDuLieuHN.getRange(1, 1, duLieuLastRow, duLieuLastCol).getDisplayValues();
    for (let j = 1; j < duLieuValues.length; j++) {
      const rawTk = String(duLieuValues[j][0] || "").trim();
      const dispTk = String(duLieuDisplay[j][0] || "").trim();
      const normTk = normalizeUsername(dispTk || rawTk);
      // Tự động nhận diện nếu sheet trước đó có 2 cột (JSON ở col 2) hoặc đã có 3 cột (JSON ở col 3)
      const jsonContent = duLieuLastCol >= 3 ? (duLieuValues[j][2] !== undefined && duLieuValues[j][2] !== "" ? duLieuValues[j][2] : duLieuValues[j][1]) : duLieuValues[j][1];
      if (jsonContent) {
        if (normTk) existingJsonMap[normTk.toLowerCase()] = jsonContent;
        if (rawTk) existingJsonMap[rawTk.toLowerCase()] = jsonContent;
        const stripped = normTk.replace(/^0+/, "").toLowerCase();
        if (stripped) existingJsonMap[stripped] = jsonContent;
      }
    }
  }

  // 2. Thu thập danh sách giáo viên từ Sheet DATA theo đúng thứ tự hàng cố định
  const teacherRows = [];
  for (let i = 1; i < dataValuesRaw.length; i++) {
    const rowRaw = dataValuesRaw[i];
    const rowDisp = dataValuesDisplay[i];
    const rawTk = String(rowDisp[cols.colTk] || rowRaw[cols.colTk] || "").trim();
    if (!rawTk) continue;
    const normTk = normalizeUsername(rawTk);
    const tenGv = String(rowDisp[cols.colTenGv] || rowRaw[cols.colTenGv] || "").trim();

    // Lấy dữ liệu JSON hòa nhập đã kê khai trước đó (nếu có)
    const savedJson = existingJsonMap[normTk.toLowerCase()] || 
                      existingJsonMap[rawTk.toLowerCase()] || 
                      existingJsonMap[normTk.replace(/^0+/, "").toLowerCase()] || "";

    const cellTk = /^\d+$/.test(normTk) ? "'" + normTk : normTk;
    // Cột A: TK GV | Cột B: TÊN GV | Cột C: JSON
    teacherRows.push([cellTk, tenGv, savedJson]);
  }

  if (teacherRows.length === 0) {
    return { success: false, message: "Sheet DATA chưa có giáo viên nào!" };
  }

  // 3. Kiểm tra xem Sheet dulieu_hoanhap đã đúng thứ tự và đủ số lượng chưa
  if (!forceRebuild && duLieuLastRow === teacherRows.length + 1 && duLieuLastCol >= 3) {
    let perfectlyMatched = true;
    const currentDuLieuDisplay = sheetDuLieuHN.getRange(2, 1, teacherRows.length, 1).getDisplayValues();
    for (let k = 0; k < teacherRows.length; k++) {
      const curTk = String(currentDuLieuDisplay[k][0] || "").trim();
      const expectedTk = teacherRows[k][0].replace(/^'/, "");
      if (!isUsernameMatch(curTk, expectedTk)) {
        perfectlyMatched = false;
        break;
      }
    }
    if (perfectlyMatched) {
      return { success: true, count: teacherRows.length, message: "Sheet dulieu_hoanhap đã khớp 100% với Sheet DATA theo thứ tự cố định!" };
    }
  }

  // 4. Ghi đè lại Sheet dulieu_hoanhap theo đúng danh sách và thứ tự cố định của Sheet DATA
  sheetDuLieuHN.clear();
  sheetDuLieuHN.appendRow(["TK GV", "TÊN GV", "DỮ LIỆU KHAI BÁO TIẾT HÒA NHẬP DẠNG JSON"]);
  
  // Định dạng tiêu đề
  const headerRange = sheetDuLieuHN.getRange(1, 1, 1, 3);
  headerRange.setFontWeight("bold").setBackground("#6366f1").setFontColor("#ffffff");

  // Ghi toàn bộ danh sách giáo viên theo đúng thứ tự (3 cột)
  const dataRange = sheetDuLieuHN.getRange(2, 1, teacherRows.length, 3);
  dataRange.setValues(teacherRows);

  // Định dạng cột A là Văn bản (Plain Text) để luôn giữ số 0 ở đầu SĐT
  sheetDuLieuHN.getRange(2, 1, teacherRows.length, 1).setNumberFormat("@");
  sheetDuLieuHN.setColumnWidth(1, 150);
  sheetDuLieuHN.setColumnWidth(2, 220);
  sheetDuLieuHN.setColumnWidth(3, 400);

  return {
    success: true,
    count: teacherRows.length,
    message: "Đã đồng bộ thành công " + teacherRows.length + " giáo viên (TK & Tên GV) sang Sheet dulieu_hoanhap theo đúng thứ tự cố định!"
  };
}

/**
 * LẤY DANH SÁCH HỌC SINH HÒA NHẬP (Sheet HOA NHAP)
 */
function handleGetHoaNhapStudents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetHN = initHoaNhapSheet(ss);
  const lastRow = sheetHN.getLastRow();
  if (lastRow <= 1) {
    return jsonResponse({ success: true, list: [] });
  }
  const vals = sheetHN.getRange(2, 1, lastRow - 1, 4).getValues();
  const disp = sheetHN.getRange(2, 1, lastRow - 1, 4).getDisplayValues();
  const list = [];
  for (let i = 0; i < vals.length; i++) {
    const tenHs = String(disp[i][0] || vals[i][0] || "").trim();
    if (!tenHs) continue;
    list.push({
      tenHs: tenHs,
      ngaySinh: formatBirthDate(disp[i][1] || vals[i][1]),
      lop: String(disp[i][2] || vals[i][2] || "").trim(),
      loaiHoaNhap: String(disp[i][3] || vals[i][3] || "").trim()
    });
  }
  return jsonResponse({ success: true, list: list });
}

/**
 * LẤY DỮ LIỆU KÊ KHAI TIẾT HÒA NHẬP CỦA MỘT GIÁO VIÊN
 */
function handleGetHoaNhapData(taiKhoan) {
  if (!taiKhoan) return jsonResponse({ success: false, message: "Thiếu tài khoản!" });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetDuLieuHN = getSheetFlexible(ss, SHEET_DULIEU_HOA_NHAP, ["dulieu_hoanhap", "DULIEU_HOANHAP"]);
  if (!sheetDuLieuHN) return jsonResponse({ success: true, data: null });
  const lastRow = sheetDuLieuHN.getLastRow();
  if (lastRow <= 1) return jsonResponse({ success: true, data: null });
  const numCols = Math.max(2, sheetDuLieuHN.getLastColumn());
  const vals = sheetDuLieuHN.getRange(2, 1, lastRow - 1, numCols).getValues();
  const disp = sheetDuLieuHN.getRange(2, 1, lastRow - 1, numCols).getDisplayValues();
  for (let i = 0; i < vals.length; i++) {
    const tk = String(disp[i][0] || vals[i][0] || "").trim();
    if (isUsernameMatch(tk, taiKhoan)) {
      const jsonVal = numCols >= 3 ? (vals[i][2] || vals[i][1] || null) : (vals[i][1] || null);
      return jsonResponse({ success: true, data: jsonVal });
    }
  }
  return jsonResponse({ success: true, data: null });
}

/**
 * LƯU DỮ LIỆU KÊ KHAI TIẾT HÒA NHẬP CỦA GIÁO VIÊN VÀO ĐÚNG DÒNG CỐ ĐỊNH
 */
function handleSaveHoaNhapData(taiKhoan, dataJson) {
  if (!taiKhoan) return jsonResponse({ success: false, message: "Thiếu tài khoản!" });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetDuLieuHN = getSheetFlexible(ss, SHEET_DULIEU_HOA_NHAP, ["dulieu_hoanhap", "DULIEU_HOANHAP"]);
  if (!sheetDuLieuHN) {
    syncDuLieuHoaNhapWithData(true);
    sheetDuLieuHN = getSheetFlexible(ss, SHEET_DULIEU_HOA_NHAP, ["dulieu_hoanhap", "DULIEU_HOANHAP"]);
  }
  let targetRow = -1;
  const lastRow = sheetDuLieuHN.getLastRow();
  if (lastRow > 1) {
    const vals = sheetDuLieuHN.getRange(2, 1, lastRow - 1, 1).getValues();
    const disp = sheetDuLieuHN.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < vals.length; i++) {
      const tk = String(disp[i][0] || vals[i][0] || "").trim();
      if (isUsernameMatch(tk, taiKhoan)) {
        targetRow = i + 2;
        break;
      }
    }
  }
  if (targetRow === -1) {
    const cellTk = /^\d+$/.test(taiKhoan) ? "'" + taiKhoan : taiKhoan;
    sheetDuLieuHN.appendRow([cellTk, "", dataJson]);
    targetRow = sheetDuLieuHN.getLastRow();
    sheetDuLieuHN.getRange(targetRow, 1).setNumberFormat("@");
  } else {
    sheetDuLieuHN.getRange(targetRow, 3).setValue(dataJson);
  }
  return jsonResponse({ success: true, message: "Đã lưu dữ liệu dạy hòa nhập thành công!" });
}

function syncDuLieuWithData(forceRebuild) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return { success: false, message: "Không tìm thấy sheet DATA trong bảng tính!" };
  }

  let sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  if (!sheetDuLieu) {
    sheetDuLieu = ss.insertSheet(SHEET_DULIEU);
  }

  const cols = getSheetDataCols(sheetData);
  const dataValuesRaw = sheetData.getDataRange().getValues();
  const dataValuesDisplay = sheetData.getDataRange().getDisplayValues();

  // 1. Đọc dữ liệu JSON hiện có trong Sheet DULIEU (nếu có) vào bộ nhớ tạm
  const existingJsonMap = {};
  const duLieuLastRow = sheetDuLieu.getLastRow();
  if (duLieuLastRow > 1) {
    const duLieuValues = sheetDuLieu.getRange(1, 1, duLieuLastRow, 3).getValues();
    const duLieuDisplay = sheetDuLieu.getRange(1, 1, duLieuLastRow, 3).getDisplayValues();
    for (let j = 1; j < duLieuValues.length; j++) {
      const rawTk = String(duLieuValues[j][0] || "").trim();
      const dispTk = String(duLieuDisplay[j][0] || "").trim();
      const normTk = normalizeUsername(dispTk || rawTk);
      const jsonContent = duLieuValues[j][2];
      if (jsonContent) {
        if (normTk) existingJsonMap[normTk.toLowerCase()] = jsonContent;
        if (rawTk) existingJsonMap[rawTk.toLowerCase()] = jsonContent;
        const stripped = normTk.replace(/^0+/, "").toLowerCase();
        if (stripped) existingJsonMap[stripped] = jsonContent;
      }
    }
  }

  // 2. Thu thập danh sách giáo viên từ Sheet DATA theo đúng thứ tự hàng cố định
  const teacherRows = [];
  for (let i = 1; i < dataValuesRaw.length; i++) {
    const rowRaw = dataValuesRaw[i];
    const rowDisp = dataValuesDisplay[i];
    const rawTk = String(rowDisp[cols.colTk] || rowRaw[cols.colTk] || "").trim();
    if (!rawTk) continue;
    const normTk = normalizeUsername(rawTk);
    const tenGv = String(rowDisp[cols.colTenGv] || rowRaw[cols.colTenGv] || "").trim();

    // Lấy dữ liệu JSON đã kê khai trước đó (nếu có)
    const savedJson = existingJsonMap[normTk.toLowerCase()] || 
                      existingJsonMap[rawTk.toLowerCase()] || 
                      existingJsonMap[normTk.replace(/^0+/, "").toLowerCase()] || "";

    const cellTk = /^\d+$/.test(normTk) ? "'" + normTk : normTk;
    teacherRows.push([cellTk, tenGv, savedJson]);
  }

  if (teacherRows.length === 0) {
    return { success: false, message: "Sheet DATA chưa có giáo viên nào!" };
  }

  // 3. Kiểm tra xem Sheet DULIEU đã đúng thứ tự và đủ số lượng chưa
  if (!forceRebuild && duLieuLastRow === teacherRows.length + 1) {
    let perfectlyMatched = true;
    const currentDuLieuDisplay = sheetDuLieu.getRange(2, 1, teacherRows.length, 1).getDisplayValues();
    for (let k = 0; k < teacherRows.length; k++) {
      const curTk = String(currentDuLieuDisplay[k][0] || "").trim();
      const expectedTk = teacherRows[k][0].replace(/^'/, "");
      if (!isUsernameMatch(curTk, expectedTk)) {
        perfectlyMatched = false;
        break;
      }
    }
    if (perfectlyMatched) {
      return { success: true, count: teacherRows.length, message: "Sheet DULIEU đã khớp 100% với Sheet DATA theo thứ tự cố định!" };
    }
  }

  // 4. Ghi đè lại Sheet DULIEU theo đúng danh sách và thứ tự cố định của Sheet DATA
  sheetDuLieu.clear();
  sheetDuLieu.appendRow(["TK", "TÊN GV", "DỮ LIỆU GV NHẬP DANG JSON"]);
  
  // Định dạng tiêu đề
  const headerRange = sheetDuLieu.getRange(1, 1, 1, 3);
  headerRange.setFontWeight("bold").setBackground("#0d9488").setFontColor("#ffffff");

  // Ghi toàn bộ danh sách giáo viên theo đúng thứ tự
  const dataRange = sheetDuLieu.getRange(2, 1, teacherRows.length, 3);
  dataRange.setValues(teacherRows);

  // Định dạng cột A là Văn bản (Plain Text) để luôn giữ số 0 ở đầu SĐT
  sheetDuLieu.getRange(2, 1, teacherRows.length, 1).setNumberFormat("@");

  // Tự động đồng bộ luôn Sheet dulieu_hoanhap theo đúng thứ tự
  try {
    syncDuLieuHoaNhapWithData(forceRebuild);
  } catch (hnErr) {
    Logger.log("Lỗi đồng bộ ngầm dulieu_hoanhap: " + hnErr.toString());
  }

  return {
    success: true,
    count: teacherRows.length,
    message: "Đã đồng bộ thành công " + teacherRows.length + " giáo viên từ Sheet DATA sang Sheet DULIEU & Sheet dulieu_hoanhap theo đúng thứ tự cố định!"
  };
}

/**
 * XỬ LÝ ĐĂNG NHẬP:
 * Kiểm tra tài khoản và mật khẩu từ Sheet DATA.
 * Hỗ trợ nhận diện số điện thoại cả khi có hoặc không có số 0 ở đầu.
 * Đồng thời lấy dữ liệu JSON đã lưu (nếu có) từ Sheet DULIEU.
 */
function handleLogin(taiKhoan, matKhau) {
  if (!taiKhoan || !matKhau) {
    return jsonResponse({ success: false, message: "Vui lòng nhập đầy đủ tài khoản và mật khẩu!" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return jsonResponse({ success: false, message: "Không tìm thấy sheet DATA trong bảng tính!" });
  }

  const cols = getSheetDataCols(sheetData);
  const dataValuesRaw = sheetData.getDataRange().getValues();
  const dataValuesDisplay = sheetData.getDataRange().getDisplayValues();
  let foundUser = null;
  const tkClean = String(taiKhoan).trim();
  const mkClean = String(matKhau).trim();

  for (let i = 1; i < dataValuesRaw.length; i++) {
    const rowRaw = dataValuesRaw[i];
    const rowDisp = dataValuesDisplay[i];
    const rowTk = String(rowDisp[cols.colTk] || rowRaw[cols.colTk] || "").trim();
    const rowTenGv = String(rowDisp[cols.colTenGv] || rowRaw[cols.colTenGv] || "").trim();
    const rowNgaySinh = formatBirthDate(cols.colNgaySinh !== -1 ? (rowDisp[cols.colNgaySinh] || rowRaw[cols.colNgaySinh]) : "");
    const rowQuyen = String(rowRaw[cols.colQuyen] || "gv").trim();
    const rowMk = String(rowRaw[cols.colMatKhau] || "").trim();

    if (isUsernameMatch(rowTk, tkClean)) {
      if (rowMk === mkClean) {
        foundUser = {
          taiKhoan: normalizeUsername(rowTk),
          tenGv: rowTenGv,
          ngaySinh: rowNgaySinh,
          quyen: rowQuyen || "gv"
        };
      } else {
        return jsonResponse({ success: false, message: "Mật khẩu không chính xác!" });
      }
      break;
    }
  }

  if (!foundUser) {
    return jsonResponse({ success: false, message: "Tài khoản không tồn tại trên hệ thống nhà trường!" });
  }

  // Lấy dữ liệu đã lưu từ Sheet DULIEU
  let teacherDataJson = null;
  const sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  if (sheetDuLieu) {
    const duLieuValues = sheetDuLieu.getDataRange().getValues();
    const duLieuDisplay = sheetDuLieu.getDataRange().getDisplayValues();
    for (let j = 1; j < duLieuValues.length; j++) {
      const dTk = String(duLieuDisplay[j][0] || duLieuValues[j][0] || "").trim();
      if (isUsernameMatch(dTk, tkClean)) {
        teacherDataJson = duLieuValues[j][2]; // Cột C: DỮ LIỆU GV NHẬP DANG JSON
        break;
      }
    }
  }

  return jsonResponse({
    success: true,
    message: "Đăng nhập thành công!",
    user: foundUser,
    data: teacherDataJson,
    isSystemLocked: isSystemLocked(),
    columnConfig: getColumnConfig()
  });
}

/**
 * XỬ LÝ LƯU DỮ LIỆU:
 * Ghi dữ liệu JSON vào ĐÚNG DÒNG CỐ ĐỊNH của giáo viên trong Sheet DULIEU.
 * - Sheet DULIEU luôn sắp xếp các giáo viên theo đúng thứ tự của Sheet DATA.
 * - Khi giáo viên đăng nhập kê khai, chỉ cập nhật Cột B (Tên) và Cột C (JSON) tại dòng của chính giáo viên đó.
 * - Không thêm dòng bừa bãi ở cuối, không làm xáo trộn các giáo viên khác.
 */
function handleSaveData(taiKhoan, tenGv, dataJson, isAdmin) {
  if (!taiKhoan) {
    return jsonResponse({ success: false, message: "Thiếu thông tin tài khoản để lưu!" });
  }

  // Kiểm tra nếu hệ thống đang bị khóa kê khai toàn trường (trừ tài khoản admin)
  const isUserAdmin = isAdmin === true || String(taiKhoan).trim().toLowerCase() === "admin";
  if (isSystemLocked() && !isUserAdmin) {
    return jsonResponse({
      success: false,
      message: "Hệ thống hiện đang bị KHÓA KÊ KHAI bởi Ban giám hiệu nhà trường. Quý thầy cô chỉ có thể xem số liệu, không thể lưu dữ liệu mới lúc này!"
    });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  if (!sheetDuLieu) {
    sheetDuLieu = ss.insertSheet(SHEET_DULIEU);
    sheetDuLieu.appendRow(["TK", "TÊN GV", "DỮ LIỆU GV NHẬP DANG JSON"]);
    const duLieuHeader = sheetDuLieu.getRange(1, 1, 1, 3);
    duLieuHeader.setFontWeight("bold").setBackground("#0d9488").setFontColor("#ffffff");
  }

  const tkClean = String(taiKhoan).trim();
  const jsonString = typeof dataJson === "string" ? dataJson : JSON.stringify(dataJson);

  let values = sheetDuLieu.getDataRange().getValues();
  let displayValues = sheetDuLieu.getDataRange().getDisplayValues();

  // 1. Tìm dòng của giáo viên trong Sheet DULIEU
  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    const rowTk = String(displayValues[i][0] || values[i][0] || "").trim();
    if (isUsernameMatch(rowTk, tkClean)) {
      targetRow = i + 1; // 1-based row index
      break;
    }
  }

  // 2. Nếu chưa tìm thấy dòng của giáo viên (ví dụ Sheet DULIEU chưa có đủ giáo viên từ Sheet DATA):
  if (targetRow === -1) {
    // Tự động đồng bộ toàn bộ danh sách giáo viên từ Sheet DATA sang Sheet DULIEU theo đúng thứ tự cố định!
    syncDuLieuWithData(true);

    // Tìm lại dòng của giáo viên sau khi đã đồng bộ
    values = sheetDuLieu.getDataRange().getValues();
    displayValues = sheetDuLieu.getDataRange().getDisplayValues();
    for (let i = 1; i < values.length; i++) {
      const rowTk = String(displayValues[i][0] || values[i][0] || "").trim();
      if (isUsernameMatch(rowTk, tkClean)) {
        targetRow = i + 1;
        break;
      }
    }
  }

  // 3. Ghi dữ liệu vào ĐÚNG DÒNG của giáo viên đó
  if (targetRow !== -1) {
    if (tenGv) {
      sheetDuLieu.getRange(targetRow, 2).setValue(tenGv);
    }
    sheetDuLieu.getRange(targetRow, 3).setValue(jsonString);
    SpreadsheetApp.flush();

    return jsonResponse({
      success: true,
      message: "Đã lưu dữ liệu vào đúng dòng " + targetRow + " của giáo viên trong Sheet DULIEU!",
      row: targetRow,
      timestamp: new Date().toISOString()
    });
  }

  return jsonResponse({
    success: false,
    message: "Không tìm thấy tài khoản '" + normalizeUsername(taiKhoan) + "' trong danh sách giáo viên (Sheet DATA)!"
  });
}

/**
 * XÓA DỮ LIỆU KÊ KHAI TIẾT CHO GIÁO VIÊN:
 * Đưa số tiết các tuần về 0 và đặt cờ hk_declared = false, hk_saved = false trong Sheet DULIEU.
 */
function handleResetDeclaration(payload) {
  const taiKhoan = payload.taiKhoan || payload.tai_khoan;
  const scope = String(payload.scope || "all").toLowerCase(); // "hk1", "hk2", or "all"
  if (!taiKhoan) {
    return jsonResponse({ success: false, message: "Thiếu thông tin tài khoản giáo viên!" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  if (!sheetDuLieu) {
    return jsonResponse({ success: false, message: "Không tìm thấy Sheet DULIEU!" });
  }

  const values = sheetDuLieu.getDataRange().getValues();
  const displayValues = sheetDuLieu.getDataRange().getDisplayValues();
  const tkClean = String(taiKhoan).trim();
  let targetRow = -1;
  let currentJson = {};

  for (let i = 1; i < values.length; i++) {
    const rowTk = String(displayValues[i][0] || values[i][0] || "").trim();
    if (isUsernameMatch(rowTk, tkClean)) {
      targetRow = i + 1;
      try {
        currentJson = values[i][2] ? JSON.parse(values[i][2]) : {};
      } catch (e) {
        currentJson = {};
      }
      break;
    }
  }

  if (targetRow === -1) {
    return jsonResponse({ success: false, message: "Không tìm thấy giáo viên '" + normalizeUsername(taiKhoan) + "' trong Sheet DULIEU!" });
  }

  if (!currentJson.hk1) currentJson.hk1 = {};
  if (!currentJson.hk2) currentJson.hk2 = {};

  if (scope === "hk1" || scope === "all") {
    for (let w = 1; w <= 18; w++) {
      currentJson.hk1["w" + w] = { assigned: 0, leave: 0, bdhsg: 0, ts10: 0 };
    }
    currentJson.hk1_declared = false;
    currentJson.hk1_saved = false;
  }

  if (scope === "hk2" || scope === "all") {
    for (let w = 19; w <= 35; w++) {
      currentJson.hk2["w" + w] = { assigned: 0, leave: 0, bdhsg: 0, ts10: 0 };
    }
    currentJson.hk2_declared = false;
    currentJson.hk2_saved = false;
  }

  const updatedJsonStr = JSON.stringify(currentJson);
  sheetDuLieu.getRange(targetRow, 3).setValue(updatedJsonStr);
  SpreadsheetApp.flush();

  const semName = scope === "hk1" ? "Học Kỳ 1" : (scope === "hk2" ? "Học Kỳ 2" : "Cả Năm");
  return jsonResponse({
    success: true,
    message: "Đã xóa dữ liệu kê khai (" + semName + ") của giáo viên thành công!",
    data: updatedJsonStr
  });
}

/**
 * XỬ LÝ LẤY DỮ LIỆU GV:
 */
function handleGetData(taiKhoan) {
  if (!taiKhoan) {
    return jsonResponse({ success: false, message: "Thiếu tài khoản!" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  let userProfile = null;
  if (sheetData) {
    const cols = getSheetDataCols(sheetData);
    const dataValuesRaw = sheetData.getDataRange().getValues();
    const dataValuesDisplay = sheetData.getDataRange().getDisplayValues();
    const tkClean = String(taiKhoan).trim();
    for (let i = 1; i < dataValuesRaw.length; i++) {
      const rowRaw = dataValuesRaw[i];
      const rowDisp = dataValuesDisplay[i];
      const rowTk = String(rowDisp[cols.colTk] || rowRaw[cols.colTk] || "").trim();
      if (isUsernameMatch(rowTk, tkClean)) {
        userProfile = {
          taiKhoan: normalizeUsername(rowTk),
          tenGv: String(rowDisp[cols.colTenGv] || rowRaw[cols.colTenGv] || "").trim(),
          ngaySinh: formatBirthDate(cols.colNgaySinh !== -1 ? (rowDisp[cols.colNgaySinh] || rowRaw[cols.colNgaySinh]) : ""),
          quyen: String(rowRaw[cols.colQuyen] || "gv").trim()
        };
        break;
      }
    }
  }

  const sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  let teacherDataJson = null;
  let teacherName = userProfile ? userProfile.tenGv : "";
  if (sheetDuLieu) {
    const values = sheetDuLieu.getDataRange().getValues();
    const displayValues = sheetDuLieu.getDataRange().getDisplayValues();
    const tkClean = String(taiKhoan).trim();
    for (let i = 1; i < values.length; i++) {
      const rowTk = String(displayValues[i][0] || values[i][0] || "").trim();
      if (isUsernameMatch(rowTk, tkClean)) {
        teacherDataJson = values[i][2];
        if (!teacherName && values[i][1]) teacherName = values[i][1];
        break;
      }
    }
  }

  return jsonResponse({
    success: true,
    data: teacherDataJson,
    tenGv: teacherName,
    user: userProfile,
    isSystemLocked: isSystemLocked(),
    columnConfig: getColumnConfig()
  });
}

/**
 * XỬ LÝ ĐỔI MẬT KHẨU:
 * Cập nhật Mật khẩu mới vào Sheet DATA.
 */
function handleChangePassword(taiKhoan, oldPassword, newPassword) {
  if (!taiKhoan || !oldPassword || !newPassword) {
    return jsonResponse({ success: false, message: "Vui lòng nhập đầy đủ mật khẩu cũ và mới!" });
  }

  if (String(newPassword).length < 6) {
    return jsonResponse({ success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return jsonResponse({ success: false, message: "Không tìm thấy sheet DATA!" });
  }

  const cols = getSheetDataCols(sheetData);
  const values = sheetData.getDataRange().getValues();
  const displayValues = sheetData.getDataRange().getDisplayValues();
  const tkClean = String(taiKhoan).trim();
  const oldMkClean = String(oldPassword).trim();
  const newMkClean = String(newPassword).trim();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowDisp = displayValues[i];
    const rowTk = String(rowDisp[cols.colTk] || row[cols.colTk] || "").trim();
    const rowMk = String(row[cols.colMatKhau] || "").trim();

    if (isUsernameMatch(rowTk, tkClean)) {
      if (rowMk !== oldMkClean) {
        return jsonResponse({ success: false, message: "Mật khẩu hiện tại không đúng!" });
      }

      // Ghi mật khẩu mới vào Cột Mật khẩu
      sheetData.getRange(i + 1, cols.colMatKhau + 1).setValue(newMkClean);

      return jsonResponse({
        success: true,
        message: "Đổi mật khẩu thành công! Mật khẩu mới đã được lưu vào hệ thống."
      });
    }
  }

  return jsonResponse({ success: false, message: "Không tìm thấy tài khoản để đổi mật khẩu!" });
}

/**
 * ADMIN ĐỔI MẬT KHẨU CHO GIÁO VIÊN:
 * Cập nhật trực tiếp cột Mật khẩu trong Sheet DATA mà không cần mật khẩu cũ.
 */
function handleAdminResetPassword(payload) {
  const taiKhoan = String(payload.taiKhoan || payload.originalTaiKhoan || "").trim();
  const newPassword = String(payload.newPassword || payload.matKhau || "").trim();

  if (!taiKhoan || !newPassword) {
    return jsonResponse({ success: false, message: "Thiếu thông tin tài khoản hoặc mật khẩu mới!" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return jsonResponse({ success: false, message: "Không tìm thấy sheet DATA!" });
  }

  const cols = getSheetDataCols(sheetData);
  const dataValues = sheetData.getDataRange().getValues();
  const displayValues = sheetData.getDataRange().getDisplayValues();
  let foundRow = -1;

  for (let i = 1; i < dataValues.length; i++) {
    const rowTk = String(displayValues[i][cols.colTk] || dataValues[i][cols.colTk] || "").trim();
    if (isUsernameMatch(rowTk, taiKhoan)) {
      foundRow = i + 1; // 1-based index
      break;
    }
  }

  if (foundRow === -1) {
    return jsonResponse({ success: false, message: "Không tìm thấy tài khoản '" + taiKhoan + "' trong sheet DATA!" });
  }

  sheetData.getRange(foundRow, cols.colMatKhau + 1).setValue(newPassword);
  return jsonResponse({ success: true, message: "Đã đổi mật khẩu thành công cho tài khoản " + normalizeUsername(taiKhoan) });
}

/**
 * XỬ LÝ LẤY BÁO CÁO TỔNG HỢP CHO ADMIN
 */
function handleGetAdminSummary(adminTaiKhoan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  let sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);

  if (!sheetData) {
    return jsonResponse({ success: false, message: "Không tìm thấy sheet DATA!" });
  }

  // Tự động đồng bộ: nếu Sheet DULIEU chưa có hoặc thiếu dòng so với Sheet DATA -> tự động đồng bộ theo thứ tự cố định
  if (!sheetDuLieu || sheetDuLieu.getLastRow() < sheetData.getLastRow()) {
    try {
      syncDuLieuWithData(false);
      sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
    } catch(syncErr) {
      Logger.log("Lỗi tự động đồng bộ DULIEU: " + syncErr);
    }
  }

  const cols = getSheetDataCols(sheetData);
  const dataUsersRaw = sheetData.getDataRange().getValues();
  const dataUsersDisplay = sheetData.getDataRange().getDisplayValues();
  const duLieuMap = {};

  if (sheetDuLieu) {
    const duLieuValues = sheetDuLieu.getDataRange().getValues();
    const duLieuDisplay = sheetDuLieu.getDataRange().getDisplayValues();
    for (let j = 1; j < duLieuValues.length; j++) {
      const rawTk = String(duLieuValues[j][0] || "").trim();
      const dispTk = String(duLieuDisplay[j][0] || "").trim();
      const normTk = normalizeUsername(dispTk || rawTk);
      const dataObj = {
        tenGv: duLieuValues[j][1],
        dataJson: duLieuValues[j][2]
      };
      const cleanRaw = rawTk.replace(/^'+/, "").toLowerCase();
      const cleanDisp = dispTk.replace(/^'+/, "").toLowerCase();
      const cleanNorm = normTk.replace(/^'+/, "").toLowerCase();
      if (cleanRaw) duLieuMap[cleanRaw] = dataObj;
      if (cleanDisp) duLieuMap[cleanDisp] = dataObj;
      if (cleanNorm) duLieuMap[cleanNorm] = dataObj;
      const stripped = cleanNorm.replace(/^0+/, "");
      if (stripped) duLieuMap[stripped] = dataObj;
    }
  }

  const list = [];
  for (let i = 1; i < dataUsersRaw.length; i++) {
    const rowRaw = dataUsersRaw[i];
    const rowDisp = dataUsersDisplay[i];
    const rawTk = String(rowDisp[cols.colTk] || rowRaw[cols.colTk] || "").trim();
    if (!rawTk) continue;
    const normTk = normalizeUsername(rawTk);
    const tenGv = String(rowDisp[cols.colTenGv] || rowRaw[cols.colTenGv] || "").trim();
    const ngaySinh = formatBirthDate(cols.colNgaySinh !== -1 ? (rowDisp[cols.colNgaySinh] || rowRaw[cols.colNgaySinh]) : "");
    const quyen = String(rowRaw[cols.colQuyen] || "gv").trim();
    const matKhau = String(rowRaw[cols.colMatKhau] !== undefined ? rowRaw[cols.colMatKhau] : "").trim();

    const cleanNormTk = normTk.replace(/^'+/, "").toLowerCase();
    const cleanRawTk = rawTk.replace(/^'+/, "").toLowerCase();
    const dData = duLieuMap[cleanNormTk] || 
                  duLieuMap[cleanRawTk] || 
                  duLieuMap[cleanNormTk.replace(/^0+/, "")] || null;

    list.push({
      taiKhoan: normTk, // Luôn trả về tài khoản đã chuẩn hóa có số 0 ở đầu!
      rawTaiKhoan: rawTk,
      tenGv: tenGv,
      ngaySinh: ngaySinh,
      quyen: quyen,
      matKhau: matKhau,
      hasData: !!dData,
      dataJson: dData ? dData.dataJson : null
    });
  }

  return jsonResponse({
    success: true,
    list: list,
    isSystemLocked: isSystemLocked(),
    columnConfig: getColumnConfig()
  });
}

/**
 * THÊM MỚI TÀI KHOẢN VÀO SHEET DATA (VÀ KHỞI TẠO DULIEU THEO THỨ TỰ)
 */
function handleCreateAccount(payload) {
  const rawTk = String(payload.taiKhoan || "").trim();
  const tk = normalizeUsername(rawTk);
  const tenGv = String(payload.tenGv || "").trim();
  const ngaySinh = String(payload.ngaySinh || "").trim();
  const quyen = String(payload.quyen || "gv").trim().toLowerCase();
  const matKhau = String(payload.matKhau || "1234").trim();
  const subject = String(payload.subject || "Chưa chọn").trim();
  const quota = parseFloat(payload.quota) || 19;

  if (!tk || !tenGv) {
    return jsonResponse({ success: false, message: "Vui lòng nhập đầy đủ Tài khoản và Tên giáo viên!" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return jsonResponse({ success: false, message: "Không tìm thấy sheet DATA!" });
  }

  const cols = getSheetDataCols(sheetData);
  const dataValues = sheetData.getDataRange().getValues();
  const displayValues = sheetData.getDataRange().getDisplayValues();

  // Kiểm tra trùng tài khoản
  for (let i = 1; i < dataValues.length; i++) {
    const existingTk = String(displayValues[i][cols.colTk] || dataValues[i][cols.colTk] || "").trim();
    if (isUsernameMatch(existingTk, tk)) {
      return jsonResponse({ success: false, message: "Tài khoản '" + tk + "' đã tồn tại trên hệ thống!" });
    }
  }

  // Thêm vào sheet DATA theo đúng vị trí cột. Nếu tk toàn số, thêm "'" để Google Sheets giữ số 0
  const cellTk = /^\d+$/.test(tk) ? "'" + tk : tk;
  const maxCols = Math.max(5, cols.colMatKhau + 1);
  const rowData = new Array(maxCols).fill("");
  rowData[cols.colTk] = cellTk;
  rowData[cols.colTenGv] = tenGv;
  if (cols.colNgaySinh !== -1) rowData[cols.colNgaySinh] = ngaySinh;
  rowData[cols.colQuyen] = quyen;
  rowData[cols.colMatKhau] = matKhau;

  // Xử lý vị trí chèn (STT):
  const rawPos = payload.position !== undefined ? parseInt(payload.position, 10) : NaN;
  const lastRowData = sheetData.getLastRow();
  const totalExisting = Math.max(0, lastRowData - 1); // Trừ hàng tiêu đề (hàng 1)

  let insertedAtPos = null;
  if (!isNaN(rawPos) && rawPos >= 1 && rawPos <= totalExisting) {
    const insertRow = rawPos + 1; // Hàng 1 là tiêu đề, nên STT rawPos nằm tại hàng rawPos + 1
    sheetData.insertRowBefore(insertRow);
    sheetData.getRange(insertRow, 1, 1, rowData.length).setValues([rowData]);
    if (cols.colTk !== -1) {
      sheetData.getRange(insertRow, cols.colTk + 1).setNumberFormat("@");
    }
    insertedAtPos = rawPos;
  } else {
    sheetData.appendRow(rowData);
    if (cols.colTk !== -1) {
      sheetData.getRange(sheetData.getLastRow(), cols.colTk + 1).setNumberFormat("@");
    }
    insertedAtPos = totalExisting + 1;
  }

  // Khởi tạo dòng tương ứng trong Sheet DULIEU (theo đúng vị trí)
  const sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  if (sheetDuLieu) {
    const initStore = {
      subject: subject,
      quota: quota,
      hk1: {},
      hk2: {}
    };
    const lastRowDuLieu = sheetDuLieu.getLastRow();
    if (insertedAtPos !== null && insertedAtPos <= totalExisting && (insertedAtPos + 1) <= lastRowDuLieu) {
      const insertRowDuLieu = insertedAtPos + 1;
      sheetDuLieu.insertRowBefore(insertRowDuLieu);
      sheetDuLieu.getRange(insertRowDuLieu, 1, 1, 3).setValues([[cellTk, tenGv, JSON.stringify(initStore)]]);
      sheetDuLieu.getRange(insertRowDuLieu, 1).setNumberFormat("@");
    } else {
      sheetDuLieu.appendRow([cellTk, tenGv, JSON.stringify(initStore)]);
      sheetDuLieu.getRange(sheetDuLieu.getLastRow(), 1).setNumberFormat("@");
    }
  }

  const posNotice = (insertedAtPos !== null && insertedAtPos <= totalExisting)
    ? " tại vị trí STT " + insertedAtPos + " (các giáo viên phía sau đã được tự động đẩy xuống)"
    : " vào cuối danh sách (STT " + insertedAtPos + ")";

  return jsonResponse({
    success: true,
    message: "Đã thêm mới tài khoản '" + tk + "'" + posNotice + " thành công vào Google Sheet!"
  });
}

/**
 * CHỈNH SỬA TÀI KHOẢN TRONG SHEET DATA (VÀ ĐỒNG BỘ DULIEU)
 */
function handleUpdateAccount(payload) {
  const originalTk = String(payload.originalTaiKhoan || payload.taiKhoan || "").trim();
  const newTkRaw = String(payload.newTaiKhoan || payload.taiKhoan || "").trim();
  const newTk = normalizeUsername(newTkRaw);
  const tenGv = String(payload.tenGv || "").trim();
  const ngaySinh = payload.ngaySinh !== undefined ? String(payload.ngaySinh).trim() : undefined;
  const quyen = String(payload.quyen || "gv").trim().toLowerCase();
  const matKhau = String(payload.matKhau || "").trim();
  const subject = payload.subject;
  const quota = payload.quota !== undefined ? (parseFloat(payload.quota) || 19) : undefined;

  if (!originalTk || !newTk || !tenGv) {
    return jsonResponse({ success: false, message: "Thiếu thông tin tài khoản hoặc tên giáo viên!" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return jsonResponse({ success: false, message: "Không tìm thấy sheet DATA!" });
  }

  const cols = getSheetDataCols(sheetData);
  const dataValues = sheetData.getDataRange().getValues();
  const displayValues = sheetData.getDataRange().getDisplayValues();
  let foundRow = -1;

  for (let i = 1; i < dataValues.length; i++) {
    const rowTk = String(displayValues[i][cols.colTk] || dataValues[i][cols.colTk] || "").trim();
    if (isUsernameMatch(rowTk, originalTk)) {
      foundRow = i + 1; // 1-based index
    } else if (!isUsernameMatch(originalTk, newTk) && isUsernameMatch(rowTk, newTk)) {
      return jsonResponse({ success: false, message: "Tài khoản mới '" + newTk + "' đã trùng với một tài khoản khác!" });
    }
  }

  if (foundRow === -1) {
    return jsonResponse({ success: false, message: "Không tìm thấy tài khoản cần sửa trong sheet DATA!" });
  }

  // Cập nhật dòng trong sheet DATA. Giữ tiền tố "'" nếu tk là số để giữ số 0
  const cellTk = /^\d+$/.test(newTk) ? "'" + newTk : newTk;
  sheetData.getRange(foundRow, cols.colTk + 1).setValue(cellTk);
  sheetData.getRange(foundRow, cols.colTenGv + 1).setValue(tenGv);
  if (cols.colNgaySinh !== -1 && ngaySinh !== undefined) {
    sheetData.getRange(foundRow, cols.colNgaySinh + 1).setValue(ngaySinh);
  }
  sheetData.getRange(foundRow, cols.colQuyen + 1).setValue(quyen);
  if (matKhau) {
    sheetData.getRange(foundRow, cols.colMatKhau + 1).setValue(matKhau);
  }

  // Đồng bộ sang Sheet DULIEU tại đúng dòng của giáo viên đó
  const sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  if (sheetDuLieu) {
    const duLieuValues = sheetDuLieu.getDataRange().getValues();
    const duLieuDisplay = sheetDuLieu.getDataRange().getDisplayValues();
    let duLieuFound = false;
    for (let j = 1; j < duLieuValues.length; j++) {
      const dTk = String(duLieuDisplay[j][0] || duLieuValues[j][0] || "").trim();
      if (isUsernameMatch(dTk, originalTk)) {
        duLieuFound = true;
        sheetDuLieu.getRange(j + 1, 1).setValue(cellTk);
        sheetDuLieu.getRange(j + 1, 2).setValue(tenGv);
        if (subject !== undefined || quota !== undefined) {
          try {
            const parsed = JSON.parse(duLieuValues[j][2] || "{}");
            if (subject !== undefined) parsed.subject = subject;
            if (quota !== undefined) parsed.quota = quota;
            sheetDuLieu.getRange(j + 1, 3).setValue(JSON.stringify(parsed));
          } catch(e) {}
        }
        break;
      }
    }

    if (!duLieuFound) {
      syncDuLieuWithData(true);
    }
  }

  return jsonResponse({ success: true, message: "Đã cập nhật thông tin tài khoản thành công trên Google Sheet!" });
}

/**
 * XÓA TÀI KHOẢN KHỎI SHEET DATA VÀ SHEET DULIEU
 */
function handleDeleteAccount(taiKhoan) {
  const tkClean = String(taiKhoan || "").trim();
  if (!tkClean) {
    return jsonResponse({ success: false, message: "Thiếu thông tin tài khoản cần xóa!" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return jsonResponse({ success: false, message: "Không tìm thấy sheet DATA!" });
  }

  const cols = getSheetDataCols(sheetData);
  const dataValues = sheetData.getDataRange().getValues();
  const displayValues = sheetData.getDataRange().getDisplayValues();
  let deletedFromData = false;

  for (let i = 1; i < dataValues.length; i++) {
    const rowTk = String(displayValues[i][cols.colTk] || dataValues[i][cols.colTk] || "").trim();
    if (isUsernameMatch(rowTk, tkClean)) {
      sheetData.deleteRow(i + 1);
      deletedFromData = true;
      break;
    }
  }

  if (!deletedFromData) {
    return jsonResponse({ success: false, message: "Không tìm thấy tài khoản '" + taiKhoan + "' trong sheet DATA!" });
  }

  // Xóa luôn dữ liệu liên quan trong Sheet DULIEU tại đúng dòng
  const sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  if (sheetDuLieu) {
    const duLieuValues = sheetDuLieu.getDataRange().getValues();
    const duLieuDisplay = sheetDuLieu.getDataRange().getDisplayValues();
    for (let j = 1; j < duLieuValues.length; j++) {
      const dTk = String(duLieuDisplay[j][0] || duLieuValues[j][0] || "").trim();
      if (isUsernameMatch(dTk, tkClean)) {
        sheetDuLieu.deleteRow(j + 1);
        break;
      }
    }
  }

  return jsonResponse({ success: true, message: "Đã xóa tài khoản '" + normalizeUsername(taiKhoan) + "' thành công khỏi Google Sheet!" });
}

/**
 * HÀM ĐỒNG BỘ THỦ CÔNG THEO THỨ TỰ CỐ ĐỊNH (Dành cho Admin chạy trực tiếp trong Google Apps Script):
 * Chọn hàm 'dongBoSheetDuLieu' và bấm 'Chạy' (Run).
 * Hàm này sẽ sắp xếp toàn bộ Sheet DULIEU theo đúng thứ tự hàng của Sheet DATA mà không làm mất dữ liệu đã kê khai.
 */
function dongBoSheetDuLieu() {
  const res = syncDuLieuWithData(true);
  Logger.log(res.message);
  return res;
}

/**
 * Trả về phản hồi JSON chuẩn có hỗ trợ CORS
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * HÀM KHỞI TẠO CẤU TRÚC SHEETS BAN ĐẦU (Chạy trong Apps Script hoặc gọi từ Web App)
 * Tự động tạo và chuẩn hóa đầy đủ 4 sheet: DATA, DULIEU, HOA NHAP, dulieu_hoanhap
 */

function initialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Khởi tạo Sheet DATA
  let sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    // Nếu có Trang tính 1 / Sheet1 mặc định của Google Sheet mới, đổi tên thành DATA
    const sheets = ss.getSheets();
    if (sheets.length === 1 && (sheets[0].getName() === "Sheet1" || sheets[0].getName() === "Trang tính 1")) {
      sheetData = sheets[0];
      sheetData.setName(SHEET_DATA);
    } else {
      sheetData = ss.insertSheet(SHEET_DATA);
    }
  }
  sheetData.clear();
  sheetData.appendRow(["Tài khoản", "Tên GV", "Ngày sinh", "Quyền", "Mật khẩu"]);
  
  // Định dạng hàng tiêu đề và cột
  const dataHeader = sheetData.getRange(1, 1, 1, 5);
  dataHeader.setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff");
  sheetData.setColumnWidth(1, 160);
  sheetData.setColumnWidth(2, 240);
  sheetData.setColumnWidth(3, 140);
  sheetData.setColumnWidth(4, 100);
  sheetData.setColumnWidth(5, 140);
  sheetData.getRange("A:E").setNumberFormat("@");

  // Dữ liệu mẫu ban đầu
  sheetData.appendRow(["admin", "Ban Giám Hiệu (Admin)", "15/08/1980", "admin", "admin123"]);
  sheetData.appendRow(["bgh_pht", "Phó Hiệu Trưởng (BGH)", "10/05/1982", "bgh", "1234"]);
  sheetData.appendRow(["gv_toan", "Vũ Ngọc Tuấn", "20/10/1985", "gv", "1234"]);
  sheetData.appendRow(["gv_van", "Nguyễn Thị Anh Thư", "12/03/1988", "gv", "1234"]);
  sheetData.appendRow(["gv_anh", "Trần Phương Thúy", "05/09/1990", "gv", "1234"]);
  sheetData.appendRow(["gv_khtn", "Đặng Ngọc Thanh Thủy", "28/11/1987", "gv", "1234"]);
  sheetData.getRange(2, 1, 6, 5).setNumberFormat("@");

  // 2. Khởi tạo và đồng bộ Sheet DULIEU theo đúng thứ tự
  syncDuLieuWithData(true);

  // 3. Khởi tạo Sheet HOA NHAP
  let sheetHN = initHoaNhapSheet(ss);
  if (sheetHN.getLastRow() <= 1) {
    sheetHN.appendRow(["Nguyễn Văn An", "15/04/2012", "6A1", "Khuyết tật phát triển trí tuệ"]);
    sheetHN.appendRow(["Trần Thị Bình", "20/09/2011", "7A2", "Khuyết tật học tập"]);
    sheetHN.appendRow(["Lê Hoàng Cường", "05/11/2010", "8A3", "Khuyết tật vận động nhẹ"]);
    sheetHN.getRange(2, 2, 3, 1).setNumberFormat("@");
  }

  // 4. Khởi tạo và đồng bộ Sheet dulieu_hoanhap theo đúng thứ tự
  syncDuLieuHoaNhapWithData(true);

  // 5. Khởi tạo các cấu hình hệ thống mặc định (Properties)
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperties({
      "IS_SYSTEM_LOCKED": "false",
      "CONFIG_SHOW_BD_HSG": "true",
      "CONFIG_SHOW_DAY_TS10": "true"
    }, false);
  } catch (propErr) {
    Logger.log("Lỗi cài đặt Properties: " + propErr);
  }

  // 6. Dọn dẹp sheet mặc định "Sheet1" hoặc "Trang tính 1" nếu còn thừa
  const defaultSheets = ["Sheet1", "Trang tính 1"];
  defaultSheets.forEach(defName => {
    const s = ss.getSheetByName(defName);
    if (s && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(s);
      } catch (delErr) {}
    }
  });

  Logger.log("Khởi tạo và đồng bộ thành công đầy đủ 4 sheet: DATA, DULIEU, HOA NHAP, dulieu_hoanhap!");
  return {
    success: true,
    message: "Khởi tạo thành công đầy đủ 4 Sheet: DATA, DULIEU, HOA NHAP, dulieu_hoanhap!"
  };
}
