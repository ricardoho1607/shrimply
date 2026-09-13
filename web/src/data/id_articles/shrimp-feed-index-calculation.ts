import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultNutritionReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-feed-index-calculation",
  section: "Pakan dan Inventaris",
  label: "Manajemen Pakan",
  author: defaultResourceAuthorID,
  reviewer: defaultNutritionReviewerID,
  title: "Indeks Pakan Udang: Cara Menghitung Pakan Harian Tanpa Tebak-tebakan",
  description: "Pelajari cara metode indeks pakan udang mengestimasi pakan harian dari DOC, populasi, dan target ADG—serta cara menyesuaikannya dengan data riil kolam dan kontrol anco.",
  readTime: "8 menit baca",
  tags: [
    "indeks pakan udang",
    "rumus indeks pakan",
    "perhitungan pakan harian",
    "DOC udang",
    "ADG udang",
    "feeding rate",
    "kontrol anco",
    "manajemen pakan vannamei",
  ],
  publishedAt: "2026-08-28",
  image: {
    src: "/resources/images/shrimp-feed-index-calculation-infographic.png",
    alt: "Infografis Shrimply yang menunjukkan bagaimana DOC, populasi udang, target ADG, kontrol anco, sampling, kualitas air, dan mortalitas memandu perhitungan indeks pakan harian",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Software Manajemen Pakan", href: "/id/features/feed-inventory" },
  takeaways: [
    "Indeks pakan memberikan takaran ransum harian awal berdasarkan DOC, estimasi populasi, dan target pertambahan bobot harian (ADG).",
    "Kontrol anco, sampling berkala, estimasi survival rate (SR), catatan mortalitas, panen parsial, dan dinamika kualitas air wajib menjadi penentu akhir penyesuaian pakan.",
    "Indeks pakan berfungsi sebagai perencanaan ke depan (forward planning), sedangkan FCR mengevaluasi efisiensi pakan yang telah terpakai terhadap biomassa yang dihasilkan.",
  ],
  faqs: [
    {
      question: "Bagaimana cara menghitung ransum indeks pakan udang?",
      answer: "Rumus praktis yang umum digunakan adalah: pakan harian (kg) = DOC × populasi udang × (indeks pakan ÷ 100) ÷ 1.000. Jadikan hasil perhitungan ini sebagai takaran awal (starting ration), lalu koreksi secara berkala berdasarkan pengamatan anco dan data riil kondisi kolam.",
    },
    {
      question: "Apakah indeks pakan sama dengan FCR (Feed Conversion Ratio)?",
      answer: "Tidak. Indeks pakan digunakan untuk merencanakan alokasi pakan harian ke depan sebelum ditebar, sedangkan FCR adalah indikator evaluasi retrospektif yang membandingkan total pakan yang sudah dikonsumsi dengan pertambahan biomassa yang berhasil dipanen.",
    },
    {
      question: "Kapan sebaiknya beralih dari metode indeks pakan ke feeding rate berdasarkan persentase biomassa?",
      answer: "Metode indeks pakan umumnya digunakan pada fase awal hingga pertengahan (DOC 15–40) saat sampling jala belum representatif atau blind feeding mulai dikurangi. Begitu udang mencapai ukuran yang dapat disampling secara akurat (biasanya DOC 30–40 ke atas dengan MBW > 4–5 gram), teknisi dapat mengombinasikan atau beralih ke feeding rate berbasis persentase bobot tubuh (% biomassa) yang dipadukan dengan kontrol anco ketat.",
    },
    {
      question: "Bagaimana cara menyesuaikan indeks pakan jika terjadi mortalitas atau panen parsial?",
      answer: "Perbarui angka estimasi populasi dalam rumus. Jika populasi awal berkurang akibat mortalitas kumulatif atau setelah panen parsial, gunakan angka populasi aktif terkini agar perhitungan tidak menghasilkan kelebihan pakan (overfeeding) yang mencemari dasar kolam.",
    },
  ],
  sections: [
    {
      heading: "Ringkasan cepat",
      body: [
        "Indeks pakan (feed index) adalah metode perencanaan untuk mengestimasi berapa kilogram pakan yang harus diberikan ke kolam udang setiap hari. Metode ini mengintegrasikan umur pemeliharaan (Day of Culture/DOC), estimasi populasi udang di kolam, serta angka indeks pilihan yang berkaitan erat dengan target pertambahan bobot harian (Average Daily Growth/ADG).",
        "Angka yang dihasilkan rumus ini hanyalah takaran awal (starting baseline). Pengamatan nampan kontrol pakan (anco), sampling bobot udang, tingkat kelangsungan hidup (SR), catatan mortalitas, pengurangan populasi pasca panen parsial, serta parameter kualitas air harian tetap harus menjadi penentu utama dalam menetapkan pakan akhir.",
      ],
    },
    {
      heading: "Rumus perhitungan indeks pakan udang",
      body: [
        "Rumus praktis yang umum diaplikasikan di tambak komersial adalah: pakan harian (kg) = DOC × populasi udang × (indeks pakan ÷ 100) ÷ 1.000.",
        "Sebagai contoh simulasi: sebuah kolam berada pada DOC 30 dengan populasi udang aktif sebanyak 100.000 ekor dan manajer memilih indeks pakan sebesar 0,40. Perhitungannya adalah: 30 × 100.000 × (0,40 ÷ 100) ÷ 1.000 = 12 kg/hari.",
        "Dengan demikian, alokasi pakan acuan untuk hari tersebut adalah 12 kg per hari, yang selanjutnya dibagi merata ke dalam frekuensi jadwal pemberian pakan harian tambak (misalnya 4 atau 5 kali feeding per hari).",
      ],
    },
    {
      heading: "Cara menentukan nilai indeks pakan",
      body: [
        "Sebagian besar praktisi tambak menetapkan nilai indeks awal berkisar antara 1,5 hingga 2 kali target ADG. Sebagai contoh, jika target pertambahan bobot harian (ADG) adalah 0,20 gram/hari, maka indeks pakan awal yang dipilih umumnya berada pada rentang 0,30 hingga 0,40.",
        "Pendekatan ini merupakan konvensi perencanaan operasional tambak, bukan hukum biologis mutlak. Nilai indeks yang tepat sangat dipengaruhi oleh ukuran bobot udang, kandungan nutrisi pakan, padat tebar, tingkat kelangsungan hidup (survival rate/SR), kondisi dasar kolam, metode penebaran pakan (manual vs auto-feeder), serta histori performa siklus-siklus sebelumnya.",
      ],
    },
    {
      heading: "Perbedaan indeks pakan, feeding rate, dan FCR",
      body: [
        "Indeks pakan berorientasi ke depan (prospektif), sedangkan FCR berorientasi ke belakang (retrospektif). Tidak ada satu pun dari parameter ini yang boleh dianalisis secara terisolasi tanpa data pendukung.",
      ],
      table: {
        columns: ["Indikator / Parameter", "Tujuan Utama", "Waktu Penggunaan"],
        rows: [
          ["Indeks Pakan (Feed Index)", "Merencanakan alokasi pakan harian berdasarkan DOC, estimasi populasi, dan target ADG", "Sebelum pemberian pakan (perencanaan harian)"],
          ["Feeding Rate (% Biomassa)", "Menghitung takaran pakan harian sebagai persentase dari estimasi biomassa riil", "Setelah sampling bobot udang yang representatif"],
          ["FCR (Rasio Konversi Pakan)", "Mengevaluasi efisiensi total pakan yang dikonsumsi terhadap pertambahan biomassa yang dihasilkan", "Saat evaluasi mingguan atau pasca panen"],
        ],
      },
    },
    {
      heading: "Penyebab perhitungan indeks pakan bisa meleset",
      body: [
        "Rumus ini berisiko menghasilkan estimasi pakan yang berlebihan (overestimating) jika teknisi terus memakai angka tebar awal tanpa memperhitungkan mortalitas kumulatif atau pengurangan udang pasca panen parsial. Sebaliknya, rumus dapat menghasilkan pakan yang kurang (underestimating) jika laju pertumbuhan udang melampaui ekspektasi atau nilai indeks yang dipilih terlalu rendah.",
        "Bias sampling biologis juga dapat mengacaukan keputusan. Sampling jala yang hanya menjaring udang-udang berukuran besar dan aktif di dekat tepi kolam akan menghasilkan rata-rata bobot tubuh (MBW) dan estimasi biomassa semu yang terlalu tinggi.",
        "Panduan manajemen pakan dari FAO (Food and Agriculture Organization) menegaskan bahwa program pemberian pakan udang harus bersifat dinamis terhadap ukuran udang, estimasi populasi aktual, dinamika lingkungan kolam, dan perilaku makan nyata di anco—bukan sekadar terpaku kaku pada angka tabel dari awal hingga akhir siklus.",
      ],
    },
    {
      heading: "Langkah aman menyesuaikan takaran pakan harian",
      body: [
        "Manajemen pakan harus terus beradaptasi seiring bertambahnya bobot udang dan pergeseran parameter lingkungan perairan kolam.",
      ],
      ordered: true,
      items: [
        "Periksa beberapa nampan anco sekaligus: Satu anco yang bersih atau masih bersisa tidak dapat mewakili kondisi nafsu makan seluruh petak kolam.",
        "Evaluasi data sampling terbaru: Bandingkan realisasi MBW dan ADG dengan target pertumbuhan yang digunakan saat memilih indeks pakan.",
        "Koreksi estimasi populasi aktif: Masukkan catatan mortalitas harian dan pengurangan populasi dari setiap kali panen parsial.",
        "Periksa parameter kualitas air: Pastikan kadar oksigen terlarut (DO), suhu air, pH, amonia (TAN), dan nitrit dalam kondisi aman sebelum memutuskan menaikkan pakan.",
        "Lakukan perubahan secara bertahap: Hindari lonjakan pakan drastis hanya karena anco habis bersih pada satu kali jadwal feeding.",
        "Konfirmasi respons kolam: Pantau pengamatan anco berikutnya, dinamika kualitas air harian, tren mortalitas, dan hasil sampling sepekan kemudian.",
      ],
      note: "Jangan menaikkan pakan secara otomatis setiap hari hanya karena angka kalkulator bertambah. Algoritma rumus tidak dapat melihat nafsu makan udang yang menurun, fase molting massal, defisit oksigen terlarut, ancaman penyakit, atau penurunan survival rate yang luput dari pencatatan.",
    },
    {
      heading: "Tanda bahaya bahwa indeks pakan perlu ditinjau ulang",
      body: [
        "Gejala kelebihan alokasi pakan (overfeeding) meliputi: pakan tersisa secara berulang di beberapa anco, angka FCR melonjak sementara ADG stagnan, konsumsi pakan kumulatif naik jauh lebih cepat daripada pertambahan biomassa, kadar oksigen terlarut (DO) fajar terus menurun, serta lonjakan amonia, nitrit, busa pekat, atau akumulasi lumpur organik di central drain.",
        "Gejala kekurangan alokasi pakan (underfeeding) meliputi: anco selalu habis sangat cepat pada beberapa jadwal berturut-turut, ADG udang tertinggal di bawah target tanpa adanya indikasi stres kualitas air atau penyakit, variasi ukuran udang semakin timpang, atau populasi dan biomassa riil sebenarnya lebih tinggi dari estimasi kerja.",
        "Indikasi-indikasi ini adalah sinyal peringatan operasional, bukan vonis mutlak. Selalu periksa data riwayat kolam secara menyeluruh sebelum merombak drastis ransum pakan harian.",
      ],
    },
    {
      heading: "Gunakan Shrimply untuk mengontrol dan mengevaluasi indeks pakan",
      body: [
        "Dokumentasikan realisasi pemberian pakan aktual di [Inventaris & Riwayat Pakan](/id/features/feed-inventory). Manfaatkan fitur [Sampling Pertumbuhan](/id/features/growth-sampling) untuk membandingkan perkembangan MBW dan ADG terhadap target budidaya. Catat mortalitas dan pelaksanaan panen parsial agar estimasi populasi udang tetap realistis.",
        "Bandingkan fluktuasi pakan harian dengan tren parameter di [Pemantauan Kualitas Air](/id/features/water-quality-monitoring), serta sinkronkan mutasi stok fisik di gudang pakan sebelum mempercayai angka FCR. Catatan sampling berfungsi memantau pertumbuhan biologis dan tidak boleh memotong stok pakan gudang; hanya pencatatan pemberian pakan nyata yang memotong saldo inventaris pakan.",
        "Bagi tambak yang mengutamakan pendekatan persentase biomassa daripada kurva indeks DOC, gunakan [Tabel & Kalkulator Feeding Rate Vannamei](/id/resources/vannamei-feeding-rate) sebagai panduan acuan operasional.",
      ],
    },
    {
      heading: "Kapan harus berkonsultasi dengan tenaga ahli akuakultur",
      body: [
        "Segera lakukan eskalasi teknis apabila respons makan udang di anco terus melemah, mortalitas berlanjut di central drain, udang menunjukkan perilaku berenang abnormal atau kelesuan di tepi kolam, fluktuasi kualitas air tidak kunjung stabil, atau pertumbuhan terhenti (stunting) meskipun catatan pakan dan sampling telah terverifikasi dengan baik. Jangan pernah mendiagnosis infeksi patogen hanya dari sisa pakan di anco atau laju pertumbuhan yang lambat tanpa konfirmasi uji laboratorium diagnostik (PCR).",
      ],
    },
  ],
  checklist: [
    "Hitung ransum indeks pakan dari data DOC, estimasi populasi, dan indeks target tambak.",
    "Perlakukan hasil perhitungan sebagai takaran acuan awal, bukan instruksi tebar pakan mutlak tanpa kontrol.",
    "Periksa beberapa anco sekaligus dan tinjau catatan terkini MBW, ADG, mortalitas, panen parsial, serta parameter kualitas air.",
    "Perbarui estimasi populasi udang setelah ditemukan data mortalitas nyata atau pelaksanaan panen parsial.",
    "Lakukan penyesuaian pakan secara bertahap dan konfirmasi respons udang di anco sebelum melakukan perubahan berikutnya.",
  ],
  sources: [
    {
      title: "Monte Carlo Algorithm Applications in Shrimp Farming: Monitoring Systems and Feed Optimization",
      publisher: "International Journal of New Media Technology",
      url: "https://ejournals.umn.ac.id/index.php/IJNMT/article/download/4301/1780/19422",
    },
    {
      title: "How Much Feed Will They Need? How Do I Feed and How Often?",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/4/s4314e/s4314e09.htm",
    },
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
  ],
};
