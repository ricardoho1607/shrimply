import { normalizeProductionExpenseCategory } from './financeExpenseAllocation';

const en = {
  pond: 'pond', block: 'block',
  salary: 'Salary', consumption: 'Consumption', diesel: 'Solar / Diesel', petrol: 'Bensin / Petrol', seed: 'Seed / PL',
  production: 'Production operating expenses', selectPonds: 'Select ponds', search: 'Search pond, block or cycle',
  selected: 'selected', ponds: 'ponds', blocks: 'blocks', unassigned: 'Unassigned block', selectBlock: 'Select block', clearBlock: 'Clear block',
  quantity: 'PL quantity', totalArea: 'Total active area', totalPl: 'Total PL', areaHint: 'Shared across active ponds by area.',
  plHint: 'Select the ponds supplied by this invoice. Shares follow PL quantity.', done: 'Done', close: 'Close',
  breakdown: 'Pond allocations', hpp: 'HPP by pond', unallocated: 'Unallocated production costs', billTotal: 'Invoice total',
  saved: 'Using the saved pond allocation.', recalculate: 'Use current active ponds',
  invalidAmount: 'Enter a valid amount greater than zero.', noPonds: 'No eligible ponds. Select ponds or check active production cycles.',
  missingArea: 'Every included pond needs a recorded area greater than zero. Correct pond areas before saving.',
  missingQuantity: 'Enter a positive whole PL quantity for every selected pond.', missingCycle: 'Every included pond must belong to a production cycle.',
};
export type FinanceAllocationCopy = typeof en;
const translations: Record<string, Partial<FinanceAllocationCopy>> = {
  id: {
    pond: 'kolam', block: 'blok',
    salary: 'Gaji', consumption: 'Konsumsi', diesel: 'Solar / Diesel', petrol: 'Bensin / Petrol', seed: 'Bibit / PL',
    production: 'Biaya operasional produksi', selectPonds: 'Pilih kolam', search: 'Cari kolam, blok atau siklus', selected: 'dipilih', ponds: 'kolam', blocks: 'blok', unassigned: 'Tanpa blok', selectBlock: 'Pilih blok', clearBlock: 'Batalkan blok',
    quantity: 'Jumlah PL', totalArea: 'Total luas aktif', totalPl: 'Total PL', areaHint: 'Dibagi ke kolam aktif berdasarkan luas.', plHint: 'Pilih kolam yang menerima PL dari faktur ini. Alokasi mengikuti jumlah PL.', done: 'Selesai', close: 'Tutup',
    breakdown: 'Alokasi per kolam', hpp: 'HPP per kolam', unallocated: 'Biaya produksi belum dialokasikan', billTotal: 'Total faktur', saved: 'Menggunakan alokasi kolam tersimpan.', recalculate: 'Gunakan kolam aktif saat ini',
    invalidAmount: 'Masukkan jumlah valid lebih besar dari nol.', noPonds: 'Tidak ada kolam yang memenuhi syarat. Pilih kolam atau periksa siklus aktif.', missingArea: 'Setiap kolam harus memiliki luas lebih besar dari nol. Perbaiki luas kolam sebelum menyimpan.', missingQuantity: 'Masukkan jumlah PL berupa bilangan bulat positif untuk setiap kolam terpilih.', missingCycle: 'Setiap kolam harus terkait dengan siklus produksi.',
  },
  zh: {
    pond: '池塘', block: '区域',
    salary: '工资', consumption: '员工餐食', diesel: '柴油', petrol: '汽油', seed: '虾苗 / PL', production: '生产运营费用', selectPonds: '选择池塘', search: '搜索池塘、区域或周期', selected: '已选择', ponds: '池塘', blocks: '区域', unassigned: '未分配区域', selectBlock: '选择区域', clearBlock: '取消区域', quantity: 'PL数量', totalArea: '活跃池塘总面积', totalPl: 'PL总数', areaHint: '按面积分配至活跃池塘。', plHint: '选择该发票供应的池塘，按PL数量分配。', done: '完成', close: '关闭', breakdown: '池塘费用分配', hpp: '池塘生产成本', unallocated: '未分配生产成本', billTotal: '发票总额', saved: '使用已保存的池塘分配。', recalculate: '使用当前活跃池塘', invalidAmount: '请输入大于零的有效金额。', noPonds: '没有符合条件的池塘。请选择池塘或检查生产周期。', missingArea: '每个池塘的面积必须大于零。保存前请完善面积。', missingQuantity: '请为每个选定池塘输入正整数PL数量。', missingCycle: '每个池塘必须关联生产周期。',
  },
  th: {
    pond: 'บ่อ', block: 'บล็อก',
    salary: 'เงินเดือน', consumption: 'อาหารพนักงาน', diesel: 'ดีเซล', petrol: 'เบนซิน', seed: 'ลูกกุ้ง / PL', production: 'ค่าใช้จ่ายดำเนินการผลิต', selectPonds: 'เลือกบ่อ', search: 'ค้นหาบ่อ บล็อก หรือรอบ', selected: 'เลือกแล้ว', ponds: 'บ่อ', blocks: 'บล็อก', unassigned: 'ไม่มีบล็อก', selectBlock: 'เลือกบล็อก', clearBlock: 'ยกเลิกบล็อก', quantity: 'จำนวน PL', totalArea: 'พื้นที่บ่อใช้งานทั้งหมด', totalPl: 'PL ทั้งหมด', areaHint: 'แบ่งให้บ่อที่ใช้งานตามพื้นที่', plHint: 'เลือกบ่อที่รับ PL ตามใบแจ้งหนี้ แล้วจัดสรรตามจำนวน PL', done: 'เสร็จสิ้น', close: 'ปิด', breakdown: 'การจัดสรรค่าใช้จ่ายต่อบ่อ', hpp: 'ต้นทุนการผลิตต่อบ่อ', unallocated: 'ต้นทุนผลิตที่ยังไม่จัดสรร', billTotal: 'ยอดใบแจ้งหนี้', saved: 'ใช้การจัดสรรบ่อที่บันทึกไว้', recalculate: 'ใช้บ่อที่ใช้งานปัจจุบัน', invalidAmount: 'กรอกจำนวนเงินที่มากกว่าศูนย์', noPonds: 'ไม่มีบ่อที่เข้าเกณฑ์ เลือกบ่อหรือตรวจสอบรอบการผลิต', missingArea: 'ทุกบ่อต้องมีพื้นที่มากกว่าศูนย์ แก้ไขพื้นที่ก่อนบันทึก', missingQuantity: 'กรอกจำนวน PL เป็นจำนวนเต็มบวกสำหรับทุกบ่อที่เลือก', missingCycle: 'ทุกบ่อต้องเชื่อมโยงกับรอบการผลิต',
  },
  vi: {
    pond: 'ao', block: 'khu',
    salary: 'Lương', consumption: 'Suất ăn', diesel: 'Dầu diesel', petrol: 'Xăng', seed: 'Giống / PL', production: 'Chi phí vận hành sản xuất', selectPonds: 'Chọn ao', search: 'Tìm ao, khu hoặc vụ nuôi', selected: 'đã chọn', ponds: 'ao', blocks: 'khu', unassigned: 'Chưa có khu', selectBlock: 'Chọn khu', clearBlock: 'Bỏ chọn khu', quantity: 'Số lượng PL', totalArea: 'Tổng diện tích ao hoạt động', totalPl: 'Tổng PL', areaHint: 'Phân bổ cho ao hoạt động theo diện tích.', plHint: 'Chọn ao nhận PL từ hóa đơn này. Phân bổ theo số lượng PL.', done: 'Xong', close: 'Đóng', breakdown: 'Phân bổ chi phí theo ao', hpp: 'Giá thành theo ao', unallocated: 'Chi phí sản xuất chưa phân bổ', billTotal: 'Tổng hóa đơn', saved: 'Dùng phân bổ ao đã lưu.', recalculate: 'Dùng ao hoạt động hiện tại', invalidAmount: 'Nhập số tiền hợp lệ lớn hơn không.', noPonds: 'Không có ao phù hợp. Chọn ao hoặc kiểm tra vụ nuôi đang hoạt động.', missingArea: 'Mỗi ao cần diện tích lớn hơn không. Sửa diện tích trước khi lưu.', missingQuantity: 'Nhập số PL nguyên dương cho mỗi ao đã chọn.', missingCycle: 'Mỗi ao phải thuộc một vụ nuôi.',
  },
};
export const getFinanceAllocationCopy = (language: string): FinanceAllocationCopy => ({ ...en, ...translations[language] });
export const productionExpenseLabel = (category: string, copy: FinanceAllocationCopy): string => {
  const labels: Record<string, string> = { Salary: copy.salary, Consumption: copy.consumption, Diesel: copy.diesel, Petrol: copy.petrol, 'Seed / PL': copy.seed };
  return labels[normalizeProductionExpenseCategory(category)] || category;
};
