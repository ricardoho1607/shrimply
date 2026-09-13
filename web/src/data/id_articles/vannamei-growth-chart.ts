import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "vannamei-growth-chart",
  section: "Pertumbuhan dan Sampling",
  label: "Pertumbuhan & Sampling",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "Grafik Pertumbuhan Udang Vannamei: Standar Bobot (ABW/MBW), ADG, dan Target per DOC",
  description:
    "Pantau standar bobot udang vaname (Litopenaeus vannamei) berdasarkan umur pemeliharaan (DOC). Jadikan acuan bobot rata-rata (ABW/MBW), pertambahan bobot harian (ADG), dan konversi size per kilogram untuk evaluasi laju tumbuh komersial.",
  readTime: "7 menit baca",
  tags: [
    "grafik pertumbuhan udang vannamei",
    "laju pertumbuhan vannamei",
    "pertumbuhan udang per DOC",
    "bobot udang vaname harian",
    "ADG udang vannamei",
    "pertambahan bobot harian udang",
    "ABW udang",
    "MBW udang vannamei",
    "standar bobot udang vaname",
    "tabel size udang",
    "bobot udang umur 30 hari",
    "bobot udang umur 60 hari",
    "bobot udang umur 90 hari",
  ],
  publishedAt: "2026-08-29",
  image: {
    src: "/resources/images/vannamei-growth-chart-abw-adg-doc.png",
    alt: "Infografis Shrimply menampilkan kurva pertumbuhan udang vannamei, standar bobot rata-rata (ABW/MBW), dan laju tumbuh harian (ADG) dari DOC 30 hingga DOC 120",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Software Sampling Pertumbuhan Udang", href: "/id/features/growth-sampling" },
  takeaways: [
    "Udang vaname pada umumnya mencapai bobot 10–12 gram pada DOC 60 dan 18–22 gram pada DOC 90 di kolam budidaya komersial semi-intensif dan intensif.",
    "Udang yang sehat mencatatkan pertambahan bobot harian (ADG) antara 0,25 gram hingga 0,35 gram per hari pada fase pertumbuhan puncak antara DOC 45 hingga DOC 80.",
    "Jangan pernah menaikkan jatah pakan hanya karena pertumbuhan melambat; periksa selalu kadar oksigen terlarut (DO) dini hari dan kontrol sisa pakan di anco terlebih dahulu.",
  ],
  faqs: [
    {
      question: "Berapa standar bobot rata-rata (ABW/MBW) udang vaname pada umur 30, 60, dan 90 hari (DOC)?",
      answer:
        "Pada kondisi budidaya komersial standar (kepadatan 60–120 PL/m², suhu air 28–32°C), udang vaname umumnya mencapai bobot 3,2–4,5 g pada DOC 30, 10,5–12,5 g pada DOC 60, dan 18,5–22,0 g pada DOC 90.",
    },
    {
      question: "Berapa nilai ADG (Average Daily Gain) yang baik untuk udang vaname?",
      answer:
        "Targetkan ADG sebesar 0,10–0,15 g/hari selama fase pendedahan dan juvenile awal (DOC 1–30), meningkat pesat menjadi 0,25–0,35 g/hari pada masa pertumbuhan puncak fase pembesaran (DOC 45–80), lalu melandai ke kisaran 0,20–0,26 g/hari setelah DOC 90.",
    },
    {
      question: "Berapa lama waktu yang dibutuhkan udang vaname untuk mencapai ukuran panen komersial?",
      answer:
        "Udang vaname umumnya mencapai ukuran pasar standar konsumsi (bobot 20 gram atau size 50 ekor/kg) dalam waktu 85 hingga 100 hari pemeliharaan. Untuk mencapai ukuran besar (28–32 gram atau size 30–35 ekor/kg), masa budidaya biasanya membutuhkan waktu 115 hingga 130 hari.",
    },
    {
      question: "Mengapa pertumbuhan bobot udang mandek padahal pakan di anco selalu habis bersih?",
      answer:
        "Anco yang bersih hanya menandakan pakan di wadah tersebut habis terkonsumsi. Jika bobot udang tidak bertambah (ADG stagnan), tingkat kelangsungan hidup (SR) di kolam mungkin lebih tinggi dari estimasi (sehingga pakan harian per individu kurang/underfed), sebaran pakan tidak merata, atau udang mengalami infeksi mikrosporidia parasit Enterocytozoon hepatopenaei (EHP) yang merusak tubulus hepatopankreas sehingga menghambat penyerapan nutrisi pakan.",
    },
    {
      question: "Bagaimana cara mengonversi bobot rata-rata udang (ABW/MBW) menjadi ukuran size per kilogram?",
      answer:
        "Bagi angka 1.000 dengan bobot rata-rata tubuh udang (ABW dalam gram). Sebagai contoh, 1.000 dibagi 11,5 gram menghasilkan sekitar 87 ekor per kilogram (size 87).",
    },
    {
      question: "Apakah padat tebar yang tinggi memperlambat laju pertumbuhan individu udang?",
      answer:
        "Ya. Di kolam dengan padat tebar di atas 120–150 ekor/m², tingginya kompetisi ruang gerak, pakan, dan mineral terlarut umumnya memperlambat pertambahan bobot harian individu sebesar 15% hingga 25% dibandingkan kolam dengan kepadatan lebih rendah. Petambak dapat menghitung batas kepadatan dan kapasitas aerasi kincir yang aman menggunakan [Kalkulator Padat Tebar Vannamei](/id/resources/vannamei-stocking-density).",
    },
  ],
  sections: [
    {
      heading: "Ringkasan Cepat: Standar Laju Pertumbuhan Udang Normal",
      body: [
        "Udang vaname (Litopenaeus vannamei) yang sehat umumnya mencapai bobot 10 hingga 12 gram pada hari ke-60 (DOC 60) dan 18 hingga 22 gram pada hari ke-90 (DOC 90) di kolam budidaya komersial semi-intensif dan intensif.",
        "Pertumbuhan bobot berjalan lambat pada 30 hari pertama (pertambahan 0,10 hingga 0,15 g/hari), meningkat pesat setelah hari ke-40 (sering kali melampaui 0,25 hingga 0,35 g/hari), lalu melandai secara alami saat biomassa kolam mendekati daya dukung lingkungan (carrying capacity). Jika pertambahan bobot udang Anda kurang dari 0,18 g/hari setelah DOC 45, segera periksa kadar oksigen terlarut (DO) dini hari dan tingkat konsumsi pakan di anco.",
      ],
    },
    {
      heading: "Mengapa Memantau Pertumbuhan Udang Sangat Krusial",
      body: [
        "Biaya pakan mencakup 50% hingga 60% dari total biaya operasional tambak. Jika laju pertumbuhan melambat sementara jatah pakan terus dinaikkan, sisa pakan yang tidak termakan akan membusuk di dasar kolam, merusak kualitas air, memicu lonjakan amonia beracun, dan membengkakkan rasio konversi pakan (FCR).",
        "Pencatatan bobot sampling yang akurat juga memungkinkan petambak memperkirakan biomassa riil kolam sehingga beban oksigen tidak melampaui kapasitas aerasi kincir, sekaligus menyelaraskan rencana panen dengan harga premi size dari pembeli atau pabrik pengolahan.",
      ],
    },
    {
      heading: "Grafik & Tabel Pertumbuhan Udang Vannamei per DOC",
      body: [
        "Tabel di bawah merangkum rentang target pertumbuhan udang vaname (L. vannamei) di kolam komersial standar (padat tebar 60–120 PL/m², suhu air 28–32°C, salinitas 15–25 ppt, kadar protein pakan 35–38%).",
      ],
      table: {
        columns: ["DOC (Hari)", "Standar Bobot / ABW (g)", "Target ADG (g/hari)", "Size (Ekor / kg)", "Konteks Produksi & Fase Siklus"],
        rows: [
          ["DOC 30", "3,2 – 4,5 g", "0,10 – 0,15 g/hari", "220 – 310 ekor/kg", "Transisi pakan pendedahan (nursery) ke juvenile pakan butiran; jadwal sampling jala perdana."],
          ["DOC 45", "6,5 – 8,2 g", "0,20 – 0,26 g/hari", "120 – 155 ekor/kg", "Awal fase pertumbuhan cepat (grow-out); pemantauan anco menjadi sangat krusial."],
          ["DOC 60", "10,5 – 12,5 g", "0,25 – 0,32 g/hari", "80 – 95 ekor/kg", "Titik tengah siklus; biomassa melonjak pesat, kebutuhan konsumsi oksigen meningkat tajam."],
          ["DOC 75", "14,5 – 17,0 g", "0,28 – 0,35 g/hari", "58 – 70 ekor/kg", "Puncak laju pertambahan bobot harian (ADG peak); pantau ketat penurunan DO malam hari."],
          ["DOC 90", "18,5 – 22,0 g", "0,25 – 0,33 g/hari", "45 – 55 ekor/kg", "Ukuran panen komersial standar (Size 50); evaluasi kelayakan panen parsial."],
          ["DOC 105", "22,5 – 26,0 g", "0,22 – 0,30 g/hari", "38 – 45 ekor/kg", "Laju tumbuh mulai melandai secara alami; efisiensi pakan menurun seiring puncak biomassa."],
          ["DOC 120", "26,0 – 30,5 g", "0,18 – 0,26 g/hari", "32 – 38 ekor/kg", "Ukuran pasar besar (Size 30); periode risiko tinggi terhadap degradasi kualitas air."],
        ],
      },
      note: "Laju pertumbuhan aktual dipengaruhi oleh padat tebar, suhu air, dan manajemen pakan. Kolam dengan kepadatan tinggi (>150 ekor/m²) biasanya mencatatkan laju pertumbuhan individu yang lebih lambat (0,18–0,22 g/hari).",
    },
    {
      heading: "Cara Menghitung Pertambahan Bobot Harian (ADG)",
      body: [
        "Pertumbuhan udang tidak diukur semata-mata dari hitungan hari kalender, melainkan dari pertambahan bobot harian rata-rata (Average Daily Gain atau ADG) di antara dua interval sampling berurutan.",
        "Rumus: ADG (gram/hari) = (Bobot Rata-rata Sampling Saat Ini − Bobot Rata-rata Sampling Sebelumnya) / Selisih Hari antar Sampling",
        "Sebagai contoh, jika bobot rata-rata udang (ABW/MBW) sebesar 5,4 gram pada DOC 48 dan naik menjadi 7,2 gram pada DOC 55 (selang 7 hari), maka total pertambahan bobot adalah 1,8 gram dibagi 7 hari = 0,26 g/hari. Dengan laju ini, estimasi bobot pada sampling pekan berikutnya (DOC 62) adalah sekitar 9,0 gram.",
      ],
    },
    {
      heading: "Tanda Bahaya Pertumbuhan Udang Terhenti (Growth Stall)",
      body: [
        "Mendeteksi perlambatan pertumbuhan sedini mungkin dapat menghemat jutaan rupiah biaya pakan terbuang. Waspadai indikator peringatan berikut saat sampling jala mingguan dan kontrol anco harian:",
      ],
      items: [
        "Keseragaman ukuran buruk (size disparity tinggi): Selisih bobot yang lebar antara udang besar dan kecil dalam satu jala mengindikasikan kompetisi pakan yang timpang atau adanya infeksi subklinis.",
        "Sisa pakan menumpuk di anco: Pakan yang tidak habis setelah 2 hingga 2,5 jam pemberian pakan menjadi sinyal langsung adanya penurunan nafsu makan (anoreksia).",
        "Saluran pencernaan kosong: Usus yang bening, berair, atau putus-putus pada jam aktif makan mengindikasikan nafsu makan terganggu, iritasi saluran cerna, atau defisiensi pakan.",
        "Nilai ADG anjlok di bawah 0,18 g/hari (setelah DOC 45): Penurunan laju tumbuh lebih dari 25% dibandingkan catatan pekan sebelumnya.",
        "Oksigen terlarut (DO) malam hari < 3,8 mg/L: Stres hipoksia sub-letal menghentikan laju pertumbuhan meskipun tidak langsung menimbulkan kematian massal.",
      ],
    },
    {
      heading: "Penyebab Pertumbuhan Terhambat & Cara Verifikasinya",
      body: [
        "1. Hipoksia sub-letal dini hari (DO rendah): Ukur DO antara pukul 04.00 hingga 06.00 di lapisan dasar kolam. Angka di bawah 3,8 mg/L memaksa udang mengalihkan energi untuk bertahan hidup alih-alih membentuk biomassa daging.",
        "2. Kurang pakan (underfeeding) atau sebaran pakan buruk: Pakan anco ludes dalam waktu 45 menit, tetapi sampling jala memperlihatkan variasi ukuran yang sangat timpang karena udang kuat mendominasi udang kecil.",
        "3. Kolam mencapai batas daya dukung (carrying capacity): Pertumbuhan mandek setelah DOC 75 akibat total biomassa melebihi kapasitas tenaga kincir terpasang (standar minimal 1 HP per 400–500 kg biomassa).",
        "4. Ketidakseimbangan mineral & alkalinitas: Alkalinitas di bawah 100 mg/L CaCO₃ atau rasio Ca:Mg tidak ideal menyulitkan proses pengerasan kulit pasca molting.",
        "5. Infeksi parasit mikrosporidia kronis (EHP): Pakan anco terlihat habis terkonsumsi, tetapi ADG stagnan di bawah 0,12 g/hari dan kerap disertai gejala kotoran putih (white feces/WFD) atau hepatopankreas pucat.",
      ],
    },
    {
      heading: "Tindakan Cepat Saat Pertumbuhan Udang Mandek",
      body: [
        "Pertama, segera audit kadar DO dini hari untuk memastikan oksigen terlarut dasar kolam bertahan di atas 4,0 mg/L sebelum matahari terbit.",
        "Kedua, jika kontrol anco menunjukkan pakan tersisa, pangkas jatah pakan harian sebesar 15% hingga 20% saat itu juga demi menjaga stabilitas air.",
        "Ketiga, uji alkalinitas air kolam dan pertahankan di rentang 120–160 mg/L menggunakan natrium bikarbonat (NaHCO₃) atau kapur pertanian berkualitas.",
        "Jangan pernah menebar pakan berlebih dengan dalih 'mengejar bobot' yang tertinggal. Kelebihan pakan hanya akan membusuk di dasar kolam dan memicu ledakan amonia serta nitrit beracun.",
      ],
    },
  ],
  checklist: [
    "Jadwalkan sampling jala pada hari dan jam yang sama setiap pekan menggunakan jala sampling yang bersih dan terstandarisasi.",
    "Hitung nilai pertambahan bobot harian (ADG) antarsampling untuk mendeteksi perlambatan pertumbuhan sebelum berkembang menjadi krisis.",
    "Ukur kadar oksigen terlarut (DO) sebelum matahari terbit (pukul 04.00 – 06.00) guna mencegah stres hipoksia pada udang.",
    "Sesuaikan jatah pakan harian berdasarkan hasil kontrol anco 2 jam, bukan hanya berpatokan pada tabel pakan kalender.",
    "Catat bobot sampling mingguan langsung ke Shrimply untuk melacak tren kurva pertumbuhan dan estimasi jadwal panen.",
    "Hubungi laboratorium kesehatan ikan terakreditasi untuk uji PCR penyakit (seperti EHP dan WSSV) jika pertumbuhan udang terhenti lebih dari 14 hari berturut-turut.",
  ],
  sources: [
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Growth Dynamics and Feeding Management of Pacific White Shrimp in Commercial Ponds",
      publisher: "World Aquaculture Society",
      url: "https://www.was.org",
    },
    {
      title: "Pond Aeration and Water Quality in Commercial Aquaculture",
      publisher: "Boyd & Fast",
      url: "https://www.was.org",
    },
    {
      title: "Manual on Pond Culture of Penaeid Shrimp: Indicators of Problems in a Pond",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/4/ac006e/AC006E11.htm",
    },
  ],
};
