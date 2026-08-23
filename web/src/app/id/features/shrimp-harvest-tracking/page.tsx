import SeoLandingPageID from "@/components/SeoLandingPageID";
import { featureSeoPages_id, seoMetadataID } from "@/config/seo";

const page = featureSeoPages_id.find(item => item.path === "/id/features/shrimp-harvest-tracking");

export const metadata = seoMetadataID(page!, "/features/shrimp-harvest-tracking");

export default function ShrimpHarvestTrackingPageID() {
  return (
    <SeoLandingPageID
      path="/id/features/shrimp-harvest-tracking"
      eyebrow="Pelacakan Panen"
      title="Software pelacakan panen udang untuk hasil kolam dan riwayat produksi."
      intro="Shrimply membantu tambak melacak berat panen, size udang, hasil per kolam, total siklus, dan riwayat produksi sehingga pemilik dapat memahami hasil nyata dari setiap kolam."
      sections={[
        {
          title: "Catat hasil panen secara akurat",
          body: "Lacak berat hasil panen, size udang, dan hasil per kolam sehingga setiap siklus diakhiri dengan data produksi yang jelas, bukan catatan yang tercecer.",
        },
        {
          title: "Hubungkan panen dengan estimasi populasi",
          body: "Catatan panen memengaruhi sisa populasi kolam dan kinerja akhir siklus, sehingga Shrimply menjaga data panen selalu terhubung dengan kalkulasi kolam dan laporan.",
        },
        {
          title: "Tingkatkan kesiapan penjualan dan pembeli",
          body: "Catatan panen yang transparan membantu tambak memahami ketersediaan stok, rata-rata size, dan riwayat produksi saat merencanakan penjualan atau visibilitas pasar.",
        },
        {
          title: "Perhitungkan panen parsial dengan tepat",
          body: "Panen parsial mengubah sisa populasi kolam dan interpretasi biomassa, sehingga seluruh aktivitas panen harus selalu terikat dengan catatan siklus aktif.",
        },
        {
          title: "Sempurnakan evaluasi performa siklus",
          body: "Data panen melengkapi seluruh gambaran produksi dengan menghubungkan tebar benur, penggunaan pakan, sampling, mortalitas, kualitas air, biaya, dan hasil akhir.",
        },
      ]}
      checklist={[
        "Catat berat panen, size, tanggal, kolam, dan jenis panen (parsial atau total).",
        "Pisahkan panen parsial dari panen total saat meninjau hasil siklus.",
        "Perbarui konteks populasi dan biomassa setelah aktivitas panen dilakukan.",
        "Hubungkan hasil panen dengan laporan pakan, sampling, mortalitas, dan keuangan.",
        "Pastikan kesiapan pembeli dan perencanaan penjualan terhubung dengan data produksi terkini.",
      ]}
      faqs={[
        {
          question: "Mengapa catatan panen parsial sangat penting?",
          answer: "Panen parsial mengurangi biomassa dan jumlah udang di kolam sebelum siklus berakhir. Jika tidak dicatat, perhitungan FCR, biomassa, populasi, dan profitabilitas kolam dapat terdistorsi.",
        },
        {
          question: "Apa saja yang harus dicatat tambak saat panen?",
          answer: "Tambak harus mencatat kolam, tanggal, berat panen, size udang, jenis panen, konteks pembeli atau penjualan terkait, serta catatan pendukung yang menjelaskan hasilnya.",
        },
        {
          question: "Bagaimana pelacakan panen membantu laporan tambak?",
          answer: "Catatan panen menghubungkan output produksi dengan penggunaan pakan, mortalitas, sampling, biaya operasional, dan pendapatan sehingga pemilik dapat mengevaluasi hasil siklus secara menyeluruh.",
        },
      ]}
      related={[
        { href: "/id/shrimp-farm-management-software", label: "Software manajemen tambak udang", description: "Lihat bagaimana hasil panen melengkapi catatan produksi kolam secara menyeluruh." },
        { href: "/id/features/shrimp-farm-finance", label: "Pelacakan keuangan tambak udang", description: "Hubungkan berat panen, pendapatan, biaya produksi, dan evaluasi profitabilitas." },
        { href: "/id/features/growth-sampling", label: "Sampling pertumbuhan dan pelacakan biomassa", description: "Gunakan konteks MBW, biomassa, populasi, dan mortalitas sebelum merencanakan panen." },
        { href: "/resources/shrimp-harvest-tracking", label: "Panduan pelacakan panen udang", description: "Pelajari panduan untuk berat panen, size, panen parsial, dan hasil siklus." },
        { href: "/resources/pond-performance", label: "Panduan performa kolam", description: "Pahami perbandingan hasil akhir dengan data tebar benur, pakan, kualitas air, dan mortalitas." },
        { href: "/id/how-it-works", label: "Cara kerja Shrimply", description: "Ikuti alur bagaimana pencatatan lapangan menjadi bahan evaluasi manajer, laporan, dan riwayat produksi." },
      ]}
    />
  );
}
