import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultNutritionReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "feed-inventory-control",
  section: "Pakan dan Inventaris",
  label: "Pakan & Inventaris",
  author: defaultResourceAuthorID,
  reviewer: defaultNutritionReviewerID,
  title: "Kontrol Inventaris Pakan Tambak Udang: Cegah Stok Habis, Pakan Rusak, dan Pembengkakan FCR",
  description:
    "Pelajari cara tambak udang mengelola stok pakan gudang, nomor batch, waktu pemesanan ulang (reorder timing), rotasi FIFO, dan alokasi pakan per kolam guna melindungi laju pertumbuhan udang serta efisiensi biaya budidaya.",
  readTime: "6 menit baca",
  tags: [
    "kontrol inventaris pakan",
    "stok pakan udang",
    "stok opname gudang",
    "FIFO pakan",
    "reorder timing",
    "batch pakan",
    "biaya pakan tambak",
    "FCR udang vaname",
    "manajemen pakan",
  ],
  publishedAt: "2026-06-08",
  updatedAt: "2026-09-12",
  image: {
    src: "/resources/images/shrimp-feed-inventory-control-farm-software.jpg",
    alt: "Papan kontrol inventaris pakan tambak udang menampilkan stok fisik di gudang, pengeluaran pakan per petak kolam, stok opname mingguan, pelacakan batch pakan, dan log kondisi penyimpanan",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Software Manajemen Pakan & Inventaris", href: "/id/features/feed-inventory" },
  takeaways: [
    "Inventaris pakan berfungsi ganda sebagai instrumen pengendalian biaya (50–60% biaya operasional tambak) sekaligus sistem kendali mutu produksi biologis.",
    "Kehabisan stok pakan (stockout) mengacaukan ritme metabolisme udang, sementara penumpukan stok berlebih (overstocking) memicu risiko kelembaban, jamur mikotoksin, dan kerusakan asam amino esensial.",
    "Pencatatan nomor batch, tanggal kedaluwarsa, dan rekonsiliasi stok fisik mingguan membantu tambak mengidentifikasi akar masalah saat terjadi anomali nafsu makan di anco atau pembengkakan FCR.",
  ],
  faqs: [
    {
      question: "Mengapa kehabisan stok pakan (stockout) di tengah siklus sangat fatal bagi tambak udang vaname?",
      answer:
        "Pergantian merek pakan mendadak atau keterlambatan jadwal pemberian pakan akibat stok habis menyebabkan stres nutrisi akut pada udang. Perubahan aroma, palatabilitas, atau ukuran fisik pakan secara tiba-tiba sering memicu penurunan nafsu makan drastis bahkan kanibalisme pada populasi padat tebar tinggi. Ketidakteraturan asupan nutrisi ini juga mengganggu siklus molting alami dan menurunkan pertambahan bobot harian (ADG).",
    },
    {
      question: "Apa perbedaan mendasar antara pemotongan inventaris pakan dan pencatatan pakan saat sampling pertumbuhan?",
      answer:
        "Pengeluaran pakan harian untuk ditebar ke kolam merupakan transaksi fisik riil yang langsung memotong saldo stok inventaris di gudang tambak. Sebaliknya, angka pakan yang dicatat pada saat sampling mingguan adalah data observasi biologis yang digunakan untuk mengevaluasi rasio konversi pakan (FCR), estimasi biomassa, dan proyeksi feeding rate berikutnya. Data sampling tidak boleh memicu pemotongan stok inventaris.",
    },
    {
      question: "Mengapa prinsip FIFO (First In, First Out) wajib diterapkan secara disiplin di gudang pakan tambak?",
      answer:
        "Pakan udang kaya akan lipid (lemak tak jenuh), atraktan laut (seperti tepung cumi atau krill), serta vitamin labil yang sangat rentan teroksidasi dan mengalami ketengikan di iklim tropis yang lembap. Sistem FIFO memastikan karung pakan yang masuk lebih awal dikeluarkan dan dikonsumsi terlebih dahulu sebelum terjadi penurunan nilai nutrisi, denaturasi vitamin C, atau tumbuhnya kapang jamur penghasil racun mikotoksin.",
    },
    {
      question: "Bagaimana cara menentukan titik pemesanan ulang pakan (reorder point) yang aman?",
      answer:
        "Titik pemesanan ulang dihitung dengan rumus: (Lead Time Pengiriman Supplier × Rata-rata Konsumsi Pakan Harian Seluruh Kolam) + Stok Pengaman (Safety Stock 5–7 hari). Memasuki fase pertumbuhan cepat (DOC 45–80) saat biomassa udang melonjak pesat, konsumsi pakan harian dapat berlipat ganda, sehingga ambang batas reorder point harus dinaikkan secara berkala sebelum persediaan gudang menipis.",
    },
    {
      question: "Seberapa sering stok opname fisik gudang pakan harus dilakukan?",
      answer:
        "Stok opname fisik karung pakan idealnya dilakukan setiap pekan secara konsisten. Rekonsiliasi mingguan memungkinkan manajer tambak mencocokkan sisa fisik karung di gudang dengan akumulasi log pakan harian yang diinput teknisi kolam, mendeteksi selisih karung akibat salah pencatatan, pakan rusak, atau tercecer sebelum membiaskan evaluasi FCR mingguan.",
    },
    {
      question: "Bagaimana standar penyimpanan gudang pakan tambak yang baik untuk mencegah pakan rusak dan berjamur?",
      answer:
        "Gudang pakan wajib memiliki sirkulasi udara yang baik, terlindung dari tampias air hujan dan sinar matahari langsung, serta menggunakan palet kayu atau plastik minimal 15–20 cm di atas lantai dengan jarak minimal 30 cm dari dinding guna mencegah kelembaban merembes. Ruangan gudang harus memiliki sistem proteksi hama terpadu (bebas tikus dan serangga) yang berpotensi merusak karung dan menularkan patogen.",
    },
  ],
  sections: [
    {
      heading: "Mengapa kontrol inventaris pakan adalah operasi teknis, bukan sekadar urusan akuntansi",
      body: [
        "Pakan udang merupakan komponen biaya variabel terbesar dalam budidaya udang vaname (Litopenaeus vannamei), menyerap 50% hingga 60% dari total biaya operasional (OPEX) satu siklus. Apabila manajemen tambak tidak mengetahui secara presisi pakan apa yang tersedia di gudang, berapa karung yang dikeluarkan setiap sesi feeding, dan kolam mana yang mengonsumsinya, manajer tidak dapat mempercayai laporan rasio konversi pakan (FCR) maupun kalkulasi margin panen.",
        "Panduan pencatatan akuakultur dari FAO (Food and Agriculture Organization) menegaskan bahwa identifikasi spesifikasi pakan serta rekam jejak kedatangan dan penggunaannya merupakan pilar fundamental dalam manajemen produksi komersial. Pada operasional tambak modern, integrasi pencatatan log harian dengan [Software Manajemen Pakan & Inventaris](/id/features/feed-inventory) memastikan data biologis kolam selaras dengan mutasi fisik stok pakan di gudang.",
      ],
      note: "Prinsip Arsitektur Data: Pengeluaran pakan harian ke kolam memotong saldo inventaris gudang secara atomik. Sebaliknya, angka pakan yang dicatat saat sampling pertumbuhan adalah data observasi biologis untuk kalkulasi FCR dan tidak boleh memotong stok pakan gudang.",
    },
    {
      heading: "Parameter kunci yang wajib dicatat dalam tata kelola stok pakan",
      body: [
        "Pencatatan inventaris yang efektif harus mencakup identifikasi lengkap sejak karung pakan diturunkan dari truk pemasok hingga ditebar ke petak kolam. Kegagalan mencatat nomor batch dan tanggal kedaluwarsa membuat manajemen kesulitan mengidentifikasi akar masalah saat udang di beberapa kolam serentak mengalami penurunan nafsu makan di anco atau gangguan saluran pencernaan.",
        "Setiap pergerakan fisik pakan wajib mengaitkan variabel logistik dengan variabel petak kolam. Dengan demikian, tim tambak dapat mengaudit riwayat konsumsi pakan secara transparan dan melakukan penyesuaian pakan tepat sasaran.",
      ],
      items: [
        "Spesifikasi Pakan: Merek pabrikan, jenis formulasi, ukuran butiran (powder, crumble 0/1/2, pelet 1/2/3), dan kadar protein.",
        "Informasi Batch & Mutu: Nomor lot/batch pabrik, tanggal produksi, tanggal kedaluwarsa, dan kondisi fisik karung saat tiba (bebas robek dan basah).",
        "Kuantitas & Saldo: Jumlah karung (zak) dan total kilogram (kg) yang diterima, saldo stok tersisa, serta lokasi penempatan palet di gudang.",
        "Mutasi Pengeluaran: Tanggal dan jam pengambilan pakan, nomor petak kolam tujuan, teknisi/pemberi pakan yang bertanggung jawab, serta program feeding yang dijalankan.",
        "Kondisi Lingkungan Gudang: Pemantauan suhu ruangan gudang (< 25–28°C) dan kelembaban relatif udara (< 70%) guna mencegah pertumbuhan kapang/jamur.",
      ],
    },
    {
      heading: "SOP pergudangan pakan: Penerapan FIFO, paletisasi, dan pencegahan pakan berjamur",
      body: [
        "Kondisi penyimpanan di gudang tambak memiliki korelasi langsung terhadap performa biologis udang. Pakan udang vaname kaya akan asam lemak omega-3 (EPA/DHA), fosfolipid, serta vitamin labil yang sangat rentan mengalami oksidasi dan ketengikan jika terpapar suhu panas, kelembaban tinggi, atau disimpan terlalu lama.",
        "Penerapan sistem FIFO (First In, First Out) merupakan keharusan mutlak. Karung pakan yang masuk lebih awal wajib ditata agar keluar lebih awal ke kolam. Karung pakan tidak boleh bersentuhan langsung dengan lantai semen atau dinding gudang karena rembesan uap air dapat memicu pertumbuhan jamur seperti Aspergillus flavus yang menghasilkan racun aflatoksin. Mengonsumsi pakan berjamur dapat merusak tubulus hepatopankreas udang, memicu infeksi sekunder bakteri Vibrio, dan menghentikan pertambahan bobot harian (ADG). Pelajari langkah penanganan pertumbuhan udang yang terhenti di [Panduan Troubleshooting ADG Lambat](/id/resources/slow-shrimp-growth-adg-troubleshooting).",
      ],
      table: {
        columns: ["Area Pemeriksaan", "Standar Prosedur Operasional (SOP)", "Toleransi Kritis", "Dampak jika Diabaikan"],
        rows: [
          [
            "Penataan Palet Gudang",
            "Gunakan palet kayu/plastik setinggi minimal 15–20 cm di atas lantai; beri celah 30 cm dari dinding dan 50 cm antartumpukan",
            "Jarak lantai min. 15 cm",
            "Rembesan uap air dari lantai semen memicu pembusukan dan jamur pada lapisan karung terbawah",
          ],
          [
            "Rotasi Stok (FIFO)",
            "Beri label tanggal kedatangan dan nomor batch pada setiap palet; susun alur akses agar stok lama keluar pertama",
            "Maksimal simpan 60–90 hari dari tanggal produksi",
            "Pakan lama mengalami oksidasi lemak (tengik), penurunan palatabilitas, dan denaturasi vitamin esensial",
          ],
          [
            "Ventilasi & Suhu Ruang",
            "Pastikan sirkulasi udara lancar dengan ventilasi silang atau exhaust fan; jaga suhu gudang tetap sejuk dan kering",
            "Suhu ideal < 28°C, kelembaban < 70%",
            "Suhu tinggi mempercepat ketengikan lemak; kelembaban tinggi memicu pertumbuhan mikotoksin berbahaya",
          ],
          [
            "Pengendalian Hama (Pest Control)",
            "Pasang perangkap mekanis di sekeliling gudang; tutup rapat lubang ventilasi dengan kawat kasa",
            "Nol toleransi kontaminasi hama",
            "Tikus dan serangga melubangi karung pakan dan menjadi vektor penular penyakit patogen ke kolam",
          ],
          [
            "Stok Opname Mingguan",
            "Hitung fisik karung per merek/ukuran setiap akhir pekan; bandingkan dengan log pakan harian kolam",
            "Selisih toleransi < 0,5%",
            "Ketidakcocokan saldo mengaburkan angka FCR riil kolam dan memicu risiko kehabisan pakan mendadak",
          ],
        ],
      },
    },
    {
      heading: "Menghitung waktu pemesanan ulang (reorder point) sebelum fase lonjakan pakan",
      body: [
        "Salah satu kekeliruan fatal dalam manajemen tambak udang adalah melakukan pemesanan pakan hanya ketika persediaan karung di gudang tersisa hitungan hari. Pada fase pembesaran pesat (DOC 45 hingga 80), nafsu makan udang dan biomassa kolam meningkat secara eksponensial. Jika tambak mengoperasikan 6 petak kolam intensif, konsumsi pakan harian gabungan dapat melesat dari 100 kg/hari pada DOC 30 menjadi 600–900 kg/hari pada DOC 65.",
        "Rumus dasar penentuan titik pemesanan ulang (Reorder Point / ROP) adalah:",
        "ROP = (Lead Time Pengiriman Supplier × Rata-rata Konsumsi Harian) + Safety Stock",
        "Di mana Lead Time adalah estimasi durasi pengiriman pakan dari distributor pabrik ke lokasi tambak (misal 3–5 hari kerja), dan Safety Stock adalah stok pengaman cadangan darurat (misal 5 hingga 7 hari kebutuhan konsumsi) untuk mengantisipasi keterlambatan ekspedisi atau gangguan cuaca. Dengan memetakan kurva proyeksi pakan siklus melalui [Perencanaan Siklus Budidaya Udang](/id/resources/shrimp-cycle-planning), manajer dapat menerbitkan order pembelian (PO) sebelum lonjakan konsumsi terjadi.",
      ],
    },
    {
      heading: "Bagaimana integrasi inventaris mendukung efisiensi pakan dan keakuratan FCR",
      body: [
        "Ketika catatan inventaris gudang terintegrasi langsung dengan log harian pemberian pakan kolam, manajer tambak dapat membandingkan rencana pakan teoritis terhadap realisasi pakan aktual di tepi kolam. Selisih antara pakan yang dikeluarkan dari gudang dan pakan yang dicatat di anco dapat segera terdeteksi dan diinvestigasi.",
        "Dipadukan dengan data sampling bobot rata-rata (MBW) mingguan dari [Grafik Pertumbuhan Udang Vannamei](/id/resources/vannamei-growth-chart) dan catatan mortalitas harian dari [Pencatatan Tambak Udang](/id/resources/shrimp-farm-record-keeping), manajemen tambak memperoleh kalkulasi rasio konversi pakan (FCR) dan estimasi biomassa yang sangat akurat. Ketepatan data ini melindungi kolam dari overfeeding yang merusak dasar kolam sekaligus mencegah underfeeding yang menghambat laju tumbuh udang.",
      ],
    },
  ],
  checklist: [
    "Catat seluruh pakan yang masuk mencakup tanggal tiba, merek, ukuran pakan (crumble/pelet), nomor batch, tanggal kedaluwarsa, dan supplier.",
    "Potong stok inventaris gudang hanya ketika pakan secara fisik dikeluarkan untuk ditebar ke kolam, bukan dari data sampling.",
    "Terapkan prinsip FIFO (First In, First Out) secara ketat dan susun karung di atas palet berjarak minimal 15 cm dari lantai dan 30 cm dari dinding.",
    "Lakukan stok opname fisik mingguan untuk merekonsiliasi sisa karung di gudang dengan akumulasi log pakan harian kolam.",
    "Hitung ambang batas pemesanan ulang (reorder point) dengan memperhitungkan lonjakan konsumsi pakan harian pada fase DOC 45–80.",
    "Periksa kondisi fisik pakan (aroma segar tidak tengik, warna seragam, bebas jamur dan gumpalan) sebelum didistribusikan ke teknisi kolam.",
  ],
  sources: [
    {
      title: "How do I keep track of the results of feeding?",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/4/s4314e/s4314e0a.htm",
    },
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
    {
      title: "Comparative Analysis of Profitability and Resource Use Efficiency Between Penaeus monodon and Litopenaeus vannamei in India",
      publisher: "Aquaculture Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8096089/",
    },
  ],
};
