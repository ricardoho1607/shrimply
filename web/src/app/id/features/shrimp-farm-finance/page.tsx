import SeoLandingPageID from "@/components/SeoLandingPageID";
import { featureSeoPages_id, seoMetadataID } from "@/config/seo";

const page = featureSeoPages_id.find(item => item.path === "/id/features/shrimp-farm-finance");

export const metadata = seoMetadataID(page!, "/features/shrimp-farm-finance");

export default function ShrimpFarmFinancePageID() {
  return (
    <SeoLandingPageID
      path="/id/features/shrimp-farm-finance"
      eyebrow="Keuangan Tambak Udang"
      title="Pelacakan keuangan tambak udang untuk arus kas, COGS, laba rugi, dan proyeksi."
      intro="Shrimply membantu tambak mengelola catatan dan laporan keuangan mencakup arus kas, beban pokok produksi (COGS), laba rugi (P&L), biaya inventaris, pendapatan panen, dan proyeksi berbasis asumsi."
      sections={[
        {
          title: "Pisahkan jenis laporan dengan tepat",
          body: "Arus kas, COGS, laba rugi, dan proyeksi menjawab pertanyaan bisnis yang berbeda. Shrimply memisahkan jenis-jenis laporan tersebut secara jelas alih-alih menggabungkannya dalam satu ekspor data yang membingungkan.",
        },
        {
          title: "Hubungkan biaya langsung ke operasional",
          body: "Data pakan, inventaris, panen, dan siklus memberikan konteks nyata bagi keuangan tambak. Hal ini membuat laporan keuangan lebih mudah dijelaskan dan ditindaklanjuti.",
        },
        {
          title: "Proyeksi realistis, bukan janji",
          body: "Proyeksi keuangan harus berbasis asumsi yang terukur. Shrimply membantu menyusun proyeksi sebagai alat perencanaan strategis, bukan sekadar janji angka.",
        },
        {
          title: "Pahami penyebab perubahan biaya",
          body: "Laporan keuangan menjadi jauh lebih bermanfaat ketika perubahan biaya dapat dihubungkan dengan penggunaan pakan, waktu panen, nilai inventaris, dan kinerja siklus kolam.",
        },
        {
          title: "Dukung evaluasi pemilik tambak",
          body: "Pemilik tambak memerlukan laporan yang memisahkan waktu kas keluar-masuk, biaya produksi, profitabilitas riil, dan asumsi proyeksi agar keputusan strategis berikutnya lebih terarah.",
        },
      ]}
      checklist={[
        "Pisahkan analisis arus kas, COGS, laba rugi (P&L), dan proyeksi.",
        "Hubungkan biaya pakan, benur, inventaris, tenaga kerja, panen, dan biaya lain ke dalam konteks siklus.",
        "Tampilkan asumsi secara transparan saat menyajikan proyeksi keuangan.",
        "Tinjau pendapatan panen berdampingan dengan biaya produksi dan hasil kolam.",
        "Gunakan catatan kualitas data apabila ada entri yang belum lengkap atau tertunda.",
      ]}
      faqs={[
        {
          question: "Mengapa arus kas, COGS, P&L, dan proyeksi harus dipisahkan?",
          answer: "Setiap laporan menjawab pertanyaan operasional yang berbeda. Mencampurkannya dapat menyamarkan apakah masalah tambak terletak pada waktu perputaran uang (timing), biaya produksi, profitabilitas aktual, atau asumsi perencanaan.",
        },
        {
          question: "Apakah proyeksi keuangan Shrimply merupakan sebuah jaminan hasil?",
          answer: "Bukan. Proyeksi harus diperlakukan sebagai alat bantu perencanaan berbasis asumsi, bukan jaminan hasil panen ataupun keuntungan pasti.",
        },
        {
          question: "Bagaimana data operasional tambak meningkatkan kualitas laporan keuangan?",
          answer: "Catatan pakan, inventaris, panen, dan siklus kolam memberikan konteks operasional nyata pada angka finansial, sehingga laporan lebih mudah dipahami dan dijadikan dasar tindakan.",
        },
      ]}
      related={[
        { href: "/id/shrimp-farm-management-software", label: "Software manajemen tambak udang", description: "Lihat bagaimana keuangan terhubung dengan catatan kolam, inventaris, laporan, dan hasil produksi." },
        { href: "/id/features/feed-inventory", label: "Inventaris pakan dan pelacakan biaya", description: "Lacak stok dan pergerakan pakan agar nilai inventaris mendukung evaluasi biaya tambak." },
        { href: "/id/features/shrimp-harvest-tracking", label: "Pelacakan panen udang", description: "Hubungkan berat panen dan penjualan dengan pendapatan serta profitabilitas siklus." },
        { href: "/resources/shrimp-farm-cogs", label: "Panduan COGS tambak udang", description: "Pelajari bagaimana biaya produksi harus dipisahkan dari waktu arus kas dan proyeksi." },
        { href: "/resources/shrimp-farm-cash-flow", label: "Panduan arus kas tambak udang", description: "Pahami mengapa pergerakan kas dan pelaporan laba menjawab kebutuhan evaluasi tambak yang berbeda." },
        { href: "/id/how-it-works", label: "Cara kerja Shrimply", description: "Ikuti alur operasional dari pencatatan lapangan hingga laporan keuangan dan evaluasi pemilik." },
      ]}
    />
  );
}
