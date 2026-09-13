import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultOperationsReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "pond-performance",
  section: "Manajemen Tambak",
  label: "Manajemen Tambak",
  author: defaultResourceAuthorID,
  reviewer: defaultOperationsReviewerID,
  title: "Performa Kolam: Scorecard Tambak Udang yang Benar-Benar Berdampak",
  description: "Pelajari cara petambak udang mengevaluasi performa kolam secara menyeluruh menggunakan data tebar, kelangsungan hidup (SR), pakan, kualitas air, sampling, panen, dan catatan biaya siklus.",
  readTime: "6 menit baca",
  tags: ["performa kolam", "DOC", "kelangsungan hidup", "catatan tambak", "evaluasi mingguan"],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-pond-performance-scorecard-vannamei-farm.jpg",
    alt: "Infografis performa kolam udang yang menampilkan metrik sampling, log pakan, kualitas air, keuangan panen, MBW, ADG, kelangsungan hidup (SR), dan FCR",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Software Manajemen Tambak", href: "/id/shrimp-farm-management-software" },
  takeaways: [
    "Performa kolam merupakan integrasi utuh antara parameter biologis, disiplin operasional, dan efisiensi biaya.",
    "Catatan pakan, kualitas air, mortalitas, dan sampling pertumbuhan harus dievaluasi secara bersamaan, bukan terisolasi.",
    "Evaluasi kolam yang paling tajam selalu membandingkan realisasi lapangan terhadap rencana siklus dan target tebar awal.",
  ],
  sections: [
    {
      heading: "Mengapa performa kolam jauh lebih luas dari sekadar tonase panen",
      body: [
        "Sebuah kolam bisa saja menghasilkan tonase panen yang tampak memuaskan, namun tetap menyembunyikan performa yang buruk jika menghabiskan pakan berlebih, mengalami mortalitas udang yang tinggi, atau membutuhkan tindakan darurat di akhir siklus. Bagi manajer tambak, evaluasi performa sejati wajib memadukan laju pertumbuhan, tingkat kelangsungan hidup (survival rate/SR), efisiensi pakan (FCR), stabilitas kualitas air, dan margin penjualan akhir.",
        "Inilah alasan Shrimply memperlakukan seluruh catatan kolam sebagai satu kesatuan cerita operasional yang saling terhubung. Data sampling menjelaskan laju pertumbuhan udang. Log pakan menjelaskan tingkat konsumsi dan efisiensi. Parameter kualitas air menjelaskan beban stres lingkungan. Sementara pencatatan panen dan keuangan membuktikan apakah siklus tersebut benar-benar menghasilkan margin keuntungan yang sehat.",
      ],
    },
    {
      heading: "Parameter yang wajib dibandingkan petambak setiap pekan",
      body: [
        "Evaluasi mingguan yang efektif harus membandingkan DOC, target ukuran (size), MBW terkini, ADG, estimasi biomassa, total konsumsi pakan, tingkat mortalitas, tren kualitas air, serta pengamatan dini gejala penyakit. Tujuannya bukan semata memprediksi angka secara sempurna, melainkan mendeteksi kolam yang mulai menyimpang dari kurva rencana sedini mungkin sebelum masalah membesar.",
        "Riset dan panduan praktik budidaya terbaik (BMP) secara konsisten menegaskan pola operasional yang sama: manajemen pakan yang tepat, stabilitas kualitas air, pencegahan penyakit, dan pencatatan data yang disiplin selalu bekerja bersamaan. Mengevaluasi satu metrik saja secara terpisah mungkin membuat laporan tambak terlihat rapi di atas kertas, tetapi rentan meleset dalam pengendalian risiko nyata di lapangan.",
      ],
    },
    {
      heading: "Bagaimana software meningkatkan kualitas evaluasi tambak",
      body: [
        "Pencatatan digital mempercepat perbandingan antar kolam karena tim teknis dapat langsung menganalisis apakah perlambatan pertumbuhan berkaitan dengan nafsu makan anjlok, fluktuasi kualitas air, mortalitas tersembunyi, atau inkonsistensi teknik sampling. Visibilitas ini sangat krusial bagi tambak dengan banyak petak kolam, teknisi yang bekerja bergilir, serta pencatatan buku lapangan yang sebelumnya terfragmentasi.",
      ],
    },
  ],
  checklist: [
    "Tinjau MBW, ADG, konsumsi pakan, mortalitas harian, dan tren kualitas air secara terpadu.",
    "Bandingkan performa tiap kolam terhadap rencana tebar awal dan estimasi jendela panen.",
    "Beri tanda peringatan (flag) pada kolam di mana konsumsi pakan meningkat namun laju pertumbuhan (ADG) tidak mengimbanginya.",
    "Hubungkan seluruh catatan panen dan biaya operasional langsung ke siklus kolam yang bersangkutan.",
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
      title: "Management for Freshwater Fish Culture: Record Keeping",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/FAO_Training/FAO_Training/General/x6709e/x6709e16.htm",
    },
  ],
};
