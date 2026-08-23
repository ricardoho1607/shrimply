import SeoLandingPageID from "@/components/SeoLandingPageID";
import { featureSeoPages_id, seoMetadataID } from "@/config/seo";

const page = featureSeoPages_id.find(item => item.path === "/id/features/disease-alerts");

export const metadata = seoMetadataID(page!, "/features/disease-alerts");

export default function DiseaseAlertsPageID() {
  return (
    <SeoLandingPageID
      path="/id/features/disease-alerts"
      eyebrow="Peringatan Penyakit"
      title="Peringatan penyakit udang dan visibilitas biosekuriti untuk respons tambak yang lebih cepat."
      intro="Shrimply membantu tambak melacak peringatan penyakit, risiko wabah terdekat, sinyal biosekuriti, dan kondisi kolam yang memerlukan perhatian operasional lebih cepat."
      sections={[
        {
          title: "Kesadaran biosekuriti lebih dini",
          body: "Risiko penyakit dapat menyebar dengan cepat di seluruh kawasan tambak. Shrimply membantu tim melihat sinyal peringatan lebih awal agar dapat bersiap sebelum kerugian meluas.",
        },
        {
          title: "Konteks risiko yang aman dan menjaga privasi",
          body: "Visibilitas penyakit harus mendukung keamanan tambak tanpa mengekspos data privat perusahaan. Shrimply dirancang dengan alur kerja biosekuriti yang menjaga kerahasiaan data.",
        },
        {
          title: "Hubungkan peringatan dengan kondisi kolam",
          body: "Peringatan penyakit jauh lebih berguna jika dilihat bersamaan dengan tren kualitas air, nafsu makan pakan, pertumbuhan, dan mortalitas. Shrimply mengintegrasikan sinyal-sinyal ini dalam satu tampilan.",
        },
        {
          title: "Prioritaskan langkah penanganan dengan mudah",
          body: "Keputusan biosekuriti lebih mudah diambil saat peringatan ditinjau dengan konteks risiko spesifik per kolam, bukan diperlakukan sebagai notifikasi terisolasi.",
        },
        {
          title: "Dokumentasikan data untuk pencegahan masa depan",
          body: "Menyimpan riwayat peringatan, mortalitas, kualitas air, dan respons kolam membantu tambak belajar dari peristiwa risiko setelah tekanan wabah mereda.",
        },
      ]}
      checklist={[
        "Tinjau peringatan penyakit berdampingan dengan kualitas air kolam, nafsu makan, mortalitas, dan dinamika pertumbuhan.",
        "Pastikan data privat perusahaan tidak muncul di tampilan publik atau pembeli kecuali sengaja dibagikan.",
        "Catat langkah-langkah respons agar evaluasi pencegahan di masa depan memiliki konteks lengkap.",
        "Prioritaskan kolam yang menerima peringatan eksternal sekaligus menunjukkan sinyal stres internal.",
        "Gunakan riwayat penyakit untuk memperkuat perencanaan biosekuriti setelah kejadian berlalu.",
      ]}
      faqs={[
        {
          question: "Apakah peringatan penyakit menggantikan diagnosis laboratorium tambak?",
          answer: "Tidak. Peringatan berfungsi untuk meningkatkan kesadaran dini dan perencanaan respons cepat, namun tambak tetap harus menggunakan uji diagnostik laboratorium, keahlian teknisi, dan prosedur biosekuriti standar.",
        },
        {
          question: "Mengapa peringatan perlu dihubungkan dengan catatan kolam?",
          answer: "Peringatan penyakit jauh lebih bermanfaat ketika manajer dapat membandingkannya langsung dengan parameter kualitas air, respons anco pakan, tren mortalitas, laju pertumbuhan, dan pengamatan visual terkini.",
        },
        {
          question: "Bagaimana Shrimply melindungi privasi data tambak?",
          answer: "Shrimply dirancang dengan sistem kepemilikan data perusahaan dan kontrol akses yang ketat, sehingga catatan internal tambak tidak akan pernah terekspos ke pembeli atau pihak luar kecuali diizinkan secara eksplisit.",
        },
      ]}
      related={[
        { href: "/id/shrimp-farm-management-software", label: "Software manajemen tambak udang", description: "Lihat bagaimana visibilitas risiko penyakit terintegrasi dalam operasional dan laporan kolam." },
        { href: "/id/features/water-quality-monitoring", label: "Monitoring kualitas air", description: "Tinjau kondisi kolam yang dapat memperkuat analisis stres dan risiko penyakit udang." },
        { href: "/id/features/growth-sampling", label: "Sampling pertumbuhan dan pelacakan mortalitas", description: "Hubungkan peringatan penyakit dengan dinamika pertumbuhan, nafsu makan, dan catatan kematian." },
        { href: "/resources/shrimp-disease-alerts", label: "Panduan peringatan penyakit udang", description: "Pelajari bagaimana konteks peringatan mendukung respons cepat tambak dan evaluasi biosekuriti." },
        { href: "/resources/white-feces-disease-shrimp", label: "Panduan penyakit berak putih (WFD)", description: "Pahami bagaimana gejala, respons pakan, dan catatan kolam membantu evaluasi penyakit." },
        { href: "/id/orson", label: "Orson AI untuk analisis risiko", description: "Lihat bagaimana Orson memanfaatkan data kolam terkini untuk menginterpretasikan sinyal pakan, air, dan penyakit." },
      ]}
    />
  );
}
