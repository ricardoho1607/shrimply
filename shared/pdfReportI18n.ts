export const PDF_LANGUAGES = ['en', 'id', 'th', 'vi', 'zh'] as const;

export type PdfLanguage = (typeof PDF_LANGUAGES)[number];

export const PDF_LOCALES: Record<PdfLanguage, string> = {
  en: 'en-AU',
  id: 'id-ID',
  th: 'th-TH',
  vi: 'vi-VN',
  zh: 'zh-CN',
};

type PdfPhrase = Record<PdfLanguage, string>;

// Report copy lives here so mobile and web exports always use the same terminology.
const PDF_PHRASES: PdfPhrase[] = [
  { en: 'Maintenance includes Finance entries only. Asset maintenance history is not added again; post each maintenance cost once in Finance.', id: 'Biaya pemeliharaan hanya mencakup entri Keuangan. Riwayat pemeliharaan aset tidak dijumlahkan lagi; catat setiap biaya pemeliharaan satu kali di Keuangan.', th: 'ค่าบำรุงรักษารวมเฉพาะรายการในระบบการเงิน ไม่รวมประวัติการบำรุงรักษาสินทรัพย์ซ้ำ บันทึกค่าบำรุงรักษาแต่ละรายการในระบบการเงินเพียงครั้งเดียว', vi: 'Chi phí bảo trì chỉ gồm các bút toán Tài chính. Lịch sử bảo trì tài sản không được cộng lại; ghi mỗi chi phí bảo trì một lần trong Tài chính.', zh: '维护成本仅包括财务记录，不重复计入资产维护历史。请在财务中仅记录一次各项维护费用。' },
  { en: 'Recorded Income', id: 'Pendapatan Tercatat', th: 'รายได้ที่บันทึก', vi: 'Thu nhập đã ghi nhận', zh: '已记录收入' },
  { en: 'Recorded Expenses', id: 'Beban Tercatat', th: 'ค่าใช้จ่ายที่บันทึก', vi: 'Chi phí đã ghi nhận', zh: '已记录费用' },
  { en: 'Profit and Loss Statement', id: 'Laporan Laba Rugi', th: 'งบกำไรขาดทุน', vi: 'Báo cáo lãi lỗ', zh: '损益表' },
  { en: 'Income Statement', id: 'Laporan Laba Rugi', th: 'งบกำไรขาดทุน', vi: 'Báo cáo kết quả kinh doanh', zh: '利润表' },
  { en: 'Multi-Step Profit & Loss', id: 'Laba Rugi Bertahap', th: 'งบกำไรขาดทุนแบบหลายขั้น', vi: 'Lãi lỗ nhiều bước', zh: '多步式损益表' },
  { en: 'Profit & Loss Analysis', id: 'Analisis Laba Rugi', th: 'การวิเคราะห์กำไรขาดทุน', vi: 'Phân tích lãi lỗ', zh: '损益分析' },
  { en: 'Margin and risk review', id: 'Tinjauan margin dan risiko', th: 'การทบทวนอัตรากำไรและความเสี่ยง', vi: 'Đánh giá biên lợi nhuận và rủi ro', zh: '利润率和风险审查' },
  { en: 'Cost of Goods Sold (COGS)', id: 'Harga Pokok Penjualan (HPP)', th: 'ต้นทุนขาย (COGS)', vi: 'Giá vốn hàng bán (COGS)', zh: '销售成本 (COGS)' },
  { en: 'Total Cost of Goods Sold', id: 'Total Harga Pokok Penjualan', th: 'ต้นทุนขายรวม', vi: 'Tổng giá vốn hàng bán', zh: '销售成本合计' },
  { en: 'No COGS recorded', id: 'Tidak ada HPP yang tercatat', th: 'ไม่มีการบันทึกต้นทุนขาย', vi: 'Chưa ghi nhận giá vốn', zh: '未记录销售成本' },
  { en: 'Operating Expenses (OPEX)', id: 'Beban Operasional (OPEX)', th: 'ค่าใช้จ่ายดำเนินงาน (OPEX)', vi: 'Chi phí hoạt động (OPEX)', zh: '运营费用 (OPEX)' },
  { en: 'Total Operating Expenses', id: 'Total Beban Operasional', th: 'ค่าใช้จ่ายดำเนินงานรวม', vi: 'Tổng chi phí hoạt động', zh: '运营费用合计' },
  { en: 'No Operating Expenses recorded', id: 'Tidak ada beban operasional yang tercatat', th: 'ไม่มีการบันทึกค่าใช้จ่ายดำเนินงาน', vi: 'Chưa ghi nhận chi phí hoạt động', zh: '未记录运营费用' },
  { en: 'Operating Income (EBITDA)', id: 'Laba Operasional (EBITDA)', th: 'กำไรจากการดำเนินงาน (EBITDA)', vi: 'Lợi nhuận hoạt động (EBITDA)', zh: '营业利润 (EBITDA)' },
  { en: 'Non-Operating Expenses / Other', id: 'Beban Nonoperasional / Lainnya', th: 'ค่าใช้จ่ายนอกการดำเนินงาน / อื่น ๆ', vi: 'Chi phí ngoài hoạt động / Khác', zh: '非营业费用 / 其他' },
  { en: 'Total Non-Operating Expenses', id: 'Total Beban Nonoperasional', th: 'ค่าใช้จ่ายนอกการดำเนินงานรวม', vi: 'Tổng chi phí ngoài hoạt động', zh: '非营业费用合计' },
  { en: 'Net Profit Margin', id: 'Margin Laba Bersih', th: 'อัตรากำไรสุทธิ', vi: 'Biên lợi nhuận ròng', zh: '净利润率' },
  { en: 'Operating Margin', id: 'Margin Operasional', th: 'อัตรากำไรจากการดำเนินงาน', vi: 'Biên lợi nhuận hoạt động', zh: '营业利润率' },
  { en: 'Gross Profit Margin', id: 'Margin Laba Kotor', th: 'อัตรากำไรขั้นต้น', vi: 'Biên lợi nhuận gộp', zh: '毛利率' },
  { en: 'Net Income', id: 'Laba Bersih', th: 'กำไรสุทธิ', vi: 'Lợi nhuận ròng', zh: '净利润' },
  { en: 'Net Loss', id: 'Rugi Bersih', th: 'ขาดทุนสุทธิ', vi: 'Lỗ ròng', zh: '净亏损' },
  { en: 'Gross Profit', id: 'Laba Kotor', th: 'กำไรขั้นต้น', vi: 'Lợi nhuận gộp', zh: '毛利润' },
  { en: 'Gross Loss', id: 'Rugi Kotor', th: 'ขาดทุนขั้นต้น', vi: 'Lỗ gộp', zh: '毛亏损' },
  { en: 'Total Revenue', id: 'Total Pendapatan', th: 'รายได้รวม', vi: 'Tổng doanh thu', zh: '总收入' },
  { en: 'Revenue', id: 'Pendapatan', th: 'รายได้', vi: 'Doanh thu', zh: '收入' },
  { en: 'Executive Summary', id: 'Ringkasan Eksekutif', th: 'บทสรุปผู้บริหาร', vi: 'Tóm tắt điều hành', zh: '执行摘要' },
  { en: 'Risk Assessment', id: 'Penilaian Risiko', th: 'การประเมินความเสี่ยง', vi: 'Đánh giá rủi ro', zh: '风险评估' },
  { en: 'Recommendations', id: 'Rekomendasi', th: 'คำแนะนำ', vi: 'Khuyến nghị', zh: '建议' },
  { en: 'Assumptions and Data Quality', id: 'Asumsi dan Kualitas Data', th: 'สมมติฐานและคุณภาพข้อมูล', vi: 'Giả định và chất lượng dữ liệu', zh: '假设和数据质量' },
  { en: 'Statement prepared according to multi-step income format.', id: 'Laporan disusun menggunakan format laba rugi bertahap.', th: 'จัดทำงบตามรูปแบบกำไรขาดทุนหลายขั้น', vi: 'Báo cáo được lập theo định dạng thu nhập nhiều bước.', zh: '本报表采用多步式利润表格式编制。' },

  { en: 'Statement of Cash Flows', id: 'Laporan Arus Kas', th: 'งบกระแสเงินสด', vi: 'Báo cáo lưu chuyển tiền tệ', zh: '现金流量表' },
  { en: 'Cash Flow Summary', id: 'Ringkasan Arus Kas', th: 'สรุปกระแสเงินสด', vi: 'Tóm tắt dòng tiền', zh: '现金流摘要' },
  { en: 'Cash at Beginning of Period', id: 'Kas Awal Periode', th: 'เงินสดต้นงวด', vi: 'Tiền mặt đầu kỳ', zh: '期初现金' },
  { en: 'Cash at End of Period', id: 'Kas Akhir Periode', th: 'เงินสดปลายงวด', vi: 'Tiền mặt cuối kỳ', zh: '期末现金' },
  { en: 'Operating Activities', id: 'Aktivitas Operasional', th: 'กิจกรรมดำเนินงาน', vi: 'Hoạt động kinh doanh', zh: '经营活动' },
  { en: 'Investing Activities', id: 'Aktivitas Investasi', th: 'กิจกรรมลงทุน', vi: 'Hoạt động đầu tư', zh: '投资活动' },
  { en: 'Financing Activities', id: 'Aktivitas Pendanaan', th: 'กิจกรรมจัดหาเงิน', vi: 'Hoạt động tài chính', zh: '融资活动' },
  { en: 'Cash Flows from Operating Activities', id: 'Arus Kas dari Aktivitas Operasional', th: 'กระแสเงินสดจากกิจกรรมดำเนินงาน', vi: 'Lưu chuyển tiền tệ từ hoạt động kinh doanh', zh: '经营活动产生的现金流量' },
  { en: 'Cash Flows from Investing Activities', id: 'Arus Kas dari Aktivitas Investasi', th: 'กระแสเงินสดจากกิจกรรมลงทุน', vi: 'Lưu chuyển tiền tệ từ hoạt động đầu tư', zh: '投资活动产生的现金流量' },
  { en: 'Cash Flows from Financing Activities', id: 'Arus Kas dari Aktivitas Pendanaan', th: 'กระแสเงินสดจากกิจกรรมจัดหาเงิน', vi: 'Lưu chuyển tiền tệ từ hoạt động tài chính', zh: '融资活动产生的现金流量' },
  { en: 'Cash Received from Sales', id: 'Kas Diterima dari Penjualan', th: 'เงินสดรับจากการขาย', vi: 'Tiền thu từ bán hàng', zh: '销售收款' },
  { en: 'Cash Received from Customers', id: 'Kas Diterima dari Pelanggan', th: 'เงินสดรับจากลูกค้า', vi: 'Tiền thu từ khách hàng', zh: '客户收款' },
  { en: 'Cash Paid to Suppliers', id: 'Kas Dibayar kepada Pemasok', th: 'เงินสดจ่ายให้ผู้จัดหา', vi: 'Tiền trả nhà cung cấp', zh: '支付供应商' },
  { en: 'Cash Paid for Operating Expenses', id: 'Kas Dibayar untuk Beban Operasional', th: 'เงินสดจ่ายสำหรับค่าใช้จ่ายดำเนินงาน', vi: 'Tiền trả chi phí hoạt động', zh: '支付运营费用' },
  { en: 'Other Operating Cash', id: 'Arus Kas Operasional Lainnya', th: 'กระแสเงินสดดำเนินงานอื่น', vi: 'Dòng tiền hoạt động khác', zh: '其他经营现金流' },
  { en: 'Net Cash from Operating Activities', id: 'Kas Bersih dari Aktivitas Operasional', th: 'กระแสเงินสดสุทธิจากกิจกรรมดำเนินงาน', vi: 'Dòng tiền thuần từ hoạt động kinh doanh', zh: '经营活动现金净额' },
  { en: 'Purchase of Assets', id: 'Pembelian Aset', th: 'ซื้อสินทรัพย์', vi: 'Mua tài sản', zh: '购置资产' },
  { en: 'Sale of Assets', id: 'Penjualan Aset', th: 'ขายสินทรัพย์', vi: 'Bán tài sản', zh: '出售资产' },
  { en: 'Purchase of Investments', id: 'Pembelian Investasi', th: 'ซื้อเงินลงทุน', vi: 'Mua khoản đầu tư', zh: '购买投资' },
  { en: 'Sale of Investments', id: 'Penjualan Investasi', th: 'ขายเงินลงทุน', vi: 'Bán khoản đầu tư', zh: '出售投资' },
  { en: 'Net Cash from Investing Activities', id: 'Kas Bersih dari Aktivitas Investasi', th: 'กระแสเงินสดสุทธิจากกิจกรรมลงทุน', vi: 'Dòng tiền thuần từ hoạt động đầu tư', zh: '投资活动现金净额' },
  { en: 'Loans Received', id: 'Pinjaman Diterima', th: 'เงินกู้ที่ได้รับ', vi: 'Khoản vay nhận được', zh: '收到贷款' },
  { en: 'Loan Repayments', id: 'Pembayaran Pinjaman', th: 'ชำระคืนเงินกู้', vi: 'Hoàn trả khoản vay', zh: '偿还贷款' },
  { en: 'Capital Contributed', id: 'Modal Disetor', th: 'เงินทุนที่สมทบ', vi: 'Vốn góp', zh: '投入资本' },
  { en: 'Dividends Paid', id: 'Dividen Dibayar', th: 'เงินปันผลที่จ่าย', vi: 'Cổ tức đã trả', zh: '支付股息' },
  { en: 'Owner Withdrawals', id: 'Penarikan Pemilik', th: 'การถอนเงินของเจ้าของ', vi: 'Chủ sở hữu rút vốn', zh: '业主提款' },
  { en: 'Net Cash from Financing Activities', id: 'Kas Bersih dari Aktivitas Pendanaan', th: 'กระแสเงินสดสุทธิจากกิจกรรมจัดหาเงิน', vi: 'Dòng tiền thuần từ hoạt động tài chính', zh: '融资活动现金净额' },
  { en: 'Net Change in Cash', id: 'Perubahan Bersih Kas', th: 'การเปลี่ยนแปลงเงินสดสุทธิ', vi: 'Thay đổi ròng tiền mặt', zh: '现金净变动' },
  { en: 'Total Cash Inflows', id: 'Total Arus Kas Masuk', th: 'กระแสเงินสดเข้ารวม', vi: 'Tổng dòng tiền vào', zh: '现金流入总额' },
  { en: 'Total Cash Outflows', id: 'Total Arus Kas Keluar', th: 'กระแสเงินสดออกรวม', vi: 'Tổng dòng tiền ra', zh: '现金流出总额' },
  { en: 'This statement focuses on cash movement and liquidity. It should not be interpreted as a Profit and Loss report.', id: 'Laporan ini berfokus pada pergerakan kas dan likuiditas. Laporan ini tidak boleh ditafsirkan sebagai laporan laba rugi.', th: 'รายงานนี้มุ่งเน้นการเคลื่อนไหวของเงินสดและสภาพคล่อง ไม่ควรตีความว่าเป็นงบกำไรขาดทุน', vi: 'Báo cáo này tập trung vào biến động tiền mặt và thanh khoản. Không nên xem đây là báo cáo lãi lỗ.', zh: '本报表侧重现金变动和流动性，不应将其视为损益表。' },

  { en: 'Cost of Goods Sold Report', id: 'Laporan Harga Pokok Penjualan', th: 'รายงานต้นทุนขาย', vi: 'Báo cáo giá vốn hàng bán', zh: '销售成本报告' },
  { en: 'Cost of Goods Sold', id: 'Harga Pokok Penjualan', th: 'ต้นทุนขาย', vi: 'Giá vốn hàng bán', zh: '销售成本' },
  { en: 'COGS Report', id: 'Laporan HPP', th: 'รายงาน COGS', vi: 'Báo cáo COGS', zh: 'COGS 报告' },
  { en: 'COGS Calculation', id: 'Perhitungan HPP', th: 'การคำนวณต้นทุนขาย', vi: 'Tính giá vốn hàng bán', zh: '销售成本计算' },
  { en: 'Opening Inventory', id: 'Persediaan Awal', th: 'สินค้าคงเหลือต้นงวด', vi: 'Tồn kho đầu kỳ', zh: '期初库存' },
  { en: 'Add: Purchases (Feed & Materials)', id: 'Tambah: Pembelian (Pakan & Bahan)', th: 'บวก: การซื้อ (อาหารและวัสดุ)', vi: 'Cộng: Mua hàng (thức ăn và vật tư)', zh: '加：采购（饲料和材料）' },
  { en: 'Add: Direct Labor', id: 'Tambah: Tenaga Kerja Langsung', th: 'บวก: ค่าแรงทางตรง', vi: 'Cộng: Nhân công trực tiếp', zh: '加：直接人工' },
  { en: 'Add: Direct Materials (Pond Additives)', id: 'Tambah: Bahan Langsung (Aditif Tambak)', th: 'บวก: วัสดุทางตรง (สารเติมแต่งบ่อ)', vi: 'Cộng: Vật liệu trực tiếp (phụ gia ao)', zh: '加：直接材料（池塘添加剂）' },
  { en: 'Goods Available for Sale', id: 'Barang Tersedia untuk Dijual', th: 'สินค้าที่พร้อมขาย', vi: 'Hàng có sẵn để bán', zh: '可供销售商品' },
  { en: 'Less: Closing Inventory', id: 'Kurang: Persediaan Akhir', th: 'หัก: สินค้าคงเหลือปลายงวด', vi: 'Trừ: Tồn kho cuối kỳ', zh: '减：期末库存' },
  { en: 'Gross Profit Analysis', id: 'Analisis Laba Kotor', th: 'การวิเคราะห์กำไรขั้นต้น', vi: 'Phân tích lợi nhuận gộp', zh: '毛利分析' },
  { en: 'Less: Cost of Goods Sold', id: 'Kurang: Harga Pokok Penjualan', th: 'หัก: ต้นทุนขาย', vi: 'Trừ: Giá vốn hàng bán', zh: '减：销售成本' },
  { en: 'COGS Cost Breakdown', id: 'Rincian Biaya HPP', th: 'รายละเอียดต้นทุน COGS', vi: 'Chi tiết chi phí COGS', zh: 'COGS 成本明细' },
  { en: 'Direct Costs Breakdown - Continued', id: 'Rincian Biaya Langsung - Lanjutan', th: 'รายละเอียดต้นทุนทางตรง - ต่อ', vi: 'Chi tiết chi phí trực tiếp - Tiếp', zh: '直接成本明细 - 续' },
  { en: 'Detailed Direct Costs and Period Summary', id: 'Rincian Biaya Langsung dan Ringkasan Periode', th: 'รายละเอียดต้นทุนทางตรงและสรุปงวด', vi: 'Chi tiết chi phí trực tiếp và tóm tắt kỳ', zh: '直接成本明细和期间摘要' },
  { en: 'Direct Costs Breakdown', id: 'Rincian Biaya Langsung', th: 'รายละเอียดต้นทุนทางตรง', vi: 'Chi tiết chi phí trực tiếp', zh: '直接成本明细' },
  { en: 'No detailed direct-cost categories available', id: 'Tidak ada rincian kategori biaya langsung', th: 'ไม่มีรายละเอียดหมวดต้นทุนทางตรง', vi: 'Không có chi tiết danh mục chi phí trực tiếp', zh: '没有可用的直接成本分类明细' },
  { en: 'COGS Analysis', id: 'Analisis HPP', th: 'การวิเคราะห์ COGS', vi: 'Phân tích COGS', zh: 'COGS 分析' },
  { en: 'Executive Review, Risks, Recommendations, and Data Quality', id: 'Tinjauan Eksekutif, Risiko, Rekomendasi, dan Kualitas Data', th: 'บทวิเคราะห์ผู้บริหาร ความเสี่ยง คำแนะนำ และคุณภาพข้อมูล', vi: 'Đánh giá điều hành, rủi ro, khuyến nghị và chất lượng dữ liệu', zh: '管理层审查、风险、建议和数据质量' },

  { en: 'Sampling Report', id: 'Laporan Sampling', th: 'รายงานการสุ่มตัวอย่าง', vi: 'Báo cáo lấy mẫu', zh: '采样报告' },
  { en: 'Sampling Report Analysis', id: 'Analisis Laporan Sampling', th: 'การวิเคราะห์รายงานการสุ่มตัวอย่าง', vi: 'Phân tích báo cáo lấy mẫu', zh: '采样报告分析' },
  { en: 'Shrimp Production Audit Report', id: 'Laporan Audit Produksi Udang', th: 'รายงานตรวจสอบการผลิตกุ้ง', vi: 'Báo cáo kiểm tra sản xuất tôm', zh: '对虾生产审计报告' },
  { en: 'Sampling Overview', id: 'Ringkasan Sampling', th: 'ภาพรวมการสุ่มตัวอย่าง', vi: 'Tổng quan lấy mẫu', zh: '采样概览' },
  { en: 'Pond Sampling Detail', id: 'Rincian Sampling Kolam', th: 'รายละเอียดการสุ่มตัวอย่างบ่อ', vi: 'Chi tiết lấy mẫu ao', zh: '池塘采样明细' },
  { en: 'Growth Trajectory and Survival Rate', id: 'Tren Pertumbuhan dan Tingkat Kelangsungan Hidup', th: 'แนวโน้มการเติบโตและอัตรารอด', vi: 'Xu hướng tăng trưởng và tỷ lệ sống', zh: '生长趋势和成活率' },
  { en: 'Growth Trajectory (ABW/MBW over DOC)', id: 'Tren Pertumbuhan (ABW/MBW terhadap DOC)', th: 'แนวโน้มการเติบโต (ABW/MBW ตาม DOC)', vi: 'Xu hướng tăng trưởng (ABW/MBW theo DOC)', zh: '生长趋势（ABW/MBW 随 DOC）' },
  { en: 'Days of Culture (DOC)', id: 'Hari Budidaya (DOC)', th: 'วันเลี้ยง (DOC)', vi: 'Ngày nuôi (DOC)', zh: '养殖日龄 (DOC)' },
  { en: 'Latest Lab Analysis', id: 'Analisis Laboratorium Terbaru', th: 'ผลวิเคราะห์ห้องปฏิบัติการล่าสุด', vi: 'Phân tích phòng thí nghiệm mới nhất', zh: '最新实验室分析' },
  { en: 'Data Quality Note', id: 'Catatan Kualitas Data', th: 'หมายเหตุคุณภาพข้อมูล', vi: 'Ghi chú chất lượng dữ liệu', zh: '数据质量说明' },
  { en: 'Transaction Register', id: 'Daftar Transaksi', th: 'ทะเบียนรายการธุรกรรม', vi: 'Sổ giao dịch', zh: '交易登记表' },
  { en: 'Transaction History', id: 'Riwayat Transaksi', th: 'ประวัติธุรกรรม', vi: 'Lịch sử giao dịch', zh: '交易记录' },
  { en: 'Complete recorded income and expense activity', id: 'Daftar lengkap pendapatan dan pengeluaran yang tercatat', th: 'รายการรายรับและรายจ่ายที่บันทึกไว้อย่างครบถ้วน', vi: 'Toàn bộ hoạt động thu và chi đã ghi nhận', zh: '完整记录的收入和支出活动' },
  { en: 'Opening Net Position', id: 'Posisi Bersih Awal', th: 'สถานะสุทธิต้นงวด', vi: 'Vị thế ròng đầu kỳ', zh: '期初净额' },
  { en: 'Closing Net Position', id: 'Posisi Bersih Akhir', th: 'สถานะสุทธิปลายงวด', vi: 'Vị thế ròng cuối kỳ', zh: '期末净额' },
  { en: 'Total Money In', id: 'Total Uang Masuk', th: 'เงินเข้ารวม', vi: 'Tổng tiền vào', zh: '总流入' },
  { en: 'Total Money Out', id: 'Total Uang Keluar', th: 'เงินออกรวม', vi: 'Tổng tiền ra', zh: '总流出' },
  { en: 'Money In', id: 'Uang Masuk', th: 'เงินเข้า', vi: 'Tiền vào', zh: '流入' },
  { en: 'Money Out', id: 'Uang Keluar', th: 'เงินออก', vi: 'Tiền ra', zh: '流出' },
  { en: 'Running Net', id: 'Saldo Bersih Berjalan', th: 'ยอดสุทธิสะสม', vi: 'Số dư ròng lũy kế', zh: '累计净额' },
  { en: 'Details', id: 'Rincian', th: 'รายละเอียด', vi: 'Chi tiết', zh: '详情' },
  { en: 'Payment', id: 'Pembayaran', th: 'การชำระเงิน', vi: 'Thanh toán', zh: '付款方式' },
  { en: 'No transactions were recorded for this period.', id: 'Tidak ada transaksi yang tercatat untuk periode ini.', th: 'ไม่มีการบันทึกธุรกรรมในช่วงเวลานี้', vi: 'Không có giao dịch nào được ghi nhận trong kỳ này.', zh: '本期间未记录任何交易。' },
  { en: 'This register combines the income and expense records saved in Shrimply. The running net position is not a bank-reconciled cash balance.', id: 'Daftar ini menggabungkan catatan pendapatan dan pengeluaran yang tersimpan di Shrimply. Posisi bersih berjalan bukan saldo kas yang telah direkonsiliasi dengan bank.', th: 'ทะเบียนนี้รวมรายการรายรับและรายจ่ายที่บันทึกใน Shrimply ยอดสุทธิสะสมไม่ใช่ยอดเงินสดที่กระทบยอดกับธนาคารแล้ว', vi: 'Sổ này kết hợp các khoản thu và chi đã lưu trong Shrimply. Vị thế ròng lũy kế không phải là số dư tiền mặt đã đối chiếu ngân hàng.', zh: '本登记表合并了 Shrimply 中保存的收入和支出记录。累计净额并非已完成银行对账的现金余额。' },
  { en: 'Report Period', id: 'Periode Laporan', th: 'รอบระยะเวลารายงาน', vi: 'Kỳ báo cáo', zh: '报告期间' },
  { en: 'Generated', id: 'Dibuat', th: 'สร้างเมื่อ', vi: 'Ngày tạo', zh: '生成时间' },
  { en: 'Farm', id: 'Tambak', th: 'ฟาร์ม', vi: 'Trang trại', zh: '养殖场' },
  { en: 'Company', id: 'Perusahaan', th: 'บริษัท', vi: 'Công ty', zh: '公司' },
  { en: 'Technician', id: 'Teknisi', th: 'ช่างเทคนิค', vi: 'Kỹ thuật viên', zh: '技术员' },
  { en: 'Pond', id: 'Kolam', th: 'บ่อ', vi: 'Ao', zh: '池塘' },
  { en: 'Current ABW', id: 'ABW Saat Ini', th: 'ABW ปัจจุบัน', vi: 'ABW hiện tại', zh: '当前 ABW' },
  { en: 'Survival Rate', id: 'Tingkat Kelangsungan Hidup', th: 'อัตรารอด', vi: 'Tỷ lệ sống', zh: '成活率' },
  { en: 'Biomass', id: 'Biomassa', th: 'ชีวมวล', vi: 'Sinh khối', zh: '生物量' },
  { en: 'Cumulative Feed', id: 'Pakan Kumulatif', th: 'อาหารสะสม', vi: 'Thức ăn lũy kế', zh: '累计饲料' },
  { en: 'Mortality', id: 'Mortalitas', th: 'การตาย', vi: 'Tỷ lệ chết', zh: '死亡数' },
  { en: 'Main Issue', id: 'Masalah Utama', th: 'ปัญหาหลัก', vi: 'Vấn đề chính', zh: '主要问题' },
  { en: 'Risks', id: 'Risiko', th: 'ความเสี่ยง', vi: 'Rủi ro', zh: '风险' },
  { en: 'Recommended Action', id: 'Tindakan yang Direkomendasikan', th: 'การดำเนินการที่แนะนำ', vi: 'Hành động khuyến nghị', zh: '建议措施' },
  { en: 'Status', id: 'Status', th: 'สถานะ', vi: 'Trạng thái', zh: '状态' },
  { en: 'MBW and ABW refer to the same average shrimp weight value in this report. DOC = Days of Culture | ADG = Average Daily Growth | SR = Survival Rate | FCR = Feed Conversion Ratio.', id: 'MBW dan ABW mengacu pada nilai rata-rata bobot udang yang sama dalam laporan ini. DOC = Hari Budidaya | ADG = Pertumbuhan Harian Rata-rata | SR = Tingkat Kelangsungan Hidup | FCR = Rasio Konversi Pakan.', th: 'MBW และ ABW หมายถึงค่าน้ำหนักเฉลี่ยของกุ้งค่าเดียวกันในรายงานนี้ DOC = วันเลี้ยง | ADG = การเติบโตเฉลี่ยต่อวัน | SR = อัตรารอด | FCR = อัตราแลกเนื้อ', vi: 'MBW và ABW cùng chỉ giá trị khối lượng trung bình của tôm trong báo cáo này. DOC = Ngày nuôi | ADG = Tăng trưởng trung bình hằng ngày | SR = Tỷ lệ sống | FCR = Hệ số chuyển đổi thức ăn.', zh: '本报告中的 MBW 和 ABW 均指对虾平均体重。DOC = 养殖日龄 | ADG = 平均日增重 | SR = 成活率 | FCR = 饲料转化率。' },
  { en: 'Biomass, survival, and FCR are calculated from the sampling and feed records available at export time. If feed history is incomplete, FCR can appear unrealistically low. Use this report as an operational snapshot and reconcile it against feeding logs, inventory deductions, and harvest records before final cycle decisions.', id: 'Biomassa, kelangsungan hidup, dan FCR dihitung dari catatan sampling dan pakan yang tersedia saat ekspor. Jika riwayat pakan tidak lengkap, FCR dapat terlihat terlalu rendah dan tidak realistis. Gunakan laporan ini sebagai ringkasan operasional dan cocokkan dengan catatan pemberian pakan, pengurangan persediaan, serta catatan panen sebelum mengambil keputusan akhir siklus.', th: 'ชีวมวล อัตรารอด และ FCR คำนวณจากบันทึกการสุ่มตัวอย่างและการให้อาหารที่มีอยู่ ณ เวลาส่งออก หากประวัติอาหารไม่ครบถ้วน ค่า FCR อาจต่ำเกินจริง ใช้รายงานนี้เป็นภาพรวมการดำเนินงาน และตรวจสอบเทียบกับบันทึกการให้อาหาร การหักสินค้าคงคลัง และบันทึกการจับก่อนตัดสินใจขั้นสุดท้ายของรอบการเลี้ยง', vi: 'Sinh khối, tỷ lệ sống và FCR được tính từ các bản ghi lấy mẫu và thức ăn có tại thời điểm xuất báo cáo. Nếu lịch sử thức ăn không đầy đủ, FCR có thể thấp một cách không thực tế. Hãy dùng báo cáo này như một ảnh chụp nhanh về vận hành và đối chiếu với nhật ký cho ăn, khấu trừ tồn kho và hồ sơ thu hoạch trước khi đưa ra quyết định cuối vụ.', zh: '生物量、成活率和 FCR 根据导出时可用的采样与饲料记录计算。若饲料历史不完整，FCR 可能显得异常偏低。请将本报告作为运营快照，并在作出养殖周期最终决策前，与投喂记录、库存扣减和收获记录进行核对。' },

  { en: 'Comprehensive Pond Report', id: 'Laporan Tambak Lengkap', th: 'รายงานบ่อแบบครบถ้วน', vi: 'Báo cáo ao toàn diện', zh: '综合池塘报告' },
  { en: 'Summary of Aquaculture Operations', id: 'Ringkasan Operasional Budidaya', th: 'สรุปการดำเนินงานเพาะเลี้ยงสัตว์น้ำ', vi: 'Tóm tắt hoạt động nuôi trồng thủy sản', zh: '水产养殖运营摘要' },
  { en: 'Total Ponds', id: 'Total Tambak', th: 'จำนวนบ่อทั้งหมด', vi: 'Tổng số ao', zh: '池塘总数' },
  { en: 'Total Farm Area', id: 'Total Luas Tambak', th: 'พื้นที่ฟาร์มรวม', vi: 'Tổng diện tích trại', zh: '养殖场总面积' },
  { en: 'Total Est. Biomass', id: 'Total Estimasi Biomassa', th: 'ชีวมวลรวมโดยประมาณ', vi: 'Tổng sinh khối ước tính', zh: '预计总生物量' },
  { en: 'Avg. Survival Rate', id: 'Rata-rata Kelangsungan Hidup', th: 'อัตรารอดเฉลี่ย', vi: 'Tỷ lệ sống trung bình', zh: '平均成活率' },
  { en: 'Pond Performance Summary', id: 'Ringkasan Kinerja Kolam', th: 'สรุปประสิทธิภาพบ่อ', vi: 'Tóm tắt hiệu quả ao', zh: '池塘表现摘要' },
  { en: 'Latest Water Quality Snapshot', id: 'Ringkasan Kualitas Air Terbaru', th: 'ภาพรวมคุณภาพน้ำล่าสุด', vi: 'Tổng quan chất lượng nước mới nhất', zh: '最新水质概览' },
  { en: 'Pond Name', id: 'Nama Kolam', th: 'ชื่อบ่อ', vi: 'Tên ao', zh: '池塘名称' },
  { en: 'Population', id: 'Populasi', th: 'ประชากร', vi: 'Số lượng', zh: '存塘量' },
  { en: 'Density', id: 'Kepadatan', th: 'ความหนาแน่น', vi: 'Mật độ', zh: '密度' },
  { en: 'Generated on:', id: 'Dibuat pada:', th: 'สร้างเมื่อ:', vi: 'Ngày tạo:', zh: '生成日期：' },
  { en: 'This report was generated by', id: 'Laporan ini dibuat oleh', th: 'รายงานนี้สร้างโดย', vi: 'Báo cáo này được tạo bởi', zh: '本报告由以下系统生成：' },
  { en: 'All calculations are based on the latest sampling data and harvest records provided in the application.', id: 'Semua perhitungan didasarkan pada data sampling dan catatan panen terbaru di aplikasi.', th: 'การคำนวณทั้งหมดอ้างอิงข้อมูลการสุ่มตัวอย่างและบันทึกการเก็บเกี่ยวล่าสุดในแอป', vi: 'Mọi phép tính dựa trên dữ liệu lấy mẫu và hồ sơ thu hoạch mới nhất trong ứng dụng.', zh: '所有计算均基于应用中提供的最新采样数据和收获记录。' },
  { en: 'All rights reserved.', id: 'Hak cipta dilindungi.', th: 'สงวนลิขสิทธิ์', vi: 'Bảo lưu mọi quyền.', zh: '保留所有权利。' },

  { en: 'Cycle Report', id: 'Laporan Siklus', th: 'รายงานรอบการเลี้ยง', vi: 'Báo cáo vụ nuôi', zh: '养殖周期报告' },
  { en: 'CLOSED', id: 'DITUTUP', th: 'ปิดแล้ว', vi: 'ĐÃ ĐÓNG', zh: '已关闭' },
  { en: 'Cycle Overview', id: 'Ringkasan Siklus', th: 'ภาพรวมรอบการเลี้ยง', vi: 'Tổng quan vụ nuôi', zh: '养殖周期概览' },
  { en: 'Cycle name', id: 'Nama siklus', th: 'ชื่อรอบการเลี้ยง', vi: 'Tên vụ nuôi', zh: '周期名称' },
  { en: 'Start date', id: 'Tanggal mulai', th: 'วันที่เริ่ม', vi: 'Ngày bắt đầu', zh: '开始日期' },
  { en: 'End date', id: 'Tanggal selesai', th: 'วันที่สิ้นสุด', vi: 'Ngày kết thúc', zh: '结束日期' },
  { en: 'Ponds / area', id: 'Kolam / luas', th: 'บ่อ / พื้นที่', vi: 'Ao / diện tích', zh: '池塘 / 面积' },
  { en: 'Total harvested biomass', id: 'Total biomassa panen', th: 'ชีวมวลเก็บเกี่ยวรวม', vi: 'Tổng sinh khối thu hoạch', zh: '收获总生物量' },
  { en: 'Total harvested revenue', id: 'Total pendapatan panen', th: 'รายได้จากการเก็บเกี่ยวรวม', vi: 'Tổng doanh thu thu hoạch', zh: '收获总收入' },
  { en: 'Total recorded cycle cost', id: 'Total biaya siklus tercatat', th: 'ต้นทุนรอบการเลี้ยงที่บันทึกรวม', vi: 'Tổng chi phí vụ nuôi đã ghi nhận', zh: '已记录周期总成本' },
  { en: 'Estimated gross profit', id: 'Estimasi laba kotor', th: 'กำไรขั้นต้นโดยประมาณ', vi: 'Lợi nhuận gộp ước tính', zh: '预计毛利润' },
  { en: 'Cycle outcome summary', id: 'Ringkasan hasil siklus', th: 'สรุปผลรอบการเลี้ยง', vi: 'Tóm tắt kết quả vụ nuôi', zh: '周期结果摘要' },
  { en: 'Factual performance highlights', id: 'Sorotan kinerja faktual', th: 'จุดเด่นของผลการดำเนินงาน', vi: 'Điểm nổi bật về hiệu quả thực tế', zh: '实际表现亮点' },
  { en: 'Highest harvested biomass', id: 'Biomassa panen tertinggi', th: 'ชีวมวลเก็บเกี่ยวสูงสุด', vi: 'Sinh khối thu hoạch cao nhất', zh: '最高收获生物量' },
  { en: 'Highest actual survival', id: 'Kelangsungan hidup aktual tertinggi', th: 'อัตรารอดจริงสูงสุด', vi: 'Tỷ lệ sống thực tế cao nhất', zh: '最高实际成活率' },
  { en: 'Lowest actual FCR', id: 'FCR aktual terendah', th: 'FCR จริงต่ำสุด', vi: 'FCR thực tế thấp nhất', zh: '最低实际 FCR' },
  { en: 'Non-harvest closures', id: 'Penutupan tanpa panen', th: 'ปิดรอบโดยไม่เก็บเกี่ยว', vi: 'Đóng ao không thu hoạch', zh: '非收获关闭' },
  { en: 'Pond Performance', id: 'Kinerja Kolam', th: 'ประสิทธิภาพบ่อ', vi: 'Hiệu quả ao', zh: '池塘表现' },
  { en: 'Harvested ponds', id: 'Kolam yang dipanen', th: 'บ่อที่เก็บเกี่ยว', vi: 'Ao đã thu hoạch', zh: '已收获池塘' },
  { en: 'Non-Harvest Closures', id: 'Penutupan Tanpa Panen', th: 'การปิดบ่อโดยไม่เก็บเกี่ยว', vi: 'Đóng ao không thu hoạch', zh: '非收获关闭' },
  { en: 'Harvested population', id: 'Populasi yang dipanen', th: 'จำนวนที่เก็บเกี่ยว', vi: 'Số lượng đã thu hoạch', zh: '收获数量' },
  { en: 'Overall actual SR', id: 'SR aktual keseluruhan', th: 'SR จริงโดยรวม', vi: 'SR thực tế tổng thể', zh: '总体实际 SR' },
  { en: 'Supplier', id: 'Pemasok', th: 'ผู้จัดหา', vi: 'Nhà cung cấp', zh: '供应商' },
  { en: 'Final MBW', id: 'MBW Akhir', th: 'MBW สุดท้าย', vi: 'MBW cuối', zh: '最终 MBW' },
  { en: 'Average MBW', id: 'MBW Rata-rata', th: 'MBW เฉลี่ย', vi: 'MBW trung bình', zh: '平均 MBW' },
  { en: 'Harvested biomass', id: 'Biomassa panen', th: 'ชีวมวลเก็บเกี่ยว', vi: 'Sinh khối thu hoạch', zh: '收获生物量' },
  { en: 'Actual SR', id: 'SR Aktual', th: 'SR จริง', vi: 'SR thực tế', zh: '实际 SR' },
  { en: 'Actual FCR', id: 'FCR Aktual', th: 'FCR จริง', vi: 'FCR thực tế', zh: '实际 FCR' },
  { en: 'Reason', id: 'Alasan', th: 'เหตุผล', vi: 'Lý do', zh: '原因' },
  { en: 'Last sampled MBW', id: 'MBW sampling terakhir', th: 'MBW ที่สุ่มล่าสุด', vi: 'MBW lấy mẫu gần nhất', zh: '最近采样 MBW' },
  { en: 'Partial harvest', id: 'Panen parsial', th: 'เก็บเกี่ยวบางส่วน', vi: 'Thu hoạch một phần', zh: '部分收获' },
  { en: 'Calculation basis', id: 'Dasar perhitungan', th: 'เกณฑ์การคำนวณ', vi: 'Cơ sở tính toán', zh: '计算依据' },
  { en: 'Cost and Profitability', id: 'Biaya dan Profitabilitas', th: 'ต้นทุนและความสามารถในการทำกำไร', vi: 'Chi phí và khả năng sinh lời', zh: '成本和盈利能力' },
  { en: 'Recorded cycle cost breakdown', id: 'Rincian biaya siklus tercatat', th: 'รายละเอียดต้นทุนรอบการเลี้ยงที่บันทึก', vi: 'Chi tiết chi phí vụ nuôi đã ghi nhận', zh: '已记录周期成本明细' },
  { en: 'Cost composition', id: 'Komposisi biaya', th: 'องค์ประกอบต้นทุน', vi: 'Cơ cấu chi phí', zh: '成本构成' },
  { en: 'Profitability summary', id: 'Ringkasan profitabilitas', th: 'สรุปความสามารถในการทำกำไร', vi: 'Tóm tắt khả năng sinh lời', zh: '盈利能力摘要' },
  { en: 'Unit economics', id: 'Ekonomi per unit', th: 'เศรษฐศาสตร์ต่อหน่วย', vi: 'Hiệu quả kinh tế đơn vị', zh: '单位经济效益' },
  { en: 'Feed cost', id: 'Biaya pakan', th: 'ต้นทุนอาหาร', vi: 'Chi phí thức ăn', zh: '饲料成本' },
  { en: 'Additive cost', id: 'Biaya aditif', th: 'ต้นทุนสารเติมแต่ง', vi: 'Chi phí phụ gia', zh: '添加剂成本' },
  { en: 'Maintenance cost', id: 'Biaya pemeliharaan', th: 'ค่าบำรุงรักษา', vi: 'Chi phí bảo trì', zh: '维护成本' },
  { en: 'General expenses', id: 'Beban umum', th: 'ค่าใช้จ่ายทั่วไป', vi: 'Chi phí chung', zh: '一般费用' },
  { en: 'Total recorded cost', id: 'Total biaya tercatat', th: 'ต้นทุนที่บันทึกรวม', vi: 'Tổng chi phí đã ghi nhận', zh: '已记录成本合计' },
  { en: 'Share of total', id: 'Porsi dari total', th: 'สัดส่วนของทั้งหมด', vi: 'Tỷ trọng tổng', zh: '占总额比例' },
  { en: 'Category', id: 'Kategori', th: 'หมวดหมู่', vi: 'Danh mục', zh: '类别' },
  { en: 'Amount', id: 'Jumlah', th: 'จำนวนเงิน', vi: 'Số tiền', zh: '金额' },
  { en: 'Total cost', id: 'Total biaya', th: 'ต้นทุนรวม', vi: 'Tổng chi phí', zh: '总成本' },
  { en: 'Gross margin', id: 'Margin kotor', th: 'อัตรากำไรขั้นต้น', vi: 'Biên lợi nhuận gộp', zh: '毛利率' },
  { en: 'Cost per kg', id: 'Biaya per kg', th: 'ต้นทุนต่อกก.', vi: 'Chi phí mỗi kg', zh: '每公斤成本' },
  { en: 'Revenue per kg', id: 'Pendapatan per kg', th: 'รายได้ต่อกก.', vi: 'Doanh thu mỗi kg', zh: '每公斤收入' },
  { en: 'Profit per kg', id: 'Laba per kg', th: 'กำไรต่อกก.', vi: 'Lợi nhuận mỗi kg', zh: '每公斤利润' },
  { en: 'Executive performance snapshot', id: 'Ringkasan kinerja eksekutif', th: 'ภาพรวมผลการดำเนินงานสำหรับผู้บริหาร', vi: 'Tổng quan hiệu suất điều hành', zh: '管理绩效概览' },
  { en: 'Harvest yield', id: 'Hasil panen', th: 'ผลผลิตเก็บเกี่ยว', vi: 'Năng suất thu hoạch', zh: '收获产量' },
  { en: 'Overall survival', id: 'Kelangsungan hidup keseluruhan', th: 'อัตรารอดโดยรวม', vi: 'Tỷ lệ sống tổng thể', zh: '总体成活率' },
  { en: 'Average harvest MBW', id: 'MBW panen rata-rata', th: 'MBW เก็บเกี่ยวเฉลี่ย', vi: 'MBW thu hoạch trung bình', zh: '平均收获 MBW' },
  { en: 'Sampling coverage', id: 'Cakupan sampling', th: 'ความครอบคลุมการสุ่มตัวอย่าง', vi: 'Mức độ bao phủ lấy mẫu', zh: '采样覆盖率' },
  { en: 'Previous cycle comparison', id: 'Perbandingan siklus sebelumnya', th: 'เปรียบเทียบกับรอบก่อนหน้า', vi: 'So sánh vụ trước', zh: '上一周期比较' },
  { en: 'Metric', id: 'Metrik', th: 'ตัวชี้วัด', vi: 'Chỉ số', zh: '指标' },
  { en: 'Current', id: 'Saat ini', th: 'ปัจจุบัน', vi: 'Hiện tại', zh: '当前' },
  { en: 'Previous', id: 'Sebelumnya', th: 'ก่อนหน้า', vi: 'Trước', zh: '上一周期' },
  { en: 'Change', id: 'Perubahan', th: 'การเปลี่ยนแปลง', vi: 'Thay đổi', zh: '变化' },
  { en: 'Yield', id: 'Hasil panen', th: 'ผลผลิต', vi: 'Năng suất', zh: '产量' },
  { en: 'Priority review and next action', id: 'Tinjauan prioritas dan tindakan berikutnya', th: 'ประเด็นสำคัญและการดำเนินการถัดไป', vi: 'Ưu tiên xem xét và hành động tiếp theo', zh: '优先审查和下一步行动' },
  { en: 'Closure review', id: 'Tinjauan penutupan', th: 'ทบทวนการปิดรอบ', vi: 'Xem xét việc đóng ao', zh: '关闭审查' },
  { en: 'Review the recorded cause and prevention steps before the next stocking.', id: 'Tinjau penyebab yang tercatat dan langkah pencegahan sebelum penebaran berikutnya.', th: 'ทบทวนสาเหตุที่บันทึกและขั้นตอนป้องกันก่อนปล่อยกุ้งรอบถัดไป', vi: 'Xem lại nguyên nhân đã ghi nhận và các bước phòng ngừa trước lần thả nuôi tiếp theo.', zh: '下次投苗前，请审查已记录的原因和预防措施。' },
  { en: 'Feed efficiency', id: 'Efisiensi pakan', th: 'ประสิทธิภาพอาหาร', vi: 'Hiệu quả thức ăn', zh: '饲料效率' },
  { en: 'Check feed logs, biomass estimates, and harvest linkage.', id: 'Periksa catatan pakan, estimasi biomassa, dan keterkaitan panen.', th: 'ตรวจสอบบันทึกอาหาร ประมาณการชีวมวล และการเชื่อมโยงข้อมูลเก็บเกี่ยว', vi: 'Kiểm tra nhật ký thức ăn, ước tính sinh khối và liên kết thu hoạch.', zh: '检查饲料日志、生物量估算和收获关联。' },
  { en: 'Survival review', id: 'Tinjauan kelangsungan hidup', th: 'ทบทวนอัตรารอด', vi: 'Xem xét tỷ lệ sống', zh: '成活率审查' },
  { en: 'Review mortality, water records, and stocking quality.', id: 'Tinjau mortalitas, catatan air, dan kualitas penebaran.', th: 'ทบทวนการตาย บันทึกคุณภาพน้ำ และคุณภาพการปล่อยกุ้ง', vi: 'Xem lại tỷ lệ chết, hồ sơ nước và chất lượng thả nuôi.', zh: '审查死亡、水质记录和投苗质量。' },
  { en: 'Complete missing MBW records before comparing growth performance.', id: 'Lengkapi catatan MBW yang hilang sebelum membandingkan kinerja pertumbuhan.', th: 'กรอกบันทึก MBW ที่ขาดก่อนเปรียบเทียบผลการเติบโต', vi: 'Hoàn thiện hồ sơ MBW còn thiếu trước khi so sánh hiệu quả tăng trưởng.', zh: '比较生长表现前，请补全缺失的 MBW 记录。' },
  { en: 'Profitability review', id: 'Tinjauan profitabilitas', th: 'ทบทวนความสามารถในการทำกำไร', vi: 'Xem xét khả năng sinh lời', zh: '盈利能力审查' },
  { en: 'Recorded cycle costs exceeded recorded harvest revenue.', id: 'Biaya siklus tercatat melebihi pendapatan panen tercatat.', th: 'ต้นทุนรอบการเลี้ยงที่บันทึกสูงกว่ารายได้เก็บเกี่ยวที่บันทึก', vi: 'Chi phí vụ nuôi đã ghi nhận vượt doanh thu thu hoạch đã ghi nhận.', zh: '已记录的周期成本超过已记录的收获收入。' },
  { en: 'Reconcile selling prices and every cycle-linked expense.', id: 'Rekonsiliasi harga jual dan setiap beban yang terkait dengan siklus.', th: 'กระทบยอดราคาขายและค่าใช้จ่ายทั้งหมดที่เชื่อมกับรอบการเลี้ยง', vi: 'Đối chiếu giá bán và mọi chi phí liên kết với vụ nuôi.', zh: '核对售价和每项与周期关联的费用。' },
  { en: 'No major review flags', id: 'Tidak ada tanda tinjauan utama', th: 'ไม่มีประเด็นสำคัญที่ต้องทบทวน', vi: 'Không có cảnh báo lớn cần xem xét', zh: '无重大审查标记' },
  { en: 'The available records did not trigger the cycle screening checks.', id: 'Catatan yang tersedia tidak memicu pemeriksaan siklus.', th: 'บันทึกที่มีไม่เข้าเกณฑ์การตรวจคัดกรองรอบการเลี้ยง', vi: 'Các hồ sơ hiện có không kích hoạt kiểm tra sàng lọc vụ nuôi.', zh: '现有记录未触发周期筛查检查。' },
  { en: 'Confirm results against farm targets before the next stocking decision.', id: 'Konfirmasikan hasil terhadap target tambak sebelum keputusan penebaran berikutnya.', th: 'ยืนยันผลเทียบกับเป้าหมายฟาร์มก่อนตัดสินใจปล่อยกุ้งครั้งถัดไป', vi: 'Xác nhận kết quả theo mục tiêu trang trại trước quyết định thả nuôi tiếp theo.', zh: '下次投苗决策前，请根据养殖场目标确认结果。' },
  { en: 'Recent MBW movement', id: 'Pergerakan MBW terbaru', th: 'การเปลี่ยนแปลง MBW ล่าสุด', vi: 'Biến động MBW gần đây', zh: '近期 MBW 变化' },
  { en: 'No valid MBW trend', id: 'Tidak ada tren MBW valid', th: 'ไม่มีแนวโน้ม MBW ที่ใช้ได้', vi: 'Không có xu hướng MBW hợp lệ', zh: '没有有效的 MBW 趋势' },
  { en: 'Pond Performance - Continued', id: 'Kinerja Kolam - Lanjutan', th: 'ประสิทธิภาพบ่อ - ต่อ', vi: 'Hiệu quả ao - Tiếp', zh: '池塘表现 - 续' },
  { en: 'Data quality and assumptions', id: 'Kualitas data dan asumsi', th: 'คุณภาพข้อมูลและสมมติฐาน', vi: 'Chất lượng dữ liệu và giả định', zh: '数据质量和假设' },
  { en: 'MBW sampling', id: 'Sampling MBW', th: 'การสุ่มตัวอย่าง MBW', vi: 'Lấy mẫu MBW', zh: 'MBW 采样' },
  { en: 'Water quality', id: 'Kualitas air', th: 'คุณภาพน้ำ', vi: 'Chất lượng nước', zh: '水质' },
  { en: 'Cost records', id: 'Catatan biaya', th: 'บันทึกต้นทุน', vi: 'Hồ sơ chi phí', zh: '成本记录' },
  { en: 'Harvest linkage', id: 'Keterkaitan panen', th: 'การเชื่อมโยงข้อมูลเก็บเกี่ยว', vi: 'Liên kết thu hoạch', zh: '收获关联' },
  { en: 'Source notes:', id: 'Catatan sumber:', th: 'หมายเหตุแหล่งข้อมูล:', vi: 'Ghi chú nguồn:', zh: '来源说明：' },
  { en: 'No completed earlier cycle was available for comparison.', id: 'Tidak ada siklus sebelumnya yang selesai untuk dibandingkan.', th: 'ไม่มีรอบก่อนหน้าที่เสร็จสมบูรณ์สำหรับการเปรียบเทียบ', vi: 'Không có vụ hoàn thành trước đó để so sánh.', zh: '没有可用于比较的已完成早期周期。' },
  { en: 'No valid MBW trend was available.', id: 'Tidak ada tren MBW valid yang tersedia.', th: 'ไม่มีแนวโน้ม MBW ที่ใช้ได้', vi: 'Không có xu hướng MBW hợp lệ.', zh: '没有可用的有效 MBW 趋势。' },
  { en: 'Review signals use screening levels, not farm targets. Strong: survival 85% or higher, FCR 1.50 or lower, margin 20% or higher, and sampling coverage 90% or higher.', id: 'Sinyal tinjauan menggunakan tingkat penyaringan, bukan target tambak. Kuat: kelangsungan hidup 85% atau lebih, FCR 1,50 atau kurang, margin 20% atau lebih, dan cakupan sampling 90% atau lebih.', th: 'สัญญาณทบทวนใช้เกณฑ์คัดกรอง ไม่ใช่เป้าหมายของฟาร์ม ระดับดี: อัตรารอดอย่างน้อย 85% FCR ไม่เกิน 1.50 มาร์จิ้นอย่างน้อย 20% และความครอบคลุมการสุ่มอย่างน้อย 90%', vi: 'Các tín hiệu xem xét dùng mức sàng lọc, không phải mục tiêu trang trại. Mạnh: tỷ lệ sống từ 85%, FCR không quá 1,50, biên lợi nhuận từ 20% và độ bao phủ lấy mẫu từ 90%.', zh: '审查信号采用筛查标准，而非养殖场目标。表现强：成活率不低于 85%、FCR 不高于 1.50、利润率不低于 20%，且采样覆盖率不低于 90%。' },
  { en: 'Strong', id: 'Kuat', th: 'ดี', vi: 'Mạnh', zh: '强' },
  { en: 'Watch', id: 'Pantau', th: 'เฝ้าระวัง', vi: 'Theo dõi', zh: '关注' },
  { en: 'Recorded', id: 'Tercatat', th: 'บันทึกแล้ว', vi: 'Đã ghi nhận', zh: '已记录' },
  { en: 'No data', id: 'Tidak ada data', th: 'ไม่มีข้อมูล', vi: 'Không có dữ liệu', zh: '无数据' },
  { en: 'Good', id: 'Baik', th: 'ดี', vi: 'Tốt', zh: '良好' },

  { en: 'Financial Harvest Projection', id: 'Proyeksi Keuangan Panen', th: 'ประมาณการทางการเงินการเก็บเกี่ยว', vi: 'Dự báo tài chính thu hoạch', zh: '收获财务预测' },
  { en: 'Harvest DOC', id: 'DOC Panen', th: 'DOC เก็บเกี่ยว', vi: 'DOC thu hoạch', zh: '收获 DOC' },
  { en: 'Projected MBW', id: 'Proyeksi MBW', th: 'MBW ที่คาดการณ์', vi: 'MBW dự kiến', zh: '预计 MBW' },
  { en: 'Projected Biomass', id: 'Proyeksi Biomassa', th: 'ชีวมวลที่คาดการณ์', vi: 'Sinh khối dự kiến', zh: '预计生物量' },
  { en: 'Projection FCR', id: 'Proyeksi FCR', th: 'FCR ที่คาดการณ์', vi: 'FCR dự kiến', zh: '预计 FCR' },
  { en: 'Confidence', id: 'Tingkat Keyakinan', th: 'ความเชื่อมั่น', vi: 'Độ tin cậy', zh: '置信度' },
  { en: 'Recommended action', id: 'Tindakan yang direkomendasikan', th: 'การดำเนินการที่แนะนำ', vi: 'Hành động khuyến nghị', zh: '建议措施' },
  { en: 'Keep Growing', id: 'Lanjutkan Budidaya', th: 'เลี้ยงต่อ', vi: 'Tiếp tục nuôi', zh: '继续养殖' },
  { en: 'Harvest Now', id: 'Panen Sekarang', th: 'เก็บเกี่ยวตอนนี้', vi: 'Thu hoạch ngay', zh: '立即收获' },
  { en: 'Review Data', id: 'Tinjau Data', th: 'ตรวจสอบข้อมูล', vi: 'Xem lại dữ liệu', zh: '检查数据' },
  { en: 'Harvest today', id: 'Panen hari ini', th: 'เก็บเกี่ยววันนี้', vi: 'Thu hoạch hôm nay', zh: '今日收获' },
  { en: 'Best projected scenario', id: 'Skenario proyeksi terbaik', th: 'สถานการณ์คาดการณ์ที่ดีที่สุด', vi: 'Kịch bản dự kiến tốt nhất', zh: '最佳预测情景' },
  { en: 'Cost Basis', id: 'Dasar Biaya', th: 'ฐานต้นทุน', vi: 'Cơ sở chi phí', zh: '成本基础' },
  { en: 'Consumed feed to date', id: 'Pakan yang digunakan hingga saat ini', th: 'อาหารที่ใช้จนถึงปัจจุบัน', vi: 'Thức ăn đã sử dụng đến nay', zh: '截至目前已消耗饲料' },
  { en: 'Consumed additives to date', id: 'Aditif yang digunakan hingga saat ini', th: 'สารเติมแต่งที่ใช้จนถึงปัจจุบัน', vi: 'Phụ gia đã sử dụng đến nay', zh: '截至目前已消耗添加剂' },
  { en: 'Allocated general expenses to date', id: 'Beban umum yang dialokasikan hingga saat ini', th: 'ค่าใช้จ่ายทั่วไปที่จัดสรรจนถึงปัจจุบัน', vi: 'Chi phí chung đã phân bổ đến nay', zh: '截至目前已分配一般费用' },
  { en: 'Projected future feed at best scenario', id: 'Proyeksi pakan mendatang pada skenario terbaik', th: 'อาหารในอนาคตที่คาดการณ์ในสถานการณ์ที่ดีที่สุด', vi: 'Thức ăn tương lai dự kiến ở kịch bản tốt nhất', zh: '最佳情景下预计未来饲料' },
  { en: 'Projected future additives at best scenario', id: 'Proyeksi aditif mendatang pada skenario terbaik', th: 'สารเติมแต่งในอนาคตที่คาดการณ์ในสถานการณ์ที่ดีที่สุด', vi: 'Phụ gia tương lai dự kiến ở kịch bản tốt nhất', zh: '最佳情景下预计未来添加剂' },
  { en: 'Projected future general expenses at best scenario', id: 'Proyeksi beban umum mendatang pada skenario terbaik', th: 'ค่าใช้จ่ายทั่วไปในอนาคตที่คาดการณ์ในสถานการณ์ที่ดีที่สุด', vi: 'Chi phí chung tương lai dự kiến ở kịch bản tốt nhất', zh: '最佳情景下预计未来一般费用' },
  { en: 'Key Assumptions and Sensitivities', id: 'Asumsi Utama dan Sensitivitas', th: 'สมมติฐานสำคัญและความไว', vi: 'Giả định chính và độ nhạy', zh: '关键假设和敏感性' },
  { en: 'Current market size', id: 'Ukuran pasar saat ini', th: 'ขนาดตลาดปัจจุบัน', vi: 'Cỡ thị trường hiện tại', zh: '当前市场规格' },
  { en: 'Feed change benchmark', id: 'Acuan perubahan pakan', th: 'เกณฑ์การเปลี่ยนแปลงอาหาร', vi: 'Mốc biến động thức ăn', zh: '饲料变化基准' },
  { en: 'Mortality benchmark', id: 'Acuan mortalitas', th: 'เกณฑ์การตาย', vi: 'Mốc tỷ lệ chết', zh: '死亡率基准' },
  { en: 'Mortality data coverage', id: 'Cakupan data mortalitas', th: 'ความครอบคลุมข้อมูลการตาย', vi: 'Mức độ bao phủ dữ liệu tỷ lệ chết', zh: '死亡数据覆盖' },
  { en: 'Survival assumption', id: 'Asumsi kelangsungan hidup', th: 'สมมติฐานอัตรารอด', vi: 'Giả định tỷ lệ sống', zh: '成活率假设' },
  { en: 'Orson AI Risk Analysis:', id: 'Analisis Risiko Orson AI:', th: 'การวิเคราะห์ความเสี่ยงโดย Orson AI:', vi: 'Phân tích rủi ro Orson AI:', zh: 'Orson AI 风险分析：' },
  { en: 'Structured Projection Risks', id: 'Risiko Proyeksi Terstruktur', th: 'ความเสี่ยงของประมาณการแบบมีโครงสร้าง', vi: 'Rủi ro dự báo có cấu trúc', zh: '结构化预测风险' },
  { en: 'No AI analysis performed for this projection.', id: 'Belum ada analisis AI untuk proyeksi ini.', th: 'ยังไม่มีการวิเคราะห์ AI สำหรับประมาณการนี้', vi: 'Chưa thực hiện phân tích AI cho dự báo này.', zh: '尚未对此预测执行 AI 分析。' },
  { en: 'Not available', id: 'Tidak tersedia', th: 'ไม่มีข้อมูล', vi: 'Không có dữ liệu', zh: '不可用' },
  { en: 'Cash Flow Statement (Direct Method)', id: 'Laporan Arus Kas (Metode Langsung)', th: 'งบกระแสเงินสด (วิธีทางตรง)', vi: 'Báo cáo lưu chuyển tiền tệ (phương pháp trực tiếp)', zh: '现金流量表（直接法）' },
  { en: 'Closing Cash Position, Executive Review, and Liquidity Risks', id: 'Posisi Kas Akhir, Tinjauan Eksekutif, dan Risiko Likuiditas', th: 'สถานะเงินสดปลายงวด บทวิเคราะห์ผู้บริหาร และความเสี่ยงด้านสภาพคล่อง', vi: 'Vị thế tiền mặt cuối kỳ, đánh giá điều hành và rủi ro thanh khoản', zh: '期末现金状况、管理层审查和流动性风险' },
  { en: 'Capital Contributed by Owners', id: 'Modal Disetor Pemilik', th: 'เงินทุนที่เจ้าของสมทบ', vi: 'Vốn do chủ sở hữu góp', zh: '业主投入资本' },
  { en: 'Purchase of Property & Equipment', id: 'Pembelian Properti & Peralatan', th: 'ซื้ออสังหาริมทรัพย์และอุปกรณ์', vi: 'Mua tài sản và thiết bị', zh: '购置物业和设备' },
  { en: 'Proceeds from Sale of Assets', id: 'Penerimaan dari Penjualan Aset', th: 'เงินรับจากการขายสินทรัพย์', vi: 'Tiền thu từ bán tài sản', zh: '出售资产所得' },
  { en: 'Proceeds from Sale of Investments', id: 'Penerimaan dari Penjualan Investasi', th: 'เงินรับจากการขายเงินลงทุน', vi: 'Tiền thu từ bán khoản đầu tư', zh: '出售投资所得' },
  { en: 'Proceeds from Loans', id: 'Penerimaan Pinjaman', th: 'เงินรับจากเงินกู้', vi: 'Tiền thu từ khoản vay', zh: '贷款所得' },
  { en: 'Repayment of Loans', id: 'Pembayaran Kembali Pinjaman', th: 'ชำระคืนเงินกู้', vi: 'Hoàn trả khoản vay', zh: '偿还贷款' },
  { en: 'Net Increase/(Decrease) in Cash', id: 'Kenaikan/(Penurunan) Bersih Kas', th: 'เงินสดเพิ่มขึ้น/(ลดลง)สุทธิ', vi: 'Tăng/(giảm) ròng tiền mặt', zh: '现金净增加/（减少）' },
  { en: 'No Investing Activities', id: 'Tidak Ada Aktivitas Investasi', th: 'ไม่มีกิจกรรมลงทุน', vi: 'Không có hoạt động đầu tư', zh: '无投资活动' },
  { en: 'No Financing Activities', id: 'Tidak Ada Aktivitas Pendanaan', th: 'ไม่มีกิจกรรมจัดหาเงิน', vi: 'Không có hoạt động tài chính', zh: '无融资活动' },
  { en: 'Other Operating Cash Receipts', id: 'Penerimaan Kas Operasional Lainnya', th: 'เงินสดรับจากการดำเนินงานอื่น', vi: 'Khoản thu tiền hoạt động khác', zh: '其他经营现金收入' },
  { en: 'Other Operating Cash Payments', id: 'Pembayaran Kas Operasional Lainnya', th: 'เงินสดจ่ายจากการดำเนินงานอื่น', vi: 'Khoản chi tiền hoạt động khác', zh: '其他经营现金支出' },
  { en: 'Inventory Adjustment', id: 'Penyesuaian Persediaan', th: 'การปรับปรุงสินค้าคงเหลือ', vi: 'Điều chỉnh tồn kho', zh: '库存调整' },
  { en: 'Opening Inventory (', id: 'Persediaan Awal (', th: 'สินค้าคงเหลือต้นงวด (', vi: 'Tồn kho đầu kỳ (', zh: '期初库存（' },
  { en: 'Closing Inventory (', id: 'Persediaan Akhir (', th: 'สินค้าคงเหลือปลายงวด (', vi: 'Tồn kho cuối kỳ (', zh: '期末库存（' },

  { en: 'Totals / Averages', id: 'Total / Rata-rata', th: 'รวม / ค่าเฉลี่ย', vi: 'Tổng / Trung bình', zh: '合计 / 平均' },
  { en: 'Performance Indicators', id: 'Indikator Kinerja', th: 'ตัวชี้วัดประสิทธิภาพ', vi: 'Chỉ số hiệu quả', zh: '表现指标' },
  { en: 'Legend & Data Notes', id: 'Legenda & Catatan Data', th: 'คำอธิบายและหมายเหตุข้อมูล', vi: 'Chú giải và ghi chú dữ liệu', zh: '图例和数据说明' },
  { en: 'Growth Chart', id: 'Grafik Pertumbuhan', th: 'กราฟการเติบโต', vi: 'Biểu đồ tăng trưởng', zh: '生长图表' },
  { en: 'Growth Trajectory', id: 'Tren Pertumbuhan', th: 'แนวโน้มการเติบโต', vi: 'Xu hướng tăng trưởng', zh: '生长趋势' },
  { en: 'Growth Trajectory (MBW by DOC)', id: 'Tren Pertumbuhan (MBW berdasarkan DOC)', th: 'แนวโน้มการเติบโต (MBW ตาม DOC)', vi: 'Xu hướng tăng trưởng (MBW theo DOC)', zh: '生长趋势（MBW 按 DOC）' },
  { en: 'Recent Growth Movement', id: 'Perubahan Pertumbuhan Terkini', th: 'การเปลี่ยนแปลงการเติบโตล่าสุด', vi: 'Biến động tăng trưởng gần đây', zh: '近期生长变化' },
  { en: 'Previous and latest valid mean body weight by pond', id: 'Bobot tubuh rata-rata valid sebelumnya dan terbaru per kolam', th: 'น้ำหนักตัวเฉลี่ยที่ใช้ได้ครั้งก่อนและล่าสุดแยกตามบ่อ', vi: 'Khối lượng cơ thể trung bình hợp lệ trước đó và mới nhất theo ao', zh: '各池塘上次及最新有效平均体重' },
  { en: 'Previous sampling', id: 'Sampling sebelumnya', th: 'การสุ่มตัวอย่างครั้งก่อน', vi: 'Lần lấy mẫu trước', zh: '上次采样' },
  { en: 'Latest sampling', id: 'Sampling terbaru', th: 'การสุ่มตัวอย่างล่าสุด', vi: 'Lần lấy mẫu mới nhất', zh: '最新采样' },
  { en: 'Latest valid records', id: 'Catatan valid terbaru', th: 'บันทึกที่ใช้ได้ล่าสุด', vi: 'Hồ sơ hợp lệ mới nhất', zh: '最新有效记录' },
  { en: 'No valid MBW sampling points available', id: 'Tidak ada titik sampling MBW yang valid', th: 'ไม่มีจุดสุ่มตัวอย่าง MBW ที่ถูกต้อง', vi: 'Không có điểm lấy mẫu MBW hợp lệ', zh: '没有可用的有效 MBW 采样点' },
  { en: 'No valid MBW sampling records available', id: 'Tidak ada catatan sampling MBW yang valid', th: 'ไม่มีบันทึกการสุ่มตัวอย่าง MBW ที่ใช้ได้', vi: 'Không có hồ sơ lấy mẫu MBW hợp lệ', zh: '没有可用的有效 MBW 采样记录' },
  { en: 'Performance analytics across all active production ponds.', id: 'Analisis kinerja seluruh kolam produksi aktif.', th: 'การวิเคราะห์ประสิทธิภาพของบ่อผลิตที่ใช้งานทั้งหมด', vi: 'Phân tích hiệu quả trên tất cả ao sản xuất đang hoạt động.', zh: '所有活跃生产池塘的表现分析。' },
  { en: 'Avg Body Weight', id: 'Rata-rata Bobot Tubuh', th: 'น้ำหนักตัวเฉลี่ย', vi: 'Khối lượng cơ thể trung bình', zh: '平均体重' },
  { en: 'Avg Daily Growth', id: 'Rata-rata Pertumbuhan Harian', th: 'การเติบโตเฉลี่ยต่อวัน', vi: 'Tăng trưởng trung bình ngày', zh: '平均日增重' },
  { en: 'Avg Survival Rate', id: 'Rata-rata Tingkat Kelangsungan Hidup', th: 'อัตรารอดเฉลี่ย', vi: 'Tỷ lệ sống trung bình', zh: '平均成活率' },
  { en: 'Avg Size', id: 'Ukuran Rata-rata', th: 'ขนาดเฉลี่ย', vi: 'Kích cỡ trung bình', zh: '平均规格' },
  { en: 'Avg FCR', id: 'Rata-rata FCR', th: 'FCR เฉลี่ย', vi: 'FCR trung bình', zh: '平均 FCR' },
  { en: 'Previous ABW', id: 'ABW Sebelumnya', th: 'ABW ก่อนหน้า', vi: 'ABW trước đó', zh: '上次 ABW' },
  { en: 'Prev ABW', id: 'ABW Sebelumnya', th: 'ABW ก่อนหน้า', vi: 'ABW trước', zh: '上次 ABW' },
  { en: 'Pond Status', id: 'Status Kolam', th: 'สถานะบ่อ', vi: 'Trạng thái ao', zh: '池塘状态' },
  { en: 'Final harvest MBW:', id: 'MBW panen final:', th: 'MBW เก็บเกี่ยวสุดท้าย:', vi: 'MBW thu hoạch cuối:', zh: '最终收获 MBW：' },
  { en: 'Average MBW:', id: 'MBW rata-rata:', th: 'MBW เฉลี่ย:', vi: 'MBW trung bình:', zh: '平均 MBW：' },
  { en: 'Harvest totals:', id: 'Total panen:', th: 'ยอดรวมการเก็บเกี่ยว:', vi: 'Tổng thu hoạch:', zh: '收获合计：' },
  { en: 'Gross profit', id: 'Laba kotor', th: 'กำไรขั้นต้น', vi: 'Lợi nhuận gộp', zh: '毛利润' },
  { en: 'Projected FCR', id: 'Proyeksi FCR', th: 'FCR ที่คาดการณ์', vi: 'FCR dự kiến', zh: '预计 FCR' },
  { en: 'MBW (g)', id: 'MBW (g)', th: 'MBW (g)', vi: 'MBW (g)', zh: 'MBW (g)' },
  { en: 'Sal (ppt)', id: 'Salinitas (ppt)', th: 'ความเค็ม (ppt)', vi: 'Độ mặn (ppt)', zh: '盐度 (ppt)' },
  { en: 'Transp (cm)', id: 'Transparansi (cm)', th: 'ความโปร่งใส (cm)', vi: 'Độ trong (cm)', zh: '透明度 (cm)' },
  { en: 'Shrimply Aquaculture Management System', id: 'Sistem Manajemen Akuakultur Shrimply', th: 'ระบบจัดการเพาะเลี้ยงสัตว์น้ำ Shrimply', vi: 'Hệ thống quản lý nuôi trồng thủy sản Shrimply', zh: 'Shrimply 水产养殖管理系统' },
  { en: 'Data Quality:', id: 'Kualitas Data:', th: 'คุณภาพข้อมูล:', vi: 'Chất lượng dữ liệu:', zh: '数据质量：' },
  { en: 'FCR Note:', id: 'Catatan FCR:', th: 'หมายเหตุ FCR:', vi: 'Ghi chú FCR:', zh: 'FCR 说明：' },
  { en: 'Note:', id: 'Catatan:', th: 'หมายเหตุ:', vi: 'Ghi chú:', zh: '说明：' },
  { en: 'Area (m²)', id: 'Luas (m²)', th: 'พื้นที่ (m²)', vi: 'Diện tích (m²)', zh: '面积 (m²)' },
  { en: 'Biomass (kg)', id: 'Biomassa (kg)', th: 'ชีวมวล (kg)', vi: 'Sinh khối (kg)', zh: '生物量 (kg)' },
  { en: 'Mort %', id: 'Mortalitas %', th: 'การตาย %', vi: 'Tỷ lệ chết %', zh: '死亡率 %' },
  { en: 'Mort%', id: 'Mortalitas%', th: 'การตาย%', vi: 'Tỷ lệ chết%', zh: '死亡率%' },
  { en: 'Total biomass', id: 'Total biomassa', th: 'ชีวมวลรวม', vi: 'Tổng sinh khối', zh: '总生物量' },

  { en: 'Feed', id: 'Pakan', th: 'อาหาร', vi: 'Thức ăn', zh: '饲料' },
  { en: 'Pond Additives', id: 'Aditif Kolam', th: 'สารเติมแต่งบ่อ', vi: 'Phụ gia ao', zh: '池塘添加剂' },
  { en: 'Labor', id: 'Tenaga Kerja', th: 'แรงงาน', vi: 'Lao động', zh: '人工' },
  { en: 'Repairs', id: 'Perbaikan', th: 'การซ่อมแซม', vi: 'Sửa chữa', zh: '维修' },
  { en: 'Utilities', id: 'Utilitas', th: 'สาธารณูปโภค', vi: 'Tiện ích', zh: '公用事业' },
  { en: 'Miscellaneous', id: 'Lain-lain', th: 'เบ็ดเตล็ด', vi: 'Khác', zh: '杂项' },
  { en: 'Loan Payment', id: 'Pembayaran Pinjaman', th: 'ชำระเงินกู้', vi: 'Thanh toán khoản vay', zh: '贷款还款' },
  { en: 'Taxes', id: 'Pajak', th: 'ภาษี', vi: 'Thuế', zh: '税费' },
  { en: 'Interest', id: 'Bunga', th: 'ดอกเบี้ย', vi: 'Lãi vay', zh: '利息' },
  { en: 'Equipment', id: 'Peralatan', th: 'อุปกรณ์', vi: 'Thiết bị', zh: '设备' },
  { en: 'Property', id: 'Properti', th: 'ทรัพย์สิน', vi: 'Tài sản', zh: '财产' },
  { en: 'Infrastructure', id: 'Infrastruktur', th: 'โครงสร้างพื้นฐาน', vi: 'Cơ sở hạ tầng', zh: '基础设施' },
  { en: 'Owner Withdrawal', id: 'Penarikan Pemilik', th: 'การถอนเงินของเจ้าของ', vi: 'Chủ sở hữu rút vốn', zh: '业主提款' },
  { en: 'Dividend', id: 'Dividen', th: 'เงินปันผล', vi: 'Cổ tức', zh: '股息' },
  { en: 'Maintenance', id: 'Pemeliharaan', th: 'การบำรุงรักษา', vi: 'Bảo trì', zh: '维护' },
  { en: 'Shrimp Sales', id: 'Penjualan Udang', th: 'การขายกุ้ง', vi: 'Bán tôm', zh: '虾销售' },
  { en: 'Consultation', id: 'Konsultasi', th: 'ที่ปรึกษา', vi: 'Tư vấn', zh: '咨询' },
  { en: 'Equipment Rental', id: 'Sewa Peralatan', th: 'ค่าเช่าอุปกรณ์', vi: 'Cho thuê thiết bị', zh: '设备租赁' },
  { en: 'Other Income', id: 'Pendapatan Lain', th: 'รายได้อื่น', vi: 'Thu nhập khác', zh: '其他收入' },

  { en: 'Survival confidence:', id: 'Tingkat keyakinan kelangsungan hidup:', th: 'ความเชื่อมั่นของอัตรารอด:', vi: 'Độ tin cậy tỷ lệ sống:', zh: '成活率置信度：' },
  { en: 'Market size status:', id: 'Status ukuran pasar:', th: 'สถานะขนาดตลาด:', vi: 'Trạng thái cỡ thị trường:', zh: '市场规格状态：' },
  { en: 'recorded days', id: 'hari tercatat', th: 'วันที่บันทึก', vi: 'ngày đã ghi nhận', zh: '个记录日' },
  { en: 'per day', id: 'per hari', th: 'ต่อวัน', vi: 'mỗi ngày', zh: '每天' },
  { en: 'g/day', id: 'g/hari', th: 'กรัม/วัน', vi: 'g/ngày', zh: '克/天' },
  { en: 'count/kg', id: 'ekor/kg', th: 'ตัว/kg', vi: 'con/kg', zh: '尾/kg' },
  { en: 'pcs/kg', id: 'ekor/kg', th: 'ตัว/กก.', vi: 'con/kg', zh: '尾/千克' },
  { en: 'DO (AM)', id: 'DO (Pagi)', th: 'DO (เช้า)', vi: 'DO (sáng)', zh: 'DO（上午）' },
  { en: 'DO (PM)', id: 'DO (Sore)', th: 'DO (เย็น)', vi: 'DO (chiều)', zh: 'DO（下午）' },
  { en: 'pH (AM)', id: 'pH (Pagi)', th: 'pH (เช้า)', vi: 'pH (sáng)', zh: 'pH（上午）' },
  { en: 'pH (PM)', id: 'pH (Sore)', th: 'pH (เย็น)', vi: 'pH (chiều)', zh: 'pH（下午）' },
  { en: 'Revenue:', id: 'Pendapatan:', th: 'รายได้:', vi: 'Doanh thu:', zh: '收入：' },
  { en: 'low', id: 'rendah', th: 'ต่ำ', vi: 'thấp', zh: '低' },
  { en: 'medium', id: 'sedang', th: 'ปานกลาง', vi: 'trung bình', zh: '中' },
  { en: 'high', id: 'tinggi', th: 'สูง', vi: 'cao', zh: '高' },
  { en: 'unknown', id: 'tidak diketahui', th: 'ไม่ทราบ', vi: 'không xác định', zh: '未知' },
  { en: 'undersize', id: 'di bawah ukuran target', th: 'ต่ำกว่าขนาดเป้าหมาย', vi: 'dưới cỡ mục tiêu', zh: '低于目标规格' },
  { en: 'oversize', id: 'di atas ukuran target', th: 'สูงกว่าขนาดเป้าหมาย', vi: 'vượt cỡ mục tiêu', zh: '高于目标规格' },
  { en: 'target', id: 'sesuai target', th: 'ตามเป้าหมาย', vi: 'đạt mục tiêu', zh: '达到目标' },
  { en: 'watch', id: 'pantau', th: 'เฝ้าระวัง', vi: 'theo dõi', zh: '关注' },
  { en: 'warning', id: 'peringatan', th: 'คำเตือน', vi: 'cảnh báo', zh: '警告' },
  { en: 'critical', id: 'kritis', th: 'วิกฤต', vi: 'nghiêm trọng', zh: '严重' },
  { en: 'good', id: 'baik', th: 'ดี', vi: 'tốt', zh: '良好' },
  { en: 'stable', id: 'stabil', th: 'คงที่', vi: 'ổn định', zh: '稳定' },
  { en: 'tight', id: 'ketat', th: 'ตึงตัว', vi: 'thấp', zh: '紧张' },
  { en: 'negative', id: 'negatif', th: 'ติดลบ', vi: 'âm', zh: '负' },
  { en: 'GOOD', id: 'BAIK', th: 'ดี', vi: 'TỐT', zh: '良好' },
  { en: 'WATCH', id: 'PANTAU', th: 'เฝ้าระวัง', vi: 'THEO DÕI', zh: '关注' },
  { en: 'WARNING', id: 'PERINGATAN', th: 'คำเตือน', vi: 'CẢNH BÁO', zh: '警告' },
  { en: 'CRITICAL', id: 'KRITIS', th: 'วิกฤต', vi: 'NGHIÊM TRỌNG', zh: '严重' },
  { en: 'EXCELLENT', id: 'SANGAT BAIK', th: 'ดีเยี่ยม', vi: 'XUẤT SẮC', zh: '优秀' },
  { en: 'disease', id: 'penyakit', th: 'โรค', vi: 'dịch bệnh', zh: '疾病' },
  { en: 'reset', id: 'atur ulang', th: 'รีเซ็ต', vi: 'đặt lại', zh: '重置' },
  { en: 'other', id: 'lainnya', th: 'อื่น ๆ', vi: 'khác', zh: '其他' },

  { en: 'Projected FCR is high for the harvest window.', id: 'Proyeksi FCR tinggi untuk periode panen.', th: 'FCR ที่คาดการณ์สูงสำหรับช่วงเก็บเกี่ยว', vi: 'FCR dự kiến cao trong thời gian thu hoạch.', zh: '收获窗口期的预计 FCR 偏高。' },
  { en: 'Future feed cost is eating a large share of projected revenue.', id: 'Biaya pakan mendatang menggunakan porsi besar dari proyeksi pendapatan.', th: 'ต้นทุนอาหารในอนาคตกินสัดส่วนสูงของรายได้ที่คาดการณ์', vi: 'Chi phí thức ăn tương lai chiếm tỷ trọng lớn trong doanh thu dự kiến.', zh: '未来饲料成本占预计收入的较大比例。' },
  { en: 'Projected shrimp size may still be below the target market size.', id: 'Proyeksi ukuran udang mungkin masih di bawah ukuran target pasar.', th: 'ขนาดกุ้งที่คาดการณ์อาจยังต่ำกว่าขนาดตลาดเป้าหมาย', vi: 'Cỡ tôm dự kiến có thể vẫn dưới cỡ thị trường mục tiêu.', zh: '预计对虾规格可能仍低于目标市场规格。' },
  { en: 'Biomass projection depends heavily on uncertain survival.', id: 'Proyeksi biomassa sangat bergantung pada tingkat kelangsungan hidup yang belum pasti.', th: 'ประมาณการชีวมวลขึ้นอยู่มากกับอัตรารอดที่ไม่แน่นอน', vi: 'Dự báo sinh khối phụ thuộc nhiều vào tỷ lệ sống chưa chắc chắn.', zh: '生物量预测高度依赖不确定的成活率。' },
  { en: 'Feed-based biomass and population assumptions may disagree.', id: 'Asumsi biomassa berbasis pakan dan populasi mungkin tidak selaras.', th: 'สมมติฐานชีวมวลจากอาหารและประชากรอาจไม่สอดคล้องกัน', vi: 'Giả định sinh khối dựa trên thức ăn và quần thể có thể không nhất quán.', zh: '基于饲料的生物量与存塘量假设可能不一致。' },
  { en: 'Farm:', id: 'Tambak:', th: 'ฟาร์ม:', vi: 'Trang trại:', zh: '养殖场：' },
  { en: 'Pond:', id: 'Kolam:', th: 'บ่อ:', vi: 'Ao:', zh: '池塘：' },
  { en: 'Company:', id: 'Perusahaan:', th: 'บริษัท:', vi: 'Công ty:', zh: '公司：' },
  { en: 'Technician:', id: 'Teknisi:', th: 'ช่างเทคนิค:', vi: 'Kỹ thuật viên:', zh: '技术员：' },
  { en: 'Report Period:', id: 'Periode Laporan:', th: 'รอบระยะเวลารายงาน:', vi: 'Kỳ báo cáo:', zh: '报告期间：' },
  { en: 'Generated:', id: 'Dibuat:', th: 'สร้างเมื่อ:', vi: 'Ngày tạo:', zh: '生成时间：' },
  { en: 'Page ', id: 'Halaman ', th: 'หน้า ', vi: 'Trang ', zh: '第 ' },
  { en: 'For ', id: 'Untuk ', th: 'สำหรับ ', vi: 'Cho ', zh: '适用于 ' },
  { en: 'Date', id: 'Tanggal', th: 'วันที่', vi: 'Ngày', zh: '日期' },
  { en: 'Area', id: 'Luas', th: 'พื้นที่', vi: 'Diện tích', zh: '面积' },
  { en: 'Stock', id: 'Stok', th: 'จำนวนปล่อย', vi: 'Số lượng thả', zh: '投苗量' },
  { en: 'Ponds', id: 'Kolam', th: 'บ่อ', vi: 'Ao', zh: '池塘' },
  { en: 'Expenses', id: 'Beban', th: 'ค่าใช้จ่าย', vi: 'Chi phí', zh: '费用' },
  { en: 'Operations', id: 'Operasional', th: 'การดำเนินงาน', vi: 'Hoạt động', zh: '经营' },
  { en: 'Investments', id: 'Investasi', th: 'การลงทุน', vi: 'Đầu tư', zh: '投资' },
  { en: 'Financing', id: 'Pendanaan', th: 'การจัดหาเงิน', vi: 'Tài chính', zh: '融资' },
  { en: 'Survival', id: 'Kelangsungan Hidup', th: 'อัตรารอด', vi: 'Tỷ lệ sống', zh: '成活率' },
  { en: 'Size', id: 'Ukuran', th: 'ขนาด', vi: 'Cỡ', zh: '规格' },
  { en: 'Prev', id: 'Sebelumnya', th: 'ก่อนหน้า', vi: 'Trước', zh: '上次' },
  { en: 'Bio', id: 'Biomassa', th: 'ชีวมวล', vi: 'Sinh khối', zh: '生物量' },
  { en: 'Mort', id: 'Mortalitas', th: 'การตาย', vi: 'Tỷ lệ chết', zh: '死亡' },
  { en: 'Dens.', id: 'Kepadatan', th: 'ความหนาแน่น', vi: 'Mật độ', zh: '密度' },
  { en: 'Review', id: 'Tinjau', th: 'ทบทวน', vi: 'Xem xét', zh: '审查' },
  { en: 'Shrimp Production Audit', id: 'Audit Produksi Udang', th: 'การตรวจสอบการผลิตกุ้ง', vi: 'Kiểm tra sản xuất tôm', zh: '对虾生产审计' },
  { en: 'GROSS PROFIT MARGIN', id: 'MARGIN LABA KOTOR', th: 'อัตรากำไรขั้นต้น', vi: 'BIÊN LỢI NHUẬN GỘP', zh: '毛利率' },
  { en: 'Lab result reviewed', id: 'Hasil laboratorium telah ditinjau', th: 'ตรวจสอบผลห้องปฏิบัติการแล้ว', vi: 'Đã xem xét kết quả phòng thí nghiệm', zh: '实验室结果已审查' },
  { en: 'No warning-level issue detected', id: 'Tidak ada masalah tingkat peringatan yang terdeteksi', th: 'ไม่พบปัญหาในระดับคำเตือน', vi: 'Không phát hiện vấn đề ở mức cảnh báo', zh: '未发现警告级别问题' },
  { en: 'Continue routine monitoring and compare against the next lab result.', id: 'Lanjutkan pemantauan rutin dan bandingkan dengan hasil laboratorium berikutnya.', th: 'ติดตามตามปกติและเปรียบเทียบกับผลห้องปฏิบัติการครั้งถัดไป', vi: 'Tiếp tục theo dõi định kỳ và so sánh với kết quả phòng thí nghiệm tiếp theo.', zh: '继续常规监测，并与下一次实验室结果比较。' },
  { en: '. Gross profit was', id: '. Laba kotor adalah', th: '. กำไรขั้นต้นเท่ากับ', vi: '. Lợi nhuận gộp là', zh: '。毛利润为' },
  { en: 'and net income was', id: 'dan laba bersih adalah', th: 'และกำไรสุทธิเท่ากับ', vi: 'và lợi nhuận ròng là', zh: '，净利润为' },
  { en: 'and net loss was', id: 'dan rugi bersih adalah', th: 'และขาดทุนสุทธิเท่ากับ', vi: 'và lỗ ròng là', zh: '，净亏损为' },
  { en: '% and net margin was', id: '% dan margin bersih adalah', th: '% และอัตรากำไรสุทธิเท่ากับ', vi: '% và biên lợi nhuận ròng là', zh: '%，净利率为' },
  { en: 'COGS represented', id: 'HPP mewakili', th: 'COGS คิดเป็น', vi: 'COGS chiếm', zh: 'COGS 占' },
  { en: '% of revenue, indicating pressure on gross margin and production efficiency.', id: '% dari pendapatan, yang menunjukkan tekanan pada margin kotor dan efisiensi produksi.', th: '% ของรายได้ ซึ่งแสดงถึงแรงกดดันต่ออัตรากำไรขั้นต้นและประสิทธิภาพการผลิต', vi: '% doanh thu, cho thấy áp lực lên biên lợi nhuận gộp và hiệu quả sản xuất.', zh: '% 的收入，表明毛利率和生产效率承压。' },
  { en: 'Operating expenses represented', id: 'Beban operasional mewakili', th: 'ค่าใช้จ่ายดำเนินงานคิดเป็น', vi: 'Chi phí hoạt động chiếm', zh: '运营费用占' },
  { en: '% of revenue. Overhead should be reviewed if this pattern continues.', id: '% dari pendapatan. Tinjau biaya tidak langsung jika pola ini berlanjut.', th: '% ของรายได้ ควรทบทวนค่าใช้จ่ายส่วนกลางหากรูปแบบนี้ดำเนินต่อไป', vi: '% doanh thu. Cần xem xét chi phí quản lý nếu xu hướng này tiếp diễn.', zh: '% 的收入。如果这种情况持续，应审查管理费用。' },
  { en: ' was the largest operating expense category and should be reviewed for budget control.', id: ' merupakan kategori beban operasional terbesar dan perlu ditinjau untuk pengendalian anggaran.', th: ' เป็นหมวดค่าใช้จ่ายดำเนินงานที่ใหญ่ที่สุดและควรทบทวนเพื่อควบคุมงบประมาณ', vi: ' là danh mục chi phí hoạt động lớn nhất và cần được xem xét để kiểm soát ngân sách.', zh: ' 是最大的运营费用类别，应进行预算控制审查。' },
  { en: 'Non-operating or other expenses totaled', id: 'Total beban nonoperasional atau lainnya adalah', th: 'ค่าใช้จ่ายนอกการดำเนินงานหรืออื่น ๆ รวมเท่ากับ', vi: 'Tổng chi phí ngoài hoạt động hoặc chi phí khác là', zh: '非营业或其他费用合计为' },
  { en: 'and reduced the final net result.', id: 'dan mengurangi hasil bersih akhir.', th: 'และลดผลลัพธ์สุทธิสุดท้าย', vi: 'và làm giảm kết quả ròng cuối cùng.', zh: '，并降低了最终净结果。' },

  { en: 'operating activities', id: 'aktivitas operasional', th: 'กิจกรรมดำเนินงาน', vi: 'hoạt động kinh doanh', zh: '经营活动' },
  { en: 'investing activities', id: 'aktivitas investasi', th: 'กิจกรรมลงทุน', vi: 'hoạt động đầu tư', zh: '投资活动' },
  { en: 'financing activities', id: 'aktivitas pendanaan', th: 'กิจกรรมจัดหาเงิน', vi: 'hoạt động tài chính', zh: '融资活动' },
  { en: ', and net cash movement was', id: ', dan pergerakan kas bersih adalah', th: ' และการเปลี่ยนแปลงเงินสดสุทธิเท่ากับ', vi: ', và biến động tiền mặt ròng là', zh: '，现金净变动为' },
  { en: 'Liquidity status is negative', id: 'Status likuiditas negatif', th: 'สถานะสภาพคล่องติดลบ', vi: 'Tình trạng thanh khoản âm', zh: '流动性状态为负' },
  { en: 'Liquidity status is tight', id: 'Status likuiditas ketat', th: 'สถานะสภาพคล่องตึงตัว', vi: 'Tình trạng thanh khoản thấp', zh: '流动性状态紧张' },
  { en: 'Liquidity status is stable', id: 'Status likuiditas stabil', th: 'สถานะสภาพคล่องคงที่', vi: 'Tình trạng thanh khoản ổn định', zh: '流动性状态稳定' },
  { en: ', based on the ending cash position and recorded outflows for the period.', id: ', berdasarkan posisi kas akhir dan arus keluar yang tercatat pada periode tersebut.', th: ' โดยอ้างอิงสถานะเงินสดปลายงวดและกระแสเงินสดออกที่บันทึกในงวด', vi: ', dựa trên vị thế tiền mặt cuối kỳ và dòng tiền ra đã ghi nhận trong kỳ.', zh: '，依据期末现金状况和本期间已记录的现金流出。' },
  { en: ', which increased cash by', id: ', yang meningkatkan kas sebesar', th: ' ซึ่งเพิ่มเงินสดจำนวน', vi: ', làm tăng tiền mặt thêm', zh: '，使现金增加' },
  { en: ', which reduced cash by', id: ', yang mengurangi kas sebesar', th: ' ซึ่งลดเงินสดจำนวน', vi: ', làm giảm tiền mặt', zh: '，使现金减少' },
  { en: 'Owner funding or loan proceeds represented', id: 'Pendanaan pemilik atau penerimaan pinjaman mewakili', th: 'เงินทุนเจ้าของหรือเงินกู้คิดเป็น', vi: 'Vốn chủ sở hữu hoặc khoản vay chiếm', zh: '业主资金或贷款所得占' },
  { en: '% of recorded inflows. The farm may be dependent on external funding rather than operating receipts.', id: '% dari arus masuk yang tercatat. Tambak mungkin bergantung pada pendanaan eksternal, bukan penerimaan operasional.', th: '% ของกระแสเงินสดเข้าที่บันทึก ฟาร์มอาจพึ่งพาเงินทุนภายนอกมากกว่ารายรับจากการดำเนินงาน', vi: '% dòng tiền vào đã ghi nhận. Trang trại có thể phụ thuộc vào nguồn vốn bên ngoài thay vì khoản thu hoạt động.', zh: '% 的已记录流入。养殖场可能依赖外部资金而非经营收入。' },

  { en: 'Total COGS for the selected period is', id: 'Total HPP untuk periode yang dipilih adalah', th: 'COGS รวมสำหรับงวดที่เลือกเท่ากับ', vi: 'Tổng COGS trong kỳ đã chọn là', zh: '所选期间 COGS 合计为' },
  { en: 'against revenue of', id: 'dibandingkan dengan pendapatan sebesar', th: 'เทียบกับรายได้', vi: 'so với doanh thu', zh: '，对应收入' },
  { en: 'Gross profit is', id: 'Laba kotor adalah', th: 'กำไรขั้นต้นเท่ากับ', vi: 'Lợi nhuận gộp là', zh: '毛利润为' },
  { en: ', with a gross margin of', id: ', dengan margin kotor sebesar', th: ' โดยมีอัตรากำไรขั้นต้น', vi: ', với biên lợi nhuận gộp', zh: '，毛利率为' },
  { en: 'The report shows a gross loss of', id: 'Laporan menunjukkan rugi kotor sebesar', th: 'รายงานแสดงขาดทุนขั้นต้น', vi: 'Báo cáo cho thấy lỗ gộp', zh: '报告显示毛亏损' },
  { en: ', so direct production costs exceeded recorded revenue.', id: ', sehingga biaya produksi langsung melampaui pendapatan yang tercatat.', th: ' ทำให้ต้นทุนการผลิตทางตรงสูงกว่ารายได้ที่บันทึก', vi: ', do đó chi phí sản xuất trực tiếp vượt doanh thu đã ghi nhận.', zh: '，因此直接生产成本超过已记录收入。' },
  { en: ' is the largest direct cost category, representing', id: ' merupakan kategori biaya langsung terbesar, yang mewakili', th: ' เป็นหมวดต้นทุนทางตรงที่ใหญ่ที่สุด คิดเป็น', vi: ' là danh mục chi phí trực tiếp lớn nhất, chiếm', zh: ' 是最大的直接成本类别，占' },
  { en: '% of recorded COGS.', id: '% dari HPP yang tercatat.', th: '% ของ COGS ที่บันทึก', vi: '% COGS đã ghi nhận.', zh: '% 的已记录 COGS。' },
  { en: ' is highly concentrated within COGS. This creates cost-driver risk if the category increases or is not matched by harvest output.', id: ' sangat terkonsentrasi dalam HPP. Hal ini menimbulkan risiko penggerak biaya jika kategori tersebut meningkat atau tidak sebanding dengan hasil panen.', th: ' กระจุกตัวสูงใน COGS ทำให้เกิดความเสี่ยงด้านต้นทุนหากหมวดนี้เพิ่มขึ้นหรือไม่สอดคล้องกับผลผลิตเก็บเกี่ยว', vi: ' tập trung cao trong COGS. Điều này tạo rủi ro chi phí nếu danh mục tăng hoặc không tương xứng với sản lượng thu hoạch.', zh: ' 在 COGS 中高度集中。如果该类别增加或与收获产出不匹配，将产生成本驱动风险。' },
  { en: 'Closing inventory offsets', id: 'Persediaan akhir mengimbangi', th: 'สินค้าคงเหลือปลายงวดหักล้าง', vi: 'Tồn kho cuối kỳ bù trừ', zh: '期末库存抵减' },
  { en: '% of goods available for sale, reducing the cost assigned to this period.', id: '% dari barang yang tersedia untuk dijual, sehingga mengurangi biaya yang dibebankan pada periode ini.', th: '% ของสินค้าที่พร้อมขาย ทำให้ต้นทุนที่จัดสรรให้รอบนี้ลดลง', vi: '% hàng có sẵn để bán, làm giảm chi phí phân bổ cho kỳ này.', zh: '% 的可供销售商品，从而减少分配到本期间的成本。' },
  { en: ' because it is the largest COGS driver and has the strongest effect on gross margin.', id: ' karena merupakan penggerak HPP terbesar dan paling memengaruhi margin kotor.', th: ' เนื่องจากเป็นปัจจัยขับเคลื่อน COGS ที่ใหญ่ที่สุดและส่งผลต่ออัตรากำไรขั้นต้นมากที่สุด', vi: ' vì đây là yếu tố COGS lớn nhất và ảnh hưởng mạnh nhất đến biên lợi nhuận gộp.', zh: '，因为它是最大的 COGS 驱动因素，对毛利率影响最强。' },
  { en: 'Add cost categories for feed, additives, seed, labour, and materials so the next COGS report can identify the main production cost driver.', id: 'Tambahkan kategori biaya pakan, aditif, benur, tenaga kerja, dan bahan agar laporan HPP berikutnya dapat mengidentifikasi penggerak biaya produksi utama.', th: 'เพิ่มหมวดต้นทุนอาหาร สารเติมแต่ง ลูกกุ้ง แรงงาน และวัสดุ เพื่อให้รายงาน COGS ครั้งถัดไประบุปัจจัยต้นทุนการผลิตหลักได้', vi: 'Thêm danh mục chi phí thức ăn, phụ gia, giống, lao động và vật liệu để báo cáo COGS tiếp theo xác định được yếu tố chi phí sản xuất chính.', zh: '添加饲料、添加剂、虾苗、人工和材料成本类别，以便下一份 COGS 报告识别主要生产成本驱动因素。' },
  { en: 'Compare COGS against harvest biomass and FCR before increasing stocking density or feed purchases for the next cycle.', id: 'Bandingkan HPP dengan biomassa panen dan FCR sebelum meningkatkan kepadatan tebar atau pembelian pakan untuk siklus berikutnya.', th: 'เปรียบเทียบ COGS กับชีวมวลเก็บเกี่ยวและ FCR ก่อนเพิ่มความหนาแน่นการปล่อยหรือซื้ออาหารสำหรับรอบถัดไป', vi: 'So sánh COGS với sinh khối thu hoạch và FCR trước khi tăng mật độ thả hoặc mua thức ăn cho vụ tiếp theo.', zh: '在下一个周期提高投苗密度或采购饲料前，应将 COGS 与收获生物量和 FCR 进行比较。' },
  { en: 'Continue reconciling direct costs against harvest volume so cost per kg can be evaluated once harvest data is complete.', id: 'Lanjutkan rekonsiliasi biaya langsung terhadap volume panen agar biaya per kg dapat dievaluasi setelah data panen lengkap.', th: 'กระทบยอดต้นทุนทางตรงกับปริมาณเก็บเกี่ยวต่อไป เพื่อประเมินต้นทุนต่อกก.เมื่อข้อมูลเก็บเกี่ยวครบ', vi: 'Tiếp tục đối chiếu chi phí trực tiếp với sản lượng thu hoạch để đánh giá chi phí mỗi kg khi dữ liệu thu hoạch đầy đủ.', zh: '继续将直接成本与收获量核对，以便在收获数据完整后评估每公斤成本。' },
  { en: 'Revenue was not available, so gross profit and margin are limited as performance indicators.', id: 'Pendapatan tidak tersedia, sehingga laba dan margin kotor memiliki keterbatasan sebagai indikator kinerja.', th: 'ไม่มีข้อมูลรายได้ จึงทำให้กำไรขั้นต้นและอัตรากำไรมีข้อจำกัดในการใช้เป็นตัวชี้วัดประสิทธิภาพ', vi: 'Không có doanh thu nên lợi nhuận gộp và biên lợi nhuận bị hạn chế khi dùng làm chỉ số hiệu quả.', zh: '收入数据不可用，因此毛利润和毛利率作为表现指标存在局限。' },
  { en: 'Detailed direct-cost categories were not available, limiting cost-driver analysis.', id: 'Kategori biaya langsung terperinci tidak tersedia, sehingga analisis penggerak biaya terbatas.', th: 'ไม่มีรายละเอียดหมวดต้นทุนทางตรง ทำให้การวิเคราะห์ปัจจัยต้นทุนมีข้อจำกัด', vi: 'Không có danh mục chi phí trực tiếp chi tiết, làm hạn chế phân tích yếu tố chi phí.', zh: '没有详细的直接成本类别，限制了成本驱动分析。' },
  { en: 'Category percentages are based on the available COGS breakdown and may exclude uncategorised costs.', id: 'Persentase kategori didasarkan pada rincian HPP yang tersedia dan mungkin tidak mencakup biaya yang belum dikategorikan.', th: 'เปอร์เซ็นต์หมวดหมู่อ้างอิงรายละเอียด COGS ที่มีและอาจไม่รวมต้นทุนที่ยังไม่ได้จัดหมวด', vi: 'Tỷ lệ danh mục dựa trên chi tiết COGS hiện có và có thể không bao gồm chi phí chưa phân loại.', zh: '类别百分比基于现有 COGS 明细，可能不包括未分类成本。' },

  { en: 'The report covers', id: 'Laporan mencakup', th: 'รายงานครอบคลุม', vi: 'Báo cáo bao gồm', zh: '本报告涵盖' },
  { en: ' sampled ponds', id: ' kolam yang disampling', th: ' บ่อที่สุ่มตัวอย่าง', vi: ' ao đã lấy mẫu', zh: ' 个已采样池塘' },
  { en: ' sampled pond', id: ' kolam yang disampling', th: ' บ่อที่สุ่มตัวอย่าง', vi: ' ao đã lấy mẫu', zh: ' 个已采样池塘' },
  { en: ' out of ', id: ' dari ', th: ' จาก ', vi: ' trong số ', zh: '，共 ' },
  { en: ' selected ponds', id: ' kolam yang dipilih', th: ' บ่อที่เลือก', vi: ' ao đã chọn', zh: ' 个所选池塘' },
  { en: ' selected pond', id: ' kolam yang dipilih', th: ' บ่อที่เลือก', vi: ' ao đã chọn', zh: ' 个所选池塘' },
  { en: '. Average ABW/MBW is', id: '. Rata-rata ABW/MBW adalah', th: '. ABW/MBW เฉลี่ยเท่ากับ', vi: '. ABW/MBW trung bình là', zh: '。平均 ABW/MBW 为' },
  { en: 'g, average ADG is', id: 'g, rata-rata ADG adalah', th: 'g, ADG เฉลี่ยเท่ากับ', vi: 'g, ADG trung bình là', zh: 'g，平均 ADG 为' },
  { en: 'g/day, average survival is', id: 'g/hari, rata-rata kelangsungan hidup adalah', th: 'g/วัน, อัตรารอดเฉลี่ยเท่ากับ', vi: 'g/ngày, tỷ lệ sống trung bình là', zh: 'g/天，平均成活率为' },
  { en: '%, and average FCR is', id: '%, dan rata-rata FCR adalah', th: '%, และ FCR เฉลี่ยเท่ากับ', vi: '%, và FCR trung bình là', zh: '%，平均 FCR 为' },
  { en: ' onboarded mid-cycle. Pre-onboarding feed, survival, and biomass values are user-provided estimates and should be treated as baseline assumptions.', id: ' mulai menggunakan Shrimply di tengah siklus. Nilai pakan, kelangsungan hidup, dan biomassa sebelum onboarding merupakan estimasi pengguna dan harus dianggap sebagai asumsi dasar.', th: ' เริ่มใช้ Shrimply ระหว่างรอบการเลี้ยง ค่าอาหาร อัตรารอด และชีวมวลก่อนเริ่มใช้งานเป็นค่าประมาณจากผู้ใช้และควรถือเป็นสมมติฐานฐาน', vi: ' bắt đầu dùng Shrimply giữa vụ. Giá trị thức ăn, tỷ lệ sống và sinh khối trước khi bắt đầu là ước tính do người dùng cung cấp và nên được xem là giả định cơ sở.', zh: ' 在周期中途开始使用 Shrimply。开始前的饲料、成活率和生物量数值为用户估算，应视为基线假设。' },
  { en: ' pond was onboarded mid-cycle. Pre-onboarding feed, survival, and biomass values are user-provided estimates and should be treated as baseline assumptions.', id: ' kolam mulai menggunakan Shrimply di tengah siklus. Nilai pakan, kelangsungan hidup, dan biomassa sebelum onboarding merupakan estimasi pengguna dan harus dianggap sebagai asumsi dasar.', th: ' บ่อเริ่มใช้ Shrimply ระหว่างรอบการเลี้ยง ค่าอาหาร อัตรารอด และชีวมวลก่อนเริ่มใช้งานเป็นค่าประมาณจากผู้ใช้และควรถือเป็นสมมติฐานฐาน', vi: ' ao bắt đầu dùng Shrimply giữa vụ. Giá trị thức ăn, tỷ lệ sống và sinh khối trước khi bắt đầu là ước tính do người dùng cung cấp và nên được xem là giả định cơ sở.', zh: ' 个池塘在周期中途开始使用 Shrimply。开始前的饲料、成活率和生物量数值为用户估算，应视为基线假设。' },
  { en: ' ponds were onboarded mid-cycle. Pre-onboarding feed, survival, and biomass values are user-provided estimates and should be treated as baseline assumptions.', id: ' kolam mulai menggunakan Shrimply di tengah siklus. Nilai pakan, kelangsungan hidup, dan biomassa sebelum onboarding merupakan estimasi pengguna dan harus dianggap sebagai asumsi dasar.', th: ' บ่อเริ่มใช้ Shrimply ระหว่างรอบการเลี้ยง ค่าอาหาร อัตรารอด และชีวมวลก่อนเริ่มใช้งานเป็นค่าประมาณจากผู้ใช้และควรถือเป็นสมมติฐานฐาน', vi: ' ao bắt đầu dùng Shrimply giữa vụ. Giá trị thức ăn, tỷ lệ sống và sinh khối trước khi bắt đầu là ước tính do người dùng cung cấp và nên được xem là giả định cơ sở.', zh: ' 个池塘在周期中途开始使用 Shrimply。开始前的饲料、成活率和生物量数值为用户估算，应视为基线假设。' },
  { en: ' was onboarded mid-cycle. Pre-onboarding values are estimates, not exact historical logs.', id: ' mulai menggunakan Shrimply di tengah siklus. Nilai sebelum onboarding merupakan estimasi, bukan catatan historis yang pasti.', th: ' เริ่มใช้ Shrimply ระหว่างรอบการเลี้ยง ค่าก่อนเริ่มใช้งานเป็นค่าประมาณ ไม่ใช่บันทึกย้อนหลังที่แน่นอน', vi: ' bắt đầu dùng Shrimply giữa vụ. Các giá trị trước khi bắt đầu là ước tính, không phải nhật ký lịch sử chính xác.', zh: ' 在周期中途开始使用 Shrimply。开始前的数据为估算值，并非精确的历史记录。' },
  { en: ' were onboarded mid-cycle. Pre-onboarding values are estimates, not exact historical logs.', id: ' mulai menggunakan Shrimply di tengah siklus. Nilai sebelum onboarding merupakan estimasi, bukan catatan historis yang pasti.', th: ' เริ่มใช้ Shrimply ระหว่างรอบการเลี้ยง ค่าก่อนเริ่มใช้งานเป็นค่าประมาณ ไม่ใช่บันทึกย้อนหลังที่แน่นอน', vi: ' bắt đầu dùng Shrimply giữa vụ. Các giá trị trước khi bắt đầu là ước tính, không phải nhật ký lịch sử chính xác.', zh: ' 在周期中途开始使用 Shrimply。开始前的数据为估算值，并非精确的历史记录。' },
  { en: ' is currently the strongest pond based on latest ADG, survival rate, and FCR balance.', id: ' saat ini merupakan kolam terkuat berdasarkan keseimbangan ADG, tingkat kelangsungan hidup, dan FCR terbaru.', th: ' เป็นบ่อที่มีผลดีที่สุดในปัจจุบันจากสมดุล ADG อัตรารอด และ FCR ล่าสุด', vi: ' hiện là ao tốt nhất dựa trên cân bằng ADG, tỷ lệ sống và FCR mới nhất.', zh: ' 根据最新 ADG、成活率和 FCR 平衡，目前是表现最强的池塘。' },
  { en: ' should be reviewed first because its latest growth, survival, or FCR indicators are weaker than the rest of the selected ponds.', id: ' perlu ditinjau terlebih dahulu karena indikator pertumbuhan, kelangsungan hidup, atau FCR terbarunya lebih lemah dibandingkan kolam terpilih lainnya.', th: ' ควรได้รับการทบทวนก่อน เนื่องจากตัวชี้วัดการเติบโต อัตรารอด หรือ FCR ล่าสุดอ่อนกว่าบ่ออื่นที่เลือก', vi: ' cần được xem xét trước vì chỉ số tăng trưởng, tỷ lệ sống hoặc FCR mới nhất yếu hơn các ao đã chọn còn lại.', zh: ' 应优先审查，因为其最新生长、成活率或 FCR 指标弱于其他所选池塘。' },
  { en: ' show high-risk indicators such as low survival, elevated FCR, flat growth, or high mortality.', id: ' menunjukkan indikator risiko tinggi seperti kelangsungan hidup rendah, FCR tinggi, pertumbuhan datar, atau mortalitas tinggi.', th: ' แสดงตัวชี้วัดความเสี่ยงสูง เช่น อัตรารอดต่ำ FCR สูง การเติบโตคงที่ หรือการตายสูง', vi: ' có chỉ báo rủi ro cao như tỷ lệ sống thấp, FCR cao, tăng trưởng chậm hoặc tỷ lệ chết cao.', zh: ' 显示高风险指标，例如成活率低、FCR 偏高、生长停滞或死亡率高。' },
  { en: ' should remain under watch because one or more indicators are outside the preferred range.', id: ' harus tetap dipantau karena satu atau lebih indikator berada di luar rentang yang diinginkan.', th: ' ควรเฝ้าระวังต่อไป เนื่องจากมีตัวชี้วัดอย่างน้อยหนึ่งรายการอยู่นอกช่วงที่ต้องการ', vi: ' cần tiếp tục theo dõi vì một hoặc nhiều chỉ số nằm ngoài phạm vi mong muốn.', zh: ' 应继续关注，因为一个或多个指标超出理想范围。' },
  { en: ' pond should remain under watch because one or more indicators are outside the preferred range.', id: ' kolam harus tetap dipantau karena satu atau lebih indikator berada di luar rentang yang diinginkan.', th: ' บ่อควรเฝ้าระวังต่อไป เนื่องจากมีตัวชี้วัดอย่างน้อยหนึ่งรายการอยู่นอกช่วงที่ต้องการ', vi: ' ao cần tiếp tục theo dõi vì một hoặc nhiều chỉ số nằm ngoài phạm vi mong muốn.', zh: ' 个池塘应继续关注，因为一个或多个指标超出理想范围。' },
  { en: ' ponds should remain under watch because one or more indicators are outside the preferred range.', id: ' kolam harus tetap dipantau karena satu atau lebih indikator berada di luar rentang yang diinginkan.', th: ' บ่อควรเฝ้าระวังต่อไป เนื่องจากมีตัวชี้วัดอย่างน้อยหนึ่งรายการอยู่นอกช่วงที่ต้องการ', vi: ' ao cần tiếp tục theo dõi vì một hoặc nhiều chỉ số nằm ngoài phạm vi mong muốn.', zh: ' 个池塘应继续关注，因为一个或多个指标超出理想范围。' },
  { en: ' ponds show high-risk indicators', id: ' kolam menunjukkan indikator risiko tinggi', th: ' บ่อแสดงตัวชี้วัดความเสี่ยงสูง', vi: ' ao có chỉ báo rủi ro cao', zh: ' 个池塘显示高风险指标' },
  { en: ' pond shows high-risk indicators', id: ' kolam menunjukkan indikator risiko tinggi', th: ' บ่อแสดงตัวชี้วัดความเสี่ยงสูง', vi: ' ao có chỉ báo rủi ro cao', zh: ' 个池塘显示高风险指标' },
  { en: ' ponds show high-risk indicators such as low survival, elevated FCR, flat growth, or high mortality.', id: ' kolam menunjukkan indikator risiko tinggi seperti kelangsungan hidup rendah, FCR tinggi, pertumbuhan datar, atau mortalitas tinggi.', th: ' บ่อแสดงตัวชี้วัดความเสี่ยงสูง เช่น อัตรารอดต่ำ FCR สูง การเติบโตคงที่ หรือการตายสูง', vi: ' ao có chỉ báo rủi ro cao như tỷ lệ sống thấp, FCR cao, tăng trưởng chậm hoặc tỷ lệ chết cao.', zh: ' 个池塘显示高风险指标，例如成活率低、FCR 偏高、生长停滞或死亡率高。' },
  { en: ' pond shows high-risk indicators such as low survival, elevated FCR, flat growth, or high mortality.', id: ' kolam menunjukkan indikator risiko tinggi seperti kelangsungan hidup rendah, FCR tinggi, pertumbuhan datar, atau mortalitas tinggi.', th: ' บ่อแสดงตัวชี้วัดความเสี่ยงสูง เช่น อัตรารอดต่ำ FCR สูง การเติบโตคงที่ หรือการตายสูง', vi: ' ao có chỉ báo rủi ro cao như tỷ lệ sống thấp, FCR cao, tăng trưởng chậm hoặc tỷ lệ chết cao.', zh: ' 个池塘显示高风险指标，例如成活率低、FCR 偏高、生长停滞或死亡率高。' },
  { en: ' ponds across ', id: ' kolam dengan luas ', th: ' บ่อในพื้นที่ ', vi: ' ao trên diện tích ', zh: ' 个池塘，总面积 ' },
  { en: ' pond across ', id: ' kolam dengan luas ', th: ' บ่อในพื้นที่ ', vi: ' ao trên diện tích ', zh: ' 个池塘，总面积 ' },
  { en: 'Average FCR is unusually low for shrimp production. This usually means feed history is incomplete or the report is only seeing partial feed records, so FCR should not be used as a final efficiency result yet.', id: 'Rata-rata FCR sangat rendah untuk produksi udang. Ini biasanya berarti riwayat pakan belum lengkap atau laporan hanya membaca sebagian catatan pakan, sehingga FCR belum dapat digunakan sebagai hasil efisiensi final.', th: 'FCR เฉลี่ยต่ำผิดปกติสำหรับการผลิตกุ้ง ซึ่งมักหมายถึงประวัติอาหารไม่ครบหรือรายงานเห็นเพียงบางส่วน จึงยังไม่ควรใช้ FCR เป็นผลประสิทธิภาพสุดท้าย', vi: 'FCR trung bình thấp bất thường đối với nuôi tôm. Điều này thường cho thấy lịch sử thức ăn chưa đầy đủ hoặc báo cáo chỉ thấy một phần hồ sơ, nên chưa thể dùng FCR làm kết quả hiệu quả cuối cùng.', zh: '对虾生产的平均 FCR 异常偏低。这通常意味着饲料历史不完整或报告只读取了部分饲料记录，因此暂不能将 FCR 作为最终效率结果。' },
  { en: 'No Plankton Overwatch result was available for the selected ponds. Missing observations were not treated as stable.', id: 'Tidak tersedia hasil Pengawasan Plankton untuk kolam yang dipilih. Pengamatan yang tidak tersedia tidak dianggap stabil.', th: 'ไม่มีผลการเฝ้าระวังแพลงก์ตอนสำหรับบ่อที่เลือก ข้อมูลสังเกตการณ์ที่ขาดหายไม่ได้ถือว่ามีเสถียรภาพ', vi: 'Không có kết quả Giám sát Sinh vật phù du cho các ao đã chọn. Các quan sát còn thiếu không được xem là ổn định.', zh: '所选池塘没有浮游生物监测结果。缺失的观测不会被视为稳定。' },

  { en: 'No revenue was recorded for this period, so profitability cannot be fully assessed from the available data.', id: 'Tidak ada pendapatan yang tercatat pada periode ini, sehingga profitabilitas belum dapat dinilai sepenuhnya dari data yang tersedia.', th: 'ไม่มีการบันทึกรายได้ในงวดนี้ จึงยังไม่สามารถประเมินความสามารถในการทำกำไรได้ครบถ้วนจากข้อมูลที่มี', vi: 'Không ghi nhận doanh thu trong kỳ này nên chưa thể đánh giá đầy đủ khả năng sinh lời từ dữ liệu hiện có.', zh: '本期间未记录收入，因此无法根据现有数据充分评估盈利能力。' },
  { en: 'Gross and net margins were not calculated because revenue was not available for the selected period.', id: 'Margin kotor dan bersih tidak dihitung karena data pendapatan tidak tersedia untuk periode yang dipilih.', th: 'ไม่ได้คำนวณอัตรากำไรขั้นต้นและสุทธิ เนื่องจากไม่มีข้อมูลรายได้ในงวดที่เลือก', vi: 'Không tính biên lợi nhuận gộp và ròng vì không có doanh thu trong kỳ đã chọn.', zh: '由于所选期间没有收入数据，因此未计算毛利率和净利率。' },
  { en: 'No immediate net loss risk was detected from the selected period.', id: 'Tidak terdeteksi risiko rugi bersih langsung pada periode yang dipilih.', th: 'ไม่พบความเสี่ยงขาดทุนสุทธิทันทีจากงวดที่เลือก', vi: 'Không phát hiện rủi ro lỗ ròng tức thời trong kỳ đã chọn.', zh: '所选期间未发现直接净亏损风险。' },
  { en: 'COGS did not exceed the high-risk threshold based on the selected period revenue.', id: 'HPP tidak melampaui ambang risiko tinggi berdasarkan pendapatan periode yang dipilih.', th: 'COGS ไม่เกินเกณฑ์ความเสี่ยงสูงเมื่อเทียบกับรายได้ของงวดที่เลือก', vi: 'COGS không vượt ngưỡng rủi ro cao so với doanh thu kỳ đã chọn.', zh: '根据所选期间收入，COGS 未超过高风险阈值。' },
  { en: 'Operating expenses did not exceed the high-risk threshold based on selected period revenue.', id: 'Beban operasional tidak melampaui ambang risiko tinggi berdasarkan pendapatan periode yang dipilih.', th: 'ค่าใช้จ่ายดำเนินงานไม่เกินเกณฑ์ความเสี่ยงสูงเมื่อเทียบกับรายได้ของงวดที่เลือก', vi: 'Chi phí hoạt động không vượt ngưỡng rủi ro cao so với doanh thu kỳ đã chọn.', zh: '根据所选期间收入，运营费用未超过高风险阈值。' },
  { en: 'The company recorded a net loss for the selected period. Direct costs and operating expenses should be reviewed before the next cycle decision.', id: 'Perusahaan mencatat rugi bersih pada periode yang dipilih. Tinjau biaya langsung dan beban operasional sebelum keputusan siklus berikutnya.', th: 'บริษัทบันทึกขาดทุนสุทธิในงวดที่เลือก ควรทบทวนต้นทุนทางตรงและค่าใช้จ่ายดำเนินงานก่อนตัดสินใจรอบการเลี้ยงถัดไป', vi: 'Công ty ghi nhận lỗ ròng trong kỳ đã chọn. Cần xem xét chi phí trực tiếp và chi phí hoạt động trước quyết định vụ nuôi tiếp theo.', zh: '公司在所选期间录得净亏损。应在下一个养殖周期决策前审查直接成本和运营费用。' },
  { en: 'The company was profitable, but net margin is narrow. Small increases in feed, labor, or overhead costs could materially reduce profitability.', id: 'Perusahaan memperoleh laba, tetapi margin bersih tipis. Kenaikan kecil pada biaya pakan, tenaga kerja, atau biaya tidak langsung dapat menurunkan profitabilitas secara signifikan.', th: 'บริษัทมีกำไร แต่อัตรากำไรสุทธิค่อนข้างต่ำ ต้นทุนอาหาร แรงงาน หรือค่าใช้จ่ายส่วนกลางที่เพิ่มขึ้นเพียงเล็กน้อยอาจลดกำไรอย่างมีนัยสำคัญ', vi: 'Công ty có lãi nhưng biên lợi nhuận ròng thấp. Chi phí thức ăn, lao động hoặc quản lý tăng nhẹ cũng có thể làm giảm đáng kể lợi nhuận.', zh: '公司实现盈利，但净利率较低。饲料、人工或管理费用的小幅增加都可能显著降低盈利能力。' },
  { en: 'Gross margin is positive for this period, but it should still be compared with biomass, harvest yield, and feed conversion before judging cycle efficiency.', id: 'Margin kotor periode ini positif, tetapi tetap perlu dibandingkan dengan biomassa, hasil panen, dan konversi pakan sebelum menilai efisiensi siklus.', th: 'อัตรากำไรขั้นต้นของงวดนี้เป็นบวก แต่ยังควรเปรียบเทียบกับมวลชีวภาพ ผลผลิตจากการจับ และการเปลี่ยนอาหารเป็นเนื้อก่อนประเมินประสิทธิภาพรอบการเลี้ยง', vi: 'Biên lợi nhuận gộp trong kỳ này là dương, nhưng vẫn cần so sánh với sinh khối, sản lượng thu hoạch và hiệu quả chuyển đổi thức ăn trước khi đánh giá hiệu quả vụ nuôi.', zh: '本期间毛利率为正，但在判断养殖周期效率前，仍应结合生物量、收获产量和饲料转化率进行比较。' },
  { en: 'For mid-cycle onboarded ponds, compare future Shrimply-tracked sampling records against the baseline before making strong conclusions about historical growth trends.', id: 'Untuk kolam yang mulai dicatat di tengah siklus, bandingkan catatan sampling berikutnya yang dilacak Shrimply dengan data dasar sebelum menarik kesimpulan kuat tentang tren pertumbuhan historis.', th: 'สำหรับบ่อที่เริ่มบันทึกข้อมูลระหว่างรอบการเลี้ยง ให้เปรียบเทียบบันทึกการสุ่มตัวอย่างครั้งถัดไปที่ติดตามโดย Shrimply กับค่าฐานก่อนสรุปแนวโน้มการเติบโตในอดีตอย่างชัดเจน', vi: 'Đối với ao được đưa vào theo dõi giữa vụ, hãy so sánh các bản ghi lấy mẫu sau này do Shrimply theo dõi với đường cơ sở trước khi đưa ra kết luận chắc chắn về xu hướng tăng trưởng trong quá khứ.', zh: '对于在养殖周期中途纳入系统的池塘，应先将后续由 Shrimply 跟踪的采样记录与基线比较，再对历史生长趋势作出明确结论。' },
  { en: 'No mid-cycle baseline assumptions were detected in the selected ponds.', id: 'Tidak ditemukan asumsi data dasar tengah siklus pada kolam yang dipilih.', th: 'ไม่พบการใช้สมมติฐานค่าฐานระหว่างรอบการเลี้ยงในบ่อที่เลือก', vi: 'Không phát hiện giả định đường cơ sở giữa vụ trong các ao đã chọn.', zh: '所选池塘中未发现养殖周期中途基线假设。' },
  { en: 'Operating income was negative before non-operating expenses, indicating the core operation did not cover its operating cost base.', id: 'Laba operasional sudah negatif sebelum beban nonoperasional, yang menunjukkan operasi inti belum menutup biaya operasionalnya.', th: 'รายได้จากการดำเนินงานติดลบก่อนค่าใช้จ่ายนอกการดำเนินงาน แสดงว่าธุรกิจหลักยังไม่ครอบคลุมฐานต้นทุนดำเนินงาน', vi: 'Lợi nhuận hoạt động âm trước chi phí ngoài hoạt động, cho thấy hoạt động cốt lõi chưa bù đắp được chi phí vận hành.', zh: '扣除非营业费用前营业利润已为负，表明核心业务未能覆盖运营成本。' },
  { en: 'Total revenue for the period was', id: 'Total pendapatan periode ini adalah', th: 'รายได้รวมของงวดเท่ากับ', vi: 'Tổng doanh thu trong kỳ là', zh: '本期间总收入为' },
  { en: 'Gross margin was', id: 'Margin kotor adalah', th: 'อัตรากำไรขั้นต้นเท่ากับ', vi: 'Biên lợi nhuận gộp là', zh: '毛利率为' },
  { en: 'This result should be interpreted alongside COGS and operating expenses to judge sustainability.', id: 'Hasil ini harus dibaca bersama HPP dan beban operasional untuk menilai keberlanjutan.', th: 'ควรพิจารณาผลลัพธ์นี้ร่วมกับ COGS และค่าใช้จ่ายดำเนินงานเพื่อประเมินความยั่งยืน', vi: 'Cần xem xét kết quả này cùng với COGS và chi phí hoạt động để đánh giá tính bền vững.', zh: '应结合 COGS 和运营费用解读该结果，以判断可持续性。' },
  { en: ' was the largest revenue source recorded in this period.', id: ' merupakan sumber pendapatan terbesar yang tercatat pada periode ini.', th: ' เป็นแหล่งรายได้ที่ใหญ่ที่สุดที่บันทึกในงวดนี้', vi: ' là nguồn doanh thu lớn nhất được ghi nhận trong kỳ này.', zh: ' 是本期间记录的最大收入来源。' },
  { en: ' was the largest direct production cost category and should be monitored against production volume and harvest yield.', id: ' merupakan kategori biaya produksi langsung terbesar dan perlu dipantau terhadap volume produksi serta hasil panen.', th: ' เป็นหมวดต้นทุนการผลิตทางตรงที่ใหญ่ที่สุด และควรติดตามเทียบกับปริมาณการผลิตและผลผลิตเก็บเกี่ยว', vi: ' là danh mục chi phí sản xuất trực tiếp lớn nhất và cần được theo dõi so với sản lượng và năng suất thu hoạch.', zh: ' 是最大的直接生产成本类别，应结合产量和收获产出进行监控。' },

  { en: 'Operating activities consumed cash this period. Supplier payments, operating expenses, and other operating payments should be reviewed before the next operating cycle.', id: 'Aktivitas operasional menggunakan kas pada periode ini. Tinjau pembayaran pemasok, beban operasional, dan pembayaran operasional lainnya sebelum siklus berikutnya.', th: 'กิจกรรมดำเนินงานใช้เงินสดในงวดนี้ ควรทบทวนการจ่ายผู้จัดหา ค่าใช้จ่ายดำเนินงาน และการจ่ายดำเนินงานอื่นก่อนรอบถัดไป', vi: 'Hoạt động kinh doanh đã sử dụng tiền mặt trong kỳ này. Cần xem xét khoản trả nhà cung cấp, chi phí hoạt động và các khoản chi khác trước chu kỳ tiếp theo.', zh: '本期间经营活动消耗了现金。应在下一个运营周期前审查供应商付款、运营费用和其他经营支出。' },
  { en: 'Operating activities generated positive cash flow for the selected period.', id: 'Aktivitas operasional menghasilkan arus kas positif pada periode yang dipilih.', th: 'กิจกรรมดำเนินงานสร้างกระแสเงินสดเป็นบวกในงวดที่เลือก', vi: 'Hoạt động kinh doanh tạo dòng tiền dương trong kỳ đã chọn.', zh: '所选期间经营活动产生了正现金流。' },
  { en: 'Closing cash is negative, indicating immediate liquidity pressure if the recorded balances are complete.', id: 'Kas akhir negatif, yang menunjukkan tekanan likuiditas langsung jika saldo yang tercatat sudah lengkap.', th: 'เงินสดปลายงวดติดลบ แสดงถึงแรงกดดันด้านสภาพคล่องทันทีหากยอดที่บันทึกครบถ้วน', vi: 'Tiền mặt cuối kỳ âm, cho thấy áp lực thanh khoản tức thời nếu số dư đã được ghi nhận đầy đủ.', zh: '期末现金为负；如果记录余额完整，则表明存在即时流动性压力。' },
  { en: 'Closing cash appears tight relative to recorded outflows. A minimum cash buffer should be maintained before new commitments are made.', id: 'Kas akhir terlihat ketat dibandingkan arus keluar yang tercatat. Pertahankan cadangan kas minimum sebelum membuat komitmen baru.', th: 'เงินสดปลายงวดค่อนข้างตึงตัวเมื่อเทียบกับกระแสเงินสดออก ควรรักษาเงินสดสำรองขั้นต่ำก่อนก่อภาระใหม่', vi: 'Tiền mặt cuối kỳ khá thấp so với dòng tiền ra đã ghi nhận. Cần duy trì quỹ tiền mặt tối thiểu trước khi có cam kết mới.', zh: '相对于已记录的现金流出，期末现金较为紧张。作出新承诺前应保留最低现金缓冲。' },
  { en: 'Closing cash appears adequate against the selected period outflow profile.', id: 'Kas akhir tampak memadai dibandingkan pola arus keluar periode yang dipilih.', th: 'เงินสดปลายงวดดูเพียงพอเมื่อเทียบกับรูปแบบกระแสเงินสดออกของงวดที่เลือก', vi: 'Tiền mặt cuối kỳ có vẻ đủ so với cơ cấu dòng tiền ra trong kỳ đã chọn.', zh: '相对于所选期间的现金流出情况，期末现金看起来充足。' },
  { en: 'No high dependency on owner funding or loans was detected from the recorded inflow mix.', id: 'Tidak terdeteksi ketergantungan tinggi pada modal pemilik atau pinjaman dari komposisi arus masuk yang tercatat.', th: 'ไม่พบการพึ่งพาเงินทุนเจ้าของหรือเงินกู้ในระดับสูงจากสัดส่วนกระแสเงินสดเข้าที่บันทึก', vi: 'Không phát hiện mức phụ thuộc cao vào vốn chủ sở hữu hoặc khoản vay trong cơ cấu dòng tiền vào.', zh: '从已记录的流入构成看，未发现对业主资金或贷款的高度依赖。' },
  { en: 'Operating outflows are high relative to inflows. Review payment timing and upcoming production-cycle cash needs.', id: 'Arus kas operasional keluar tinggi dibandingkan arus masuk. Tinjau waktu pembayaran dan kebutuhan kas siklus produksi mendatang.', th: 'กระแสเงินสดออกจากการดำเนินงานสูงเมื่อเทียบกับกระแสเข้า ควรทบทวนช่วงเวลาการจ่ายและความต้องการเงินสดของรอบการผลิตถัดไป', vi: 'Dòng tiền hoạt động ra cao so với dòng vào. Cần xem xét thời điểm thanh toán và nhu cầu tiền mặt của chu kỳ sản xuất sắp tới.', zh: '经营现金流出相对流入较高。应审查付款时间和即将到来的生产周期现金需求。' },
  { en: 'Investing cash outflows were recorded. Confirm that asset or investment purchases do not reduce the cash buffer needed for pond operations.', id: 'Terdapat arus kas investasi keluar. Pastikan pembelian aset atau investasi tidak mengurangi cadangan kas yang diperlukan untuk operasional kolam.', th: 'มีการบันทึกกระแสเงินสดออกจากการลงทุน ควรยืนยันว่าการซื้อสินทรัพย์หรือการลงทุนไม่ลดเงินสดสำรองที่จำเป็นต่อการดำเนินงานบ่อ', vi: 'Đã ghi nhận dòng tiền đầu tư ra. Cần đảm bảo việc mua tài sản hoặc đầu tư không làm giảm quỹ tiền mặt cần cho hoạt động ao.', zh: '已记录投资现金流出。请确认资产或投资购买不会减少池塘运营所需的现金缓冲。' },
  { en: 'Opening cash was', id: 'Kas awal adalah', th: 'เงินสดต้นงวดเท่ากับ', vi: 'Tiền mặt đầu kỳ là', zh: '期初现金为' },
  { en: 'Cash inflows totaled', id: 'Total arus kas masuk', th: 'กระแสเงินสดเข้ารวม', vi: 'Tổng dòng tiền vào là', zh: '现金流入总额为' },
  { en: 'cash outflows totaled', id: 'total arus kas keluar', th: 'กระแสเงินสดออกรวม', vi: 'tổng dòng tiền ra là', zh: '现金流出总额为' },
  { en: 'Closing cash was', id: 'Kas akhir adalah', th: 'เงินสดปลายงวดเท่ากับ', vi: 'Tiền mặt cuối kỳ là', zh: '期末现金为' },
  { en: 'Liquidity status is', id: 'Status likuiditas adalah', th: 'สถานะสภาพคล่องคือ', vi: 'Tình trạng thanh khoản là', zh: '流动性状态为' },
  { en: 'The largest cash movement driver was', id: 'Penggerak arus kas terbesar adalah', th: 'ปัจจัยขับเคลื่อนกระแสเงินสดที่ใหญ่ที่สุดคือ', vi: 'Yếu tố biến động tiền mặt lớn nhất là', zh: '最大的现金变动驱动因素是' },

  { en: 'No detailed direct-cost category breakdown was available for this export.', id: 'Rincian kategori biaya langsung tidak tersedia untuk ekspor ini.', th: 'ไม่มีรายละเอียดหมวดต้นทุนทางตรงสำหรับการส่งออกนี้', vi: 'Không có chi tiết danh mục chi phí trực tiếp cho lần xuất này.', zh: '本次导出没有直接成本分类明细。' },
  { en: 'Revenue is missing or zero, so gross margin cannot be used as a reliable profitability indicator.', id: 'Pendapatan tidak tersedia atau nol, sehingga margin kotor tidak dapat digunakan sebagai indikator profitabilitas yang andal.', th: 'รายได้ไม่มีข้อมูลหรือเป็นศูนย์ จึงไม่สามารถใช้อัตรากำไรขั้นต้นเป็นตัวชี้วัดกำไรที่เชื่อถือได้', vi: 'Doanh thu bị thiếu hoặc bằng 0 nên không thể dùng biên lợi nhuận gộp làm chỉ báo sinh lời đáng tin cậy.', zh: '收入缺失或为零，因此毛利率不能作为可靠的盈利指标。' },
  { en: 'Gross margin is negative. Review whether feed, seed, additive, labour, or inventory costs are being recorded against the correct cycle and period.', id: 'Margin kotor negatif. Periksa apakah biaya pakan, benur, aditif, tenaga kerja, atau persediaan dicatat pada siklus dan periode yang benar.', th: 'อัตรากำไรขั้นต้นติดลบ ควรตรวจสอบว่าต้นทุนอาหาร ลูกกุ้ง สารเติมแต่ง แรงงาน หรือสินค้าคงเหลือบันทึกในรอบและงวดที่ถูกต้อง', vi: 'Biên lợi nhuận gộp âm. Cần kiểm tra chi phí thức ăn, giống, phụ gia, lao động hoặc tồn kho có được ghi đúng vụ và kỳ hay không.', zh: '毛利率为负。请检查饲料、虾苗、添加剂、人工或库存成本是否记录在正确的周期和期间。' },
  { en: 'Gross margin is thin. Feed efficiency, stocking outcome, and harvest yield should be reviewed before the next purchasing decision.', id: 'Margin kotor tipis. Tinjau efisiensi pakan, hasil penebaran, dan hasil panen sebelum keputusan pembelian berikutnya.', th: 'อัตรากำไรขั้นต้นต่ำ ควรทบทวนประสิทธิภาพอาหาร ผลการลงลูกกุ้ง และผลผลิตเก็บเกี่ยวก่อนตัดสินใจซื้อครั้งถัดไป', vi: 'Biên lợi nhuận gộp thấp. Cần xem xét hiệu quả thức ăn, kết quả thả nuôi và năng suất thu hoạch trước quyết định mua tiếp theo.', zh: '毛利率偏低。下次采购决策前应审查饲料效率、投苗结果和收获产量。' },
  { en: 'No single direct-cost category exceeds the high concentration threshold from the available breakdown.', id: 'Tidak ada satu kategori biaya langsung yang melampaui ambang konsentrasi tinggi dari rincian yang tersedia.', th: 'ไม่มีหมวดต้นทุนทางตรงใดเกินเกณฑ์การกระจุกตัวสูงจากรายละเอียดที่มี', vi: 'Không có danh mục chi phí trực tiếp nào vượt ngưỡng tập trung cao trong chi tiết hiện có.', zh: '现有明细中没有单个直接成本类别超过高集中度阈值。' },
  { en: 'Closing inventory is zero or missing. Confirm that remaining feed and materials were counted before using this report as a final COGS result.', id: 'Persediaan akhir nol atau tidak tersedia. Pastikan sisa pakan dan bahan sudah dihitung sebelum menggunakan laporan ini sebagai hasil HPP final.', th: 'สินค้าคงเหลือปลายงวดเป็นศูนย์หรือไม่มีข้อมูล ควรยืนยันว่าได้นับอาหารและวัสดุคงเหลือก่อนใช้รายงานนี้เป็นผล COGS สุดท้าย', vi: 'Tồn kho cuối kỳ bằng 0 hoặc bị thiếu. Cần xác nhận đã kiểm đếm thức ăn và vật tư còn lại trước khi dùng báo cáo này làm kết quả COGS cuối cùng.', zh: '期末库存为零或缺失。在将本报告作为最终 COGS 结果前，请确认已清点剩余饲料和材料。' },
  { en: 'Reconcile inventory stock-in, usage, and closing count before treating COGS as final.', id: 'Rekonsiliasi stok masuk, penggunaan, dan jumlah persediaan akhir sebelum menetapkan HPP sebagai final.', th: 'กระทบยอดสินค้าคงคลังรับเข้า การใช้ และยอดปลายงวดก่อนถือว่า COGS เป็นผลสุดท้าย', vi: 'Đối chiếu nhập kho, sử dụng và tồn cuối kỳ trước khi xem COGS là số liệu cuối cùng.', zh: '在将 COGS 视为最终结果前，请核对库存入库、使用量和期末盘点。' },
  { en: 'COGS is calculated from opening inventory, purchases, direct labour, direct materials, and closing inventory available at export time.', id: 'HPP dihitung dari persediaan awal, pembelian, tenaga kerja langsung, bahan langsung, dan persediaan akhir yang tersedia saat ekspor.', th: 'COGS คำนวณจากสินค้าคงเหลือต้นงวด การซื้อ ค่าแรงทางตรง วัสดุทางตรง และสินค้าคงเหลือปลายงวดที่มี ณ เวลาส่งออก', vi: 'COGS được tính từ tồn kho đầu kỳ, mua hàng, nhân công trực tiếp, vật liệu trực tiếp và tồn kho cuối kỳ tại thời điểm xuất.', zh: 'COGS 根据导出时可用的期初库存、采购、直接人工、直接材料和期末库存计算。' },
  { en: 'Revenue is included for gross profit context; this report does not replace the Profit and Loss report.', id: 'Pendapatan disertakan sebagai konteks laba kotor; laporan ini tidak menggantikan laporan Laba Rugi.', th: 'รวมรายได้เพื่อประกอบการวิเคราะห์กำไรขั้นต้น รายงานนี้ไม่ใช้แทนงบกำไรขาดทุน', vi: 'Doanh thu được đưa vào để cung cấp bối cảnh lợi nhuận gộp; báo cáo này không thay thế báo cáo lãi lỗ.', zh: '收入用于提供毛利背景；本报告不能替代损益报告。' },

  { en: 'No valid sampling records were available for the selected ponds. Growth performance cannot be assessed until ABW/MBW, mortality, feed, and sampling date records are entered.', id: 'Tidak ada catatan sampling yang valid untuk kolam yang dipilih. Kinerja pertumbuhan belum dapat dinilai sampai data ABW/MBW, mortalitas, pakan, dan tanggal sampling dimasukkan.', th: 'ไม่มีบันทึกการสุ่มตัวอย่างที่ถูกต้องสำหรับบ่อที่เลือก จึงยังประเมินการเติบโตไม่ได้จนกว่าจะบันทึก ABW/MBW การตาย อาหาร และวันที่สุ่มตัวอย่าง', vi: 'Không có hồ sơ lấy mẫu hợp lệ cho các ao đã chọn. Chưa thể đánh giá tăng trưởng cho đến khi nhập ABW/MBW, tỷ lệ chết, thức ăn và ngày lấy mẫu.', zh: '所选池塘没有有效采样记录。在录入 ABW/MBW、死亡、饲料和采样日期记录前，无法评估生长表现。' },
  { en: 'Missing sampling history is the primary report risk. Record at least one valid sampling entry per selected pond before using this report for production decisions.', id: 'Riwayat sampling yang hilang adalah risiko utama laporan. Catat setidaknya satu sampling valid untuk setiap kolam sebelum menggunakan laporan ini untuk keputusan produksi.', th: 'ประวัติการสุ่มตัวอย่างที่ขาดหายเป็นความเสี่ยงหลักของรายงาน ควรบันทึกการสุ่มตัวอย่างที่ถูกต้องอย่างน้อยหนึ่งครั้งต่อบ่อก่อนใช้รายงานตัดสินใจผลิต', vi: 'Thiếu lịch sử lấy mẫu là rủi ro chính của báo cáo. Cần ghi ít nhất một lần lấy mẫu hợp lệ cho mỗi ao trước khi dùng báo cáo để ra quyết định sản xuất.', zh: '缺少采样历史是本报告的主要风险。在使用本报告作生产决策前，每个所选池塘至少应有一条有效采样记录。' },
  { en: 'Growth performance is currently strong based on the latest sampled records.', id: 'Kinerja pertumbuhan saat ini kuat berdasarkan catatan sampling terbaru.', th: 'ผลการเติบโตในปัจจุบันอยู่ในระดับดีจากบันทึกการสุ่มตัวอย่างล่าสุด', vi: 'Hiệu quả tăng trưởng hiện đang tốt theo hồ sơ lấy mẫu mới nhất.', zh: '根据最新采样记录，当前生长表现良好。' },
  { en: 'Growth performance is within a normal operating range, but should be checked against the next sampling round.', id: 'Kinerja pertumbuhan berada dalam rentang operasional normal, tetapi perlu diperiksa kembali pada sampling berikutnya.', th: 'การเติบโตอยู่ในช่วงการดำเนินงานปกติ แต่ควรตรวจสอบเทียบกับการสุ่มตัวอย่างครั้งถัดไป', vi: 'Tăng trưởng nằm trong phạm vi vận hành bình thường nhưng cần kiểm tra lại ở lần lấy mẫu tiếp theo.', zh: '生长表现处于正常运营范围，但应在下一轮采样时复核。' },
  { en: 'Growth performance requires attention because average daily growth is below the expected operating range.', id: 'Kinerja pertumbuhan perlu diperhatikan karena pertumbuhan harian rata-rata berada di bawah rentang operasional yang diharapkan.', th: 'ควรให้ความสนใจกับการเติบโต เนื่องจากการเติบโตเฉลี่ยต่อวันต่ำกว่าช่วงการดำเนินงานที่คาดหวัง', vi: 'Cần chú ý đến tăng trưởng vì mức tăng trưởng trung bình hằng ngày thấp hơn phạm vi vận hành dự kiến.', zh: '由于平均日增重低于预期运营范围，生长表现需要关注。' },
  { en: 'No high-risk pond indicators were detected from the latest sampling records.', id: 'Tidak terdeteksi indikator kolam berisiko tinggi dari catatan sampling terbaru.', th: 'ไม่พบตัวชี้วัดบ่อที่มีความเสี่ยงสูงจากบันทึกการสุ่มตัวอย่างล่าสุด', vi: 'Không phát hiện chỉ báo ao rủi ro cao từ hồ sơ lấy mẫu mới nhất.', zh: '最新采样记录中未发现高风险池塘指标。' },
  { en: 'No moderate-risk growth or feed-efficiency warnings were detected from the latest sampling records.', id: 'Tidak terdeteksi peringatan risiko sedang pada pertumbuhan atau efisiensi pakan dari catatan sampling terbaru.', th: 'ไม่พบคำเตือนความเสี่ยงปานกลางด้านการเติบโตหรือประสิทธิภาพอาหารจากบันทึกล่าสุด', vi: 'Không phát hiện cảnh báo rủi ro trung bình về tăng trưởng hoặc hiệu quả thức ăn từ hồ sơ mới nhất.', zh: '最新采样记录中未发现中等风险的生长或饲料效率警告。' },
  { en: 'Biomass, FCR, and survival values should be treated as operational estimates until confirmed by consistent sampling and harvest records.', id: 'Nilai biomassa, FCR, dan kelangsungan hidup harus dianggap sebagai estimasi operasional sampai dikonfirmasi oleh catatan sampling dan panen yang konsisten.', th: 'ควรถือค่าชีวมวล FCR และอัตรารอดเป็นค่าประมาณในการดำเนินงาน จนกว่าจะยืนยันด้วยบันทึกการสุ่มตัวอย่างและเก็บเกี่ยวที่สม่ำเสมอ', vi: 'Cần xem sinh khối, FCR và tỷ lệ sống là ước tính vận hành cho đến khi được xác nhận bằng hồ sơ lấy mẫu và thu hoạch nhất quán.', zh: '在通过一致的采样和收获记录确认前，生物量、FCR 和成活率应视为运营估算值。' },
  { en: 'Recorded feed history is sufficient for a basic FCR estimate, but it should still be reconciled against inventory and feeding logs.', id: 'Riwayat pakan yang tercatat cukup untuk estimasi FCR dasar, tetapi tetap perlu direkonsiliasi dengan persediaan dan log pemberian pakan.', th: 'ประวัติอาหารที่บันทึกเพียงพอสำหรับประมาณ FCR เบื้องต้น แต่ยังควรกระทบยอดกับสินค้าคงคลังและบันทึกการให้อาหาร', vi: 'Lịch sử thức ăn đã ghi nhận đủ để ước tính FCR cơ bản nhưng vẫn cần đối chiếu với tồn kho và nhật ký cho ăn.', zh: '已记录的饲料历史足以进行基础 FCR 估算，但仍应与库存和投喂日志核对。' },
  { en: 'No confirmed lab analysis was attached to the selected ponds at export time.', id: 'Tidak ada analisis laboratorium terkonfirmasi yang terlampir pada kolam terpilih saat ekspor.', th: 'ไม่มีผลวิเคราะห์ห้องปฏิบัติการที่ยืนยันแล้วแนบกับบ่อที่เลือกในเวลาส่งออก', vi: 'Không có phân tích phòng thí nghiệm đã xác nhận được đính kèm cho các ao đã chọn tại thời điểm xuất.', zh: '导出时，所选池塘未附带已确认的实验室分析。' },
  { en: 'This report only reflects operational sampling, feed, mortality, and water quality logs.', id: 'Laporan ini hanya mencerminkan log operasional sampling, pakan, mortalitas, dan kualitas air.', th: 'รายงานนี้สะท้อนเฉพาะบันทึกการสุ่มตัวอย่าง อาหาร การตาย และคุณภาพน้ำในการดำเนินงาน', vi: 'Báo cáo này chỉ phản ánh nhật ký vận hành về lấy mẫu, thức ăn, tỷ lệ chết và chất lượng nước.', zh: '本报告仅反映运营采样、饲料、死亡和水质日志。' },
  { en: 'Average FCR is unusually low, which usually means feed history is incomplete or only partial feed records are available.', id: 'Rata-rata FCR sangat rendah, yang biasanya berarti riwayat pakan belum lengkap atau hanya tersedia catatan pakan parsial.', th: 'FCR เฉลี่ยต่ำผิดปกติ ซึ่งมักหมายถึงประวัติอาหารไม่ครบหรือมีเพียงบันทึกอาหารบางส่วน', vi: 'FCR trung bình thấp bất thường, thường cho thấy lịch sử thức ăn chưa đầy đủ hoặc chỉ có một phần hồ sơ thức ăn.', zh: '平均 FCR 异常偏低，通常意味着饲料历史不完整或只有部分饲料记录。' },

  { en: 'Recorded partial and final harvests', id: 'Panen parsial dan final yang tercatat', th: 'การเก็บเกี่ยวบางส่วนและขั้นสุดท้ายที่บันทึก', vi: 'Thu hoạch một phần và cuối cùng đã ghi nhận', zh: '已记录的部分和最终收获' },
  { en: 'Recorded harvest sales', id: 'Penjualan panen yang tercatat', th: 'ยอดขายผลผลิตที่บันทึก', vi: 'Doanh thu thu hoạch đã ghi nhận', zh: '已记录的收获销售' },
  { en: 'Feed, additives, maintenance and general', id: 'Pakan, aditif, pemeliharaan, dan umum', th: 'อาหาร สารเติมแต่ง บำรุงรักษา และทั่วไป', vi: 'Thức ăn, phụ gia, bảo trì và chi phí chung', zh: '饲料、添加剂、维护和一般费用' },
  { en: 'Revenue minus recorded cycle costs', id: 'Pendapatan dikurangi biaya siklus tercatat', th: 'รายได้หักต้นทุนรอบการเลี้ยงที่บันทึก', vi: 'Doanh thu trừ chi phí vụ nuôi đã ghi nhận', zh: '收入减去已记录的周期成本' },
  { en: 'Final Harvest only; Partial Harvest MBW does not replace pond MBW.', id: 'Hanya Panen Final; MBW Panen Parsial tidak menggantikan MBW kolam.', th: 'ใช้เฉพาะการเก็บเกี่ยวขั้นสุดท้าย MBW จากการเก็บเกี่ยวบางส่วนไม่แทน MBW ของบ่อ', vi: 'Chỉ dùng Thu hoạch cuối; MBW thu hoạch một phần không thay thế MBW của ao.', zh: '仅使用最终收获；部分收获 MBW 不替代池塘 MBW。' },
  { en: 'Latest Final Harvest only; Partial Harvest MBW does not replace pond MBW.', id: 'Hanya Panen Final terbaru; MBW Panen Parsial tidak menggantikan MBW kolam.', th: 'ใช้เฉพาะการเก็บเกี่ยวขั้นสุดท้ายล่าสุด MBW จากการเก็บเกี่ยวบางส่วนไม่แทน MBW ของบ่อ', vi: 'Chỉ dùng lần Thu hoạch cuối mới nhất; MBW thu hoạch một phần không thay thế MBW của ao.', zh: '仅使用最新最终收获；部分收获 MBW 不替代池塘 MBW。' },
  { en: 'Biomass-weighted average across all Partial and Final Harvest records.', id: 'Rata-rata tertimbang biomassa dari seluruh catatan Panen Parsial dan Final.', th: 'ค่าเฉลี่ยถ่วงน้ำหนักด้วยชีวมวลจากบันทึกการเก็บเกี่ยวบางส่วนและขั้นสุดท้ายทั้งหมด', vi: 'Trung bình gia quyền theo sinh khối từ tất cả hồ sơ Thu hoạch một phần và cuối.', zh: '所有部分收获和最终收获记录的生物量加权平均值。' },
  { en: 'Sum of every Partial and Final Harvest linked to the pond cycle.', id: 'Jumlah seluruh Panen Parsial dan Final yang terkait dengan siklus kolam.', th: 'ผลรวมของการเก็บเกี่ยวบางส่วนและขั้นสุดท้ายทั้งหมดที่เชื่อมกับรอบบ่อ', vi: 'Tổng mọi lần thu hoạch một phần và cuối cùng liên kết với vụ ao.', zh: '与池塘周期关联的所有部分和最终收获之和。' },
  { en: 'Harvested population divided by initial stocked population.', id: 'Populasi yang dipanen dibagi populasi tebar awal.', th: 'จำนวนที่เก็บเกี่ยวหารด้วยจำนวนปล่อยเริ่มต้น', vi: 'Số lượng thu hoạch chia cho số lượng thả ban đầu.', zh: '收获数量除以初始投苗数量。' },
  { en: 'Recorded feed consumed divided by net harvested biomass gain.', id: 'Pakan tercatat yang digunakan dibagi kenaikan bersih biomassa panen.', th: 'อาหารที่ใช้ตามบันทึกหารด้วยการเพิ่มขึ้นสุทธิของชีวมวลเก็บเกี่ยว', vi: 'Lượng thức ăn đã ghi nhận chia cho mức tăng sinh khối thu hoạch ròng.', zh: '已记录饲料消耗量除以净收获生物量增长。' },
  { en: 'Estimated gross profit equals recorded harvest revenue minus recorded cycle-linked costs. Unit economics use total harvested biomass as the denominator. Unrecorded or unlinked expenses are not included.', id: 'Estimasi laba kotor sama dengan pendapatan panen tercatat dikurangi biaya yang terkait dengan siklus. Ekonomi per unit menggunakan total biomassa panen sebagai pembagi. Beban yang tidak tercatat atau tidak terkait tidak disertakan.', th: 'กำไรขั้นต้นโดยประมาณเท่ากับรายได้เก็บเกี่ยวที่บันทึกหักต้นทุนที่เชื่อมกับรอบการเลี้ยง เศรษฐศาสตร์ต่อหน่วยใช้ชีวมวลเก็บเกี่ยวรวมเป็นตัวหาร ไม่รวมค่าใช้จ่ายที่ไม่ได้บันทึกหรือไม่ได้เชื่อมโยง', vi: 'Lợi nhuận gộp ước tính bằng doanh thu thu hoạch đã ghi nhận trừ chi phí liên kết với vụ nuôi. Hiệu quả kinh tế đơn vị dùng tổng sinh khối thu hoạch làm mẫu số. Không bao gồm chi phí chưa ghi nhận hoặc chưa liên kết.', zh: '预计毛利润等于已记录收获收入减去与周期关联的已记录成本。单位经济效益以总收获生物量为分母。不包括未记录或未关联的费用。' },
  { en: ' included ', id: ' mencakup ', th: ' ครอบคลุม ', vi: ' bao gồm ', zh: ' 包含 ' },
  { en: 'Recorded harvests produced', id: 'Panen yang tercatat menghasilkan', th: 'การเก็บเกี่ยวที่บันทึกให้ผลผลิต', vi: 'Các lần thu hoạch đã ghi nhận tạo ra', zh: '已记录收获产出' },
  { en: 'Recorded cycle costs totalled', id: 'Total biaya siklus tercatat adalah', th: 'ต้นทุนรอบการเลี้ยงที่บันทึกรวมเท่ากับ', vi: 'Tổng chi phí vụ nuôi đã ghi nhận là', zh: '已记录周期成本总计' },
  { en: 'resulting in estimated gross profit of', id: 'menghasilkan estimasi laba kotor sebesar', th: 'ส่งผลให้กำไรขั้นต้นโดยประมาณเท่ากับ', vi: 'tạo ra lợi nhuận gộp ước tính là', zh: '从而得到预计毛利润' },
  { en: ' and generated ', id: ' dan menghasilkan ', th: ' และสร้างรายได้ ', vi: ' và tạo ra ', zh: '，并产生收入 ' },
  { en: ' in revenue. ', id: ' dalam pendapatan. ', th: ' เป็นรายได้ ', vi: ' doanh thu. ', zh: '。' },
  { en: ' was reported as a non-harvest closure.', id: ' dilaporkan sebagai penutupan tanpa panen.', th: ' บ่อถูกรายงานว่าปิดโดยไม่เก็บเกี่ยว', vi: ' được ghi nhận là đóng ao không thu hoạch.', zh: ' 个池塘记录为非收获关闭。' },
  { en: ' were reported as non-harvest closures.', id: ' dilaporkan sebagai penutupan tanpa panen.', th: ' บ่อถูกรายงานว่าปิดโดยไม่เก็บเกี่ยว', vi: ' được ghi nhận là đóng ao không thu hoạch.', zh: ' 个池塘记录为非收获关闭。' },
  { en: ' pond was reported as a non-harvest closure.', id: ' kolam dilaporkan sebagai penutupan tanpa panen.', th: ' บ่อถูกรายงานว่าปิดโดยไม่เก็บเกี่ยว', vi: ' ao được ghi nhận là đóng ao không thu hoạch.', zh: ' 个池塘记录为非收获关闭。' },
  { en: ' ponds were reported as non-harvest closures.', id: ' kolam dilaporkan sebagai penutupan tanpa panen.', th: ' บ่อถูกรายงานว่าปิดโดยไม่เก็บเกี่ยว', vi: ' ao được ghi nhận là đóng ao không thu hoạch.', zh: ' 个池塘记录为非收获关闭。' },

  { en: 'Unused feed and additive inventory is excluded. Only recorded consumption is treated as production cost.', id: 'Persediaan pakan dan aditif yang belum digunakan tidak disertakan. Hanya penggunaan yang tercatat yang dianggap sebagai biaya produksi.', th: 'ไม่รวมสินค้าคงคลังอาหารและสารเติมแต่งที่ยังไม่ได้ใช้ เฉพาะการใช้ที่บันทึกเท่านั้นที่ถือเป็นต้นทุนการผลิต', vi: 'Không tính tồn kho thức ăn và phụ gia chưa sử dụng. Chỉ lượng sử dụng đã ghi nhận mới được xem là chi phí sản xuất.', zh: '未使用的饲料和添加剂库存不计入。只有已记录的消耗量才视为生产成本。' },
  { en: 'The recommendation changes if selling prices, feed cost, ADG, mortality, or allocated operating expenses differ from the recorded trend.', id: 'Rekomendasi akan berubah jika harga jual, biaya pakan, ADG, mortalitas, atau beban operasional yang dialokasikan berbeda dari tren tercatat.', th: 'คำแนะนำจะเปลี่ยนหากราคาขาย ต้นทุนอาหาร ADG การตาย หรือค่าใช้จ่ายดำเนินงานที่จัดสรรแตกต่างจากแนวโน้มที่บันทึก', vi: 'Khuyến nghị sẽ thay đổi nếu giá bán, chi phí thức ăn, ADG, tỷ lệ chết hoặc chi phí hoạt động phân bổ khác với xu hướng đã ghi nhận.', zh: '如果售价、饲料成本、ADG、死亡率或分配的运营费用偏离已记录趋势，建议将发生变化。' },
  { en: 'Some projection inputs are incomplete. Review source records and recalculate after the next sampling, feed, mortality, or expense update.', id: 'Beberapa input proyeksi belum lengkap. Tinjau catatan sumber dan hitung ulang setelah pembaruan sampling, pakan, mortalitas, atau beban berikutnya.', th: 'ข้อมูลนำเข้าบางส่วนของประมาณการไม่ครบ ควรตรวจสอบบันทึกต้นทางและคำนวณใหม่หลังอัปเดตการสุ่มตัวอย่าง อาหาร การตาย หรือค่าใช้จ่ายครั้งถัดไป', vi: 'Một số dữ liệu đầu vào dự báo chưa đầy đủ. Cần xem lại hồ sơ nguồn và tính lại sau lần cập nhật lấy mẫu, thức ăn, tỷ lệ chết hoặc chi phí tiếp theo.', zh: '部分预测输入不完整。请检查源记录，并在下一次采样、饲料、死亡或费用更新后重新计算。' },
  { en: 'No projection-specific risks were detected from the available data.', id: 'Tidak terdeteksi risiko khusus proyeksi dari data yang tersedia.', th: 'ไม่พบความเสี่ยงเฉพาะของประมาณการจากข้อมูลที่มี', vi: 'Không phát hiện rủi ro cụ thể của dự báo từ dữ liệu hiện có.', zh: '现有数据中未发现预测特定风险。' },
  { en: 'This projection is based on available app data and user-entered market prices. Actual results may vary due to market price, survival, feed cost, disease events, harvest timing, and operating conditions. Generated by Shrimply.', id: 'Proyeksi ini didasarkan pada data aplikasi yang tersedia dan harga pasar yang dimasukkan pengguna. Hasil aktual dapat berubah karena harga pasar, kelangsungan hidup, biaya pakan, kejadian penyakit, waktu panen, dan kondisi operasional. Dibuat oleh Shrimply.', th: 'ประมาณการนี้อ้างอิงข้อมูลในแอปที่มีและราคาตลาดที่ผู้ใช้ป้อน ผลลัพธ์จริงอาจแตกต่างตามราคาตลาด อัตรารอด ต้นทุนอาหาร เหตุการณ์โรค ช่วงเวลาเก็บเกี่ยว และสภาพการดำเนินงาน สร้างโดย Shrimply', vi: 'Dự báo này dựa trên dữ liệu hiện có trong ứng dụng và giá thị trường do người dùng nhập. Kết quả thực tế có thể thay đổi do giá thị trường, tỷ lệ sống, chi phí thức ăn, dịch bệnh, thời điểm thu hoạch và điều kiện vận hành. Được tạo bởi Shrimply.', zh: '本预测基于可用的应用数据和用户输入的市场价格。实际结果可能因市场价格、成活率、饲料成本、疾病事件、收获时间和运营条件而变化。由 Shrimply 生成。' },

  { en: 'Share Profit & Loss Statement', id: 'Bagikan Laporan Laba Rugi', th: 'แชร์งบกำไรขาดทุน', vi: 'Chia sẻ báo cáo lãi lỗ', zh: '分享损益表' },
  { en: 'Share Cash Flow Statement', id: 'Bagikan Laporan Arus Kas', th: 'แชร์งบกระแสเงินสด', vi: 'Chia sẻ báo cáo dòng tiền', zh: '分享现金流量表' },
  { en: 'Share COGS Report', id: 'Bagikan Laporan HPP', th: 'แชร์รายงาน COGS', vi: 'Chia sẻ báo cáo COGS', zh: '分享 COGS 报告' },
  { en: 'Share Shrimp Sampling Report', id: 'Bagikan Laporan Sampling Udang', th: 'แชร์รายงานการสุ่มตัวอย่างกุ้ง', vi: 'Chia sẻ báo cáo lấy mẫu tôm', zh: '分享对虾采样报告' },
  { en: 'Share Comprehensive Pond Report', id: 'Bagikan Laporan Tambak Lengkap', th: 'แชร์รายงานบ่อแบบครบถ้วน', vi: 'Chia sẻ báo cáo ao toàn diện', zh: '分享综合池塘报告' },
  { en: 'Share Cycle Report', id: 'Bagikan Laporan Siklus', th: 'แชร์รายงานรอบการเลี้ยง', vi: 'Chia sẻ báo cáo vụ nuôi', zh: '分享养殖周期报告' },
  { en: 'PDF Generated', id: 'PDF Berhasil Dibuat', th: 'สร้าง PDF แล้ว', vi: 'Đã tạo PDF', zh: 'PDF 已生成' },
  { en: 'Report Generated', id: 'Laporan Berhasil Dibuat', th: 'สร้างรายงานแล้ว', vi: 'Đã tạo báo cáo', zh: '报告已生成' },
  { en: 'Failed to generate PDF report', id: 'Gagal membuat laporan PDF', th: 'ไม่สามารถสร้างรายงาน PDF ได้', vi: 'Không thể tạo báo cáo PDF', zh: '无法生成 PDF 报告' },
  { en: 'Failed to generate COGS PDF report', id: 'Gagal membuat laporan HPP PDF', th: 'ไม่สามารถสร้างรายงาน COGS PDF ได้', vi: 'Không thể tạo báo cáo COGS PDF', zh: '无法生成 COGS PDF 报告' },
  { en: 'Failed to generate sampling report PDF', id: 'Gagal membuat PDF laporan sampling', th: 'ไม่สามารถสร้าง PDF รายงานการสุ่มตัวอย่างได้', vi: 'Không thể tạo PDF báo cáo lấy mẫu', zh: '无法生成采样报告 PDF' },
  { en: 'Your financial report has been saved to:', id: 'Laporan keuangan Anda telah disimpan di:', th: 'บันทึกรายงานการเงินของคุณไว้ที่:', vi: 'Báo cáo tài chính đã được lưu tại:', zh: '您的财务报告已保存至：' },
  { en: 'Your cash flow statement has been saved to:', id: 'Laporan arus kas Anda telah disimpan di:', th: 'บันทึกงบกระแสเงินสดของคุณไว้ที่:', vi: 'Báo cáo dòng tiền đã được lưu tại:', zh: '您的现金流量表已保存至：' },
  { en: 'Your COGS report has been saved to:', id: 'Laporan HPP Anda telah disimpan di:', th: 'บันทึกรายงาน COGS ของคุณไว้ที่:', vi: 'Báo cáo COGS đã được lưu tại:', zh: '您的 COGS 报告已保存至：' },
  { en: 'Your sampling report has been saved to:', id: 'Laporan sampling Anda telah disimpan di:', th: 'บันทึกรายงานการสุ่มตัวอย่างของคุณไว้ที่:', vi: 'Báo cáo lấy mẫu đã được lưu tại:', zh: '您的采样报告已保存至：' },
  { en: 'Your pond report has been saved to:', id: 'Laporan kolam Anda telah disimpan di:', th: 'บันทึกรายงานบ่อของคุณไว้ที่:', vi: 'Báo cáo ao đã được lưu tại:', zh: '您的池塘报告已保存至：' },
  { en: 'Error', id: 'Kesalahan', th: 'ข้อผิดพลาด', vi: 'Lỗi', zh: '错误' },
  { en: 'OK', id: 'OK', th: 'ตกลง', vi: 'OK', zh: '确定' },

  { en: 'For the period', id: 'Untuk periode', th: 'สำหรับงวด', vi: 'Trong kỳ', zh: '期间' },
  { en: 'Generated by Shrimply Aquaculture Management on', id: 'Dibuat oleh Shrimply Aquaculture Management pada', th: 'สร้างโดย Shrimply Aquaculture Management เมื่อ', vi: 'Được tạo bởi Shrimply Aquaculture Management vào', zh: '由 Shrimply Aquaculture Management 生成于' },
  { en: 'Generated by Shrimply', id: 'Dibuat oleh Shrimply', th: 'สร้างโดย Shrimply', vi: 'Được tạo bởi Shrimply', zh: '由 Shrimply 生成' },
  { en: 'Generated on', id: 'Dibuat pada', th: 'สร้างเมื่อ', vi: 'Ngày tạo', zh: '生成于' },
  { en: 'Page', id: 'Halaman', th: 'หน้า', vi: 'Trang', zh: '第' },
  { en: 'Continued', id: 'Lanjutan', th: 'ต่อ', vi: 'Tiếp', zh: '续' },
  { en: 'None', id: 'Tidak ada', th: 'ไม่มี', vi: 'Không có', zh: '无' },
];

const INLINE_STANDALONE_PDF_TERMS = new Set([
  'Feed',
  'Labor',
  'Repairs',
  'Utilities',
  'Miscellaneous',
  'Taxes',
  'Interest',
  'Equipment',
  'Property',
  'Infrastructure',
  'Maintenance',
  'Dividend',
  'Review',
  'Strong',
  'Watch',
  'Recorded',
  'Good',
  'low',
  'medium',
  'high',
  'unknown',
  'undersize',
  'oversize',
  'target',
  'watch',
  'warning',
  'critical',
  'good',
  'stable',
  'tight',
  'negative',
]);
const isStandalonePdfWord = (value: string): boolean => /^[A-Za-z]+$/.test(value);
const escapePdfPhraseRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sortedPhrases = [...PDF_PHRASES].sort((a, b) => b.en.length - a.en.length);
const pdfPhraseByEnglish = new Map(sortedPhrases.map((phrase) => [phrase.en, phrase]));
const replaceablePdfPhrases = sortedPhrases.filter(
  (phrase) => !isStandalonePdfWord(phrase.en) || INLINE_STANDALONE_PDF_TERMS.has(phrase.en),
);
const pdfPhraseReplacementPattern = new RegExp(
  replaceablePdfPhrases
    .map((phrase) => INLINE_STANDALONE_PDF_TERMS.has(phrase.en)
      ? `\\b${escapePdfPhraseRegExp(phrase.en)}\\b`
      : escapePdfPhraseRegExp(phrase.en))
    .join('|'),
  'g',
);

const PDF_OVERWATCH_RISK_COPY: Record<Exclude<PdfLanguage, 'en'>, {
  title: string;
  states: Record<string, string>;
  elevated: string;
  normal: string;
}> = {
  id: {
    title: 'Pengawasan Plankton',
    states: { INSUFFICIENT: 'DATA TIDAK CUKUP', STABLE: 'STABIL', WATCH: 'PANTAU', HIGH: 'TINGGI', CRITICAL: 'KRITIS' },
    elevated: 'Tinjau bukti dan tindakan berikutnya yang tersimpan untuk kolam berisiko tinggi sebelum mengubah pengelolaan pakan atau air.',
    normal: 'Saat ini tidak ada status plankton tinggi atau kritis yang tersimpan untuk kolam yang dipilih.',
  },
  th: {
    title: 'เฝ้าระวังแพลงก์ตอน',
    states: { INSUFFICIENT: 'ข้อมูลไม่เพียงพอ', STABLE: 'เสถียร', WATCH: 'เฝ้าระวัง', HIGH: 'สูง', CRITICAL: 'วิกฤต' },
    elevated: 'ทบทวนหลักฐานและการดำเนินการถัดไปที่บันทึกไว้สำหรับบ่อที่มีความเสี่ยงสูงก่อนเปลี่ยนการจัดการอาหารหรือน้ำ',
    normal: 'ขณะนี้ไม่มีสถานะแพลงก์ตอนระดับสูงหรือวิกฤตที่บันทึกไว้สำหรับบ่อที่เลือก',
  },
  vi: {
    title: 'Giám sát Sinh vật phù du',
    states: { INSUFFICIENT: 'KHÔNG ĐỦ DỮ LIỆU', STABLE: 'ỔN ĐỊNH', WATCH: 'THEO DÕI', HIGH: 'CAO', CRITICAL: 'NGHIÊM TRỌNG' },
    elevated: 'Xem lại bằng chứng đã lưu và hành động tiếp theo cho các ao có rủi ro cao trước khi thay đổi cách quản lý thức ăn hoặc nước.',
    normal: 'Hiện không có trạng thái sinh vật phù du mức cao hoặc nghiêm trọng nào được lưu cho các ao đã chọn.',
  },
  zh: {
    title: '浮游生物监测',
    states: { INSUFFICIENT: '数据不足', STABLE: '稳定', WATCH: '关注', HIGH: '高', CRITICAL: '严重' },
    elevated: '在改变饲料或水质管理前，请查看高风险池塘已保存的证据和下一步措施。',
    normal: '当前所选池塘没有已保存的高风险或严重浮游生物状态。',
  },
};

const PDF_CYCLE_REPORT_DYNAMIC_COPY: Record<Exclude<PdfLanguage, 'en'>, {
  currentVs: (cycleName: string) => string;
  closureCount: (count: string) => string;
  highFcrCount: (count: string) => string;
  lowSurvivalCount: (count: string) => string;
  samplingCoverage: (coverage: string) => string;
  mbwMovement: (previous: string, current: string) => string;
  yield: (value: string) => string;
}> = {
  id: {
    currentVs: (cycleName) => `Saat ini dibandingkan dengan ${cycleName}`,
    closureCount: (count) => `${count} penutupan tanpa panen tercatat.`,
    highFcrCount: (count) => `${count} kolam melampaui tingkat tinjauan FCR 1,80.`,
    lowSurvivalCount: (count) => `${count} kolam berakhir dengan kelangsungan hidup aktual di bawah 75%.`,
    samplingCoverage: (coverage) => `${coverage}% kolam memiliki sampling MBW yang valid.`,
    mbwMovement: (previous, current) => `${previous} g ke ${current} g`,
    yield: (value) => `Hasil panen ${value} t/ha`,
  },
  th: {
    currentVs: (cycleName) => `ปัจจุบันเทียบกับ ${cycleName}`,
    closureCount: (count) => `${count} บ่อถูกบันทึกว่าปิดรอบโดยไม่เก็บเกี่ยว`,
    highFcrCount: (count) => `${count} บ่อมี FCR เกินระดับทบทวน 1.80`,
    lowSurvivalCount: (count) => `${count} บ่อจบรอบด้วยอัตรารอดจริงต่ำกว่า 75%`,
    samplingCoverage: (coverage) => `${coverage}% ของบ่อมีข้อมูลสุ่ม MBW ที่ใช้ได้`,
    mbwMovement: (previous, current) => `${previous} กรัม ถึง ${current} กรัม`,
    yield: (value) => `ผลผลิต ${value} t/ha`,
  },
  vi: {
    currentVs: (cycleName) => `Hiện tại so với ${cycleName}`,
    closureCount: (count) => `${count} ao được ghi nhận đóng mà không thu hoạch.`,
    highFcrCount: (count) => `${count} ao vượt mức FCR cần xem xét là 1,80.`,
    lowSurvivalCount: (count) => `${count} ao kết thúc với tỷ lệ sống thực tế dưới 75%.`,
    samplingCoverage: (coverage) => `${coverage}% ao có dữ liệu lấy mẫu MBW hợp lệ.`,
    mbwMovement: (previous, current) => `${previous} g đến ${current} g`,
    yield: (value) => `Năng suất ${value} t/ha`,
  },
  zh: {
    currentVs: (cycleName) => `当前与 ${cycleName} 对比`,
    closureCount: (count) => `${count} 个池塘记录为非收获关闭。`,
    highFcrCount: (count) => `${count} 个池塘超过 1.80 的 FCR 审查水平。`,
    lowSurvivalCount: (count) => `${count} 个池塘结束时的实际成活率低于 75%。`,
    samplingCoverage: (coverage) => `${coverage}% 的池塘具有有效的 MBW 采样。`,
    mbwMovement: (previous, current) => `${previous} g 至 ${current} g`,
    yield: (value) => `产量 ${value} t/ha`,
  },
};

export const normalizePdfLanguage = (language?: string | null): PdfLanguage =>
  PDF_LANGUAGES.includes(language as PdfLanguage) ? language as PdfLanguage : 'en';

export const getPdfLocale = (language?: string | null): string =>
  PDF_LOCALES[normalizePdfLanguage(language)];

export const localizePdfText = (value: string, language?: string | null): string => {
  const normalized = normalizePdfLanguage(language);
  if (normalized === 'en' || !value) return value;

  const overwatchMatch = value.match(
    /^(\s*)Plankton Overwatch:\s*(.+?)\.\s+(Review the saved evidence and next action for elevated ponds before changing feed or water management\.|No high or critical plankton state is currently saved for the selected ponds\.)(\s*)$/,
  );
  if (overwatchMatch) {
    const [, leading, statuses, conclusion, trailing] = overwatchMatch;
    const copy = PDF_OVERWATCH_RISK_COPY[normalized];
    const localizedStatuses = statuses.replace(
      /\b(INSUFFICIENT|STABLE|WATCH|HIGH|CRITICAL)\b/g,
      (state) => copy.states[state] || state,
    );
    const localizedConclusion = conclusion.startsWith('Review') ? copy.elevated : copy.normal;
    return `${leading}${copy.title}: ${localizedStatuses}. ${localizedConclusion}${trailing}`;
  }

  const cycleCopy = PDF_CYCLE_REPORT_DYNAMIC_COPY[normalized];
  const currentVsMatch = value.match(/^(\s*)Current vs (.+?)(\s*)$/);
  if (currentVsMatch) {
    const [, leading, cycleName, trailing] = currentVsMatch;
    return `${leading}${cycleCopy.currentVs(cycleName)}${trailing}`;
  }

  const closureCountMatch = value.match(/^(\s*)(\d+) non-harvest closures? recorded\.(\s*)$/);
  if (closureCountMatch) {
    const [, leading, count, trailing] = closureCountMatch;
    return `${leading}${cycleCopy.closureCount(count)}${trailing}`;
  }

  const highFcrCountMatch = value.match(/^(\s*)(\d+) ponds? exceeded the 1\.80 FCR review level\.(\s*)$/);
  if (highFcrCountMatch) {
    const [, leading, count, trailing] = highFcrCountMatch;
    return `${leading}${cycleCopy.highFcrCount(count)}${trailing}`;
  }

  const lowSurvivalCountMatch = value.match(/^(\s*)(\d+) ponds? finished below 75% actual survival\.(\s*)$/);
  if (lowSurvivalCountMatch) {
    const [, leading, count, trailing] = lowSurvivalCountMatch;
    return `${leading}${cycleCopy.lowSurvivalCount(count)}${trailing}`;
  }

  const samplingCoverageMatch = value.match(/^(\s*)(.+?)% of ponds have valid MBW sampling\.(\s*)$/);
  if (samplingCoverageMatch) {
    const [, leading, coverage, trailing] = samplingCoverageMatch;
    return `${leading}${cycleCopy.samplingCoverage(coverage)}${trailing}`;
  }

  const mbwMovementMatch = value.match(/^(\s*)(.+?) g to (.+?) g(\s*)$/);
  if (mbwMovementMatch) {
    const [, leading, previous, current, trailing] = mbwMovementMatch;
    return `${leading}${cycleCopy.mbwMovement(previous, current)}${trailing}`;
  }

  const yieldMatch = value.match(/^(\s*)(.+?) t\/ha yield(\s*)$/);
  if (yieldMatch) {
    const [, leading, amount, trailing] = yieldMatch;
    return `${leading}${cycleCopy.yield(amount)}${trailing}`;
  }

  const pageMatch = value.match(/^(\s*)Page\s+(\d+)\s+of\s+(\d+)(\s*)$/);
  if (pageMatch) {
    const [, leading, current, total, trailing] = pageMatch;
    const pageText: Record<Exclude<PdfLanguage, 'en'>, string> = {
      id: `Halaman ${current} dari ${total}`,
      th: `หน้า ${current} จาก ${total}`,
      vi: `Trang ${current} / ${total}`,
      zh: `第 ${current} 页，共 ${total} 页`,
    };
    return `${leading}${pageText[normalized]}${trailing}`;
  }

  const projectionSizeMatch = value.match(/^(\s*)Size (.+?) in (.+?) days; revenue (.+?)(\s*)$/);
  if (projectionSizeMatch) {
    const [, leading, size, days, revenue, trailing] = projectionSizeMatch;
    const projectionText: Record<Exclude<PdfLanguage, 'en'>, string> = {
      id: `Ukuran ${size} dalam ${days} hari; pendapatan ${revenue}`,
      th: `ขนาด ${size} ใน ${days} วัน; รายได้ ${revenue}`,
      vi: `Cỡ ${size} trong ${days} ngày; doanh thu ${revenue}`,
      zh: `规格 ${size}，用时 ${days} 天；收入 ${revenue}`,
    };
    return `${leading}${projectionText[normalized]}${trailing}`;
  }

  const trimmed = value.trim();
  const exactPhrase = pdfPhraseByEnglish.get(trimmed);
  if (exactPhrase && isStandalonePdfWord(exactPhrase.en)) {
    const leadingWhitespace = value.match(/^\s*/)?.[0] ?? '';
    const trailingWhitespace = value.match(/\s*$/)?.[0] ?? '';
    return `${leadingWhitespace}${exactPhrase[normalized]}${trailingWhitespace}`;
  }

  return value.replace(
    pdfPhraseReplacementPattern,
    (matched) => pdfPhraseByEnglish.get(matched)?.[normalized] ?? matched,
  );
};

export const localizePdfHtml = (html: string, language?: string | null): string => {
  const normalized = normalizePdfLanguage(language);
  const localized = html.replace(
    />([^<>]+)</g,
    (match, text: string) => `>${localizePdfText(text, normalized)}<`,
  );

  return localized.replace(/<html(?![^>]*\blang=)([^>]*)>/i, `<html lang="${normalized}"$1>`);
};

export const formatPdfDate = (
  value: string | number | Date,
  language?: string | null,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  return date.toLocaleDateString(getPdfLocale(language), dateOnly ? { ...options, timeZone: 'UTC' } : options);
};

export const formatPdfDateTime = (
  value: string | number | Date,
  language?: string | null,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString(getPdfLocale(language), options);
};

export const formatPdfNumber = (
  value: number,
  language?: string | null,
  options?: Intl.NumberFormatOptions,
): string => new Intl.NumberFormat(getPdfLocale(language), options).format(Number.isFinite(value) ? value : 0);
