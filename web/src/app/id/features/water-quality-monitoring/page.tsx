import SeoLandingPageID from "@/components/SeoLandingPageID";
import { featureSeoPages_id, seoMetadataID } from "@/config/seo";

const page = featureSeoPages_id.find(item => item.path === "/id/features/water-quality-monitoring");

export const metadata = seoMetadataID(page!, "/features/water-quality-monitoring");

export default function WaterQualityMonitoringPageID() {
  return (
    <SeoLandingPageID
      path="/id/features/water-quality-monitoring"
      eyebrow="Monitoring Kualitas Air"
      title="Monitoring kualitas air kolam udang untuk visibilitas risiko harian yang lebih jelas."
      intro="Shrimply membantu tambak mencatat dan meninjau tren kualitas air sehingga tim tambak dapat menghubungkan pembacaan DO, pH, suhu, salinitas, alkalinitas, amonia, dan parameter lainnya dengan keputusan tambak."
      sections={[
        {
          title: "Ubah pengecekan menjadi tren",
          body: "Satu kali pengukuran memang berguna, tetapi arah tren jauh lebih penting. Shrimply menyimpan riwayat kualitas air agar tim dapat meninjau pergerakan data dari catatan terkini.",
        },
        {
          title: "Hubungkan kualitas air dengan pertumbuhan",
          body: "Saat data sampling baru dibuat, riwayat kualitas air membantu menjelaskan variasi pertumbuhan, perubahan nafsu makan, stres, atau performa kolam yang tidak biasa.",
        },
        {
          title: "Dukung respons operasional lebih cepat",
          body: "Catatan kualitas air yang rapi memudahkan identifikasi kolam mana yang butuh perhatian, kondisi mana yang stabil, dan di mana peringatan biologis mungkin mulai muncul.",
        },
        {
          title: "Tinjau riwayat terkini, bukan hanya satu angka terisolasi",
          body: "Shrimply menjaga riwayat kualitas air terbaru tetap dekat dengan catatan kolam agar manajer dapat melihat apakah suatu angka merupakan anomali sesaat atau bagian dari sebuah tren.",
        },
        {
          title: "Beri konteks lebih kuat untuk Orson",
          body: "Riwayat kualitas air meningkatkan analisis kecerdasan kolam Orson AI karena sinyal pertumbuhan, nafsu makan, dan risiko menjadi jauh lebih jelas saat dinamika lingkungan terkini tersedia.",
        },
      ]}
      checklist={[
        "Catat DO, pH, suhu, salinitas, alkalinitas, amonia, dan parameter spesifik tambak lainnya secara konsisten.",
        "Tinjau arah tren pada catatan terkini sebelum menyimpulkan bahwa kolam dalam kondisi stabil.",
        "Bandingkan pergerakan kualitas air dengan MBW, ADG, nafsu makan, dan mortalitas.",
        "Tandai kolam dengan pembacaan abnormal berulang untuk tinjauan manajer yang lebih cepat.",
        "Gunakan riwayat kualitas air saat menganalisis perubahan pertumbuhan antar jadwal sampling.",
      ]}
      faqs={[
        {
          question: "Mengapa perlu melacak tren kualitas air dan bukan hanya pembacaan hari ini?",
          answer: "Satu angka pembacaan memang berguna, namun arah tren menunjukkan apakah kondisi kolam membaik, memburuk, atau berulang kali melewati batas ambang risiko.",
        },
        {
          question: "Bagaimana kualitas air terhubung dengan hasil sampling?",
          answer: "Ketika sampling baru dicatat, riwayat kualitas air terkini membantu menjelaskan variasi pertumbuhan, perubahan nafsu makan, stres, atau performa kolam yang abnormal.",
        },
        {
          question: "Dapatkah Shrimply membantu membandingkan risiko antar kolam?",
          answer: "Ya. Pengelompokan catatan kualitas air berdasarkan kolam dan siklus membantu tim meninjau kolam mana yang stabil dan mana yang memerlukan tindakan operasional lebih cepat.",
        },
      ]}
      related={[
        { href: "/id/shrimp-farm-management-software", label: "Software manajemen tambak udang", description: "Lihat bagaimana kualitas air terintegrasi dalam performa kolam, laporan, dan tinjauan operasional." },
        { href: "/id/features/disease-alerts", label: "Peringatan penyakit udang", description: "Hubungkan kondisi kolam abnormal dengan visibilitas risiko penyakit dan biosekuriti." },
        { href: "/id/features/growth-sampling", label: "Sampling pertumbuhan dan pelacakan MBW", description: "Gunakan riwayat kualitas air untuk menjelaskan variasi pertumbuhan antar catatan sampling." },
        { href: "/resources/water-quality-trends", label: "Panduan tren kualitas air", description: "Baca panduan mengenai tinjauan DO, pH, salinitas, amonia, dan arah tren parameter air." },
        { href: "/resources/shrimp-disease-alerts", label: "Panduan peringatan penyakit", description: "Pelajari bagaimana sistem peringatan dini menjadi lebih efektif saat terhubung dengan data kolam." },
        { href: "/id/orson", label: "Orson AI untuk inteligensi kolam", description: "Lihat bagaimana riwayat kualitas air terkini memperkaya konteks AI untuk analisis kolam." },
      ]}
    />
  );
}
