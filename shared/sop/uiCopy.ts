/** Interface text only. Farm instructions and approved rules retain their original language. */
const rows = `
Manage adoption|Kelola penerapan|Quản lý áp dụng|จัดการการนำไปใช้|管理采用
Cancel|Batal|Hủy|ยกเลิก|取消
Confirm decision|Konfirmasi keputusan|Xác nhận quyết định|ยืนยันการตัดสินใจ|确认决定
1. Select ponds|1. Pilih kolam|1. Chọn ao|1. เลือกบ่อ|1. 选择池塘
2. Review responsibility|2. Tinjau penanggung jawab|2. Kiểm tra người phụ trách|2. ตรวจสอบผู้รับผิดชอบ|2. 核对负责人
3. Confirm adoption|3. Konfirmasi penerapan|3. Xác nhận áp dụng|3. ยืนยันการนำไปใช้|3. 确认采用
Search ponds|Cari kolam|Tìm ao|ค้นหาบ่อ|搜索池塘
Select visible ponds|Pilih kolam yang ditampilkan|Chọn các ao đang hiển thị|เลือกบ่อที่แสดง|选择当前显示的池塘
Clear selection|Hapus pilihan|Xóa lựa chọn|ล้างการเลือก|清除选择
ponds selected|kolam terpilih|ao đã chọn|บ่อที่เลือก|个池塘已选择
Active cycle|Siklus aktif|Vụ nuôi đang hoạt động|รอบการเลี้ยงที่ใช้งาน|进行中的养殖周期
Preparation / no active cycle|Persiapan / belum ada siklus aktif|Chuẩn bị / chưa có vụ đang hoạt động|เตรียมบ่อ / ยังไม่มีรอบที่ใช้งาน|准备阶段 / 无进行中的周期
Select whole blocks|Pilih seluruh blok|Chọn toàn bộ khu|เลือกทั้งบล็อก|选择整个区块
Selected through block|Dipilih melalui blok|Được chọn theo khu|เลือกผ่านบล็อก|通过区块选择
Assigned to|Ditugaskan kepada|Giao cho|มอบหมายให้|分配给
Accept and activate|Terima dan aktifkan|Chấp nhận và kích hoạt|ยอมรับและเปิดใช้งาน|接受并启用
Apply reviewed changes|Terapkan perubahan yang ditinjau|Áp dụng thay đổi đã xem xét|ใช้การเปลี่ยนแปลงที่ตรวจสอบแล้ว|应用已核对的更改
Review adoption|Tinjau penerapan|Xem xét áp dụng|ตรวจสอบการนำไปใช้|核对采用设置
Reviewing…|Meninjau…|Đang xem xét…|กำลังตรวจสอบ…|正在核对…
Saving…|Menyimpan…|Đang lưu…|กำลังบันทึก…|正在保存…
No matching ponds.|Tidak ada kolam yang cocok.|Không có ao phù hợp.|ไม่พบบ่อที่ตรงกัน|没有匹配的池塘。
Choose manager|Pilih manajer|Chọn quản lý|เลือกผู้จัดการ|选择管理人员
Open assigned To-do|Buka tugas yang ditugaskan|Mở công việc được giao|เปิดงานที่มอบหมาย|打开已分配的待办
Choose ponds, review their assignments, then activate work.|Pilih kolam, tinjau penugasannya, lalu aktifkan tugas.|Chọn ao, xem phân công rồi kích hoạt công việc.|เลือกบ่อ ตรวจสอบการมอบหมาย แล้วเปิดใช้งานงาน|选择池塘，核对现有分配，然后启用任务。
You can select more than one pond. Existing pond assignments determine who receives the work.|Anda dapat memilih lebih dari satu kolam. Penugasan kolam yang ada menentukan penerima tugas.|Có thể chọn nhiều ao. Phân công ao hiện có quyết định người nhận việc.|เลือกได้หลายบ่อ การมอบหมายบ่อที่มีอยู่กำหนดผู้รับงาน|可以选择多个池塘。任务接收人由现有池塘分配决定。
Applies to each selected pond’s active cycle. Unstocked ponds need a standing procedure.|Berlaku untuk siklus aktif setiap kolam terpilih. Kolam yang belum ditebar memerlukan prosedur berkelanjutan.|Áp dụng cho vụ đang hoạt động của từng ao đã chọn. Ao chưa thả cần quy trình thường trực.|ใช้กับรอบที่ใช้งานของแต่ละบ่อ บ่อที่ยังไม่ลงลูกกุ้งต้องใช้ขั้นตอนต่อเนื่อง|适用于每个所选池塘的当前周期。尚未投苗的池塘需要长期规程。
Includes preparation and follows these ponds into future cycles.|Mencakup persiapan dan mengikuti kolam ini ke siklus berikutnya.|Bao gồm chuẩn bị và tiếp tục áp dụng cho các vụ sau.|รวมการเตรียมบ่อและติดตามบ่อเหล่านี้ในรอบต่อไป|包括准备阶段，并继续适用于这些池塘的后续周期。
Block selection follows future pond membership.|Pilihan blok mengikuti keanggotaan kolam di masa depan.|Lựa chọn khu theo dõi các ao được thêm sau này.|การเลือกบล็อกติดตามสมาชิกบ่อในอนาคต|选择区块后，后续加入区块的池塘也适用。
These ponds have no active cycle. Choose Standing procedure to include them:|Kolam ini belum memiliki siklus aktif. Pilih Prosedur berkelanjutan untuk menyertakannya:|Các ao này chưa có vụ đang hoạt động. Chọn Quy trình thường trực để bao gồm:|บ่อเหล่านี้ยังไม่มีรอบที่ใช้งาน เลือกขั้นตอนต่อเนื่องเพื่อรวมบ่อ:|以下池塘没有进行中的周期。请选择长期规程以包含它们：
Work goes to the technician already assigned to the pond’s block. The accountable manager receives work when no technician is assigned.|Tugas diberikan kepada teknisi yang sudah ditugaskan pada blok kolam. Jika belum ada teknisi, tugas diberikan kepada manajer penanggung jawab.|Công việc giao cho kỹ thuật viên đã phụ trách khu của ao. Nếu chưa có kỹ thuật viên, quản lý chịu trách nhiệm nhận việc.|งานส่งให้ช่างเทคนิคที่รับผิดชอบบล็อกของบ่อ หากไม่มีช่างเทคนิค งานจะส่งให้ผู้จัดการที่รับผิดชอบ|任务交给已分配到池塘所在区块的技术员。未分配技术员时，由负责的管理人员接收任务。
Work follows existing pond/block assignments. The accountable manager receives unassigned work.|Tugas mengikuti penugasan kolam/blok yang ada. Tugas tanpa teknisi diberikan kepada manajer penanggung jawab.|Công việc theo phân công ao/khu hiện có. Quản lý nhận việc chưa được phân công.|งานตามการมอบหมายบ่อ/บล็อกที่มีอยู่ ผู้จัดการรับงานที่ยังไม่มอบหมาย|任务沿用现有池塘/区块分配。未分配的任务由负责的管理人员接收。
The accountable manager is always included.|Manajer penanggung jawab selalu disertakan.|Luôn bao gồm quản lý chịu trách nhiệm.|รวมผู้จัดการที่รับผิดชอบเสมอ|始终包含负责的管理人员。
This SOP also includes company work.|SOP ini juga mencakup tugas perusahaan.|SOP này cũng bao gồm công việc công ty.|SOP นี้รวมงานระดับบริษัทด้วย|此 SOP 也包含公司级任务。
Individual check assignments in this SOP take precedence over pond assignments.|Penugasan pemeriksaan khusus pada SOP ini didahulukan daripada penugasan kolam.|Phân công riêng cho từng kiểm tra trong SOP được ưu tiên hơn phân công ao.|การมอบหมายตรวจสอบรายข้อใน SOP มีลำดับก่อนการมอบหมายบ่อ|此 SOP 中单项检查的分配优先于池塘分配。
Tasks begin from the saved production stage. Written-evidence checks require review; measurement checks use saved source records.|Tugas dimulai dari tahap produksi yang tersimpan. Bukti tertulis memerlukan tinjauan; pemeriksaan pengukuran menggunakan catatan sumber tersimpan.|Công việc bắt đầu từ giai đoạn đã lưu. Bằng chứng viết cần được duyệt; kiểm tra số đo dùng hồ sơ nguồn đã lưu.|งานเริ่มจากระยะการผลิตที่บันทึกไว้ หลักฐานบันทึกต้องได้รับการตรวจสอบ ส่วนค่าที่วัดใช้ข้อมูลต้นทางที่บันทึกแล้ว|任务从已保存的生产阶段开始。书面证据检查需要审核；测量检查使用已保存的来源记录。
Adoption saved. Open To-do to view assigned work. New tasks appear after the scheduler runs.|Penerapan tersimpan. Buka Tugas untuk melihat pekerjaan. Tugas baru muncul setelah penjadwal berjalan.|Đã lưu áp dụng. Mở Công việc để xem việc được giao. Việc mới xuất hiện sau khi lịch chạy.|บันทึกการนำไปใช้แล้ว เปิดงานเพื่อดูงานที่มอบหมาย งานใหม่จะแสดงหลังตัวจัดกำหนดการทำงาน|采用设置已保存。打开待办查看已分配工作。调度器运行后会显示新任务。
Pond assignments or production stages changed. Review adoption again.|Penugasan kolam atau tahap produksi berubah. Tinjau penerapan kembali.|Phân công ao hoặc giai đoạn đã thay đổi. Xem xét áp dụng lại.|การมอบหมายบ่อหรือระยะการผลิตเปลี่ยนไป โปรดตรวจสอบอีกครั้ง|池塘分配或生产阶段已更改。请重新核对采用设置。
Unable to review adoption.|Tidak dapat meninjau penerapan.|Không thể xem xét áp dụng.|ไม่สามารถตรวจสอบการนำไปใช้|无法核对采用设置。
Unable to activate adoption.|Tidak dapat mengaktifkan penerapan.|Không thể kích hoạt áp dụng.|ไม่สามารถเปิดใช้งานการนำไปใช้|无法启用采用设置。
Record a measurement|Catat pengukuran|Ghi nhận phép đo|บันทึกค่าที่วัด|记录测量值
outside target|Di luar sasaran|Ngoài mục tiêu|นอกเป้าหมาย|超出目标
Select a warning to open the field that needs attention.|Pilih peringatan untuk membuka kolom yang perlu dilengkapi.|Chọn cảnh báo để mở trường cần bổ sung.|เลือกคำเตือนเพื่อเปิดช่องที่ต้องแก้ไข|选择警告以打开需要补充的字段。
Confirm deletion|Konfirmasi penghapusan|Xác nhận xóa|ยืนยันการลบ|确认删除
Confirm delete|Konfirmasi hapus|Xác nhận xóa|ยืนยันลบ|确认删除
Keep SOP|Batalkan penghapusan|Giữ SOP|เก็บ SOP|保留 SOP
Delete draft|Hapus draf|Xóa bản nháp|ลบฉบับร่าง|删除草稿
Delete SOP|Hapus SOP|Xóa SOP|ลบ SOP|删除 SOP
Deleted SOPs|SOP yang dihapus|SOP đã xóa|SOP ที่ลบ|已删除的 SOP
Restore SOP|Pulihkan SOP|Khôi phục SOP|กู้คืน SOP|恢复 SOP
You can restore it from Deleted SOPs. Published copies are withdrawn; existing farm tasks keep their instructions.|Anda dapat memulihkannya dari SOP yang dihapus. Salinan publik ditarik; tugas tambak yang sudah ada tetap menyimpan instruksinya.|Có thể khôi phục trong SOP đã xóa. Bản công khai được rút lại; công việc hiện có giữ nguyên hướng dẫn.|กู้คืนได้จาก SOP ที่ลบ สำเนาที่เผยแพร่จะถูกถอน งานฟาร์มเดิมยังคงคำแนะนำ|可以从已删除的 SOP 恢复。公开副本将撤回；现有农场任务保留其说明。
SOP moved to Deleted SOPs.|SOP dipindahkan ke SOP yang dihapus.|SOP đã chuyển vào SOP đã xóa.|ย้าย SOP ไปยังรายการที่ลบแล้ว|SOP 已移至已删除的 SOP。
SOP restored. Republish separately if needed.|SOP dipulihkan. Publikasikan kembali secara terpisah bila perlu.|SOP đã khôi phục. Xuất bản lại riêng nếu cần.|กู้คืน SOP แล้ว เผยแพร่ใหม่แยกต่างหากหากจำเป็น|SOP 已恢复。如有需要，请单独重新发布。
Additional reference files|File referensi tambahan|Tệp tham khảo bổ sung|ไฟล์อ้างอิงเพิ่มเติม|其他参考文件
These files are attached for readers only. To convert a document, use Import SOP document above.|File ini hanya dilampirkan untuk pembaca. Untuk mengonversi dokumen, gunakan Impor dokumen SOP di atas.|Các tệp này chỉ dành cho người đọc. Để chuyển đổi, dùng Nhập tài liệu SOP ở trên.|ไฟล์เหล่านี้แนบให้อ่านเท่านั้น หากต้องการแปลงให้ใช้นำเข้าเอกสาร SOP ด้านบน|这些文件仅供读者参考。转换文档请使用上方的导入 SOP 文档。
Import failed|Impor gagal|Nhập thất bại|นำเข้าไม่สำเร็จ|导入失败
Import did not finish. Your file is still selected. Retry or return to the library. If content appeared below, use Save draft to retry saving.|Impor belum selesai. File masih dipilih. Coba lagi atau kembali ke pustaka. Jika isi muncul di bawah, gunakan Simpan draf untuk menyimpan ulang.|Nhập chưa hoàn tất. Tệp vẫn được chọn. Thử lại hoặc về thư viện. Nếu nội dung xuất hiện bên dưới, dùng Lưu bản nháp để lưu lại.|นำเข้ายังไม่เสร็จ ไฟล์ยังถูกเลือก ลองอีกครั้งหรือกลับคลัง หากมีเนื้อหาด้านล่างให้บันทึกฉบับร่างอีกครั้ง|导入未完成。文件仍已选择。重试或返回资料库。如果下方出现了内容，请使用保存草稿重试保存。
Import did not finish. Retry the import or return to the library. If content appeared below, use Save draft to retry saving.|Impor belum selesai. Coba impor lagi atau kembali ke pustaka. Jika isi muncul di bawah, gunakan Simpan draf untuk menyimpan ulang.|Nhập chưa hoàn tất. Thử lại hoặc về thư viện. Nếu nội dung xuất hiện bên dưới, dùng Lưu bản nháp để lưu lại.|นำเข้ายังไม่เสร็จ ลองนำเข้าอีกครั้งหรือกลับคลัง หากมีเนื้อหาด้านล่างให้บันทึกฉบับร่างอีกครั้ง|导入未完成。重试导入或返回资料库。如果下方出现了内容，请使用保存草稿重试保存。
SOP document content|Isi dokumen SOP|Nội dung tài liệu SOP|เนื้อหาเอกสาร SOP|SOP文档内容
Workflow rules|Aturan alur kerja|Quy tắc công việc|กฎเวิร์กโฟลว์|工作流程规则
Source pages|Halaman sumber|Trang nguồn|หน้าต้นฉบับ|来源页码
Source content still needs review|Isi sumber masih perlu ditinjau|Nội dung nguồn cần xem xét|เนื้อหาต้นฉบับยังต้องตรวจสอบ|来源内容仍需审核
Section title|Judul bagian|Tiêu đề phần|ชื่อส่วน|章节标题
Method and guidance|Metode dan panduan|Phương pháp và hướng dẫn|วิธีการและคำแนะนำ|方法与指南
Unresolved source omission|Bagian sumber yang belum tercakup|Nội dung nguồn còn thiếu|เนื้อหาต้นฉบับที่ยังขาด|尚未补充的来源内容
Mark omission resolved|Tandai kekurangan telah diselesaikan|Đánh dấu đã bổ sung|ทำเครื่องหมายว่าแก้ไขแล้ว|标记遗漏已解决
Table title|Judul tabel|Tiêu đề bảng|ชื่อตาราง|表格标题
Column heading|Judul kolom|Tiêu đề cột|หัวคอลัมน์|列标题
rows|baris|hàng|แถว|行
row|baris|hàng|แถว|行
Add row|Tambah baris|Thêm hàng|เพิ่มแถว|添加行
Remove row|Hapus baris|Xóa hàng|ลบแถว|删除行
Reference table|Tabel referensi|Bảng tham chiếu|ตารางอ้างอิง|参考表
Parameter|Parameter|Thông số|พารามิเตอร์|参数
Source value|Nilai sumber|Giá trị nguồn|ค่าจากต้นฉบับ|来源数值
Notes|Catatan|Ghi chú|หมายเหตุ|备注
Add reference table|Tambah tabel referensi|Thêm bảng tham chiếu|เพิ่มตารางอ้างอิง|添加参考表
Remove section|Hapus bagian|Xóa phần|ลบส่วน|删除章节
Procedure section|Bagian prosedur|Phần quy trình|ส่วนขั้นตอน|规程章节
Add document section|Tambah bagian dokumen|Thêm phần tài liệu|เพิ่มส่วนเอกสาร|添加文档章节
Keep methods and source values here. Workflow checks are configured separately below.|Simpan metode dan nilai sumber di sini. Pemeriksaan alur kerja diatur terpisah di bawah.|Lưu phương pháp và giá trị nguồn tại đây. Kiểm tra công việc được cấu hình riêng bên dưới.|เก็บวิธีการและค่าต้นฉบับไว้ที่นี่ ตั้งค่าการตรวจสอบงานแยกด้านล่าง|在此保存方法和来源数值。工作流程检查在下方单独配置。
This import contains workflow rules only. Re-import the source with the updated SOP service to retain document sections and tables.|Impor ini hanya berisi aturan alur kerja. Impor ulang sumber dengan layanan SOP terbaru agar bagian dokumen dan tabel tersimpan.|Bản nhập này chỉ có quy tắc công việc. Nhập lại nguồn bằng dịch vụ SOP đã cập nhật để giữ các phần và bảng.|รายการนำเข้านี้มีเฉพาะกฎงาน นำเข้าต้นฉบับอีกครั้งด้วยบริการ SOP ที่อัปเดตเพื่อเก็บส่วนเอกสารและตาราง|此导入仅包含工作流程规则。请使用更新后的SOP服务重新导入，以保留文档章节和表格。

Download source|Unduh sumber|Tải tài liệu nguồn|ดาวน์โหลดต้นฉบับ|下载原文
Mobile reminders|Pengingat seluler|Nhắc nhở trên điện thoại|การแจ้งเตือนบนมือถือ|手机提醒
Active work|Pekerjaan aktif|Công việc đang thực hiện|งานที่กำลังดำเนินการ|进行中的工作
All tasks|Semua tugas|Tất cả công việc|งานทั้งหมด|全部任务
Filters|Filter|Bộ lọc|ตัวกรอง|筛选
Clear filters|Hapus filter|Xóa bộ lọc|ล้างตัวกรอง|清除筛选
Assigned work|Pekerjaan yang ditugaskan|Công việc được giao|งานที่มอบหมาย|已分配的工作
tasks|tugas|công việc|งาน|项任务
No assigned work yet|Belum ada pekerjaan yang ditugaskan|Chưa có công việc được giao|ยังไม่มีงานที่มอบหมาย|尚无已分配的工作
Choose another status or clear filters to see more work.|Pilih status lain atau hapus filter untuk melihat pekerjaan lain.|Chọn trạng thái khác hoặc xóa bộ lọc để xem thêm công việc.|เลือกสถานะอื่นหรือล้างตัวกรองเพื่อดูงานเพิ่มเติม|选择其他状态或清除筛选以查看更多工作。
Show all tasks|Tampilkan semua tugas|Hiển thị tất cả công việc|แสดงงานทั้งหมด|显示全部任务
Read farm procedures, review source documents, and manage approved workflows.|Baca prosedur tambak, tinjau dokumen sumber, dan kelola alur kerja yang disetujui.|Đọc quy trình trang trại, xem xét tài liệu nguồn và quản lý quy trình đã duyệt.|อ่านขั้นตอนฟาร์ม ตรวจสอบเอกสารต้นฉบับ และจัดการงานที่อนุมัติแล้ว|阅读农场规程、审核来源文档并管理已批准的工作流程。
STANDARD OPERATING PROCEDURE|PROSEDUR OPERASIONAL STANDAR|QUY TRÌNH VẬN HÀNH CHUẨN|ขั้นตอนการปฏิบัติงานมาตรฐาน|标准操作规程
revision|revisi|phiên bản|ฉบับแก้ไข|修订
Read SOP|Baca SOP|Đọc SOP|อ่าน SOP|阅读 SOP
Edit workflow|Edit alur kerja|Sửa quy trình công việc|แก้ไขขั้นตอนงาน|编辑工作流程
Draft guidance. Review and approve before applying it to farm work.|Panduan draf. Tinjau dan setujui sebelum diterapkan di tambak.|Hướng dẫn nháp. Xem xét và duyệt trước khi áp dụng tại trang trại.|คำแนะนำฉบับร่าง ตรวจสอบและอนุมัติก่อนใช้ในฟาร์ม|草稿指南。用于农场工作前请审核并批准。
Overview and review notes|Ikhtisar dan catatan tinjauan|Tổng quan và ghi chú đánh giá|ภาพรวมและบันทึกการตรวจสอบ|概述与审核说明
Source documents|Dokumen sumber|Tài liệu nguồn|เอกสารต้นฉบับ|来源文档
Read the source for full tables, recipes, and context. AI guidance requires review.|Baca sumber untuk tabel, resep, dan konteks lengkap. Panduan AI perlu ditinjau.|Đọc nguồn để xem đầy đủ bảng, công thức và ngữ cảnh. Cần xem xét hướng dẫn AI.|อ่านต้นฉบับเพื่อดูตาราง สูตร และบริบททั้งหมด ต้องตรวจสอบคำแนะนำ AI|完整表格、配方和背景请参阅原文。AI 指南需要审核。
Procedure contents|Daftar isi prosedur|Mục lục quy trình|สารบัญขั้นตอน|规程目录
Contents|Daftar isi|Mục lục|สารบัญ|目录
If the expected result is not met|Jika hasil yang diharapkan tidak tercapai|Nếu không đạt kết quả mong đợi|หากไม่ได้ผลตามที่คาดหวัง|未达到预期结果时
Required evidence|Bukti yang diperlukan|Bằng chứng cần có|หลักฐานที่ต้องใช้|所需证据
Choose a document, then generate a draft. The draft and source are saved for review.|Pilih dokumen, lalu buat draf. Draf dan sumber disimpan untuk ditinjau.|Chọn tài liệu rồi tạo bản nháp. Bản nháp và nguồn được lưu để xem xét.|เลือกเอกสารแล้วสร้างฉบับร่าง ฉบับร่างและต้นฉบับจะถูกบันทึกเพื่อตรวจสอบ|选择文档后生成草稿。草稿和原文会保存供审核。
Approve draft|Setujui draf|Duyệt bản nháp|อนุมัติฉบับร่าง|批准草稿
Saving draft…|Menyimpan draf…|Đang lưu bản nháp…|กำลังบันทึกฉบับร่าง…|正在保存草稿…
Draft not saved|Draf belum tersimpan|Chưa lưu bản nháp|ยังไม่ได้บันทึกฉบับร่าง|草稿未保存
Your edits are still here. Retry Save draft.|Perubahan Anda masih ada di editor. Coba Simpan draf lagi.|Các chỉnh sửa vẫn còn trong trình soạn thảo. Hãy thử lưu lại.|การแก้ไขยังอยู่ในตัวแก้ไข ลองบันทึกฉบับร่างอีกครั้ง|修改仍保留在编辑器中。请重试保存草稿。
The draft was not saved. Review it and choose Save draft to retry.|Draf belum tersimpan. Tinjau lalu pilih Simpan draf untuk mencoba lagi.|Bản nháp chưa được lưu. Kiểm tra rồi chọn lưu để thử lại.|ยังไม่ได้บันทึกฉบับร่าง ตรวจสอบแล้วเลือกบันทึกเพื่อลองใหม่|草稿未保存。请检查并选择保存草稿重试。
No measurement limits are set. This check only requires a record.|Batas pengukuran belum diatur. Pemeriksaan ini hanya membutuhkan catatan.|Chưa đặt giới hạn đo. Chỉ yêu cầu có bản ghi.|ยังไม่ได้กำหนดขีดจำกัดการวัด การตรวจสอบนี้ต้องการเพียงบันทึก|尚未设置测量限值。此检查仅要求存在记录。
These are SOP targets, not today’s measurements.|Ini adalah sasaran SOP, bukan hasil pengukuran hari ini.|Đây là mục tiêu SOP, không phải số đo hôm nay.|นี่คือเป้าหมาย SOP ไม่ใช่ค่าที่วัดวันนี้|这些是SOP目标值，不是今天的测量结果。
The SOP backend must be updated before saving document sections and tables. Your existing saved draft has not been changed.|Layanan SOP perlu diperbarui agar bagian prosedur dan tabel dapat disimpan. Draf tersimpan sebelumnya belum berubah.|Cần cập nhật dịch vụ SOP để lưu các phần và bảng. Bản nháp đã lưu chưa thay đổi.|ต้องอัปเดตบริการ SOP เพื่อบันทึกส่วนเอกสารและตาราง ฉบับร่างเดิมยังไม่เปลี่ยนแปลง|需更新SOP服务才能保存章节和表格。原有草稿未改变。
Draft saved. Review before approval.|Draf tersimpan. Tinjau sebelum disetujui.|Đã lưu bản nháp. Xem xét trước khi duyệt.|บันทึกฉบับร่างแล้ว ตรวจสอบก่อนอนุมัติ|草稿已保存。批准前请审核。
Uploading source document…|Mengunggah dokumen sumber…|Đang tải tài liệu nguồn…|กำลังอัปโหลดเอกสารต้นฉบับ…|正在上传来源文档…
Generating SOP draft. Large documents can take several minutes. Keep this page open…|Membuat draf SOP. Dokumen besar bisa memerlukan beberapa menit. Biarkan halaman ini tetap terbuka…|Đang tạo bản nháp SOP. Tài liệu lớn có thể mất vài phút. Giữ trang này mở…|กำลังสร้างฉบับร่าง SOP เอกสารขนาดใหญ่อาจใช้เวลาหลายนาที โปรดเปิดหน้านี้ไว้…|正在生成SOP草稿。大文档可能需要几分钟，请保持此页面打开…
SOP generation timed out. Try generating the draft again.|Pembuatan SOP melewati batas waktu. Coba buat draf lagi.|Tạo SOP quá thời gian. Hãy thử tạo lại bản nháp.|การสร้าง SOP หมดเวลา ลองสร้างฉบับร่างอีกครั้ง|SOP生成超时，请重试生成草稿。
Saving draft and source document…|Menyimpan draf dan dokumen sumber…|Đang lưu bản nháp và tài liệu nguồn…|กำลังบันทึกฉบับร่างและเอกสารต้นฉบับ…|正在保存草稿和来源文档…
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
Optional|Opsional|Tùy chọn|ไม่บังคับ|可选
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

Edit farm procedure|Edit prosedur tambak|Sửa quy trình trang trại|แก้ไขขั้นตอนของฟาร์ม|编辑农场规程
All urgency levels|Semua tingkat urgensi|Tất cả mức độ khẩn cấp|ทุกระดับความเร่งด่วน|所有紧急程度
Assigned staff|Petugas yang ditugaskan|Nhân viên được giao|ผู้รับผิดชอบ|已指派员工
Evidence submitted for verification.|Bukti dikirim untuk verifikasi.|Đã gửi bằng chứng để xác minh.|ส่งหลักฐานเพื่อการตรวจสอบแล้ว|证据已提交，等待验证。
Evidence submitted. Source records determine automatic checks.|Bukti dikirim. Pemeriksaan otomatis menggunakan catatan sumber.|Đã gửi bằng chứng. Kiểm tra tự động dựa trên bản ghi nguồn.|ส่งหลักฐานแล้ว การตรวจอัตโนมัติอ้างอิงบันทึกต้นทาง|证据已提交。自动检查以源记录为依据。
Recovery requires manager sign-off|Pemulihan memerlukan persetujuan manajer|Phục hồi cần quản lý xác nhận|การฟื้นตัวต้องได้รับการยืนยันจากผู้จัดการ|恢复需要经理确认
Manager decisions|Keputusan manajer|Quyết định của quản lý|การตัดสินใจของผู้จัดการ|经理决策
Reason for|Alasan untuk|Lý do cho|เหตุผลสำหรับ|理由：
Reason to|Alasan untuk|Lý do để|เหตุผลในการ|操作理由：
New deadline (ISO date and time)|Tenggat baru (tanggal dan waktu ISO)|Hạn mới (ngày và giờ ISO)|กำหนดเวลาใหม่ (วันที่และเวลา ISO)|新截止时间（ISO 日期和时间）
Reason to unlist this community SOP|Alasan menghapus SOP ini dari pustaka komunitas|Lý do ẩn SOP này khỏi thư viện cộng đồng|เหตุผลในการนำ SOP นี้ออกจากคลังชุมชน|取消公开展示此社区 SOP 的理由
Explain why this publication should be reviewed.|Jelaskan mengapa publikasi ini perlu ditinjau.|Giải thích vì sao cần xem xét tài liệu này.|อธิบายเหตุผลที่ควรตรวจสอบการเผยแพร่นี้|说明此发布内容为何需要审阅。
Withdrawal reason (your own publication only)|Alasan penarikan (hanya publikasi Anda)|Lý do rút lại (chỉ tài liệu bạn đăng)|เหตุผลในการถอน (เฉพาะสิ่งที่คุณเผยแพร่)|撤回理由（仅限自己的发布内容）
These totals cover {period} in the farm timezone.|Total ini mencakup {period} dalam zona waktu tambak.|Các tổng số này bao gồm {period} theo múi giờ trang trại.|ยอดรวมเหล่านี้ครอบคลุม {period} ตามเขตเวลาของฟาร์ม|这些汇总涵盖农场时区内的 {period}。
These totals describe your loaded task history.|Total ini merangkum riwayat tugas yang dimuat.|Các tổng số này mô tả lịch sử công việc đã tải.|ยอดรวมเหล่านี้สรุปประวัติงานที่โหลดไว้|这些汇总基于已加载的任务历史。
complete|selesai|hoàn thành|เสร็จสิ้น|完成
configure corrective action|atur tindakan perbaikan|thiết lập hành động khắc phục|กำหนดการแก้ไข|配置纠正措施
Set your company timezone before activation|Atur zona waktu perusahaan sebelum aktivasi|Đặt múi giờ công ty trước khi kích hoạt|ตั้งเขตเวลาของบริษัทก่อนเปิดใช้งาน|启用前请设置公司时区
Block technician / manager|Teknisi blok / manajer|Kỹ thuật viên khu / quản lý|ช่างประจำบล็อก / ผู้จัดการ|区块技术员／经理
waive|kecualikan|miễn|ยกเว้น|豁免
cancel|batalkan|hủy|ยกเลิก|取消
postpone|tunda|hoãn|เลื่อน|延期
Read-only SOP workflow|Alur SOP hanya baca|Sơ đồ SOP chỉ đọc|แผนผัง SOP แบบอ่านอย่างเดียว|只读 SOP 流程图
Pass|Lulus|Đạt|ผ่าน|通过
Failure|Gagal|Không đạt|ไม่ผ่าน|未通过
Requires|Memerlukan|Yêu cầu|ต้องมี|需要
active|Aktif|Đang hoạt động|ใช้งานอยู่|启用中
paused|Dijeda|Tạm dừng|พักการใช้งาน|已暂停
retired|Dihentikan|Ngừng áp dụng|เลิกใช้งาน|已停用
draft|Draf|Bản nháp|ฉบับร่าง|草稿
approved|Disetujui|Đã duyệt|อนุมัติแล้ว|已批准
published|Diterbitkan|Đã đăng|เผยแพร่แล้ว|已发布
withdrawn|Ditarik|Đã rút lại|ถอนแล้ว|已撤回
standing|Berkelanjutan|Áp dụng lâu dài|ใช้ต่อเนื่อง|长期采用
cycle|Siklus saat ini|Vụ hiện tại|รอบปัจจุบัน|当前周期
· revision|· revisi|· phiên bản|· ฉบับแก้ไข|· 修订版
targets|sasaran|đối tượng|เป้าหมาย|目标
targets ·|sasaran ·|đối tượng ·|เป้าหมาย ·|目标 ·
adopting farms ·|tambak pengguna ·|trang trại áp dụng ·|ฟาร์มที่นำไปใช้ ·|采用农场 ·
to|hingga|đến|ถึง|至
Read procedure|Baca prosedur|Đọc quy trình|อ่านขั้นตอน|阅读规程
unresolved tasks affected. Future updates keep existing rules; migration retains prior history.|tugas terbuka terdampak. Pembaruan mendatang mempertahankan aturan tugas yang ada; migrasi menyimpan riwayat sebelumnya.|công việc chưa xử lý bị ảnh hưởng. Cập nhật cho công việc sau này giữ nguyên quy tắc hiện tại; chuyển đổi vẫn giữ lịch sử trước đó.|งานค้างได้รับผลกระทบ การอัปเดตงานในอนาคตคงกฎของงานเดิมไว้ การย้ายงานเก็บประวัติเดิมไว้|项未解决任务受影响。未来更新保留现有任务的规则；迁移会保留此前历史。
Older work is available through the task history service; this view is limited to recent work.|Tugas lama tersedia melalui riwayat tugas; tampilan ini hanya memuat tugas terbaru.|Có thể xem công việc cũ trong lịch sử; màn hình này chỉ hiển thị công việc gần đây.|ดูงานเก่าได้จากประวัติงาน หน้านี้แสดงเฉพาะงานล่าสุด|更早的工作可通过任务历史查看；此视图仅显示近期工作。
→ pass:|→ lulus:|→ đạt:|→ ผ่าน:|→ 通过：
/ fail:|/ gagal:|/ không đạt:|/ ไม่ผ่าน:|／失败：
→ recheck after|→ periksa ulang setelah|→ kiểm tra lại sau|→ ตรวจซ้ำหลัง|→ 等待后复检
min → escalate after|menit → eskalasi setelah|phút → báo cáo nâng cấp sau|นาที → ยกระดับหลัง|分钟 → 等待后升级
→ corrective action → recheck|→ tindakan perbaikan → periksa ulang|→ khắc phục → kiểm tra lại|→ แก้ไข → ตรวจซ้ำ|→ 纠正措施 → 复检
min → escalate|menit → eskalasi|phút → báo cáo nâng cấp|นาที → ยกระดับ|分钟 → 升级
Water-quality monitoring|Pemantauan kualitas air|Theo dõi chất lượng nước|ติดตามคุณภาพน้ำ|水质监测
Sampling routine|Prosedur sampling|Quy trình lấy mẫu|ขั้นตอนเก็บตัวอย่าง|取样流程
Equipment inspection|Pemeriksaan peralatan|Kiểm tra thiết bị|ตรวจสอบอุปกรณ์|设备检查
Set your farm targets, measurement windows, corrective instructions, and escalation timing before approval.|Tetapkan sasaran tambak, jendela pengukuran, instruksi perbaikan, dan waktu eskalasi sebelum persetujuan.|Đặt mục tiêu trang trại, khoảng đo, hướng dẫn khắc phục và thời gian báo cáo nâng cấp trước khi duyệt.|กำหนดเป้าหมายฟาร์ม ช่วงเวลาวัด คำแนะนำแก้ไข และเวลายกระดับก่อนอนุมัติ|批准前请设置农场目标、测量时间窗、纠正说明和升级时间。
Configure sampling milestones and the measurements your farm requires.|Atur jadwal sampling dan pengukuran yang diperlukan tambak.|Thiết lập các mốc lấy mẫu và phép đo trang trại yêu cầu.|กำหนดช่วงเก็บตัวอย่างและค่าที่ฟาร์มต้องวัด|配置取样节点和农场要求的测量项目。
Define equipment checks and required photographic or written evidence.|Tentukan pemeriksaan peralatan serta bukti foto atau tertulis yang diperlukan.|Xác định kiểm tra thiết bị và bằng chứng ảnh hoặc văn bản cần có.|กำหนดการตรวจอุปกรณ์และหลักฐานภาพถ่ายหรือข้อความที่ต้องมี|定义设备检查及所需的照片或文字证据。
Edit SOP|Ubah SOP|Sửa SOP|แก้ไข SOP|编辑 SOP
1. About this SOP|1. Tentang SOP ini|1. Thông tin SOP|1. เกี่ยวกับ SOP นี้|1. SOP 基本信息
2. Procedure|2. Prosedur|2. Quy trình|2. ขั้นตอนปฏิบัติ|2. 操作规程
3. Checks and follow-up|3. Pemeriksaan dan tindak lanjut|3. Kiểm tra và theo dõi|3. การตรวจและติดตาม|3. 检查与后续处理
Write the procedure, set your targets, then review before approval.|Tulis prosedur, tentukan sasaran, lalu tinjau sebelum persetujuan.|Viết quy trình, đặt mục tiêu rồi xem lại trước khi duyệt.|เขียนขั้นตอน กำหนดเป้าหมาย แล้วตรวจทานก่อนอนุมัติ|填写规程、设定目标，再审核批准。
Write the methods staff should follow. Keep source tables and reference values here; set automatic checks below.|Tulis metode yang harus diikuti staf. Simpan tabel dan nilai referensi di sini; atur pemeriksaan otomatis di bawah.|Viết cách thực hiện cho nhân viên. Giữ bảng và giá trị tham khảo ở đây; đặt kiểm tra tự động bên dưới.|เขียนวิธีที่พนักงานต้องปฏิบัติ เก็บตารางและค่าอ้างอิงไว้ที่นี่ ตั้งการตรวจอัตโนมัติด้านล่าง|填写员工应遵循的方法，在此保留来源表格和参考数值，在下方设置自动检查。
Open a check to set its targets and instructions. Advanced settings are optional to edit.|Buka pemeriksaan untuk mengatur sasaran dan instruksinya. Pengaturan lanjutan tidak wajib diubah.|Mở kiểm tra để đặt mục tiêu và hướng dẫn. Không bắt buộc sửa cài đặt nâng cao.|เปิดการตรวจเพื่อกำหนดเป้าหมายและคำแนะนำ ไม่จำเป็นต้องแก้การตั้งค่าขั้นสูง|展开检查以填写目标和说明。可按需修改高级设置。
What to do|Apa yang harus dilakukan|Việc cần làm|สิ่งที่ต้องทำ|需要做什么
Check name|Nama pemeriksaan|Tên kiểm tra|ชื่อการตรวจ|检查名称
Instructions for staff|Instruksi untuk staf|Hướng dẫn cho nhân viên|คำแนะนำสำหรับพนักงาน|员工操作说明
Acceptable measurement or result|Nilai atau hasil yang diterima|Giá trị hoặc kết quả chấp nhận được|ค่าหรือผลที่ยอมรับได้|可接受的测量值或结果
Set targets here. Record actual readings in the pond records.|Atur sasaran di sini. Catat hasil pengukuran aktual di catatan kolam.|Đặt mục tiêu ở đây. Ghi số đo thực tế trong hồ sơ ao.|กำหนดเป้าหมายที่นี่ บันทึกค่าที่วัดจริงในบันทึกบ่อ|在此设置目标。实际读数请填写在池塘记录中。
Measurement or record|Pengukuran atau catatan|Phép đo hoặc bản ghi|ค่าที่วัดหรือบันทึก|测量项目或记录
How to check it|Cara memeriksanya|Cách kiểm tra|วิธีตรวจ|检查方式
Lower limit|Batas bawah|Giới hạn dưới|ค่าต่ำสุด|下限
Upper limit|Batas atas|Giới hạn trên|ค่าสูงสุด|上限
Measurement basis|Dasar pengukuran|Cơ sở phép đo|ฐานการวัด|测量口径
What must the notes or photos show?|Apa yang harus ditunjukkan catatan atau foto?|Ghi chú hoặc ảnh cần thể hiện gì?|บันทึกหรือภาพต้องแสดงอะไร?|记录或照片需要说明什么？
If something goes wrong|Jika ada masalah|Nếu có vấn đề|หากเกิดปัญหา|出现问题时
What should staff do if this check fails?|Apa yang harus dilakukan staf jika pemeriksaan gagal?|Nhân viên phải làm gì khi kiểm tra không đạt?|พนักงานควรทำอะไรหากการตรวจไม่ผ่าน?|检查未通过时员工应如何处理？
Add instructions for staff when this check fails.|Tambahkan instruksi untuk staf saat pemeriksaan gagal.|Thêm hướng dẫn cho nhân viên khi kiểm tra không đạt.|เพิ่มคำแนะนำให้พนักงานเมื่อการตรวจไม่ผ่าน|填写检查未通过时员工应采取的措施。
When to do it|Kapan dilakukan|Khi nào thực hiện|ต้องทำเมื่อไร|何时执行
Advanced settings|Pengaturan lanjutan|Cài đặt nâng cao|การตั้งค่าขั้นสูง|高级设置
Assignment, evidence rules, rechecks, and linked tasks. Existing settings are kept.|Penugasan, aturan bukti, pemeriksaan ulang, dan tugas terkait. Pengaturan yang ada tetap tersimpan.|Phân công, quy tắc bằng chứng, kiểm tra lại và việc liên quan. Giữ nguyên cài đặt hiện có.|การมอบหมาย กฎหลักฐาน การตรวจซ้ำ และงานที่เชื่อมโยง คงการตั้งค่าเดิมไว้|分工、证据规则、复检和关联任务。保留现有设置。
Automation preview|Pratinjau otomatisasi|Xem trước tự động hóa|ดูตัวอย่างระบบอัตโนมัติ|自动化预览
Needs attention|Perlu dilengkapi|Cần bổ sung|ต้องตรวจสอบ|需要完善
Ready for review|Siap ditinjau|Sẵn sàng xem xét|พร้อมตรวจทาน|可供审核
Untitled check|Pemeriksaan tanpa nama|Kiểm tra chưa có tên|การตรวจที่ยังไม่มีชื่อ|未命名检查
Complete these before approval|Lengkapi sebelum persetujuan|Hoàn tất trước khi duyệt|กรอกให้ครบก่อนอนุมัติ|批准前请完善以下内容
You can save an incomplete draft. Approval requires all highlighted fields to be completed.|Draf yang belum lengkap dapat disimpan. Lengkapi semua kolom yang ditandai sebelum persetujuan.|Có thể lưu bản nháp chưa hoàn tất. Điền đủ các trường được đánh dấu trước khi duyệt.|บันทึกฉบับร่างที่ยังไม่ครบได้ ต้องกรอกช่องที่ระบุก่อนอนุมัติ|可以保存未完成的草稿。批准前须填写所有标注字段。
A record exists|Catatan tersedia|Có bản ghi|มีบันทึก|存在记录
Within limits|Dalam batas|Trong giới hạn|อยู่ในช่วงที่กำหนด|在限值内
Matches a required result|Sesuai hasil yang diperlukan|Khớp kết quả yêu cầu|ตรงกับผลที่ต้องการ|符合所需结果
Enough records|Jumlah catatan cukup|Đủ bản ghi|จำนวนบันทึกเพียงพอ|记录数量充足
Change stays within limits|Perubahan dalam batas|Thay đổi trong giới hạn|การเปลี่ยนแปลงอยู่ในช่วง|变化在限值内
Follows a required order|Mengikuti urutan yang diperlukan|Theo đúng thứ tự|ตามลำดับที่กำหนด|遵循所需顺序
Review notes or photos|Tinjau catatan atau foto|Xem ghi chú hoặc ảnh|ตรวจบันทึกหรือภาพ|审核记录或照片
This only checks that a record exists. Choose Within limits to check a measurement against your targets.|Ini hanya memeriksa adanya catatan. Pilih Dalam batas untuk membandingkan pengukuran dengan sasaran.|Chỉ kiểm tra bản ghi có tồn tại. Chọn Trong giới hạn để so sánh số đo với mục tiêu.|ตรวจเพียงว่ามีบันทึก เลือก อยู่ในช่วงที่กำหนด เพื่อเทียบค่ากับเป้าหมาย|此方式仅检查是否有记录。选择“在限值内”才能将测量值与目标比较。
Enter a lower or upper limit approved for your farm.|Masukkan batas bawah atau atas yang disetujui tambak.|Nhập giới hạn dưới hoặc trên đã được trang trại phê duyệt.|กรอกค่าต่ำสุดหรือสูงสุดที่ฟาร์มอนุมัติ|填写农场批准的下限或上限。
The lower limit must not exceed the upper limit.|Batas bawah tidak boleh melebihi batas atas.|Giới hạn dưới không được lớn hơn giới hạn trên.|ค่าต่ำสุดต้องไม่เกินค่าสูงสุด|下限不能大于上限。
Describe the required result or order.|Jelaskan hasil atau urutan yang diperlukan.|Mô tả kết quả hoặc thứ tự yêu cầu.|อธิบายผลหรือลำดับที่ต้องการ|说明所需结果或顺序。
For notes or photos, choose Review notes or photos and describe what staff must show.|Untuk catatan atau foto, pilih Tinjau catatan atau foto dan jelaskan bukti yang diperlukan.|Đối với ghi chú hoặc ảnh, chọn Xem ghi chú hoặc ảnh và mô tả nội dung cần thể hiện.|สำหรับบันทึกหรือภาพ เลือก ตรวจบันทึกหรือภาพ และอธิบายสิ่งที่ต้องแสดง|对于记录或照片，请选择“审核记录或照片”，并说明员工应提供什么。
Dissolved oxygen (morning)|Oksigen terlarut (pagi)|Oxy hòa tan (sáng)|ออกซิเจนละลายน้ำ (เช้า)|溶解氧（早晨）
Dissolved oxygen (evening)|Oksigen terlarut (sore)|Oxy hòa tan (chiều)|ออกซิเจนละลายน้ำ (เย็น)|溶解氧（傍晚）
pH (morning)|pH (pagi)|pH (sáng)|pH (เช้า)|pH（早晨）
pH (evening)|pH (sore)|pH (chiều)|pH (เย็น)|pH（傍晚）
Temperature (morning)|Suhu (pagi)|Nhiệt độ (sáng)|อุณหภูมิ (เช้า)|水温（早晨）
Temperature (evening)|Suhu (sore)|Nhiệt độ (chiều)|อุณหภูมิ (เย็น)|水温（傍晚）
Salinity|Salinitas|Độ mặn|ความเค็ม|盐度
Alkalinity|Alkalinitas|Độ kiềm|ความเป็นด่าง|碱度
Ammonia|Amonia|Amoniac|แอมโมเนีย|氨
Nitrite|Nitrit|Nitrit|ไนไตรต์|亚硝酸盐
Water transparency (morning)|Kecerahan air (pagi)|Độ trong nước (sáng)|ความใสของน้ำ (เช้า)|水体透明度（早晨）
Water transparency (evening)|Kecerahan air (sore)|Độ trong nước (chiều)|ความใสของน้ำ (เย็น)|水体透明度（傍晚）
Water depth (morning)|Kedalaman air (pagi)|Độ sâu nước (sáng)|ความลึกน้ำ (เช้า)|水深（早晨）
Water depth (evening)|Kedalaman air (sore)|Độ sâu nước (chiều)|ความลึกน้ำ (เย็น)|水深（傍晚）
Water exchange (%)|Pergantian air (%)|Thay nước (%)|การเปลี่ยนน้ำ (%)|换水率（%）
Weather observation|Pengamatan cuaca|Quan sát thời tiết|การสังเกตอากาศ|天气观察
Sludge observation|Pengamatan lumpur|Quan sát bùn|การสังเกตตะกอน|底泥观察
Surface scum observation|Pengamatan buih permukaan|Quan sát váng nước|การสังเกตฝ้าบนผิวน้ำ|水面浮沫观察
Shrimp behaviour|Perilaku udang|Hành vi tôm|พฤติกรรมกุ้ง|虾的行为
Notes or photos|Catatan atau foto|Ghi chú hoặc ảnh|บันทึกหรือภาพ|记录或照片
Water parameter targets|Sasaran parameter air|Mục tiêu chất lượng nước|เป้าหมายคุณภาพน้ำ|水质参数目标
These are SOP targets, not today's measurements. Open a check to change its limits.|Ini adalah sasaran SOP, bukan pengukuran hari ini. Buka pemeriksaan untuk mengubah batasnya.|Đây là mục tiêu SOP, không phải số đo hôm nay. Mở kiểm tra để sửa giới hạn.|นี่คือเป้าหมาย SOP ไม่ใช่ค่าที่วัดวันนี้ เปิดการตรวจเพื่อแก้ช่วงค่า|这些是 SOP 目标，并非今天的测量值。展开检查可修改限值。
Target or check|Sasaran atau pemeriksaan|Mục tiêu hoặc kiểm tra|เป้าหมายหรือการตรวจ|目标或检查方式
Edit targets|Edit sasaran|Sửa mục tiêu|แก้เป้าหมาย|修改目标
No limits checked|Batas tidak diperiksa|Không kiểm tra giới hạn|ไม่ตรวจช่วงค่า|不检查限值
Target not set|Sasaran belum diatur|Chưa đặt mục tiêu|ยังไม่กำหนดเป้าหมาย|尚未设置目标
Change|Perubahan|Thay đổi|การเปลี่ยนแปลง|变化
Lab pH|pH laboratorium|pH xét nghiệm|pH ห้องปฏิบัติการ|实验室 pH
Lab salinity|Salinitas laboratorium|Độ mặn xét nghiệm|ความเค็มห้องปฏิบัติการ|实验室盐度
Lab total ammonia nitrogen|Nitrogen amonia total laboratorium|Tổng nitơ amoniac xét nghiệm|ไนโตรเจนแอมโมเนียรวมห้องปฏิบัติการ|实验室总氨氮
Lab un-ionized ammonia|Amonia tidak terionisasi laboratorium|Amoniac không ion hóa xét nghiệm|แอมโมเนียไม่แตกตัวห้องปฏิบัติการ|实验室非离子氨
Lab nitrite|Nitrit laboratorium|Nitrit xét nghiệm|ไนไตรต์ห้องปฏิบัติการ|实验室亚硝酸盐
Lab alkalinity|Alkalinitas laboratorium|Độ kiềm xét nghiệm|ความเป็นด่างห้องปฏิบัติการ|实验室碱度
Other check methods|Metode pemeriksaan lain|Cách kiểm tra khác|วิธีตรวจอื่น|其他检查方式
Item or equipment|Barang atau peralatan|Vật tư hoặc thiết bị|รายการหรืออุปกรณ์|物料或设备
Daily|Harian|Hằng ngày|ทุกวัน|每天
Weekly|Mingguan|Hằng tuần|ทุกสัปดาห์|每周
By days of culture|Berdasarkan hari budidaya|Theo ngày nuôi|ตามวันเลี้ยง|按养殖日龄
After an event|Setelah suatu kejadian|Sau một sự kiện|หลังเหตุการณ์|事件发生后
At a production stage|Pada tahap produksi|Ở giai đoạn sản xuất|ในระยะการผลิต|在生产阶段
When assigned manually|Saat ditugaskan secara manual|Khi được giao thủ công|เมื่อมอบหมายด้วยตนเอง|手动分配时
No procedure content yet. Add the full instructions and reference tables staff need. Checks below do not replace the procedure.|Isi prosedur belum ada. Tambahkan instruksi lengkap dan tabel referensi yang diperlukan staf. Pemeriksaan di bawah tidak menggantikan prosedur.|Chưa có nội dung quy trình. Thêm hướng dẫn đầy đủ và bảng tham khảo cho nhân viên. Các kiểm tra bên dưới không thay thế quy trình.|ยังไม่มีเนื้อหาขั้นตอน เพิ่มคำแนะนำทั้งหมดและตารางอ้างอิงที่พนักงานต้องใช้ การตรวจด้านล่างไม่แทนขั้นตอนปฏิบัติ|尚无规程内容。请添加员工所需的完整说明和参考表格。下方的检查不能替代操作规程。
Display language|Bahasa tampilan|Ngôn ngữ hiển thị|ภาษาที่แสดง|界面语言
Changes app labels and navigation. Your SOP text stays in its original language.|Mengubah bahasa tampilan dan navigasi aplikasi. Teks SOP tetap dalam bahasa aslinya.|Đổi ngôn ngữ nhãn và điều hướng ứng dụng. Nội dung SOP giữ nguyên ngôn ngữ gốc.|เปลี่ยนข้อความและเมนูของแอป เนื้อหา SOP ยังคงเป็นภาษาต้นฉบับ|更改应用界面和导航语言。SOP 内容保留原始语言。
Require this check before entering a stage|Wajibkan pemeriksaan ini sebelum masuk tahap|Yêu cầu kiểm tra trước khi vào giai đoạn|ต้องผ่านการตรวจนี้ก่อนเข้าสู่ระยะ|进入阶段前必须通过此检查
Does not block stage changes|Tidak membatasi tahap|Không chặn chuyển giai đoạn|ไม่ขัดขวางการเปลี่ยนระยะ|不阻止阶段变更
Choose a stage only if this check must pass before the pond can enter it. Otherwise leave stage changes unblocked.|Pilih tahap hanya jika pemeriksaan ini harus lulus sebelum kolam memasuki tahap tersebut. Jika tidak, biarkan perubahan tahap tanpa pembatasan.|Chỉ chọn giai đoạn nếu ao phải vượt qua kiểm tra này trước khi vào giai đoạn đó. Nếu không, giữ chuyển giai đoạn không bị chặn.|เลือกระยะเฉพาะเมื่อบ่อต้องผ่านการตรวจนี้ก่อนเข้า หากไม่จำเป็น ให้เปลี่ยนระยะได้ตามปกติ|仅在池塘进入该阶段前必须通过此检查时选择阶段，否则不限制阶段变更。
Sun|Min|CN|อา.|周日
Mon|Sen|T2|จ.|周一
Tue|Sel|T3|อ.|周二
Wed|Rab|T4|พ.|周三
Thu|Kam|T5|พฤ.|周四
Fri|Jum|T6|ศ.|周五
Sat|Sab|T7|ส.|周六
This source does not support that condition.|Catatan ini tidak mendukung metode pemeriksaan tersebut.|Nguồn này không hỗ trợ cách kiểm tra đó.|แหล่งข้อมูลนี้ไม่รองรับวิธีตรวจดังกล่าว|此来源不支持该检查方式。
Specify the analytical basis.|Tentukan dasar pengukuran sesuai hasil alat atau laboratorium.|Chọn cơ sở đo theo kết quả thiết bị hoặc xét nghiệm.|ระบุฐานการวัดตามอุปกรณ์หรือผลห้องปฏิบัติการ|请按仪器或实验室结果填写测量口径。
Sampling mean body weight|Bobot rata-rata hasil sampling|Khối lượng trung bình khi lấy mẫu|น้ำหนักเฉลี่ยจากการสุ่มตัวอย่าง|取样平均体重
Sampling feed observation|Pengamatan pakan saat sampling|Quan sát thức ăn khi lấy mẫu|การสังเกตอาหารขณะสุ่มตัวอย่าง|取样时的饲料观察
Logged daily feed total|Total pakan harian tercatat|Tổng thức ăn hằng ngày đã ghi|ปริมาณอาหารรวมต่อวันที่บันทึก|记录的每日投喂总量
Recorded mortality|Kematian tercatat|Số chết đã ghi|จำนวนตายที่บันทึก|记录的死亡数量
Confirmed lab status|Status hasil laboratorium terkonfirmasi|Trạng thái xét nghiệm đã xác nhận|สถานะผลห้องปฏิบัติการที่ยืนยัน|已确认的实验室状态
Recorded inventory stock|Stok persediaan tercatat|Tồn kho đã ghi|สต็อกที่บันทึก|记录的库存
Recorded treatment usage|Penggunaan bahan perawatan tercatat|Lượng vật tư xử lý đã ghi|การใช้สารบำบัดที่บันทึก|记录的处理材料用量
Maintenance record|Catatan pemeliharaan peralatan|Bản ghi bảo trì|บันทึกการบำรุงรักษา|维护记录
Recorded harvest biomass|Biomassa panen tercatat|Sinh khối thu hoạch đã ghi|ชีวมวลเก็บเกี่ยวที่บันทึก|记录的收获生物量
Recorded cycle state|Status siklus tercatat|Trạng thái vụ nuôi đã ghi|สถานะรอบเลี้ยงที่บันทึก|记录的养殖周期状态
salinity|Salinitas|Độ mặn|ความเค็ม|盐度
Edit|Ubah|Sửa|แก้ไข|修改
Block technician / manager|Teknisi blok / manajer|Kỹ thuật viên khu / quản lý|ช่างประจำบล็อก / ผู้จัดการ|区块技术员／经理
Enter a title of at most 200 characters.|Masukkan judul maksimal 200 karakter.|Nhập tiêu đề tối đa 200 ký tự.|กรอกชื่อไม่เกิน 200 ตัวอักษร|请输入不超过200字的标题。
Description is too long.|Deskripsi terlalu panjang.|Mô tả quá dài.|คำอธิบายยาวเกินไป|说明过长。
Choose a supported original language.|Pilih bahasa asli yang tersedia.|Chọn ngôn ngữ gốc được hỗ trợ.|เลือกภาษาต้นฉบับที่รองรับ|请选择支持的原始语言。
An SOP needs between 1 and 60 steps.|SOP harus memiliki 1 sampai 60 pemeriksaan.|SOP cần từ 1 đến 60 bước.|SOP ต้องมี 1 ถึง 60 ขั้นตอน|SOP须包含1至60个步骤。
Choose scope, severity, and stages.|Pilih cakupan, tingkat keparahan, dan tahapan.|Chọn phạm vi, mức độ nghiêm trọng và giai đoạn.|เลือกขอบเขต ระดับความรุนแรง และระยะ|请选择范围、严重程度和阶段。
Invalid schedule.|Jadwal tidak valid. Periksa waktu dan frekuensi.|Lịch không hợp lệ. Kiểm tra thời gian và tần suất.|กำหนดเวลาไม่ถูกต้อง ตรวจเวลาและความถี่|排程无效，请检查时间和频率。
Choose an event.|Pilih kejadian pemicu.|Chọn sự kiện kích hoạt.|เลือกเหตุการณ์ที่กระตุ้น|请选择触发事件。
Invalid weekdays.|Pilihan hari tidak valid.|Ngày trong tuần không hợp lệ.|วันในสัปดาห์ไม่ถูกต้อง|星期选项无效。
Invalid DOC/event window.|Rentang hari budidaya atau jeda kejadian tidak valid.|Khoảng ngày nuôi hoặc sự kiện không hợp lệ.|ช่วงวันเลี้ยงหรือเหตุการณ์ไม่ถูกต้อง|养殖日龄或事件时间范围无效。
Choose a supported check.|Pilih pemeriksaan yang tersedia.|Chọn kiểm tra được hỗ trợ.|เลือกการตรวจที่รองรับ|请选择支持的检查。
Limits must be finite numbers.|Batas harus berupa angka yang valid.|Giới hạn phải là số hợp lệ.|ค่าจำกัดต้องเป็นตัวเลขที่ถูกต้อง|限值必须是有效数值。
Invalid evidence count/freshness.|Jumlah atau batas usia bukti tidak valid.|Số lượng hoặc tuổi bằng chứng không hợp lệ.|จำนวนหรืออายุหลักฐานไม่ถูกต้อง|证据数量或有效期无效。
Invalid stage gate.|Pilih tahap produksi yang tersedia.|Chọn giai đoạn sản xuất được hỗ trợ.|เลือกระยะการผลิตที่รองรับ|请选择支持的生产阶段。
Farm procedure|Prosedur tambak|Quy trình trang trại|ขั้นตอนฟาร์ม|农场规程
Procedure sections|Bagian prosedur|Phần quy trình|ส่วนขั้นตอน|规程章节
Checks|Pemeriksaan|Kiểm tra|การตรวจ|检查
Review draft|Tinjau draf|Xem xét bản nháp|ตรวจทานฉบับร่าง|审核草稿
Draft needs review|Draf perlu dilengkapi|Bản nháp cần xem xét|ต้องตรวจทานฉบับร่าง|草稿需要审核
Procedure content missing|Isi prosedur belum ada|Thiếu nội dung quy trình|ยังไม่มีเนื้อหาขั้นตอน|缺少规程内容
No readable procedure sections yet.|Belum ada bagian prosedur yang dapat dibaca.|Chưa có phần quy trình có thể đọc.|ยังไม่มีส่วนขั้นตอนที่อ่านได้|尚无可阅读的规程章节。
items to complete before approval.|hal perlu dilengkapi sebelum persetujuan.|mục cần hoàn tất trước khi duyệt.|รายการต้องกรอกก่อนอนุมัติ|项内容须在批准前完善。
More actions|Tindakan lainnya|Thao tác khác|การดำเนินการเพิ่มเติม|更多操作
Complete the highlighted fields in the draft before approving.|Lengkapi kolom yang ditandai dalam draf sebelum menyetujui.|Điền các trường được đánh dấu trong bản nháp trước khi duyệt.|กรอกช่องที่ระบุในฉบับร่างก่อนอนุมัติ|批准前请填写草稿中标注的字段。
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
