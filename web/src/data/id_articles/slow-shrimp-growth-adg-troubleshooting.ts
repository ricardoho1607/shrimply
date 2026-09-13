import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "slow-shrimp-growth-adg-troubleshooting",
  section: "Pertumbuhan dan Sampling",
  label: "Pertumbuhan dan Sampling",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "Udang Tumbuh Lambat: Panduan Troubleshooting ADG Rendah pada Tambak Vaname",
  description:
    "Mengapa pertumbuhan udang lambat? Gunakan evaluasi MBW, ADG, respons anco, tren kualitas air, validasi kelangsungan hidup (SR), dan pengamatan kesehatan untuk menemukan penyebabnya sebelum target panen meleset.",
  readTime: "8 menit baca",
  tags: [
    "udang tumbuh lambat",
    "troubleshooting ADG",
    "pertambahan bobot harian",
    "MBW udang",
    "biomassa tambak",
    "kelangsungan hidup udang",
    "pertumbuhan vannamei",
    "disparitas ukuran udang",
    "sampling pertumbuhan",
    "evaluasi anco",
    "EHP udang",
  ],
  publishedAt: "2026-07-10",
  image: {
    src: "/resources/images/slow-shrimp-growth-adg-troubleshooting-vannamei.png",
    alt: "Infografis Shrimply untuk troubleshooting udang vaname tumbuh lambat menggunakan validasi sampling, biomassa dan kelangsungan hidup (SR), respons anco pakan, tren kualitas air, serta pemeriksaan kesehatan",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Software Sampling Pertumbuhan Udang", href: "/id/features/growth-sampling" },
  takeaways: [
    "Pertumbuhan lambat adalah pola anomali kolam yang harus diinvestigasi secara komprehensif, bukan diagnosis penyakit yang berdiri sendiri.",
    "Konfirmasi akurasi teknik sampling, estimasi biomassa, dan kelangsungan hidup (SR) sebelum mengubah pakan, memberikan perlakuan kimiawi, atau merevisi rencana panen.",
    "Evaluasi tambak yang efektif menghubungkan tren MBW dan ADG dengan respons anco pakan, tren kualitas air, SR riil, daya dukung kolam (carrying capacity), dan pengamatan kesehatan udang.",
  ],
  faqs: [
    {
      question: "Mengapa udang vaname di tambak saya tumbuh lambat?",
      answer:
        "Pertumbuhan udang yang lambat umumnya berkaitan dengan metode sampling yang bias atau tidak konsisten, kesalahan estimasi biomassa atau tingkat kelangsungan hidup (SR), distribusi pakan yang tidak merata di dasar kolam, penurunan nafsu makan akibat stres kualitas air (seperti DO rendah atau amonia tinggi), padat tebar yang melampaui carrying capacity, fluktuasi cuaca, serta infeksi patogen kronis seperti mikrosporidia EHP (Enterocytozoon hepatopenaei). Selalu evaluasi seluruh parameter ekosistem kolam secara menyeluruh sebelum menyimpulkan satu penyebab tunggal.",
    },
    {
      question: "Bagaimana cara menghitung ADG (pertambahan bobot harian) pada tambak udang?",
      answer:
        "ADG (Average Daily Gain) dihitung dari perubahan bobot rata-rata udang (MBW) dibagi jumlah hari antar-dua sampling yang representatif: ADG = (MBW sampling terkini − MBW sampling sebelumnya) / interval hari antar-sampling. Jika kolam baru memiliki satu catatan sampling awal, Anda dapat memperkirakannya dengan rumus: (MBW terkini − bobot awal benur) / hari budidaya (DOC), namun perlu dicatat bahwa estimasi satu titik ini memiliki tingkat keakuratan yang lebih rendah.",
    },
    {
      question: "Apa artinya jika pakan di anco selalu bersih habis tetapi MBW udang tetap stagnan?",
      answer:
        "Anco yang bersih hanya membuktikan bahwa pakan di titik anco tersebut habis terkonsumsi atau terbawa arus, bukan bukti bahwa jatah pakan harian sudah cukup atau estimasi biomassa sudah akurat. Jika anco selalu habis namun MBW tidak bertambah, periksa kemungkinan populasi riil udang (SR) jauh lebih tinggi dari perkiraan sehingga terjadi underfeeding per individu, distribusi pakan tidak merata, posisi anco kurang representatif, atau udang mengalami gangguan penyerapan nutrisi akibat infeksi EHP. Jangan langsung menaikkan pakan sebelum memeriksa usus, disparitas ukuran, kualitas air, dan kesehatan udang.",
    },
  ],
  sections: [
    {
      heading: "Pertumbuhan lambat adalah sinyal peringatan—bertindak sebelum pakan terbuang sia-sia",
      body: [
        "Pertumbuhan lambat bukanlah satu masalah tunggal dengan satu obat instan. Ini adalah sinyal peringatan bahwa ekosistem kolam tidak mampu mengonversi pakan, kondisi lingkungan air, dan potensi genetik benur menjadi pertambahan bobot daging yang diharapkan. Perlakukan kondisi ini sebagai pola anomali operasional ketika kurva MBW (Mean Body Weight) atau nilai ADG (Average Daily Gain) berulang kali meleset dari target rencana budidaya (crop plan), variasi ukuran udang melebar tajam, atau akumulasi pakan terus naik tanpa diimbangi pertambahan biomassa yang sepadan.",
        "Jangan langsung menaikkan pakan secara tergesa-gesa. Langkah pertama adalah mengonfirmasi validitas data lapangan, lalu mengidentifikasi faktor pembatas pertumbuhan yang sesungguhnya. Tidak ada target ADG tunggal yang berlaku untuk semua tambak vaname: [padat tebar](/id/resources/vannamei-stocking-density), sistem konstruksi kolam, musim dan cuaca, salinitas, mutu pakan, kapasitas aerasi kincir, tekanan penyakit, serta target ukuran panen akhir sangat memengaruhi laju pertumbuhan yang realistis.",
      ],
    },
    {
      heading: "Langkah 1: Pastikan bahwa pertumbuhan memang benar-benar lambat",
      body: [
        "Hitung pertambahan bobot harian udang dengan formula: ADG = (MBW sampling terkini − MBW sampling sebelumnya) / interval hari antar-sampling. Bandingkan minimal dua hingga tiga data sampling berkala yang konsisten dan catat parameter penting secara terperinci: DOC, jumlah sampel udang yang ditimbang, titik sebar jala sampling, nilai MBW, disparitas ukuran (size variation), total pakan harian, angka kematian, serta tren parameter kualitas air sepekan terakhir.",
        "Satu hasil sampling yang rendah belum tentu mencerminkan penurunan pertumbuhan nyata; bisa saja terjadi bias sampling akibat titik lempar jala yang kurang representatif atau waktu sampling yang berbeda. Namun, jika nilai MBW dan ADG tetap stagnan atau melemah pada beberapa sampling berurutan dengan metode yang sama, tangani kondisi tersebut sebagai masalah performa kolam yang nyata. Jika satu data sampling meragukan atau hilang, tandai data tersebut sebagai tidak pasti (uncertain) dan jadwalkan sampling ulang sebelum mengambil keputusan besar terkait pakan atau panen.",
      ],
    },
    {
      heading: "Langkah 2: Membaca kondisi anco bersih secara objektif",
      body: [
        "Anco yang bersih hanya membuktikan bahwa pakan di atas anco tersebut telah habis. Kondisi ini tidak membuktikan bahwa seluruh populasi udang di kolam tumbuh optimal, bahwa ransum harian sudah tepat, atau bahwa kolam memerlukan tambahan pakan. Jika anco pakan konsisten bersih tandas namun MBW udang tetap mendatar, periksa terlebih dahulu apakah tingkat kelangsungan hidup (SR) dan biomassa riil kolam sebenarnya jauh lebih tinggi dari estimasi teknisi. Kesalahan meremehkan populasi udang dapat menyebabkan kolam mengalami kekurangan pakan (underfeeding) per unit biomassa, sehingga anco cepat bersih karena udang kelaparan, tetapi pertumbuhan individu terhambat.",
        "Setelah itu, evaluasi distribusi pakan di sekeliling kolam, posisi penempatan anco, kepenuhan dan kondisi saluran pencernaan (usus) udang, disparitas ukuran, tren kualitas air, angka mortalitas harian, serta indikasi gejala penyakit. Sebaliknya, jika anco menyisakan pakan, nafsu makan melemah, atau udang pasif di dasar kolam, jangan pernah menaikkan pakan. Tahan atau kurangi jatah pakan secara bertahap sesuai SOP tambak sambil memeriksa [stabilitas kualitas air](/id/resources/vannamei-water-quality-parameters) dan kondisi kesehatan udang.",
      ],
    },
    {
      heading: "Langkah 3: Perbaiki stabilitas kualitas air sebelum memacu pakan",
      body: [
        "Stres kualitas air dapat melumpuhkan nafsu makan dan menghambat laju metabolisme udang jauh sebelum krisis kematian massal terlihat di permukaan. Tinjau tren historis beberapa hari terakhir untuk parameter oksigen terlarut (DO), pH pagi dan sore, suhu air, salinitas, amonia total (TAN), serta nitrit—jangan hanya mengandalkan satu kali angka pengukuran sesaat. Jika oksigen terlarut dini hari menurun (< 4,0 mg/L) atau nafsu makan anjlok, segera periksa kondisi kincir air, cek endapan kotoran di area mati (dead zones), akumulasi bahan organik dasar, [perubahan warna alga](/id/resources/shrimp-pond-water-colour-algae), serta riwayat kenaikan pakan sebelumnya. Jangan menaikkan pakan sampai nafsu makan udang dan kestabilan kualitas air benar-benar pulih.",
        "Jika konsentrasi amonia atau nitrit terdeteksi meningkat, hentikan peningkatan ransum pakan, minimalkan pemborosan pakan yang tidak termakan untuk menjaga [efisiensi FCR](/id/resources/fcr-shrimp-farming), dan periksa kebersihan dasar kolam melalui pengurasan lumpur pipa tengah (central drain), maksimalkan aerasi, serta terapkan prosedur pengelolaan air tambak yang berlaku. Memperbaiki ekosistem lingkungan kolam sering kali jauh lebih mendesak dan efektif dibandingkan sekadar mengubah angka di tabel pakan.",
      ],
    },
    {
      heading: "Langkah 4: Hitung ulang tingkat kelangsungan hidup (SR) dan estimasi biomassa",
      body: [
        "Keputusan penyesuaian pakan wajib didasarkan pada biomassa riil yang ada di kolam, bukan hanya mengacu pada target tebar awal benur. Evaluasi angka mortalitas harian, hasil tebaran jala sampling, jumlah sampel udang per lemparan, serta kondisi fisik udang. Jika tingkat kelangsungan hidup (SR) di lapangan diremehkan (underestimated), kolam menampung lebih banyak ekor udang yang saling bersaing memperebutkan jatah pakan yang terlalu sedikit. Sebaliknya, jika ada kematian tersembunyi yang luput dari pengamatan, tambak justru mengalami overfeeding berat karena memberi pakan untuk biomassa yang sudah tidak ada.",
        "Perbarui estimasi total populasi dan biomassa kolam sebelum menetapkan rencana pakan berikutnya melalui [fitur sampling pertumbuhan](/id/features/growth-sampling). Ketika biomassa terhitung lebih rendah atau lebih tinggi dari perkiraan, jangan mengubah jatah pakan secara drastis tanpa konfirmasi: pastikan terlebih dahulu berapa perkiraan sisa ekor udang di kolam, apakah udang aktif makan, dan apakah kapasitas lingkungan kolam masih memadai untuk mendukung pemacuan pertumbuhan.",
      ],
    },
    {
      heading: "Langkah 5: Identifikasi risiko penyakit dan infeksi patogen secara objektif",
      body: [
        "Pertumbuhan lambat yang berkepanjangan, disparitas ukuran yang tajam (size shooting), lonjakan FCR, usus pucat atau kosong di jam pakan, cangkang lembek pascamolting, munculnya kotoran putih (white feces), atau mortalitas kronis di dasar kolam dapat mengindikasikan masalah kesehatan serius di samping stres pakan dan lingkungan. Namun, pertumbuhan lambat saja tidak cukup untuk langsung mendiagnosis infeksi mikrosporidia EHP (Enterocytozoon hepatopenaei), sindrom kotoran putih (WFD), infeksi bakteri Vibrio sistemik, atau penyakit lainnya tanpa bukti pendukung.",
        "Catat pola kejadian berdasarkan petak kolam dan DOC, kendalikan pergerakan jala sampling, anco, sepatu bot, peralatan kerja, air buangan, lumpur sedimen, dan lalu lintas teknisi antara kolam yang dicurigai dan kolam sehat, serta segera konsultasikan dengan laboratorium patologi akuakultur untuk pengujian PCR atau analisis mikroskopis. Jangan menggunakan antibiotik atau bahan kimia sembarangan tanpa bukti diagnostik yang jelas—pengobatan tidak dapat menggantikan bukti uji klinis, kestabilan kualitas air, maupun penerapan protokol biosekuriti yang disiplin.",
      ],
    },
    {
      heading: "Rencana aksi 48 jam yang praktis di lapangan",
      body: [
        "Hari Pertama (Hari Ini): Validasi ulang angka MBW, perhitungan ADG, metode sampling jala, dan jumlah sampel udang yang ditimbang; lakukan pemeriksaan fisik anco 2 jam pascapakan, amati perilaku berenang udang, cek sisa mortalitas di dasar kolam, dan audit ketersediaan aerasi kincir; catat seluruh parameter kualitas air serta kondisi cuaca; dan tahan jatah pakan (jangan menaikkan pakan) hingga seluruh tinjauan kolam selesai dilakukan.",
        "Hari Kedua (Besok): Bandingkan catatan 3 hingga 5 sampling terakhir, tren parameter kualitas air, respons anco pakan, log pakan harian, dan mortalitas; identifikasi satu masalah operasional yang paling dominan; lalu lakukan tindakan koreksi secara bertahap sambil mendokumentasikan setiap tindakan. Pada jadwal sampling berikutnya, hitung ulang MBW, ADG, SR, biomassa, dan FCR. Jika laju pertumbuhan tetap jalan di tempat atau gejala penyakit bertambah, segera tingkatkan pengujian laboratorium diagnostik daripada mengulang tindakan coba-coba tanpa bukti.",
      ],
    },
    {
      heading: "Konfirmasi pemulihan pertumbuhan melalui catatan data yang terverifikasi",
      body: [
        "Kondisi kolam belum dapat dikatakan pulih hanya karena anco pakan tampak bersih atau air kolam terlihat lebih segar selama satu hari. Konfirmasi pemulihan pertumbuhan yang sesungguhnya harus dibuktikan lewat pulihnya nafsu makan yang konsisten, tren kualitas air yang stabil dan aman, catatan mortalitas harian yang kembali ke batas wajar, serta peningkatan nilai MBW dan ADG yang nyata pada jadwal sampling komparatif berikutnya.",
        "Shrimply membantu tim teknis dan manajemen tambak menghubungkan data sampling pertumbuhan, log pemberian pakan harian, tren parameter kualitas air, catatan mortalitas, laporan gejala penyakit, dan kalkulasi rencana panen ke dalam satu [kartu performa kolam](/id/resources/pond-performance) terpadu—sehingga manajemen dapat memverifikasi secara langsung apakah tindakan korektif yang diambil benar-benar berhasil mengembalikan laju pertumbuhan udang.",
      ],
    },
  ],
  checklist: [
    "Konfirmasi nilai MBW, jumlah sampel ekor, metode penjalaan, dan interval hari antar-sampling sebelum mengambil tindakan berdasarkan angka ADG.",
    "Validasi tingkat kelangsungan hidup (SR) dan estimasi biomassa sebelum menaikkan jatah pakan saat anco bersih namun MBW stagnan.",
    "Evaluasi distribusi penebaran pakan, posisi penempatan anco, kepenuhan usus udang, tren kualitas air, mortalitas harian, dan disparitas ukuran secara terpadu.",
    "Jangan menaikkan pakan saat nafsu makan udang melemah atau parameter kualitas air sedang mengalami fluktuasi labil.",
    "Perbaiki masalah operasional yang paling jelas secara bertahap dan dokumentasikan seluruh tindakan yang diambil dalam catatan kolam.",
    "Eskalasi masalah pertumbuhan lambat yang persisten atau gejala klinis abnormal melalui protokol biosekuriti ketat dan pengujian laboratorium diagnostik (PCR).",
  ],
  sources: [
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
    {
      title: "Best Management Practices for a Mangrove-Friendly Shrimp Farming",
      publisher: "SEAFDEC Aquaculture Department",
      url: "https://repository.seafdec.org/handle/20.500.12066/1947",
    },
    {
      title: "Infection with Enterocytozoon hepatopenaei (EHP)",
      publisher: "World Organisation for Animal Health",
      url: "https://www.woah.org/app/uploads/2022/11/a-woah-ehp-disease-card-sept-2022.pdf",
    },
  ],
};
