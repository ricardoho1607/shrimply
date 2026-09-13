import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "white-spot-syndrome-virus-shrimp",
  section: "Air, Kesehatan, dan Risiko",
  label: "Risiko Penyakit",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "WSSV pada Udang: Panduan Tanggap Darurat dan Pencegahan White Spot Syndrome Virus",
  description:
    "Panduan praktis penanganan WSSV pada udang vaname (white spot syndrome virus), meliputi gejala awal klinis, risiko mortalitas massal akut, pemicu parameter lingkungan, konfirmasi uji PCR, protokol tanggap darurat, dan pencegahan biosekuriti ketat.",
  readTime: "9 menit baca",
  tags: [
    "WSSV",
    "virus bintik putih",
    "white spot syndrome virus",
    "white spot disease",
    "penyakit udang vaname",
    "uji PCR udang",
    "mortalitas massal udang",
    "biosekuriti tambak",
    "isolasi kolam",
    "karantina air",
    "panen darurat udang",
  ],
  publishedAt: "2026-06-13",
  updatedAt: "2026-07-09",
  image: {
    src: "/resources/images/white-spot-syndrome-virus-wssv-shrimp-guide.png",
    alt: "Infografis panduan penanganan virus bintik putih WSSV pada budidaya udang vaname yang menampilkan deteksi dini, konfirmasi uji laboratorium PCR, isolasi kolam, pemicu parameter suhu air, dan langkah pencegahan biosekuriti",
    width: 1671,
    height: 941,
  },
  relatedFeature: { label: "Software Peringatan Penyakit", href: "/id/features/disease-alerts" },
  takeaways: [
    "WSSV merupakan salah satu patogen virus paling mematikan dan tercepat penyebarannya dalam budidaya udang, dengan potensi memicu mortalitas massal akut 80–100% hanya dalam 3–10 hari jika respons terlambat.",
    "Bintik putih pada karapas dapat muncul, namun petambak tidak boleh menunggu tanda visual tersebut; penurunan drastis nafsu makan di anco, udang berenang lesu di tepi pematang, lonjakan kematian, dan konfirmasi uji PCR jauh lebih krusial untuk tindakan darurat.",
    "Tidak ada obat kimiawi maupun antibiotik yang dapat menyembuhkan WSSV di kolam; respons yang tepat adalah isolasi operasional dan karantina air seketika, pembatasan pergerakan tambak, pengujian laboratorium, evaluasi panen darurat rasional, serta pencegahan biosekuriti ketat untuk siklus berikutnya.",
  ],
  faqs: [
    {
      question: "Apa tanda-tanda klinis paling awal dari serangan virus WSSV pada udang vaname?",
      answer:
        "Waspadai penurunan nafsu makan secara drastis di anco dalam kurun 24–48 jam, udang tampak lesu dan berenang lambat di permukaan air atau berkerumun di sepanjang tepi tanggul kolam pada siang hari, warna tubuh berubah kemerahan (reddish discoloration), cangkang melonggar dari daging (loose cuticula), dan hepatopankreas memucat. Bintik-bintik putih berdiameter 0,5–2,0 mm pada bagian dalam karapas dan segmen tubuh dapat berkembang pada stadium lanjut, namun pada udang vaname gejala bintik putih tidak selalu tampak jelas sehingga petambak dilarang menunda tindakan karantina hanya demi menunggu munculnya bintik putih.",
    },
    {
      question: "Kondisi lingkungan atau parameter air apa yang memicu timbulnya wabah WSSV?",
      answer:
        "Penurunan suhu air kolam di bawah 27°C (terutama pada rentang 22–26°C akibat hujan lebat berkepanjangan atau musim pancaroba dingin) merupakan pemicu utama replikasi cepat virus WSSV sekaligus menekan sistem imunitas udang. Faktor pemicu lainnya mencakup penurunan drastis salinitas pascahujan lebat, fluktuasi pH lebih dari 0,5 antara pagi dan sore, kadar oksigen terlarut (DO) rendah (< 4 mg/L), tingginya beban bahan organik sedimen dasar, serta keberadaan vektor krustasea liar (seperti kepiting tambak dan udang liar) yang membawa partikel virus aktif.",
    },
    {
      question: "Apakah ada obat atau antibiotik untuk menyembuhkan udang yang sudah terinfeksi WSSV?",
      answer:
        "Sama sekali tidak ada. WSSV adalah infeksi virus dan antibiotik tidak memiliki efektivitas apa pun melawan virus; pemberian antibiotik justru melanggar regulasi keamanan pangan, meninggalkan residu berbahaya, merusak mikrobioma air kolam, dan memicu resistensi bakteri. Suplemen pakan seperti vitamin C, mineral esensial, ekstrak herbal, dan imunostimulan dapat mendukung ketahanan fisiologis udang sehat sebelum paparan terjadi, namun tidak dapat membalikkan infeksi virus yang telah menyerang organ vital. Penanganan mutlak berfokus pada pembatasan penyebaran (containment) dan penyelamatan sisa biomassa.",
    },
    {
      question: "Apa langkah tanggap darurat yang harus diambil saat kolam diduga kuat terinfeksi WSSV?",
      answer:
        "Segera laporkan kepada penanggung jawab tambak dan lakukan isolasi operasional total. Terapkan karantina air (water quarantine) dengan mengunci semua pintu inlet dan outlet; dilarang keras membuang air kolam ke saluran umum guna mencegah kontaminasi kawasan pertambakan sekitar. Pasang jaring atau tali penghalau burung (bird scaring line) untuk mencegah burung pemakan bangkai membawa virus ke petak lain. Hentikan sirkulasi peralatan kerja (jala, serok, ember) dan personil tanpa desinfeksi ketat. Ambil sampel udang hidup bergejala untuk uji konfirmasi PCR, hentikan pemberian pakan untuk mencegah pembusukan dasar kolam, dan evaluasi opsi panen darurat jika udang bernilai ekonomis.",
    },
    {
      question: "Kapan panen darurat harus dipilih dibandingkan klorinasi atau penutupan kolam?",
      answer:
        "Jika udang terinfeksi telah mencapai ukuran komersial yang laku dijual (misalnya size 100 ke atas atau MBW > 8–10 gram) dan tingkat kelangsungan hidup masih memadai, panen darurat dapat dieksekusi secara cepat dan terisolasi dengan mendesinfeksi seluruh peralatan panen serta menampung air buangan panen di kolam pengendapan/IPAL untuk diberi klorin 30–50 ppm sebelum dibuang. Namun, jika udang masih berukuran kecil (DOC muda) dan laju mortalitas harian telah melampaui batas kendali, kolam sebaiknya ditutup, dieradikasi total menggunakan klorin/kaporit dosis tinggi (30–40 ppm) untuk mematikan udang terinfeksi dan vektor pembawa, kemudian didiamkan hingga residu klorin terurai tuntas sebelum memulai siklus baru.",
    },
  ],
  sections: [
    {
      heading: "Mengenal Patogen WSSV: Karakteristik dan Dampak Nyata di Tambak",
      body: [
        "White Spot Syndrome Virus (WSSV) adalah patogen virus DNA beruntai ganda dari famili Nimaviridae yang sangat ganas dan menular pada udang penaeid, khususnya udang vaname (Litopenaeus vannamei) dan udang windu (Penaeus monodon), serta berbagai spesies krustasea lainnya. Secara global, World Organisation for Animal Health (WOAH) mengklasifikasikan WSSV sebagai salah satu ancaman penyakit paling berbahaya dalam industri budidaya udang komersial.",
        "Dinamika penularan WSSV sangat berbeda dari gangguan pertumbuhan kronis seperti mikrosporidia EHP. Jika infeksi EHP memicu variasi ukuran yang timpang dan laju pertumbuhan harian (ADG) stagnan dalam hitungan minggu, serangan WSSV adalah bencana kematian hiper-akut: nafsu makan anjlok drastis, perilaku udang berubah abnormal, dan angka kematian massal dapat mencapai 80% hingga 100% dari total populasi kolam hanya dalam kurun waktu 3 hingga 10 hari sejak gejala awal muncul.",
        "Mengingat partikel virus WSSV dapat berpindah dengan cepat melalui bangkai udang (akibat kanibalisme), media air tambak, peralatan kerja yang terkontaminasi, serta vektor krustasea liar (seperti kepiting dan teritip), setiap kecurigaan klinis WSSV harus diperlakukan secara simultan sebagai krisis kesehatan kolam dan ancaman biosekuriti kawasan pertambakan.",
      ],
    },
    {
      heading: "Gejala Klinis Lapangan: Mengapa Tidak Boleh Menunggu Bintik Putih",
      body: [
        "Tanda-tanda awal di lapangan umumnya mencakup penurunan nafsu makan secara mendadak di anco pakan, kelesuan (lethargy), udang berenang mengambang di permukaan air atau menyusuri tepi tanggul kolam pada siang hari, perubahan warna tubuh menjadi kemerahan (reddish body), cangkang mengendur dari kutikula (loose shell), serta lonjakan kematian udang yang tersedot di saringan saluran pembuangan tengah (central drain).",
        "Bintik-bintik putih berdiameter 0,5 hingga 2 mm (endapan kalsium pada permukaan dalam karapas dan segmen tubuh) merupakan gejala patognomonik klasik, namun pada udang vaname bintik putih ini sering kali lambat muncul, samar, atau bahkan tidak tampak sama sekali sebelum peristiwa mortalitas massal terjadi. Menunggu hingga bintik putih terlihat dengan mata telanjang adalah kesalahan fatal yang dapat menutup jendela waktu penanganan darurat.",
        "Gejala visual WSSV sering menyerupai serangan sindrom penyakit akut lainnya seperti AHPND atau vibriosis sistemik yang dibahas dalam panduan [Peringatan Penyakit Udang](/id/resources/shrimp-disease-alerts). Oleh karena itu, penurunan respons anco yang drastis dan peningkatan mortalitas harus segera memicu protokol penguncian isolasi kolam serta pengujian laboratorium, bukan sekadar pengamatan visual pasif di tepi kolam.",
      ],
      table: {
        columns: ["Stadium Infeksi WSSV", "Tanda Klinis & Perilaku Udang", "Dampak Nafsu Makan & Kematian", "Prioritas Tindakan Petambak"],
        rows: [
          [
            "Fase Awal (Inkubasi / Prodromal)",
            "Nafsu makan di anco menurun 30–50%, udang mulai lambat merespons pakan, aktivitas berenang sedikit melemah",
            "Sisa pakan menumpuk di anco; kematian belum terlihat nyata atau baru 1–2 ekor di saringan central drain",
            "Hentikan penambahan pakan harian, periksa kestabilan suhu dan DO, kunci pintu air, siapkan sampel udang untuk uji PCR",
          ],
          [
            "Fase Akut (Onset Klinis)",
            "Udang berenang lesu di permukaan air, berkerumun di pinggir pematang kolam, tubuh kemerahan, cangkang mengendur",
            "Nafsu makan anjlok > 80% atau anco sama sekali tidak tersentuh; kematian harian melonjak tajam secara eksponensial",
            "Isolasi operasional kolam total, pasang bird netting, sterilkan peralatan, verifikasi ukuran udang untuk opsi panen darurat",
          ],
          [
            "Fase Terminal (Mortalitas Massal)",
            "Bintik putih diameter 0,5–2 mm tampak pada bagian dalam karapas, udang sekarat mengapung atau terbaring di dasar, kanibalisme masif",
            "Mortalitas mencapai 80–100% populasi kolam dalam hitungan hari; air kolam menjadi sumber penularan virus konsentrasi tinggi",
            "Eksekusi panen darurat kilat jika udang memiliki nilai jual, atau lakukan klorinasi penutupan kolam (30–40 ppm) tanpa membuang air hidup",
          ],
        ],
      },
    },
    {
      heading: "Parameter Lingkungan dan Pemicu Lonjakan Risiko WSSV",
      body: [
        "Kondisi lingkungan perairan kolam memegang peranan krusial dalam memicu peralihan dari infeksi laten (tanpa gejala) menjadi wabah klinis akut. Pemicu lingkungan nomor satu yang paling terdokumentasi adalah penurunan suhu air di bawah 27°C (terutama pada rentang 22–26°C), yang umum terjadi saat musim penghujan berkepanjangan, badai cuaca ekstrem, atau penurunan suhu malam hari di musim dingin.",
        "Selain penurunan suhu, stres fisiologis udang juga diperparah oleh penurunan mendadak salinitas akibat guyuran hujan deras, fluktuasi pH harian yang lebar (> 0,5 antara pagi dan sore), kadar oksigen terlarut (DO) rendah (< 4 mg/L pada fajar), beban bahan organik yang berlebih, dan penumpukan lumpur hitam anaerobik di dasar kolam. Nilai acuan optimal parameter lingkungan tambak dapat ditinjau lebih dalam pada [Panduan Parameter Kualitas Air Udang](/id/resources/vannamei-water-quality-parameters).",
        "Parameter lingkungan yang buruk tidak menciptakan virus secara spontan, namun kondisi tersebut menekan sistem imunitas seluler udang, mempercepat laju replikasi virus di dalam jaringan tubuh, dan memperpendek masa inkubasi. Di samping itu, jalur penularan eksternal seperti air pasang yang belum diendapkan, krustasea liar, kepiting tambak (Scylla spp.), burung pemakan bangkai, peralatan kerja bersama, dan lalu lintas teknisi antar-petak merupakan vektor pembawa yang wajib dikendalikan secara menyeluruh.",
      ],
      note: "Peringatan Suhu Rendah: Penurunan suhu air kolam di bawah 27°C secara signifikan mempercepat replikasi WSSV dan menekan respon imun hemusit udang. Saat cuaca dingin atau musim hujan lebat, tingkatkan frekuensi inspeksi anco dan waspadai setiap anomali nafsu makan.",
    },
    {
      heading: "Prosedur Diagnostik dan Konfirmasi Laboratorium PCR",
      body: [
        "Kepastian infeksi WSSV harus selalu ditegakkan melalui uji laboratorium berbasis Polymerase Chain Reaction (PCR), baik metode konvensional (nested PCR) maupun Real-Time PCR (RT-qPCR) sesuai dengan pedoman standar diagnostik World Organisation for Animal Health (WOAH). Pengamatan histopatologi dapat memperlihatkan badan inklusi intranuklear basofilik eosinofilik pada organ ektodermal dan mesodermal (seperti insang, epitel lambung, dan kutikula), namun evaluasi visual makroskopis saja tidak pernah memadai untuk diagnosis definitif.",
        "Dalam penanganan praktis di tambak, pengambilan sampel harus dilakukan secara tepat: pilih udang yang masih hidup namun menunjukkan kelesuan fisik atau berenang di tepi tanggul, hindari mengambil bangkai udang yang telah membusuk lama karena materi genetik virus dapat terdegradasi. Masukkan sampel ke dalam alkohol 95% atau larutan fiksatif yang disyaratkan laboratorium, beri label nomor petak kolam, tanggal, DOC, dan segera kirimkan ke laboratorium diagnostik patologi akuakultur terdekat.",
        "Hubungkan hasil pengujian laboratorium dengan histori kolam secara terpadu: tren [pelacakan mortalitas udang](/id/resources/shrimp-mortality-tracking), respons anco pakan, dinamika kualitas air harian, serta catatan lalu lintas peralatan tambak. Apabila tambak memiliki fasilitas tes cepat (rapid test kit / isothermal LAMP), gunakan sebagai penapisan awal (screening), namun keputusan strategis seperti pembukaan isolasi atau panen darurat tetap harus mengacu pada konfirmasi laboratorium resmi dan arahan ahli kesehatan ikan/udang.",
      ],
    },
    {
      heading: "Protokol Tanggap Darurat: Tindakan Kilat Saat Terindikasi WSSV",
      body: [
        "Begitu muncul kecurigaan klinis WSSV, waktu bertindak menjadi faktor penentu penyelamatan investasi farm. Seluruh tim teknis wajib menjalankan SOP tanggap darurat secara serentak:",
      ],
      items: [
        "Notifikasi dan isolasi operasional segera: Laporkan seketika kepada manajer tambak dan tetapkan kolam suspek dalam status karantina penuh. Hentikan total pemindahan air, lumpur, udang hidup, jala sampling, nampan anco, serok, ember, sepatu bot, kendaraan, serta personil dari kolam suspek ke kolam-kolam sehat lainnya.",
        "Karantina air mutlak (strict water quarantine): Kunci rapat pintu saluran inlet dan outlet kolam. Dilarang keras membuang air kolam yang terinfeksi ke saluran buang umum tanpa perlakuan disinfeksi, dan dilarang mengalirkan air tersebut ke petak kolam lainnya.",
        "Penghalau burung (bird scaring line): Pasang jaring burung (bird netting) atau bentangan tali pita di atas permukaan kolam untuk mencegah burung pemangsa memakan udang terinfeksi dan menjatuhkan bangkai virus ke kolam tetangga.",
        "Penghentian pakan harian: Hentikan pemberian pakan atau turunkan ransum minimal 70–80% seketika untuk mencegah pembusukan pakan di dasar kolam yang dapat memicu ledakan bakteri patogen sekunder dan memperburuk hipoksia.",
        "Evaluasi panen darurat yang terhitung: Nilai laju percepatan kematian, rata-rata bobot udang (MBW), kelayakan nilai jual komersial, dan regulasi keamanan pangan. Panen darurat merupakan keputusan bisnis dan biosekuriti yang harus dilakukan dalam pengawasan ketat, bukan tindakan budidaya biasa.",
        "Pencatatan kronologis terperinci: Dokumentasikan jam penurunan nafsu makan, waktu kematian pertama tercatat, alat kerja yang sempat masuk ke petak, uji laboratorium yang dikirim, dan langkah penanganan yang diambil untuk evaluasi audit biosekuriti.",
      ],
    },
    {
      heading: "Realitas Pengobatan: Mengapa Tidak Ada Obat Ajaib di Dalam Kolam",
      body: [
        "Tidak ada obat kimiawi maupun senyawa farmasi yang terbukti secara ilmiah mampu menyembuhkan infeksi virus WSSV di dalam perairan kolam budidaya. Antibiotik tidak memiliki efektivitas apa pun terhadap virus; pemberian antibiotik ke dalam kolam yang terserang WSSV adalah tindakan keliru yang menimbulkan bahaya residu terlarang pada produk udang, melanggar standar ekspor perikanan, merusak mikroflora air yang bermanfaat, dan mempercepat resistensi antimikroba global.",
        "Aplikasi probiotik komersial, vitamin C, mineral makro-mikro, ekstrak herbal, beta-glukan, dan imunostimulan lainnya memiliki manfaat dalam memperkuat kebugaran fisiologis udang sehat sebelum terpapar patogen, namun produk-produk ini bukan obat kuratif untuk menyembuhkan udang yang sudah terinfeksi virus secara aktif. Ketika suatu petak kolam telah terkonfirmasi positif WSSV, isolasi ketat dan perlindungan kolam-kolam lain jauh lebih berharga daripada membuang biaya besar untuk perlakuan kimiawi yang tidak realistis.",
        "Strategi paling bertanggung jawab dan hemat biaya adalah deteksi dini yang disiplin, pembatasan pergerakan tambak tanpa kompromi, konfirmasi uji laboratorium PCR, keputusan panen darurat rasional, serta klorinasi penutupan kolam yang tuntas sebelum memulai siklus tebar baru.",
      ],
    },
    {
      heading: "Strategi Pencegahan Jangka Panjang dan Biosekuriti Multi-Barrier",
      body: [
        "Pencegahan WSSV yang berkelanjutan dimulai jauh sebelum benur ditebar ke dalam petak pembesaran (pre-stocking):",
      ],
      items: [
        "Penggunaan benur SPF bersertifikat: Tebar hanya benur (post-larvae) yang berasal dari induk Specific Pathogen Free (SPF) bersertifikat dan telah lolos uji PCR bertingkat (nested PCR) dari fasilitas hatchery berstandar biosekuriti tinggi. Simpan seluruh dokumen asal-usul benur untuk penelusuran rekam jejak (traceability).",
        "Pengelolaan dan sterilisasi air pasokan: Saring air laut atau air payau menggunakan saringan halus berlapis (filter mesh 200–300 mikron) untuk menahan larva dan bibit krustasea liar. Endapkan air di kolam tandon (reservoir) dan lakukan disinfeksi dengan klorin/kaporit (20–30 ppm) atau kalium permanganat sebelum dialirkan ke petak pemeliharaan.",
        "Pemberantasan inang perantara (vektor liar): Pasang pagar penghalau kepiting (crab barrier) berupa lembaran plastik licin setinggi minimal 50 cm di sekeliling pematang tambak guna mencegah masuknya kepiting liar (Scylla spp.) dan udang liar yang berperan sebagai reservoir alami virus.",
        "Protokol biosekuriti peralatan dan zona tambak: Sediakan set peralatan kerja khusus (jala, serok, ember, nampan anco) per petak kolam dengan kode warna yang berbeda. Letakkan bak celup desinfektan alas kaki (footbath) dan cuci tangan (hand dip) berisi larutan klorin aktif di setiap pintu masuk kolam.",
        "Manajemen lumpur dasar dan sanitasi antar-siklus: Buang endapan bahan organik dan lumpur hitam secara berkala selama budidaya melalui central drain atau penyiponan. Setelah panen, lakukan pengeringan dasar kolam total, pengapuran dengan kapur tohor (CaO / Ca(OH)2) untuk menaikkan pH dasar > 11 guna membunuh sisa virus dan spora resisten, serta desinfeksi menyeluruh sebelum siklus berikutnya.",
      ],
    },
    {
      heading: "Bagaimana Integrasi Data Shrimply Mempercepat Respons Tambak",
      body: [
        "Penanganan WSSV berpacu dengan waktu dalam hitungan jam. Shrimply menyatukan data operasional harian: tren mortalitas di saringan pembuangan, dinamika nafsu makan di anco pakan, fluktuasi parameter kualitas air (terutama penurunan suhu fajar dan defisit oksigen terlarut), riwayat sampling pertumbuhan, hasil uji laboratorium PCR, hingga pencatatan tindakan biosekuriti ke dalam satu ekosistem data yang terpadu.",
        "Bagi asisten cerdas Orson AI dan [Software Peringatan Penyakit](/id/features/disease-alerts), integrasi data 3 hingga 5 hari terakhir mengenai parameter kualitas air, catatan anco pakan, grafik kematian harian, serta pergerakan antar-kolam menjadi fondasi analitik yang tajam. Konteks ini memungkinkan tim tambak mendeteksi anomali perilaku udang lebih dini, mengambil keputusan isolasi sebelum mortalitas meluas, dan melindungi petak-petak kolam lain dari risiko penularan virus yang merugikan.",
      ],
    },
  ],
  checklist: [
    "Pantau penurunan nafsu makan mendadak di anco pakan, perilaku berenang lesu di permukaan atau tepi tanggul, tubuh kemerahan, cangkang mengendur, dan peningkatan angka kematian harian.",
    "Jangan pernah menunda eskalasi dan tindakan isolasi hanya untuk menunggu munculnya bintik putih pada karapas udang vaname.",
    "Segera ambil sampel udang hidup bergejala klinis untuk konfirmasi uji laboratorium PCR terakreditasi sesuai standar diagnostik WOAH.",
    "Terapkan isolasi operasional kolam total dan hentikan pemindahan peralatan kerja, air kolam, udang hidup, lumpur dasar, sepatu bot, kendaraan, serta personil ke kolam sehat.",
    "Karantina saluran air (water quarantine) dengan mengunci pintu inlet dan outlet; dilarang membuang air kolam terinfeksi ke saluran umum tanpa desinfeksi klorin.",
    "Evaluasi keputusan panen darurat bersama manajemen tambak berdasarkan rata-rata bobot udang (MBW), nilai ekonomis pasar, dan kepatuhan regulasi lingkungan.",
    "Gunakan benur SPF bersertifikat PCR, desinfeksi air di kolam tandon pengendapan, serta pasang crab barrier dan bird netting untuk memutus jalur vektor krustasea liar.",
    "Dokumentasikan seluruh histori kematian, pakan di anco, fluktuasi suhu air, hasil uji laboratorium, dan kronologi tindakan darurat secara terpusat di Shrimply.",
  ],
  sources: [
    {
      title: "Infection with White Spot Syndrome Virus",
      publisher: "World Organisation for Animal Health",
      url: "https://www.woah.org/fileadmin/Home/eng/Health_standards/aahm/current/2.2.08_WSSV.pdf",
    },
    {
      title: "The Way of Water: Unravelling White Spot Syndrome Virus (WSSV) Transmission Dynamics in Shrimp Aquaculture",
      publisher: "Viruses",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10534367/",
    },
    {
      title: "Biology, Host Range, Pathogenesis and Diagnosis of White Spot Syndrome Virus",
      publisher: "Indian Journal of Virology",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3550756/",
    },
    {
      title: "A Review on Molecular Detection Techniques of White Spot Syndrome Virus",
      publisher: "Aquaculture Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10029913/",
    },
    {
      title: "White Spot Disease",
      publisher: "Center for Food Security and Public Health",
      url: "https://www.cfsph.iastate.edu/Factsheets/pdfs/white-spot-disease.pdf",
    },
    {
      title: "Analyzing Transmission Dynamics of White Spot Syndrome Virus in Pacific White Shrimp",
      publisher: "Responsible Seafood Advocate",
      url: "https://www.globalseafood.org/advocate/analyzing-transmission-dynamics-of-white-spot-syndrome-virus-in-pacific-white-shrimp/",
    },
    {
      title: "Reducing Disease Risks in Fish Through Better Detection, Management and Prevention",
      publisher: "WorldFish",
      url: "https://www.worldfishcenter.org/publication/reducing-disease-risks-fish-through-better-detection-management-and-prevention",
    },
  ],
};
