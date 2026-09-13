import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultNutritionReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "vannamei-feeding-rate",
  section: "Pakan dan Inventaris",
  label: "Manajemen Pakan",
  author: defaultResourceAuthorID,
  reviewer: defaultNutritionReviewerID,
  title: "Tabel Feeding Rate Udang Vannamei & Kalkulator Pakan: Dosis Harian Berdasarkan Bobot Tubuh (ABW/MBW)",
  description:
    "Hitung estimasi ransum pakan harian dasar untuk udang vaname berdasarkan biomassa riil dan bobot rata-rata tubuh (ABW/MBW), lalu sesuaikan dengan kontrol anco, sampling mingguan, panen parsial, dan parameter kualitas air.",
  readTime: "9 menit baca",
  tags: [
    "feeding rate vannamei",
    "tabel pakan udang vaname",
    "tabel feeding rate vannamei",
    "kalkulator pakan udang",
    "pakan harian udang vaname",
    "feeding rate berdasarkan bobot tubuh",
    "persentase pakan udang",
    "kebutuhan pakan vannamei",
    "cara hitung pakan udang",
    "kontrol anco udang",
    "manajemen pakan tambak",
    "frekuensi pakan harian",
  ],
  publishedAt: "2026-08-31",
  image: {
    src: "/resources/images/vannamei-feeding-rate-calculator-infographic.png",
    alt: "Infografis feeding rate udang vannamei yang menampilkan cara estimasi biomassa, penerapan persentase pakan harian, pembagian frekuensi pakan, serta verifikasi baseline menggunakan kontrol anco, sampling bobot, dan kualitas air",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Software Manajemen Pakan & Inventaris", href: "/id/features/feed-inventory" },
  takeaways: [
    "Kalkulator pakan menggunakan kurva pembesaran terintegrasi Shrimply mulai dari ABW 1,65 g; angka ini adalah acuan dasar (baseline), bukan instruksi mutlak.",
    "Pakan harian (kg) = biomassa riil (kg) × feeding rate (%) ÷ 100.",
    "Jika biomassa diestimasi dari tebar benur, kurangi total panen parsial kumulatif setelah menerapkan estimasi tingkat kelangsungan hidup (SR).",
    "Konfirmasikan setiap hasil perhitungan ransum dengan kontrol beberapa anco, data sampling MBW dan mortalitas terkini, parameter kualitas air, serta tabel pakan dari produsen.",
  ],
  faqs: [
    {
      question: "Berapa feeding rate yang direkomendasikan untuk udang vannamei?",
      answer:
        "Tidak ada satu angka persentase tunggal yang aman untuk seluruh kondisi kolam. Kalkulator Shrimply menggunakan kurva dasar pembesaran yang menurun dari 6,5% biomassa per hari pada bobot 1,65–3 g ABW hingga 2,1% pada bobot di atas 33 g. Namun, ransum akhir tetap bergantung pada akurasi estimasi biomassa, formulasi pakan, pakan alami, suhu air, kadar oksigen terlarut (DO), serta respons nafsu makan riil di anco.",
    },
    {
      question: "Bagaimana cara menghitung pakan harian untuk udang vaname?",
      answer:
        "Kalikan biomassa riil kolam dengan persentase feeding rate lalu bagi 100: Pakan harian (kg) = biomassa (kg) × feeding rate (%) ÷ 100. Sebagai contoh, biomassa 3.000 kg dengan feeding rate acuan 3,3% menghasilkan pakan 99 kg/hari sebelum penyesuaian kontrol anco dan kualitas air.",
    },
    {
      question: "Berapa kali frekuensi pemberian pakan udang vannamei per hari?",
      answer:
        "Jadwal operasional tambak komersial umumnya membagi pakan harian menjadi 3 hingga 5 kali pemberian (feeding meals). Frekuensi ini bergantung pada ukuran udang, ketahanan stabilitas air pelet, metode pemberian pakan (manual atau autofeeder), ketersediaan tenaga kerja, dan kondisi kolam. Gunakan tabel produsen pakan dan SOP tambak sebagai jadwal awal, lalu evaluasi hasil kontrol anco dan kurva pertumbuhan sebelum merombak frekuensi.",
    },
    {
      question: "Berapa porsi pakan yang harus diletakkan di anco?",
      answer:
        "Kalkulator ini menggunakan nilai standar 1,2% dari total porsi per feeding meal yang dibagi rata ke seluruh anco, namun angka ini dapat disesuaikan dengan SOP tambak masing-masing. Berbagai literatur komersial merekomendasikan persentase anco yang bervariasi sesuai ukuran udang (umumnya 0,8%–2,0%), sehingga kunci utamanya adalah menjaga konsistensi metode dan membaca tren perubahan nafsu makan, bukan memperlakukan satu angka persentase sebagai aturan mutlak.",
    },
    {
      question: "Berapa lama waktu tunggu sebelum memeriksa anco pakan?",
      answer:
        "Waktu kontrol anco yang lazim diterapkan adalah sekitar 2,5 jam untuk benur fase juvenile awal, 1,5–2,0 jam pada pertengahan fase pembesaran, dan 1,0–1,5 jam untuk udang berukuran besar (>15 g). Selaraskan durasi kontrol dengan daya tahan pelet terhadap pelunakan air, ukuran udang, metode sebar pakan, serta SOP baku di tambak Anda.",
    },
    {
      question: "Bagaimana suhu air dan oksigen terlarut memengaruhi feeding rate udang?",
      answer:
        "Suhu air dan oksigen terlarut (DO) mengendalikan laju metabolisme serta nafsu makan udang secara langsung, namun respons udang berubah tergantung ukuran tubuh dan kecepatan fluktuasi parameter tersebut. Jika kadar DO berada di bawah target aman tambak (<4 mg/L) atau sedang anjlok, tunda atau kurangi porsi pakan, maksimalkan aerasi kincir air, dan ukur ulang sebelum memberikan pakan kembali; jangan hanya mengandalkan potongan persentase tebakan semata.",
    },
    {
      question: "Apakah Shrimply menghitung feeding rate dan estimasi biomassa secara otomatis?",
      answer:
        "Ya. Shrimply mengkalkulasi metrik kolam secara otomatis dari data tebar benur, angka kematian (mortalitas), panen parsial kumulatif, sampling bobot rata-rata (MBW), dan riwayat log pakan harian menggunakan kurva feeding rate yang sama persis dengan kalkulator ini. Ketika data historis mencukupi, sistem dapat menampilkan indikasi ketidaksesuaian rasio pakan terhadap biomassa (feed-to-biomass mismatch) untuk ditelusuri oleh teknisi tambak, tanpa membuat asumsi sepihak mengenai nafsu makan ataupun memvonis diagnosis biologis.",
    },
  ],
  sections: [
    {
      heading: "Jawaban ringkas: Hitung baseline, lalu verifikasi kondisi kolam",
      body: [
        "Estimasi biomassa riil kolam, terapkan persentase feeding rate sesuai bobot rata-rata tubuh (ABW/MBW) valid terkini, lalu bagi total ransum harian ke dalam jadwal frekuensi pakan harian tambak.",
        "Hasil hitungan kalkulator hanyalah ransum acuan awal (baseline). Bias estimasi biomassa, panen parsial, ketersediaan pakan alami, mutu pakan, fluktuasi suhu, kadar oksigen terlarut (DO), dan status kesehatan udang semuanya dapat mengubah daya konsumsi pakan aktual di kolam.",
        "Periksa beberapa anco representatif dan tinjau riwayat data sampling bobot, mortalitas harian, panen parsial, serta parameter kualitas air sebelum memutuskan untuk menaikkan atau mempertahankan dosis pakan yang dihitung.",
      ],
    },
    {
      heading: "Kurva baseline feeding rate vannamei",
      body: [
        "Tabel di bawah merangkum titik acuan dalam kurva pembesaran terstandar Shrimply. Kalkulator menggunakan interpolasi linier antartitik bobot sehingga persentase feeding rate berubah secara mulus seiring kenaikan bobot rata-rata tubuh (ABW/MBW).",
        "Tabel panduan komersial yang dipublikasikan dapat bervariasi karena perbedaan formulasi pelet, padat tebar, produktivitas pakan alami, stabilitas air, dan target rasio konversi pakan (FCR). Perlakukan kurva ini sebagai acuan manajemen dasar yang konsisten, lalu bandingkan dengan rekomendasi pabrik pakan dan respons riil udang di kolam.",
      ],
      table: {
        columns: [
          "Titik acuan bobot (ABW/MBW)",
          "Feeding rate dasar (% biomassa/hari)",
        ],
        rows: [
          ["1,65–3,0 g", "6,5%"],
          ["5,0 g", "5,5%"],
          ["7,5 g", "4,2%"],
          ["10,5 g", "3,6%"],
          ["14,0 g", "3,3%"],
          ["17,5 g", "3,1%"],
          ["21,0 g", "2,9%"],
          ["25,0 g", "2,7%"],
          ["29,0 g", "2,5%"],
          ["33,0 g", "2,3%"],
          ["> 33,0 g", "2,1%"],
        ],
      },
      note: "Jangan gunakan kurva pembesaran ini untuk udang dengan bobot di bawah 1,65 g ABW. Pemberian pakan fase pendedahan (nursery) umumnya mengikuti protokol hatchery atau tabel produsen pakan berdasarkan jumlah tebar post-larva (PL) dan umur pemeliharaan (DOC).",
    },
    {
      heading: "Kalkulator Pakan Udang Vannamei Interaktif",
      body: [
        "Gunakan kalkulator ini untuk udang dengan bobot 1,65 g ABW ke atas. Masukkan estimasi biomassa riil yang sudah diketahui, atau hitung perkiraan biomassa dari jumlah tebar awal benur, estimasi kelangsungan hidup (survival rate/SR), jumlah panen parsial kumulatif, dan bobot rata-rata tubuh (ABW/MBW).",
        "Fitur kalkulator ini menggunakan kurva interpolasi linier yang sama persis dengan modul kalkulasi kolam Shrimply. Kalkulator membagi total ransum harian dasar dengan frekuensi pemberian pakan yang Anda tentukan, lalu menghitung takaran pakan yang harus diletakkan pada setiap anco pemantau.",
      ],
      note: "Ransum hasil hitungan bukanlah batas mutlak ataupun instruksi kaku. Jika kontrol anco, parameter kualitas air, cuaca, perilaku udang, atau tren pertumbuhan bobot tidak sejalan dengan angka kalkulator, ikuti SOP pemberian pakan aman tambak Anda dan investigasi penyebabnya sebelum jadwal pakan berikutnya.",
    },
    {
      heading: "Cara menghitung pakan harian udang: Rumus biomassa",
      body: [
        "Untuk menghitung alokasi pakan harian dasar, gunakan estimasi biomassa riil terkini dan persentase feeding rate sesuai bobot rata-rata udang (ABW/MBW) valid terakhir.",
        "Rumus perhitungan utama adalah: Pakan Harian (kg) = Biomassa Kolam (kg) × [Feeding Rate (%) ÷ 100]",
        "Jika biomassa belum diketahui secara pasti: Populasi Udang Riil = (Jumlah Tebar Awal × Estimasi SR %) − Jumlah Ekor Panen Parsial Kumulatif. Estimasi Biomassa (kg) = Populasi Riil × ABW (g) ÷ 1.000.",
        "Contoh Perhitungan 1: Pada bobot 12,0 g ABW, kurva terintegrasi menghasilkan angka interpolasi feeding rate dasar 3,47%. Dengan estimasi biomassa 3.500 kg, kebutuhan pakan harian adalah 3.500 × 0,0347 = 121,5 kg/hari, atau sekitar 30,4 kg per pemberian jika dibagi ke dalam 4 kali feeding meal.",
        "Contoh Perhitungan 2: Dari tebar awal 200.000 benur dengan asumsi SR 80% dan 20.000 ekor telah diambil melalui panen parsial, populasi tersisa adalah 140.000 ekor. Pada bobot 8,0 g ABW, biomassa kolam adalah 1.120 kg dan feeding rate terinterpolasi adalah 4,10%, menghasilkan dosis pakan 45,9 kg/hari sebelum penyesuaian kontrol anco dan kualitas air.",
      ],
    },
    {
      heading: "Manajemen anco pakan: Jaga konsistensi metode pemantauan",
      body: [
        "Anco (feed trays / lift nets) membantu teknisi dan operator tambak membandingkan respons nafsu makan udang dari waktu ke waktu. Namun anco tidak mencerminkan nafsu makan setiap individu udang di seluruh penjuru kolam.",
        "Berbagai pedoman komersial merekomendasikan persentase pakan anco dan durasi kontrol yang bervariasi sesuai ukuran udang. Kalkulator menetapkan nilai standar 1,2% dari tiap porsi pakan yang dibagi rata ke seluruh anco; sesuaikan angka ini dengan SOP tertulis tambak Anda, dan pastikan posisi titik anco, ketepatan waktu kontrol, serta takaran pakan anco selalu konsisten.",
        "Gunakan beberapa anco representatif di titik yang berbeda. Hindari menempatkan seluruh anco hanya pada satu jalur arus kincir, sudut kolam yang mati arusnya, atau area penumpukan lumpur pekat (sludge), karena penempatan yang bias dapat menyesatkan evaluasi konsumsi pakan.",
      ],
      items: [
        "Semua anco bersih pada satu waktu kontrol: Catat hasilnya, tetapi jangan langsung menaikkan jatah pakan hanya dari satu kali pengamatan anco bersih. Konfirmasikan tren konsistensinya, laju pertambahan bobot harian (ADG) terkini, serta stabilitas kualitas air.",
        "Sisa pakan lebih dari 10% di beberapa anco: Pangkas jatah pakan pada jadwal berikutnya sesuai SOP tambak, lalu segera periksa kadar oksigen terlarut (DO), suhu air, fluktuasi pH, kondisi cuaca, dan perilaku berenang udang.",
        "Hasil anco bertolak belakang (sebagian bersih, sebagian bersisa banyak): Evaluasi pemerataan sebaran tebar pakan, posisi peletakan anco, arah arus kincir, sebaran lumpur dasar, serta pastikan seluruh anco diisi pakan dan diangkat pada waktu yang seragam.",
        "Nafsu makan di anco terus lemah atau angka mortalitas meningkat: Hentikan kenaikan pakan dan segera konsultasikan dengan dokter hewan akuatik atau tenaga ahli patologi; hasil pantauan anco semata tidak dapat mendiagnosis infeksi penyakit.",
      ],
    },
    {
      heading: "Pemeriksaan parameter air dan cuaca sebelum pemberian pakan",
      body: [
        "Oksigen terlarut (DO): Periksa nilai DO terkini dan tren grafiknya sebelum memberi pakan, terutama pada jam kritis menjelang subuh (pre-dawn) dan setelah cuaca ekstrem. Jika DO berada di bawah target aman tambak (<4 mg/L) atau terus merosot, prioritaskan aerasi kincir air, tunda atau kurangi porsi pakan, dan ukur ulang sebelum melanjutkan jadwal makan.",
        "Suhu air: Respons metabolisme dan nafsu makan udang berubah drastis seiring fluktuasi suhu dan ukuran tubuh. Riset ilmiah membuktikan bahwa suhu optimal untuk pertumbuhan maksimal bersifat spesifik terhadap ukuran udang, sehingga formula pengali suhu tunggal tidak dapat dijadikan patokan mutlak di semua kolam.",
        "Hujan lebat, pergeseran fitoplankton, fluktuasi pH, dan perubahan salinitas: Bandingkan kondisi kolam dengan rentang normal harian dan respons anco sebelumnya. Lakukan penyesuaian pakan secara bertahap dan dapat dikembalikan (reversible), lalu konfirmasi pada kontrol anco berikutnya daripada memangkas pakan secara drastis dan membabi buta.",
        "Pakan alami dan mutu pelet pakan: Ketersediaan pakan alami di kolam, stabilitas pelet di air, palatabilitas (daya tarik aroma), dan kepadatan nutrisi memengaruhi nafsu makan udang terhadap pelet komersial. Ikuti spesifikasi label pabrik pakan dan periksa kualitas penyimpanan gudang jika respons anco mendadak anjlok.",
      ],
    },
    {
      heading: "Otomatisasi feeding rate dan pelacakan biomassa di Shrimply",
      body: [
        "Shrimply mengintegrasikan data tebar benur, catatan mortalitas harian, riwayat panen parsial kumulatif, dan sampling MBW terkini untuk mengestimasi populasi serta biomassa kolam secara otomatis. Data yang kosong atau terlambat dicatat dapat menurunkan keakuratan estimasi, sehingga aplikasi dirancang untuk mendukung—bukan menggantikan—kontrol fisik di lapangan.",
        "Kurva feeding rate di halaman ini terhubung langsung dengan mesin kalkulasi kolam Shrimply. Ketika data historis mencukupi, dashboard kolam membandingkan biomassa berbasis pakan dengan biomassa hasil sampling jala, lalu menandai ketidaksesuaian berulang untuk diinvestigasi oleh tim tambak.",
        "Pencatatan pemberian pakan riil secara otomatis memotong stok inventaris pakan di gudang. Sebaliknya, pencatatan sampling biologis menyimpan data MBW dan konteks pakan tanpa memotong stok gudang, sehingga mencegah data observasi biologis tercatat keliru sebagai mutasi logistik pakan.",
      ],
    },
    {
      heading: "Tanda-tanda peringatan kesalahan alokasi pakan",
      body: [
        "Pahami gejala berikut sebagai sinyal observasi lapangan yang wajib diperiksa, bukan vonis mutlak atas satu penyebab tunggal:",
      ],
      items: [
        "Indikasi overfeeding (pemberian pakan berlebih): Pakan berulang kali tersisa di banyak anco, nilai FCR membengkak, ketidaksesuaian rasio pakan terhadap biomassa meningkat, dasar kolam menghitam dan berbau busuk, atau tren penurunan oksigen terlarut (DO) dini hari.",
        "Indikasi underfeeding (pemberian pakan kurang): Anco selalu bersih habis disertai laju pertumbuhan lambat (ADG rendah), udang agresif mencari makan di pinggiran kolam, atau total ransum harian terus berada jauh di bawah baseline biomassa.",
        "Indikasi masalah distribusi pakan: Hasil anco sangat bertolak belakang antarlokasi atau variasi ukuran udang (disparitas size) melebar tajam. Evaluasi radius sebaran tebar pakan, pola arus kincir air, titik peletakan anco, metode sampling jala, dan estimasi populasi sebelum menyimpulkan total pakan salah.",
        "Indikasi bias data pencatatan: Terjadi lonjakan atau penurunan drastis kurva pakan secara mendadak akibat catatan mortalitas, panen parsial, pakan harian, atau sampling MBW yang terlewat. Perbaiki catatan data terlebih dahulu sebelum melakukan perombakan dosis pakan besar-besaran.",
      ],
    },
    {
      heading: "Kapan harus menghentikan kenaikan pakan dan berkonsultasi dengan ahli",
      body: [
        "Segera eskalasikan penanganan ke dokter hewan akuatik atau spesialis patologi ketika angka kematian terus berlanjut, udang menunjukkan pola renang abnormal atau perubahan morfologi organ, nafsu makan di anco tetap lemah selama beberapa jadwal makan berturut-turut, parameter kualitas air sulit distabilkan, atau kondisi kolam tidak membaik setelah koreksi hati-hati. Hasil pantauan anco dan kalkulator pakan tidak dapat mengonfirmasi keberadaan infeksi penyakit menular.",
      ],
    },
  ],
  checklist: [
    "Gunakan bobot rata-rata udang (ABW/MBW) valid terkini dan estimasi populasi riil yang telah memperhitungkan mortalitas serta panen parsial kumulatif.",
    "Hitung dosis pakan baseline harian dan bagi ke dalam frekuensi feeding meal sesuai SOP tambak.",
    "Isi pakan, letakkan, dan kontrol beberapa anco pemantau dengan metode dan durasi yang konsisten setiap saat.",
    "Periksa kadar oksigen terlarut (DO), suhu air, tren pH, kondisi cuaca, dan perilaku udang sebelum menaikkan jatah pakan.",
    "Lakukan penyesuaian pakan dalam skala kecil yang dapat dikembalikan (reversible), lalu konfirmasi pada kontrol anco berikutnya dan hasil sampling bobot mingguan.",
    "Catat pemberian pakan riil terpisah dari sampling biologis agar mutasi inventaris gudang dan kalkulasi FCR tetap akurat dan tepercaya.",
  ],
  sources: [
    {
      title: "Modelling and simulation of feeding rate for Litopenaeus vannamei based on body weight and environmental parameters",
      publisher: "Automatika",
      url: "https://www.tandfonline.com/doi/abs/10.1080/00051144.2022.2031540",
    },
    {
      title: "Study and Analysis of Feeds and Fertilizers for Sustainable Aquaculture Development: Indonesia",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/4/a1444e/a1444e09.pdf",
    },
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
    {
      title: "Temperature Effects on Growth, Feeding Rate and Feed Conversion of the Pacific White Shrimp",
      publisher: "Aquaculture",
      url: "https://doi.org/10.1016/0044-8486(95)00032-1",
    },
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
  ],
};
