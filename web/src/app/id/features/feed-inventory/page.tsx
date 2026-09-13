import SeoLandingPageID from "@/components/SeoLandingPageID";
import { featureSeoPages_id, seoMetadataID } from "@/config/seo";

const page = featureSeoPages_id.find(item => item.path === "/id/features/feed-inventory");

export const metadata = seoMetadataID(page!, "/features/feed-inventory");

export default function FeedInventoryPageID() {
  return (
    <SeoLandingPageID
      path="/id/features/feed-inventory"
      eyebrow="Inventaris Pakan"
      title="Pelacakan stok pakan udang untuk tambak yang membutuhkan catatan stok dan pemberian pakan yang akurat."
      intro="Shrimply membantu tambak melacak stok pakan, merek pakan, aktivitas pemberian pakan, kebutuhan pemesanan ulang, dan pergerakan inventaris sehingga keputusan pakan terhubung langsung dengan operasional kolam nyata."
      sections={[
        {
          title: "Ketahui pakan apa yang tersedia",
          body: "Lacak merek pakan dan pergerakan stok di satu tempat agar manajer dapat melihat ketersediaan pakan sebelum rencana pemberian pakan menimbulkan kekurangan stok.",
        },
        {
          title: "Pisahkan pemberian pakan dari sampling",
          body: "Catatan pemberian pakan mewakili aktivitas inventaris nyata. Jumlah pakan saat sampling adalah observasi biologis untuk FCR dan proyeksi, sehingga Shrimply memisahkan kedua alur kerja tersebut.",
        },
        {
          title: "Hubungkan penggunaan pakan dengan performa",
          body: "Saat aktivitas pakan terhubung dengan pertumbuhan, biomassa, mortalitas, dan hasil panen, tambak mendapatkan gambaran FCR dan ekonomi siklus yang lebih jelas.",
        },
        {
          title: "Deteksi risiko kehabisan stok lebih awal",
          body: "Kekurangan pakan lebih mudah dicegah ketika keputusan pemesanan ulang didasarkan pada stok di gudang, kebutuhan kolam, dan aktivitas pakan terkini, bukan sekadar ingatan.",
        },
        {
          title: "Jaga akuntabilitas pakan tetap jelas",
          body: "Tim tambak dapat meninjau pakan mana yang dikeluarkan, di mana pakan digunakan, dan bagaimana pergerakan tersebut berkaitan dengan performa kolam serta nilai inventaris.",
        },
      ]}
      checklist={[
        "Lacak merek pakan, jumlah karung, dan pergerakan stok sebelum mengeluarkan pakan ke kolam.",
        "Catat aktivitas pemberian pakan sebagai tindakan inventaris yang memotong stok.",
        "Pisahkan observasi pakan sampling dari pemotongan inventaris.",
        "Tinjau penggunaan pakan bersamaan dengan biomassa, FCR, mortalitas, dan hasil panen.",
        "Gunakan visibilitas pemesanan ulang sebelum kekurangan pakan mengganggu rencana budidaya.",
      ]}
      faqs={[
        {
          question: "Apakah Shrimply memotong inventaris dari catatan sampling?",
          answer: "Tidak. Catatan pemberian pakan mewakili aktivitas inventaris nyata dan memotong stok pakan. Jumlah pakan sampling adalah observasi biologis untuk konteks FCR dan proyeksi.",
        },
        {
          question: "Mengapa inventaris pakan penting untuk FCR tambak udang?",
          answer: "FCR bergantung pada catatan penggunaan pakan yang akurat. Jika pergerakan pakan ditebak atau hilang, tambak tidak dapat membandingkan pakan yang digunakan terhadap pertambahan biomassa secara andal.",
        },
        {
          question: "Dapatkah manajer meninjau stok pakan sebelum merencanakan pakan kolam?",
          answer: "Ya. Alur kerja dirancang agar manajer dapat menghubungkan stok yang tersedia, merek pakan, aktivitas pemberian pakan, dan kebutuhan kolam sebelum kekurangan pakan menjadi masalah operasional.",
        },
      ]}
      related={[
        { href: "/id/shrimp-farm-management-software", label: "Software manajemen tambak udang", description: "Lihat bagaimana stok pakan terhubung dengan alur kerja kolam, keuangan, panen, dan pelaporan." },
        { href: "/id/vannamei-shrimp-farming-app", label: "Aplikasi budidaya udang vannamei", description: "Tinjau konteks aplikasi mobile dan web untuk pencatatan harian tambak vannamei." },
        { href: "/id/features/growth-sampling", label: "Sampling pertumbuhan dan pelacakan FCR", description: "Hubungkan akurasi penggunaan pakan dengan interpretasi MBW, biomassa, ADG, dan FCR." },
        { href: "/id/resources/feed-inventory-control", label: "Panduan kontrol inventaris pakan", description: "Baca panduan praktis untuk pergerakan stok, visibilitas pemesanan ulang, dan akuntabilitas pakan." },
        { href: "/id/resources/fcr-shrimp-farming", label: "FCR dalam budidaya udang", description: "Pahami mengapa catatan pakan yang andal sangat penting untuk menginterpretasikan feed conversion ratio." },
        { href: "/id/how-it-works", label: "Cara kerja Shrimply", description: "Ikuti alur operasional dari pencatatan lapangan hingga tinjauan manajer dan laporan." },
      ]}
    />
  );
}
