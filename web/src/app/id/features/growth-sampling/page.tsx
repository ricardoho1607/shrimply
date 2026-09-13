import SeoLandingPageID from "@/components/SeoLandingPageID";
import { featureSeoPages_id, seoMetadataID } from "@/config/seo";

const page = featureSeoPages_id.find(item => item.path === "/id/features/growth-sampling");

export const metadata = seoMetadataID(page!, "/features/growth-sampling");

export default function GrowthSamplingPageID() {
  return (
    <SeoLandingPageID
      path="/id/features/growth-sampling"
      eyebrow="Sampling Pertumbuhan"
      title="Software sampling pertumbuhan udang untuk pelacakan MBW, ADG, biomassa, dan mortalitas."
      intro="Shrimply membantu tambak melacak catatan sampling pertumbuhan, MBW, mortalitas, observasi pakan, biomassa, populasi, ADG, dan indikator FCR tanpa memperlakukan data sampling sebagai pemotongan stok inventaris."
      sections={[
        {
          title: "Lacak MBW dan arah pertumbuhan",
          body: "Catatan sampling membantu tim memahami apakah udang tumbuh sesuai harapan. Shrimply menjaga riwayat MBW dan pertumbuhan terkait tetap terorganisir berdasarkan kolam dan siklus.",
        },
        {
          title: "Proyeksi lebih akurat dari data yang lebih baik",
          body: "Sampling yang andal meningkatkan estimasi biomassa, perencanaan pakan, penentuan waktu panen, dan proyeksi keuangan. Data yang hilang atau kurang lengkap menjadi lebih mudah diidentifikasi.",
        },
        {
          title: "Dirancang untuk realitas operasional tambak",
          body: "Data tambak di lapangan sering kali terfragmentasi. Shrimply menggunakan logika kalkulasi defensif dan fallback praktis agar laporan tetap bermanfaat tanpa mengabaikan catatan yang belum lengkap.",
        },
        {
          title: "Lindungi proyeksi dari asumsi yang lemah",
          body: "Kualitas sampling mempengaruhi estimasi biomassa, perencanaan pakan, dan waktu panen, sehingga Shrimply menjaga kualitas data tetap transparan ketika perhitungan bergantung pada catatan yang terbatas.",
        },
        {
          title: "Hubungkan pertumbuhan dengan riwayat air dan pakan",
          body: "Sampling jauh lebih berguna jika ditinjau bersama respons pakan terkini dan dinamika kualitas air, bukan sekadar diperlakukan sebagai angka yang berdiri sendiri.",
        },
      ]}
      checklist={[
        "Simpan MBW dan observasi pakan sebagai angka numerik untuk perhitungan yang andal.",
        "Gunakan catatan MBW valid terkini ketika data sampling terbaru belum ada atau bernilai nol.",
        "Tinjau ADG, biomassa, survival rate, mortalitas, dan FCR secara bersamaan.",
        "Pisahkan jumlah pakan sampling dari pemotongan inventaris stok riil.",
        "Bandingkan hasil sampling baru dengan riwayat kualitas air dan dinamika pemberian pakan terkini.",
      ]}
      faqs={[
        {
          question: "Apakah sampling pertumbuhan memotong inventaris pakan?",
          answer: "Tidak. Jumlah pakan saat sampling digunakan untuk konteks biologis, FCR, dan proyeksi. Inventaris pakan aktual hanya dipotong melalui pencatatan aktivitas pemberian pakan.",
        },
        {
          question: "Parameter sampling apa yang paling penting untuk keputusan kolam udang?",
          answer: "MBW, mortalitas, observasi pakan, populasi, biomassa, ADG, dan konteks FCR membantu manajer memahami arah pertumbuhan dan kesiapan panen.",
        },
        {
          question: "Bagaimana Shrimply menangani data sampling yang terfragmentasi?",
          answer: "Shrimply menggunakan logika perhitungan defensif dan metode fallback praktis sehingga laporan tetap dapat digunakan dengan baik sambil tetap memperlihatkan data yang kurang lengkap.",
        },
      ]}
      related={[
        { href: "/id/vannamei-shrimp-farming-app", label: "Aplikasi budidaya udang vannamei", description: "Lihat konteks aplikasi mobile dan web untuk DOC, MBW, ADG, FCR, dan pencatatan kolam." },
        { href: "/id/shrimp-farm-management-software", label: "Software manajemen tambak udang", description: "Tinjau bagaimana sampling mendukung performa kolam, laporan, keuangan, dan perencanaan panen." },
        { href: "/id/features/feed-inventory", label: "Pelacakan inventaris pakan", description: "Pisahkan pergerakan stok pakan aktual dari observasi pakan saat sampling." },
        { href: "/id/features/water-quality-monitoring", label: "Monitoring kualitas air", description: "Bandingkan hasil sampling dengan tren kualitas air terkini dan sinyal stres pada kolam." },
        { href: "/id/resources/pond-performance", label: "Panduan performa kolam", description: "Pelajari bagaimana catatan sampling, pakan, mortalitas, dan panen menjelaskan performa siklus." },
        { href: "/id/resources/shrimp-cycle-planning", label: "Panduan perencanaan siklus udang", description: "Gunakan catatan pertumbuhan untuk merencanakan tebar benur, pakan, proyeksi, dan jadwal panen." },
      ]}
    />
  );
}
