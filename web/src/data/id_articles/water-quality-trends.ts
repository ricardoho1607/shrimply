import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "water-quality-trends",
  section: "Air, Kesehatan, dan Risiko",
  label: "Kualitas Air",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "Tren Kualitas Air Tambak Udang: Membaca Korelasi DO, pH, Salinitas, Amonia, dan Nitrit Secara Bersamaan",
  description:
    "Parameter kualitas air tambak apa saja yang wajib diuji? Pelajari cara mengevaluasi tren oksigen terlarut (DO), pH, suhu, salinitas, amonia (TAN), dan nitrit secara bersamaan sebelum fluktuasinya memicu stres atau kematian udang vaname.",
  readTime: "7 menit baca",
  tags: [
    "tren kualitas air tambak udang",
    "kualitas air tambak udang",
    "parameter kualitas air udang",
    "oksigen terlarut DO",
    "pH tambak udang",
    "amonia TAN tambak",
    "nitrit tambak udang",
    "salinitas tambak udang",
    "fluktuasi diurnal air tambak",
    "monitoring kualitas air",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-pond-water-quality-trends-monitoring.jpg",
    alt: "Infografis tren kualitas air tambak udang yang membandingkan pergerakan oksigen terlarut (DO), pH, suhu, salinitas, amonia, dan nitrit dari waktu ke waktu",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Software Monitoring Kualitas Air", href: "/id/features/water-quality-monitoring" },
  takeaways: [
    "Kualitas air wajib dibaca sebagai tren dinamis yang berkelanjutan, bukan sekadar angka pengujian tunggal yang terisolasi.",
    "Amonia (TAN), nitrit, oksigen terlarut (DO), pH, suhu air, dan salinitas saling berinteraksi erat dalam memicu stres biologis dan imunitas udang.",
    "Akumulasi sisa pakan tidak termakan dan beban bahan organik dasar kolam memperparah risiko pemburukan kualitas air dan anoksia.",
  ],
  faqs: [
    {
      question: "Parameter kualitas air apa saja yang wajib diuji secara rutin di tambak udang?",
      answer:
        "Minimal, pantau secara konsisten parameter operasional utama tambak mencakup oksigen terlarut (DO), pH, suhu air, salinitas, total amonia nitrogen (TAN), dan nitrit (NO₂⁻), lengkap dengan jam pencatatan yang presisi pada setiap pengambilan sampel. Rencana monitoring yang tepat juga bergantung pada sistem budidaya tambak, musim, padat tebar benur, dan panduan teknis operasional setempat.",
    },
    {
      question: "Apa yang harus segera diperiksa ketika oksigen terlarut (DO) di tambak anjlok?",
      answer:
        "Konfirmasi ulang keakuratan alat ukur dan jam pencatatan, periksa putaran kincir aerasi dan perilaku udang (apakah berenang di permukaan atau berkumpul di tepian), evaluasi log pemberian pakan terkini dan beban bahan organik dasar, bandingkan pergerakan pH dan suhu, serta periksa konsentrasi amonia dan nitrit jika tersedia. Jalankan SOP tanggap darurat aerasi tambak daripada berasumsi bahwa satu pengukuran sesaat dapat menjelaskan penyebabnya secara menyeluruh.",
    },
    {
      question: "Mengapa amonia, pH, dan suhu air harus dievaluasi secara bersamaan?",
      answer:
        "Ketiga parameter ini saling berinteraksi secara kimiawi: pH dan suhu air yang tinggi meningkatkan proporsi fraksi amonia bebas tak terionisasi (NH₃) yang bersifat sangat beracun bagi udang, dibandingkan bentuk terionisasi amonium (NH₄⁺). Evaluasi berbasis tren bersama jauh lebih akurat dan preventif dibandingkan memperlakukan satu angka hasil tes amonia sebagai diagnosis tunggal tanpa memperhitungkan fluktuasi pH dan suhu.",
    },
  ],
  sections: [
    {
      heading: "Mengapa tren kualitas air jauh lebih penting daripada satu kali pengukuran",
      body: [
        "Satu angka pengukuran kualitas air memang memberikan potret sesaat, namun pola pergerakan tren dari hari ke hari jauh lebih berharga bagi pengambilan keputusan operasional tambak. Oksigen terlarut (DO), pH, suhu, salinitas, amonia (TAN), dan nitrit dapat berfluktuasi secara diurnal (perbedaan fajar vs sore hari) maupun bergeser dinamis sepanjang siklus budidaya seiring meningkatnya biomassa udang.",
        "Penelitian terbuka mengenai air limbah dan kualitas air budidaya udang menyoroti senyawa nitrogen dan akumulasi bahan organik sebagai faktor risiko paling krusial dalam ekosistem tambak. Bagi para petambak, langkah praktis terpenting adalah melacak pergerakan tren parameter ini sedini mungkin sebelum berkembang menjadi krisis kualitas air atau kematian massal.",
      ],
    },
    {
      heading: "Menghubungkan kualitas air dengan kontrol pakan dan perilaku udang",
      body: [
        "Sisa pakan yang tidak termakan dan kotoran udang menambah beban bahan organik di dasar kolam. Akumulasi ini secara langsung meningkatkan kebutuhan oksigen biokimiawi (BOD), memicu lonjakan nutrien terlarut, dan mengganggu stabilitas plankton. Panduan NOAA mengenai dampak nutrien akuakultur juga menegaskan bahwa pakan yang tidak termakan dan limbah metabolik merupakan sumber utama peningkatan nutrien dalam lingkungan budidaya.",
        "Ketika nafsu makan udang di anco menurun, teknisi tambak wajib segera memeriksa parameter air sebelum menyimpulkan bahwa udang hanya membutuhkan pakan yang lebih sedikit. Kualitas air yang memburuk dapat menekan nafsu makan udang, dan terus menebar pakan saat nafsu makan rendah justru akan mempercepat pembusukan dasar kolam dan memperparah kondisi air.",
      ],
    },
    {
      heading: "Parameter yang wajib ditinjau setiap hari di tambak",
      body: [
        "Secara konsisten, pantau parameter operasional utama tambak dan catat waktu pengukuran dengan cermat. Bandingkan data hari ini dengan beberapa riwayat pengukuran sebelumnya, bukan sekadar melihat apakah angkanya masih berada di dalam rentang target nominal. Perubahan nilai yang mendadak patut segera diinvestigasi meskipun angkanya belum melampaui ambang batas bahaya.",
        "Untuk rentang acuan praktis fase pembesaran serta konteks kondisi kolam yang menentukan tingkat risiko, pelajari panduan lengkap di [Panduan Parameter Kualitas Air Vannamei](/id/resources/vannamei-water-quality-parameters).",
      ],
    },
  ],
  checklist: [
    "Catat waktu dan jam sampling pada setiap pencatatan data kualitas air.",
    "Tinjau tren dari beberapa riwayat pengukuran terakhir sebelum memutuskan tindakan penanganan.",
    "Bandingkan dinamika pergerakan air dengan respons pakan di anco dan angka mortalitas harian.",
    "Beri tanda peringatan (flag) pada perubahan atau fluktuasi mendadak sebelum angkanya mencapai batas ekstrem.",
  ],
  sources: [
    {
      title: "Recent Advances in Shrimp Aquaculture Wastewater Management",
      publisher: "Environmental Science and Pollution Research",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8577153/",
    },
    {
      title: "Nutrient Impacts of Finfish Aquaculture",
      publisher: "NOAA Fisheries",
      url: "https://www.fisheries.noaa.gov/aquaculture/nutrient-impacts-finfish-aquaculture",
    },
    {
      title: "The Role of Probiotics in Vannamei Shrimp Aquaculture Performance",
      publisher: "Fish and Shellfish Immunology Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10082739/",
    },
  ],
};
