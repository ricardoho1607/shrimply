import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "ehp-shrimp-disease",
  section: "Air, Kesehatan, dan Risiko",
  label: "Risiko Penyakit",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "EHP pada Budidaya Udang: Penyebab Pertumbuhan Lambat dan Pencegahan Berulang",
  description:
    "Panduan praktis pengelolaan EHP (Enterocytozoon hepatopenaei) pada udang vaname: identifikasi tanda klinis dan disparitas ukuran, konfirmasi uji PCR, inaktivasi spora dasar kolam (CaO pH > 12), batas pengobatan, peran probiotik Bacillus, serta protokol biosekuriti jangka panjang.",
  readTime: "9 menit baca",
  tags: [
    "EHP udang",
    "Enterocytozoon hepatopenaei",
    "stunting pertumbuhan udang",
    "disparitas ukuran vaname",
    "skrining PCR benur",
    "mikrosporidia hepatopankreas",
    "spora dasar kolam",
    "pengapuran CaO pH 12",
    "desinfeksi tambak",
    "Bacillus probiotik",
    "biosekuriti tambak",
    "peringatan penyakit udang",
  ],
  publishedAt: "2026-06-13",
  updatedAt: "2026-09-12",
  image: {
    src: "/resources/images/ehp-shrimp-disease-guide.png",
    alt: "Panduan teknis EHP pada tambak udang vaname yang mengulas keterlambatan pertumbuhan, konfirmasi uji PCR, inaktivasi spora di dasar kolam, faktor risiko penularan, dan biosekuriti pencegahan",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Software Peringatan Penyakit", href: "/id/features/disease-alerts" },
  takeaways: [
    "EHP (Enterocytozoon hepatopenaei) adalah parasit mikrosporidia intraseluler yang menginfeksi tubulus hepatopankreas udang, memicu hambatan pertumbuhan kronis (stunting), disparitas ukuran ekstrem, lonjakan FCR, dan penurunan nilai panen tanpa menimbulkan mortalitas massal akut.",
    "Pengamatan tanda fisik visual saja tidak cukup untuk diagnosis definitif. Dugaan infeksi EHP wajib dikonfirmasi melalui pengujian laboratorium terakreditasi (PCR, qPCR, atau histopatologi) dengan memadukan evaluasi data tren MBW, ADG, FCR, respons pakan di anco, dan riwayat kolam.",
    "Hingga saat ini belum ada pengobatan kimiawi atau antibiotik yang terbukti efektif menyembuhkan EHP di dalam kolam aktif; pengendalian bertumpu mutlak pada pencegahan melalui benur SPF bersertifikat PCR, inaktivasi spora dasar kolam dengan pengapuran CaO (pH > 12), desinfeksi air tandon, serta disiplin biosekuriti ketat.",
  ],
  faqs: [
    {
      question: "Apa itu EHP pada budidaya udang vaname dan bagaimana gejalanya di tambak?",
      answer:
        "EHP (Enterocytozoon hepatopenaei) adalah mikrosporidia parasitik intraseluler yang menginfeksi sel-sel epitel tubulus hepatopankreas pada udang vaname. Gejala khasnya di tambak bukanlah kematian mendadak, melainkan pertumbuhan yang terhambat parah atau kerdil (stunting), keseragaman ukuran yang sangat timpang (disparitas ukuran ekstrem dalam satu jala), kenaikan nilai FCR akibat pakan tidak terserap sempurna, serta usus yang tampak kosong atau terputus-putus. Pada tingkat keparahan tinggi, EHP kerap berasosiasi dengan sindrom kotoran putih (White Feces Syndrome / WFD) akibat koinfeksi dengan bakteri oportunistik Vibrio.",
    },
    {
      question: "Mengapa antibiotik tidak dapat mengobati infeksi EHP di dalam kolam?",
      answer:
        "EHP tergolong parasit mikrosporidia (kelompok eukariota parasitik mirip cendawan), bukan bakteri. Oleh karena itu, antibiotik tidak memiliki target mekanisme kerja biologis untuk membunuh EHP. Penggunaan antibiotik di kolam tambak justru kontraproduktif karena dapat mematikan mikrobioma menguntungkan di saluran pencernaan udang, memicu resistensi bakteri patogen (AMR), meninggalkan residu kimia terlarang yang membahayakan standar keamanan pangan ekspor, dan merusak fungsi hepatopankreas tanpa menyembuhkan infeksi parasit.",
    },
    {
      question: "Bagaimana cara efektif membasmi dan menginaktivasi spora EHP di dasar kolam?",
      answer:
        "Spora EHP memiliki dinding sel berlapisan ganda yang sangat tebal dan resisten terhadap desinfektan umum. Metode inaktivasi yang direkomendasikan secara ilmiah saat persiapan tambak adalah: (1) Buang dan bersihkan seluruh endapan lumpur hitam (black sludge) dari dasar kolam; (2) Lakukan pengapuran dasar kolam menggunakan kapur tohor / quicklime (CaO) dengan dosis tinggi (4–6 ton/ha pada tambak tanah dengan kelembapan cukup atau laburan pekat pada kolam terpal HDPE) guna menaikkan pH tanah hingga di atas 12 selama minimal beberapa hari—lingkungan sangat basa ini memaksa polar tube spora keluar prematur sehingga spora mati dan kehilangan daya infeksi; (3) Keringkan dasar kolam di bawah terik matahari intensif minimal 10–14 hari; (4) Desinfeksi saluran air dan kolam menggunakan kalsium hipoklorit (kaporit 20–30 ppm) atau kalium permanganat (KMnO4 2–5 ppm).",
    },
    {
      question: "Kapan petambak harus mencurigai adanya infeksi EHP dibanding masalah pakan atau kualitas air biasa?",
      answer:
        "Kecurigaan kuat terhadap EHP patut diwaspadai jika parameter kualitas air (DO, pH, suhu, salinitas) terpantau stabil dalam rentang normal dan pakan di anco selalu bersih habis, namun pertambahan bobot harian (ADG) mendatar di bawah 0,10–0,15 g/hari setelah memasuki DOC 35–45, disertai variasi ukuran yang sangat mencolok di mana udang kecil berukuran 4–6 gram bercampur dengan udang 10–12 gram. Jika pola anomali ini berulang pada 2–3 kali jadwal sampling berturut-turut, segera kirimkan sampel udang hidup untuk uji konfirmasi PCR sebelum biaya pakan membengkak tanpa pertambahan biomassa yang nyata.",
    },
  ],
  sections: [
    {
      heading: "Apa sebenarnya penyakit EHP (Enterocytozoon hepatopenaei)?",
      body: [
        "EHP merupakan singkatan dari Enterocytozoon hepatopenaei, sebuah mikrosporidia parasitik intraseluler pembentuk spora yang menginfeksi tubulus epitel hepatopankreas udang vaname (Litopenaeus vannamei) dan udang windu (Penaeus monodon). Hepatopankreas adalah organ sentral dalam fisiologi udang yang bertindak sebagai pusat sintesis enzim pencernaan, penyerapan sari makanan, penyimpanan cadangan lipid dan glikogen, serta metabolisme detoksifikasi.",
        "Ketika spora EHP menginvasi dan memperbanyak diri di dalam sel epitel tubulus hepatopankreas, kapasitas fungsional organ tersebut untuk menyerap nutrisi dari pakan runtuh. Dampak ekonomisnya di tambak pembesaran berlangsung secara perlahan namun menimbulkan kerugian finansial yang masif. EHP umumnya tidak menyebabkan kematian massal mendadak layaknya virus bercak putih (WSSV) atau toksin AHPND, melainkan menimbulkan hambatan pertumbuhan kronis (stunting), disparitas ukuran yang parah antar-individu udang, pembengkakan angka FCR, serta penurunan drastis bobot biomassa saat panen.",
        "Sangat krusial untuk memisahkan masalah EHP dari kegagalan kualitas air biasa. Ekosistem air yang buruk tidak menciptakan patogen EHP dari ketiadaan. Akan tetapi, akumulasi beban organik, hipoksia dini hari, serta kondisi dasar kolam yang kotor menciptakan tekanan stres lingkungan yang mempercepat replikasi spora dalam tubuh udang dan membuka jalan bagi infeksi sekunder bakteri patogen. Tinjau selalu [Parameter Kualitas Air Udang](/id/resources/vannamei-water-quality-parameters) untuk menjaga stabilitas daya dukung kolam.",
      ],
    },
    {
      heading: "Gejala klinis dan apa yang terlihat di lapangan tambak",
      body: [
        "Sinyal peringatan awal yang paling jamak ditemui adalah kolam yang berhenti menambah bobot udang secara normal. Nilai bobot rata-rata tubuh (MBW) bergerak lambat, grafik pertambahan bobot harian (ADG) mendatar di bawah target siklus, respons nafsu makan di anco melemah secara sporadis, dan disparitas variasi ukuran (size shooting) menjadi sangat kontras saat sampling rutin.",
        "Sebagian kolam memperlihatkan gejala klinis seperti saluran usus yang pucat atau kosong, cangkang lembek (soft shell), kram otot, serta untaian kotoran putih (white feces) yang mengapung di permukaan air. Namun, gejala eksternal ini tidak konsisten dan tidak dapat dijadikan dasar diagnosa tunggal. Panduan penyakit dari Badan Kesehatan Hewan Dunia (WOAH) menegaskan bahwa tanda luar udang terinfeksi EHP sering kali tidak tampak selain adanya hambatan pertumbuhan kronis, sedangkan kotoran putih hanya timbul pada sebagian kasus koinfeksi.",
        "Oleh sebab itu, tambak wajib memperlakukan dugaan EHP sebagai persoalan tren data komparatif. Satu kali observasi visual memiliki nilai diagnostik yang lemah. Namun, perpaduan pola historis antara MBW, ADG, pembengkakan FCR, respons pakan, dan catatan laboratorium diagnostik memberikan konfirmasi yang kuat. Pelajari langkah analisisnya di [Troubleshooting ADG Rendah](/id/resources/slow-shrimp-growth-adg-troubleshooting) dan [Evaluasi Pakan Anco](/id/resources/feed-tray-observations).",
      ],
      items: [
        "Pertumbuhan terhambat (stunting): Kurva ADG mendatar tajam pada DOC > 35 (kerap < 0,10 g/hari) meskipun ransum pakan terus dinaikkan.",
        "Disparitas ukuran ekstrem: Dalam satu kali tarikan jala sampling, terlihat variasi bobot tubuh yang sangat timpang (udang kerdil 4 gram bercampur udang 12 gram).",
        "Pembengkakan nilai FCR: Pakan di anco terus habis dikonsumsi, namun biomassa panen tidak bertambah secara proporsional akibat malabsorpsi pakan.",
        "Atrofi hepatopankreas: Pengamatan mikroskopis menunjukkan tubulus hepatopankreas mengecil, pucat, kehilangan droplet lipid, dan dipenuhi vakuola spora.",
        "Kotoran putih mengambang (opsional): Feses putih terapung dapat teramati di permukaan tepi pematang jika terjadi koinfeksi sekunder dengan bakteri Vibrio.",
      ],
    },
    {
      heading: "Jalur penularan dan penyebaran spora EHP di tambak",
      body: [
        "EHP menyebar melalui spora berdinding ganda yang sangat resisten dan melalui transmisi horizontal. Berbagai kajian patologi akuakultur mendokumentasikan bahwa penularan di dalam kolam terjadi lewat sifat kanibalisme udang hidup terhadap bangkai udang terinfeksi, ingesti spora aktif yang diekskresikan bersama feses udang sakit, serta akumulasi spora pada sedimen lumpur dasar kolam.",
        "Pada tambak pembesaran, risiko penularan paling kritis bersumber dari tebaran benur (post-larvae/PL) yang sudah membawa spora laten dari pembenihan, kolam dengan riwayat infeksi EHP pada siklus sebelumnya yang tidak disterilisasi optimal, endapan lumpur hitam yang tidak diangkat, pemakaian jala sampling dan anco bersama tanpa desinfeksi, serta sirkulasi air pasokan yang tidak disaring halus.",
        "Karena spora mikrosporidia mampu bertahan hidup lama di lingkungan tanah dan air payau, pencegahan wajib menyasar pengendalian pergerakan hewan sekaligus sanitasi dasar kolam. Menambahkan suplemen pakan saja tidak akan mampu memutus siklus wabah apabila spora infektif, sedimen lumpur, dan peralatan kerja terus memindahkan risiko antar-petak kolam.",
      ],
      table: {
        columns: ["Jalur Penularan", "Mekanisme Transmisi", "Tingkat Risiko", "Tindakan Pencegahan Kritis"],
        rows: [
          [
            "Benur / Post-Larvae (PL)",
            "Penularan vertikal/horizontal dari fasilitas hatchery ke kolam pembesaran",
            "Kritis / Sangat Tinggi",
            "Wajib uji skrining PCR (nested PCR atau qPCR) dari sampel acak batch benur sebelum tebar",
          ],
          [
            "Kanibalisme Udang",
            "Udang memangsa bangkai udang terinfeksi yang mati di dasar kolam",
            "Sangat Tinggi",
            "Sipon rutin pembuangan bangkai central drain setiap hari, pertahankan DO > 5 mg/L, hindari underfeeding",
          ],
          [
            "Feses & Sedimen Dasar Kolam",
            "Spora resisten dikeluarkan via kotoran dan menumpuk pada lumpur anaerobik",
            "Tinggi",
            "Pengurasan berkala central drain harian, pengapuran CaO dosis tinggi (pH > 12) saat persiapan kolam",
          ],
          [
            "Peralatan Kerja Bersama",
            "Spora menempel pada jala sampling, anco, serok, selang sipon, dan sepatu bot teknisi",
            "Tinggi",
            "Gunakan alat khusus per petak kolam, rendam desinfektan klorin atau kalium permanganat sebelum pindah",
          ],
          [
            "Pakan Segar Induk (Polychaeta)",
            "Induk di hatchery diberi pakan cacing laut atau cumi segar pembawa spora EHP",
            "Sangat Tinggi (Hatchery)",
            "Gunakan pakan alami beku terpasteurisasi atau teradiasi bebas patogen untuk induk udang",
          ],
        ],
      },
    },
    {
      heading: "Parameter dan catatan tambak yang mengungkap risiko EHP",
      body: [
        "Deteksi dini EHP paling efektif dilakukan bukan dengan menunggu udang memperlihatkan kerusakan organ parah, melainkan dengan membandingkan target pertumbuhan budidaya terhadap realitas data di lapangan. Pantau dan evaluasi tren bobot rata-rata tubuh (MBW), pertambahan bobot harian (ADG), koefisien variasi ukuran, angka rasio pakan (FCR), respons anco, tingkat kelangsungan hidup (SR), asal batch benur, serta riwayat penyakit kolam terdahulu.",
        "Pemantauan parameter fisik-kimia air tetap fundamental, terutama untuk mengukur stres lingkungan dan kestabilan daya dukung kolam. Oksigen terlarut (DO), pH, alkalinitas, salinitas, suhu air, amonia total (TAN), nitrit, kekeruhan, dan beban bahan organik harus ditelaah berdampingan dengan catatan sampling pertumbuhan, bukan dijadikan pengganti pengujian laboratorium.",
        "Kolam dengan air yang stabil dan jernih namun menunjukkan pertumbuhan udang yang lambat atau terhenti tetap dapat menampung infeksi EHP. Sebaliknya, kolam yang positif EHP disertai kualitas air yang buruk, timbunan lumpur tebal, atau nafsu makan anjlok akan mengalami percepatan penurunan biomassa karena memicu infeksi sekunder bakteri patogen. Keputusan teknis harus bertumpu pada gambaran ekosistem kolam secara menyeluruh melalui [Pencatatan Tambak Udang](/id/resources/shrimp-farm-record-keeping).",
      ],
    },
    {
      heading: "Konfirmasi diagnostik dan langkah tanggap darurat di tambak",
      body: [
        "Konfirmasi kepastian EHP wajib dilakukan melalui pengujian laboratorium patologi yang kompeten. Teknik uji molekuler seperti Polymerase Chain Reaction (PCR), nested PCR, quantitative real-time PCR (qPCR) berbasis probe TaqMan, maupun metode LAMP (Loop-Mediated Isothermal Amplification) merupakan baku emas diagnostik molekuler. Pemeriksaan histopatologi jaringan hepatopankreas juga dapat memperlihatkan vakuola berisi spora mikrosporidia di dalam sel epitel tubulus.",
        "Sembari menunggu hasil laboratorium terbit, isolasi kolam secara ketat untuk mencegah penularan. Hentikan pemindahan udang, pembuangan air ke saluran umum, pemindahan sedimen lumpur, serta mobilisasi jala sampling, anco, serok, sepatu bot, dan selang aerasi dari petak suspek ke petak kolam sehat. Sediakan peralatan kerja terpisah khusus untuk petak tersebut dan catat personil yang bertugas.",
        "Secara operasional, tim manajemen tambak harus segera meninjau ulang jadwal panen, rencana alokasi pakan harian, kebersihan dasar kolam, dan kurva pertumbuhan beberapa pekan terakhir. Tujuannya adalah melokalisasi risiko, melindungi petak kolam lainnya di kawasan tambak, dan menghentikan pemborosan pakan yang dihitung berdasarkan proyeksi biomassa semu yang sudah tidak realistis melalui [Software Peringatan Penyakit](/id/features/disease-alerts).",
      ],
    },
    {
      heading: "Realitas penanganan: Fakta ilmiah seputar pengobatan di kolam",
      body: [
        "EHP tidak boleh dipromosikan kepada petambak sebagai penyakit yang memiliki solusi obat ajaib instan di kolam pembesaran. Seluruh pedoman teknis dan tinjauan ilmiah akuakultur dunia menekankan pencegahan, akurasi diagnosa, biosekuriti, sterilisasi dasar kolam, dan penggunaan benur bebas patogen (SPF), karena belum ada terapi kimiawi di dalam kolam yang terbukti aman dan efektif membasmi spora EHP dari jaringan hepatopankreas udang hidup.",
        "Antibiotik sama sekali bukan solusi untuk mengatasi EHP. EHP adalah parasit mikrosporidia intraseluler, bukan bakteri. Penggunaan antibiotik sembarangan tidak akan menyembuhkan infeksi EHP, melainkan justru mematikan flora mikroba alami yang menguntungkan di saluran pencernaan udang, memperparah kerusakan hepatopankreas, memicu resistensi antimikroba (AMR), dan menyebabkan pelanggaran batas residu kimia berbahaya pada produk udang.",
        "Aditif pakan fungsional dan probiotik tetap memegang peranan berharga sebagai instrumen suportif. Bakteri probiotik seperti Bacillus subtilis, Bacillus licheniformis, dan ragi (yeast) membantu menjaga kesehatan saluran usus, meningkatkan daya cerna nutrisi, menekan kolonisasi bakteri patogen oportunistik (seperti Vibrio spp.) melalui mekanisme eksklusi kompetitif, serta membantu dekomposisi limbah organik di air dan dasar kolam. Gunakan probiotik sebagai bagian dari ketahanan lingkungan dan imunitas udang, bukan diklaim sebagai obat pembasmi EHP yang sudah menginfeksi sel hepatopankreas.",
      ],
      note: "Peringatan Regulasi: Jangan pernah mencampurkan antibiotik atau obat-obatan kimia tanpa izin ke dalam pakan udang untuk mengatasi EHP. Tindakan ini merusak saluran pencernaan udang dan berisiko tinggi menyebabkan penolakan komoditas panen di pasar ekspor.",
    },
    {
      heading: "Protokol biosekuriti dan pencegahan jangka panjang",
      body: [
        "Pencegahan EHP yang efektif dimulai jauh sebelum proses tebar benur di tambak. Selalu gunakan induk udang dan benur (PL) yang telah diskrining bebas EHP, simpan arsip catatan batch pembenihan (hatchery), dan hindari menebar benur yang tidak memiliki sertifikat bebas penyakit ke kolam yang memiliki riwayat masalah EHP pada siklus lampau.",
        "Setelah menyelesaikan siklus budidaya yang terpapar atau dicurigai terinfeksi EHP, perlakukan seluruh dasar kolam sebagai lingkungan berisiko spora tinggi dengan langkah-langkah sterilisasi terstandarisasi:",
      ],
      items: [
        "Sanitasi dan pengangkatan lumpur total: Kuras dan buang seluruh endapan lumpur hitam anaerobik (black sludge) di dasar kolam ke kolam penampungan limbah (sedimentasi) yang terisolasi dari saluran pasokan air.",
        "Pengapuran dasar kolam dengan kapur tohor (CaO) untuk mencapai pH > 12: Aplikasikan kapur tohor / quicklime (CaO) dengan dosis tinggi (4–6 ton/ha pada tambak tanah dengan kelembapan cukup, atau dilarutkan pekat untuk menyemprot dinding dan lantai terpal HDPE/mulsa). Kondisi pH tanah dasar di atas 12 selama beberapa hari memicu ekstrusi tabung polar (polar filament discharge) spora secara prematur sehingga spora inaktif dan kehilangan daya infeksi.",
        "Pengeringan total dasar tambak: Keringkan dasar kolam di bawah paparan sinar matahari terik selama minimal 10–14 hari hingga dasar tanah retak-retak atau permukaan terpal benar-benar kering tanpa sisa genangan air.",
        "Desinfeksi air pasokan tandon secara bertingkat: Rawat air di petak tandon (reservoir) menggunakan kalsium hipoklorit (kaporit 20–30 ppm) atau kalium permanganat (KMnO4 2–5 ppm) dengan aerasi aktif, lalu pastikan residu klorin telah terurai sempurna sebelum air dimasukkan ke kolam budidaya.",
        "Disiplin biosekuriti harian selama siklus: Sediakan wadah celup kaki dan tangan berisi desinfektan di setiap pintu masuk kolam, gunakan peralatan (jala, anco, ember) khusus per petak kolam, pasang jaring burung (bird netting) dan jaring kepiting (crab barrier), serta pantau tren FCR melalui panduan [Optimalisasi FCR Tambak Udang](/id/resources/fcr-shrimp-farming).",
      ],
    },
    {
      heading: "Bagaimana pencatatan digital Shrimply membantu pengendalian EHP",
      body: [
        "Pengendalian risiko EHP menjadi jauh lebih sistematis ketika tambak mampu menghubungkan asal batch benur, riwayat perlakuan kolam, log pakan harian, dinamika kualitas air, hasil sampling periodik (MBW, ADG, variasi disparitas ukuran), angka mortalitas, dan hasil uji laboratorium PCR ke dalam satu sistem pencatatan digital yang terintegrasi.",
        "Bagi kecerdasan buatan Orson AI dan modul sistem peringatan dini, data yang bermakna bukan sekadar satu catatan terisolasi yang menyebut dugaan EHP. Bukti analisis yang tajam lahir dari integrasi data 3 hingga 5 catatan sampling pertumbuhan terakhir, respons konsumsi pakan di anco, tren mortalitas, riwayat kolam, dan hasil uji diagnostik PCR. Konteks menyeluruh ini membantu tim operasional membedakan secara objektif antara dinamika pertumbuhan wajar akibat cuaca dengan ancaman wabah penyakit yang membutuhkan intervensi segera.",
      ],
    },
  ],
  checklist: [
    "Lakukan skrining benur (PL) bebas EHP menggunakan uji molekuler PCR di laboratorium terakreditasi sebelum tebar.",
    "Dokumentasikan data asal pembenihan (hatchery), nomor batch benur, tanggal tebar, riwayat kolam, serta catatan penyakit siklus lampau.",
    "Pantau grafik pertambahan bobot (MBW, ADG), variasi disparitas ukuran, rasio FCR, dan respons anco secara disiplin setiap siklus.",
    "Konfirmasi kecurigaan klinis EHP melalui pengujian laboratorium (PCR/qPCR/histopatologi), bukan sekadar pengamatan visual.",
    "Hentikan pemindahan jala sampling, anco, selang sipon, ember, air, dan lumpur dari petak suspek ke petak kolam sehat.",
    "Terapkan pembersihan lumpur hitam, pengapuran kapur tohor (CaO dosis tinggi hingga pH dasar > 12), serta pengeringan intensif pascapanen kolam terinfeksi.",
    "Gunakan probiotik Bacillus sebagai alat pendukung stabilitas mikrobioma usus dan pengurai bahan organik kolam, bukan sebagai obat pembasmi EHP.",
  ],
  sources: [
    {
      title: "Infection with Enterocytozoon hepatopenaei (EHP)",
      publisher: "World Organisation for Animal Health",
      url: "https://www.woah.org/app/uploads/2022/11/a-woah-ehp-disease-card-sept-2022.pdf",
    },
    {
      title: "Urgent Appeal to Control Spread of the Shrimp Microsporidian Parasite Enterocytozoon hepatopenaei",
      publisher: "Network of Aquaculture Centres in Asia-Pacific",
      url: "https://enaca.org/?id=101",
    },
    {
      title: "Enterocytozoon hepatopenaei Infection in Shrimp: Diagnosis, Interventions, and Food Safety Guidelines",
      publisher: "Microorganisms",
      url: "https://www.mdpi.com/2076-2607/12/1/21",
    },
    {
      title: "Quantification of Enterocytozoon hepatopenaei (EHP) in Penaeid Shrimps Using TaqMan Probe-Based Quantitative PCR",
      publisher: "Pathogens",
      url: "https://www.mdpi.com/2076-0817/8/4/233",
    },
    {
      title: "The Emerging Pathogen Enterocytozoon hepatopenaei Drives a Degenerative Cyclic Pattern in the Hepatopancreas Microbiome",
      publisher: "Scientific Reports",
      url: "https://www.nature.com/articles/s41598-022-19127-2",
    },
    {
      title: "Robins McIntosh on Everything You Need to Know About EHP and Shrimp Farming, Part 2",
      publisher: "Responsible Seafood Advocate",
      url: "https://www.globalseafood.org/advocate/robins-mcintosh-on-everything-you-need-to-know-about-ehp-and-shrimp-farming-part-2/",
    },
    {
      title: "The Role of Probiotics in Vannamei Shrimp Aquaculture Performance",
      publisher: "Fish and Shellfish Immunology Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10082739/",
    },
  ],
};
