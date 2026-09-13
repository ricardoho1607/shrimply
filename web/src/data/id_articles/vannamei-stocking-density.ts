import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultOperationsReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "vannamei-stocking-density",
  section: "Manajemen Tambak",
  label: "Manajemen Tambak",
  author: defaultResourceAuthorID,
  reviewer: defaultOperationsReviewerID,
  title: "Padat Tebar Udang Vannamei per m²: Panduan Lengkap & Kalkulator Kebutuhan Benur",
  description: "Hitung padat tebar udang vaname per m², total kebutuhan benur (PL), kebutuhan daya kincir air (HP aerasi), serta daya dukung kolam (carrying capacity) dengan kalkulator interaktif dan panduan budidaya komersial.",
  readTime: "8 menit baca",
  tags: [
    "padat tebar vannamei per m2",
    "padat tebar udang vaname",
    "padat tebar tambak udang",
    "jumlah benur per meter persegi",
    "kebutuhan PL per m2",
    "padat tebar tambak intensif",
    "padat tebar semi intensif",
    "tambak udang super intensif",
    "berapa ekor udang per m2",
    "kalkulator padat tebar vannamei",
  ],
  publishedAt: "2026-08-29",
  image: {
    src: "/resources/images/vannamei-stocking-density-infographic.jpg",
    alt: "Infografis padat tebar udang vannamei per m2 yang menampilkan sistem ekstensif, semi-intensif, intensif, dan super-intensif, tingkat kelangsungan hidup (SR), ABW, biomassa, serta kapasitas aerasi kincir",
    width: 1376,
    height: 768,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Software Sampling Pertumbuhan Udang", href: "/id/features/growth-sampling" },
  takeaways: [
    "Padat tebar semata tidak menentukan keselamatan kolam—biomassa puncak saat panen dan kapasitas daya kincir air (HP aerasi) yang menentukannya.",
    "Rentang standar padat tebar komersial: Ekstensif (5–15 PL/m²), Semi-Intensif (20–50 PL/m²), Intensif (60–150 PL/m²), dan Super-Intensif (150–300+ PL/m²).",
    "Pertahankan standar minimum ketat 1 HP aerasi mekanis untuk setiap 400 hingga 500 kg total biomassa udang di kolam.",
    "Hitung mundur dari target panen: Daya Dukung Kolam → Kapasitas Aerasi Tersedia → Target Bobot Panen (ABW) → Estimasi Kelangsungan Hidup (SR) → Kebutuhan Padat Tebar Benur.",
  ],
  faqs: [
    {
      question: "Berapa rekomendasi padat tebar udang vaname per m²?",
      answer: "Rekomendasi padat tebar udang vaname (Litopenaeus vannamei) sangat bergantung pada infrastruktur kolam dan kapasitas aerasi: 5–15 PL/m² untuk kolam tanah ekstensif, 20–50 PL/m² untuk kolam semi-intensif, 60–150 PL/m² untuk kolam intensif berlapis plastik HDPE dengan aerasi kincir mekanis, serta 150–300+ PL/m² untuk kolam bundar atau bak raceway super-intensif yang didukung injeksi oksigen murni secara kontinu.",
    },
    {
      question: "Berapa banyak benur udang (PL) yang ideal ditebar per meter persegi?",
      answer: "Jumlah benur per meter persegi harus disesuaikan dengan kapasitas aerasi puncak dan sistem pembuangan limbah dasar kolam. Kolam intensif standar (tanah padat atau lapis terpal/HDPE) dengan aerasi 8–10 HP per hektar umumnya menebar 60 hingga 100 PL/m². Jika kapasitas kincir di bawah 1 HP per 500 kg estimasi biomassa, turunkan padat tebar untuk mencegah anjloknya oksigen terlarut (DO drop) menjelang fajar.",
    },
    {
      question: "Bagaimana cara menghitung padat tebar dan total pesanan benur udang?",
      answer: "Kalikan luas permukaan kolam (m²) dengan target padat tebar (PL/m²). Sebagai contoh, kolam berukuran 2.500 m² dengan padat tebar 100 PL/m² membutuhkan 250.000 ekor benur (PL). Tambahkan cadangan aklimatisasi (buffer) sebesar 5% hingga 10% (total 262.500 – 275.000 PL) untuk mengantisipasi stres transportasi dan mortalitas selama proses aklimatisasi awal.",
    },
    {
      question: "Apa itu daya dukung kolam (carrying capacity) dan bagaimana pengaruhnya terhadap padat tebar?",
      answer: "Daya dukung kolam (carrying capacity) adalah batas bobot biomassa udang maksimum yang mampu ditopang oleh ekosistem kolam tanpa mengalami penurunan kualitas air atau terhentinya pertumbuhan udang. Padat tebar benur semata tidak menentukan daya dukung—ketersediaan aerasi mekanis (1 HP per 400–500 kg biomassa) dan efisiensi pengeluaran lumpur dasar kolamlah yang menentukan batas aman tersebut.",
    },
    {
      question: "Berapa kebutuhan daya kincir air (HP aerasi) per kilogram biomassa udang?",
      answer: "Tambak udang komersial membutuhkan minimal 1 horsepower (HP) kincir air atau aerasi difusi untuk setiap 400 hingga 500 kg total biomassa udang. Sebagai contoh, kolam dengan estimasi 4.000 kg udang menjelang panen memerlukan minimal 8 hingga 10 HP aerasi mekanis yang beroperasi penuh sepanjang malam.",
    },
    {
      question: "Apakah padat tebar yang lebih tinggi menurunkan laju pertumbuhan dan ukuran akhir udang?",
      answer: "Ya. Berbagai riset dan uji coba lapangan membuktikan bahwa padat tebar di atas 100–120 PL/m² meningkatkan kompetisi ruang hidup dan mineral esensial, yang umumnya memangkas pertambahan bobot harian (ADG) sebesar 15% hingga 25% serta memperpanjang masa pemeliharaan untuk mencapai ukuran pasar besar (size 30 atau 30 ekor/kg).",
    },
    {
      question: "Berapa padat tebar yang aman untuk kolam tanah dibandingkan kolam terpal/HDPE?",
      answer: "Kolam tanah tanpa pelapis sebaiknya tidak melebihi 30–50 PL/m² karena limbah feses dan sisa pakan akan menumpuk menjadi lumpur hitam anaerobik yang beracun di dasar tanah. Kolam berpelas plastik HDPE yang dilengkapi sentral drainase (central drain / shrimp toilet) dapat dengan aman menampung 80–150 PL/m² jika didukung kapasitas kincir air yang memadai.",
    },
    {
      question: "Kapan petambak harus melakukan panen parsial untuk mengendalikan kepadatan kolam?",
      answer: "Lakukan panen parsial (pengurangan/thinning 20% hingga 35% biomassa) saat total bobot udang di kolam mendekati 85% dari kapasitas aerasi terpasang, atau saat nilai DO dini hari turun di bawah 4,0 mg/L setelah DOC 65. Panen parsial seketika mengurangi konsumsi oksigen, menekan produksi limbah, dan memberi ruang bagi udang yang tersisa untuk kembali tumbuh cepat.",
    },
  ],
  sections: [
    {
      heading: "Jawaban ringkas: Target padat tebar berdasarkan sistem budidaya",
      body: [
        "Udang vaname (Litopenaeus vannamei) dikenal memiliki sifat berkelompok (schooling) dan toleransi yang lebih tinggi terhadap kepadatan tinggi dibandingkan udang windu (Penaeus monodon). Kendati demikian, batas aman padat tebar tetap dibatasi secara ketat oleh infrastruktur kolam, kapasitas pergantian air, dan ketersediaan aerasi mekanis.",
        "Sebelum memesan benur (post-larvae/PL) dari hatchery, sesuaikan target padat tebar dengan tingkatan sistem budidaya kolam Anda:",
      ],
      table: {
        columns: ["Sistem Budidaya", "Padat Tebar (PL/m²)", "Infrastruktur Kolam & Aerasi", "Target Biomassa (kg/m²)", "Tipikal Hasil Panen"],
        rows: [
          ["Ekstensif / Tradisional", "5 – 15 PL/m²", "Kolam tanah luas/mangrove; pasang surut air laut; aerasi 0 – 2 HP", "0,1 – 0,4 kg/m²", "1,0 – 3,5 Ton / ha"],
          ["Semi-Intensif", "20 – 50 PL/m²", "Kolam tanah padat; kincir air mekanis (4 – 8 HP/ha); pakan pelet komersial penuh", "0,5 – 1,2 kg/m²", "5,0 – 11,0 Ton / ha"],
          ["Intensif", "60 – 150 PL/m²", "Pelapis plastik HDPE penuh; central drain pembuang lumpur; aerasi kincir khusus (16 – 28 HP/ha)", "1,2 – 2,5 kg/m²", "12,0 – 25,0 Ton / ha"],
          ["Super-Intensif", "150 – 300+ PL/m²", "Bak bundar beton/HDPE; injeksi O2 murni + micro-pore diffuser; central drain dibilas/siphon tiap hari", "3,0 – 8,0+ kg/m²", "30,0 – 80,0+ Ton / ha"],
        ],
      },
      note: "Jangan pernah menentukan padat tebar hanya berdasarkan murahnya harga benur atau ambisi target omzet. Jika kolam belum dilapisi HDPE atau kekurangan aerasi mekanis kontinu, menebar di atas 50 PL/m² memicu penumpukan lumpur hitam beracun di dasar kolam dan risiko anjloknya oksigen terlarut (DO drop) yang tak terhindarkan setelah Day of Culture (DOC) 60.",
    },
    {
      heading: "Kaitan krusial: Mengapa padat tebar semata tidak menentukan keselamatan budidaya",
      body: [
        "Kekeliruan fatal yang sering terjadi di industri tambak adalah memperlakukan angka padat tebar secara terisolasi. Petambak sering bertanya: 'Apakah aman jika saya menebar 100 PL/m²?' Pertanyaan biologis yang benar seharusnya adalah: 'Berapa tonase biomassa yang akan dicapai saat panen, dan berapa daya kuda (HP) kincir aerasi yang tersedia?'",
        "Padat tebar hanyalah variabel input awal. Budidaya udang yang aman dan menguntungkan bergantung pada mata rantai biologis yang utuh: Padat Tebar → Kelangsungan Hidup (SR) → Bobot Rata-rata (ABW) → Total Standing Biomass → Kapasitas Aerasi → Daya Dukung Kolam (Carrying Capacity).",
        "Simak perbandingan nyata antara dua kolam yang berdampingan berikut ini:",
        "Kolam A menebar 100 PL/m² pada kolam tanah tanpa pelapis. Akibat daya dukung kolam terlampaui, tingkat kelangsungan hidup (SR) anjlok menjadi 50%, dan pertumbuhan udang terhenti pada ABW 15 gram. Biomassa akhir saat panen tercatat 0,75 kg/m² (7,5 Ton/ha). Siklus memang selesai, namun rasio konversi pakan (FCR) membengkak dan margin keuntungan hilang tak bersisa.",
        "Kolam B hanya menebar 80 PL/m² dengan kapasitas kincir yang terhitung presisi. Kondisi dasar kolam yang tetap bersih menjaga SR di angka 85%, dan udang bertumbuh optimal hingga mencapai ukuran jumbo 25 gram (Size 40). Biomassa akhir panen mencapai 1,70 kg/m² (17,0 Ton/ha)—menghasilkan beban limbah, konsumsi pakan, dan kebutuhan oksigen lebih dari dua kali lipat Kolam A, meskipun awalnya menebar benur 20% lebih sedikit!",
        "Oleh sebab itu, pengelola tambak profesional selalu menghitung mundur: tetapkan kapasitas daya dukung maksimum dan batas aman aerasi kolam terlebih dahulu, baru kemudian tentukan padat tebar yang rasional.",
      ],
    },
    {
      heading: "Kalkulator Padat Tebar Udang Vannamei",
      body: [
        "Gunakan panduan kalkulasi interaktif berikut untuk memodelkan siklus budidaya kolam Anda sebelum mengajukan pesanan benur ke hatchery. Simulasikan luas area kolam, target kepadatan tebar, proyeksi survival rate (SR), dan target bobot panen (ABW) guna memperkirakan kebutuhan total post-larvae (PL), daya kincir aerasi (HP), serta total beban biologis kolam.",
        "Contoh perhitungan acuan standar: Kolam seluas 2.500 m² dengan padat tebar 100 PL/m² membutuhkan 250.000 ekor benur. Dengan asumsi kelangsungan hidup (SR) 75% dan target panen bobot 20 gram (Size 50), kolam diproyeksikan menghasilkan biomassa 3.750 kg (3,75 ton) udang. Untuk menopang biomassa puncak tersebut secara aman, kolam memerlukan minimal 8 hingga 10 HP kincir aerasi yang beroperasi aktif menjelang masa panen.",
      ],
      note: "Selalu tambahkan margin cadangan aklimatisasi sebesar 5% hingga 10% saat memesan benur. Misalnya, jika perhitungan tebar kolam membutuhkan 250.000 PL, pesanlah 262.500 hingga 275.000 PL untuk mengantisipasi selisih hitung kemasan (packing count) dan stres selama proses transportasi serta aklimatisasi.",
    },
    {
      heading: "Daya dukung biologis (carrying capacity) dan kaidah aerasi kolam",
      body: [
        "Daya dukung biologis (carrying capacity) adalah estimasi bobot total udang maksimum yang dapat ditopang oleh ekosistem kolam tanpa menyebabkan kemerosotan mutu air atau berhentinya pertumbuhan udang. Pada budidaya vaname modern, daya dukung kolam ditentukan hampir sepenuhnya oleh suplai oksigen terlarut dan pembuangan limbah organik dasar kolam.",
        "Kaidah emas aerasi tambak udang komersial (yang dirumuskan oleh Dr. Claude Boyd dan ditegaskan dalam panduan FAO) menetapkan: 1 Horsepower (HP) aerasi mekanis mampu menopang 400 hingga 500 kg biomassa udang hidup di kolam.",
        "Pada awal siklus (DOC 1–30), fotosintesis fitoplankton alami serta putaran minimal kincir sudah cukup memenuhi kebutuhan respirasi benur berukuran kecil. Namun setelah DOC 60, kebutuhan oksigen melonjak secara eksponensial akibat kombinasi respirasi biomassa udang yang masif, aktivitas bakteri nitrifikasi, dan penguraian tumpukan lumpur organik di dasar kolam.",
        "Jika konsentrasi oksigen terlarut (DO) dini hari turun di bawah 4,0 mg/L, nafsu makan udang menurun drastis, laju pertambahan bobot harian (ADG) melambat atau terhenti, dan risiko infeksi bakteri Vibrio serta penyakit kotoran putih (White Feces Syndrome/WFS) meningkat berlipat ganda.",
      ],
      table: {
        columns: ["Total Biomassa (kg)", "Kepadatan Biomassa (Kolam 2.500 m²)", "Aerasi Minimum (1 HP / 500 kg)", "Aerasi Direkomendasikan (1 HP / 400 kg)", "Manajemen Lumpur & Dasar Kolam"],
        rows: [
          ["1.000 kg", "0,40 kg/m²", "2,0 HP", "2,5 HP", "Dasar kolam masih bersih; mineralisasi tanah aktif secara alami; operasional kincir ringan."],
          ["2.000 kg", "0,80 kg/m²", "4,0 HP", "5,0 HP", "Mulai terbentuk akumulasi lumpur di tengah; kincir air wajib dinyalakan penuh sepanjang malam."],
          ["3.500 kg", "1,40 kg/m²", "7,0 HP", "8,8 HP", "Beban organik tinggi; pembuangan central drain wajib dilakukan rutin; aerasi penuh mulai tengah malam."],
          ["5.000 kg", "2,00 kg/m²", "10,0 HP", "12,5 HP", "Mendekati batas carrying capacity intensif; wajib kolam pelapis HDPE dan siphon lumpur harian."],
          ["7.500 kg+", "3,00+ kg/m²", "15,0 HP", "18,8 HP+", "Beban super-intensif; wajib injeksi oksigen murni/venturi diffuser dan kesiapan genset otomatis tanpa jeda."],
        ],
      },
    },
    {
      heading: "Tanda-tanda peringatan kolam udang yang mengalami kelebihan kepadatan (overstocked)",
      body: [
        "Kelebihan kepadatan yang melampaui daya dukung kolam tidak selalu berujung pada kematian massal yang mendadak. Lebih sering, kondisi ini menimbulkan stres kronis subletal yang perlahan merusak efisiensi pakan dan profitabilitas siklus. Waspadai tanda-tanda spesifik berikut selama inspeksi harian dan sampling mingguan:",
      ],
      items: [
        "Udang berenang mengumpul di dekat arus kincir pada siang hari: Udang yang bergerombol di aliran arus kincir saat siang hari mengindikasikan kekurangan oksigen terlarut atau berusaha menghindari racun hidrogen sulfida (H2S) yang pekat di dasar kolam.",
        "Variasi ukuran (disparitas size) yang sangat lebar saat sampling: Jala sampling yang menghasilkan udang besar 18 gram sekaligus udang kerdil 9 gram menandakan terjadinya persaingan pakan yang parah akibat populasi yang terlalu padat.",
        "Nilai Oksigen Terlarut (DO) dini hari < 3,8 mg/L: Pengukuran DO dasar kolam antara pukul 04.00 hingga 05.30 yang turun di bawah 3,8 mg/L menegaskan bahwa biomassa udang telah melampaui kapasitas suplai kincir yang terpasang.",
        "Busa cokelat pekat yang persisten di permukaan air: Tumpukan busa kecokelatan yang stabil dan mengumpul di sudut kolam searah angin menandakan tingginya senyawa organik terlarut akibat feses berlebih dan kematian plankton.",
        "Pertumbuhan udang stagnan setelah DOC 50: Laju pertambahan bobot harian (ADG) yang anjlok di bawah 0,15 g/hari meskipun pakan di anco terpantau habis merupakan sinyal jelas bahwa kolam telah mencapai ambang batas daya dukungnya.",
        "Kulit lembek (soft shell) dan insang kotor: Kepadatan tebar yang berlebih memicu lonjakan amonia bebas (TAN > 1,0 mg/L) dan nitrit (NO2-N > 0,5 mg/L), yang mengganggu proses kalsifikasi kulit udang pasca-molting.",
      ],
    },
    {
      heading: "Faktor penyebab kegagalan padat tebar dan cara memverifikasinya",
      body: [
        "1. Kapasitas aerasi tidak sebanding dengan biomassa puncak: Petambak kerap menentukan jumlah kincir berdasarkan kondisi DOC 30, bukan estimasi beban biomassa DOC 80 menjelang panen. Petunjuk verifikasi: DO terukur 6,5 mg/L pada pukul 14.00 siang, namun anjlok drastis hingga 2,8 mg/L pada pukul 04.30 subuh.",
        "2. Salah memperkirakan kelangsungan hidup (SR) sehingga memicu overfeeding: Mengasumsikan SR 85% padahal realitasnya hanya 60% mengakibatkan kelebihan jatah pakan harian secara masif yang meracuni dasar kolam. Petunjuk verifikasi: Hasil jala sampling menunjukkan populasi udang jauh lebih sedikit dari proyeksi tabel pakan, disertai lumpur dasar kolam yang menghitam.",
        "3. Kerucut lumpur meluas melebihi area central drain: Pada kepadatan di atas 100 PL/m², laju penumpukan limbah organik mengalahkan kecepatan arus putaran air kincir, menimbun area makan udang dengan endapan anaerobik beracun. Petunjuk verifikasi: Pemberat jala sampling terangkat dengan lumpur hitam berbau busuk khas belerang (H2S).",
        "4. Menebar benur tanpa sertifikasi dengan vitalitas rendah: Benur yang lemah tanpa sertifikat SPF (Specific Pathogen Free) mengalami mortalitas tinggi pada 14 hari pertama, menyisakan populasi udang yang tidak seragam dan rentan penyakit. Petunjuk verifikasi: Sampel benur gagal melewati uji stres ketahanan formalin atau perubahan suhu (thermal stress test) 100 ekor sebelum ditebar ke kolam.",
      ],
    },
    {
      heading: "Langkah darurat saat biomassa mendekati batas daya dukung kolam",
      body: [
        "Jika data sampling mingguan menunjukkan bahwa standing biomass kolam mendekati atau telah melampaui kapasitas aerasi terpasang (lebih dari 500 kg biomassa per 1 HP kincir), segera ambil tindakan terukur untuk mencegah kolam kolaps:",
        "1. Lakukan panen parsial (thinning): Kurangi 20% hingga 35% biomassa dengan menjala udang berukuran paling besar. Panen parsial seketika menurunkan konsumsi oksigen, mengurangi kebutuhan pakan harian, dan memberikan ruang gerak bagi udang yang tersisa untuk kembali tumbuh pesat.",
        "2. Atur ulang arah dan posisi kincir air: Sesuaikan sudut putaran kincir untuk menciptakan arus sirkulasi memutar yang kuat, sehingga kotoran dan endapan dasar tersapu bersih ke titik tengah central drain, menjaga area makan di pinggir pematang tetap bersih.",
        "3. Pangkas jatah pakan harian sebesar 15% hingga 25%: Jika DO subuh berada di bawah 4,0 mg/L atau kadar nitrit melampaui 0,5 mg/L, potong pakan segera. Udang di kolam yang padat tidak dapat mencerna pakan secara efisien dalam kondisi hipoksia, dan pelet yang tersisa hanya akan mempercepat pembusukan air.",
      ],
      note: "Jangan pernah menaikkan dosis pakan atau menebar pupuk nitrogen mentah dengan maksud memaksa udang yang lambat tumbuh mengejar ketertinggalan di kolam yang kelebihan kepadatan. Sisa protein tinggi akan membusuk menjadi amonia tak terionisasi (NH3) dan hidrogen sulfida (H2S) yang mematikan, memicu kematian massal.",
    },
    {
      heading: "Strategi padat tebar jangka panjang dan manajemen siklus",
      body: [
        "Keberlanjutan usaha tambak udang menuntut penyesuaian padat tebar dengan kondisi iklim musiman dan kesiapan infrastruktur kolam:",
        "Terapkan fase pendedahan (nursery): Memelihara benur (PL10–PL12) di bak nursery beraerasi tinggi selama 18 hingga 25 hari hingga mencapai ukuran gelondongan 0,5 hingga 1,0 gram dapat meningkatkan kelangsungan hidup (SR) akhir sebesar 15% hingga 20%. Langkah ini juga memangkas durasi pemeliharaan di kolam pembesaran hingga hampir satu bulan, sehingga meminimalkan risiko paparan patogen.",
        "Sesuaikan kepadatan menurut musim: Turunkan padat tebar sebesar 20% hingga 30% selama musim hujan atau bulan-bulan dingin ketika aktivitas fotosintesis fitoplankton melemah dan hujan deras sering memicu stratifikasi suhu serta penurunan salinitas secara mendadak.",
        "Pantau metrik siklus secara real-time: Manfaatkan Shrimply untuk mencatat bobot sampling jala mingguan, memonitor tren pertumbuhan MBW, dan membandingkan total biomassa kolam terhadap kapasitas daya kincir terpasang sebelum memulai tebar siklus baru.",
      ],
    },
  ],
  checklist: [
    "Hitung mundur target padat tebar berdasarkan kapasitas aerasi kincir terpasang (1 HP untuk setiap 400–500 kg biomassa puncak).",
    "Pesan benur (PL) dengan margin cadangan aklimatisasi 5% hingga 10% guna menyerap stres transportasi.",
    "Audit nilai oksigen terlarut (DO) dini hari (04.00 – 05.30) setiap hari, pastikan DO dasar kolam selalu di atas 4,0 mg/L.",
    "Lakukan sampling jala mingguan untuk melacak perkembangan ABW, memverifikasi nilai ADG, dan memonitor estimasi biomassa riil.",
    "Jadwalkan panen parsial jika biomassa mendekati 85% dari batas kapasitas aerasi sebelum mencapai ukuran panen akhir.",
    "Catat data tebar, bobot sampling, dan log pakan harian langsung di Shrimply untuk mencegah risiko kolam melampaui carrying capacity.",
  ],
  sources: [
    {
      title: "Growth and Survival of Litopenaeus vannamei at Different Stocking Densities",
      publisher: "FAO AGRIS",
      url: "https://agris.fao.org/search/en/providers/124569/records/66743ee7eb5a381a3380f4b1",
    },
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Pond Aeration and Water Quality in Commercial Aquaculture",
      publisher: "Boyd & Fast",
      url: "https://www.was.org",
    },
    {
      title: "Best Management Practices for a Mangrove-Friendly Shrimp Farming",
      publisher: "SEAFDEC Aquaculture Department",
      url: "https://repository.seafdec.org/handle/20.500.12066/1947",
    },
  ],
};
