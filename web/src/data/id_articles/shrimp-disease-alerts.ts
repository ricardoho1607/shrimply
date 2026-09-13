import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-disease-alerts",
  section: "Air, Kesehatan, dan Risiko",
  label: "Risiko Penyakit",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "Peringatan Penyakit Udang: Mengubah Observasi Tambak Menjadi Tindakan Cepat",
  description:
    "Apa saja tanda-tanda awal penyakit udang vaname? Manfaatkan pemantauan mortalitas, nafsu makan di anco, kualitas air, perubahan perilaku, dan observasi biosekuriti untuk membangun tindakan tanggap darurat tambak yang lebih cepat dan berbasis bukti.",
  readTime: "7 menit baca",
  tags: [
    "peringatan penyakit udang",
    "tanda penyakit udang",
    "pencegahan penyakit udang",
    "biosekuriti tambak",
    "deteksi dini Vibrio",
    "AHPND",
    "EHP",
    "WSSV",
    "mortalitas udang",
    "isolasi kolam",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-disease-alerts-vibrio-ahpnd-biosecurity.jpg",
    alt: "Infografis peringatan penyakit udang yang menampilkan respons nafsu makan anco, mortalitas harian, kualitas air, perilaku berenang, patogen Vibrio, AHPND, biosekuriti, dan sinyal tindakan cepat tambak",
    width: 1536,
    height: 1024,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Software Peringatan Penyakit", href: "/id/features/disease-alerts" },
  takeaways: [
    "Kecepatan penanganan wabah meningkat drastis ketika tambak melacak sinyal peringatan dini (early warning signals) secara disiplin setiap hari.",
    "Sistem peringatan penyakit wajib mengintegrasikan tren mortalitas, respons pakan anco, perilaku berenang, stabilitas kualitas air, dan status risiko kawasan sekitar.",
    "Protokol biosekuriti yang ketat dan respons isolasi kolam yang terstandarisasi efektif mencegah penyebaran patogen dan menekan kerugian finansial tambak.",
  ],
  faqs: [
    {
      question: "Apa saja tanda-tanda awal timbulnya penyakit pada udang vaname?",
      answer:
        "Waspadai penurunan nafsu makan mendadak di anco, udang berenang menggantung di permukaan air atau berkerumun di tepi tanggul, hepatopankreas mengecil atau pucat, usus kosong atau putus-putus, cangkang lembek (soft shell), kram otot, perubahan warna tubuh kemerahan, peningkatan mortalitas harian di saringan pembuangan, serta fluktuasi drastis kualitas air. Sinyal-sinyal ini mungkin belum memastikan jenis patogen spesifik, namun menjadi pemicu mutlak untuk segera melakukan audit kondisi kolam dan konfirmasi uji laboratorium diagnostik.",
    },
    {
      question: "Bagaimana petambak dapat mencegah penyebaran wabah penyakit antar-kolam?",
      answer:
        "Pencegahan efektif menggabungkan biosekuriti ketat: gunakan benur bebas patogen spesifik (SPF) bersertifikat PCR, pasang saringan air halus (filter mesh) serta jaring penghalau burung dan kepiting, batasi dan sterilkan peralatan kerja (jala, serok, ember) khusus per petak kolam, hentikan sirkulasi atau pembuangan air ke kolam lain saat muncul gejala klinis, pantau tren kualitas air dan pakan secara ketat, serta lakukan isolasi kolam secara cepat.",
    },
    {
      question: "Apa langkah tanggap darurat pertama saat kolam terindikasi terinfeksi patogen berbahaya?",
      answer:
        "Segera turunkan atau hentikan alokasi pakan untuk mencegah pembusukan bahan organik di dasar kolam, maksimalkan operasional kincir aerasi guna mempertahankan oksigen terlarut (DO) di atas 5 mg/L, kunci pintu air (quarantine water) agar air terinfeksi tidak menyebar ke saluran umum atau petak lain, lakukan sterilisasi peralatan kerja dan alas kaki petugas, ambil sampel udang untuk uji laboratorium PCR, dan konsultasikan dengan tenaga ahli akuakultur sebelum memutuskan tindakan penanganan atau opsi panen darurat.",
    },
  ],
  sections: [
    {
      heading: "Parameter yang wajib masuk dalam sistem peringatan dini penyakit udang",
      body: [
        "Sistem peringatan penyakit tidak boleh menunggu hingga terjadinya peristiwa kematian massal yang dahsyat. Pada budidaya udang vaname (Litopenaeus vannamei), ancaman patogen hampir selalu diawali oleh serangkaian anomali halus: pakan di anco mulai tersisa, udang berenang lesu di permukaan atau menyusuri pematang kolam, warna tubuh memucat atau memerah, hepatopankreas mengecil dan pudar, cangkang lembek, serta munculnya udang mati di saringan central drain.",
        "Panduan manajemen risiko penyakit dari WorldFish menegaskan pentingnya deteksi dini yang presisi, tata kelola lingkungan tambak, dan langkah pencegahan terpadu. Publikasi FAO mengenai budidaya vaname juga menggarisbawahi identifikasi tanda-tanda klinis serta mitigasi risiko terhadap ancaman patogen utama seperti Vibrio (AHPND), virus bercak putih (WSSV), mikrosporidia EHP, dan infectious myonecrosis virus (IMNV). Mengintegrasikan observasi harian ini ke dalam [Software Peringatan Penyakit](/id/features/disease-alerts) membantu petambak bertindak beberapa hari lebih cepat sebelum dampak infeksi meluas.",
      ],
    },
    {
      heading: "Matriks tanda peringatan patogen utama: Vibrio, AHPND, WSSV, dan EHP",
      body: [
        "Setiap patogen akuakultur memiliki karakteristik gejala klinis dan pola dampak yang khas. Memahami indikasi spesifik ini mempermudah tim lapangan membedakan apakah anomali yang terjadi sekadar stres kualitas air biasa atau merupakan ancaman wabah infeksius serius:",
      ],
      table: {
        columns: ["Patogen / Penyakit", "Tanda Peringatan Awal", "Pola Nafsu Makan & Mortalitas", "Tindakan Cepat Lapangan"],
        rows: [
          [
            "AHPND / EMS (Vibrio parahaemolyticus)",
            "Hepatopankreas pucat/mengecil/mengkerut, usus kosong, cangkang lembek, umumnya menyerang udang muda pada DOC < 35",
            "Nafsu makan anjlok drastis dalam 24–48 jam; mortalitas melonjak tajam dan masif di dasar kolam",
            "Hentikan pakan segera, maksimalkan aerasi kincir, isolasi kolam total, kunci saluran air, lakukan uji PCR dan plating TCBS",
          ],
          [
            "WSSV (White Spot Syndrome Virus)",
            "Bintik putih diameter 0,5–2 mm pada karapas, tubuh kemerahan, udang berenang lesu tanpa arah di dekat permukaan tanggul",
            "Mortalitas mendadak dalam skala besar, sering mencapai 80–100% populasi dalam waktu beberapa hari",
            "Isolasi ketat, pasang jaring penghalau burung (bird netting), dilarang membuang air hidup ke saluran umum, pertimbangkan panen darurat jika ukuran ekonomis",
          ],
          [
            "EHP (Enterocytozoon hepatopenaei)",
            "Keseragaman ukuran sangat timpang (disparitas tinggi), pertumbuhan terhambat (stunting), kotoran putih mengapung di permukaan",
            "Mortalitas langsung tergolong rendah, namun laju pertumbuhan harian (ADG) stagnan dan angka FCR membengkak parah",
            "Koreksi feeding rate berbasis biomassa riil, intensifkan pembuangan lumpur via central drain, desinfeksi alat, cegah kontaminasi air",
          ],
          [
            "IMNV / Myo (Infectious Myonecrosis)",
            "Otot segmen ekor memutih keruh seperti daging matang (opaque), kerap terpicu oleh stres goncangan salinitas, suhu mendadak, atau anoksia",
            "Mortalitas berlanjut bertahap setiap hari setelah kejadian pemicu stres lingkungan",
            "Pertahankan DO > 5 mg/L, hindari tindakan yang memicu stres udang, kurangi alokasi pakan, aplikasikan vitamin C dan imunostimulan",
          ],
          [
            "Vibriosis Sistemik (Vibrio spp.)",
            "Udang berpendar kehijauan di malam hari (luminescent), insang kecokelatan, bintik hitam melanisasi pada kutikula, hepatopankreas bengkak lalu mengkerut",
            "Mortalitas merayap di dasar kolam secara konsisten, respons anco melemah",
            "Aplikasi probiotik Bacillus kompetitif, optimalkan sirkulasi oksigen, buang endapan organik dasar kolam secara berkala",
          ],
        ],
      },
    },
    {
      heading: "Mengapa peringatan penyakit membutuhkan konteks operasional tambak",
      body: [
        "Angka kematian atau sisa pakan tidak dapat diartikan secara akurat tanpa melihat konteks lingkungan kolam. Temuan udang mati di kolam dengan DOC muda memiliki signifikansi ancaman yang jauh lebih gawat dibandingkan beberapa ekor udang mati di kolam berbiomassa padat menjelang panen akhir.",
        "Sinyal peringatan penyakit wajib dihubungkan langsung dengan identitas kolam, DOC, pergerakan tren kualitas air harian (seperti penurunan DO fajar, fluktuasi pH sore, atau lonjakan nitrit sebagaimana diulas di [Parameter Kualitas Air Udang](/id/resources/vannamei-water-quality-parameters)), respons anco terkini, serta catatan historis sampling pertumbuhan di [Software Sampling Pertumbuhan Udang](/id/features/growth-sampling). Tanpa konteks terpadu, tim operasional rentan bereaksi berlebihan (overreact) terhadap peristiwa normal seperti siklus molting massal, atau sebaliknya meremehkan (underreact) tanda awal infeksi patogen berbahaya.",
        "Peringatan digital bertindak sebagai pemicu evaluasi bukti lapangan secara cepat oleh tim teknis dan dokter hewan tambak, bukan untuk menggantikan pengujian laboratorium mikrobiologis atau uji molekuler PCR yang definitif.",
      ],
    },
    {
      heading: "Biosekuriti darurat adalah bagian tak terpisahkan dari sistem peringatan",
      body: [
        "Peringatan dini tidak bermakna tanpa rencana aksi lapangan yang cepat dan terukur. Ketika suatu petak kolam menunjukkan gejala mencurigakan, SOP biosekuriti darurat harus segera dijalankan untuk mengunci sumber patogen agar tidak mengontaminasi petak lain di kawasan tambak:",
      ],
      items: [
        "Isolasi total peralatan kerja: Larang keras pemindahan jala sampling, nampan anco, serok, ember pakan, dan selang aerasi dari kolam bermasalah ke petak kolam lainnya. Sediakan wadah perendaman desinfektan klorin atau kalium permanganat khusus untuk sterilisasi peralatan dan alas kaki petugas di pintu masuk kolam.",
        "Karantina saluran air (Water Quarantine): Kunci pintu inlet dan outlet air kolam tersebut. Hentikan sirkulasi atau pembuangan air ke saluran bersama sebelum dilakukan perlakuan sterilisasi guna mencegah penularan patogen ke kolam tetangga maupun ekosistem perairan umum.",
        "Pengendalian ransum pakan: Kurangi alokasi pakan harian minimal 30% hingga 50%, atau puasakan kolam sementara waktu apabila anco menunjukkan sisa pakan berlebih. Hal ini krusial untuk mencegah pembusukan pakan di dasar kolam yang memperparah kualitas air dan memicu ledakan bakteri patogen.",
        "Maksimalkan aerasi kincir: Operasikan kincir tambahan untuk mempertahankan kadar oksigen terlarut (DO) di atas 5 mg/L sepanjang hari. Pasokan oksigen optimal sangat dibutuhkan udang yang sedang mengalami stres fisiologis untuk melawan infeksi patogen.",
        "Eskalasi diagnostik laboratorium: Ambil sampel udang hidup bergejala dan sampel air kolam secara aseptik, kemudian segera kirim ke laboratorium patologi akuakultur untuk uji konfirmasi PCR dan penghitungan koloni Vibrio (TCBS agar).",
        "Penentuan skenario panen darurat: Jika hasil laboratorium mengonfirmasi infeksi virus ganas (seperti WSSV) dan udang telah mencapai ukuran yang memiliki nilai jual, segera rencanakan panen darurat terisolasi dengan mendesinfeksi air kolam sebelum dibuang.",
      ],
    },
  ],
  checklist: [
    "Pantau nafsu makan anco, mortalitas di central drain, perilaku berenang, dan kestabilan air pada setiap petak kolam setiap hari.",
    "Tetapkan ambang batas peringatan dini (thresholds) dan SOP eskalasi darurat bersama tim teknis sebelum siklus tebar dimulai.",
    "Terapkan protokol isolasi alat, karantina air, dan desinfeksi alas kaki seketika saat sinyal peringatan bahaya muncul.",
    "Dokumentasikan seluruh tindakan intervensi dan riwayat perlakuan secara digital untuk evaluasi dan pencegahan pada siklus berikutnya.",
  ],
  sources: [
    {
      title: "Reducing Disease Risks in Fish Through Better Detection, Management and Prevention",
      publisher: "WorldFish",
      url: "https://www.worldfishcenter.org/publication/reducing-disease-risks-fish-through-better-detection-management-and-prevention",
    },
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
  ],
};
