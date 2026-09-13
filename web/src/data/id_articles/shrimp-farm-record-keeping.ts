import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultOperationsReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-farm-record-keeping",
  section: "Manajemen Tambak",
  label: "Manajemen Tambak",
  author: defaultResourceAuthorID,
  reviewer: defaultOperationsReviewerID,
  title: "Pencatatan Tambak Udang: Parameter Kunci Harian, Mingguan, dan Per Siklus",
  description: "Pelajari catatan tambak udang yang paling krusial untuk pengendalian pakan, kualitas air, sampling pertumbuhan, mortalitas, panen, serta performa finansial budidaya.",
  readTime: "7 menit baca",
  tags: [
    "pencatatan tambak udang",
    "log harian tambak",
    "kualitas air harian",
    "manajemen pakan",
    "mortalitas udang",
    "sampling pertumbuhan",
    "traceability tambak",
    "audit tambak",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-farm-record-keeping-daily-weekly-cycle.jpg",
    alt: "Manajer tambak udang sedang meninjau pencatatan harian dan mingguan untuk konsumsi pakan, kualitas air, mortalitas, MBW, ADG, estimasi biomassa, dan tingkat kelangsungan hidup (SR)",
    width: 1448,
    height: 1086,
  },
  relatedFeature: { label: "Software Manajemen Tambak", href: "/id/shrimp-farm-management-software" },
  takeaways: [
    "Catatan tambak adalah instrumen pengambilan keputusan manajemen harian, bukan sekadar tumpukan berkas administrasi.",
    "Log harian wajib mendokumentasikan distribusi pakan, kontrol anco, dinamika kualitas air pagi-sore, mortalitas, serta anomali visual kondisi kolam.",
    "Evaluasi mingguan dan rekap siklus menghubungkan performa biologis langsung ke realisasi biaya operasional, FCR, dan margin laba panen.",
  ],
  faqs: [
    {
      question: "Mengapa pencatatan tambak udang harian sangat krusial bagi keberhasilan budidaya?",
      answer: "Pencatatan harian berfungsi sebagai sistem peringatan dini (early warning system) sebelum gangguan kecil berubah menjadi bencana mortalitas massal. Dengan mendokumentasikan konsumsi pakan, kualitas air pagi-sore, dan mortalitas setiap hari, manajer tambak dapat segera menyesuaikan jam operasional aerasi, mengoreksi dosis pakan sebelum terjadi pembusukan di dasar kolam, dan mendeteksi anjloknya nafsu makan yang mengindikasikan infeksi penyakit.",
    },
    {
      question: "Bagaimana cara pencatatan pakan harian dan kontrol anco yang tepat?",
      answer: "Catat jumlah kilogram pakan yang ditebar pada setiap sesi feeding. Setelah 1,5 hingga 2 jam pemberian pakan, teknisi wajib memeriksa nampan pakan (anco) dan mendokumentasikan persentase pakan tersisa (habis total, tersisa <10%, sisa 20–50%, atau pakan tidak tersentuh). Jika anco masih menyisakan pakan berlebih, segera tahan atau turunkan alokasi pakan jadwal berikutnya untuk mencegah overfeeding yang merusak dasar kolam.",
    },
    {
      question: "Kapan dan berapa kali kualitas air harus diukur serta dicatat dalam sehari?",
      answer: "Parameter dinamis utama seperti oksigen terlarut (DO) dan pH wajib diukur dan dicatat minimal dua kali sehari pada jam yang konsisten: saat fajar (sekitar pukul 05:00 saat DO mencapai titik terendah harian) dan sore hari (sekitar pukul 15:00–16:00 saat fotosintesis alga dan pH mencapai titik puncak). Parameter kimia air lanjutan seperti alkalinitas, amonia (TAN), dan nitrit dapat dicatat secara berkala setiap 2 hingga 3 hari sekali.",
    },
    {
      question: "Apa perbedaan mendasar antara pencatatan log pakan dan data sampling pertumbuhan?",
      answer: "Pencatatan log pakan harian mencatat pengeluaran fisik pakan dari gudang yang langsung memotong saldo inventaris tambak. Sebaliknya, sampling mingguan merupakan pengamatan biologis untuk mengukur rata-rata bobot tubuh (MBW) dan pertambahan bobot harian (ADG) guna mengestimasi biomassa dan menghitung feeding rate berikutnya. Data sampling tidak boleh memicu pemotongan stok inventaris.",
    },
    {
      question: "Catatan apa saja yang wajib dirangkum pada akhir siklus untuk audit ketertelusuran (traceability)?",
      answer: "Untuk memenuhi audit kepatuhan ekspor dan sertifikasi akuakultur (seperti CBIB, ASC, BAP, atau GlobalG.A.P.), rekapitulasi akhir siklus wajib memuat: sertifikat asal benur (hatchery) dan hasil uji PCR, log seluruh pakan yang digunakan beserta nomor lot pabrik, catatan aplikasi bahan kimia dan probiotik, data kualitas air harian, serta rincian tonase panen parsial/total, distribusi size, dan tanggal pengiriman ke unit pengolahan.",
    },
    {
      question: "Mengapa beralih ke software manajemen tambak digital meningkatkan efisiensi operasional?",
      answer: "Software manajemen digital mengeliminasi risiko catatan buku lapangan hilang, kotor, atau tercecer. Data yang diinput teknisi dari tepi kolam langsung terintegrasi menjadi grafik tren MBW, ADG, FCR, dan estimasi biomassa otomatis. Pemilik dan manajer tambak dapat memantau seluruh petak kolam secara real-time dari mana saja, mempercepat respons tindakan sebelum terjadi kerugian finansial.",
    },
  ],
  sections: [
    {
      heading: "Mengapa pencatatan tambak mengubah kualitas keputusan operasional",
      body: [
        "Pencatatan data tambak yang disiplin membantu manajer dan teknisi mengambil keputusan berdasarkan fakta historis setiap kolam, alih-alih sekadar mengandalkan intuisi atau ingatan sesaat. Panduan pencatatan akuakultur dari FAO (Food and Agriculture Organization) menegaskan bahwa catatan distribusi pakan, dinamika kualitas air, performa populasi udang, dan persediaan inventaris merupakan instrumen mendasar dalam tata kelola budidaya komersial modern.",
        "Pada tambak udang vaname (Litopenaeus vannamei), catatan yang bernilai ekonomi paling tinggi meliputi alokasi pakan harian, kontrol anco, mutasi stok pakan gudang, fluktuasi parameter kualitas air, sampling bobot udang, mortalitas, aplikasi obat atau probiotik, hasil panen, serta rincian biaya operasional. Seluruh variabel ini memberikan daya analisis yang luar biasa saat dihubungkan ke kolam dan siklus yang sama melalui [Software Manajemen Tambak](/id/shrimp-farm-management-software).",
      ],
    },
    {
      heading: "Catatan harian: Log pakan, kualitas air, dan mortalitas",
      body: [
        "Log harian kolam harus menjawab empat aspek vital setiap hari: berapa pakan yang ditebar dan bagaimana respons nampan kontrol (anco), apa anomali visual yang teramati di kolam, bagaimana pergerakan kualitas air, serta apakah ditemukan mortalitas atau perubahan perilaku berenang udang. Catatan pakan sebaiknya turut mendokumentasikan jenis crumble/pellet dan nomor batch pakan, karena pakan yang rusak akibat penanganan gudang yang lembap dapat langsung menurunkan laju pertumbuhan udang.",
        "Pencatatan kualitas air wajib menyertakan jam pengukuran secara presisi. Parameter lingkungan seperti oksigen terlarut (DO) dan pH terus berubah sepanjang 24 jam akibat fotosintesis fitoplankton di siang hari dan respirasi di malam hari. Pengukuran saat fajar (05:00) dan sore hari (15:00–16:00) menyajikan kondisi ekologis yang berbeda serta menjadi pedoman penting dalam menentukan jam operasional kincir aerasi dan alokasi pakan. Pelajari lebih lanjut batas target parameter ini di [Panduan Parameter Kualitas Air Udang Vannamei](/id/resources/vannamei-water-quality-parameters).",
        "Pencatatan mortalitas harian harus mendokumentasikan jumlah udang mati yang tersaring di saringan pintu air atau central drain, keberadaan udang sekarat di tanggul kolam, kondisi kepenuhan saluran pencernaan (usus), serta kenampakan hepatopankreas saat dicek di anco.",
      ],
    },
    {
      heading: "Matriks pencatatan tambak udang: Parameter harian, mingguan, dan per siklus",
      body: [
        "Guna memastikan standarisasi pengumpulan data oleh tim lapangan, gunakan matriks pencatatan berikut sebagai pedoman standar operasional prosedur (SOP) di tambak:",
      ],
      table: {
        columns: ["Frekuensi", "Kategori Pencatatan", "Parameter & Data Kunci", "Tujuan & Tindakan Keputusan"],
        rows: [
          [
            "Harian (Tiap Jadwal Pakan)",
            "Pakan & Kontrol Anco",
            "Kilogram pakan per petak, persentase sisa di anco (1,5–2 jam), nafsu makan, nomor lot/batch pakan",
            "Koreksi dosis pakan pada jadwal berikutnya (tambah, tahan, atau kurangi) guna mencegah overfeeding dan pembusukan dasar kolam",
          ],
          [
            "Harian (Fajar & Sore)",
            "Kualitas Air Kunci",
            "DO fajar (05:00) & DO sore (15:00), suhu air, pH pagi vs sore, kecerahan/transparansi Secchi disk, warna air",
            "Pengaturan jam kincir aerasi, deteksi dini blooming atau alga crash, mitigasi stres respirasi udang",
          ],
          [
            "Harian (Pagi & Sore)",
            "Mortalitas & Kesehatan",
            "Udang mati di central drain/kasa, udang konvoi di tepi tanggul, isi saluran usus, warna hepatopankreas",
            "Deteksi dini wabah patogen (WSSV, AHPND, EHP), isolasi kolam, evaluasi biosekuriti",
          ],
          [
            "2–3 Hari Sekali",
            "Kimia Air Lanjutan",
            "Alkalinitas (mg/L CaCO₃), amonia total (TAN), nitrit (NO₂⁻), salinitas (ppt), nitrat, bahan organik total (TOM)",
            "Perhitungan dosis pengapuran (bikarbonat/dolomit), perlakuan probiotik nitrifikasi, pengaturan frekuensi siphon",
          ],
          [
            "Mingguan (Mulai DOC 30)",
            "Sampling Pertumbuhan",
            "ABW/MBW (gram), ADG (gram/hari), koefisien variasi keseragaman (CV), estimasi biomassa, survival rate (SR)",
            "Koreksi feeding rate harian berdasarkan biomassa riil, evaluasi carrying capacity kolam, proyeksi jadwal panen",
          ],
          [
            "Per Siklus (Tebar s/d Panen)",
            "Produksi & Finansial",
            "Asal benur/PL, total tebar, tonase panen parsial & total, distribusi size, FCR akhir, total biaya pakan & operasional, margin laba",
            "Evaluasi profitabilitas per kolam, benchmarking antar siklus budidaya, pemenuhan audit ketertelusuran (traceability)",
          ],
        ],
      },
    },
    {
      heading: "Catatan mingguan: Sampling pertumbuhan dan estimasi biomassa",
      body: [
        "Evaluasi mingguan menjembatani data harian dengan hasil panen akhir. Catatan mingguan wajib merangkum rata-rata bobot tubuh udang (MBW/ABW), laju pertambahan bobot harian (ADG), estimasi biomassa kolam terkini, proyeksi kelangsungan hidup (survival rate/SR), kumulatif pakan yang telah dikonsumsi, serta tren stabilitas parameter air kolam.",
        "Ingat bahwa data sampling pertumbuhan adalah observasi biologis murni untuk mengukur perkembangan udang dan menyesuaikan feeding rate berikutnya. Data sampling tidak boleh memotong inventaris pakan di gudang, berbeda dengan catatan log pakan harian riil yang langsung memotong stok fisik. Bandingkan capaian mingguan ini dengan scorecard di [Performa Kolam](/id/resources/pond-performance) untuk mendeteksi dini indikasi perlambatan pertumbuhan udang.",
      ],
    },
    {
      heading: "Catatan per siklus: Panen, evaluasi finansial, dan ketertelusuran (traceability)",
      body: [
        "Saat siklus budidaya berakhir, seluruh data lapangan dikonsolidasikan ke dalam neraca siklus lengkap. Rekapitulasi ini mendokumentasikan tanggal tebar, asal hatchery benur dan sertifikat hasil uji PCR, riwayat perlakuan probiotik serta bahan kimia, rincian tonase dan distribusi ukuran (size) dari setiap panen parsial maupun panen total, total konsumsi pakan, konversi pakan akhir (FCR), biaya listrik/bahan bakar, upah kerja, serta realisasi pendapatan kotor.",
        "Selain menghitung margin laba bersih dan biaya pokok produksi per kilogram (COGS), kelengkapan catatan siklus menjadi prasyarat mutlak dalam audit ketertelusuran pasar ekspor serta sertifikasi perikanan budidaya (seperti CBIB di Indonesia, ASC, BAP, maupun GlobalG.A.P.). Ketertelusuran dari bibit benur hingga produk beku di meja konsumen hanya dapat dipertanggungjawabkan apabila catatan operasional kolam tersimpan rapi dan akurat.",
      ],
    },
    {
      heading: "Transformasi dari buku catatan manual ke platform digital terpadu",
      body: [
        "Sebagian besar tambak komersial masih mengandalkan buku catatan kertas di pos jaga kolam atau lembaran spreadsheet terpisah. Cara manual ini menyimpan risiko tulisan tangan tidak terbaca, buku basah atau rusak di lapangan, keterlambatan pelaporan ke pemilik tambak, serta hilangnya data historis antar pergantian teknisi.",
        "Platform terintegrasi seperti Shrimply memungkinkan teknisi mencatat pakan, kualitas air, dan sampling langsung dari ponsel di tepi petak kolam. Data seketika tersinkronisasi ke dashboard manajer, memicu peringatan dini saat parameter air mendekati ambang kritis, mengotomatisasi perhitungan FCR dan biomassa, serta memastikan transparansi biaya dari hari tebar hingga panen.",
      ],
    },
  ],
  checklist: [
    "Catat alokasi pakan harian, persentase sisa di anco, dan mutasi stok fisik pakan di gudang secara real-time.",
    "Ukur dan catat parameter kualitas air kunci (khususnya DO dan pH) minimal dua kali sehari pada waktu konsisten (saat fajar dan sore).",
    "Dokumentasikan mortalitas harian, perilaku gerak udang, dan kondisi usus di feeding tray.",
    "Lakukan sampling mingguan secara konsisten mulai DOC 30 untuk memperbarui nilai MBW, ADG, estimasi biomassa, dan FCR.",
    "Hubungkan seluruh data sampling, kualitas air, dan biaya operasional langsung ke siklus dan petak kolam yang bersangkutan.",
    "Lakukan rekap dan tinjauan performa mingguan bersama tim lapangan sebelum masalah kolam menjadi kronis.",
  ],
  sources: [
    {
      title: "Management for Freshwater Fish Culture: Record Keeping",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/FAO_Training/FAO_Training/General/x6709e/x6709e16.htm",
    },
    {
      title: "How do I keep track of the results of feeding?",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/4/s4314e/s4314e0a.htm",
    },
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
  ],
};
