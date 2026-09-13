import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-mortality-tracking",
  section: "Air, Kesehatan, dan Risiko",
  label: "Risiko Penyakit",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "Pelacakan Mortalitas Udang: Melindungi Akurasi Biomassa, FCR Riil, dan Perencanaan Panen",
  description:
    "Mengapa udang mati di kolam? Pelajari bagaimana pencatatan mortalitas harian membantu petambak menginvestigasi kematian mendadak, melindungi estimasi biomassa, menjaga akurasi FCR riil, dan memicu respons cepat terhadap risiko penyakit.",
  readTime: "7 menit baca",
  tags: [
    "mortalitas udang",
    "udang mati di kolam",
    "kematian mendadak udang",
    "kelangsungan hidup udang",
    "survival rate",
    "risiko penyakit udang",
    "biomassa udang",
    "AHPND",
    "FCR riil",
    "bangkai udang dasar kolam",
    "evaluasi anco",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-mortality-tracking-survival-biomass.jpg",
    alt: "Infografis pelacakan mortalitas udang untuk mencatat kematian kolam, tingkat kelangsungan hidup (SR), estimasi biomassa, risiko pembengkakan FCR, respons penyakit, dan perencanaan panen",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Sistem Peringatan Dini & Penyakit", href: "/id/features/disease-alerts" },
  takeaways: [
    "Mortalitas yang tidak tercatat mendistorsi estimasi populasi aktif, menyebabkan overfeeding kronis, pembengkakan FCR riil, dan target panen yang meleset.",
    "Tren grafik kematian harian dan akumulasinya jauh lebih bernilai diagnostik daripada angka total sesaat di akhir siklus.",
    "Temuan bangkai udang di dasar kolam (central drain/sipon) atau anco harus segera dikorelasikan dengan dinamika kualitas air, respons nafsu makan, dan protokol biosekuriti.",
  ],
  faqs: [
    {
      question: "Mengapa udang mati di kolam tambak saya secara tiba-tiba?",
      answer:
        "Mortalitas udang vaname di kolam dapat dipicu oleh penurunan drastis kualitas air (hipoksia akibat DO fajar < 3,0 mg/L, lonjakan amonia bebas/TAN, nitrit beracun, fluktuasi pH ekstrem, atau gas hidrogen sulfida H2S di dasar lumpur), infeksi patogen akut (seperti toksin AHPND/EMS pada DOC muda, virus bintik putih WSSV, atau bakteremia Vibrio), stres osmotik pascahujan lebat, serta kegagalan molting (moult death syndrome). Dokumentasikan waktu penemuan, titik kolam, kondisi fisik bangkai, respons anco, dan riwayat kualitas air sebelum mengambil tindakan korektif.",
    },
    {
      question: "Bagaimana mortalitas udang memengaruhi FCR dan perencanaan panen?",
      answer:
        "Setiap ekor udang yang mati telah mengonsumsi pakan namun tidak lagi menghasilkan tonase daging saat panen. Jika kematian ini tidak dicatat dan populasi aktif tidak dikoreksi, teknisi akan terus menakar pakan berdasarkan biomassa semu yang terlalu tinggi (overfeeding), mencemari dasar kolam, dan membuat kalkulasi FCR riil membengkak. Selain itu, proyeksi tonase panen dan kalkulasi margin keuntungan finansial akan meleset jauh dari estimasi awal.",
    },
    {
      question: "Apa perbedaan antara kematian udang di anco vs kematian udang di dasar kolam (central drain)?",
      answer:
        "Bangkai udang yang ditemukan di anco (feeding tray) biasanya menandakan udang yang masih sempat mendekati area pakan sebelum mati, sering kali berkaitan dengan kelemahan fisik pascamolting atau kompetisi makan. Sebaliknya, bangkai udang yang tersedot di saringan central drain atau terangkat saat penyiponan lumpur mencerminkan kematian massal di dasar kolam akibat anoksia pada lapisan sedimen anaerobik atau serangan penyakit hepatopankreas akut (AHPND). Banyak kematian dasar kolam tidak terlihat di permukaan air sampai akumulasinya masif.",
    },
    {
      question: "Bagaimana cara memperbarui estimasi populasi aktif setelah terjadi mortalitas?",
      answer:
        "Gunakan formula penyesuaian populasi aktif: Populasi Aktif = (Populasi Tebar Awal − Akumulasi Mortalitas Tercatat − Estimasi Kematian Tersembunyi) − Total Ekor Panen Parsial. Setelah populasi dikalibrasi ulang, kalikan dengan rata-rata bobot tubuh (MBW) terkini dari sampling untuk mendapatkan estimasi biomassa aktif baru, kemudian sesuaikan alokasi pakan harian agar tidak membebani daya dukung kolam.",
    },
    {
      question: "Kapan petambak harus memutuskan melakukan panen darurat (emergency harvest) akibat mortalitas?",
      answer:
        "Panen darurat umumnya dipertimbangkan ketika laju kematian harian meningkat tajam secara eksponensial (misalnya > 2–3% populasi per hari), nafsu makan di anco anjlok drastis (< 50% pakan termakan), terkonfirmasi infeksi patogen ganas menular melalui uji laboratorium PCR (seperti WSSV atau AHPND lanjut), dan stabilitas kualitas air tidak dapat dipulihkan oleh kapasitas aerasi tambak. Panen darurat bertujuan menyelamatkan nilai ekonomi biomassa tersisa sebelum populasi musnah total.",
    },
  ],
  sections: [
    {
      heading: "Mengapa catatan mortalitas bukan sekadar formalitas administrasi",
      body: [
        "Mortalitas udang secara langsung mengubah jumlah individu hidup (standing stock) di dalam petak kolam. Ketika angka kematian terlewat atau tidak dicatat oleh teknisi lapangan, tambak mengalami fenomena 'biomassa semu' (phantom biomass)—kondisi di mana sistem mengasumsikan kolam menampung jutaan ekor udang padahal ribuan ekor telah mati dan membusuk di dasar.",
        "Implikasi finansialnya langsung terasa pada rasio konversi pakan. Pakan terus ditebar dengan dosis tinggi untuk memberi makan udang yang sudah tidak ada, yang pada akhirnya memicu pemborosan pakan, mencemari sedimen dasar, dan membuat angka [FCR Tambak Udang](/id/resources/fcr-shrimp-farming) membengkak tanpa disadari.",
        "Di sisi lain, grafik angka kematian harian berfungsi sebagai sistem peringatan dini (early warning system). Kenaikan kematian dari 5 ekor per hari menjadi 20, 50, lalu 100 ekor per hari merupakan sinyal merah ancaman wabah penyakit yang jauh lebih informatif daripada sekadar melihat angka total tingkat kelangsungan hidup (SR) saat kolam dikeringkan di akhir panen.",
      ],
      note: "Prinsip Akurasi Biomassa: Setiap kematian yang terkonfirmasi harus segera memicu penyesuaian estimasi populasi aktif dan biomassa kolam melalui [Software Sampling Pertumbuhan Udang](/id/features/growth-sampling), sehingga jatah pakan harian dapat langsung diturunkan sebelum terjadi pencemaran dasar kolam.",
    },
    {
      heading: "Titik pantau mortalitas: Anco, central drain, tanggul, dan kanibalisme udang",
      body: [
        "Udang vaname (Litopenaeus vannamei) memiliki sifat bentik (hidup di dasar perairan) dan kanibal, terutama saat sesamanya mengalami molting (ganti kulit) atau melemah akibat sakit. Oleh karena itu, bangkai udang yang terlihat mengapung di permukaan air atau menepi di tanggul kolam hanyalah puncak gunung es dari kejadian mortalitas sesungguhnya di dasar perairan.",
        "Untuk mendeteksi kehilangan udang secara objektif, tim teknis tambak komersial wajib memantau empat titik observasi utama setiap hari:",
      ],
      items: [
        "Kontrol Anco (Feeding Tray): Amati keberadaan udang sekarat, cangkang lembek abnormal, usus kosong melompong, atau sisa bangkai yang mulai digerogoti udang lain saat pemeriksaan 1,5–2 jam pascapakan.",
        "Central Drain & Pembuangan Lumpur Sipon: Titik paling krusial di mana bangkai udang mati tenggelam dan tersapu arus kincir menuju central drain. Pencatatan jumlah ekor atau kilogram bangkai saat sipon pagi dan sore hari adalah indikator mortalitas paling representatif.",
        "Saringan Pintu Air & Pematang Kolam: Udang yang berenang pasif di permukaan atau menepi di tanggul kolam pada siang hari menandakan hipoksia (kadar DO rendah), stres osmotik, atau infeksi sistemik akut.",
        "Koreksi Kanibalisme: Udang sehat akan memangsa udang yang sakit atau baru molting dalam hitungan jam. Di tambak intensif dengan [kepadatan tebar tinggi](/id/resources/vannamei-stocking-density), setiap 1 ekor bangkai utuh yang ditemukan di sipon sering kali merepresentasikan 2 hingga 3 ekor udang lain yang telah habis terkanibalisasi tanpa meninggalkan jejak bangkai.",
      ],
    },
    {
      heading: "Matriks klasifikasi tingkat mortalitas dan tindakan cepat di lapangan",
      body: [
        "Guna memastikan respons yang terukur dan tidak terlambat, gunakan matriks klasifikasi mortalitas berikut sebagai acuan standar operasional prosedur (SOP) tim lapangan:",
      ],
      table: {
        columns: [
          "Kategori Mortalitas",
          "Ambang Batas Harian",
          "Indikasi Penyebab",
          "Dampak pada Biomassa & FCR",
          "SOP Respons Tindakan Cepat",
        ],
        rows: [
          [
            "Mortalitas Alami (Normal Baseline)",
            "< 0,05% – 0,1% populasi per hari (beberapa ekor per kolam saat sipon/anco)",
            "Gagal molting acak, kompetisi alami antar-individu, benur lemah pascatebar",
            "Dampak biomassa minimal, angka FCR tetap stabil dalam rentang normal",
            "Catat di log harian kolam, pertahankan feeding rate normal, pantau stabilitas kualitas air rutin",
          ],
          [
            "Mortalitas Waspada (Moderate/Chronic)",
            "0,1% – 0,5% populasi per hari selama 2–3 hari berturut-turut",
            "Stres DO fajar (< 3,5 mg/L), amonia atau nitrit meningkat, fluktuasi salinitas pascahujan, infeksi kronis Vibrio atau EHP",
            "Estimasi biomassa mulai bias, FCR berisiko membengkak jika jatah pakan harian tidak segera dikurangi",
            "Turunkan pakan 20–30%, maksimalkan aerasi kincir air, periksa [parameter kualitas air kolam](/id/resources/vannamei-water-quality-parameters), dan tingkatkan frekuensi penyiponan lumpur dasar",
          ],
          [
            "Mortalitas Kritis / Massal (Acute Outbreak)",
            "> 0,5% – 2%+ populasi per hari secara mendadak atau eksponensial",
            "Infeksi virus ganas (WSSV / White Spot), toksin bakteri AHPND/EMS, anoksia total dasar kolam, keracunan gas H2S",
            "Penurunan drastis biomassa riil, pakan membusuk total di dasar kolam jika tidak segera dihentikan",
            "Hentikan pemberian pakan total (stop feeding), isolasi petak kolam, aktifkan [sistem peringatan dini penyakit](/id/features/disease-alerts), kirim sampel uji PCR lab, dan siapkan evaluasi panen darurat",
          ],
        ],
      },
    },
    {
      heading: "Cara mencatat data mortalitas secara presisi dan bermakna",
      body: [
        "Mencatat angka kematian saja tidak cukup; yang paling bernilai bagi manajer tambak adalah korelasi antara kematian tersebut dengan variabel lingkungan air, nafsu makan udang, dan riwayat tindakan kolam sebelumnya.",
        "Setiap kali ditemukan udang mati atau sekarat, dokumentasikan informasi berikut ke dalam [pencatatan tambak udang terpadu](/id/resources/shrimp-farm-record-keeping): tanggal dan umur budidaya (DOC), nomor petak kolam, jumlah fisik terhitung (ekor) atau estimasi bobot (kg), serta status data (apakah hitungan pasti dari sipon/saringan atau estimasi lapangan).",
        "Dokumentasikan pula kondisi fisik patologis udang: kenampakan hepatopankreas (pucat, mengecil, atau kehitaman), kepenuhan saluran pencernaan/usus (kosong atau terisi penuh), kekerasan cangkang, kondisi insang (bersih, kecokelatan, atau hitam), serta hasil pengukuran kualitas air (DO fajar, pH pagi vs sore, amonia, nitrit, dan suhu) pada hari yang sama.",
      ],
    },
    {
      heading: "Menggunakan data mortalitas untuk merevisi estimasi populasi, pakan, dan panen",
      body: [
        "Setelah pola mortalitas teridentifikasi, langkah operasional terpenting adalah mengalibrasi ulang estimasi standing stock kolam. Perbarui populasi aktif dengan formula: Populasi Aktif = (Populasi Tebar Awal − Akumulasi Mortalitas Terkonfirmasi − Koreksi Kanibalisme Tersembunyi) − Total Ekor Panen Parsial.",
        "Dengan populasi aktif yang baru dan data bobot rata-rata (MBW) dari sampling mingguan, hitung ulang standing biomass: Biomassa Aktif (kg) = (Populasi Aktif × MBW Terkini (gram)) / 1.000. Berdasarkan biomassa riil ini, hitung ulang alokasi ransum harian menggunakan acuan [Tabel & Kalkulator Feeding Rate Vannamei](/id/resources/vannamei-feeding-rate) untuk menghentikan pemborosan pakan.",
        "Revisi ini juga memungkinkan manajer tambak memperbarui proyeksi tonase panen, jadwal panen parsial, dan analisis margin laba siklus sesuai [panduan perencanaan siklus tambak udang](/id/resources/shrimp-cycle-planning), sehingga keputusan bisnis tetap berpijak pada data biologis yang nyata.",
      ],
    },
    {
      heading: "Protokol biosekuriti dan eskalasi penyakit saat mortalitas meningkat",
      body: [
        "Peningkatan mortalitas harus langsung memicu pengaktifan protokol biosekuriti tambak guna mencegah penularan patogen ke petak kolam lainnya. Jangan pernah membuang bangkai udang mati ke saluran pembuangan umum atau saluran pasok air karena hal ini merupakan vektor penyebaran penyakit tercepat antar-kolam.",
        "Bangkai udang yang diangkat dari sipon atau anco wajib dikumpulkan dalam wadah tertutup kedap air, kemudian didesinfeksi dengan larutan klorin pekat atau dibakar dan dikubur di area khusus yang jauh dari fasilitas budidaya. Sterilkan seluruh peralatan jala sampling, anco, ember, dan sepatu bot teknisi menggunakan wadah celup (foot bath & dip net) berisi disinfektan sebelum dipindahkan ke kolam lain.",
        "Ambil sampel udang yang menunjukkan gejala klinis abnormal dalam kondisi hidup atau diawetkan dalam botol berisi etanol 95%, lalu segera kirimkan ke laboratorium patologi akuakultur untuk uji diagnostik molekuler (PCR). Hindari penggunaan bahan kimia atau antibiotik sembarangan tanpa hasil diagnosis laboratorium yang valid, demi menjaga keamanan pangan dan kelayakan ekspor hasil panen.",
      ],
    },
  ],
  checklist: [
    "Catat angka kematian udang setiap hari per petak kolam, baik dari saringan central drain, sipon, maupun pengamatan anco.",
    "Pisahkan secara tegas antara data hitungan fisik pasti (confirmed count) dan estimasi kehilangan populasi (estimated loss).",
    "Perbarui kalkulasi populasi aktif dan estimasi standing biomass segera setelah pola mortalitas terkonfirmasi.",
    "Turunkan jatah pakan harian secara proporsional sesuai biomassa baru untuk mencegah overfeeding dan pembengkakan FCR.",
    "Korelasikan grafik tren mortalitas dengan fluktuasi DO fajar, pH pagi-sore, nafsu makan di anco, dan riwayat perlakuan kolam.",
    "Kumpulkan bangkai udang dalam wadah tertutup untuk didesinfeksi atau dikubur, dan jangan pernah membuangnya ke saluran air umum.",
    "Eskalasi mortalitas abnormal melalui pengujian laboratorium diagnostik (PCR) dan penerapan protokol biosekuriti ketat.",
  ],
  sources: [
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Reducing Disease Risks in Fish Through Better Detection, Management and Prevention",
      publisher: "WorldFish",
      url: "https://www.worldfishcenter.org/publication/reducing-disease-risks-fish-through-better-detection-management-and-prevention",
    },
    {
      title: "Management for Freshwater Fish Culture: Record Keeping",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/FAO_Training/FAO_Training/General/x6709e/x6709e16.htm",
    },
  ],
};
