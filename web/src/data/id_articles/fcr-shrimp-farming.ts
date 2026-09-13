import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultNutritionReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "fcr-shrimp-farming",
  section: "Pakan dan Inventaris",
  label: "Pakan dan Inventaris",
  author: defaultResourceAuthorID,
  reviewer: defaultNutritionReviewerID,
  title: "Optimalisasi FCR Tambak Udang: Cara Menghitung dan Menganalisis Rasio Konversi Pakan secara Tepat",
  description:
    "Pahami rasio konversi pakan (FCR) udang vaname, mengapa nilai FCR krusial bagi profitabilitas tambak, faktor penyebab distorsi angka FCR, serta cara memperbaiki efisiensi pakan melalui pencatatan log pakan, estimasi biomassa, mortalitas, dan hasil panen yang akurat.",
  readTime: "7 menit baca",
  tags: [
    "FCR",
    "meningkatkan FCR",
    "rasio konversi pakan",
    "efisiensi pakan",
    "pemborosan pakan",
    "biomassa udang",
    "panen parsial",
    "evaluasi anco",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-fcr-feed-conversion-ratio-farming.jpg",
    alt: "Petambak udang menghitung FCR menggunakan rumus rasio konversi pakan, total pakan terpakai, pertambahan biomassa, tren kualitas air, nafsu makan di anco, dan evaluasi FCR mingguan",
    width: 1535,
    height: 1024,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Software Manajemen Pakan", href: "/id/features/feed-inventory" },
  takeaways: [
    "FCR membandingkan total pakan yang diberikan terhadap pertambahan biomassa udang, namun pencatatan data yang buruk dapat menghasilkan angka FCR yang menyesatkan.",
    "Tingkat mortalitas, panen parsial, akurasi sampling pertumbuhan, dan selisih stok pakan di gudang sangat memengaruhi kalkulasi FCR riil.",
    "Angka FCR wajib dievaluasi bersamaan dengan laju pertumbuhan (ADG), kestabilan kualitas air, tingkat kelangsungan hidup (SR), dan respons pakan di anco.",
  ],
  faqs: [
    {
      question: "Bagaimana cara menghitung FCR pada tambak udang?",
      answer:
        "FCR (Feed Conversion Ratio) dihitung dengan membagi total pakan yang digunakan dengan total pertambahan biomassa udang. Untuk perhitungan kolam yang akurat, akumulasikan seluruh tonase panen parsial, panen total, dan estimasi biomassa tersisa di kolam, kemudian kurangi dengan biomassa awal saat tebar benur jika datanya terdokumentasi dengan baik.",
    },
    {
      question: "Mengapa nilai FCR udang saya membengkak atau meningkat?",
      answer:
        "Peningkatan FCR umumnya dipicu oleh pemberian pakan berlebih (overfeeding), nafsu makan udang menurun, bias estimasi biomassa, mortalitas udang tersembunyi yang tidak tercatat, data panen parsial yang terlewat, stres lingkungan akibat penurunan kualitas air, atau selisih pencatatan stok pakan di gudang. Selalu periksa kontrol anco, kadar oksigen terlarut (DO), amonia, nitrit, sampling bobot udang, dan riwayat mortalitas secara terpadu sebelum mengubah ransum harian.",
    },
  ],
  sections: [
    {
      heading: "Rumus dasar perhitungan FCR tambak udang",
      body: [
        "Rumus standar rasio konversi pakan adalah: FCR = total pakan terpakai / pertambahan biomassa udang. Sebagai contoh, jika satu kolam menghabiskan 10.000 kg pakan dan menghasilkan pertambahan biomassa udang sebesar 8.000 kg, maka nilai FCR kolam tersebut adalah 1,25.",
        "Pada tambak udang, pertambahan biomassa harus memperhitungkan hasil panen riil secara keseluruhan, bukan hanya standing biomass yang tersisa di kolam pada akhir siklus. Rumus praktis operasional tambak adalah: FCR = total pakan terpakai / (biomassa panen + biomassa tersisa − biomassa tebar awal). Banyak tambak menganggap biomassa tebar awal benur (post-larvae) mendekati nol karena bobotnya sangat kecil, namun memasukkannya ke dalam kalkulasi tetap memberikan akurasi data yang lebih presisi jika pencatatannya tersedia.",
        "Untuk kolam yang menerapkan panen parsial, seluruh tonase panen parsial wajib diakumulasikan ke dalam total biomassa panen. Jika tidak, tambak akan membebankan seluruh pakan yang telah terpakai hanya pada hasil panen akhir, sehingga membuat angka FCR tampak membengkak jauh lebih buruk daripada performa kolam yang sebenarnya.",
      ],
    },
    {
      heading: "Arti nilai FCR bagi manajemen operasional tambak",
      body: [
        "Rasio konversi pakan (FCR) merupakan salah satu indikator kinerja produksi paling penting karena pakan menyerap 50% hingga 70% dari total biaya operasional tambak udang. Nilai FCR yang lebih rendah umumnya menunjukkan bahwa pelet pakan dikonversi menjadi daging udang secara lebih efisien. Namun, angka FCR ini hanya bermakna jika pencatatan log pakan harian dan estimasi biomassa dilakukan secara akurat dan konsisten.",
        "Publikasi FAO mengenai budidaya udang vaname mencatat bahwa sistem budidaya seperti bioflok mampu menurunkan ketergantungan pada pakan berprotein tinggi serta meningkatkan efisiensi biaya produksi. Hal ini mempertegas fakta penting di lapangan: efisiensi FCR berkaitan erat dengan stabilitas ekosistem kolam secara menyeluruh—mulai dari aerasi, bakteri perombak, hingga plankton—bukan hanya ditentukan oleh angka di tabel pakan semata.",
      ],
    },
    {
      heading: "Faktor penyebab distorsi dan kekeliruan angka FCR",
      body: [
        "Kalkulasi FCR dapat menjadi sangat bias ketika mutasi pakan antar-gudang dan kolam tidak tercatat rapi, kasus mortalitas udang di dasar kolam tidak terdeteksi, timbangan hasil panen parsial tidak lengkap, atau teknik sampling jala menghasilkan estimasi biomassa yang terlalu tinggi (overestimasi). Panen parsial juga kerap menimbulkan kerancuan jika tonase udang yang diangkat tidak dikaitkan kembali ke siklus kolam bersangkutan.",
        "Petambak tidak boleh memperlakukan angka FCR sebagai skor tunggal yang berdiri sendiri. Kolam dengan laju pertumbuhan rendah dan konsumsi pakan minim mungkin menghasilkan FCR yang sekilas terlihat efisien, tetapi gagal mencapai target ukuran panen komersial. Sebaliknya, kolam dengan konsumsi pakan tinggi namun kualitas airnya memburuk akan menimbulkan masalah pemborosan pakan, pencemaran dasar kolam, dan lonjakan amonia beracun.",
      ],
    },
    {
      heading: "Cara mengevaluasi FCR mingguan secara operasional",
      body: [
        "Jadikan FCR sebagai pemantik evaluasi kritis di lapangan. Jika FCR mingguan terpantau merangkak naik, segera periksa nafsu makan udang, evaluasi sisa pakan di anco, pantau kadar DO fajar, amonia, nitrit, tanda-tanda mortalitas, serta akurasi sampling bobot (MBW) terkini. Peningkatan efisiensi FCR di tambak udang biasanya dicapai melalui disiplin pencatatan log pakan riil, estimasi biomassa yang realistis, pembacaan anco yang objektif, dan respons cepat terhadap stres kualitas air. Sebaliknya, jika FCR tampak menurun drastis secara tiba-tiba, verifikasi terlebih dahulu kelengkapan data biomassa dan laporan panen sebelum menyimpulkan bahwa performa kolam membaik.",
        "Gunakan [Tabel & Kalkulator Feeding Rate Vannamei](/id/resources/vannamei-feeding-rate) untuk menetapkan acuan ransum awal berbasis biomassa, lalu lakukan penyesuaian harian berdasarkan respons pakan anco, tren kualitas air, dan catatan historis kolam terkini.",
      ],
    },
  ],
  checklist: [
    "Gunakan data pakan riil yang diberikan ke kolam (feed issued), bukan sekadar estimasi sak pakan.",
    "Perbarui catatan mortalitas harian dan tonase panen parsial secara konsisten.",
    "Evaluasi FCR bersamaan dengan metrik MBW, ADG, estimasi biomassa, dan stabilitas kualitas air.",
    "Investigasi setiap lonjakan atau penurunan drastis FCR secara teliti sebelum mengambil keputusan sepihak.",
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
      title: "Comparative Analysis of Profitability and Resource Use Efficiency Between Penaeus monodon and Litopenaeus vannamei in India",
      publisher: "Aquaculture Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8096089/",
    },
  ],
};
