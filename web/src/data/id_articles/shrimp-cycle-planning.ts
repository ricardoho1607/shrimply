import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultOperationsReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-cycle-planning",
  section: "Manajemen Tambak",
  label: "Manajemen Tambak",
  author: defaultResourceAuthorID,
  reviewer: defaultOperationsReviewerID,
  title: "Perencanaan Siklus Budidaya Udang: Dari Tebar Benur hingga Panen Tanpa Tebak-tebakan",
  description: "Panduan praktis perencanaan siklus budidaya udang vaname (Litopenaeus vannamei): penetapan target tebar benur, proyeksi logistik pakan, titik kontrol sampling pertumbuhan, mitigasi risiko operasional, dan kalkulasi waktu panen yang presisi.",
  readTime: "6 menit baca",
  tags: [
    "perencanaan siklus budidaya udang",
    "jadwal tebar benur",
    "target panen",
    "biomassa",
    "logistik pakan",
    "sampling udang",
    "mitigasi risiko cuaca",
    "vannamei",
    "DOC udang",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-cycle-planning-stocking-harvest-vannamei.jpg",
    alt: "Infografis perencanaan siklus budidaya udang vannamei dari tebar benur dan proyeksi pakan hingga titik kontrol sampling, evaluasi risiko, dan estimasi jendela panen",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Aplikasi Budidaya Vannamei", href: "/id/vannamei-shrimp-farming-app" },
  takeaways: [
    "Rencana siklus budidaya wajib menetapkan target size (bobot panen), padat tebar benur, proyeksi logistik pakan, serta titik kontrol evaluasi berkala secara terukur.",
    "Titik kontrol sampling pertumbuhan berkala membantu teknisi tambak mengoreksi takaran pakan harian dan strategi panen jauh sebelum memasuki pekan-pekan krusial akhir siklus.",
    "Mitigasi risiko penyakit dan pemantauan stabilitas kualitas air harus terintegrasi langsung dalam rencana operasional harian, bukan sekadar respons darurat saat krisis terjadi.",
  ],
  faqs: [
    {
      question: "Berapa padat tebar yang ideal untuk budidaya udang vaname?",
      answer: "Tidak ada satu angka padat tebar yang aman untuk semua tambak. Standar komersial berkisar antara 5–15 PL/m² untuk kolam tanah ekstensif/tradisional, 20–50 PL/m² untuk semi-intensif, hingga 60–150 PL/m² untuk kolam intensif berlapis plastik HDPE dengan aerasi kincir mekanis terdedikasi. Gunakan [Kalkulator Padat Tebar Vannamei](/id/resources/vannamei-stocking-density) kami untuk mensimulasikan kebutuhan benur, daya dukung kolam (carrying capacity), serta kebutuhan kapasitas aerasi kincir.",
    },
    {
      question: "Bagaimana tahapan menyusun rencana siklus budidaya udang dari tebar hingga panen?",
      answer: "Tetapkan target ukuran panen (size/ABW) dan jendela panen yang diharapkan, susun rencana tebar benur (jumlah PL dan sertifikasi SPF/SPR), proyeksikan tingkat kelangsungan hidup (SR), hitung kurva kebutuhan pakan per fase, jadwalkan titik kontrol sampling (MBW dan ADG), tetapkan ambang batas kualitas air harian, siapkan SOP mitigasi risiko penyakit, serta petakan kebutuhan arus kas operasional (cash flow). Sepanjang siklus berlangsung, sesuaikan rencana tersebut dengan data riil sampling, konsumsi pakan harian, catatan mortalitas, dan hasil panen parsial.",
    },
  ],
  sections: [
    {
      heading: "Komponen utama rencana siklus budidaya yang aplikatif",
      body: [
        "Rencana siklus budidaya udang vaname harus diawali dengan kejelasan spesifikasi petak kolam, rekam jejak hatchery asal benur (post-larvae/PL), tanggal tebar, total populasi tebar, estimasi tingkat kelangsungan hidup (survival rate/SR), target ukuran udang (size/ABW panen), estimasi umur pemeliharaan (Day of Culture/DOC), anggaran logistik pakan, serta rutinitas pemantauan kualitas air. Parameter-parameter dasar ini menciptakan garis acuan (baseline) yang kokoh bagi seluruh pengambilan keputusan teknis di tambak.",
        "Perencanaan operasional yang presisi sangat krusial karena budidaya udang vaname (Litopenaeus vannamei) sangat sensitif terhadap padat tebar, manajemen pakan harian, kestabilan ekosistem air kolam, dan biosekuriti pencegahan penyakit. Dokumen rencana budidaya memberi manajer tambak dan teknisi lapangan panduan objektif saat pertambahan bobot harian (ADG) mulai tertinggal, nafsu makan di anco menurun, atau cuaca ekstrem memicu ancaman penyakit.",
      ],
      table: {
        columns: ["Fase Siklus", "Rentang DOC", "Fokus Operasional & Pakan", "Titik Kontrol Biologis", "Mitigasi Risiko Utama"],
        rows: [
          [
            "Persiapan Kolam & Tebar Benur",
            "DOC 0 – 15",
            "Sterilisasi air, pembentukan plankton (fito/probiotik), aklimatisasi suhu & salinitas, blind feeding bertahap",
            "Kualitas benur (uji stres formalin/salinitas), survival rate awal pasca-aklimatisasi",
            "Hindari tebar benur saat cuaca hujan lebat atau fluktuasi suhu ekstrem; pastikan residu kaporit 0 ppm",
          ],
          [
            "Fase Awal Pembesaran",
            "DOC 16 – 45",
            "Mulai kontrol pakan via anco (feed tray), transisi ukuran pakan crumble ke pelet, aplikasi probiotik rutin",
            "Pemeriksaan hepatopankreas & usus, pencatatan mortalitas dasar harian, sampling blind/scoop",
            "Waspadai drop alkalinitas (< 100 ppm) saat udang moulting serentak; pantau kestabilan pH pagi dan sore",
          ],
          [
            "Fase Pertumbuhan Pesat & Puncak Biomassa",
            "DOC 46 – 80",
            "Kalkulasi feeding rate berdasarkan sampling MBW mingguan, pengoperasian kincir penuh malam hari (minimal 1 HP per 400–500 kg biomassa)",
            "Monitoring ADG (target > 0,25–0,35 g/hari), konfirmasi FCR berjalan, kontrol sisa pakan anco",
            "Akumulasi bahan organik di dasar kolam; siphon rutin central drain untuk mencegah lonjakan amonia bebas (NH3) dan nitrit (NO2)",
          ],
          [
            "Fase Akhir & Jendela Panen",
            "DOC 81 – 110+",
            "Optimasi efisiensi pakan, evaluasi panen parsial (thinning) untuk menurunkan biomassa, persiapan logistik panen",
            "Target ABW panen (misal size 30–50), tekstur cangkang keras (hindari panen saat moulting massal)",
            "Daya dukung kolam (carrying capacity) mendekati batas; risiko anjloknya DO dini hari (< 4 mg/L); mitigasi cuaca mendung berkepanjangan",
          ],
        ],
      },
      note: "Jangan pernah menebar benur sebelum parameter kualitas air kolam stabil selama minimal 5 hingga 7 hari pasca-sterilisasi. Kestabilan alkalinitas (120–150 ppm), pH (7,8–8,2), dan ketiadaan residu desinfektan kimiawi jauh lebih penting daripada memaksakan jadwal tebar yang terburu-buru.",
    },
    {
      heading: "Rancang ritme evaluasi operasional sebelum tebar benur",
      body: [
        "Tambak udang komersial harus menetapkan ritme evaluasi operasional sejak sebelum benur masuk ke kolam: kapan sampling pertumbuhan perdana dilakukan, seberapa sering bobot rata-rata (mean body weight/MBW) diukur, parameter kualitas air apa saja yang diuji harian, serta kapan rapat koordinasi mingguan diadakan. Tanpa ritme yang konsisten, pencatatan data lapangan akan berjalan acak-acakan dan performa siklus kolam menjadi mustahil dievaluasi secara akurat.",
        "Ritme kerja standar yang terbukti efektif di lapangan mencakup pengecekan air dan anco harian, audit mingguan performa kolam, serta jadwal sampling jala berkala setelah udang mencapai ukuran yang representatif (biasanya dimulai pada DOC 30 hingga 35). Jadwal pasti dapat disesuaikan dengan sistem budidaya (semi-intensif, intensif, atau super-intensif), padat tebar, dan SOP spesifik tambak.",
      ],
      items: [
        "Pemeriksaan Harian (Setiap Hari): Catat DO dini hari (04.30–05.30) dan sore hari, pH pagi dan sore, suhu air, kecerahan Secchi disk, respons pakan di anco (1,5–2 jam setelah tebar pakan), serta pengamatan visual kelakuan udang di pematang kolam.",
        "Evaluasi Mingguan (Setiap 7 Hari): Lakukan sampling jala untuk mengukur MBW, hitung laju pertumbuhan harian (ADG), estimasi standing biomass, audit FCR mingguan, dan sesuaikan tabel pakan harian untuk sepekan ke depan. Pelajari panduan [Kartu Skor Performa Kolam](/id/resources/pond-performance) untuk kerangka kerja evaluasi komprehensif.",
        "Pemeriksaan Kimia Air & Biologi Berkala (Setiap 3–5 Hari): Uji parameter laboratorium kolam mencakup total amonia nitrogen (TAN), nitrit (NO2), alkalinitas, kekerasan mineral (Ca, Mg), dan kepadatan koloni bakteri Vibrio (TCBS plate). Rujuk panduan [Parameter Kualitas Air Vannamei](/id/resources/vannamei-water-quality-parameters).",
        "Audit Siklus & Logistik Pakan (Dwi-Mingguan): Bandingkan total pakan yang telah dikonsumsi terhadap sisa stok fisik di gudang pakan untuk mencegah keterlambatan suplai pakan nomor berikutnya saat nafsu makan udang sedang memuncak.",
      ],
    },
    {
      heading: "Hubungkan rencana biologis dengan arus kas dan strategi panen",
      body: [
        "Perencanaan siklus budidaya yang unggul tidak hanya berfokus pada target biologis, melainkan juga memproyeksikan kapan kurva kebutuhan pakan akan mencapai puncaknya, kapan opsi panen parsial (thinning) perlu diambil, dan kapan pengeluaran arus kas (cash outflow) berada pada titik tertinggi. Langkah ini menjembatani performa biologis udang di kolam dengan ketahanan finansial bisnis tambak, alih-alih baru menghitung untung-rugi setelah kolam selesai dikeringkan.",
        "Pada budidaya udang vaname intensif, lebih dari 65% hingga 70% dari total konsumsi pakan dan biaya energi listrik/genset terkonsentrasi pada paruh kedua siklus (setelah DOC 60). Mengantisipasi lonjakan biaya ini melalui simulasi kebutuhan modal operasional memastikan operasional tambak tidak terganggu akibat krisis arus kas di saat udang membutuhkan pakan maksimal untuk mengejar target size panen bernilai jual tinggi.",
        "Selain itu, perhitungkan strategi panen parsial sejak awal perencanaan siklus. Jika padat tebar awal tinggi (misal > 100 PL/m²), melakukan panen parsial sebesar 25% hingga 35% biomassa pada DOC 65–75 dapat seketika memangkas beban daya dukung kolam, menurunkan risiko anjloknya oksigen terlarut (DO drop), menghasilkan suntikan modal tunai cepat, sekaligus memberi ruang gerak lebih longgar bagi udang yang tersisa untuk tumbuh cepat mencapai size premium.",
      ],
      note: "Hindari menunda panen hanya demi mengejar target size udang yang lebih besar jika parameter air mulai memburuk (nitrit melonjak, kecerahan drop, atau DO malam hari sulit bertahan di atas 4,0 mg/L). Keuntungan tambahan dari selisih harga size udang dapat sirna seketika apabila terjadi kematian massal akibat daya dukung kolam terlampaui.",
    },
  ],
  checklist: [
    "Tetapkan padat tebar benur, target size panen (ABW), estimasi tingkat kelangsungan hidup (SR), dan rentang jendela panen sejak awal.",
    "Proyeksikan kurva kebutuhan pakan harian dan jadwal pemesanan ulang (reorder) pakan sebelum siklus budidaya dimulai.",
    "Jadwalkan titik kontrol sampling jala mingguan serta rapat audit performa kolam secara disiplin.",
    "Integrasikan rencana mitigasi risiko penyakit, ambang batas kualitas air kritis, dan protokol darurat cuaca ekstrem.",
    "Simulasikan proyeksi arus kas operasional bulanan dan siapkan skenario panen parsial jika biomassa mendekati batas daya dukung kolam.",
    "Gunakan [Software Manajemen Tambak Udang](/id/shrimp-farm-management-software) untuk mendokumentasikan log harian pakan, kualitas air, dan data sampling secara real-time.",
  ],
  sources: [
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Best Management Practices for a Mangrove-Friendly Shrimp Farming",
      publisher: "SEAFDEC Aquaculture Department",
      url: "https://repository.seafdec.org/handle/20.500.12066/1947",
    },
    {
      title: "Comparative Analysis of Profitability and Resource Use Efficiency Between Penaeus monodon and Litopenaeus vannamei in India",
      publisher: "Aquaculture Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8096089/",
    },
  ],
};
