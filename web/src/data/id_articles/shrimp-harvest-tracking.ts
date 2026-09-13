import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultOperationsReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-harvest-tracking",
  section: "Panen dan Keuangan",
  label: "Panen dan Keuangan",
  author: defaultResourceAuthorID,
  reviewer: defaultOperationsReviewerID,
  title: "Pelacakan Panen Udang: Panduan Pencatatan Sebelum, Selama, dan Setelah Panen",
  description: "Kapan petambak harus melakukan panen parsial atau panen total? Pelajari data kolam, size, estimasi biomassa, susut timbang, es cold chain, kesiapan pembeli, dan rekonsiliasi performa siklus budidaya.",
  readTime: "7 menit baca",
  tags: [
    "pelacakan panen udang",
    "kapan panen udang",
    "panen udang vaname",
    "panen parsial",
    "panen total",
    "size udang",
    "susut timbang",
    "rantai dingin udang",
    "harga udang",
    "rekonsiliasi siklus",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-harvest-tracking-partial-final-harvest.jpg",
    alt: "Infografis pelacakan panen udang yang menampilkan alur panen parsial, panen total, pencatatan pembeli, bobot timbang riil, harga jual, pendapatan, dan rekonsiliasi performa siklus budidaya",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Software Pelacakan Panen Udang", href: "/id/features/shrimp-harvest-tracking" },
  takeaways: [
    "Pencatatan panen wajib memisahkan secara tegas antara panen parsial (thinning) dan panen total akhir siklus budidaya.",
    "Data panen parsial yang akurat menjadi penentu revisi feeding rate harian dan perhitungan sisa biomassa agar kolam terhindar dari overfeeding berbahaya.",
    "Pencatatan bobot timbang riil, size, sortasi reject, dan susut timbang mengubah observasi biologis tambak menjadi neraca finansial dan bukti ketertelusuran yang kredibel.",
  ],
  faqs: [
    {
      question: "Kapan waktu yang paling tepat untuk memanen udang vaname (panen total)?",
      answer: "Waktu panen ditentukan oleh kombinasi faktor biologis, daya dukung kolam (carrying capacity), kondisi kesehatan udang, dinamika harga pasar, dan kesiapan pembeli atau unit pengolahan (cold storage)—bukan sekadar patokan kaku hari pemeliharaan (DOC). Waktu panen ideal tercapai saat: udang telah mencapai target size pasar (misalnya size 30–50), laju pertambahan bobot harian (ADG) mulai melambat akibat keterbatasan ruang gerak atau oksigen, biomassa mendekati batas kapasitas aerasi (misalnya > 500–600 kg per 1 HP kincir), atau muncul tanda-tanda awal penurunan daya dukung lingkungan seperti nitrit melonjak drastis dan DO fajar anjlok. Jika terdeteksi ancaman infeksi penyakit akut (seperti WSSV atau AHPND), panen darurat (emergency harvest) harus segera diputuskan demi menyelamatkan modal sebelum terjadi mortalitas massal.",
    },
    {
      question: "Apa saja data kunci yang wajib dicatat saat panen parsial (thinning)?",
      answer: "Pada panen parsial, catat tanggal dan jam panen, nomor petak kolam, nomor jaring atau tahapan tarik, bobot timbang kotor dan bersih (kg), rata-rata size (ekor/kg) dan MBW, nama pembeli, harga per kg, serta persentase udang reject/BS. Segera setelah panen selesai, hitung perkiraan ekor udang yang terangkat: Ekor Panen = Bobot Panen (kg) × Size (ekor/kg). Kurangkan jumlah ini dari sisa estimasi populasi kolam, perbarui estimasi sisa biomassa, dan langsung turunkan alokasi pakan harian pada jadwal berikutnya untuk mencegah penumpukan pakan busuk di dasar kolam.",
    },
    {
      question: "Bagaimana cara memitigasi susut timbang (weight loss) antara timbangan di tambak dan cold storage?",
      answer: "Susut timbang dapat ditekan melalui empat langkah standar operasional: (1) Terapkan sistem perendaman air es instan (slurry ice/chilling) bersuhu 0–2°C segera setelah udang diangkat dari kolam; (2) Lakukan penirisan air (draining) yang seragam selama 30–60 detik pada keranjang sebelum ditimbang di tepi kolam; (3) Gunakan rasio es terhadap udang minimal 1:1 (atau 1,2:1 untuk pengiriman jarak jauh) di dalam boks fiber insulasi tertutup rapat; dan (4) Pastikan timbangan digital di tambak telah dikalibrasi bersama di depan pihak pembeli sebelum penimbangan dimulai. Selisih susut normal berkisar antara 1–2%; jika susut melebihi 3–4%, lakukan audit durasi transit, suhu boks, dan ketebalan lapisan es.",
    },
    {
      question: "Mengapa udang harus dipuasakan (stop pakan) sebelum proses panen dilakukan?",
      answer: "Udang wajib dipuasakan minimal 4 hingga 8 jam sebelum panen tergantung pada ukuran dan DOC. Memuasakan udang bertujuan mengosongkan saluran pencernaan (usus) dari sisa pakan dan kotoran lumpur. Usus yang terisi pakan atau lumpur hitam akan mudah pecah selama penanganan pascapanen, memicu autolisis enzimatik, mempercepat pembusukan bakteri, menyebabkan perubahan warna hepatopankreas menjadi lembek dan berbau, memicu kemunculan bercak hitam (black spot), serta membuat udang dinilai reject (kualitas BS) oleh pabrik atau tengkulak dengan potongan harga yang merugikan petambak.",
    },
    {
      question: "Bagaimana cara menghindari masalah udang berkulit lunak (soft-shell) saat jadwal panen tiba?",
      answer: "Hindari memanen udang saat terjadi siklus moulting (ganti kulit) massal, yang umumnya berlangsung di sekitar fase bulan purnama (full moon) atau bulan mati (new moon). Lakukan sampling acak 2 hingga 3 hari sebelum panen untuk memeriksa tekstur kekerasan karapas. Berikan perlakuan mineral (kalsium klorida, dolomit, atau kalsium karbonat) dosis 5–10 ppm untuk mempercepat pengerasan cangkang udang yang baru saja berganti kulit. Udang yang dipanen dalam kondisi cangkang lunak sangat rentan rusak fisik, mengalami penyusutan bobot tinggi akibat hilangnya cairan tubuh, dan terkena potongan harga tajam di tingkat pembeli.",
    },
    {
      question: "Bagaimana cara merekonsiliasi seluruh data panen untuk menghitung FCR akhir dan profitabilitas riil siklus?",
      answer: "Rekonsiliasi siklus dilakukan dengan menjumlahkan seluruh tonase udang yang berhasil dijual dari setiap panen parsial ditambah panen total akhir. Akumulasi tonase produksi riil ini kemudian dibandingkan dengan total kilogram pakan yang secara fisik dikeluarkan dari gudang untuk mendapatkan nilai rasio konversi pakan (FCR) aktual. Selanjutnya, kurangkan seluruh biaya operasional siklus (pakan, benur, listrik, solar, upah tenaga kerja, probiotik/bahan kimia, dan upah tim panen) dari total pendapatan kotor penjualan udang untuk menghitung laba bersih riil per kolam dan Biaya Pokok Produksi (HPP/COGS) per kilogram udang.",
    },
  ],
  sections: [
    {
      heading: "Komponen vital pelacakan panen: Dari observasi biologis ke neraca bisnis riil",
      body: [
        "Panen merupakan titik kulminasi di mana seluruh observasi biologis diubah menjadi pencatatan bisnis riil. Sepanjang siklus budidaya, manajer tambak memantau estimasi biomassa, nafsu makan di anco, dan rata-rata bobot tubuh (MBW). Namun, angka-angka tersebut barulah proyeksi matematis sampai jaring panen diangkat dan udang diletakkan di atas timbangan. Jika pencatatan panen tidak terstruktur rapi, manajemen tambak kehilangan kemampuan untuk memvalidasi efisiensi pakan, akurasi sampling mingguan, dan profitabilitas riil setiap petak kolam.",
        "Pelacakan panen udang vaname (Litopenaeus vannamei) komersial modern memerlukan pencatatan parameter yang komprehensif. Setiap aktivitas panen harus mendokumentasikan: identitas nomor petak kolam, tanggal dan jam pelaksanaan, umur budidaya (DOC), metode panen (apakah menggunakan jala tarik manual, jaring kantong pada pintu pengeluaran monik, atau pompa hisap panen), total bobot kotor (gross weight), tara keranjang timbang, bobot bersih yang terjual (net saleable weight), rata-rata size (ekor per kilogram), identitas pembeli atau unit pengolahan, harga per kilogram per kelompok size, persentase udang afkir (reject/BS), serta total penerimaan kas.",
        "Selain nilai finansial langsung, kelengkapan catatan panen menjadi fondasi utama audit ketertelusuran produk (traceability) dan pemenuhan standar sertifikasi perikanan budidaya nasional maupun global (seperti CBIB, ASC, BAP, dan GlobalG.A.P.). Seluruh data ini dapat dikelola secara transparan dan otomatis terhubung ke laporan keuangan tambak melalui [Software Pelacakan Panen Udang](/id/features/shrimp-harvest-tracking).",
      ],
    },
    {
      heading: "Matriks perbandingan operasional: Panen Parsial (Thinning) vs Panen Total",
      body: [
        "Petambak udang intensif sering kali dihadapkan pada keputusan strategis antara melakukan panen parsial (thinning) untuk melonggarkan kepadatan kolam atau mempertahankan populasi hingga panen total akhir. Masing-masing pendekatan memiliki tujuan biologis, konsekuensi manajemen pakan, dan implikasi risiko yang berbeda:",
      ],
      table: {
        columns: ["Parameter Pembanding", "Panen Parsial (Thinning / Penjarangan)", "Panen Total (Final Harvest)"],
        rows: [
          [
            "Tujuan Utama",
            "Menurunkan beban biomassa kolam yang mendekati kapasitas daya dukung (carrying capacity), menghemat kebutuhan oksigen terlarut (DO), mengurangi akumulasi limbah dasar, dan memperoleh arus kas masuk (cash inflow) lebih cepat.",
            "Mengakhiri siklus pemeliharaan secara tuntas, mencairkan seluruh nilai komersial udang di kolam, dan mengosongkan petak untuk persiapan sanitasi dan pengeringan dasar kolam menuju siklus berikutnya.",
          ],
          [
            "Jendela Waktu (DOC)",
            "Umumnya dilakukan pada DOC 60–80 saat udang mencapai size 60–80 dan standing biomass kolam mendekati batas aman aerasi (misalnya > 1.000–1.200 kg/petak).",
            "Dilakukan pada DOC 85–120+ saat udang mencapai target size pasar maksimal (misalnya size 30–50), atau saat efisiensi pakan dan pertumbuhan (ADG) mulai stagnan.",
          ],
          [
            "Metode Penangkapan",
            "Penjaringan selektif menggunakan jala lempar atau jala kantong (trammel net) tanpa menguras habis air kolam; ketinggian air hanya diturunkan 10–20% sementara.",
            "Pengeringan air kolam secara bertahap via pintu pengeluaran (monik) dengan jaring kantong panen, pompa hisap panen, dan pemungutan manual sisa udang di dasar kolam.",
          ],
          [
            "Dampak Terhadap Kolam",
            "Berpotensi mengaduk lapisan lumpur anaerobik dasar jika jala menyentuh dasar; menimbulkan lonjakan stres sementara dan risiko penurunan nafsu makan pada udang yang tersisa.",
            "Ekosistem air kolam berakhir tuntas; lumpur dasar, feses, dan sisa bahan organik terpapar penuh untuk disipon, dicuci semprot, dan dikeringkan di bawah sinar matahari.",
          ],
          [
            "Tindakan Pasca-Panen Wajib",
            "Segera perbarui sisa populasi dan biomassa kolam; pangkas alokasi pakan harian sebesar 20–35% pada jadwal berikutnya; periksa stabilitas kualitas air dan aerasi.",
            "Rekonsiliasi total pakan gudang terhadap total tonase panen gabungan; kalkulasi nilai akhir FCR, Survival Rate (SR), dan laba bersih riil; tutup status siklus kolam.",
          ],
          [
            "Parameter Catatan Kritis",
            "Bobot parsial terangkat, distribusi size parsial, revisi estimasi sisa populasi, estimasi sisa biomassa baru, dan penyesuaian kurva feeding rate.",
            "Total tonase panen akhir, akumulasi tonase kumulatif (parsial + total), rata-rata size akhir, persentase reject total, dan penutupan mutasi stok pakan gudang.",
          ],
        ],
      },
      note: "Kesalahan paling fatal setelah panen parsial adalah keterlambatan teknisi dalam menyesuaikan takaran pakan harian. Jika 30% biomassa telah diangkat tetapi pakan tetap ditebar sesuai jadwal sebelumnya, kolam akan mengalami overfeeding parah dalam 24 jam pertama, meracuni dasar kolam dengan amonia dan nitrit serta memicu penurunan drastis kualitas air.",
    },
    {
      heading: "Standar operasional penanganan pascapanen, cold chain, dan pengendalian susut timbang",
      body: [
        "Kualitas udang segar menentukan harga per kilogram yang disepakati dengan pembeli. Penanganan pascapanen yang buruk dapat menyebabkan penurunan kesegaran (penurunan grade mutu), kerusakan fisik karapas, serta persentase susut timbang yang membengkak di pintu pabrik. Tiga pilar operasional berikut wajib dipatuhi selama proses panen:",
        "1. Kesiapan Pra-Panen dan Penghentian Pakan: Puasakan udang minimal 4 hingga 8 jam sebelum penarikan jaring perdana. Langkah ini memastikan saluran pencernaan bersih dari partikel pakan dan lumpur dasar yang dapat pecah dan mempercepat pembusukan bakteri. Selain itu, pastikan udang tidak sedang dalam fase ganti kulit (moulting) massal. Lakukan pengaplikasian mineral pengeras cangkang (CaCO3 atau dolomit) 2 hingga 3 hari sebelum panen untuk memastikan cangkang berada dalam kondisi keras sempurna (hard-shell).",
        "2. Rantai Dingin (Cold Chain) dan Kematian Termal Instan: Begitu udang diangkat dari jaring, lakukan pencucian singkat menggunakan air bersih bersalinitas sama untuk membersihkan partikel lumpur yang menempel. Masukkan udang segera ke dalam bak perendaman es slurry (campuran es curah dan air bersih dingin) bersuhu 0–2°C. Perlakuan 'cold shock' ini membunuh udang seketika tanpa menimbulkan stres fisik berkepanjangan, menghentikan aktivitas enzim proteolitik yang merusak tekstur daging, dan mencegah proliferasi bakteri pembusuk. Pastikan rasio es terhadap udang minimal 1:1, disusun berselang-seling di dalam boks fiber berinsulasi.",
        "3. Penirisan dan Pengendalian Susut Timbang (Weight Loss): Sebelum diletakkan di atas timbangan duduk digital, keranjang udang wajib ditiriskan selama 30 hingga 60 detik secara konsisten guna membuang kelebihan air rendaman. Pastikan timbangan telah ditera dan diuji dengan anak timbang kalibrasi standar di hadapan pihak pembeli. Selisih susut normal antara timbangan tambak dan timbangan meja penerimaan pabrik/cold storage berkisar antara 1% hingga 2%. Jika susut melebihi 3%, periksa kembali kecukupan es dalam armada pengangkut, durasi perjalanan, serta waktu tunggu antrean bongkar muat.",
      ],
    },
    {
      heading: "Tahapan pencatatan panen: Sebelum, selama, dan setelah panen",
      body: [
        "Pencatatan data panen harus berjalan secara sistematis melalui tiga fase operasional:",
      ],
      items: [
        "Fase Sebelum Panen (Pra-Panen / H-3 s/d H-1): Lakukan sampling jala untuk mengonfirmasi rata-rata bobot tubuh (MBW), distribusi size (ekor/kg), keseragaman ukuran, dan persentase cangkang keras (>90%). Konfirmasikan harga per size, toleransi tara air, dan jadwal kedatangan armada pembeli. Siapkan pasokan es balok berkualitas minimal 1 ton es per 1 ton estimasi udang. Hentikan pemberian pakan (puasakan udang) minimal 4–6 jam sebelum jaring pertama masuk ke kolam.",
        "Fase Selama Panen (Hari-H Pelaksanaan): Catat nomor keranjang, bobot kotor, tara keranjang, dan bobot bersih pada lembar tally timbang secara real-time. Ambil sampel acak per 500 kg udang untuk memvalidasi size riil (ekor/kg) bersama perwakilan pembeli. Pisahkan udang berkulit lunak, cacat fisik, atau bercak hitam ke dalam keranjang sortasi reject dan dokumentasikan bobotnya secara terpisah. Pastikan suhu bak penampungan sementara tetap terjaga di bawah 4°C. Tandatangani berita acara timbang bersama untuk setiap ritase truk yang diberangkatkan.",
        "Fase Setelah Panen (Pasca-Panen & Rekonsiliasi): Jika melakukan panen parsial, segera masukkan data tonase terangkat ke sistem manajemen kolam untuk merevisi sisa populasi dan memangkas takaran pakan harian. Jika melakukan panen total, rekapitulasi seluruh nota timbang dan slip pembayaran pembeli. Lakukan rekonsiliasi total tonase terhadap akumulasi pakan gudang untuk menghitung FCR akhir, Survival Rate (SR) definitif, dan margin keuntungan siklus.",
      ],
    },
    {
      heading: "Rekonsiliasi siklus budidaya: Menghubungkan panen dengan performa biologis dan finansial",
      body: [
        "Pencatatan panen baru bermakna penuh ketika dihubungkan kembali dengan seluruh rekam jejak budidaya sejak hari tebar benur (DOC 0). Dengan mengonsolidasikan data panen terhadap log pakan harian, dinamika kualitas air, dan data sampling, manajemen tambak dapat mengevaluasi empat metrik performa utama siklus:",
        "1. Survival Rate (SR) Riil Definitif: Menghitung persentase kelangsungan hidup riil dengan rumus: SR (%) = [(Total Tonase Panen Parsial × Rata-rata Size Parsial) + (Total Tonase Panen Akhir × Rata-rata Size Akhir)] / Total Benur Ditebar Awal × 100. Angka ini membuktikan seberapa akurat prediksi mortalitas harian yang dicatat selama siklus berlangsung di [Pencatatan Tambak Udang](/id/resources/shrimp-farm-record-keeping).",
        "2. Rasio Konversi Pakan (FCR) Aktual: FCR = Total Kilogram Pakan Gudang yang Ditebar / Total Kilogram Udang yang Dipanen (Parsial + Akhir). Angka FCR riil ini menjadi indikator paling objektif apakah strategi manajemen pakan dan pembacaan anco harian telah berjalan efisien atau terjadi pemborosan pakan yang menekan profitabilitas tambak. Pelajari tolok ukurnya di [Panduan Optimalisasi FCR Tambak Udang](/id/resources/fcr-shrimp-farming).",
        "3. Biaya Pokok Produksi (COGS / HPP) per Kilogram: HPP per kg = Total Seluruh Biaya Operasional Siklus (Pakan, Benur, Listrik, Bahan Bakar, Upah Kerja, Probiotik/Bahan Kimia, dan Biaya Panen) / Total Kilogram Udang Terjual. Mengetahui HPP per kg memungkinkan pemilik tambak menetapkan batas harga jual minimum saat bernegosiasi dengan pembeli.",
        "4. Kalibrasi Akurasi Sampling: Bandingkan prediksi rata-rata bobot tubuh (MBW) pada sampling terakhir dari [Grafik Pertumbuhan Udang Vannamei](/id/resources/vannamei-growth-chart) terhadap size timbangan riil saat panen. Deviasi yang terlalu besar menandakan adanya bias teknik penjaringan sampling yang perlu dikalibrasi pada [Perencanaan Siklus Budidaya Udang](/id/resources/shrimp-cycle-planning) berikutnya.",
      ],
    },
  ],
  checklist: [
    "Pisahkan pencatatan panen parsial (thinning) dari panen total akhir siklus secara tegas dan sistematis.",
    "Dokumentasikan nomor petak kolam, tanggal, jam, bobot timbang riil, size (ekor/kg), nama pembeli, dan harga per kilogram.",
    "Puasakan udang minimal 4–6 jam sebelum panen dan pastikan cangkang udang mengeras (tidak sedang moulting massal).",
    "Terapkan rantai dingin (cold chain) dengan merendam udang pada air es slurry suhu 0–2°C (rasio es minimal 1:1) dan tiriskan 30–60 detik sebelum ditimbang.",
    "Perbarui sisa populasi, estimasi biomassa, dan takaran pakan harian seketika setelah panen parsial selesai guna mencegah overfeeding.",
    "Lakukan rekonsiliasi total tonase panen terhadap log pakan dan sampling mingguan untuk menghitung FCR riil, SR akhir, dan laba bersih operasional siklus.",
  ],
  sources: [
    {
      title: "Partial Harvesting: A Smart Strategy for Shrimp Farmers",
      publisher: "Responsible Seafood Advocate",
      url: "https://www.globalseafood.org/advocate/partial-harvesting-a-smart-strategy-for-shrimp-farmers/",
    },
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Comparative Analysis of Profitability and Resource Use Efficiency Between Penaeus monodon and Litopenaeus vannamei in India",
      publisher: "Aquaculture Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8096089/",
    },
  ],
};
