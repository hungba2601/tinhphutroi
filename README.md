# Sổ Tính Tiết Dạy Vượt Định Mức - THCS An Nhơn

Hệ thống quản lý và tính toán số tiết dạy vượt định mức (chuẩn 19 tiết/tuần) của giáo viên trường THCS An Nhơn (Phường An Nhơn), kết nối trực tiếp với cơ sở dữ liệu Google Sheets thông qua Google Apps Script.
- **Tác giả:** Nguyễn Phi Hùng
- **Zalo hỗ trợ:** 0938750424

---

## 1. Cấu Trúc Bảng Tính Google Sheets

Bảng tính gồm 2 trang tính (Sheets) chính:

### Sheet 1: `DATA` (Quản lý tài khoản, ngày sinh & phân quyền)
| Cột A | Cột B | Cột C | Cột D | Cột E |
| :--- | :--- | :--- | :--- | :--- |
| **Tài khoản** | **Tên GV** | **Ngày sinh** | **Quyền** | **Mật khẩu** |
| `admin` | Phó Hiệu trưởng | `15/08/1980` | `admin` | `12345` |
| `gv_toan` | Vũ Ngọc Tuấn | `20/10/1985` | `gv` | `1234` |
| `gv_van` | Nguyễn Thị Anh Thư | `12/03/1988` | `gv` | `1234` |
| `gv_anh` | Trần Phương Thúy | `05/09/1990` | `gv` | `1234` |
| `gv_khtn` | Đặng Ngọc Thanh Thủy | `28/11/1987` | `gv` | `1234` |

*Lưu ý về Cột D (Quyền):*
- Quyền Quản trị: Nhập `admin` (hoặc `quản trị`).
- Quyền Giáo viên: Nhập `gv` (hoặc `giáo viên`).

*Lưu ý về Cột C (Ngày sinh):*
- Có thể nhập theo định dạng ngày `DD/MM/YYYY` (ví dụ: `20/10/1985`). Hệ thống backend tự động nhận diện và định dạng chuẩn xác.
- Nếu bảng tính cũ chưa có cột Ngày sinh, hệ thống sẽ tự động chèn thêm cột Ngày sinh ngay cạnh cột Tên GV.

### Sheet 2: `DULIEU` (Lưu trữ dữ liệu tiết dạy)
| Cột A | Cột B | Cột C |
| :--- | :--- | :--- |
| **TK** | **TÊN GV** | **DỮ LIỆU GV NHẬP DANG JSON** |
| `gv_toan` | Vũ Ngọc Tuấn | `{"subject":"Toán","quota":19,"hk1":{...},"hk2":{...}}` |

---

## 2. Các Tính Năng Được Tích Hợp

### 1. Màn hình Đăng nhập 2 Tab Phân Hệ:
- **Tab 1: Giáo Viên** (Mặc định khi mở app): Chỉ tài khoản có quyền `gv` / `giáo viên` mới có thể đăng nhập.
- **Tab 2: Quản Trị**: Dành riêng cho Ban Giám Hiệu. Chỉ tài khoản có quyền `admin` mới được vào cổng quản trị.
- **Hỗ trợ đăng nhập linh hoạt bằng Số điện thoại**: Nếu tài khoản là số điện thoại (ví dụ: `0984541919`), dù người dùng gõ có số `0` hay không có số `0` ở đầu (`984541919`), hệ thống đều nhận diện chính xác và cho phép đăng nhập thành công.
- Hiển thị thông tin hệ thống THCS An Nhơn, tác giả Nguyễn Phi Hùng - Zalo: 0938750424.

### 2. Cổng Quản Trị Dành Cho Ban Giám Hiệu (BGH Admin):
Gồm 2 Tab chức năng chính:
- **Tab 1: Quản Lý Giáo Viên:**
  - **Nút "Xuất Excel Thống Kê"**: Xuất file Excel (`.xlsx` chuẩn SheetJS hoặc định dạng tương thích) tổng hợp chi tiết và trực quan tiến độ kê khai của giáo viên toàn trường hoặc theo bộ lọc hiện tại. Báo cáo tự động tính tỷ lệ % giáo viên đã kê khai / chưa kê khai cho HK1, HK2 và cả năm; bảo toàn số `0` ở đầu cho cột Tài khoản (SĐT); cung cấp đầy đủ thông tin: STT, SĐT, Họ tên, Ngày sinh, Môn dạy, Định mức tiết, Trạng thái HK1, Thực dạy HK1, Vượt HK1, Trạng thái HK2, Thực dạy HK2, Vượt HK2, Tổng vượt năm, Đánh giá tiến độ và Phân quyền.
  - **Nút "Thêm Tài Khoản Mới"**: Mở modal thêm thủ công tài khoản giáo viên/admin mới trực tiếp vào Sheet `DATA` (và khởi tạo dòng trong Sheet `DULIEU`).
  - **Cột "Mật Khẩu"**: Hiển thị mật khẩu dưới dạng chấm tròn bảo mật kèm biểu tượng con mắt để xem/ẩn và nút đổi nhanh mật khẩu cho giáo viên.
  - Danh sách giáo viên: **STT**, **Tài khoản (TK)** (tự động hiển thị đầy đủ số `0` ở đầu đối với số điện thoại), **Tên Giáo Viên**, **Ngày Sinh**, **Mật Khẩu**, **Môn Giảng Dạy**, **Tiết QĐ/Tuần**, **Trạng Thái Kê Khai (HK1 & HK2)**.
  - **Cột Trạng Thái Kê Khai chi tiết**: Hiển thị 2 huy hiệu rõ ràng cho từng giáo viên: **HK1: Đã kê khai / Chưa kê khai** và **HK2: Đã kê khai / Chưa kê khai** giúp Ban Giám Hiệu nắm bắt tiến độ kê khai của từng học kỳ một cách nhanh chóng và chính xác.
  - **Bộ lọc Trạng thái thông minh**: Thanh công cụ hỗ trợ lọc nhanh giáo viên theo: Đã kê khai HK1, Chưa kê khai HK1, Đã kê khai HK2, Chưa kê khai HK2, Đã kê khai cả 2 HK, hoặc Chưa kê khai cả 2 HK.
  - **Modal Thêm / Sửa tài khoản**: Hỗ trợ nhập và cập nhật **Ngày Sinh** trực tiếp lên Sheet `DATA`.
  - **3 Nút Thao tác chuyên nghiệp**:
    1. **Nút "Xem Sổ"**: Mở modal xem & sửa phụ trội từng tuần của giáo viên kèm tính năng **Điền nhanh 18 tuần (HK1) / 17 tuần (HK2)**. Admin có thể chỉnh sửa trực tiếp định mức tiết QĐ/tuần và số tiết của giáo viên và nhấn **"Lưu Thay Đổi Cho GV Này"**.
    2. **Nút "Sửa TK"**: Mở modal sửa thông tin tài khoản (Tên, Tài khoản, Phân quyền, Mật khẩu, Môn dạy, Số tiết quy định) và lưu cập nhật lên Sheet `DATA`.
    3. **Nút "Xóa"**: Cho phép xóa vĩnh viễn tài khoản giáo viên khỏi Sheet `DATA` và dữ liệu phụ trội khỏi Sheet `DULIEU` (có hộp thoại xác nhận bảo vệ).
  - Có thanh tìm kiếm (hỗ trợ tìm cả SĐT có số 0 hoặc không có số 0) và bộ lọc theo bộ môn.
- **Tab 2: Tổng Hợp Toàn Trường:**
  - Bộ nút chuyển đổi xem riêng biệt: **Cả Năm**, **Học Kỳ 1**, hoặc **Học Kỳ 2**.
  - **Bộ nút lọc trạng thái vượt định mức**: **"Tất cả"**, **"Vượt định mức"** (> 0 tiết) và **"Không vượt định mức"** (≤ 0 tiết) kèm huy hiệu đếm số lượng giáo viên tự động theo từng kỳ.
  - Cột **Tài Khoản** luôn hiển thị đầy đủ số `0` ở đầu chuẩn định dạng SĐT.
  - Các thẻ thống kê tổng quan tương ứng với kỳ và trạng thái lọc được chọn.
  - Bảng kê chi tiết từng GV toàn trường theo học kỳ hoặc cả năm (lọc động theo trạng thái).
  - Dòng **TỔNG CỘNG TOÀN TRƯỜNG** ở cuối bảng tính toán theo danh sách lọc.
  - Nút **"Xuất PDF Báo Cáo Toàn Trường"**: Tự động đồng bộ theo bộ lọc trạng thái (Xuất riêng danh sách GV vượt định mức hoặc không vượt định mức kèm ghi chú rõ ràng trên tiêu đề và bảng in A4 landscape).

### 3. Phân Hệ Dành Cho Giáo Viên:
- Dropdown danh sách xổ xuống chọn Môn giảng dạy.
- **Ô nhập số tiết dạy theo quy định (Tiết QĐ/Tuần)**: Cho phép giáo viên tự điều chỉnh định mức quy định (mặc định chuẩn 19 tiết/tuần, hoặc giảm trừ 15, 16, 17...). Toàn bộ cột Tiết vượt sẽ tự động tính toán lại theo định mức này (`Tiết vượt = Thực dạy - Số tiết quy định`).
- **Nút điền nhanh số tiết dạy theo phân công**: Điền tức thì cho toàn bộ 18 tuần (HK1) hoặc 17 tuần (HK2) chỉ với 1 cú nhấp chuột.
- Tab chọn Học Kỳ 1 (18 tuần) và Học Kỳ 2 (17 tuần).
- Tự động tính toán số tiết thực dạy và tiết vượt định mức hàng tuần và tổng học kỳ.
- Nút "Lưu Lên Google Sheet": Lưu dữ liệu trực tiếp lên Google Sheets khi giáo viên chủ động nhấn nút (không tự động lưu ngầm, giúp giáo viên hoàn toàn chủ động kiểm tra số liệu trước khi lưu).
- **Cơ chế Khóa Kê Khai an toàn**: Sau khi giáo viên kê khai và lưu dữ liệu, hệ thống tự động khóa ô nhập và nút Lưu để ngăn chỉnh sửa tự do.
- **Nút "Cho làm lại" phía Admin**: Trong Tab 1 Quản lý Giáo viên, Admin có nút "Cho làm lại" đối với từng giáo viên đã kê khai để mở khóa cho phép sửa lại hoặc xóa trắng để kê khai lại từ đầu.
- Nút "Xuất PDF Báo Cáo Cá Nhân" trang trọng (Ủy ban nhân dân Phường An Nhơn - Trường THCS An Nhơn - Ký tên: Phó Hiệu trưởng), tự động căn chỉnh trọn vẹn trong đúng 1 trang A4.
- Nút "Xuất PDF Thống Kê" khổ ngang (A4 Landscape) với cơ chế phân trang tự động và lặp lại tiêu đề bảng ở mọi trang.
- List chọn (Dropdown) lọc trạng thái "Tất cả / Vượt định mức / Không vượt định mức" đồng bộ tức thời với dữ liệu và báo cáo PDF.
- Khối thông báo và huy hiệu trạng thái kê khai trực quan cho giáo viên, thông báo rõ ràng khi đã kê khai xong học kỳ để giáo viên không cần kê khai lại.

---

## 3. Hướng Dẫn Cài Đặt & Gắn URL Vào Code

1. Mở Google Sheet của bạn.
2. Vào **Tiện ích mở rộng** -> **Apps Script**, dán toàn bộ code từ file [code.gs](code.gs) vào và nhấn Lưu.
3. Chạy hàm `initialSetup` để tạo sẵn 2 sheet `DATA` và `DULIEU`.
4. Triển khai Web App: **Deploy** -> **New deployment** -> Web app -> Who has access: **Anyone** -> Deploy.
5. URL Web App đã được cấu hình trực tiếp tại file [index.html](index.html):
   ```javascript
   const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyq_9IIe8b6BmqBJWz58XfkiPBoeDXZo5K5iBGLyicByK0Xww_0I5osFP_9CumCQio5xw/exec";
   ```
