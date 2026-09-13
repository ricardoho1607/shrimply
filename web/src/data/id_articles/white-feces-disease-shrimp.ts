import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "white-feces-disease-shrimp",
  section: "Air, Kesehatan, dan Risiko",
  label: "Risiko Penyakit",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "Penyakit Berak Putih pada Udang (WFD): Penyebab, Penanganan, dan Pencegahan",
  description:
    "Panduan komprehensif penyakit berak putih (White Feces Disease/WFD atau White Feces Syndrome) pada udang vaname: gejala klinis, parameter kolam kritis, koinfeksi EHP dan Vibrio, protokol tanggap darurat, aplikasi probiotik Bacillus, serta pencegahan jangka panjang.",
  readTime: "9 menit baca",
  tags: [
    "penyakit berak putih",
    "berak putih udang",
    "WFD",
    "WFS",
    "white feces syndrome",
    "EHP",
    "Vibrio",
    "Bacillus",
    "probiotik tambak",
    "kesehatan usus udang",
  ],
  publishedAt: "2026-06-12",
  updatedAt: "2026-09-13",
  image: {
    src: "/resources/images/white-feces-disease-wfd-shrimp-guide.png",
    alt: "Panduan teknis penyakit berak putih (WFD) tambak udang vaname yang menampilkan gejala klinis kotoran putih, faktor risiko koinfeksi EHP dan Vibrio, parameter air, tindakan tanggap darurat, dan langkah pencegahan",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Software Peringatan Penyakit", href: "/id/features/disease-alerts" },
  takeaways: [
    "Penyakit berak putih (WFD) lebih tepat dipahami sebagai sindrom multifaktorial yang melibatkan integritas saluran pencernaan dan stabilitas ekosistem kolam, bukan sekadar infeksi satu patogen tunggal.",
    "Beban bahan organik tinggi, sisa pakan membusuk, alkalinitas atau pH yang tidak stabil, defisit oksigen terlarut (DO), akumulasi amonia/nitrit, mikrosporidia EHP, dan bakteri Vibrio patogenik bekerja secara sinergis merusak hepatopankreas serta mikrobioma usus udang.",
    "Pencegahan jangka panjang bertumpu pada persiapan kolam yang higienis, skrining benur bebas patogen (SPF/PCR), kestabilan kualitas air, kontrol pakan presisi di anco, biosekuriti ketat, dan aplikasi rutin probiotik unggul seperti galur Bacillus.",
  ],
  faqs: [
    {
      question: "Apa saja tanda-tanda awal timbulnya penyakit berak putih (WFD) pada udang vaname?",
      answer:
        "Gejala visual paling khas adalah munculnya untaian kotoran putih pucat yang mengapung di permukaan air kolam (terutama di area pengumpulan buangan angin atau arus kincir) dan menumpuk di atas nampan anco. Namun sebelum kotoran putih terlihat secara kasat mata, tanda peringatan awal biasanya telah muncul 2 hingga 3 hari sebelumnya: nafsu makan di anco anjlok mendadak, usus udang terlihat kosong atau berwarna putih/kekuningan, hepatopankreas mengecil dan memucat, cangkang lembek (soft shell), disparitas ukuran melebar, serta laju pertumbuhan harian (ADG) yang melambat drastis.",
    },
    {
      question: "Apakah penyakit berak putih (WFD) disebabkan oleh satu jenis mikroorganisme saja?",
      answer:
        "Bukan. Berbagai riset ilmiah membuktikan bahwa WFD merupakan sindrom multifaktorial. Penyebab paling umum yang terbukti secara eksperimental adalah interaksi sinergis antara mikrosporidia Enterocytozoon hepatopenaei (EHP) yang merusak sel-sel tubulus hepatopankreas dengan bakteri oportunistik Vibrio patogenik (seperti galur Vibrio parahaemolyticus tertentu). Kondisi ini kemudian dipicu dan diperparah oleh pembusukan bahan organik di dasar kolam, defisit oksigen terlarut (DO < 3 mg/L), alkalinitas rendah (< 80 ppm), serta disbiosis pada komunitas mikrobioma saluran pencernaan udang.",
    },
    {
      question: "Apa langkah tanggap darurat pertama saat kotoran putih ditemukan di kolam atau anco?",
      answer:
        "Segera terapkan tiga langkah tanggap cepat: Pertama, pangkas pakan harian minimal 30% hingga 50% atau puasakan sejenak untuk menghentikan akumulasi bahan organik di dasar kolam. Kedua, maksimalkan operasional kincir aerasi guna mempertahankan oksigen terlarut (DO) di atas 5 mg/L dan lakukan penyiponan lumpur dasar (central drain) secara intensif dan hati-hati untuk membuang feses patogenik serta bangkai udang. Ketiga, terapkan isolasi operasional ketat pada peralatan kerja (jala, anco, ember pakan, selang) dan kunci saluran pembuangan air agar spora dan bakteri patogen tidak menular ke petak kolam lainnya.",
    },
  ],
  sections: [
    {
      heading: "Memahami apa itu penyakit berak putih (WFD) sebenarnya",
      body: [
        "Penyakit berak putih (White Feces Disease/WFD), yang juga kerap diistilahkan sebagai White Feces Syndrome (WFS), dikenali di tambak ketika untaian kotoran berwarna putih pucat mengapung di permukaan air kolam atau menumpuk di atas nampan anco. Udang yang terinfeksi umumnya memperlihatkan gejala usus kosong atau berwarna keputihan hingga kekuningan, hepatopankreas mengecil dan pudar, penurunan nafsu makan mendadak, laju pertumbuhan terhambat, disparitas ukuran yang sangat mencolok, cangkang lembek (soft shell), mortalitas kronis yang merayap di dasar, serta pembengkakan rasio konversi pakan (FCR).",
        "Poin krusial bagi tim teknis tambak adalah bahwa WFD merupakan suatu sindrom klinis kompleks, bukan penyakit sederhana dengan diagnosis tunggal dari satu tanda visual semata. Berbagai kajian ilmiah menegaskan sifat multifaktorialnya. Berbagai penelitian mengaitkan kemunculan WFD atau WFS dengan interaksi antara mikrosporidia Enterocytozoon hepatopenaei (EHP), infeksi spesies bakteri Vibrio patogenik, ketidakseimbangan (disbiosis) mikrobioma saluran pencernaan, kerusakan jaringan hepatopankreas, pergeseran drastis komunitas bakteri tambak, serta penurunan kualitas air kolam secara signifikan.",
        "Oleh karena itu, tindakan tanggap tambak tidak boleh sekadar berhenti pada memberi label nama penyakit. Manajer tambak dan praktisi lapangan wajib menginvestigasi akar masalah secara menyeluruh: apa yang berubah pada respons nafsu makan udang, sisa pakan di anco, stabilitas parameter air, beban bahan organik, kondisi dasar dan lumpur kolam, tekanan populasi Vibrio, riwayat infeksi EHP, serta celah biosekuriti dalam beberapa hari terakhir?",
      ],
    },
    {
      heading: "Mengapa WFD jarang dipicu oleh satu penyebab tunggal",
      body: [
        "Sebuah studi uji infeksi yang dipublikasikan dalam jurnal PLOS ONE berhasil mereproduksi gejala klinis WFS pada udang vaname ketika udang yang telah terinfeksi awal oleh mikrosporidia EHP kemudian dipaparkan pada isolat bakteri Vibrio parahaemolyticus tertentu. Para peneliti menyimpulkan bahwa terjadi hubungan sinergis yang sangat destruktif antara infeksi parasit EHP dan paparan isolat Vibrio tersebut.",
        "Temuan ini sangat bernilai praktis bagi tambak karena menjelaskan mengapa sebagian kolam yang positif EHP tidak selalu memunculkan gejala berak putih, dan mengapa tingginya angka hitungan Vibrio semata belum tentu otomatis memicu wabah WFD. Ekspresi klinis penyakit ini sangat bergantung pada integritas fisiologis saluran pencernaan udang, kesehatan organ hepatopankreas, kestabilan ekosistem perairan dan dasar kolam, serta keseimbangan komunitas mikroba perairan dalam waktu yang bersamaan.",
        "Penelitian probiotik terkini semakin memperkuat pandangan koinfeksi dan peran sentral mikrobioma usus ini. Publikasi ilmiah tahun 2024 di npj Biofilms and Microbiomes memvalidasi etiologi WFS menggunakan kombinasi koktail tiga spesies bakteri Vibrio patogenik, sekaligus membuktikan bahwa formulasi konsorsium probiotik terencana yang melibatkan Bacillus subtilis mampu menekan keparahan penyakit melalui poros probiotik-mikrobioma-imunitas.",
      ],
    },
    {
      heading: "Parameter dan kondisi tambak yang memicu lonjakan risiko WFD",
      body: [
        "Petambak harus membaca risiko WFD dari pergerakan tren parameter kolam harian, bukan sekadar melihat hasil uji air sesaat. Riset mengenai struktur komunitas bakteri selama wabah WFD menunjukkan bahwa kemunculan kotoran putih di permukaan selalu didahului oleh fluktuasi parameter kualitas air yang mendadak, pergeseran komunitas bakteri tambak, serta penurunan konsumsi pakan di anco sejak 2 hingga 3 hari sebelum kotoran putih terlihat secara kasat mata.",
        "Parameter kunci yang wajib dievaluasi secara ketat meliputi oksigen terlarut (DO), pH, alkalinitas, suhu air, salinitas, amonia (TAN), nitrit (NO2), fosfat (PO4), kekeruhan (turbiditas), total padatan tersuspensi (TSS), bahan organik total (TOM), sisa pakan di anco, serta kepadatan populasi Vibrio (lempeng agar TCBS). Pada riset Scientific Reports, pembeda utama antara kolam yang sehat dan kolam terinfeksi sangat dipengaruhi oleh kelimpahan Vibrio patogenik terduga, amonium, fosfat, pH, suhu, dan turbiditas, dengan kontribusi signifikan dari nitrit, nitrat, silikat reaktif, dan salinitas.",
        "Defisit oksigen dan rendahnya kapasitas penyangga (buffering capacity) memperburuk kerusakan kondisi udang. Laporan ilmiah mencatat bahwa kadar oksigen terlarut di bawah 3,0 mg/L dan alkalinitas di bawah 80 ppm berkorelasi kuat dengan lonjakan mortalitas puncak selama wabah WFD berlangsung. Untuk manajemen praktis, tim tambak tidak boleh menunggu hingga DO jatuh ke tingkat kritis; penurunan nafsu makan di anco, air kolam yang tiba-tiba keruh pekat atau berubah warna, pembengkakan bahan organik, atau fluktuasi pH harian yang melebihi 0,5 harus segera memicu audit kualitas air dan evaluasi kondisi dasar kolam.",
      ],
    },
    {
      heading: "Tindakan tanggap darurat saat kotoran putih mulai muncul",
      body: [
        "Pertama, konfirmasi pola persebaran gejala. Periksa permukaan air di sudut mati kolam, area buangan kincir, dan seluruh nampan anco kontrol. Ambil sampel udang untuk memeriksa kondisi saluran pencernaan di bawah mikroskop (warna usus, hepatopankreas, keberadaan agregasi mikroba atau gregarin), bandingkan tren konsumsi pakan terhadap catatan 3 hingga 5 hari sebelumnya, dan dokumentasikan mortalitas harian. Jika fasilitas laboratorium diagnostik tersedia, segera lakukan uji PCR untuk EHP dan hitung koloni Vibrio (khususnya koloni hijau pada TCBS) alih-alih hanya mengandalkan pengamatan visual semata.",
        "Kedua, kurangi beban stres pada ekosistem kolam. Segera pangkas alokasi pakan harian antara 30% hingga 50% atau puasakan sejenak jika anco menunjukkan sisa pakan berlebih guna mencegah pembusukan di dasar kolam. Lakukan penyiponan dasar kolam (central drain) secara intensif dan hati-hati untuk mengeluarkan endapan lumpur feses dan bangkai udang, maksimalkan putaran kincir aerasi (pertahankan DO > 5 mg/L), naikkan alkalinitas ke rentang aman (120–150 ppm) secara bertahap menggunakan natrium bikarbonat atau kapur, serta monitor kadar amonia dan nitrit. Hindari penggunaan bahan kimia keras atau desinfektan berspektrum luas secara serampangan yang dapat mengejutkan udang yang sedang sakit atau meruntuhkan komunitas bakteri perombak alami kolam.",
        "Ketiga, terapkan isolasi operasional dan biosekuriti ketat. Batasi dan sterilkan peralatan panen, jala sampling, selang sipon, ember pakan, serta alas kaki petugas antara kolam yang bergejala dan kolam yang masih sehat. Untaian kotoran putih dan serpihan feses yang hancur mengandung beban patogen serta spora mikroba yang sangat menular, sehingga risiko perpindahan patogen antar-kolam akibat kelalaian sanitasi alat atau perpindahan air buangan harus dicegah tanpa kompromi.",
      ],
    },
    {
      heading: "Dukungan penanganan: ekspektasi realistis di lapangan",
      body: [
        "Tidak ada 'obat instan' satu langkah yang dapat dipertanggungjawabkan untuk menyembuhkan WFD di semua kondisi tambak. Protokol penanganan yang realistis dan bertanggung jawab berfokus pada empat pilar utama: memulihkan kesehatan mukosa usus dan hepatopankreas udang, menekan tekanan populasi patogen oportunistik, menstabilkan parameter fisiko-kimia air, serta mengeliminasi kondisi manajemen keliru yang memicu merebaknya wabah.",
        "Program penanganan praktis mencakup pemotongan pakan saat nafsu makan melemah, pencampuran suplemen pakan (feed additive) pelindung saluran pencernaan, asam organik (seperti asam format atau butirat) untuk menurunkan pH usus, suplemen vitamin C dan imunostimulan (seperti beta-glukan) sesuai rekomendasi dokter hewan atau spesialis patologi tambak, penyiponan dasar secara disiplin, perbaikan kualitas air, serta aplikasi probiotik perombak bahan organik. Pemilihan produk, dosis, dan interval aplikasi wajib mematuhi regulasi perikanan yang berlaku, petunjuk label resmi, dan diagnosis profesional berbasis data lapangan.",
        "Penggunaan antibiotik secara sembarangan sangat tidak dianjurkan. WFD bukanlah infeksi bakteri tunggal murni, dan penyalahgunaan antibiotik dapat memicu resistensi antimikroba (AMR), menghancurkan flora mikrobioma usus udang yang menguntungkan, merusak kepatuhan residu saat panen, serta menggagalkan pengendalian penyakit di masa depan. Setiap pertimbangan terapi medikasi harus didasarkan pada bukti diagnostik laboratorium dan berada di bawah pengawasan dokter hewan atau tenaga ahli berwenang.",
      ],
    },
    {
      heading: "Aplikasi probiotik Bacillus dan pencegahan berbasis mikrobioma",
      body: [
        "Probiotik berbasis Bacillus sangat bernilai dalam budidaya vaname karena kemampuannya memproduksi enzim ekstraseluler perombak bahan organik (lumpur sisa pakan dan feses), menjaga stabilitas ekosistem perairan, serta beberapa galur mampu mengantagonis atau menghambat kolonisasi bakteri patogen melalui produksi senyawa antimikroba alami. Kunci utamanya terletak pada spesifikasi galur (strain). Produk probiotik harus dipilih berdasarkan bukti ilmiah yang teruji, viabilitas spora hidup yang tinggi, stabilitas penyimpanan, dan kesesuaian dengan salinitas serta sistem tambak Anda, bukan sekadar membeli produk berlabel probiotik tanpa rekam jejak yang jelas.",
        "Studi inovatif tahun 2024 mengenai mitigasi WFS menggunakan konsorsium probiotik terencana yang memadukan galur Bacillus subtilis bersama isolat Ruegeria, Nioella, dan Streptomyces. Para peneliti melaporkan efek proteksi nyata melalui pemulihan stabilitas mikrobioma usus, antagonisme langsung terhadap patogen Vibrio, serta stimulasi jalur kekebalan tubuh udang. Meskipun hal ini tidak berarti semua produk Bacillus generik dapat langsung mencegah WFD, bukti ini mempertegas pentingnya strategi jangka panjang: membangun komunitas mikrobioma usus dan perairan yang tangguh dan kompetitif.",
        "Kajian aplikasi probiotik perairan pada tambak udang vaname dengan sistem minim ganti air juga membuktikan bahwa pemberian probiotik air secara konsisten mampu menurunkan kadar amonia bebas dan menekan total hitungan Vibrio, sekaligus menjaga kelarutan oksigen. Temuan ini sangat selaras dengan prinsip manajemen budidaya yang sehat: probiotik bekerja paling optimal sebagai langkah pencegahan harian sebelum kolam mengalami kelebihan beban organik, bukan sebagai tindakan penyelamatan darurat di saat nafsu makan udang sudah anjlok dan kondisi kolam telah kolaps.",
      ],
    },
    {
      heading: "Rencana pencegahan komprehensif jangka panjang",
      body: [
        "Pencegahan WFD yang efektif dimulai jauh sebelum benur ditebar. Jalankan persiapan petak kolam secara higienis: buang seluruh endapan lumpur sisa siklus sebelumnya, lakukan pengeringan dasar kolam dan desinfeksi menggunakan kalsium oksida (kapur tohor) atau klorin untuk mematikan spora mikrosporidia EHP yang resisten, pasang saringan air bertingkat (filter mesh), serta pastikan benur (post-larvae) berasal dari indukan bebas patogen spesifik (SPF) dengan hasil uji laboratorium PCR negatif EHP dan Vibrio patogenik. Jangan pernah menebar benur dengan kondisi usus rapuh atau riwayat kesehatan yang meragukan.",
        "Selama masa pemeliharaan, terapkan kedisiplinan kontrol pakan yang ketat. Pantau nampan anco secara rutin sesuai jadwal, jangan memaksakan menaikkan ransum harian saat pakan di anco masih bersisa atau nafsu makan melemah, catat pakan per petak kolam, dan evaluasi respons pakan terhadap tren DO fajar, fluktuasi pH sore, lonjakan amonia/nitrit, serta perubahan cuaca hujan. Pemberian pakan berlebih (overfeeding) adalah penyebab tercepat terjadinya penumpukan lumpur organik di dasar kolam yang menjadi tempat berkembang biak empuk bagi bakteri Vibrio dan pemicu utama stres saluran cerna.",
        "Bangun rutinitas evaluasi risiko WFD secara berkala. Minimal seminggu sekali, lakukan audit terpadu: pantau tren nafsu makan di anco, keberadaan kotoran putih terapung, warna dan kepenuhan usus, rasio udang berkulit lembek, angka kematian di saringan pengeluaran, dinamika pertambahan bobot (ADG) dan FCR, serta tren DO, pH, alkalinitas, TAN, NO2, salinitas, kecerahan, dan konsistensi jadwal probiotik. Tujuannya adalah melakukan intervensi korektif sejak dini selagi udang masih aktif merespons pakan, bukan terlambat bertindak setelah laju pertumbuhan terhenti dan biomassa kolam menyusut.",
      ],
    },
    {
      heading: "Bagaimana integrasi catatan digital Shrimply membantu petambak",
      body: [
        "Penyakit berak putih (WFD) adalah tipikal masalah tambak yang polanya menjadi jauh lebih transparan saat seluruh catatan operasional kolam saling terhubung dalam satu sistem data terpadu. Log pakan harian membuktikan apakah nafsu makan sudah turun beberapa hari sebelum kotoran putih terlihat di permukaan. Tren kualitas air mengindikasikan apakah terjadi pergeseran tajam pada pH, DO, amonia, nitrit, atau kecerahan air kolam. Sampling mingguan memvalidasi apakah rata-rata bobot tubuh (MBW) dan pertambahan bobot harian (ADG) mengalami stagnasi (seperti diulas dalam panduan [Troubleshooting ADG Rendah](/id/resources/slow-shrimp-growth-adg-troubleshooting)). Sementara itu, pencatatan mortalitas menunjukkan apakah infeksi bersifat kronis merayap atau akut.",
        "Bagi asisten AI cerdas Orson dan modul [Software Peringatan Penyakit](/id/features/disease-alerts) di Shrimply, input paling akurat bukanlah sekadar catatan insidental bertuliskan 'WFD'. Kekuatan deteksi dini hadir dari rangkaian data historis: beberapa catatan kualitas air terakhir, hasil sampling pertumbuhan, observasi persentase anco, tren mortalitas harian, penyesuaian pakan, serta riwayat aplikasi probiotik. Dengan korelasi multivariat ini, petambak memiliki peluang jauh lebih besar untuk membedakan secara tepat apakah anomali yang terjadi merupakan gangguan kesehatan saluran cerna, degradasi kualitas air, kesalahan manajemen pakan, atau kebocoran biosekuriti tambak.",
      ],
    },
  ],
  checklist: [
    "Pantau kemunculan kotoran putih terapung, kondisi usus pucat/kosong, penurunan nafsu makan di anco, cangkang lembek, mortalitas dasar, penurunan laju ADG, dan pembengkakan FCR secara terintegrasi.",
    "Evaluasi parameter DO, pH, alkalinitas, amonia (TAN), nitrit, fosfat, kecerahan/turbiditas, salinitas, suhu, akumulasi bahan organik, dan sisa pakan di anco setiap hari.",
    "Lakukan pengujian laboratorium untuk konfirmasi infeksi mikrosporidia EHP dan penghitungan koloni Vibrio patogenik (agar TCBS) sesegera mungkin.",
    "Pangkas alokasi pakan 30% hingga 50% saat nafsu makan udang melemah dan lakukan perbaikan parameter kualitas air secara bertahap tanpa menimbulkan kejutan stres.",
    "Tingkatkan suplai aerasi kincir (pertahankan DO > 5 mg/L), intensifkan penyiponan lumpur dasar melalui central drain, dan perketat biosekuriti peralatan kerja antar-kolam.",
    "Aplikasikan probiotik Bacillus unggul atau konsorsium mikroba berkhasiat sebagai instrumen pencegahan terjadwal, bukan sekadar tindakan darurat saat kolam sudah kolaps.",
    "Dokumentasikan setiap tindakan penanganan, penyesuaian pakan, dan aplikasi bahan perlakuan secara digital agar respons pemulihan dapat dianalisis secara akurat.",
  ],
  sources: [
    {
      title: "White Feces Syndrome, A Multifactorial Syndrome of Cultured Shrimp: A Mini Review",
      publisher: "Fishes",
      url: "https://www.mdpi.com/2410-3888/7/6/339",
    },
    {
      title: "Experimental Reproduction of White Feces Syndrome in Whiteleg Shrimp, Penaeus vannamei",
      publisher: "PLOS ONE",
      url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0261289",
    },
    {
      title: "Structure and Co-Occurrence Patterns of Bacterial Communities Associated with White Faeces Disease Outbreaks in Pacific White-Leg Shrimp",
      publisher: "Scientific Reports",
      url: "https://www.nature.com/articles/s41598-020-68891-6",
    },
    {
      title: "Rationally Designed Probiotics Prevent Shrimp White Feces Syndrome via the Probiotics-Gut Microbiome-Immunity Axis",
      publisher: "npj Biofilms and Microbiomes",
      url: "https://www.nature.com/articles/s41522-024-00509-5",
    },
    {
      title: "Effects of Probiotics on Ammonia Degradation in Vitro and in Pacific White Shrimp Ponds",
      publisher: "Responsible Seafood Advocate",
      url: "https://www.globalseafood.org/advocate/effects-of-probiotics-on-ammonia-degradation-in-vitro-and-in-pacific-white-shrimp-ponds/",
    },
    {
      title: "The Role of Probiotics in Vannamei Shrimp Aquaculture Performance",
      publisher: "Fish and Shellfish Immunology Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10082739/",
    },
  ],
};
