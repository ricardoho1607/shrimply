/** Interface text only. Farm instructions and approved rules retain their original language. */
const rows = `
Title|Judul|Tiêu đề|ชื่อเรื่อง|标题
Description|Deskripsi|Mô tả|คำอธิบาย|说明
Step title|Judul langkah|Tên bước|ชื่อขั้นตอน|步骤标题
Instructions|Instruksi|Hướng dẫn|คำแนะนำ|操作说明
Applies to|Berlaku untuk|Áp dụng cho|ใช้กับ|适用范围
When|Kapan|Khi nào|เมื่อใด|触发时间
Check|Pemeriksaan|Kiểm tra|การตรวจสอบ|检查
Evidence|Bukti|Bằng chứng|หลักฐาน|证据
Condition|Kondisi|Điều kiện|เงื่อนไข|条件
Severity|Tingkat keparahan|Mức độ nghiêm trọng|ระดับความรุนแรง|严重程度
Urgency|Urgensi|Mức độ khẩn cấp|ความเร่งด่วน|紧急程度
Stages|Tahapan|Các giai đoạn|ระยะการผลิต|生产阶段
Production stage|Tahap produksi|Giai đoạn sản xuất|ระยะการผลิต|生产阶段
Next stage|Tahap berikutnya|Giai đoạn tiếp theo|ระยะถัดไป|下一阶段
Event / stage|Peristiwa / tahap|Sự kiện / giai đoạn|เหตุการณ์ / ระยะ|事件／阶段
Local time|Waktu lokal|Giờ địa phương|เวลาท้องถิ่น|当地时间
Local time (HH:MM)|Waktu lokal (HH:MM)|Giờ địa phương (HH:MM)|เวลาท้องถิ่น (HH:MM)|当地时间（HH:MM）
Weekly days|Hari mingguan|Các ngày trong tuần|วันประจำสัปดาห์|每周日期
Minimum|Minimum|Tối thiểu|ค่าต่ำสุด|最小值
Maximum|Maksimum|Tối đa|ค่าสูงสุด|最大值
Minimum records|Minimum catatan|Số bản ghi tối thiểu|จำนวนบันทึกขั้นต่ำ|最少记录数
Freshness minutes|Kesegaran bukti (menit)|Độ mới bằng chứng (phút)|อายุหลักฐานสูงสุด (นาที)|证据有效期（分钟）
Evidence freshness (minutes)|Kesegaran bukti (menit)|Độ mới bằng chứng (phút)|อายุหลักฐานสูงสุด (นาที)|证据有效期（分钟）
Unit|Satuan|Đơn vị|หน่วย|单位
Analytical basis|Dasar analisis|Cơ sở phân tích|ฐานการวิเคราะห์|分析基准
Required value / sequence|Nilai / urutan wajib|Giá trị / thứ tự yêu cầu|ค่า / ลำดับที่กำหนด|要求值／顺序
Written-evidence rubric|Kriteria bukti tertulis|Tiêu chí bằng chứng văn bản|เกณฑ์ประเมินหลักฐานข้อความ|文字证据评判标准
Corrective instructions|Instruksi perbaikan|Hướng dẫn khắc phục|คำแนะนำแก้ไข|纠正操作说明
Then: corrective instructions|Lalu: instruksi perbaikan|Sau đó: hướng dẫn khắc phục|จากนั้น: คำแนะนำแก้ไข|后续：纠正操作说明
Require notes|Wajibkan catatan|Yêu cầu ghi chú|ต้องมีบันทึก|要求备注
Require attachment|Wajibkan lampiran|Yêu cầu tệp đính kèm|ต้องมีไฟล์แนบ|要求附件
Require exact time|Wajibkan waktu tepat|Yêu cầu thời gian chính xác|ต้องมีเวลาที่แน่นอน|要求准确时间
Require exact observation time|Wajibkan waktu pengamatan tepat|Yêu cầu thời gian quan sát chính xác|ต้องมีเวลาสังเกตที่แน่นอน|要求准确观测时间
Gate next stage|Prasyarat tahap berikutnya|Điều kiện sang giai đoạn tiếp|เงื่อนไขเข้าสู่ระยะถัดไป|下一阶段前置条件
No gate|Tanpa prasyarat|Không có điều kiện|ไม่มีเงื่อนไข|无前置条件
Inventory item / equipment binding|Pilih persediaan / peralatan|Chọn vật tư / thiết bị|เลือกวัสดุ / อุปกรณ์|绑定库存物品／设备
Accountable manager|Manajer penanggung jawab|Quản lý chịu trách nhiệm|ผู้จัดการที่รับผิดชอบ|负责经理
Responsible person|Penanggung jawab|Người chịu trách nhiệm|ผู้รับผิดชอบ|负责人
Assigned person (optional override)|Petugas (opsional)|Người được giao (tùy chọn)|ผู้รับมอบหมาย (ไม่บังคับ)|指定人员（可选覆盖）
Assignee override|Ganti petugas|Thay người được giao|เปลี่ยนผู้รับมอบหมาย|覆盖指派人员
Block technician / accountable manager|Teknisi blok / manajer|Kỹ thuật viên khu / quản lý|ช่างประจำบล็อก / ผู้จัดการ|区块技术员／负责经理
Escalation recipients|Penerima eskalasi|Người nhận báo cáo nâng cấp|ผู้รับการแจ้งเตือนยกระดับ|升级通知接收人
Pond|Kolam|Ao|บ่อ|池塘
Block|Blok|Khu|บล็อก|区块
Selected ponds|Kolam terpilih|Ao đã chọn|บ่อที่เลือก|所选池塘
Blocks (follow membership)|Blok (ikuti keanggotaan)|Khu (theo thay đổi thành viên)|บล็อก (ตามการเปลี่ยนสมาชิก)|区块（跟随成员变动）
Blocks (follow future membership)|Blok (ikuti keanggotaan baru)|Khu (theo thay đổi thành viên)|บล็อก (ตามการเปลี่ยนสมาชิก)|区块（跟随后续成员变动）
Include company tasks|Sertakan tugas perusahaan|Bao gồm công việc công ty|รวมงานระดับบริษัท|包含公司任务
Lifetime|Masa penerapan|Thời hạn áp dụng|ระยะเวลาการใช้|采用期限
Current cycle|Siklus saat ini|Vụ hiện tại|รอบการผลิตปัจจุบัน|当前养殖周期
Standing procedure|Prosedur berkelanjutan|Quy trình áp dụng lâu dài|ขั้นตอนที่ใช้ต่อเนื่อง|长期规程
Target|Sasaran|Đối tượng|เป้าหมาย|目标
Targets|Sasaran|Các đối tượng|เป้าหมาย|目标
Status|Status|Trạng thái|สถานะ|状态
Due date|Tanggal tenggat|Ngày đến hạn|วันครบกำหนด|截止日期
Due date (YYYY-MM-DD)|Tanggal tenggat (YYYY-MM-DD)|Ngày đến hạn (YYYY-MM-DD)|วันครบกำหนด (YYYY-MM-DD)|截止日期（YYYY-MM-DD）
Due time|Waktu tenggat|Giờ đến hạn|เวลาครบกำหนด|截止时间
Due time (ISO, include timezone)|Tenggat (ISO, sertakan zona waktu)|Hạn (ISO, gồm múi giờ)|กำหนดเวลา (ISO พร้อมเขตเวลา)|截止时间（ISO，含时区）
When performed (ISO time)|Waktu pelaksanaan (ISO)|Thời gian thực hiện (ISO)|เวลาที่ดำเนินการ (ISO)|执行时间（ISO）
Use current time|Gunakan waktu sekarang|Dùng thời gian hiện tại|ใช้เวลาปัจจุบัน|使用当前时间
Task evidence|Bukti tugas|Bằng chứng công việc|หลักฐานงาน|任务证据
All people|Semua orang|Tất cả nhân viên|ทุกคน|所有人员
All ponds|Semua kolam|Tất cả ao|ทุกบ่อ|所有池塘
All blocks|Semua blok|Tất cả khu|ทุกบล็อก|所有区块
Myself|Saya sendiri|Bản thân|ตัวฉัน|我自己
Choose person|Pilih orang|Chọn người|เลือกคน|选择人员
Choose pond|Pilih kolam|Chọn ao|เลือกบ่อ|选择池塘
Choose target|Pilih sasaran|Chọn đối tượng|เลือกเป้าหมาย|选择目标
Choose event|Pilih peristiwa|Chọn sự kiện|เลือกเหตุการณ์|选择事件
Not applicable / choose record|Tidak berlaku / pilih catatan|Không áp dụng / chọn bản ghi|ไม่เกี่ยวข้อง / เลือกบันทึก|不适用／选择记录
Not applicable / unknown|Tidak berlaku / belum diketahui|Không áp dụng / chưa rõ|ไม่เกี่ยวข้อง / ไม่ทราบ|不适用／未知
Add step|Tambah langkah|Thêm bước|เพิ่มขั้นตอน|添加步骤
Remove step|Hapus langkah|Xóa bước|ลบขั้นตอน|删除步骤
Remove|Hapus|Xóa|ลบ|删除
Close|Tutup|Đóng|ปิด|关闭
Starter templates|Templat awal|Mẫu khởi đầu|แม่แบบเริ่มต้น|初始模板
Customize template|Sesuaikan templat|Tùy chỉnh mẫu|ปรับแม่แบบ|自定义模板
Workflow preview|Pratinjau alur kerja|Xem trước quy trình|ดูตัวอย่างขั้นตอน|流程预览
Adopt SOP|Terapkan SOP|Áp dụng SOP|นำ SOP มาใช้|采用 SOP
Create editable farm copy|Buat salinan tambak yang dapat diedit|Tạo bản sao trang trại có thể sửa|สร้างสำเนาฟาร์มที่แก้ไขได้|创建可编辑的农场副本
Edit / view|Edit / lihat|Sửa / xem|แก้ไข / ดู|编辑／查看
Original language|Bahasa asli|Ngôn ngữ gốc|ภาษาต้นฉบับ|原始语言
Version history|Riwayat versi|Lịch sử phiên bản|ประวัติเวอร์ชัน|版本历史
Approved versions|Versi disetujui|Các phiên bản đã duyệt|เวอร์ชันที่อนุมัติ|已批准版本
Approved version history|Riwayat versi disetujui|Lịch sử phiên bản đã duyệt|ประวัติเวอร์ชันที่อนุมัติ|已批准版本历史
Approved guidance|Panduan disetujui|Hướng dẫn đã duyệt|คำแนะนำที่อนุมัติ|已批准指导
Approved|Disetujui|Đã duyệt|อนุมัติแล้ว|已批准
Previous guidance|Panduan sebelumnya|Hướng dẫn trước|คำแนะนำก่อนหน้า|此前指导
Adapted from|Diadaptasi dari|Điều chỉnh từ|ปรับจาก|改编来源
Review approved version|Tinjau versi disetujui|Xem phiên bản đã duyệt|ตรวจสอบเวอร์ชันที่อนุมัติ|审阅已批准版本
Review SOP update|Tinjau pembaruan SOP|Xem cập nhật SOP|ตรวจสอบการอัปเดต SOP|审阅 SOP 更新
Review update and unresolved work|Tinjau pembaruan dan tugas terbuka|Xem cập nhật và công việc chưa xử lý|ตรวจสอบการอัปเดตและงานค้าง|审阅更新和未解决工作
Apply to future work|Terapkan untuk tugas mendatang|Áp dụng cho công việc sắp tới|ใช้กับงานในอนาคต|应用于未来工作
Migrate reviewed unresolved work|Migrasikan tugas terbuka yang ditinjau|Chuyển công việc chưa xử lý đã xem xét|ย้ายงานค้างที่ตรวจสอบแล้ว|迁移已审阅的未解决工作
Preview membership|Pratinjau keanggotaan|Xem trước thành viên|ดูตัวอย่างสมาชิก|预览成员范围
Apply reviewed membership|Terapkan keanggotaan yang ditinjau|Áp dụng thành viên đã xem xét|ใช้สมาชิกที่ตรวจสอบแล้ว|应用已审阅的成员范围
Review as|Tinjau sebagai|Xem xét kết quả|ตรวจสอบเป็น|审阅结果
Manager reason|Alasan manajer|Lý do của quản lý|เหตุผลของผู้จัดการ|经理理由
Manager exception|Pengecualian manajer|Ngoại lệ của quản lý|ข้อยกเว้นโดยผู้จัดการ|经理例外批准
Manager exception for unmet prerequisites|Pengecualian prasyarat dari manajer|Ngoại lệ điều kiện do quản lý duyệt|ข้อยกเว้นเงื่อนไขโดยผู้จัดการ|经理批准未满足前置条件的例外
Reason / actual event|Alasan / peristiwa aktual|Lý do / sự kiện thực tế|เหตุผล / เหตุการณ์จริง|理由／实际事件
Exception / actual-event reason|Alasan pengecualian / peristiwa aktual|Lý do ngoại lệ / sự kiện thực tế|เหตุผลข้อยกเว้น / เหตุการณ์จริง|例外／实际事件理由
Event already happened|Peristiwa telah terjadi|Sự kiện đã xảy ra|เหตุการณ์เกิดขึ้นแล้ว|事件已发生
Record an event that already happened|Catat peristiwa yang telah terjadi|Ghi nhận sự kiện đã xảy ra|บันทึกเหตุการณ์ที่เกิดขึ้นแล้ว|记录已经发生的事件
Record transition|Catat perpindahan tahap|Ghi nhận chuyển giai đoạn|บันทึกการเปลี่ยนระยะ|记录阶段转换
Reassign|Ganti petugas|Giao lại|มอบหมายใหม่|重新指派
Apply assignee|Terapkan petugas|Áp dụng người được giao|ใช้ผู้รับมอบหมาย|应用指派人员
Postpone|Tunda|Hoãn|เลื่อน|延期
New deadline (ISO time with timezone)|Tenggat baru (ISO dan zona waktu)|Hạn mới (ISO kèm múi giờ)|กำหนดใหม่ (ISO พร้อมเขตเวลา)|新截止时间（ISO，含时区）
Pause|Jeda|Tạm dừng|พัก|暂停
Retire|Hentikan|Ngừng áp dụng|ยุติ|退役
Report|Laporkan|Báo cáo|รายงาน|举报
Report / withdrawal reason|Alasan laporan / penarikan|Lý do báo cáo / rút lại|เหตุผลรายงาน / ถอน|举报／撤回理由
Withdraw|Tarik publikasi|Rút lại|ถอน|撤回
Withdraw own publication|Tarik publikasi sendiri|Rút bài đăng của mình|ถอนการเผยแพร่ของตนเอง|撤回自己的发布
Unlist|Hapus dari daftar|Ẩn khỏi danh sách|นำออกจากรายการ|取消公开展示
Mark read|Tandai dibaca|Đánh dấu đã đọc|ทำเครื่องหมายว่าอ่านแล้ว|标为已读
SOP notifications|Notifikasi SOP|Thông báo SOP|การแจ้งเตือน SOP|SOP 通知
Enable mobile reminders|Aktifkan pengingat seluler|Bật nhắc nhở di động|เปิดการเตือนบนมือถือ|启用手机提醒
Routine quiet hours start (HH:MM)|Awal jam tenang (HH:MM)|Bắt đầu giờ yên lặng (HH:MM)|เริ่มเวลางดรบกวน (HH:MM)|常规免打扰开始（HH:MM）
Routine quiet hours end (HH:MM)|Akhir jam tenang (HH:MM)|Kết thúc giờ yên lặng (HH:MM)|สิ้นสุดเวลางดรบกวน (HH:MM)|常规免打扰结束（HH:MM）
Describe your procedure|Jelaskan prosedur Anda|Mô tả quy trình|อธิบายขั้นตอน|描述规程
Describe your SOP for Orson|Jelaskan SOP untuk Orson|Mô tả SOP cho Orson|อธิบาย SOP ให้ Orson|向 Orson 描述 SOP
Generate reviewable draft|Buat draf untuk ditinjau|Tạo bản nháp để xem xét|สร้างร่างเพื่อตรวจสอบ|生成可审阅草稿
Import SOP document|Impor dokumen SOP|Nhập tài liệu SOP|นำเข้าเอกสาร SOP|导入 SOP 文档
Import PDF / DOCX / text|Impor PDF / DOCX / teks|Nhập PDF / DOCX / văn bản|นำเข้า PDF / DOCX / ข้อความ|导入 PDF／DOCX／文本
Ask Orson to assess saved notes|Minta Orson menilai catatan|Yêu cầu Orson đánh giá ghi chú|ให้ Orson ประเมินบันทึก|请 Orson 评估已保存备注
Attach guidance for company readers|Lampirkan panduan perusahaan|Đính kèm hướng dẫn công ty|แนบคำแนะนำสำหรับบริษัท|附加公司指导文档
Remove guidance|Hapus panduan|Xóa hướng dẫn|ลบคำแนะนำ|移除指导文档
Create farm task|Buat tugas tambak|Tạo công việc trang trại|สร้างงานฟาร์ม|创建农场任务
Create task|Buat tugas|Tạo công việc|สร้างงาน|创建任务
Clear SOP / issue filter|Hapus filter SOP / masalah|Xóa bộ lọc SOP / vấn đề|ล้างตัวกรอง SOP / ปัญหา|清除 SOP／问题筛选
Open pond|Buka kolam|Mở ao|เปิดบ่อ|打开池塘
Load older SOPs|Muat SOP sebelumnya|Tải SOP cũ hơn|โหลด SOP เก่า|加载更早的 SOP
Load older issues|Muat masalah sebelumnya|Tải vấn đề cũ hơn|โหลดปัญหาเก่า|加载更早的问题
Load older tasks|Muat tugas sebelumnya|Tải công việc cũ hơn|โหลดงานเก่า|加载更早的任务
Older versions|Versi sebelumnya|Phiên bản cũ hơn|เวอร์ชันเก่า|更早版本
More adoptions|Penerapan lainnya|Thêm quy trình áp dụng|การนำไปใช้อื่น|更多采用记录
More community procedures|Prosedur komunitas lainnya|Thêm quy trình cộng đồng|ขั้นตอนชุมชนเพิ่มเติม|更多社区规程
Resolve before approval|Selesaikan sebelum persetujuan|Xử lý trước khi duyệt|แก้ไขก่อนอนุมัติ|批准前解决
Overdue|Terlambat|Quá hạn|เกินกำหนด|逾期
No tasks match these filters|Tidak ada tugas sesuai filter|Không có công việc phù hợp|ไม่มีงานตรงกับตัวกรอง|没有符合筛选条件的任务
No SOP issues have been recorded.|Belum ada masalah SOP tercatat.|Chưa ghi nhận vấn đề SOP.|ยังไม่มีปัญหา SOP ที่บันทึกไว้|尚未记录 SOP 问题。
No community SOPs have been published yet.|Belum ada SOP komunitas diterbitkan.|Chưa có SOP cộng đồng được đăng.|ยังไม่มี SOP ชุมชนที่เผยแพร่|尚无已发布的社区 SOP。
No tasks match these filters.|Tidak ada tugas sesuai filter.|Không có công việc phù hợp.|ไม่มีงานตรงกับตัวกรอง|没有符合筛选条件的任务。
Adopt a procedure or create a manual task to begin.|Terapkan prosedur atau buat tugas untuk memulai.|Áp dụng quy trình hoặc tạo công việc để bắt đầu.|นำขั้นตอนมาใช้หรือสร้างงานเพื่อเริ่ม|采用规程或创建手动任务以开始。
Create your first procedure or customize a starter template.|Buat prosedur pertama atau sesuaikan templat.|Tạo quy trình đầu tiên hoặc tùy chỉnh mẫu.|สร้างขั้นตอนแรกหรือปรับแม่แบบเริ่มต้น|创建首个规程或自定义初始模板。
Assigned work, evidence, and corrective follow-up.|Tugas, bukti, dan tindak lanjut perbaikan.|Công việc, bằng chứng và theo dõi khắc phục.|งานที่ได้รับมอบหมาย หลักฐาน และการติดตามแก้ไข|指派工作、证据及纠正跟进。
Exemptions do not count as successful checks.|Pengecualian bukan pemeriksaan berhasil.|Ngoại lệ không được tính là kiểm tra đạt.|ข้อยกเว้นไม่นับเป็นการตรวจผ่าน|豁免不计为检查成功。
Review the current stage and farm targets. Work begins from activation.|Tinjau tahap dan sasaran tambak. Tugas dimulai saat aktivasi.|Xem giai đoạn và mục tiêu trang trại. Công việc bắt đầu khi kích hoạt.|ตรวจสอบระยะและเป้าหมายฟาร์ม งานเริ่มเมื่อเปิดใช้|审阅当前阶段和农场目标。工作从激活时开始。
Scope changed; this occurrence will be cancelled.|Cakupan berubah; tugas ini akan dibatalkan.|Phạm vi thay đổi; công việc này sẽ bị hủy.|ขอบเขตเปลี่ยน งานครั้งนี้จะถูกยกเลิก|范围已改变；本次任务将被取消。
Scope changed: this occurrence will be cancelled; future work uses the new scope.|Cakupan berubah: tugas ini dibatalkan; tugas mendatang memakai cakupan baru.|Phạm vi thay đổi: công việc này bị hủy; công việc sau dùng phạm vi mới.|ขอบเขตเปลี่ยน งานครั้งนี้จะถูกยกเลิก งานในอนาคตใช้ขอบเขตใหม่|范围已改变：本次任务将取消；未来工作使用新范围。
Existing work keeps its rules when you apply an update to future work. Migration replaces the selected unresolved rules and retains their prior versions.|Tugas yang ada tetap memakai aturan lama. Migrasi mengganti aturan tugas terbuka yang dipilih dan menyimpan versi sebelumnya.|Công việc hiện tại giữ quy tắc cũ khi cập nhật công việc sau. Chuyển đổi thay quy tắc được chọn và giữ phiên bản trước.|งานเดิมคงกฎเดิมเมื่ออัปเดตงานในอนาคต การย้ายเปลี่ยนกฎงานค้างที่เลือกและเก็บเวอร์ชันเดิม|应用未来更新时，现有任务保留原规则。迁移会替换所选未解决规则并保留先前版本。
Turn approved farm procedures into clear work, evidence, and follow-up.|Ubah prosedur tambak yang disetujui menjadi tugas, bukti, dan tindak lanjut.|Chuyển quy trình đã duyệt thành công việc, bằng chứng và theo dõi rõ ràng.|เปลี่ยนขั้นตอนฟาร์มที่อนุมัติเป็นงาน หลักฐาน และการติดตามที่ชัดเจน|将已批准农场规程转化为明确工作、证据和跟进。
preparation|Persiapan|Chuẩn bị|เตรียมการ|准备
stocking|Penebaran|Thả giống|ปล่อยลูกกุ้ง|放苗
growout|Pembesaran|Nuôi thương phẩm|เลี้ยงโต|养成
harvest|Panen|Thu hoạch|เก็บเกี่ยว|收获
turnaround|Persiapan siklus berikutnya|Chuẩn bị vụ tiếp|เตรียมรอบใหม่|周转准备
pond|Kolam|Ao|บ่อ|池塘
block|Blok|Khu|บล็อก|区块
company|Perusahaan|Công ty|บริษัท|公司
low|Rendah|Thấp|ต่ำ|低
warning|Peringatan|Cảnh báo|คำเตือน|警告
critical|Kritis|Nghiêm trọng|วิกฤต|严重
open|Terbuka|Chưa xử lý|เปิด|未完成
scheduled|Terjadwal|Đã lên lịch|กำหนดไว้|已计划
submitted|Dikirim|Đã gửi|ส่งแล้ว|已提交
needs_review|Perlu ditinjau|Cần xem xét|ต้องตรวจสอบ|需审阅
completed|Selesai|Hoàn thành|เสร็จแล้ว|已完成
waived|Dikecualikan|Được miễn|ยกเว้น|已豁免
cancelled|Dibatalkan|Đã hủy|ยกเลิก|已取消
pass|Lulus|Đạt|ผ่าน|通过
fail|Gagal|Không đạt|ไม่ผ่าน|未通过
insufficient_evidence|Bukti tidak cukup|Thiếu bằng chứng|หลักฐานไม่เพียงพอ|证据不足
pending|Menunggu|Đang chờ|รอดำเนินการ|待处理
closed|Ditutup|Đã đóng|ปิดแล้ว|已关闭
closure_review|Tinjauan penutupan|Xem xét đóng|ตรวจสอบการปิด|关闭审阅
Measurement window (minutes)|Jendela pengukuran (menit)|Khoảng đo (phút)|ช่วงการวัด (นาที)|测量时间窗（分钟）
Repeat every (days)|Ulang setiap (hari)|Lặp lại mỗi (ngày)|ทำซ้ำทุก (วัน)|重复间隔（天）
DOC from|Mulai DOC|Từ DOC|เริ่ม DOC|起始 DOC
DOC through|Hingga DOC|Đến DOC|ถึง DOC|截止 DOC
Offset (minutes)|Selang waktu (menit)|Thời gian lệch (phút)|เวลาชดเชย (นาที)|时间偏移（分钟）
Recheck interval (minutes)|Interval pemeriksaan ulang (menit)|Khoảng kiểm tra lại (phút)|ช่วงตรวจซ้ำ (นาที)|复检间隔（分钟）
Maximum rechecks|Maksimum pemeriksaan ulang|Số lần kiểm tra lại tối đa|จำนวนตรวจซ้ำสูงสุด|最多复检次数
Escalation delay (minutes)|Penundaan eskalasi (menit)|Thời gian nâng cấp (phút)|ระยะยกระดับ (นาที)|升级延迟（分钟）
Dependencies|Prasyarat|Điều kiện trước|เงื่อนไขก่อนหน้า|依赖步骤
On pass|Jika lulus|Khi đạt|เมื่อผ่าน|通过后
On failure|Jika gagal|Khi không đạt|เมื่อไม่ผ่าน|失败后
Recovery verified|Pemulihan terverifikasi|Phục hồi đã xác minh|ยืนยันการฟื้นตัวแล้ว|恢复已验证
Recovery evidence required|Bukti pemulihan diperlukan|Cần bằng chứng phục hồi|ต้องมีหลักฐานฟื้นตัว|需要恢复证据
Recovery required|Pemulihan diperlukan|Cần phục hồi|ต้องฟื้นตัว|需要恢复
Exact observation time required|Waktu pengamatan tepat diperlukan|Cần thời gian quan sát chính xác|ต้องมีเวลาสังเกตที่แน่นอน|需要准确观测时间
Recorded date accepted|Tanggal tercatat diterima|Chấp nhận ngày ghi nhận|ยอมรับวันที่บันทึก|接受记录日期
Opened|Dibuka|Mở lúc|เปิดเมื่อ|开启时间
Closed|Ditutup|Đóng lúc|ปิดเมื่อ|关闭时间
Timezone:|Zona waktu:|Múi giờ:|เขตเวลา:|时区：
Approved:|Disetujui:|Đã duyệt:|อนุมัติ:|批准：
Completed:|Selesai:|Hoàn thành:|เสร็จ:|完成：
Evidence:|Bukti:|Bằng chứng:|หลักฐาน:|证据：
Previous:|Sebelumnya:|Trước đây:|ก่อนหน้า:|此前：
Parameter result:|Hasil parameter:|Kết quả thông số:|ผลพารามิเตอร์:|参数结果：
rechecks ·|pemeriksaan ulang ·|lần kiểm tra lại ·|ครั้งตรวจซ้ำ ·|次复检 ·
steps|langkah|bước|ขั้นตอน|步骤
outside-target checks|pemeriksaan di luar sasaran|kiểm tra ngoài mục tiêu|การตรวจนอกเป้าหมาย|超出目标的检查
adopting farms|tambak pengguna|trang trại áp dụng|ฟาร์มที่นำไปใช้|采用农场
unresolved tasks affected.|tugas terbuka terdampak.|công việc chưa xử lý bị ảnh hưởng.|งานค้างที่ได้รับผลกระทบ|个未解决任务受影响。
min|menit|phút|นาที|分钟
SOP sections|Bagian SOP|Mục SOP|ส่วน SOP|SOP 分区
SHRIMPLY • DAILY WORK|SHRIMPLY • TUGAS HARIAN|SHRIMPLY • CÔNG VIỆC HẰNG NGÀY|SHRIMPLY • งานประจำวัน|SHRIMPLY • 日常工作
SHRIMPLY • FARM WORKFLOWS|SHRIMPLY • ALUR KERJA TAMBAK|SHRIMPLY • QUY TRÌNH TRANG TRẠI|SHRIMPLY • ขั้นตอนฟาร์ม|SHRIMPLY • 农场流程

`;
const text: Record<string, string[]> = Object.fromEntries(
  rows
    .trim()
    .split("\n")
    .map((row) => {
      const [key, ...translations] = row.split("|");
      return [key, translations];
    }),
);
export function sopText(value: string, language: string): string {
  const index = ["id", "vi", "th", "zh"].indexOf(language);
  return index < 0
    ? value.replace(/_/g, " ")
    : text[value]?.[index] || value.replace(/_/g, " ");
}

export function sopFieldLabel(key: string, language: string): string {
  const labels: Record<string, string> = {
    windowMinutes: "Measurement window (minutes)",
    everyDays: "Repeat every (days)",
    docFrom: "DOC from",
    docTo: "DOC through",
    offsetMinutes: "Offset (minutes)",
    recheckMinutes: "Recheck interval (minutes)",
    maxRechecks: "Maximum rechecks",
    escalationMinutes: "Escalation delay (minutes)",
  };
  return sopText(labels[key] || key, language);
}
