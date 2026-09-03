const en = {
  enterpriseCycle: {
    enterpriseView: 'Enterprise', normalView: 'Normal',
    dashboardTitle: 'Enterprise dashboard', companyFallback: 'Company', officeDisplay: 'Office display', add: 'Add',
    loading: 'Loading enterprise blocks…', createBlocksTitle: 'Create blocks before production cycles',
    createBlocksBody: 'Blocks remain the permanent structure for ponds and technician access.', managePondsBlocks: 'Manage ponds and blocks',
    createFirstCycle: 'Create the first enterprise production cycle', noPonds: 'No {{status}} ponds',
    inactivePonds: '{{count}} inactive ponds', continue: 'Continue', createCycle: 'Create cycle', inactive: 'Inactive',
    started: 'Started {{date}} · {{technician}}', notStarted: 'Not started', ended: 'Ended',
    eyebrow: 'Enterprise cycle', editCycle: 'Edit cycle', continueCycle: 'Continue {{cycleName}}', createProductionCycle: 'Create production cycle',
    editDescription: 'Update the cycle name or its assigned block.', chooseBlockDate: 'Choose one block and its stocking date.',
    stockingDetails: 'Enter stocking details for every pond in {{blockName}}.', blockFallback: 'the block',
    cycleName: 'Cycle name', defaultCycleName: 'Production Cycle {{number}}', plannedStart: 'Planned start', blockInCycle: 'Block in this cycle',
    noBlocksAvailable: 'All blocks are already assigned to other open cycles.', inProduction: 'In production', saveChanges: 'Save changes',
    pondsReady: '{{completed}} of {{total}} ponds ready', densitySupplierRequired: 'Stocking date, density, and supplier are required for every pond.',
    stockingMissing: 'Stocking details not entered', stockingDate: 'Stocking date', density: 'Density (PL/m²)', supplier: 'Supplier', hatcheryName: 'Hatchery name',
    startRemainingPonds: 'Start remaining ponds', startProductionCycle: 'Start production cycle', startingBlock: 'Starting block…',
    viewCycleReport: 'View cycle report', closeCycle: 'Close cycle', closeCycleConfirm: 'Close {{cycleName}}?',
    endActivePondsFirst: 'End the active pond cycles first: {{pondNames}}', closeCycleDescription: 'Close {{cycleName}}? This will not change any other block or cycle.',
    addPrompt: 'What would you like to add?', addPromptDescription: 'Choose an enterprise production item.', addItemLabel: 'Add enterprise item',
    newProductionCycle: 'New production cycle', newBlock: 'New block', newPond: 'New pond',
    newBlockDescription: 'Create a block and optionally assign its technician.', newPondDescription: 'Add the physical pond and assign it to a block.',
    technician: 'Technician', selectBlock: 'Select block', pondName: 'Pond name', pondArea: 'Pond area (m²)',
    createBlock: 'Create block', creatingBlock: 'Creating block…', createPond: 'Create pond', creatingPond: 'Creating pond…',
    duplicateBlock: 'A block with this name already exists.', duplicatePond: 'A pond with this name already exists.',
    cycleSaveFailed: 'Failed to save the production cycle.', pondCreateFailed: 'Failed to create pond.',
    stableHealth: 'Pond health is stable', manageBlocks: 'Manage blocks', manageBlocksDescription: 'Create blocks or update their assigned technician.',
  },
  harvestCycle: {
    selectedCycle: 'Selected cycle', cycleHistory: 'Cycle history', noActiveCycle: 'No active cycle', allCompletedCycles: 'All completed cycles',
    blockFallback: 'Block', activePonds: '{{blockName}} · {{count}} active ponds', historicalRecords: '{{count}} historical harvest records',
    currentCycle: 'Current cycle', history: 'History', productionCycle: 'Production cycle', selectActiveCycle: 'Select active cycle',
    harvestRecords: 'Harvest records', selectProductionCycle: 'Select production cycle', noActiveCycles: 'No active production cycles available.',
    selectCompletedCycle: 'Select completed cycle', harvestHistory: 'Harvest history', noCompletedCycles: 'No completed production cycles available.',
    blockNotAssigned: 'Block not assigned', harvestDate: 'Harvest date', sameCycleRequired: 'Harvest ponds must belong to the selected cycle.',
    searchPond: 'Search by pond name…', logHarvest: 'Log harvest', totalEstimatedRevenue: 'Total estimated revenue',
    totalHarvestedBiomass: 'Total harvested biomass', currentCycleRecords: 'Current cycle records', historicalRecordLabel: 'Historical records',
    currentHarvests: 'Current cycle harvests', activePondsAvailable: '{{blockName}} · {{count}} active ponds available for harvest',
    completedRecords: 'Completed or inactive cycle harvest records', noCurrentRecords: 'No current cycle harvest records found.', noHistoricalRecords: 'No historical harvest records found.',
    allHistory: 'All history', selectPond: 'Select pond', choosePond: 'Choose a pond…', averageSize: 'Avg. size (pcs/kg)',
    mainBiomass: 'Main biomass (kg)', mainPrice: 'Main price ({{currency}}/kg)', subBiomass: 'Sub biomass (optional)',
    subSize: 'Sub size (pcs/kg)', subPrice: 'Sub price ({{currency}}/kg, optional)', deleteConfirm: 'Delete this harvest record?', saveFailed: 'Failed to log harvest.',
  },
  financeCycle: {
    cycle: 'Cycle', allHistory: 'All history', selectCycle: 'Select cycle', allocateToCycle: 'Allocate to cycle',
    selectCycleTitle: 'Select cycle', selectCycleMessage: 'Choose the production cycle for this transaction.',
    splitAcrossPonds: 'Split equally across {{count}} ponds in {{cycleName}}.', category: 'Category', amount: 'Amount ({{currency}})',
    general: 'General', feed: 'Feed', chemicals: 'Chemicals', probiotics: 'Probiotics', selectPeriod: 'Select period', inventoryAdjustment: 'Inventory adjustment',
    logTransaction: 'Log {{type}}', saveFailed: 'Failed to save transaction.',
  },
} as const;

type FeatureTranslation = {
  [Section in keyof typeof en]: { [Key in keyof typeof en[Section]]: string };
};

const id: FeatureTranslation = {
  enterpriseCycle: {
    enterpriseView: 'Enterprise', normalView: 'Normal',
    dashboardTitle: 'Dasbor enterprise', companyFallback: 'Perusahaan', officeDisplay: 'Tampilan kantor', add: 'Tambah',
    loading: 'Memuat blok enterprise…', createBlocksTitle: 'Buat blok sebelum siklus produksi', createBlocksBody: 'Blok menjadi struktur permanen untuk kolam dan akses teknisi.', managePondsBlocks: 'Kelola kolam dan blok',
    createFirstCycle: 'Buat siklus produksi enterprise pertama', noPonds: 'Tidak ada kolam {{status}}', inactivePonds: '{{count}} kolam tidak aktif', continue: 'Lanjutkan', createCycle: 'Buat siklus', inactive: 'Tidak aktif',
    started: 'Dimulai {{date}} · {{technician}}', notStarted: 'Belum dimulai', ended: 'Berakhir', eyebrow: 'Siklus enterprise', editCycle: 'Edit siklus', continueCycle: 'Lanjutkan {{cycleName}}', createProductionCycle: 'Buat siklus produksi',
    editDescription: 'Perbarui nama siklus atau blok yang ditetapkan.', chooseBlockDate: 'Pilih satu blok dan tanggal tebar.', stockingDetails: 'Masukkan detail tebar untuk setiap kolam di {{blockName}}.', blockFallback: 'blok tersebut',
    cycleName: 'Nama siklus', defaultCycleName: 'Siklus Produksi {{number}}', plannedStart: 'Mulai direncanakan', blockInCycle: 'Blok dalam siklus ini', noBlocksAvailable: 'Semua blok sudah ditetapkan ke siklus terbuka lain.', inProduction: 'Sedang produksi', saveChanges: 'Simpan perubahan',
    pondsReady: '{{completed}} dari {{total}} kolam siap', densitySupplierRequired: 'Tanggal tebar, kepadatan, dan pemasok wajib diisi untuk setiap kolam.', stockingMissing: 'Detail tebar belum diisi', stockingDate: 'Tanggal tebar', density: 'Kepadatan (PL/m²)', supplier: 'Pemasok', hatcheryName: 'Nama hatchery',
    startRemainingPonds: 'Mulai kolam tersisa', startProductionCycle: 'Mulai siklus produksi', startingBlock: 'Memulai blok…', viewCycleReport: 'Lihat laporan siklus', closeCycle: 'Tutup siklus', closeCycleConfirm: 'Tutup {{cycleName}}?',
    endActivePondsFirst: 'Akhiri siklus kolam aktif terlebih dahulu: {{pondNames}}', closeCycleDescription: 'Tutup {{cycleName}}? Ini tidak akan mengubah blok atau siklus lain.', addPrompt: 'Apa yang ingin Anda tambahkan?', addPromptDescription: 'Pilih item produksi enterprise.', addItemLabel: 'Tambah item enterprise',
    newProductionCycle: 'Siklus produksi baru', newBlock: 'Blok baru', newPond: 'Kolam baru', newBlockDescription: 'Buat blok dan tetapkan teknisi bila diperlukan.', newPondDescription: 'Tambahkan kolam fisik dan tetapkan ke blok.', technician: 'Teknisi', selectBlock: 'Pilih blok', pondName: 'Nama kolam', pondArea: 'Luas kolam (m²)',
    createBlock: 'Buat blok', creatingBlock: 'Membuat blok…', createPond: 'Buat kolam', creatingPond: 'Membuat kolam…', duplicateBlock: 'Blok dengan nama ini sudah ada.', duplicatePond: 'Kolam dengan nama ini sudah ada.', cycleSaveFailed: 'Gagal menyimpan siklus produksi.', pondCreateFailed: 'Gagal membuat kolam.',
    stableHealth: 'Kesehatan kolam stabil', manageBlocks: 'Kelola blok', manageBlocksDescription: 'Buat blok atau perbarui teknisi yang ditetapkan.',
  },
  harvestCycle: {
    selectedCycle: 'Siklus terpilih', cycleHistory: 'Riwayat siklus', noActiveCycle: 'Tidak ada siklus aktif', allCompletedCycles: 'Semua siklus selesai', blockFallback: 'Blok', activePonds: '{{blockName}} · {{count}} kolam aktif', historicalRecords: '{{count}} catatan panen historis',
    currentCycle: 'Siklus aktif', history: 'Riwayat', productionCycle: 'Siklus produksi', selectActiveCycle: 'Pilih siklus aktif', harvestRecords: 'Catatan panen', selectProductionCycle: 'Pilih siklus produksi', noActiveCycles: 'Tidak ada siklus produksi aktif.', selectCompletedCycle: 'Pilih siklus selesai', harvestHistory: 'Riwayat panen', noCompletedCycles: 'Tidak ada siklus produksi selesai.',
    blockNotAssigned: 'Blok belum ditetapkan', harvestDate: 'Tanggal panen', sameCycleRequired: 'Kolam panen harus berasal dari siklus yang dipilih.', searchPond: 'Cari berdasarkan nama kolam…', logHarvest: 'Catat panen', totalEstimatedRevenue: 'Total perkiraan pendapatan', totalHarvestedBiomass: 'Total biomassa dipanen', currentCycleRecords: 'Catatan siklus aktif', historicalRecordLabel: 'Catatan historis',
    currentHarvests: 'Panen siklus aktif', activePondsAvailable: '{{blockName}} · {{count}} kolam aktif tersedia untuk panen', completedRecords: 'Catatan panen siklus selesai atau tidak aktif', noCurrentRecords: 'Tidak ada catatan panen siklus aktif.', noHistoricalRecords: 'Tidak ada catatan panen historis.', allHistory: 'Semua riwayat', selectPond: 'Pilih kolam', choosePond: 'Pilih kolam…', averageSize: 'Ukuran rata-rata (ekor/kg)',
    mainBiomass: 'Biomassa utama (kg)', mainPrice: 'Harga utama ({{currency}}/kg)', subBiomass: 'Biomassa tambahan (opsional)', subSize: 'Ukuran tambahan (ekor/kg)', subPrice: 'Harga tambahan ({{currency}}/kg, opsional)', deleteConfirm: 'Hapus catatan panen ini?', saveFailed: 'Gagal mencatat panen.',
  },
  financeCycle: {
    cycle: 'Siklus', allHistory: 'Semua riwayat', selectCycle: 'Pilih siklus', allocateToCycle: 'Alokasikan ke siklus', selectCycleTitle: 'Pilih siklus', selectCycleMessage: 'Pilih siklus produksi untuk transaksi ini.', splitAcrossPonds: 'Dibagi rata ke {{count}} kolam di {{cycleName}}.', category: 'Kategori', amount: 'Jumlah ({{currency}})', general: 'Umum', feed: 'Pakan', chemicals: 'Bahan kimia', probiotics: 'Probiotik', selectPeriod: 'Pilih periode', inventoryAdjustment: 'Penyesuaian persediaan', logTransaction: 'Catat {{type}}', saveFailed: 'Gagal menyimpan transaksi.',
  },
};

const th: FeatureTranslation = {
  enterpriseCycle: {
    enterpriseView: 'องค์กร', normalView: 'ปกติ',
    dashboardTitle: 'แดชบอร์ดองค์กร', companyFallback: 'บริษัท', officeDisplay: 'หน้าจอสำนักงาน', add: 'เพิ่ม', loading: 'กำลังโหลดบล็อกองค์กร…', createBlocksTitle: 'สร้างบล็อกก่อนรอบการผลิต', createBlocksBody: 'บล็อกเป็นโครงสร้างถาวรสำหรับบ่อและสิทธิ์ของช่างเทคนิค', managePondsBlocks: 'จัดการบ่อและบล็อก', createFirstCycle: 'สร้างรอบการผลิตองค์กรรอบแรก', noPonds: 'ไม่มีบ่อสถานะ {{status}}', inactivePonds: 'บ่อไม่ทำงาน {{count}} บ่อ', continue: 'ดำเนินการต่อ', createCycle: 'สร้างรอบ', inactive: 'ไม่ทำงาน', started: 'เริ่ม {{date}} · {{technician}}', notStarted: 'ยังไม่เริ่ม', ended: 'สิ้นสุด', eyebrow: 'รอบองค์กร', editCycle: 'แก้ไขรอบ', continueCycle: 'ดำเนินการต่อ {{cycleName}}', createProductionCycle: 'สร้างรอบการผลิต', editDescription: 'อัปเดตชื่อรอบหรือบล็อกที่กำหนด', chooseBlockDate: 'เลือกหนึ่งบล็อกและวันที่ปล่อยกุ้ง', stockingDetails: 'กรอกรายละเอียดการปล่อยกุ้งสำหรับทุกบ่อใน {{blockName}}', blockFallback: 'บล็อกนี้', cycleName: 'ชื่อรอบ', defaultCycleName: 'รอบการผลิต {{number}}', plannedStart: 'วันที่เริ่มตามแผน', blockInCycle: 'บล็อกในรอบนี้', noBlocksAvailable: 'บล็อกทั้งหมดถูกกำหนดให้รอบอื่นที่เปิดอยู่แล้ว', inProduction: 'กำลังผลิต', saveChanges: 'บันทึกการเปลี่ยนแปลง', pondsReady: 'พร้อมแล้ว {{completed}} จาก {{total}} บ่อ', densitySupplierRequired: 'ทุกบ่อต้องระบุวันที่ปล่อยกุ้ง ความหนาแน่น และผู้จัดหา', stockingMissing: 'ยังไม่ได้กรอกรายละเอียดการปล่อยกุ้ง', stockingDate: 'วันที่ปล่อยกุ้ง', density: 'ความหนาแน่น (PL/m²)', supplier: 'ผู้จัดหา', hatcheryName: 'ชื่อโรงเพาะฟัก', startRemainingPonds: 'เริ่มบ่อที่เหลือ', startProductionCycle: 'เริ่มรอบการผลิต', startingBlock: 'กำลังเริ่มบล็อก…', viewCycleReport: 'ดูรายงานรอบ', closeCycle: 'ปิดรอบ', closeCycleConfirm: 'ปิด {{cycleName}} หรือไม่?', endActivePondsFirst: 'สิ้นสุดรอบบ่อที่ยังทำงานก่อน: {{pondNames}}', closeCycleDescription: 'ปิด {{cycleName}} หรือไม่? การดำเนินการนี้จะไม่เปลี่ยนบล็อกหรือรอบอื่น', addPrompt: 'คุณต้องการเพิ่มอะไร?', addPromptDescription: 'เลือกรายการผลิตขององค์กร', addItemLabel: 'เพิ่มรายการองค์กร', newProductionCycle: 'รอบการผลิตใหม่', newBlock: 'บล็อกใหม่', newPond: 'บ่อใหม่', newBlockDescription: 'สร้างบล็อกและกำหนดช่างเทคนิคได้', newPondDescription: 'เพิ่มบ่อจริงและกำหนดให้บล็อก', technician: 'ช่างเทคนิค', selectBlock: 'เลือกบล็อก', pondName: 'ชื่อบ่อ', pondArea: 'พื้นที่บ่อ (m²)', createBlock: 'สร้างบล็อก', creatingBlock: 'กำลังสร้างบล็อก…', createPond: 'สร้างบ่อ', creatingPond: 'กำลังสร้างบ่อ…', duplicateBlock: 'มีบล็อกชื่อนี้แล้ว', duplicatePond: 'มีบ่อชื่อนี้แล้ว', cycleSaveFailed: 'บันทึกรอบการผลิตไม่สำเร็จ', pondCreateFailed: 'สร้างบ่อไม่สำเร็จ', stableHealth: 'สุขภาพบ่อคงที่', manageBlocks: 'จัดการบล็อก', manageBlocksDescription: 'สร้างบล็อกหรืออัปเดตช่างเทคนิคที่กำหนด',
  },
  harvestCycle: {
    selectedCycle: 'รอบที่เลือก', cycleHistory: 'ประวัติรอบ', noActiveCycle: 'ไม่มีรอบที่ทำงาน', allCompletedCycles: 'รอบที่เสร็จทั้งหมด', blockFallback: 'บล็อก', activePonds: '{{blockName}} · บ่อทำงาน {{count}} บ่อ', historicalRecords: 'ประวัติการเก็บเกี่ยว {{count}} รายการ', currentCycle: 'รอบปัจจุบัน', history: 'ประวัติ', productionCycle: 'รอบการผลิต', selectActiveCycle: 'เลือกรอบที่ทำงาน', harvestRecords: 'บันทึกการเก็บเกี่ยว', selectProductionCycle: 'เลือกรอบการผลิต', noActiveCycles: 'ไม่มีรอบการผลิตที่ทำงาน', selectCompletedCycle: 'เลือกรอบที่เสร็จแล้ว', harvestHistory: 'ประวัติการเก็บเกี่ยว', noCompletedCycles: 'ไม่มีรอบการผลิตที่เสร็จแล้ว', blockNotAssigned: 'ยังไม่ได้กำหนดบล็อก', harvestDate: 'วันที่เก็บเกี่ยว', sameCycleRequired: 'บ่อเก็บเกี่ยวต้องอยู่ในรอบที่เลือก', searchPond: 'ค้นหาด้วยชื่อบ่อ…', logHarvest: 'บันทึกการเก็บเกี่ยว', totalEstimatedRevenue: 'รายได้ประมาณการรวม', totalHarvestedBiomass: 'ชีวมวลที่เก็บเกี่ยวรวม', currentCycleRecords: 'บันทึกรอบปัจจุบัน', historicalRecordLabel: 'บันทึกย้อนหลัง', currentHarvests: 'การเก็บเกี่ยวรอบปัจจุบัน', activePondsAvailable: '{{blockName}} · มีบ่อทำงาน {{count}} บ่อสำหรับเก็บเกี่ยว', completedRecords: 'บันทึกการเก็บเกี่ยวของรอบที่เสร็จหรือไม่ทำงาน', noCurrentRecords: 'ไม่พบบันทึกการเก็บเกี่ยวรอบปัจจุบัน', noHistoricalRecords: 'ไม่พบบันทึกการเก็บเกี่ยวย้อนหลัง', allHistory: 'ประวัติทั้งหมด', selectPond: 'เลือกบ่อ', choosePond: 'เลือกบ่อ…', averageSize: 'ขนาดเฉลี่ย (ตัว/กก.)', mainBiomass: 'ชีวมวลหลัก (กก.)', mainPrice: 'ราคาหลัก ({{currency}}/กก.)', subBiomass: 'ชีวมวลรอง (ไม่บังคับ)', subSize: 'ขนาดรอง (ตัว/กก.)', subPrice: 'ราคารอง ({{currency}}/กก., ไม่บังคับ)', deleteConfirm: 'ลบบันทึกการเก็บเกี่ยวนี้หรือไม่?', saveFailed: 'บันทึกการเก็บเกี่ยวไม่สำเร็จ',
  },
  financeCycle: { cycle: 'รอบ', allHistory: 'ประวัติทั้งหมด', selectCycle: 'เลือกรอบ', allocateToCycle: 'จัดสรรให้รอบ', selectCycleTitle: 'เลือกรอบ', selectCycleMessage: 'เลือกรอบการผลิตสำหรับธุรกรรมนี้', splitAcrossPonds: 'แบ่งเท่ากันใน {{count}} บ่อของ {{cycleName}}', category: 'หมวดหมู่', amount: 'จำนวนเงิน ({{currency}})', general: 'ทั่วไป', feed: 'อาหาร', chemicals: 'สารเคมี', probiotics: 'โพรไบโอติก', selectPeriod: 'เลือกช่วงเวลา', inventoryAdjustment: 'การปรับสินค้าคงคลัง', logTransaction: 'บันทึก {{type}}', saveFailed: 'บันทึกธุรกรรมไม่สำเร็จ' },
};

const zh: FeatureTranslation = {
  enterpriseCycle: {
    enterpriseView: '企业', normalView: '普通',
    dashboardTitle: '企业控制台', companyFallback: '公司', officeDisplay: '办公室显示', add: '添加', loading: '正在加载企业分区…', createBlocksTitle: '请先创建分区再创建生产周期', createBlocksBody: '分区是池塘和技术员权限的永久结构。', managePondsBlocks: '管理池塘和分区', createFirstCycle: '创建第一个企业生产周期', noPonds: '没有{{status}}池塘', inactivePonds: '{{count}} 个未启用池塘', continue: '继续', createCycle: '创建周期', inactive: '未启用', started: '开始于 {{date}} · {{technician}}', notStarted: '尚未开始', ended: '已结束', eyebrow: '企业周期', editCycle: '编辑周期', continueCycle: '继续 {{cycleName}}', createProductionCycle: '创建生产周期', editDescription: '更新周期名称或分配的分区。', chooseBlockDate: '选择一个分区和放苗日期。', stockingDetails: '为 {{blockName}} 的每个池塘填写放苗信息。', blockFallback: '该分区', cycleName: '周期名称', defaultCycleName: '生产周期 {{number}}', plannedStart: '计划开始', blockInCycle: '本周期的分区', noBlocksAvailable: '所有分区都已分配给其他开放周期。', inProduction: '生产中', saveChanges: '保存更改', pondsReady: '{{completed}}/{{total}} 个池塘已就绪', densitySupplierRequired: '每个池塘都必须填写放苗日期、密度和供应商。', stockingMissing: '尚未填写放苗信息', stockingDate: '放苗日期', density: '密度 (PL/m²)', supplier: '供应商', hatcheryName: '苗场名称', startRemainingPonds: '启动剩余池塘', startProductionCycle: '启动生产周期', startingBlock: '正在启动分区…', viewCycleReport: '查看周期报告', closeCycle: '关闭周期', closeCycleConfirm: '关闭 {{cycleName}}？', endActivePondsFirst: '请先结束仍在运行的池塘周期：{{pondNames}}', closeCycleDescription: '关闭 {{cycleName}}？这不会更改其他分区或周期。', addPrompt: '您想添加什么？', addPromptDescription: '选择企业生产项目。', addItemLabel: '添加企业项目', newProductionCycle: '新生产周期', newBlock: '新分区', newPond: '新池塘', newBlockDescription: '创建分区并可选择分配技术员。', newPondDescription: '添加实体池塘并分配到分区。', technician: '技术员', selectBlock: '选择分区', pondName: '池塘名称', pondArea: '池塘面积 (m²)', createBlock: '创建分区', creatingBlock: '正在创建分区…', createPond: '创建池塘', creatingPond: '正在创建池塘…', duplicateBlock: '已存在同名分区。', duplicatePond: '已存在同名池塘。', cycleSaveFailed: '保存生产周期失败。', pondCreateFailed: '创建池塘失败。', stableHealth: '池塘健康状况稳定', manageBlocks: '管理分区', manageBlocksDescription: '创建分区或更新分配的技术员。',
  },
  harvestCycle: {
    selectedCycle: '已选周期', cycleHistory: '周期历史', noActiveCycle: '没有活动周期', allCompletedCycles: '所有已完成周期', blockFallback: '分区', activePonds: '{{blockName}} · {{count}} 个活动池塘', historicalRecords: '{{count}} 条历史收获记录', currentCycle: '当前周期', history: '历史', productionCycle: '生产周期', selectActiveCycle: '选择活动周期', harvestRecords: '收获记录', selectProductionCycle: '选择生产周期', noActiveCycles: '没有活动的生产周期。', selectCompletedCycle: '选择已完成周期', harvestHistory: '收获历史', noCompletedCycles: '没有已完成的生产周期。', blockNotAssigned: '未分配分区', harvestDate: '收获日期', sameCycleRequired: '收获池塘必须属于所选周期。', searchPond: '按池塘名称搜索…', logHarvest: '记录收获', totalEstimatedRevenue: '预计总收入', totalHarvestedBiomass: '总收获生物量', currentCycleRecords: '当前周期记录', historicalRecordLabel: '历史记录', currentHarvests: '当前周期收获', activePondsAvailable: '{{blockName}} · {{count}} 个活动池塘可收获', completedRecords: '已完成或未启用周期的收获记录', noCurrentRecords: '未找到当前周期收获记录。', noHistoricalRecords: '未找到历史收获记录。', allHistory: '全部历史', selectPond: '选择池塘', choosePond: '请选择池塘…', averageSize: '平均规格（尾/公斤）', mainBiomass: '主要生物量（公斤）', mainPrice: '主要价格（{{currency}}/公斤）', subBiomass: '次级生物量（可选）', subSize: '次级规格（尾/公斤）', subPrice: '次级价格（{{currency}}/公斤，可选）', deleteConfirm: '删除这条收获记录？', saveFailed: '保存收获记录失败。',
  },
  financeCycle: { cycle: '周期', allHistory: '全部历史', selectCycle: '选择周期', allocateToCycle: '分配到周期', selectCycleTitle: '选择周期', selectCycleMessage: '为此交易选择生产周期。', splitAcrossPonds: '平均分配到 {{cycleName}} 的 {{count}} 个池塘。', category: '类别', amount: '金额（{{currency}}）', general: '一般', feed: '饲料', chemicals: '化学品', probiotics: '益生菌', selectPeriod: '选择期间', inventoryAdjustment: '库存调整', logTransaction: '记录{{type}}', saveFailed: '保存交易失败。' },
};

const vi: FeatureTranslation = {
  enterpriseCycle: {
    enterpriseView: 'Doanh nghiệp', normalView: 'Thông thường',
    dashboardTitle: 'Bảng điều khiển doanh nghiệp', companyFallback: 'Công ty', officeDisplay: 'Màn hình văn phòng', add: 'Thêm', loading: 'Đang tải các khu doanh nghiệp…', createBlocksTitle: 'Tạo khu trước chu kỳ sản xuất', createBlocksBody: 'Khu là cấu trúc cố định cho ao và quyền truy cập của kỹ thuật viên.', managePondsBlocks: 'Quản lý ao và khu', createFirstCycle: 'Tạo chu kỳ sản xuất doanh nghiệp đầu tiên', noPonds: 'Không có ao {{status}}', inactivePonds: '{{count}} ao không hoạt động', continue: 'Tiếp tục', createCycle: 'Tạo chu kỳ', inactive: 'Không hoạt động', started: 'Bắt đầu {{date}} · {{technician}}', notStarted: 'Chưa bắt đầu', ended: 'Đã kết thúc', eyebrow: 'Chu kỳ doanh nghiệp', editCycle: 'Chỉnh sửa chu kỳ', continueCycle: 'Tiếp tục {{cycleName}}', createProductionCycle: 'Tạo chu kỳ sản xuất', editDescription: 'Cập nhật tên chu kỳ hoặc khu được chỉ định.', chooseBlockDate: 'Chọn một khu và ngày thả giống.', stockingDetails: 'Nhập thông tin thả giống cho mọi ao trong {{blockName}}.', blockFallback: 'khu này', cycleName: 'Tên chu kỳ', defaultCycleName: 'Chu kỳ sản xuất {{number}}', plannedStart: 'Ngày bắt đầu dự kiến', blockInCycle: 'Khu trong chu kỳ này', noBlocksAvailable: 'Tất cả các khu đã được gán cho chu kỳ đang mở khác.', inProduction: 'Đang sản xuất', saveChanges: 'Lưu thay đổi', pondsReady: '{{completed}}/{{total}} ao đã sẵn sàng', densitySupplierRequired: 'Mỗi ao phải có ngày thả giống, mật độ và nhà cung cấp.', stockingMissing: 'Chưa nhập thông tin thả giống', stockingDate: 'Ngày thả giống', density: 'Mật độ (PL/m²)', supplier: 'Nhà cung cấp', hatcheryName: 'Tên trại giống', startRemainingPonds: 'Bắt đầu các ao còn lại', startProductionCycle: 'Bắt đầu chu kỳ sản xuất', startingBlock: 'Đang khởi động khu…', viewCycleReport: 'Xem báo cáo chu kỳ', closeCycle: 'Đóng chu kỳ', closeCycleConfirm: 'Đóng {{cycleName}}?', endActivePondsFirst: 'Hãy kết thúc các chu kỳ ao đang hoạt động trước: {{pondNames}}', closeCycleDescription: 'Đóng {{cycleName}}? Việc này không thay đổi khu hoặc chu kỳ khác.', addPrompt: 'Bạn muốn thêm gì?', addPromptDescription: 'Chọn một mục sản xuất doanh nghiệp.', addItemLabel: 'Thêm mục doanh nghiệp', newProductionCycle: 'Chu kỳ sản xuất mới', newBlock: 'Khu mới', newPond: 'Ao mới', newBlockDescription: 'Tạo khu và tùy chọn chỉ định kỹ thuật viên.', newPondDescription: 'Thêm ao vật lý và gán vào một khu.', technician: 'Kỹ thuật viên', selectBlock: 'Chọn khu', pondName: 'Tên ao', pondArea: 'Diện tích ao (m²)', createBlock: 'Tạo khu', creatingBlock: 'Đang tạo khu…', createPond: 'Tạo ao', creatingPond: 'Đang tạo ao…', duplicateBlock: 'Đã có khu với tên này.', duplicatePond: 'Đã có ao với tên này.', cycleSaveFailed: 'Không thể lưu chu kỳ sản xuất.', pondCreateFailed: 'Không thể tạo ao.', stableHealth: 'Sức khỏe ao ổn định', manageBlocks: 'Quản lý khu', manageBlocksDescription: 'Tạo khu hoặc cập nhật kỹ thuật viên được chỉ định.',
  },
  harvestCycle: {
    selectedCycle: 'Chu kỳ đã chọn', cycleHistory: 'Lịch sử chu kỳ', noActiveCycle: 'Không có chu kỳ hoạt động', allCompletedCycles: 'Tất cả chu kỳ đã hoàn thành', blockFallback: 'Khu', activePonds: '{{blockName}} · {{count}} ao hoạt động', historicalRecords: '{{count}} bản ghi thu hoạch lịch sử', currentCycle: 'Chu kỳ hiện tại', history: 'Lịch sử', productionCycle: 'Chu kỳ sản xuất', selectActiveCycle: 'Chọn chu kỳ hoạt động', harvestRecords: 'Bản ghi thu hoạch', selectProductionCycle: 'Chọn chu kỳ sản xuất', noActiveCycles: 'Không có chu kỳ sản xuất hoạt động.', selectCompletedCycle: 'Chọn chu kỳ đã hoàn thành', harvestHistory: 'Lịch sử thu hoạch', noCompletedCycles: 'Không có chu kỳ sản xuất đã hoàn thành.', blockNotAssigned: 'Chưa gán khu', harvestDate: 'Ngày thu hoạch', sameCycleRequired: 'Các ao thu hoạch phải thuộc chu kỳ đã chọn.', searchPond: 'Tìm theo tên ao…', logHarvest: 'Ghi thu hoạch', totalEstimatedRevenue: 'Tổng doanh thu ước tính', totalHarvestedBiomass: 'Tổng sinh khối đã thu hoạch', currentCycleRecords: 'Bản ghi chu kỳ hiện tại', historicalRecordLabel: 'Bản ghi lịch sử', currentHarvests: 'Thu hoạch chu kỳ hiện tại', activePondsAvailable: '{{blockName}} · {{count}} ao hoạt động có thể thu hoạch', completedRecords: 'Bản ghi thu hoạch của chu kỳ đã hoàn thành hoặc không hoạt động', noCurrentRecords: 'Không tìm thấy bản ghi thu hoạch chu kỳ hiện tại.', noHistoricalRecords: 'Không tìm thấy bản ghi thu hoạch lịch sử.', allHistory: 'Tất cả lịch sử', selectPond: 'Chọn ao', choosePond: 'Chọn một ao…', averageSize: 'Kích cỡ trung bình (con/kg)', mainBiomass: 'Sinh khối chính (kg)', mainPrice: 'Giá chính ({{currency}}/kg)', subBiomass: 'Sinh khối phụ (tùy chọn)', subSize: 'Kích cỡ phụ (con/kg)', subPrice: 'Giá phụ ({{currency}}/kg, tùy chọn)', deleteConfirm: 'Xóa bản ghi thu hoạch này?', saveFailed: 'Không thể lưu thu hoạch.',
  },
  financeCycle: { cycle: 'Chu kỳ', allHistory: 'Tất cả lịch sử', selectCycle: 'Chọn chu kỳ', allocateToCycle: 'Phân bổ vào chu kỳ', selectCycleTitle: 'Chọn chu kỳ', selectCycleMessage: 'Chọn chu kỳ sản xuất cho giao dịch này.', splitAcrossPonds: 'Chia đều cho {{count}} ao trong {{cycleName}}.', category: 'Danh mục', amount: 'Số tiền ({{currency}})', general: 'Chung', feed: 'Thức ăn', chemicals: 'Hóa chất', probiotics: 'Chế phẩm sinh học', selectPeriod: 'Chọn khoảng thời gian', inventoryAdjustment: 'Điều chỉnh tồn kho', logTransaction: 'Ghi {{type}}', saveFailed: 'Không thể lưu giao dịch.' },
};

const enterpriseCycleErrors = {
  en: {
    pondBlockMismatch: 'This pond does not belong to the block assigned to the selected cycle.',
    pondCycleMismatch: 'This pond is not assigned to the selected production cycle.',
    addPhysicalPondHint: 'Add the physical pond first. Density, supplier, stocking date, and PL details are added when you start a cycle.',
    editBaseline: 'Edit baseline', startCycle: 'Start cycle', saveBaseline: 'Save baseline', close: 'Close',
    cycleStartQuestion: 'How is this cycle starting?', newCycle: 'New cycle', existingCycle: 'Existing cycle',
    newCycleHint: 'Use this when stocking starts in Shrimply.', existingCycleHint: 'Use this when the ponds are already running. Shrimply will create an estimated baseline for each pond.',
    currentMbw: 'Current MBW (g)', currentMbwPlaceholder: 'e.g. 7', currentPopulation: 'Current population', currentPopulationPlaceholder: 'e.g. 85000',
    currentSurvivalRate: 'Current SR % (optional)', survivalRatePlaceholder: 'e.g. 85', feedUsedSoFar: 'Feed used so far (kg)', feedUsedSoFarPlaceholder: 'e.g. 850',
    feedUsedSoFarHint: 'Used for estimates only. It will not deduct inventory.', baselineMbwRequired: 'Current MBW is required for every pond in an existing cycle.', baselineDateInvalid: 'The stocking date cannot be after today for an existing cycle.',
  },
  id: {
    pondBlockMismatch: 'Kolam ini tidak termasuk dalam blok yang ditetapkan ke siklus terpilih.',
    pondCycleMismatch: 'Kolam ini tidak ditetapkan ke siklus produksi terpilih.',
    addPhysicalPondHint: 'Tambahkan kolam fisik terlebih dahulu. Kepadatan, pemasok, tanggal tebar, dan detail PL diisi saat memulai siklus.',
    editBaseline: 'Ubah data awal', startCycle: 'Mulai siklus', saveBaseline: 'Simpan data awal', close: 'Tutup',
    cycleStartQuestion: 'Bagaimana siklus ini dimulai?', newCycle: 'Siklus baru', existingCycle: 'Siklus berjalan',
    newCycleHint: 'Gunakan ini saat tebar dimulai di Shrimply.', existingCycleHint: 'Gunakan ini saat kolam sudah berjalan. Shrimply akan membuat baseline estimasi untuk setiap kolam.',
    currentMbw: 'MBW saat ini (g)', currentMbwPlaceholder: 'contoh 7', currentPopulation: 'Populasi saat ini', currentPopulationPlaceholder: 'contoh 85000',
    currentSurvivalRate: 'SR saat ini % (opsional)', survivalRatePlaceholder: 'contoh 85', feedUsedSoFar: 'Pakan terpakai sejauh ini (kg)', feedUsedSoFarPlaceholder: 'contoh 850',
    feedUsedSoFarHint: 'Hanya digunakan untuk estimasi. Ini tidak akan mengurangi stok.', baselineMbwRequired: 'MBW saat ini wajib diisi untuk setiap kolam dalam siklus berjalan.', baselineDateInvalid: 'Tanggal tebar tidak boleh setelah hari ini untuk siklus berjalan.',
  },
  th: {
    pondBlockMismatch: 'บ่อนี้ไม่อยู่ในบล็อกที่กำหนดให้รอบที่เลือก',
    pondCycleMismatch: 'บ่อนี้ไม่ได้ถูกกำหนดให้รอบการผลิตที่เลือก',
    addPhysicalPondHint: 'เพิ่มบ่อจริงก่อน โดยกรอกความหนาแน่น ผู้จัดหา วันที่ปล่อยกุ้ง และรายละเอียด PL เมื่อเริ่มรอบ',
    editBaseline: 'แก้ไขค่าฐาน', startCycle: 'เริ่มรอบ', saveBaseline: 'บันทึกค่าฐาน', close: 'ปิด',
    cycleStartQuestion: 'รอบนี้เริ่มอย่างไร?', newCycle: 'รอบใหม่', existingCycle: 'รอบที่กำลังเลี้ยง',
    newCycleHint: 'ใช้เมื่อลงลูกกุ้งและเริ่มบันทึกใน Shrimply', existingCycleHint: 'ใช้เมื่อบ่อกำลังเลี้ยงอยู่แล้ว Shrimply จะสร้างข้อมูลตั้งต้นโดยประมาณให้แต่ละบ่อ',
    currentMbw: 'MBW ปัจจุบัน (กรัม)', currentMbwPlaceholder: 'เช่น 7', currentPopulation: 'ประชากรปัจจุบัน', currentPopulationPlaceholder: 'เช่น 85000',
    currentSurvivalRate: 'SR ปัจจุบัน % (ไม่บังคับ)', survivalRatePlaceholder: 'เช่น 85', feedUsedSoFar: 'อาหารที่ใช้ไปแล้ว (กก.)', feedUsedSoFarPlaceholder: 'เช่น 850',
    feedUsedSoFarHint: 'ใช้เพื่อการประมาณเท่านั้น และจะไม่หักสต็อก', baselineMbwRequired: 'ต้องกรอก MBW ปัจจุบันสำหรับทุกบ่อในรอบที่กำลังเลี้ยง', baselineDateInvalid: 'วันที่ลงลูกกุ้งต้องไม่เกินวันนี้สำหรับรอบที่กำลังเลี้ยง',
  },
  zh: {
    pondBlockMismatch: '该池塘不属于所选周期分配的分区。',
    pondCycleMismatch: '该池塘未分配到所选生产周期。',
    addPhysicalPondHint: '请先添加实体池塘。密度、供应商、放苗日期和 PL 信息将在启动周期时填写。',
    editBaseline: '编辑基线', startCycle: '启动周期', saveBaseline: '保存基线', close: '关闭',
    cycleStartQuestion: '这个养殖周期如何开始？', newCycle: '新周期', existingCycle: '进行中的周期',
    newCycleHint: '适用于从 Shrimply 开始记录投苗。', existingCycleHint: '适用于池塘已经在养殖中。Shrimply 会为每个池塘创建一条估算基准记录。',
    currentMbw: '当前 MBW（克）', currentMbwPlaceholder: '例如 7', currentPopulation: '当前存塘数', currentPopulationPlaceholder: '例如 85000',
    currentSurvivalRate: '当前 SR %（可选）', survivalRatePlaceholder: '例如 85', feedUsedSoFar: '已用饲料（公斤）', feedUsedSoFarPlaceholder: '例如 850',
    feedUsedSoFarHint: '仅用于估算，不会扣减库存。', baselineMbwRequired: '进行中的周期必须为每个池塘填写当前 MBW。', baselineDateInvalid: '进行中的周期投苗日期不能晚于今天。',
  },
  vi: {
    pondBlockMismatch: 'Ao này không thuộc khu được gán cho chu kỳ đã chọn.',
    pondCycleMismatch: 'Ao này chưa được gán cho chu kỳ sản xuất đã chọn.',
    addPhysicalPondHint: 'Hãy thêm ao vật lý trước. Mật độ, nhà cung cấp, ngày thả giống và thông tin PL được nhập khi bắt đầu chu kỳ.',
    editBaseline: 'Sửa dữ liệu nền', startCycle: 'Bắt đầu chu kỳ', saveBaseline: 'Lưu dữ liệu nền', close: 'Đóng',
    cycleStartQuestion: 'Vụ này bắt đầu như thế nào?', newCycle: 'Vụ mới', existingCycle: 'Vụ đang chạy',
    newCycleHint: 'Dùng khi bắt đầu thả giống trong Shrimply.', existingCycleHint: 'Dùng khi các ao đã đang nuôi. Shrimply sẽ tạo dữ liệu nền ước tính cho từng ao.',
    currentMbw: 'MBW hiện tại (g)', currentMbwPlaceholder: 'ví dụ 7', currentPopulation: 'Số lượng hiện tại', currentPopulationPlaceholder: 'ví dụ 85000',
    currentSurvivalRate: 'SR hiện tại % (tùy chọn)', survivalRatePlaceholder: 'ví dụ 85', feedUsedSoFar: 'Thức ăn đã dùng (kg)', feedUsedSoFarPlaceholder: 'ví dụ 850',
    feedUsedSoFarHint: 'Chỉ dùng để ước tính và không trừ tồn kho.', baselineMbwRequired: 'Cần nhập MBW hiện tại cho từng ao trong vụ đang chạy.', baselineDateInvalid: 'Ngày thả giống không được sau hôm nay đối với vụ đang chạy.',
  },
} as const;

const financeCycleExtras = {
  en: { feedUsage: 'Feed usage', additiveUsage: 'Additive usage', noCyclesAvailable: 'No cycles available.' },
  id: { feedUsage: 'Pemakaian pakan', additiveUsage: 'Pemakaian aditif', noCyclesAvailable: 'Tidak ada siklus tersedia.' },
  th: { feedUsage: 'การใช้อาหาร', additiveUsage: 'การใช้สารเสริม', noCyclesAvailable: 'ไม่มีรอบที่พร้อมใช้งาน' },
  zh: { feedUsage: '饲料用量', additiveUsage: '添加剂用量', noCyclesAvailable: '没有可用周期。' },
  vi: { feedUsage: 'Lượng thức ăn sử dụng', additiveUsage: 'Lượng phụ gia sử dụng', noCyclesAvailable: 'Không có chu kỳ khả dụng.' },
} as const;

export const cycleFeatureTranslations = {
  en: { ...en, enterpriseCycle: { ...en.enterpriseCycle, ...enterpriseCycleErrors.en }, financeCycle: { ...en.financeCycle, ...financeCycleExtras.en } },
  id: { ...id, enterpriseCycle: { ...id.enterpriseCycle, ...enterpriseCycleErrors.id }, financeCycle: { ...id.financeCycle, ...financeCycleExtras.id } },
  th: { ...th, enterpriseCycle: { ...th.enterpriseCycle, ...enterpriseCycleErrors.th }, financeCycle: { ...th.financeCycle, ...financeCycleExtras.th } },
  zh: { ...zh, enterpriseCycle: { ...zh.enterpriseCycle, ...enterpriseCycleErrors.zh }, financeCycle: { ...zh.financeCycle, ...financeCycleExtras.zh } },
  vi: { ...vi, enterpriseCycle: { ...vi.enterpriseCycle, ...enterpriseCycleErrors.vi }, financeCycle: { ...vi.financeCycle, ...financeCycleExtras.vi } },
};
export type CycleFeatureLanguage = keyof typeof cycleFeatureTranslations;
