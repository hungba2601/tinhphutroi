/**
 * =========================================================================
 * BACKEND GOOGLE APPS SCRIPT: SỔ TÍNH TIẾT DẠY VƯỢT ĐỊNH MỨC - THCS AN NHƠN
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
const SHEET_DULIEU = "DULIEU";   // Cột A: TK        | Cột B: TÊN GV | Cột C: DỮ LIỆU GV NHẬP DANG JSON | Cột D: LỚP DẠY
const SHEET_HOA_NHAP = "HOA NHAP";             // Cột A: TÊN HỌC SINH | Cột B: NGÀY SINH | Cột C: LỚP | Cột D: LOẠI HÒA NHẬP | Cột E: MỨC ĐỘ | Cột F: THỜI GIAN
const SHEET_DULIEU_HOA_NHAP = "dulieu_hoanhap"; // Cột A: TK GV | Cột B: TÊN GV | Cột C: DỮ LIỆU KHAI BÁO TIẾT HÒA NHẬP DẠNG JSON
const SHEET_DATA_GDTC = "DATA GDTC"; // Cột A: TK | Cột B: TÊN GV | Cột C: KÊ KHAI (Dạng JSON)
const SHEET_HUB_SERVER = "HUB_SERVER"; // Cột A: TÊN TK | Cột B: TÊN TRƯỜNG | Cột C: KHỐI LỚP | Cột D: ĐỊA CHỈ URL | Cột E: NGÀY CẬP NHẬT

const BACKEND_VERSION = "2.0";

/**
 * SO SÁNH HAI PHIÊN BẢN (Ví dụ "2.0" vs "2.1")
 * Trả về true nếu phiên bản hiện tại nhỏ hơn phiên bản mới nhất
 */
function isVersionOutdated(currentVer, latestVer) {
  if (!latestVer) return false;
  if (!currentVer) return true;
  const cleanC = String(currentVer).trim().replace(/^[vV]/, "");
  const cleanL = String(latestVer).trim().replace(/^[vV]/, "");
  if (cleanC === cleanL) return false;
  const cParts = cleanC.split(".").map(n => parseInt(n, 10) || 0);
  const lParts = cleanL.split(".").map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(cParts.length, lParts.length);
  for (let i = 0; i < maxLen; i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (c < l) return true;
    if (c > l) return false;
  }
  return false;
}

/**
 * ĐỌC PHIÊN BẢN MỚI NHẤT TỪ Ô H1 TRÊN SHEET DATA (MÁY CHỦ TRUNG TÂM)
 */
function getLatestBackendVersionFromSheet(sheetData) {
  try {
    const val = String(sheetData.getRange(1, 8).getDisplayValue() || sheetData.getRange("H1").getDisplayValue() || "").trim();
    if (val) return val;
  } catch (e) {}
  return BACKEND_VERSION;
}

/**
 * GHI NHẬN PHIÊN BẢN BACKEND CỦA TRƯỜNG VÀO CỘT G VÀ KIỂM TRA VỚI Ô H1
 */
function recordAndCheckAdminVersion(taiKhoan, schoolVersion) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return { success: false, message: "Không tìm thấy Sheet DATA!" };
  }
  const cols = getSheetDataCols(sheetData);
  const colVer = (cols.colVersion !== -1) ? cols.colVersion : 6;
  const latestVersion = getLatestBackendVersionFromSheet(sheetData);

  const versionToRecord = String(schoolVersion || BACKEND_VERSION).trim() || "2.0";
  let recordedRow = -1;
  const tkClean = String(taiKhoan || "").trim();

  if (tkClean) {
    const dataDisp = sheetData.getDataRange().getDisplayValues();
    for (let i = 1; i < dataDisp.length; i++) {
      const rowTk = String(dataDisp[i][cols.colTk] || "").trim();
      if (isUsernameMatch(rowTk, tkClean)) {
        recordedRow = i + 1; // 1-based row index
        sheetData.getRange(recordedRow, colVer + 1).setValue(versionToRecord).setNumberFormat("@");
        break;
      }
    }
  }

  const hasUpdate = isVersionOutdated(versionToRecord, latestVersion);

  return {
    success: true,
    taiKhoan: tkClean,
    recordedRow: recordedRow,
    currentBackendVersion: versionToRecord,
    latestBackendVersion: latestVersion,
    hasBackendUpdate: hasUpdate,
    message: hasUpdate 
      ? "Đã có bản cập nhật code backend mới (" + latestVersion + ")!" 
      : "Phiên bản backend đang là mới nhất (" + versionToRecord + ")."
  };
}


/**
 * Xử lý yêu cầu HTTP GET
 */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || "ping";

    if (action === "getHubServers" || action === "getHubSchools" || action === "listSchools") {
      return handleGetHubServers();
    }

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

    if (action === "capNhatPhuongHubServer" || action === "dongBoPhuongHubServer") {
      return jsonResponse({ success: true, message: capNhatPhuongHubServer() });
    }

    if (action === "xoaCotPhuong" || action === "xoaCotPhuongSheetData") {
      return jsonResponse({ success: true, message: xoaCotPhuong() });
    }

    if (action === "taoCotPhuong" || action === "capNhatCotPhuong" || action === "themCotPhuong") {
      return jsonResponse({ success: true, message: taoCotPhuong() });
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

    if (action === "addHoaNhapStudent" || action === "createHoaNhapStudent") {
      return handleAddHoaNhapStudent(params);
    }

    if (action === "updateHoaNhapStudent" || action === "editHoaNhapStudent") {
      return handleUpdateHoaNhapStudent(params);
    }

    if (action === "deleteHoaNhapStudent") {
      return handleDeleteHoaNhapStudent(params);
    }

    if (action === "getHoaNhapData") {
      return handleGetHoaNhapData(params.taiKhoan || params.tai_khoan);
    }

    if (action === "getGdtcData" || action === "get_gdtc_data") {
      return handleGetGdtcData(params.taiKhoan || params.tai_khoan);
    }

    if (action === "getAllGdtcData" || action === "get_all_gdtc_data") {
      return handleGetAllGdtcData();
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
      case "capNhatPhuongHubServer":
      case "dongBoPhuongHubServer":
        return jsonResponse({ success: true, message: capNhatPhuongHubServer() });

      case "xoaCotPhuong":
      case "xoaCotPhuongSheetData":
        return jsonResponse({ success: true, message: xoaCotPhuong() });

      case "taoCotPhuong":
      case "capNhatCotPhuong":
      case "themCotPhuong":
        return jsonResponse({ success: true, message: taoCotPhuong() });

      case "getHubServers":
      case "getHubSchools":
      case "listSchools":
        return handleGetHubServers();

      case "registerHubServer":
      case "saveHubServer":
      case "registerSchool":
        return handleRegisterHubServer(payload);

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
          backendVersion: BACKEND_VERSION,
          timestamp: new Date().toISOString()
        });
      }

      case "record_admin_backend_version":
      case "check_backend_version":
      case "checkBackendVersion": {
        const tk = payload.taiKhoan || payload.username || "";
        const ver = payload.backendVersion || payload.version || "";
        return jsonResponse(recordAndCheckAdminVersion(tk, ver));
      }

      case "initialSetup": {
        const setupRes = initialSetup();
        return jsonResponse(setupRes);
      }

      case "login":
        return handleLogin(payload.taiKhoan || payload.tai_khoan, payload.matKhau || payload.mat_khau);

      case "saveData":
        return handleSaveData(payload.taiKhoan || payload.tai_khoan, payload.tenGv || payload.ten_gv, payload.dataJson, payload.isAdmin, payload.lopDay || payload.classes || payload.lop_day);

      case "saveClasses":
      case "saveTeacherClasses":
      case "saveLopDay":
        return handleSaveClasses(payload.taiKhoan || payload.tai_khoan, payload.lopDay || payload.classes || payload.lop_day);

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

      case "saveSchoolInfo":
      case "saveSchoolConfig":
        return handleSaveSchoolInfo(payload);

      case "getSchoolInfo":
        return jsonResponse({
          success: true,
          schoolInfo: getSchoolInfo(SpreadsheetApp.getActiveSpreadsheet(), payload.taiKhoan || payload.tai_khoan)
        });

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

      case "getAllHoaNhapData":
        return handleGetAllHoaNhapData();

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

      case "addHoaNhapStudent":
      case "createHoaNhapStudent":
        return handleAddHoaNhapStudent(payload);

      case "updateHoaNhapStudent":
      case "editHoaNhapStudent":
        return handleUpdateHoaNhapStudent(payload);

      case "deleteHoaNhapStudent":
        return handleDeleteHoaNhapStudent(payload);

      case "getHoaNhapData":
        return handleGetHoaNhapData(payload.taiKhoan || payload.tai_khoan);

      case "saveHoaNhapData":
        return handleSaveHoaNhapData(payload.taiKhoan || payload.tai_khoan, payload.dataJson || payload.data_json, payload.isAdmin);

      case "getGdtcData":
      case "get_gdtc_data":
        return handleGetGdtcData(payload.taiKhoan || payload.tai_khoan);

      case "saveGdtcData":
      case "save_gdtc_data":
        return handleSaveGdtcData(payload.taiKhoan || payload.tai_khoan, payload.dataJson || payload.data_json, payload.isAdmin);

      case "getAllGdtcData":
      case "get_all_gdtc_data":
        return handleGetAllGdtcData();

      case "syncDataGdtc":
      case "syncGdtc":
        return jsonResponse(syncDataGdtcWithData(true));

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
  const s = String(val).trim();
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    return ("0" + isoMatch[3]).slice(-2) + "/" + ("0" + isoMatch[2]).slice(-2) + "/" + isoMatch[1];
  }
  return s;
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
  return r === "admin" || r === "quantri" || r === "quản trị" || r === "superadmin" ||
         r.includes("admin") || r.includes("quản trị") || r.includes("quan tri");
}

function isRoleBgh(role) {
  if (!role) return false;
  const r = String(role).trim().toLowerCase();
  return r === "bgh" || r === "ban giám hiệu" || r === "bangiamhieu" ||
         r.includes("bgh") || r.includes("giám hiệu") || r.includes("giam hieu") ||
         r.includes("hiệu trưởng") || r.includes("hieu truong") || r.includes("cbql") ||
         r === "ht" || r === "pht";
}

function isRoleAdmin(role) {
  return isSuperAdmin(role) || isRoleBgh(role);
}

function isRoleGv(teacherOrRole, username) {
  let role = "";
  let tk = "";
  let ten = "";
  if (typeof teacherOrRole === 'object' && teacherOrRole !== null) {
    role = teacherOrRole.quyen || teacherOrRole.vaiTro || "";
    tk = teacherOrRole.taiKhoan || teacherOrRole.rawTaiKhoan || teacherOrRole.teacherTk || "";
    ten = teacherOrRole.tenGv || teacherOrRole.teacherName || "";
  } else {
    role = teacherOrRole || "";
    tk = username || "";
  }
  const cleanTk = String(tk || "").trim().toLowerCase().replace(/^'+/, "");
  if (cleanTk === "admin" || cleanTk === "blt" || cleanTk === "bgh" || cleanTk === "quantri") return false;

  // Nếu có danh sách adminTeachersList, kiểm tra chính xác qua tài khoản hoặc họ tên
  if (typeof adminTeachersList !== 'undefined' && Array.isArray(adminTeachersList) && adminTeachersList.length > 0) {
    const found = adminTeachersList.find(t => t && (
      (cleanTk && isUsernameMatch(t.taiKhoan, cleanTk)) ||
      (role && String(t.tenGv || '').trim().toLowerCase() === String(role).trim().toLowerCase()) ||
      (ten && String(t.tenGv || '').trim().toLowerCase() === String(ten).trim().toLowerCase())
    ));
    if (found) {
      const fTk = String(found.taiKhoan || found.rawTaiKhoan || '').trim().toLowerCase().replace(/^'+/, '');
      if (fTk === 'admin' || fTk === 'blt' || fTk === 'bgh' || fTk === 'quantri') return false;
      const fRole = String(found.quyen || found.vaiTro || '').trim().toLowerCase();
      if (isSuperAdmin(fRole) || isRoleBgh(fRole) || isRoleAdmin(fRole)) return false;
      if (fRole.includes('admin') || fRole.includes('bgh') || fRole.includes('quản') || fRole.includes('giám hiệu') || fRole.includes('hiệu trưởng') || fRole.includes('cbql')) return false;
      const fTen = String(found.tenGv || '').trim().toLowerCase();
      if (fTen.includes('quản trị viên') || fTen.includes('ban giám hiệu') || fTen.includes('trụ sở chính') || fTen.includes('bình lợi trung')) return false;
      if (fRole === 'gv' || fRole === 'giáo viên' || fRole === 'giaovien' || fRole === 'teacher' || !fRole) return true;
      return false;
    }
  }

  const r = String(role || "").trim().toLowerCase();
  if (isSuperAdmin(r) || isRoleBgh(r) || isRoleAdmin(r)) return false;
  if (r.includes("admin") || r.includes("bgh") || r.includes("quản") || r.includes("giám hiệu") ||
      r.includes("hiệu trưởng") || r.includes("cbql")) return false;

  const t = String(ten || "").trim().toLowerCase();
  if (t.includes("quản trị viên") || t.includes("ban giám hiệu") || t.includes("trụ sở chính") || t.includes("bình lợi trung")) return false;

  if (r === "gv" || r === "giáo viên" || r === "giaovien" || r === "teacher") return true;
  if (!r) return true;
  return false;
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
  const lastCol = Math.max(6, sheetData.getLastColumn());
  const header = sheetData.getRange(1, 1, 1, lastCol).getValues()[0];
  let colTk = 0;
  let colTenGv = 1;
  let colNgaySinh = -1;
  let colQuyen = 2;
  let colMatKhau = 3;
  let colLopDay = -1;
  let colPhuong = -1;

  let colVersion = -1;
  for (let c = 0; c < header.length; c++) {
    const h = String(header[c] || "").trim().toLowerCase();
    if (h.includes("tài khoản") || h === "tk") colTk = c;
    else if (h.includes("phường") || h.includes("phuong") || h.includes("ubnd")) colPhuong = c;
    else if (h.includes("tên") || h.includes("họ và tên")) colTenGv = c;
    else if (h.includes("ngày sinh") || h.includes("ngaysinh") || h.includes("sinh") || h.includes("dob")) colNgaySinh = c;
    else if (h.includes("quyền") || h.includes("quyen") || h.includes("role")) colQuyen = c;
    else if (h.includes("mật khẩu") || h.includes("matkhau") || h.includes("mk") || h.includes("pass")) colMatKhau = c;
    else if (h.includes("lớp dạy") || h.includes("lop day") || h.includes("lopday") || h === "lớp" || h === "lop") colLopDay = c;
    else if (h.includes("version") || h.includes("verson") || h.includes("phiên bản") || h.includes("phien ban")) colVersion = c;
  }
  if (colVersion === -1) {
    colVersion = 6; // Cột G (cột thứ 7, 0-based index 6)
    try {
      const g1Val = String(sheetData.getRange(1, 7).getValue() || "").trim();
      if (!g1Val) {
        sheetData.getRange(1, 7).setValue("VERSON").setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff");
        sheetData.setColumnWidth(7, 120);
        sheetData.getRange("G:G").setNumberFormat("@");
      }
    } catch (e) {}
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
      if (colLopDay !== -1 && colLopDay >= colNgaySinh) colLopDay++;
    } catch (e) {
      if (header.length >= 5) {
        colNgaySinh = 2;
        colQuyen = 3;
        colMatKhau = 4;
      }
    }
  }

  return {
    colTk: colTk,
    colTenGv: colTenGv,
    colNgaySinh: colNgaySinh,
    colQuyen: colQuyen,
    colMatKhau: colMatKhau,
    colLopDay: (typeof colLopDay === 'number' && !isNaN(colLopDay)) ? colLopDay : -1,
    colPhuong: colPhuong,
    colVersion: colVersion
  };
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
    sheetHN.appendRow(["TÊN HỌC SINH", "NGÀY SINH", "LỚP", "LOẠI HÒA NHẬP", "MỨC ĐỘ", "THỜI GIAN"]);
    const headerRange = sheetHN.getRange(1, 1, 1, 6);
    headerRange.setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
    sheetHN.setColumnWidth(1, 200);
    sheetHN.setColumnWidth(2, 120);
    sheetHN.setColumnWidth(3, 90);
    sheetHN.setColumnWidth(4, 220);
    sheetHN.setColumnWidth(5, 110);
    sheetHN.setColumnWidth(6, 130);
    sheetHN.getRange("B:B").setNumberFormat("@");

    // Thêm học sinh mẫu ban đầu: có cột Mức độ và Thời gian công nhận
    sheetHN.appendRow(["Nguyễn Văn An", "15/04/2012", "6A1", "Khuyết tật phát triển trí tuệ", "Nhẹ", ""]);
    sheetHN.appendRow(["Trần Thị Bình", "20/09/2011", "7A2", "Khuyết tật học tập", "Nhẹ", ""]);
    sheetHN.appendRow(["Lê Hoàng Cường", "05/11/2010", "8A3", "Khuyết tật vận động nhẹ", "Nhẹ", "Tuần 8"]);
    sheetHN.getRange(2, 2, 3, 1).setNumberFormat("@");
  } else {
    // Tự động kiểm tra tiêu đề dòng 1 và thêm cột MỨC ĐỘ & THỜI GIAN nếu còn thiếu
    const maxCols = Math.max(4, sheetHN.getLastColumn());
    const headerVals = sheetHN.getRange(1, 1, 1, maxCols).getValues()[0].map(h => String(h || "").trim().toLowerCase());
    const hasMucDo = headerVals.some(h => h.includes("mức") || h.includes("muc"));
    const hasThoiGian = headerVals.some(h => h.includes("thời gian") || h.includes("tuần") || h.includes("tuan"));

    if (!hasMucDo) {
      let colIdx = 5;
      while (colIdx <= sheetHN.getLastColumn() && sheetHN.getRange(1, colIdx).getValue()) {
        colIdx++;
      }
      sheetHN.getRange(1, colIdx).setValue("MỨC ĐỘ").setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
      sheetHN.setColumnWidth(colIdx, 110);
    }
    if (!hasThoiGian) {
      let colIdx = 6;
      while (colIdx <= sheetHN.getLastColumn() && sheetHN.getRange(1, colIdx).getValue()) {
        colIdx++;
      }
      sheetHN.getRange(1, colIdx).setValue("THỜI GIAN").setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
      sheetHN.setColumnWidth(colIdx, 130);
    }
  }
  return sheetHN;
}

/**
 * ⭐️ HÀM TẠO HOẶC CẬP NHẬT CỘT MỨC ĐỘ & THỜI GIAN CHO SHEET "HOA NHAP" ⭐️
 * 👉 Trong giao diện Google Apps Script:
 * 1. Ở thanh công cụ trên cùng, chọn tên hàm: "capNhatCotSheetHoaNhap" (hoặc "initHoaNhapSheet")
 * 2. Nhấn nút "Chạy" (Run ▶️)
 * => Hệ thống sẽ tự động thêm 2 cột: Cột E (MỨC ĐỘ) và Cột F (THỜI GIAN) vào dòng 1 của sheet HOA NHAP
 * => Bảo toàn 100% dữ liệu học sinh hiện có, không làm mất hay xáo trộn dữ liệu.
 */
function capNhatCotSheetHoaNhap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = initHoaNhapSheet(ss);
  SpreadsheetApp.flush();
  Logger.log("✅ Đã cập nhật thành công các cột MỨC ĐỘ và THỜI GIAN cho sheet HOA NHAP!");
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
      // Chỉ đọc đúng cột 3 (JSON) của Sheet dulieu_hoanhap, không lấy cột 2 (Tên GV)
      let jsonContent = "";
      if (duLieuLastCol >= 3 && duLieuValues[j][2] !== undefined && duLieuValues[j][2] !== null) {
        const cVal = String(duLieuValues[j][2]).trim();
        if (cVal.startsWith("{") || cVal.startsWith("[")) {
          jsonContent = cVal;
        }
      }
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
    const cleanTk = normTk.replace(/^'+/, "").toLowerCase();
    const quyen = String(rowRaw[cols.colQuyen] || "").trim().toLowerCase();
    // Bỏ qua tài khoản admin, không đưa vào danh sách kê khai dạy hòa nhập
    if (cleanTk === "admin" || cleanTk === "blt" || !isRoleGv(quyen, cleanTk)) continue;
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
  const lastCol = Math.max(6, sheetHN.getLastColumn());
  const header = sheetHN.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || "").trim().toLowerCase());

  let colTen = 0, colNgaySinh = 1, colLop = 2, colLoai = 3, colMucDo = -1, colThoiGian = -1;
  for (let c = 0; c < header.length; c++) {
    const h = header[c];
    if (h.includes("tên") || h.includes("họ và tên") || h.includes("học sinh")) colTen = c;
    else if (h.includes("lớp") || h.includes("lop")) colLop = c;
    else if (h.includes("năm sinh") || h.includes("ngày sinh") || h.includes("sinh") || h.includes("namsinh") || h.includes("ngaysinh")) colNgaySinh = c;
    else if (h.includes("khuyết tật") || h.includes("loại") || h.includes("dạng") || h.includes("hoa nhap")) colLoai = c;
    else if (h.includes("mức độ") || h.includes("muc do") || h.includes("mức")) colMucDo = c;
    else if (h.includes("thời gian") || h.includes("thoi gian") || h.includes("tuần") || h.includes("tuan") || h.includes("công nhận")) colThoiGian = c;
  }
  if (colMucDo === -1 && lastCol >= 5) colMucDo = 4;
  if (colThoiGian === -1 && lastCol >= 6) colThoiGian = 5;

  const vals = sheetHN.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const disp = sheetHN.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  const list = [];
  for (let i = 0; i < vals.length; i++) {
    const tenHs = String(disp[i][colTen] || vals[i][colTen] || "").trim();
    if (!tenHs) continue;
    const vDate = vals[i][colNgaySinh];
    const dStr = String(disp[i][colNgaySinh] || "").trim();
    let fullNgaySinh = "";
    if (vDate instanceof Date) {
      fullNgaySinh = formatBirthDate(vDate);
    } else if (dStr) {
      fullNgaySinh = formatBirthDate(dStr);
    } else if (vDate) {
      fullNgaySinh = formatBirthDate(vDate);
    }
    let namSinh = "";
    if (fullNgaySinh) {
      const yearMatch = fullNgaySinh.match(/\d{4}/);
      namSinh = yearMatch ? yearMatch[0] : fullNgaySinh;
    }
    const mucDoVal = (colMucDo >= 0 && colMucDo < lastCol) ? String(disp[i][colMucDo] || vals[i][colMucDo] || "").trim() : "";
    const thoiGianVal = (colThoiGian >= 0 && colThoiGian < lastCol) ? String(disp[i][colThoiGian] || vals[i][colThoiGian] || "").trim() : "";

    list.push({
      tenHs: tenHs,
      ngaySinh: fullNgaySinh || namSinh,
      namSinh: namSinh || fullNgaySinh,
      lop: String(disp[i][colLop] || vals[i][colLop] || "").trim(),
      loaiHoaNhap: String(disp[i][colLoai] || vals[i][colLoai] || "Khuyết tật").trim(),
      dangKhuyetTat: String(disp[i][colLoai] || vals[i][colLoai] || "Khuyết tật").trim(),
      mucDo: mucDoVal || "Nhẹ",
      thoiGian: thoiGianVal || ""
    });
  }
  return jsonResponse({ success: true, list: list });
}

/**
 * THÊM HỌC SINH HÒA NHẬP MỚI VÀO SHEET "HOA NHAP" (PHÂN HỆ 2)
 * payload: { tenHs, lop, ngaySinh, dangKhuyetTat, mucDo, thoiGian, position }
 */
function handleAddHoaNhapStudent(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetHN = initHoaNhapSheet(ss);

    const tenHs = String(payload.tenHs || payload.ten_hs || "").trim();
    if (!tenHs) {
      return jsonResponse({ success: false, message: "Họ và tên học sinh không được để trống!" });
    }
    const lop = String(payload.lop || "").trim().toUpperCase();
    const ngaySinh = String(payload.ngaySinh || payload.namSinh || payload.ngay_sinh || "").trim();
    const dangKhuyetTat = String(payload.dangKhuyetTat || payload.loaiHoaNhap || payload.khuyetTat || "Khuyết tật").trim();
    const mucDo = String(payload.mucDo || payload.muc_do || "Nhẹ").trim();
    const thoiGian = String(payload.thoiGian || payload.thoi_gian || "").trim();

    const lastRow = sheetHN.getLastRow();
    const totalStudents = Math.max(0, lastRow - 1);

    // Vị trí chèn (position: số thứ tự STT, từ 1 đến totalStudents + 1)
    let pos = parseInt(payload.position || payload.stt, 10);
    let targetRow = lastRow + 1;

    if (!isNaN(pos) && pos >= 1 && pos <= totalStudents) {
      targetRow = pos + 1;
      sheetHN.insertRowBefore(targetRow);
    } else {
      targetRow = lastRow + 1;
    }

    const rowData = [tenHs, ngaySinh, lop, dangKhuyetTat, mucDo, thoiGian];
    sheetHN.getRange(targetRow, 1, 1, 6).setValues([rowData]);
    sheetHN.getRange(targetRow, 2).setNumberFormat("@");

    // Lấy lại danh sách mới nhất sau khi thêm
    const freshRes = handleGetHoaNhapStudents();
    let freshList = [];
    try {
      const parsed = JSON.parse(freshRes.getContent());
      if (parsed && Array.isArray(parsed.list)) freshList = parsed.list;
    } catch (e) {}

    return jsonResponse({
      success: true,
      message: "Thêm học sinh hòa nhập vào Google Sheet thành công!",
      list: freshList
    });
  } catch (err) {
    return jsonResponse({ success: false, message: "Lỗi thêm học sinh: " + err.toString() });
  }
}

/**
 * CẬP NHẬT THÔNG TIN HỌC SINH HÒA NHẬP TRONG SHEET "HOA NHAP" (PHÂN HỆ 2)
 * payload: { stt, index, oldTenHs, oldLop, tenHs, lop, ngaySinh, dangKhuyetTat, mucDo, thoiGian, newPosition }
 */
function handleUpdateHoaNhapStudent(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetHN = initHoaNhapSheet(ss);
    const lastRow = sheetHN.getLastRow();
    if (lastRow <= 1) {
      return jsonResponse({ success: false, message: "Sheet HOA NHAP đang rỗng, không thể cập nhật!" });
    }

    const tenHs = String(payload.tenHs || payload.ten_hs || "").trim();
    if (!tenHs) {
      return jsonResponse({ success: false, message: "Họ và tên học sinh không được để trống!" });
    }
    const lop = String(payload.lop || "").trim().toUpperCase();
    const ngaySinh = String(payload.ngaySinh || payload.namSinh || payload.ngay_sinh || "").trim();
    const dangKhuyetTat = String(payload.dangKhuyetTat || payload.loaiHoaNhap || payload.khuyetTat || "Khuyết tật").trim();
    const mucDo = String(payload.mucDo || payload.muc_do || "Nhẹ").trim();
    const thoiGian = String(payload.thoiGian || payload.thoi_gian || "").trim();

    let targetRow = -1;
    let stt = parseInt(payload.stt !== undefined ? payload.stt : payload.index, 10);
    if (!isNaN(stt) && stt >= 1 && (stt + 1) <= lastRow) {
      targetRow = stt + 1;
    }

    const oldTen = String(payload.oldTenHs || "").trim().toLowerCase();
    const oldLop = String(payload.oldLop || "").trim().toLowerCase();

    if (targetRow === -1 || oldTen) {
      const vals = sheetHN.getRange(2, 1, lastRow - 1, 3).getValues();
      for (let i = 0; i < vals.length; i++) {
        const rowTen = String(vals[i][0] || "").trim().toLowerCase();
        const rowLop = String(vals[i][2] || "").trim().toLowerCase();
        if (oldTen && rowTen === oldTen && (!oldLop || rowLop === oldLop)) {
          targetRow = i + 2;
          break;
        }
      }
    }

    if (targetRow < 2 || targetRow > lastRow) {
      return jsonResponse({ success: false, message: "Không tìm thấy học sinh cần chỉnh sửa trong Sheet HOA NHAP!" });
    }

    const rowData = [tenHs, ngaySinh, lop, dangKhuyetTat, mucDo, thoiGian];
    sheetHN.getRange(targetRow, 1, 1, 6).setValues([rowData]);
    sheetHN.getRange(targetRow, 2).setNumberFormat("@");

    // Nếu người dùng chọn đổi số thứ tự (newPosition):
    let newPos = parseInt(payload.newPosition, 10);
    const totalStudents = lastRow - 1;
    if (!isNaN(newPos) && newPos >= 1 && newPos <= totalStudents && (newPos + 1) !== targetRow) {
      const destRow = newPos + 1;
      const moveVals = sheetHN.getRange(targetRow, 1, 1, 6).getValues();
      sheetHN.deleteRow(targetRow);
      if (destRow > targetRow) {
        const actualDest = destRow - 1;
        if (actualDest >= sheetHN.getLastRow()) {
          sheetHN.appendRow(moveVals[0]);
        } else {
          sheetHN.insertRowBefore(actualDest + 1);
          sheetHN.getRange(actualDest + 1, 1, 1, 6).setValues(moveVals);
        }
      } else {
        sheetHN.insertRowBefore(destRow);
        sheetHN.getRange(destRow, 1, 1, 6).setValues(moveVals);
      }
      sheetHN.getRange("B:B").setNumberFormat("@");
    }

    const freshRes = handleGetHoaNhapStudents();
    let freshList = [];
    try {
      const parsed = JSON.parse(freshRes.getContent());
      if (parsed && Array.isArray(parsed.list)) freshList = parsed.list;
    } catch (e) {}

    return jsonResponse({
      success: true,
      message: "Cập nhật thông tin học sinh hòa nhập thành công!",
      list: freshList
    });
  } catch (err) {
    return jsonResponse({ success: false, message: "Lỗi cập nhật học sinh: " + err.toString() });
  }
}

/**
 * XÓA HỌC SINH HÒA NHẬP KHỎI SHEET "HOA NHAP" (PHÂN HỆ 2)
 * payload: { stt, index, tenHs, lop }
 */
function handleDeleteHoaNhapStudent(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetHN = initHoaNhapSheet(ss);
    const lastRow = sheetHN.getLastRow();
    if (lastRow <= 1) {
      return jsonResponse({ success: false, message: "Sheet HOA NHAP đang rỗng!" });
    }

    let targetRow = -1;
    let stt = parseInt(payload.stt !== undefined ? payload.stt : payload.index, 10);
    if (!isNaN(stt) && stt >= 1 && (stt + 1) <= lastRow) {
      targetRow = stt + 1;
    }

    const tenHs = String(payload.tenHs || "").trim().toLowerCase();
    const lop = String(payload.lop || "").trim().toLowerCase();

    if (targetRow === -1 || tenHs) {
      const vals = sheetHN.getRange(2, 1, lastRow - 1, 3).getValues();
      for (let i = 0; i < vals.length; i++) {
        const rowTen = String(vals[i][0] || "").trim().toLowerCase();
        const rowLop = String(vals[i][2] || "").trim().toLowerCase();
        if (tenHs && rowTen === tenHs && (!lop || rowLop === lop)) {
          targetRow = i + 2;
          break;
        }
      }
    }

    if (targetRow < 2 || targetRow > lastRow) {
      return jsonResponse({ success: false, message: "Không tìm thấy học sinh cần xóa trong danh sách!" });
    }

    sheetHN.deleteRow(targetRow);

    const freshRes = handleGetHoaNhapStudents();
    let freshList = [];
    try {
      const parsed = JSON.parse(freshRes.getContent());
      if (parsed && Array.isArray(parsed.list)) freshList = parsed.list;
    } catch (e) {}

    return jsonResponse({
      success: true,
      message: "Đã xóa học sinh khỏi danh sách hòa nhập thành công!",
      list: freshList
    });
  } catch (err) {
    return jsonResponse({ success: false, message: "Lỗi xóa học sinh: " + err.toString() });
  }
}

/**
 * LẤY DỮ LIỆU KÊ KHAI TIẾT HÒA NHẬP CỦA MỘT GIÁO VIÊN
 */
function handleGetHoaNhapData(taiKhoan) {
  if (!taiKhoan) return jsonResponse({ success: false, message: "Thiếu tài khoản!" });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetDuLieuHN = getSheetFlexible(ss, SHEET_DULIEU_HOA_NHAP, ["dulieu_hoanhap", "DULIEU_HOANHAP"]);
  if (!sheetDuLieuHN) return jsonResponse({ success: true, data: null, isSystemLocked: isSystemLocked() });
  const lastRow = sheetDuLieuHN.getLastRow();
  if (lastRow <= 1) return jsonResponse({ success: true, data: null, isSystemLocked: isSystemLocked() });
  const numCols = Math.max(2, sheetDuLieuHN.getLastColumn());
  const vals = sheetDuLieuHN.getRange(2, 1, lastRow - 1, numCols).getValues();
  const disp = sheetDuLieuHN.getRange(2, 1, lastRow - 1, numCols).getDisplayValues();
  for (let i = 0; i < vals.length; i++) {
    const tk = String(disp[i][0] || vals[i][0] || "").trim();
    if (isUsernameMatch(tk, taiKhoan)) {
      const jsonVal = numCols >= 3 ? (vals[i][2] || vals[i][1] || null) : (vals[i][1] || null);
      return jsonResponse({ success: true, data: jsonVal, isSystemLocked: isSystemLocked() });
    }
  }
  return jsonResponse({ success: true, data: null, isSystemLocked: isSystemLocked() });
}

/**
 * LƯU DỮ LIỆU KÊ KHAI TIẾT HÒA NHẬP CỦA GIÁO VIÊN VÀO ĐÚNG DÒNG CỐ ĐỊNH
 */

/**
 * LẤY TOÀN BỘ DỮ LIỆU KÊ KHAI DẠY HÒA NHẬP CỦA TẤT CẢ GIÁO VIÊN
 */
function handleGetAllHoaNhapData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const map = {};
  try {
    const sheetDuLieuHN = getSheetFlexible(ss, SHEET_DULIEU_HOA_NHAP, ["dulieu_hoanhap", "DULIEU_HOANHAP"]);
    if (sheetDuLieuHN && sheetDuLieuHN.getLastRow() > 1) {
      const hnumCols = Math.max(3, sheetDuLieuHN.getLastColumn());
      const hnVals = sheetDuLieuHN.getRange(2, 1, sheetDuLieuHN.getLastRow() - 1, hnumCols).getValues();
      const hnDisp = sheetDuLieuHN.getRange(2, 1, sheetDuLieuHN.getLastRow() - 1, hnumCols).getDisplayValues();
      for (let h = 0; h < hnVals.length; h++) {
        const hRawTk = String(hnVals[h][0] || "").trim();
        const hDispTk = String(hnDisp[h][0] || "").trim();
        const hNormTk = normalizeUsername(hDispTk || hRawTk);
        const cleanRaw = hRawTk.replace(/^'+/, "").toLowerCase();
        const cleanNorm = hNormTk.replace(/^'+/, "").toLowerCase();
        // Bỏ qua tài khoản admin / BGH, không đưa vào danh sách giáo viên dạy hòa nhập
        if (cleanRaw === 'admin' || cleanNorm === 'admin' || cleanRaw === 'blt' || cleanNorm === 'blt' || cleanRaw === 'bgh' || cleanNorm === 'bgh') continue;
        let hJsonStr = "";
        if (hnumCols >= 3 && hnVals[h][2] !== undefined && hnVals[h][2] !== null) {
          const rawVal = String(hnVals[h][2]).trim();
          if (rawVal.startsWith("{") || rawVal.startsWith("[")) {
            hJsonStr = rawVal;
          }
        }
        if (hJsonStr) {
          if (cleanRaw) map[cleanRaw] = hJsonStr;
          if (cleanNorm) map[cleanNorm] = hJsonStr;
          const stripped = cleanNorm.replace(/^0+/, "");
          if (stripped) map[stripped] = hJsonStr;
        }
      }
    }
    return jsonResponse({ success: true, data: map, isSystemLocked: isSystemLocked() });
  } catch (err) {
    return jsonResponse({ success: false, message: "Lỗi đọc dữ liệu hòa nhập: " + err.message });
  }
}

function handleSaveHoaNhapData(taiKhoan, dataJson, isAdmin) {
  if (!taiKhoan) return jsonResponse({ success: false, message: "Thiếu tài khoản!" });

  const cleanTk = String(taiKhoan).trim().toLowerCase();
  // Tài khoản Admin / Quản trị / BGH không lưu vào bảng kê khai dạy hòa nhập
  if (cleanTk === "admin" || cleanTk === "blt" || cleanTk === "bgh" || cleanTk === "quantri") {
    return jsonResponse({ success: true, message: "Tài khoản Quản trị / BGH không tham gia kê khai tiết dạy." });
  }

  // Kiểm tra nếu hệ thống đang bị khóa kê khai toàn trường (trừ tài khoản admin)
  const isUserAdmin = isAdmin === true;
  if (isSystemLocked() && !isUserAdmin) {
    return jsonResponse({
      success: false,
      message: "Hệ thống hiện đang bị KHÓA KÊ KHAI bởi Ban giám hiệu nhà trường. Quý thầy cô chỉ có thể xem số liệu, không thể lưu dữ liệu mới lúc này!"
    });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetDuLieuHN = getSheetFlexible(ss, SHEET_DULIEU_HOA_NHAP, ["dulieu_hoanhap", "DULIEU_HOANHAP"]);
  if (!sheetDuLieuHN) {
    syncDuLieuHoaNhapWithData(true);
    sheetDuLieuHN = getSheetFlexible(ss, SHEET_DULIEU_HOA_NHAP, ["dulieu_hoanhap", "DULIEU_HOANHAP"]);
  }

  const lastRow = sheetDuLieuHN.getLastRow();
  const matchingRows = [];
  if (lastRow > 1) {
    const vals = sheetDuLieuHN.getRange(2, 1, lastRow - 1, 1).getValues();
    const disp = sheetDuLieuHN.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < vals.length; i++) {
      const tk = String(disp[i][0] || vals[i][0] || "").trim();
      if (isUsernameMatch(tk, taiKhoan)) {
        matchingRows.push(i + 2); // Chỉ số dòng thực tế trong sheet
      }
    }
  }

  const normTk = normalizeUsername(taiKhoan);
  const cellTk = /^\d+$/.test(normTk) ? "'" + normTk : normTk;

  if (matchingRows.length === 0) {
    // Tìm tên giáo viên từ Sheet DATA để điền vào Cột B
    let tenGv = "";
    const sheetData = ss.getSheetByName(SHEET_DATA);
    if (sheetData) {
      const dVals = sheetData.getDataRange().getValues();
      const dDisp = sheetData.getDataRange().getDisplayValues();
      const cols = getSheetDataCols(sheetData);
      for (let r = 1; r < dVals.length; r++) {
        const sTk = String(dDisp[r][cols.colTk] || dVals[r][cols.colTk] || "").trim();
        if (isUsernameMatch(sTk, taiKhoan)) {
          tenGv = String(dDisp[r][cols.colTenGv] || dVals[r][cols.colTenGv] || "").trim();
          break;
        }
      }
    }
    sheetDuLieuHN.appendRow([cellTk, tenGv, dataJson]);
    const newRow = sheetDuLieuHN.getLastRow();
    sheetDuLieuHN.getRange(newRow, 1).setNumberFormat("@");
  } else {
    // Cập nhật dòng đầu tiên với dữ liệu JSON mới nhất
    const targetRow = matchingRows[0];
    sheetDuLieuHN.getRange(targetRow, 1).setNumberFormat("@").setValue(cellTk);
    sheetDuLieuHN.getRange(targetRow, 3).setValue(dataJson);

    // XÓA TẤT CẢ các dòng cũ trùng lặp của cùng tài khoản này (nếu có)
    // Duyệt ngược từ dưới lên để không làm xáo trộn số hàng
    for (let m = matchingRows.length - 1; m >= 1; m--) {
      sheetDuLieuHN.deleteRow(matchingRows[m]);
    }
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

  // 1. Đọc dữ liệu JSON và LỚP DẠY hiện có trong Sheet DULIEU (nếu có) vào bộ nhớ tạm
  const existingDataMap = {};
  const duLieuLastRow = sheetDuLieu.getLastRow();
  const duLieuLastCol = Math.max(sheetDuLieu.getLastColumn(), 4);
  if (duLieuLastRow > 1) {
    const duLieuValues = sheetDuLieu.getRange(1, 1, duLieuLastRow, duLieuLastCol).getValues();
    const duLieuDisplay = sheetDuLieu.getRange(1, 1, duLieuLastRow, duLieuLastCol).getDisplayValues();
    for (let j = 1; j < duLieuValues.length; j++) {
      const rawTk = String(duLieuValues[j][0] || "").trim();
      const dispTk = String(duLieuDisplay[j][0] || "").trim();
      const normTk = normalizeUsername(dispTk || rawTk);
      const jsonContent = duLieuValues[j][2];
      const lopDayContent = duLieuDisplay[j][3] || duLieuValues[j][3] || "";
      const record = { json: jsonContent || "", lopDay: lopDayContent || "" };
      if (normTk) existingDataMap[normTk.toLowerCase()] = record;
      if (rawTk) existingDataMap[rawTk.toLowerCase()] = record;
      const stripped = normTk.replace(/^0+/, "").toLowerCase();
      if (stripped) existingDataMap[stripped] = record;
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

    // Lấy dữ liệu JSON và Lớp dạy đã kê khai trước đó (nếu có)
    const savedRecord = existingDataMap[normTk.toLowerCase()] || 
                        existingDataMap[rawTk.toLowerCase()] || 
                        existingDataMap[normTk.replace(/^0+/, "").toLowerCase()] || { json: "", lopDay: "" };

    const cellTk = /^\d+$/.test(normTk) ? "'" + normTk : normTk;
    teacherRows.push([cellTk, tenGv, savedRecord.json || "", savedRecord.lopDay || ""]);
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
  sheetDuLieu.appendRow(["TK", "TÊN GV", "DỮ LIỆU GV NHẬP DANG JSON", "LỚP DẠY"]);
  
  // Định dạng tiêu đề
  const headerRange = sheetDuLieu.getRange(1, 1, 1, 4);
  headerRange.setFontWeight("bold").setBackground("#0d9488").setFontColor("#ffffff");
  sheetDuLieu.setColumnWidth(1, 150);
  sheetDuLieu.setColumnWidth(2, 220);
  sheetDuLieu.setColumnWidth(3, 400);
  sheetDuLieu.setColumnWidth(4, 250);

  // Ghi toàn bộ danh sách giáo viên theo đúng thứ tự
  const dataRange = sheetDuLieu.getRange(2, 1, teacherRows.length, 4);
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

/**
 * LẤY THÔNG TIN ĐƠN VỊ: TÊN TRƯỜNG & TÊN PHƯỜNG
 * Ưu tiên đọc từ ScriptProperties, nếu chưa có sẽ tra cứu từ dòng Admin trong Sheet DATA
 */
function getSchoolInfo(ss, taiKhoan) {
  let tenTruong = "";
  let tenPhuong = "";

  try {
    const props = PropertiesService.getScriptProperties();
    tenTruong = props.getProperty("SCHOOL_NAME") || "";
    tenPhuong = props.getProperty("SCHOOL_WARD") || "";
  } catch (e) {}

  if (!tenTruong || !tenPhuong) {
    try {
      const sheetData = ss.getSheetByName(SHEET_DATA);
      if (sheetData && sheetData.getLastRow() >= 2) {
        const cols = getSheetDataCols(sheetData);
        const dVals = sheetData.getRange(2, 1, sheetData.getLastRow() - 1, sheetData.getLastColumn()).getValues();
        const dDisp = sheetData.getRange(2, 1, sheetData.getLastRow() - 1, sheetData.getLastColumn()).getDisplayValues();
        for (let r = 0; r < dVals.length; r++) {
          const rowTk = String(dDisp[r][cols.colTk] || dVals[r][cols.colTk] || "").trim();
          const isMatch = taiKhoan ? isUsernameMatch(rowTk, taiKhoan) : isSuperAdmin(dVals[r][cols.colQuyen]);
          if (isMatch || (r === 0 && isSuperAdmin(dVals[r][cols.colQuyen]))) {
            if (!tenTruong) tenTruong = String(dDisp[r][cols.colTenGv] || dVals[r][cols.colTenGv] || "").trim();
            if (!tenPhuong && cols.colPhuong !== -1) {
              tenPhuong = String(dDisp[r][cols.colPhuong] || dVals[r][cols.colPhuong] || "").trim();
            }
            if (tenTruong && tenPhuong) break;
          }
        }
      }
    } catch (e) {}
  }

  return {
    tenTruong: tenTruong || "TRƯỜNG THCS AN NHƠN",
    tenPhuong: tenPhuong || "ỦY BAN NHÂN DÂN PHƯỜNG AN NHƠN"
  };
}

/**
 * XỬ LÝ LƯU THÔNG TIN ĐƠN VỊ (TÊN PHƯỜNG & TÊN TRƯỜNG)
 * Ghi vào ScriptProperties và cập nhật dòng Admin trong Sheet DATA
 */
function handleSaveSchoolInfo(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const taiKhoan = String(payload.taiKhoan || payload.tai_khoan || "admin").trim();
  const tenTruong = String(payload.tenTruong || payload.ten_truong || "").trim();
  const tenPhuong = String(payload.tenPhuong || payload.ten_phuong || payload.phuong || "").trim();

  try {
    const props = PropertiesService.getScriptProperties();
    if (tenTruong) props.setProperty("SCHOOL_NAME", tenTruong);
    if (tenPhuong) props.setProperty("SCHOOL_WARD", tenPhuong);
  } catch (e) {}

  try {
    const sheetData = ss.getSheetByName(SHEET_DATA);
    if (sheetData) {
      const cols = getSheetDataCols(sheetData);
      const numRows = sheetData.getLastRow();
      if (numRows >= 2) {
        const dVals = sheetData.getRange(2, 1, numRows - 1, sheetData.getLastColumn()).getValues();
        const dDisp = sheetData.getRange(2, 1, numRows - 1, sheetData.getLastColumn()).getDisplayValues();
        for (let r = 0; r < dVals.length; r++) {
          const rowTk = String(dDisp[r][cols.colTk] || dVals[r][cols.colTk] || "").trim();
          if (isUsernameMatch(rowTk, taiKhoan) || (isSuperAdmin(dVals[r][cols.colQuyen]) && r === 0)) {
            const rowIdx = r + 2;
            if (tenTruong) {
              sheetData.getRange(rowIdx, cols.colTenGv + 1).setValue(tenTruong);
            }
            if (cols.colPhuong !== -1 && tenPhuong) {
              sheetData.getRange(rowIdx, cols.colPhuong + 1).setNumberFormat("@").setValue(tenPhuong);
            }
            break;
          }
        }
      }
    }
  } catch (e) {}

  return jsonResponse({
    success: true,
    message: "Đã lưu thông tin Tên Trường và Phường thành công!",
    schoolInfo: {
      tenTruong: tenTruong,
      tenPhuong: tenPhuong
    }
  });
}

function handleLogin(taiKhoan, matKhau, clientVersion) {
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
          quyen: rowQuyen || "gv",
          isDefaultPassword: (rowMk === '1234')
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

  // Nếu là tài khoản quản trị (Admin), ghi nhận phiên bản vào Cột G và tra cứu Sheet HUB_SERVER
  let matchedSchool = null;
  let versionInfo = null;
  if (isSuperAdmin(foundUser.quyen)) {
    try {
      versionInfo = recordAndCheckAdminVersion(tkClean, clientVersion || BACKEND_VERSION);
    } catch (vErr) {
      Logger.log("Lỗi ghi nhận phiên bản admin: " + vErr);
    }

    try {
      const sheetHub = ss.getSheetByName(SHEET_HUB_SERVER);
      if (sheetHub) {
        const hubLastRow = sheetHub.getLastRow();
        if (hubLastRow >= 2) {
          const numCols = Math.max(sheetHub.getLastColumn(), 6);
          const hubValues = sheetHub.getRange(2, 1, hubLastRow - 1, numCols).getValues();
          const hubDisplay = sheetHub.getRange(2, 1, hubLastRow - 1, numCols).getDisplayValues();
          for (let k = 0; k < hubValues.length; k++) {
            const hTk = String(hubDisplay[k][0] || hubValues[k][0] || "").trim();
            const hName = String(hubDisplay[k][1] || hubValues[k][1] || "").trim();
            const col3 = String(hubDisplay[k][2] || hubValues[k][2] || "").trim();
            const col4 = String(hubDisplay[k][3] || hubValues[k][3] || "").trim();
            const col5 = String(hubDisplay[k][4] || hubValues[k][4] || "").trim();
            const col6 = String(hubDisplay[k][5] || hubValues[k][5] || "").trim();
            const hUrl = col3.startsWith("http") ? col3 : col4;
            const hPhuong = (col5 && (col5.includes("Phường") || col5.includes("phường") || col5.includes("UBND") || col5.includes("Xã") || col5.includes("Thị trấn") || !col5.includes("/"))) ? col5 : (col6 || "ỦY BAN NHÂN DÂN PHƯỜNG AN NHƠN");

            if (isUsernameMatch(hTk, tkClean) || (k === 0 && (isSuperAdmin(foundUser.quyen) || isRoleAdmin(foundUser.quyen)))) {
              matchedSchool = {
                taiKhoan: hTk,
                tenTruong: hName,
                tenPhuong: hPhuong,
                url: hUrl
              };
              break;
            }
          }
        }
      }
    } catch (hubErr) {
      Logger.log("Lỗi tra cứu HUB_SERVER khi đăng nhập admin: " + hubErr);
    }
  }

  // Thông tin trường và phường đọc trực tiếp từ HUB_SERVER
  const schoolInfo = {
    tenTruong: (matchedSchool && matchedSchool.tenTruong) ? matchedSchool.tenTruong : "Trường THCS An Nhơn",
    tenPhuong: (matchedSchool && matchedSchool.tenPhuong) ? matchedSchool.tenPhuong : "ỦY BAN NHÂN DÂN PHƯỜNG AN NHƠN"
  };

  return jsonResponse({
    success: true,
    message: "Đăng nhập thành công!",
    user: foundUser,
    schoolInfo: schoolInfo,
    data: teacherDataJson,
    isSystemLocked: isSystemLocked(),
    columnConfig: getColumnConfig(),
    matchedSchool: matchedSchool,
    backendVersion: BACKEND_VERSION,
    versionInfo: versionInfo
  });
}

/**
 * XỬ LÝ LƯU DỮ LIỆU:
 * Ghi dữ liệu JSON vào ĐÚNG DÒNG CỐ ĐỊNH của giáo viên trong Sheet DULIEU.
 * - Sheet DULIEU luôn sắp xếp các giáo viên theo đúng thứ tự của Sheet DATA.
 * - Khi giáo viên đăng nhập kê khai, chỉ cập nhật Cột B (Tên) và Cột C (JSON) tại dòng của chính giáo viên đó.
 * - Không thêm dòng bừa bãi ở cuối, không làm xáo trộn các giáo viên khác.
 */
function handleSaveData(taiKhoan, tenGv, dataJson, isAdmin, lopDay) {
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
    sheetDuLieu.appendRow(["TK", "TÊN GV", "DỮ LIỆU GV NHẬP DANG JSON", "LỚP DẠY"]);
    const duLieuHeader = sheetDuLieu.getRange(1, 1, 1, 4);
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
    if (dataJson !== undefined && dataJson !== null) {
      sheetDuLieu.getRange(targetRow, 3).setValue(jsonString);
    }
    if (lopDay !== undefined && lopDay !== null) {
      const lopDayStr = Array.isArray(lopDay) ? lopDay.join(", ") : String(lopDay).trim();
      sheetDuLieu.getRange(targetRow, 4).setValue(lopDayStr);

      // Đồng thời cập nhật vào Sheet DATA (Cột F: Lớp Dạy)
      try {
        const sheetData = ss.getSheetByName(SHEET_DATA);
        if (sheetData) {
          const cols = getSheetDataCols(sheetData);
          const targetCol = (cols.colLopDay !== -1) ? (cols.colLopDay + 1) : 6;
          sheetData.getRange(1, targetCol).setValue("Lớp Dạy").setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff");
          sheetData.getRange(1, targetCol, Math.max(sheetData.getMaxRows(), 2), 1).setNumberFormat("@");
          const dataVals = sheetData.getDataRange().getValues();
          const dataDisp = sheetData.getDataRange().getDisplayValues();
          for (let d = 1; d < dataVals.length; d++) {
            const dTk = String(dataDisp[d][cols.colTk] || dataVals[d][cols.colTk] || "").trim();
            if (isUsernameMatch(dTk, tkClean)) {
              sheetData.getRange(d + 1, targetCol).setValue(lopDayStr);
              break;
            }
          }
        }
      } catch (dataErr) {}
    }
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
 * LƯU DANH SÁCH LỚP DẠY CỦA GIÁO VIÊN VÀO CỘT D (SHEET DULIEU)
 */
function handleSaveClasses(taiKhoan, lopDay) {
  if (!taiKhoan) {
    return jsonResponse({ success: false, message: "Thiếu thông tin tài khoản để lưu lớp dạy!" });
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  if (!sheetDuLieu) {
    sheetDuLieu = ss.insertSheet(SHEET_DULIEU);
    sheetDuLieu.appendRow(["TK", "TÊN GV", "DỮ LIỆU GV NHẬP DANG JSON", "LỚP DẠY"]);
  }
  const tkClean = String(taiKhoan).trim();
  const lopDayStr = Array.isArray(lopDay) ? lopDay.join(", ") : String(lopDay || "").trim();

  let values = sheetDuLieu.getDataRange().getValues();
  let displayValues = sheetDuLieu.getDataRange().getDisplayValues();
  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    const rowTk = String(displayValues[i][0] || values[i][0] || "").trim();
    if (isUsernameMatch(rowTk, tkClean)) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    syncDuLieuWithData(true);
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

  if (targetRow !== -1) {
    sheetDuLieu.getRange(targetRow, 4).setValue(lopDayStr);

    // Đồng thời đồng bộ sang Sheet DATA (Cột F: Lớp Dạy)
    try {
      const sheetData = ss.getSheetByName(SHEET_DATA);
      if (sheetData) {
        const cols = getSheetDataCols(sheetData);
        const targetCol = (cols.colLopDay !== -1) ? (cols.colLopDay + 1) : 6;
        sheetData.getRange(1, targetCol).setValue("Lớp Dạy").setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff");
        sheetData.getRange(1, targetCol, Math.max(sheetData.getMaxRows(), 2), 1).setNumberFormat("@");
        const dataVals = sheetData.getDataRange().getValues();
        const dataDisp = sheetData.getDataRange().getDisplayValues();
        for (let d = 1; d < dataVals.length; d++) {
          const dTk = String(dataDisp[d][cols.colTk] || dataVals[d][cols.colTk] || "").trim();
          if (isUsernameMatch(dTk, tkClean)) {
            sheetData.getRange(d + 1, targetCol).setValue(lopDayStr);
            break;
          }
        }
      }
    } catch (dataErr) {
      Logger.log("Lỗi đồng bộ Sheet DATA: " + dataErr);
    }

    SpreadsheetApp.flush();
    return jsonResponse({
      success: true,
      message: 'Đã lưu lớp dạy "' + (lopDayStr || "Trống") + '" vào Cột D (Sheet DULIEU) thành công!',
      lopDay: lopDayStr
    });
  }

  return jsonResponse({
    success: false,
    message: "Không tìm thấy giáo viên trong Sheet DULIEU!"
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
  let teacherLopDay = "";
  if (sheetDuLieu) {
    const values = sheetDuLieu.getDataRange().getValues();
    const displayValues = sheetDuLieu.getDataRange().getDisplayValues();
    const tkClean = String(taiKhoan).trim();
    for (let i = 1; i < values.length; i++) {
      const rowTk = String(displayValues[i][0] || values[i][0] || "").trim();
      if (isUsernameMatch(rowTk, tkClean)) {
        teacherDataJson = values[i][2];
        if (!teacherName && values[i][1]) teacherName = values[i][1];
        teacherLopDay = displayValues[i][3] || values[i][3] || "";
        break;
      }
    }
  }

  return jsonResponse({
    success: true,
    data: teacherDataJson,
    tenGv: teacherName,
    lopDay: teacherLopDay,
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

  if (String(newPassword).length < 4) {
    return jsonResponse({ success: false, message: "Mật khẩu mới phải có ít nhất 4 ký tự!" });
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

      // Ghi mật khẩu mới vào Cột Mật khẩu (định dạng plain text để bảo toàn ký tự)
      sheetData.getRange(i + 1, cols.colMatKhau + 1).setNumberFormat("@").setValue(String(newMkClean));

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
        dataJson: duLieuValues[j][2],
        lopDay: duLieuDisplay[j][3] || duLieuValues[j][3] || ""
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

  const hoaNhapMap = {};
  try {
    const sheetDuLieuHN = getSheetFlexible(ss, SHEET_DULIEU_HOA_NHAP, ["dulieu_hoanhap", "DULIEU_HOANHAP"]);
    if (sheetDuLieuHN && sheetDuLieuHN.getLastRow() > 1) {
      const hnumCols = Math.max(3, sheetDuLieuHN.getLastColumn());
      const hnVals = sheetDuLieuHN.getRange(2, 1, sheetDuLieuHN.getLastRow() - 1, hnumCols).getValues();
      const hnDisp = sheetDuLieuHN.getRange(2, 1, sheetDuLieuHN.getLastRow() - 1, hnumCols).getDisplayValues();
      for (let h = 0; h < hnVals.length; h++) {
        const hRawTk = String(hnVals[h][0] || "").trim();
        const hDispTk = String(hnDisp[h][0] || "").trim();
        const hNormTk = normalizeUsername(hDispTk || hRawTk);
        let hJsonStr = "";
        if (hnumCols >= 3 && hnVals[h][2] !== undefined && hnVals[h][2] !== null) {
          const rawVal = String(hnVals[h][2]).trim();
          if (rawVal.startsWith("{") || rawVal.startsWith("[")) {
            hJsonStr = rawVal;
          }
        }
        const hCleanRaw = hRawTk.replace(/^'+/, "").toLowerCase();
        const hCleanNorm = hNormTk.replace(/^'+/, "").toLowerCase();
        if (hJsonStr) {
          if (hCleanRaw) hoaNhapMap[hCleanRaw] = hJsonStr;
          if (hCleanNorm) hoaNhapMap[hCleanNorm] = hJsonStr;
          const hStripped = hCleanNorm.replace(/^0+/, "");
          if (hStripped) hoaNhapMap[hStripped] = hJsonStr;
        }
      }
    }
  } catch (hnMapErr) {
    Logger.log("Lỗi đọc hoaNhapMap trong handleGetAdminSummary: " + hnMapErr);
  }

  const gdtcMap = {};
  try {
    const sheetGdtc = ss.getSheetByName(SHEET_DATA_GDTC);
    if (sheetGdtc && sheetGdtc.getLastRow() > 1) {
      const gnumCols = Math.max(3, sheetGdtc.getLastColumn());
      const gVals = sheetGdtc.getRange(2, 1, sheetGdtc.getLastRow() - 1, gnumCols).getValues();
      const gDisp = sheetGdtc.getRange(2, 1, sheetGdtc.getLastRow() - 1, gnumCols).getDisplayValues();
      for (let g = 0; g < gVals.length; g++) {
        const gRawTk = String(gVals[g][0] || "").trim();
        const gDispTk = String(gDisp[g][0] || "").trim();
        const gNormTk = normalizeUsername(gDispTk || gRawTk);
        const gJsonStr = gVals[g][2] || "";
        const gCleanRaw = gRawTk.replace(/^'+/, "").toLowerCase();
        const gCleanNorm = gNormTk.replace(/^'+/, "").toLowerCase();
        const gStripped = gCleanNorm.replace(/^0+/, "");
        const gWithZero = (/^\d{9}$/.test(gStripped)) ? ("0" + gStripped) : gStripped;
        if (gCleanRaw) gdtcMap[gCleanRaw] = gJsonStr;
        if (gCleanNorm) gdtcMap[gCleanNorm] = gJsonStr;
        if (gStripped) gdtcMap[gStripped] = gJsonStr;
        if (gWithZero) gdtcMap[gWithZero] = gJsonStr;
      }
    }
  } catch (gdtcMapErr) {
    Logger.log("Lỗi đọc gdtcMap trong handleGetAdminSummary: " + gdtcMapErr);
  }

  // Xác định xem người gọi có phải quyền BGH hay không
  let isCallerBgh = false;
  if (adminTaiKhoan) {
    const normAdminTk = normalizeUsername(adminTaiKhoan);
    for (let k = 1; k < dataUsersRaw.length; k++) {
      const rRaw = dataUsersRaw[k];
      const rDisp = dataUsersDisplay[k];
      const tkK = String(rDisp[cols.colTk] || rRaw[cols.colTk] || "").trim();
      if (isUsernameMatch(tkK, normAdminTk)) {
        const callerRole = String(rRaw[cols.colQuyen] || "gv").trim().toLowerCase();
        isCallerBgh = isRoleBgh(callerRole);
        break;
      }
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

    // Tài khoản quyền BGH sẽ KHÔNG nhìn thấy các tài khoản Admin
    if (isCallerBgh && isSuperAdmin(quyen)) {
      continue;
    }
    const matKhau = String(rowRaw[cols.colMatKhau] !== undefined ? rowRaw[cols.colMatKhau] : "").trim();

    const cleanNormTk = normTk.replace(/^'+/, "").toLowerCase();
    const cleanRawTk = rawTk.replace(/^'+/, "").toLowerCase();
    const dData = duLieuMap[cleanNormTk] || 
                  duLieuMap[cleanRawTk] || 
                  duLieuMap[cleanNormTk.replace(/^0+/, "")] || null;

    const dDataHn = hoaNhapMap[cleanNormTk] || hoaNhapMap[cleanRawTk] || hoaNhapMap[cleanNormTk.replace(/^0+/, "")] || null;
    const finalDataHn = (cleanNormTk === 'admin' || cleanRawTk === 'admin' || cleanNormTk === 'blt' || !isRoleGv(quyen, cleanNormTk)) ? null : dDataHn;

    const dDataGdtc = gdtcMap[cleanNormTk] || gdtcMap[cleanRawTk] || gdtcMap[cleanNormTk.replace(/^0+/, "")] || gdtcMap['0' + cleanNormTk.replace(/^0+/, "")] || null;
    const finalDataGdtc = (cleanNormTk === 'admin' || cleanRawTk === 'admin' || cleanNormTk === 'blt' || !isRoleGv(quyen, cleanNormTk)) ? null : dDataGdtc;

    list.push({
      taiKhoan: normTk, // Luôn trả về tài khoản đã chuẩn hóa có số 0 ở đầu!
      rawTaiKhoan: rawTk,
      tenGv: tenGv,
      ngaySinh: ngaySinh,
      quyen: quyen,
      matKhau: matKhau,
      hasData: !!dData,
      dataJson: dData ? dData.dataJson : null,
      lopDay: (cols.colLopDay !== -1 && (rowDisp[cols.colLopDay] || rowRaw[cols.colLopDay])) ? String(rowDisp[cols.colLopDay] || rowRaw[cols.colLopDay] || "").trim() : (dData ? (dData.lopDay || "") : ""),
      dataHoaNhapJson: finalDataHn || null,
      dataGdtcJson: finalDataGdtc || null
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

/**
 * =========================================================================
 * QUẢN LÝ HUB_SERVER (MÁY CHỦ TRUNG TÂM KẾT NỐI NHIỀU TRƯỜNG HỌC)
 * =========================================================================
 */

/**
 * LẤY HOẶC TẠO SHEET HUB_SERVER:
 * Cột A: TÊN TK (Tài khoản quản trị của trường)
 * Cột B: TÊN TRƯỜNG / GV (Tên trường hiển thị tại ô chọn trường đăng nhập)
 * LẤY HOẶC TẠO SHEET HUB_SERVER:
 * Cột A: TÀI KHOẢN (Tài khoản quản trị của trường)
 * Cột B: TÊN TRƯỜNG / ĐƠN VỊ (Tên trường hiển thị tại ô chọn trường đăng nhập)
 * Cột C: KHỐI LỚP (Dữ liệu khối & lớp các trường khai báo)
 * Cột D: ĐỊA CHỈ URL WEB APP (Web App URL của trường)
 * Cột E: NGÀY CẬP NHẬT
 */
/**
 * ÁNH XẠ CHỈ MỤC CÁC CỘT CỦA SHEET HUB_SERVER THEO ĐÚNG TIÊU ĐỀ HÀNG 1
 * Trả về chỉ mục 1-based để dùng cho sheet.getRange(row, col)
 */
function getHubServerCols(sheetHub) {
  const lastCol = Math.max(sheetHub.getLastColumn(), 6);
  const header = sheetHub.getRange(1, 1, 1, lastCol).getValues()[0];
  let colTk = 1;
  let colTenTruong = 2;
  let colKhoiLop = 3;
  let colUrl = 4;
  let colPhuong = -1;
  let colTime = -1;

  for (let c = 0; c < header.length; c++) {
    const h = String(header[c] || "").trim().toLowerCase();
    if (h.includes("phường") || h.includes("phuong") || h.includes("ubnd")) colPhuong = c + 1;
    else if (h.includes("tài khoản") || h === "tk") colTk = c + 1;
    else if (h.includes("tên trường") || h.includes("đơn vị") || h.includes("tên")) colTenTruong = c + 1;
    else if (h.includes("khối lớp") || h.includes("khoi") || h.includes("lớp")) colKhoiLop = c + 1;
    else if (h.includes("url") || h.includes("web app") || h.includes("địa chỉ")) colUrl = c + 1;
    else if (h.includes("ngày") || h.includes("thời gian") || h.includes("cập nhật") || h.includes("time")) colTime = c + 1;
  }

  // Nếu trong sheet chưa có cột Phường thì tự động tạo cột mới ở cuối
  if (colPhuong === -1) {
    colPhuong = sheetHub.getLastColumn() + 1;
    sheetHub.getRange(1, colPhuong).setValue("Phường / Đơn Vị Cấp Trên")
      .setFontWeight("bold").setBackground("#4338ca").setFontColor("#ffffff").setHorizontalAlignment("center");
    sheetHub.setColumnWidth(colPhuong, 260);
    sheetHub.getRange(1, colPhuong, Math.max(sheetHub.getMaxRows(), 2), 1).setNumberFormat("@");
  }
  if (colTime === -1) {
    colTime = 5;
  }

  return { colTk, colTenTruong, colKhoiLop, colUrl, colPhuong, colTime };
}

/**
 * HÀM ĐỒNG BỘ / ĐIỀN TÊN PHƯỜNG CHO TẤT CẢ CÁC TRƯỜNG TRÊN SHEET HUB_SERVER
 * Chọn hàm 'capNhatPhuongHubServer' từ danh sách hàm Apps Script và bấm Chạy (Run)
 */
function capNhatPhuongHubServer() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_HUB_SERVER);
  if (!sheet) return "Không tìm thấy Sheet HUB_SERVER!";

  const cols = getHubServerCols(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "Sheet HUB_SERVER chưa có dữ liệu trường nào!";

  const disp = sheet.getDataRange().getDisplayValues();
  let count = 0;

  for (let r = 1; r < disp.length; r++) {
    const tk = String(disp[r][cols.colTk - 1] || "").trim();
    const ten = String(disp[r][cols.colTenTruong - 1] || "").trim();
    const currentPhuong = String(disp[r][cols.colPhuong - 1] || "").trim();

    if (!currentPhuong) {
      let phuongVal = "ỦY BAN NHÂN DÂN PHƯỜNG AN NHƠN";
      if (tk.toLowerCase() === "blt" || ten.toLowerCase().includes("bình lợi") || ten.toLowerCase().includes("binh loi")) {
        phuongVal = "ỦY BAN NHÂN DÂN PHƯỜNG 13";
      }
      sheet.getRange(r + 1, cols.colPhuong).setNumberFormat("@").setValue(phuongVal);
      count++;
    }
  }

  const msg = "Đã cập nhật tên Phường vào Cột F ('" + sheet.getRange(1, cols.colPhuong).getValue() + "') cho " + count + " trường thành công!";
  Logger.log(msg);
  try { ss.toast(msg, "Thành Công", 5); } catch(e) {}
  return msg;
}

function dongBoPhuongHubServer() { return capNhatPhuongHubServer(); }

function getOrCreateHubServerSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_HUB_SERVER);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_HUB_SERVER);
    sheet.appendRow(["Tài khoản", "Tên Trường / Đơn Vị", "Khối Lớp", "Địa chỉ URL Web App", "Phường / Đơn Vị Cấp Trên", "Ngày cập nhật"]);
    const header = sheet.getRange(1, 1, 1, 6);
    header.setFontWeight("bold").setBackground("#4338ca").setFontColor("#ffffff").setHorizontalAlignment("center");
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 280);
    sheet.setColumnWidth(3, 280);
    sheet.setColumnWidth(4, 380);
    sheet.setColumnWidth(5, 260);
    sheet.setColumnWidth(6, 160);
    sheet.getRange("A:F").setNumberFormat("@");

    let activeUrl = "";
    try {
      activeUrl = ScriptApp.getService().getUrl() || "";
    } catch (e) {}
    sheet.appendRow([
      "admin",
      "Trường THCS An Nhơn (Hệ Thống Trung Tâm)",
      '{"6":["6/1","6/2","6/3","6/4"],"7":["7/1","7/2","7/3","7/4"],"8":["8/1","8/2","8/3","8/4"],"9":["9/1","9/2","9/3","9/4"]}',
      activeUrl || "https://script.google.com/macros/s/AKfycbyq_9IIe8b6BmqBJWz58XfkiPBoeDXZo5K5iBGLyicByK0Xww_0I5osFP_9CumCQio5xw/exec",
      "ỦY BAN NHÂN DÂN PHƯỜNG AN NHƠN",
      Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss")
    ]);
  } else {
    // Nếu sheet đã tồn tại, kiểm tra xem có cột Phường chưa
    const lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      let hasPhuong = false;
      for (let c = 0; c < headerRow.length; c++) {
        const h = String(headerRow[c] || "").toLowerCase();
        if (h.includes("phường") || h.includes("phuong") || h.includes("ubnd")) hasPhuong = true;
      }
      if (!hasPhuong) {
        const newCol = lastCol + 1;
        sheet.getRange(1, newCol).setValue("Phường / Đơn Vị Cấp Trên")
          .setFontWeight("bold").setBackground("#4338ca").setFontColor("#ffffff").setHorizontalAlignment("center");
        sheet.setColumnWidth(newCol, 260);
        sheet.getRange(1, newCol, Math.max(sheet.getMaxRows(), 2), 1).setNumberFormat("@");
      }
    }
  }
  return sheet;
}

function handleGetHubServers() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateHubServerSheet(ss);
    const lastRow = sheet.getLastRow();
    
    const schools = [];
    if (lastRow >= 2) {
      const cols = getHubServerCols(sheet);
      const values = sheet.getDataRange().getValues();
      const displayValues = sheet.getDataRange().getDisplayValues();

      for (let i = 1; i < displayValues.length; i++) {
        const tk = String(displayValues[i][cols.colTk - 1] || values[i][cols.colTk - 1] || "").trim();
        const tenTruong = String(displayValues[i][cols.colTenTruong - 1] || values[i][cols.colTenTruong - 1] || "").trim();
        const khoiLop = (cols.colKhoiLop > 0) ? String(displayValues[i][cols.colKhoiLop - 1] || values[i][cols.colKhoiLop - 1] || "").trim() : "";
        const url = (cols.colUrl > 0) ? String(displayValues[i][cols.colUrl - 1] || values[i][cols.colUrl - 1] || "").trim() : "";
        let tenPhuong = (cols.colPhuong > 0) ? String(displayValues[i][cols.colPhuong - 1] || values[i][cols.colPhuong - 1] || "").trim() : "";
        const updatedAt = (cols.colTime > 0) ? String(displayValues[i][cols.colTime - 1] || values[i][cols.colTime - 1] || "").trim() : "";

        if (!tenPhuong) {
          if (tk.toLowerCase() === "blt" || tenTruong.toLowerCase().includes("bình lợi") || tenTruong.toLowerCase().includes("binh loi")) {
            tenPhuong = "ỦY BAN NHÂN DÂN PHƯỜNG 13";
          } else {
            tenPhuong = "ỦY BAN NHÂN DÂN PHƯỜNG AN NHƠN";
          }
        }

        if (tenTruong || url) {
          schools.push({
            taiKhoan: tk || "admin",
            tenTruong: tenTruong || ("Trường " + i),
            tenPhuong: tenPhuong,
            khoiLop: khoiLop,
            url: url,
            updatedAt: updatedAt
          });
        }
      }
    }

    if (schools.length === 0) {
      let activeUrl = "";
      try {
        activeUrl = ScriptApp.getService().getUrl() || "";
      } catch (e) {}
      schools.push({
        taiKhoan: "admin",
        tenTruong: "Trường THCS An Nhơn (Hệ Thống Trung Tâm)",
        tenPhuong: "ỦY BAN NHÂN DÂN PHƯỜNG AN NHƠN",
        khoiLop: '{"6":["6/1","6/2","6/3","6/4"],"7":["7/1","7/2","7/3","7/4"],"8":["8/1","8/2","8/3","8/4"],"9":["9/1","9/2","9/3","9/4"]}',
        url: activeUrl || "https://script.google.com/macros/s/AKfycbyq_9IIe8b6BmqBJWz58XfkiPBoeDXZo5K5iBGLyicByK0Xww_0I5osFP_9CumCQio5xw/exec",
        updatedAt: Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss")
      });
    }

    return jsonResponse({
      success: true,
      schools: schools,
      total: schools.length
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Lỗi lấy danh sách máy chủ: " + err.message
    });
  }
}

function handleRegisterHubServer(payload) {
  try {
    const taiKhoan = String(payload.taiKhoan || payload.tai_khoan || "admin").trim();
    const tenTruong = String(payload.tenTruong || payload.ten_truong || payload.tenGv || "").trim();
    const tenPhuong = String(payload.tenPhuong || payload.ten_phuong || payload.phuong || "").trim();
    const url = String(payload.url || payload.backendUrl || "").trim();
    const khoiLop = String(payload.khoiLop || payload.khoi_lop || payload.classes || "").trim();

    if (!tenTruong) {
      return jsonResponse({ success: false, message: "Vui lòng nhập tên trường / đơn vị!" });
    }
    if (!url || !url.startsWith("https://script.google.com/macros/s/") || !url.endsWith("/exec")) {
      return jsonResponse({ success: false, message: "URL Web App không đúng định dạng (phải bắt đầu bằng https://script.google.com/macros/s/ và kết thúc bằng /exec)!" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateHubServerSheet(ss);
    const lastRow = sheet.getLastRow();
    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

    // Lấy chính xác vị trí cột theo header hàng 1 (Tránh ghi nhầm cột Ngày cập nhật và Phường)
    const cols = getHubServerCols(sheet);

    let foundIndex = -1;
    if (lastRow >= 2) {
      const numCols = Math.max(sheet.getLastColumn(), 6);
      const values = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
      const displayValues = sheet.getRange(2, 1, lastRow - 1, numCols).getDisplayValues();

      for (let i = 0; i < values.length; i++) {
        const rowTk = String(displayValues[i][cols.colTk - 1] || values[i][cols.colTk - 1] || "").trim().toLowerCase();
        const rowName = String(displayValues[i][cols.colTenTruong - 1] || values[i][cols.colTenTruong - 1] || "").trim().toLowerCase();
        const col3 = String(displayValues[i][2] || values[i][2] || "").trim();
        const col4 = String(displayValues[i][3] || values[i][3] || "").trim();
        const rowUrl = col3.startsWith("http") ? col3 : col4;

        if (rowTk === taiKhoan.toLowerCase() || rowUrl === url || rowName === tenTruong.toLowerCase()) {
          foundIndex = i + 2;
          break;
        }
      }
    }

    const targetRow = (foundIndex !== -1) ? foundIndex : (sheet.getLastRow() + 1);

    // Ghi chính xác vào từng cột theo tên tiêu đề
    sheet.getRange(targetRow, cols.colTk).setNumberFormat("@").setValue(taiKhoan);
    sheet.getRange(targetRow, cols.colTenTruong).setNumberFormat("@").setValue(tenTruong);
    if (cols.colKhoiLop > 0) sheet.getRange(targetRow, cols.colKhoiLop).setNumberFormat("@").setValue(khoiLop);
    if (cols.colUrl > 0) sheet.getRange(targetRow, cols.colUrl).setNumberFormat("@").setValue(url);
    if (cols.colPhuong > 0) sheet.getRange(targetRow, cols.colPhuong).setNumberFormat("@").setValue(tenPhuong || "ỦY BAN NHÂN DÂN PHƯỜNG AN NHƠN");
    if (cols.colTime > 0) sheet.getRange(targetRow, cols.colTime).setNumberFormat("@").setValue(timestamp);

    // ⭐️ GHI ĐỒNG BỘ VÀO SHEET DATA TRÊN MÁY CHỦ TRUNG TÂM (Cột B: Tên Trường & Cột Lớp Dạy)
    // KHÔNG TẠO HOẶC GHI VÀO CỘT PHƯỜNG TRÊN SHEET DATA (Dữ liệu Phường lưu tại Sheet HUB_SERVER)
    try {
      const sheetData = ss.getSheetByName(SHEET_DATA);
      if (sheetData) {
        let lopDayCol = -1;
        const lastCol = sheetData.getLastColumn();
        if (lastCol > 0) {
          const headerRow = sheetData.getRange(1, 1, 1, lastCol).getValues()[0];
          for (let c = 0; c < headerRow.length; c++) {
            const h = String(headerRow[c] || "").trim().toLowerCase();
            if (h.includes("lớp dạy") || h.includes("lop day") || h.includes("lopday") || h === "lớp" || h === "lop") {
              lopDayCol = c + 1;
              break;
            }
          }
        }
        if (lopDayCol === -1) {
          const targetLopCol = sheetData.getLastColumn() + 1;
          sheetData.getRange(1, targetLopCol).setValue("Lớp Dạy").setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff");
          sheetData.setColumnWidth(targetLopCol, 220);
          sheetData.getRange(1, targetLopCol, Math.max(sheetData.getMaxRows(), 2), 1).setNumberFormat("@");
          lopDayCol = targetLopCol;
        }

        let classesDisplayStr = String(payload.lopDay || "").trim();
        if (!classesDisplayStr && khoiLop) {
          try {
            const parsed = JSON.parse(khoiLop);
            const allList = [];
            ['6', '7', '8', '9'].forEach(g => {
              if (Array.isArray(parsed[g])) allList.push(...parsed[g]);
            });
            if (allList.length > 0) classesDisplayStr = allList.join(", ");
          } catch (e) {
            classesDisplayStr = khoiLop;
          }
        }

        const dataVals = sheetData.getDataRange().getValues();
        const dataDisp = sheetData.getDataRange().getDisplayValues();
        const colsData = getSheetDataCols(sheetData);
        let foundDataRow = -1;

        for (let d = 1; d < dataVals.length; d++) {
          const dTk = String(dataDisp[d][colsData.colTk] || dataVals[d][colsData.colTk] || "").trim();
          const dTen = String(dataDisp[d][colsData.colTenGv] || dataVals[d][colsData.colTenGv] || "").trim();
          if (isUsernameMatch(dTk, taiKhoan) || (tenTruong && dTen.toLowerCase() === tenTruong.toLowerCase())) {
            foundDataRow = d + 1;
            break;
          }
        }

        if (foundDataRow !== -1) {
          sheetData.getRange(foundDataRow, colsData.colTenGv + 1).setNumberFormat("@").setValue(tenTruong);
          if (lopDayCol > 0 && classesDisplayStr) {
            sheetData.getRange(foundDataRow, lopDayCol).setNumberFormat("@").setValue(classesDisplayStr);
          }
        } else {
          const newRowData = [
            taiKhoan,
            tenTruong,
            "",
            "admin",
            "1234",
            classesDisplayStr,
            "2.0"
          ];
          sheetData.appendRow(newRowData);
          sheetData.getRange(sheetData.getLastRow(), 1, 1, newRowData.length).setNumberFormat("@");
          syncDuLieuWithData(false);
          syncDuLieuHoaNhapWithData(false);
        }
      }
    } catch (dataErr) {
      Logger.log("Lỗi ghi Sheet DATA trong handleRegisterHubServer: " + dataErr);
    }

    return jsonResponse({
      success: true,
      message: 'Đã lưu và đồng bộ thông tin trường "' + tenTruong + '" (Phường: ' + (tenPhuong || "") + ') vào HUB_SERVER thành công!',
      school: { taiKhoan, tenTruong, tenPhuong, khoiLop, url, updatedAt: timestamp }
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Lỗi đăng ký máy chủ: " + err.message
    });
  }
}

function capNhatCotMoi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. NÂNG CẤP SHEET DATA: Bổ sung Cột F: LỚP DẠY
  let sheetData = ss.getSheetByName(SHEET_DATA);
  if (sheetData) {
    const lastCol = sheetData.getLastColumn();
    let lopDayCol = -1;
    if (lastCol > 0) {
      const headerRow = sheetData.getRange(1, 1, 1, lastCol).getValues()[0];
      for (let c = 0; c < headerRow.length; c++) {
        const h = String(headerRow[c] || "").trim().toLowerCase();
        if (h.includes("lớp dạy") || h.includes("lop day") || h.includes("lopday") || h === "lớp" || h === "lop") {
          lopDayCol = c + 1; // 1-based column
          break;
        }
      }
    }
    const targetCol = (lopDayCol > 0) ? lopDayCol : Math.max(6, lastCol + 1);
    sheetData.getRange(1, targetCol).setValue("Lớp Dạy");
    sheetData.getRange(1, targetCol).setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff");
    sheetData.setColumnWidth(targetCol, 220);
    const maxRows = Math.max(sheetData.getMaxRows(), sheetData.getLastRow(), 2);
    sheetData.getRange(1, targetCol, maxRows, 1).setNumberFormat("@");
    Logger.log("✅ Đã tạo Cột F: Lớp Dạy (cột " + targetCol + ") trên Sheet DATA!");

    // Tự động đồng bộ các lớp từ HUB_SERVER sang Sheet DATA cho các trường
    try {
      const hubSheet = ss.getSheetByName(SHEET_HUB_SERVER);
      if (hubSheet && hubSheet.getLastRow() >= 2) {
        const hubLastRow = hubSheet.getLastRow();
        const numCols = Math.max(hubSheet.getLastColumn(), 5);
        const hubDisplay = hubSheet.getRange(2, 1, hubLastRow - 1, numCols).getDisplayValues();
        const colsData = getSheetDataCols(sheetData);
        const dataDisp = sheetData.getDataRange().getDisplayValues();

        for (let h = 0; h < hubDisplay.length; h++) {
          const hTk = String(hubDisplay[h][0] || "").trim();
          const col3 = String(hubDisplay[h][2] || "").trim();
          let kLop = col3.startsWith("http") ? "" : col3;
          if (kLop) {
            let str = kLop;
            try {
              const p = JSON.parse(kLop);
              const a = [];
              ['6', '7', '8', '9'].forEach(g => { if (Array.isArray(p[g])) a.push(...p[g]); });
              if (a.length > 0) str = a.join(", ");
            } catch(e) {}
            
            for (let d = 1; d < dataDisp.length; d++) {
              const dTk = String(dataDisp[d][colsData.colTk] || "").trim();
              if (isUsernameMatch(dTk, hTk)) {
                sheetData.getRange(d + 1, targetCol).setValue(str);
                break;
              }
            }
          }
        }
      }
    } catch (hubSyncErr) {
      Logger.log("Lỗi đồng bộ HUB sang DATA: " + hubSyncErr);
    }
  }

  // 2. Nâng cấp Sheet HUB_SERVER: Bổ sung Cột C: Khối Lớp
  let sheetHub = ss.getSheetByName(SHEET_HUB_SERVER);
  if (!sheetHub) {
    sheetHub = getOrCreateHubServerSheet(ss);
    Logger.log("✅ Đã tạo mới Sheet HUB_SERVER chuẩn 5 cột (có Cột C: Khối Lớp)!");
  } else {
    const lastCol = sheetHub.getLastColumn();
    
    // Kiểm tra xem cột 3 có phải là URL không (định dạng cũ 4 cột)
    const col3Header = String(sheetHub.getRange(1, 3).getValue() || "").toLowerCase();
    const isOld4Cols = (lastCol === 4) || col3Header.includes("url") || col3Header.includes("địa chỉ");
    
    if (isOld4Cols) {
      // Chèn thêm 1 cột vào vị trí cột 3 (Khối Lớp), đẩy URL sang cột 4 và Ngày cập nhật sang cột 5
      sheetHub.insertColumnBefore(3);
      Logger.log("✅ Đã chèn thêm Cột C: Khối Lớp vào giữa Tên Trường và URL trên Sheet HUB_SERVER!");
    }

    // Cập nhật lại đầy đủ tiêu đề 5 cột chuẩn
    sheetHub.getRange(1, 1).setValue("TÀI KHOẢN (ADMIN)");
    sheetHub.getRange(1, 2).setValue("TÊN TRƯỜNG / ĐƠN VỊ");
    sheetHub.getRange(1, 3).setValue("KHỐI LỚP");
    sheetHub.getRange(1, 4).setValue("ĐỊA CHỈ URL WEB APP");
    sheetHub.getRange(1, 5).setValue("NGÀY CẬP NHẬT");

    const headerRange = sheetHub.getRange(1, 1, 1, 5);
    headerRange.setFontWeight("bold").setBackground("#4338ca").setFontColor("#ffffff");
    sheetHub.setColumnWidth(1, 180);
    sheetHub.setColumnWidth(2, 320);
    sheetHub.setColumnWidth(3, 300);
    sheetHub.setColumnWidth(4, 400);
    sheetHub.setColumnWidth(5, 160);
    sheetHub.getRange("A:E").setNumberFormat("@");
    Logger.log("✅ Đã chuẩn hóa tiêu đề và định dạng Sheet HUB_SERVER (5 cột)!");
  }

  // 3. Nâng cấp Sheet DULIEU: Bổ sung Cột D: LỚP DẠY
  let sheetDuLieu = ss.getSheetByName(SHEET_DULIEU);
  if (!sheetDuLieu) {
    sheetDuLieu = ss.insertSheet(SHEET_DULIEU);
  }
  sheetDuLieu.getRange(1, 1).setValue("TK");
  sheetDuLieu.getRange(1, 2).setValue("TÊN GV");
  sheetDuLieu.getRange(1, 3).setValue("DỮ LIỆU GV NHẬP DANG JSON");
  sheetDuLieu.getRange(1, 4).setValue("LỚP DẠY");
  
  const headerDuLieu = sheetDuLieu.getRange(1, 1, 1, 4);
  headerDuLieu.setFontWeight("bold").setBackground("#0d9488").setFontColor("#ffffff");
  sheetDuLieu.setColumnWidth(1, 150);
  sheetDuLieu.setColumnWidth(2, 220);
  sheetDuLieu.setColumnWidth(3, 400);
  sheetDuLieu.setColumnWidth(4, 250);
  sheetDuLieu.getRange("D:D").setNumberFormat("@");
  Logger.log("✅ Đã cập nhật Cột D: LỚP DẠY trên Sheet DULIEU!");

  // 4. Tự động kiểm tra và đồng bộ an toàn
  try {
    syncDuLieuWithData(false);
  } catch (e) {
    Logger.log("Lưu ý đồng bộ: " + e);
  }

  Logger.log("🎉 Hoàn tất nâng cấp hệ thống trung tâm thành công! Toàn bộ dữ liệu cũ được giữ nguyên 100%.");
  return "Đã nâng cấp Cột F: Lớp Dạy (DATA), Cột C: Khối Lớp (HUB_SERVER) và Cột D: Lớp Dạy (DULIEU) thành công!";
}


/**
 * ĐẢM BẢO CỘT PHƯỜNG TỒN TẠI TRÊN SHEET DATA (KHÔNG LÀM MẤT DỮ LIỆU)
 * Trả về chỉ mục 0-based của cột Phường
 */
/**
 * HÀM XÓA CỘT PHƯỜNG KHỎI SHEET DATA (CHO MÁY CHỦ TRUNG TÂM)
 * Quản lý Phường tập trung tại Sheet HUB_SERVER, Sheet DATA không dùng cột Phường.
 * Thầy/Cô chọn hàm 'xoaCotPhuong' từ danh sách hàm Apps Script và bấm Chạy (Run) để xóa tự động.
 */
function xoaCotPhuong() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) return "Không tìm thấy Sheet DATA!";
  const lastCol = sheetData.getLastColumn();
  if (lastCol <= 0) return "Sheet DATA trống!";
  const header = sheetData.getRange(1, 1, 1, lastCol).getValues()[0];
  let foundCol = -1;
  for (let c = 0; c < header.length; c++) {
    const h = String(header[c] || "").trim().toLowerCase();
    if (h === "phường" || h === "phuong" || h.includes("phường") || h.includes("phuong")) {
      foundCol = c + 1;
      break;
    }
  }
  if (foundCol !== -1) {
    sheetData.deleteColumn(foundCol);
    const msg = "Đã xóa cột Phường khỏi Sheet DATA trung tâm thành công! Thông tin Phường được lưu tập trung tại Sheet HUB_SERVER.";
    Logger.log(msg);
    try { ss.toast(msg, "Thành Công", 5); } catch(e) {}
    return msg;
  } else {
    const msg = "Sheet DATA hiện không có cột Phường (đúng chuẩn máy chủ trung tâm).";
    Logger.log(msg);
    try { ss.toast(msg, "Thông Báo", 5); } catch(e) {}
    return msg;
  }
}

function xoaCotPhuongSheetData() { return xoaCotPhuong(); }

/**
 * Nếu lỡ bấm taoCotPhuong trên máy chủ trung tâm:
 * Chỉ đảm bảo Sheet HUB_SERVER có cột Phường, KHÔNG tạo trên Sheet DATA
 */
function taoCotPhuong() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateHubServerSheet(ss);
  return "Sheet DATA trung tâm không dùng cột Phường (được lưu tại HUB_SERVER). Đã kiểm tra Sheet HUB_SERVER thành công!";
}
function capNhatCotPhuong() { return taoCotPhuong(); }
function themCotPhuong() { return taoCotPhuong(); }
function taoCotPhuongSheetData() { return taoCotPhuong(); }


function initialSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Khởi tạo Sheet DATA chuẩn Trung Tâm (7 Cột: A: TK | B: Tên GV | C: Ngày sinh | D: Quyền | E: Mật khẩu | F: Lớp Dạy | G: VERSON)
  // Thông tin Phường & Tên Trường được quản lý tập trung tại Sheet HUB_SERVER
  let sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    const sheets = ss.getSheets();
    if (sheets.length === 1 && (sheets[0].getName() === "Sheet1" || sheets[0].getName() === "Trang tính 1")) {
      sheetData = sheets[0];
      sheetData.setName(SHEET_DATA);
    } else {
      sheetData = ss.insertSheet(SHEET_DATA);
    }
  }
  sheetData.clear();
  sheetData.appendRow(["Tài khoản", "Tên GV", "Ngày sinh", "Quyền", "Mật khẩu", "Lớp Dạy", "VERSON"]);
  
  // Định dạng hàng tiêu đề và cột
  const dataHeader = sheetData.getRange(1, 1, 1, 7);
  dataHeader.setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff").setHorizontalAlignment("center");
  sheetData.setColumnWidth(1, 150);
  sheetData.setColumnWidth(2, 240);
  sheetData.setColumnWidth(3, 130);
  sheetData.setColumnWidth(4, 90);
  sheetData.setColumnWidth(5, 120);
  sheetData.setColumnWidth(6, 220);
  sheetData.setColumnWidth(7, 100);
  sheetData.getRange("A:G").setNumberFormat("@");

  // Dữ liệu mẫu ban đầu (7 cột chuẩn, không có cột Phường)
  const defaultClasses = "6A1, 6A2, 6A3, 6A4, 7A1, 7A2, 7A3, 7A4, 8A1, 8A2, 8A3, 8A4, 9A1, 9A2, 9A3, 9A4";
  sheetData.appendRow(["admin", "THCS AN NHƠN (TRỤ SỞ CHÍNH)", "", "admin", "1234", defaultClasses, "2.0"]);
  sheetData.appendRow(["BLT", "THCS BÌNH LỢI TRUNG", "", "admin", "1234", "6/1, 6/2, 6/3, 6/4, 7/1, 7/2, 7/3, 7/4, 8/1, 8/2, 8/3, 8/4, 9/1, 9/2, 9/3, 9/4", "2.0"]);
  sheetData.appendRow(["bgh_pht", "Phó Hiệu Trưởng (BGH)", "10/05/1982", "bgh", "1234", "", "2.0"]);
  sheetData.appendRow(["gv_toan", "Vũ Ngọc Tuấn", "20/10/1985", "gv", "1234", "", "2.0"]);
  sheetData.appendRow(["gv_van", "Nguyễn Thị Anh Thư", "12/03/1988", "gv", "1234", "", "2.0"]);
  sheetData.appendRow(["gv_anh", "Trần Phương Thúy", "05/09/1990", "gv", "1234", "", "2.0"]);
  sheetData.appendRow(["gv_khtn", "Đặng Ngọc Thanh Thủy", "28/11/1987", "gv", "1234", "", "2.0"]);
  sheetData.getRange(2, 1, 7, 7).setNumberFormat("@");

  // 2. Khởi tạo và đồng bộ Sheet DULIEU (Phân hệ 1) theo đúng thứ tự
  syncDuLieuWithData(true);

  // 3. Khởi tạo Sheet HOA NHAP (Phân hệ 2: danh sách HS hòa nhập)
  let sheetHN = initHoaNhapSheet(ss);
  if (sheetHN.getLastRow() <= 1) {
    sheetHN.appendRow(["Nguyễn Văn An", "15/04/2012", "6A1", "Khuyết tật phát triển trí tuệ"]);
    sheetHN.appendRow(["Trần Thị Bình", "20/09/2011", "7A2", "Khuyết tật học tập"]);
    sheetHN.appendRow(["Lê Hoàng Cường", "05/11/2010", "8A3", "Khuyết tật vận động nhẹ"]);
    sheetHN.getRange(2, 2, 3, 1).setNumberFormat("@");
  }

  // 4. Khởi tạo và đồng bộ Sheet dulieu_hoanhap (Phân hệ 2: dữ liệu giáo viên) theo đúng thứ tự
  syncDuLieuHoaNhapWithData(true);

  // 5. Khởi tạo và đồng bộ Sheet DATA GDTC (Phân hệ 3: dữ liệu thể dục GDTC) theo đúng thứ tự
  try {
    taoSheetGDTC();
  } catch (gdtcErr) {
    Logger.log("Lỗi khởi tạo Sheet DATA GDTC: " + gdtcErr);
  }

  // 6. Khởi tạo Sheet HUB_SERVER nếu chưa có
  try {
    getOrCreateHubServerSheet(ss);
  } catch (hubErr) {
    Logger.log("Lỗi khởi tạo HUB_SERVER: " + hubErr);
  }

  // 7. Khởi tạo các cấu hình hệ thống mặc định (Properties)
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

  // 8. Dọn dẹp sheet mặc định "Sheet1" hoặc "Trang tính 1" nếu còn thừa
  const defaultSheets = ["Sheet1", "Trang tính 1"];
  defaultSheets.forEach(defName => {
    const s = ss.getSheetByName(defName);
    if (s && ss.getSheets().length > 1) {
      try {
        ss.deleteSheet(s);
      } catch (delErr) {}
    }
  });

  Logger.log("🎉 KHỞI TẠO HỆ THỐNG THÀNH CÔNG ĐẦY ĐỦ CẢ 3 PHÂN HỆ: DATA, DULIEU, HOA NHAP, dulieu_hoanhap, DATA GDTC!");
  return {
    success: true,
    message: "Khởi tạo thành công đầy đủ cả 3 Phân hệ: DATA, DULIEU, HOA NHAP, dulieu_hoanhap, DATA GDTC!"
  };
}

/**
 * ========================================================
 * PHÂN HỆ 3: BẢNG KÊ KHAI TIẾT DẠY THỰC HÀNH THỂ DỤC (GDTC)
 * SHEET "DATA GDTC": CỘT A: TK | CỘT B: TÊN GV | CỘT C: KÊ KHAI (DẠNG JSON)
 * ========================================================
 */

/**
 * ⭐️ HÀM TẠO VÀ ĐỒNG BỘ SHEET "DATA GDTC" DÀNH CHO ADMIN CHẠY TRỰC TIẾP TRONG APPS SCRIPT:
 * Chọn hàm 'taoSheetGDTC' (hoặc 'capNhatCotSheetDataGdtc') trong danh sách hàm và nhấn nút 'Chạy' (Run).
 * Hệ thống sẽ tự động tạo Sheet "DATA GDTC" nếu chưa có và đồng bộ danh sách giáo viên sang.
 */
function taoSheetGDTC() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_DATA_GDTC);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DATA_GDTC);
  }
  capNhatCotSheetDataGdtc(sheet);
  const res = syncDataGdtcWithData(true);
  Logger.log("✅ ĐÃ TẠO VÀ ĐỒNG BỘ THÀNH CÔNG SHEET 'DATA GDTC' VỚI 3 CỘT: TK, TÊN GV, KÊ KHAI!");
  return res;
}

function taoSheetDataGdtc() {
  return taoSheetGDTC();
}

function dongBoSheetGDTC() {
  return taoSheetGDTC();
}

function dongBoSheetDataGdtc() {
  return taoSheetGDTC();
}

function initDataGdtcSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_DATA_GDTC);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DATA_GDTC);
  }
  capNhatCotSheetDataGdtc(sheet);
  return sheet;
}

function capNhatCotSheetDataGdtc(sheet) {
  if (!sheet) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.getSheetByName(SHEET_DATA_GDTC);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_DATA_GDTC);
    }
  }
  const headers = ["TK", "TÊN GV", "KÊ KHAI"];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold").setBackground("#ea580c").setFontColor("#ffffff");
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 240);
  sheet.setColumnWidth(3, 400);
  sheet.getRange("A:C").setNumberFormat("@");

  // Quét các dòng hiện có: nếu TK bị mất số 0 (chỉ có 9 chữ số), tự động bổ sung số 0 và ép kiểu Text
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const tkRange = sheet.getRange(2, 1, lastRow - 1, 1);
    const tkVals = tkRange.getValues();
    let updated = false;
    for (let r = 0; r < tkVals.length; r++) {
      let v = String(tkVals[r][0] || "").trim().replace(/^'+/, "");
      if (/^\d{9}$/.test(v)) {
        tkVals[r][0] = "'" + "0" + v;
        updated = true;
      }
    }
    if (updated) {
      tkRange.setNumberFormat("@").setValues(tkVals);
    }
  }

  // Nếu sheet mới tạo chưa có giáo viên, tự động đồng bộ ngay
  if (sheet.getLastRow() <= 1) {
    syncDataGdtcWithData(true);
  }
  return sheet;
}

function syncDataGdtcWithData(forceRebuild) {
  if (forceRebuild === undefined) forceRebuild = true;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName(SHEET_DATA);
  if (!sheetData) {
    return { success: false, message: "Không tìm thấy sheet DATA trong bảng tính!" };
  }

  let sheetGdtc = ss.getSheetByName(SHEET_DATA_GDTC);
  if (!sheetGdtc) {
    sheetGdtc = ss.insertSheet(SHEET_DATA_GDTC);
  }
  capNhatCotSheetDataGdtc(sheetGdtc);

  const cols = getSheetDataCols(sheetData);
  const dataValuesRaw = sheetData.getDataRange().getValues();
  const dataValuesDisplay = sheetData.getDataRange().getDisplayValues();

  // Đọc dữ liệu JSON hiện có trong Sheet DATA GDTC (nếu có)
  const existingJsonMap = {};
  const gdtcLastRow = sheetGdtc.getLastRow();
  const gdtcLastCol = Math.max(3, sheetGdtc.getLastColumn());
  if (gdtcLastRow > 1) {
    const gVals = sheetGdtc.getRange(1, 1, gdtcLastRow, gdtcLastCol).getValues();
    const gDisp = sheetGdtc.getRange(1, 1, gdtcLastRow, gdtcLastCol).getDisplayValues();
    for (let j = 1; j < gVals.length; j++) {
      const rawTk = String(gVals[j][0] || "").trim();
      const dispTk = String(gDisp[j][0] || "").trim();
      const normTk = normalizeUsername(dispTk || rawTk);
      const jsonContent = gdtcLastCol >= 3 ? (gVals[j][2] !== undefined && gVals[j][2] !== "" ? gVals[j][2] : gVals[j][1]) : gVals[j][1];
      if (jsonContent) {
        if (normTk) existingJsonMap[normTk.toLowerCase()] = jsonContent;
        if (rawTk) existingJsonMap[rawTk.toLowerCase()] = jsonContent;
        const stripped = normTk.replace(/^0+/, "").toLowerCase();
        if (stripped) existingJsonMap[stripped] = jsonContent;
      }
    }
  }

  // Thu thập danh sách giáo viên từ Sheet DATA theo đúng thứ tự hàng cố định
  const teacherRows = [];
  for (let i = 1; i < dataValuesRaw.length; i++) {
    const rowRaw = dataValuesRaw[i];
    const rowDisp = dataValuesDisplay[i];
    const rawTk = String(rowDisp[cols.colTk] || rowRaw[cols.colTk] || "").trim();
    if (!rawTk) continue;
    const normTk = normalizeUsername(rawTk);
    const cleanTk = normTk.replace(/^'+/, "").toLowerCase();
    const quyen = String(rowRaw[cols.colQuyen] || "").trim().toLowerCase();
    if (cleanTk === "admin" || cleanTk === "blt" || !isRoleGv(quyen, cleanTk)) continue;
    const tenGv = String(rowDisp[cols.colTenGv] || rowRaw[cols.colTenGv] || "").trim();

    const savedJson = existingJsonMap[normTk.toLowerCase()] ||
                      existingJsonMap[rawTk.toLowerCase()] ||
                      existingJsonMap[normTk.replace(/^0+/, "").toLowerCase()] || "";

    const cellTk = /^\d+$/.test(normTk) ? "'" + normTk : normTk;
    // Cột A: TK | Cột B: TÊN GV | Cột C: KÊ KHAI (Dạng JSON)
    teacherRows.push([cellTk, tenGv, savedJson]);
  }

  if (teacherRows.length === 0) {
    return { success: false, message: "Sheet DATA chưa có giáo viên nào!" };
  }

  if (!forceRebuild && gdtcLastRow === teacherRows.length + 1 && gdtcLastCol >= 3) {
    let perfectlyMatched = true;
    const currentGdtcDisplay = sheetGdtc.getRange(2, 1, teacherRows.length, 1).getDisplayValues();
    for (let k = 0; k < teacherRows.length; k++) {
      const curTk = String(currentGdtcDisplay[k][0] || "").trim();
      const expectedTk = teacherRows[k][0].replace(/^'/, "");
      if (!isUsernameMatch(curTk, expectedTk)) {
        perfectlyMatched = false;
        break;
      }
    }
    if (perfectlyMatched) {
      return { success: true, count: teacherRows.length, message: "Sheet DATA GDTC đã khớp hoàn toàn." };
    }
  }

  sheetGdtc.clearContents();
  sheetGdtc.appendRow(["TK", "TÊN GV", "KÊ KHAI"]);
  capNhatCotSheetDataGdtc(sheetGdtc);

  if (teacherRows.length > 0) {
    const targetRange = sheetGdtc.getRange(2, 1, teacherRows.length, 3);
    targetRange.setValues(teacherRows);
    sheetGdtc.getRange(2, 1, teacherRows.length, 1).setNumberFormat("@");
    sheetGdtc.getRange(2, 3, teacherRows.length, 1).setNumberFormat("@");
  }

  return { success: true, count: teacherRows.length, message: "Đã đồng bộ " + teacherRows.length + " giáo viên vào Sheet DATA GDTC!" };
}

function handleGetGdtcData(taiKhoan) {
  if (!taiKhoan) return jsonResponse({ success: false, message: "Thiếu tài khoản!" });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetGdtc = ss.getSheetByName(SHEET_DATA_GDTC);
  if (!sheetGdtc) return jsonResponse({ success: true, data: null, isSystemLocked: isSystemLocked() });
  const lastRow = sheetGdtc.getLastRow();
  if (lastRow <= 1) return jsonResponse({ success: true, data: null, isSystemLocked: isSystemLocked() });
  const numCols = Math.max(3, sheetGdtc.getLastColumn());
  const vals = sheetGdtc.getRange(2, 1, lastRow - 1, numCols).getValues();
  const disp = sheetGdtc.getRange(2, 1, lastRow - 1, numCols).getDisplayValues();
  for (let i = 0; i < vals.length; i++) {
    const tk = String(disp[i][0] || vals[i][0] || "").trim();
    if (isUsernameMatch(tk, taiKhoan)) {
      const jsonVal = vals[i][2] || null;
      return jsonResponse({ success: true, data: jsonVal, isSystemLocked: isSystemLocked() });
    }
  }
  return jsonResponse({ success: true, data: null, isSystemLocked: isSystemLocked() });
}

function handleSaveGdtcData(taiKhoan, dataJson, isAdmin) {
  if (!taiKhoan) return jsonResponse({ success: false, message: "Thiếu tài khoản!" });

  const cleanTk = String(taiKhoan).trim().toLowerCase();
  if (cleanTk === "admin" || cleanTk === "blt" || cleanTk === "bgh" || cleanTk === "quantri") {
    return jsonResponse({ success: true, message: "Tài khoản Quản trị / BGH không tham gia kê khai tiết dạy." });
  }

  const isUserAdmin = isAdmin === true;
  if (isSystemLocked() && !isUserAdmin) {
    return jsonResponse({
      success: false,
      message: "Hệ thống hiện đang bị KHÓA KÊ KHAI bởi Ban giám hiệu nhà trường. Quý thầy cô chỉ có thể xem số liệu, không thể lưu dữ liệu mới lúc này!"
    });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetGdtc = ss.getSheetByName(SHEET_DATA_GDTC);
  if (!sheetGdtc) {
    syncDataGdtcWithData(true);
    sheetGdtc = ss.getSheetByName(SHEET_DATA_GDTC);
  }

  const lastRow = sheetGdtc.getLastRow();
  const matchingRows = [];
  if (lastRow > 1) {
    const vals = sheetGdtc.getRange(2, 1, lastRow - 1, 1).getValues();
    const disp = sheetGdtc.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < vals.length; i++) {
      const tk = String(disp[i][0] || vals[i][0] || "").trim();
      if (isUsernameMatch(tk, taiKhoan)) {
        matchingRows.push(i + 2);
      }
    }
  }

  const normTk = normalizeUsername(taiKhoan);
  const cleanStripped = normTk.replace(/^'+/, "").replace(/^0+/, "");
  const standardTk = (/^\d{9}$/.test(cleanStripped)) ? ("0" + cleanStripped) : normTk;
  const cellTk = "'" + standardTk;

  if (matchingRows.length === 0) {
    let tenGv = "";
    const sheetData = ss.getSheetByName(SHEET_DATA);
    if (sheetData) {
      const dVals = sheetData.getDataRange().getValues();
      const dDisp = sheetData.getDataRange().getDisplayValues();
      const cols = getSheetDataCols(sheetData);
      for (let r = 1; r < dVals.length; r++) {
        const sTk = String(dDisp[r][cols.colTk] || dVals[r][cols.colTk] || "").trim();
        if (isUsernameMatch(sTk, taiKhoan)) {
          tenGv = String(dDisp[r][cols.colTenGv] || dVals[r][cols.colTenGv] || "").trim();
          break;
        }
      }
    }
    const newRow = sheetGdtc.getLastRow() + 1;
    sheetGdtc.getRange(newRow, 1).setNumberFormat("@").setValue(cellTk);
    sheetGdtc.getRange(newRow, 2).setValue(tenGv);
    sheetGdtc.getRange(newRow, 3).setNumberFormat("@").setValue(dataJson);
  } else {
    for (let m = 0; m < matchingRows.length; m++) {
      const rowIndex = matchingRows[m];
      sheetGdtc.getRange(rowIndex, 1).setNumberFormat("@").setValue(cellTk);
      sheetGdtc.getRange(rowIndex, 3).setNumberFormat("@").setValue(dataJson);
    }
  }

  return jsonResponse({
    success: true,
    message: "Lưu kê khai tiết dạy thực hành Thể dục thành công!"
  });
}

function handleGetAllGdtcData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const map = {};
  try {
    const sheetGdtc = ss.getSheetByName(SHEET_DATA_GDTC);
    if (sheetGdtc && sheetGdtc.getLastRow() > 1) {
      const numCols = Math.max(3, sheetGdtc.getLastColumn());
      const gVals = sheetGdtc.getRange(2, 1, sheetGdtc.getLastRow() - 1, numCols).getValues();
      const gDisp = sheetGdtc.getRange(2, 1, sheetGdtc.getLastRow() - 1, numCols).getDisplayValues();
      for (let h = 0; h < gVals.length; h++) {
        const hRawTk = String(gVals[h][0] || "").trim();
        const hDispTk = String(gDisp[h][0] || "").trim();
        const hNormTk = normalizeUsername(hDispTk || hRawTk);
        const cleanRaw = hRawTk.replace(/^'+/, "").toLowerCase();
        const cleanNorm = hNormTk.replace(/^'+/, "").toLowerCase();
        if (cleanRaw === 'admin' || cleanNorm === 'admin' || cleanRaw === 'blt' || cleanNorm === 'blt' || cleanRaw === 'bgh' || cleanNorm === 'bgh') continue;
        const hJsonStr = gVals[h][2] || "";
        if (cleanRaw) map[cleanRaw] = hJsonStr;
        if (cleanNorm) map[cleanNorm] = hJsonStr;
        const stripped = cleanNorm.replace(/^0+/, "");
        const withZero = (/^\d{9}$/.test(stripped)) ? ("0" + stripped) : stripped;
        if (stripped) map[stripped] = hJsonStr;
        if (withZero) map[withZero] = hJsonStr;
      }
    }
    return jsonResponse({ success: true, data: map, isSystemLocked: isSystemLocked() });
  } catch (err) {
    return jsonResponse({ success: false, message: "Lỗi đọc dữ liệu GDTC: " + err.message });
  }
}
