import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "vannamei-water-quality-parameters",
  section: "Air, Kesehatan, dan Risiko",
  label: "Kualitas Air",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "Parameter Kualitas Air Udang Vannamei: Rentang Target & Tanda Bahaya",
  description:
    "Panduan praktis parameter kualitas air untuk udang vaname (Litopenaeus vannamei), dengan rentang kontekstual untuk oksigen terlarut, suhu, pH, salinitas, alkalinitas, amonia, nitrit, dan nitrat.",
  readTime: "11 menit baca",
  tags: [
    "parameter kualitas air vannamei",
    "parameter kualitas air udang",
    "parameter air vaname",
    "kualitas air ideal untuk udang",
    "kualitas air tambak udang",
    "tabel kualitas air vannamei",
    "amonia aman untuk udang",
    "alkalinitas ideal udang",
    "salinitas ideal vannamei",
    "DO ideal vannamei",
    "pH ideal vannamei",
    "nitrit tambak udang",
    "monitoring kualitas air",
  ],
  publishedAt: "2026-08-31",
  image: {
    src: "/resources/images/vannamei-water-quality-parameters-infographic.png",
    alt: "Infografis Shrimply yang menampilkan acuan pertumbuhan udang vaname pada 10 hingga 20 ppt, rentang budidaya bersyarat yang lebih luas, serta pengingat untuk memantau oksigen, pH, suhu, amonia, nitrit, aklimatisasi, dan keseimbangan mineral",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Software Kualitas Air", href: "/id/features/water-quality-monitoring" },
  takeaways: [
    "Gunakan rentang parameter sebagai acuan praktis, bukan batas mutlak aman atau bahaya; fase hidup, salinitas, suhu, padat tebar, aklimatisasi, dan sistem kolam memengaruhi tingkat risiko.",
    "Untuk salinitas, 10–20 ppt merupakan acuan optimal pertumbuhan yang didukung oleh berbagai studi juvenil, meskipun udang vaname yang diaklimatisasi dengan baik dapat dibudidayakan pada rentang yang lebih luas.",
    "Interpretasikan TAN bersamaan dengan pH dan suhu, serta interpretasikan nitrit bersamaan dengan salinitas dan klorida; nitrat adalah parameter akumulasi jangka panjang yang terpisah.",
  ],
  faqs: [
    {
      question: "Apa saja parameter kualitas air yang ideal untuk udang vaname?",
      answer:
        "Acuan praktis untuk fase pembesaran adalah oksigen terlarut (DO) di atas 5 mg/L, suhu sekitar 28–32°C, pH sekitar 7,8–8,3 dengan fluktuasi harian yang rendah, salinitas sekitar 10–20 ppt jika sesuai dengan benur dan sumber air, alkalinitas sekitar 100–160 mg/L sebagai CaCO₃, serta senyawa nitrogen yang rendah dan stabil. Nilai-nilai ini merupakan titik acuan awal, bukan batas aman universal; bandingkan selalu dengan baseline kolam, perilaku udang, fase hidup, salinitas, suhu, dan metode pengujian.",
    },
    {
      question: "Berapa kadar amonia yang aman untuk tambak udang?",
      answer:
        "Pertahankan TAN tetap rendah dan stabil, namun jangan menilainya secara terpisah. Fraksi amonia bebas yang tidak terionisasi (NH₃) akan meningkat seiring kenaikan pH dan suhu, serta bervariasi menurut salinitas; oleh karena itu catatlah TAN, pH, suhu, salinitas, satuan pengukuran, dan waktu sampling secara bersamaan. Tren peningkatan atau perubahan abnormal pada nafsu makan, cara berenang, maupun kematian udang memerlukan investigasi segera meskipun angka pengukuran tampak masih dalam batas wajar.",
    },
    {
      question: "Berapa alkalinitas ideal untuk udang vaname?",
      answer:
        "Banyak tambak pembesaran menggunakan rentang 100–160 mg/L sebagai CaCO₃ sebagai acuan operasional, namun target efektif sangat bergantung pada salinitas, kesadahan (hardness), sistem budidaya, dan pergerakan pH harian. Pastikan keakuratan pengukuran dan hitung setiap penambahan bahan kapur/mineral berdasarkan volume kolam, kemurnian produk, kimia air, dan SOP tambak daripada menerapkan dosis seragam per hektar.",
    },
    {
      question: "Berapa salinitas ideal untuk budidaya udang vaname?",
      answer:
        "Sejumlah penelitian terkontrol melaporkan pertumbuhan juvenil yang sangat baik pada air payau rendah, termasuk rentang 5–15 ppt dan 10–30 ppt. Oleh karena itu, Shrimply menggunakan 10–20 ppt sebagai acuan praktis yang mendukung pertumbuhan, bukan sebagai batas optimum mutlak atau rentang isosmotik. Performa udang tetap dipengaruhi oleh fase hidup, suhu, proses aklimatisasi, serta keseimbangan kalium, magnesium, kalsium, kesadahan, dan alkalinitas.",
    },
    {
      question: "Berapa tingkat oksigen terlarut (DO) minimum yang aman untuk udang?",
      answer:
        "Usahakan oksigen terlarut sebelum fajar (pre-dawn DO) tetap berada di atas 4–5 mg/L dan waspadai tren penurunan. Risiko sangat dipengaruhi oleh suhu, salinitas, biomassa, durasi paparan, kondisi dasar kolam, dan kedalaman pengukuran. Jika DO rendah atau udang berkerumun di pinggir kolam atau dekat kincir, maksimalkan aerasi yang aman, hentikan penambahan pakan, lakukan pengecekan ulang di berbagai kedalaman, dan jalankan SOP darurat tambak.",
    },
    {
      question: "Berapa pH ideal untuk kolam vaname dan berapa fluktuasi harian yang aman?",
      answer:
        "Target praktisnya adalah sekitar pH 7,8–8,3 dengan perubahan pagi-ke-sore yang stabil dan relatif kecil. Fluktuasi yang lebih besar atau perubahan yang cepat merupakan sinyal peringatan untuk memeriksa alkalinitas, populasi alga, respirasi, cuaca, dan kalibrasi alat ukur; fluktuasi itu sendiri belum tentu langsung membuktikan adanya ledakan alga atau penyakit.",
    },
  ],
  sections: [
    {
      heading: "Jawaban singkat: Gunakan rentang parameter sesuai konteks kolam",
      body: [
        "Rentang parameter kualitas air adalah titik awal yang berguna, namun satu angka pengukuran saja tidak dapat membuktikan apakah kolam berada dalam kondisi aman atau berbahaya. Bandingkan selalu hasil pengukuran dengan catatan tren sebelumnya, waktu dan kedalaman pengukuran, perilaku udang, respons pakan di anco, biomassa, cuaca, serta rentang operasional normal tambak.",
        "Ambil tindakan terlebih dahulu pada bahaya langsung yang kritis seperti penurunan oksigen terlarut atau mortalitas udang. Untuk koreksi kimiawi air, konfirmasi ulang hasil tes dan ikuti SOP tambak atau saran ahli sebelum mengaplikasikan mineral, sumber karbon, probiotik, kapur, oksidator, atau produk lainnya.",
      ],
    },
    {
      heading: "Tabel referensi kualitas air udang vaname",
      body: [
        "Acuan fase pembesaran ini membantu menentukan parameter mana yang perlu diperiksa ulang dan diinvestigasi. Ini bukan resep penanganan langsung, dan metode laboratorium dapat melaporkan amonia atau nitrit sebagai nitrogen (N) maupun sebagai ion utuh; jangan membandingkan nilai sebelum satuannya dipastikan sama.",
      ],
      table: {
        columns: [
          "Parameter",
          "Acuan praktis",
          "Pantau ketat",
          "Perhatian khusus",
          "Konteks penentu risiko",
          "Waktu pengujian",
          "Tindakan awal yang aman",
        ],
        rows: [
          [
            "Oksigen Terlarut (DO)",
            "> 5,0 mg/L",
            "4,0–5,0 mg/L atau tren menurun",
            "Bertahan < 4,0 mg/L, terutama mendekati 3,0 mg/L atau disertai perilaku abnormal",
            "Suhu, salinitas, biomassa, durasi paparan, kedalaman, dan kebutuhan oksigen di dasar kolam",
            "Sebelum fajar (dini hari) dan sore hari; lebih sering saat biomassa tinggi, cuaca mendung, atau nafsu makan turun",
            "Maksimalkan aerasi kincir yang aman, tunda kenaikan pakan, periksa ulang di beberapa kedalaman, dan ikuti SOP darurat tambak. Lihat [Tren Kualitas Air](/id/resources/water-quality-trends).",
          ],
          [
            "Suhu Air",
            "Sekitar 28–32°C",
            "Perubahan di luar baseline tambak atau perubahan harian yang cepat",
            "Suhu dingin atau panas berkepanjangan disertai penurunan nafsu makan, DO rendah, atau perilaku abnormal",
            "Ukuran udang, aklimatisasi, salinitas, DO, cuaca, dan durasi paparan",
            "Pagi dan sore hari; setelah hujan lebat atau pergantian air",
            "Periksa DO dan respons pakan anco sebelum mengubah jatah pakan. Lihat [Tingkat Pemberian Pakan Vannamei](/id/resources/vannamei-feeding-rate).",
          ],
          [
            "pH",
            "Sekitar 7,8–8,3 dengan pergerakan harian yang terkendali",
            "Fluktuasi pagi-ke-sore yang melebar atau menyimpang dari baseline kolam",
            "Perubahan cepat, nilai berulang mendekati < 7,0 atau > 9,0, atau perilaku udang abnormal",
            "Alkalinitas, kepadatan alga, respirasi, hujan, salinitas, suhu, dan kalibrasi alat ukur",
            "Menjelang matahari terbit dan tengah sore di titik sampling yang konsisten",
            "Konfirmasi hasil pengujian, periksa alkalinitas dan alga, lalu gunakan rencana koreksi spesifik kolam. Lihat [Warna Air & Alga Kolam](/id/resources/shrimp-pond-water-colour-algae).",
          ],
          [
            "Salinitas",
            "10–20 ppt acuan optimal pertumbuhan",
            "Sekitar 5–35 ppt dapat mendukung budidaya jika udang teraklimatisasi dan kimia air sesuai",
            "Perubahan mendadak, keluar dari rentang aklimatisasi udang, atau penurunan nafsu makan dan kelangsungan hidup",
            "Fase hidup, suhu, aklimatisasi, kadar kalium, magnesium, kalsium, kesadahan, dan alkalinitas",
            "Mingguan serta setelah hujan lebat, penguapan tinggi, atau pergantian air",
            "Stabilkan perubahan, konfirmasi keseimbangan mineral, dan gunakan kalkulasi dosis tambak yang matang sebelum menambah garam/mineral. Bandingkan dengan [Sampling Pertumbuhan](/id/features/growth-sampling).",
          ],
          [
            "Total Alkalinitas (sebagai CaCO₃)",
            "Sekitar 100–160 mg/L",
            "Di bawah target tambak atau tren menurun disertai fluktuasi pH yang lebih lebar",
            "Ketidakstabilan terus-menerus, kondisi kulit lembek pasca-molting, atau gagal membaik",
            "Salinitas, kesadahan, jenis sistem budidaya, pH, kemurnian produk, dan volume kolam",
            "Mingguan serta setelah hujan lebat atau pergantian air besar",
            "Konfirmasi hasil dan hitung kebutuhan pengapuran berdasarkan volume kolam dan kimia air. Lihat [Panduan Pertumbuhan Udang Lambat](/id/resources/slow-shrimp-growth-adg-troubleshooting).",
          ],
          [
            "Total Ammonia Nitrogen (TAN)",
            "Pertahankan rendah dan stabil; < 0,5 mg/L adalah acuan operasional konservatif",
            "Tren peningkatan atau ≥ 0,5 mg/L",
            "Peningkatan kalkulasi NH₃-N, lonjakan terus-menerus, penurunan nafsu makan, perilaku abnormal, atau kematian",
            "pH, suhu, salinitas, satuan pengukuran, durasi paparan, biomassa, dan beban bahan organik",
            "Minimal dua kali seminggu pada pembesaran intensif; lebih sering jika ada tren kenaikan",
            "Tunda peningkatan pakan, konfirmasi pH dan suhu, periksa anco serta lumpur dasar kolam, dan ikuti rencana respons tambak.",
          ],
          [
            "Amonia Bebas Beracun (NH₃-N)",
            "Pertahankan serendah mungkin; < 0,05 mg/L adalah acuan konservatif",
            "0,05–0,10 mg/L atau tren meningkat",
            "≥ 0,10 mg/L, terutama saat pH tinggi, suhu tinggi, atau udang menunjukkan gejala abnormal",
            "TAN, pH, suhu, salinitas, metode kalkulasi, satuan, dan durasi paparan",
            "Hitung bersamaan dengan sampel TAN, pH, suhu, dan salinitas pada waktu yang sama",
            "Jaga pasokan oksigen, tunda peningkatan pakan, verifikasi hasil kalkulasi, dan jalankan SOP tambak untuk pengelolaan air atau penyiponan lumpur. Lihat [FCR & Pengurangan Sisa Pakan](/id/resources/fcr-shrimp-farming).",
          ],
          [
            "Nitrit (NO₂⁻-N)",
            "Pertahankan rendah dan stabil; < 0,2 mg/L NO₂-N adalah acuan konservatif",
            "Tren meningkat atau ≥ 0,2 mg/L NO₂-N",
            "Kenaikan berlanjut disertai salinitas atau klorida rendah, nafsu makan turun, warna atau perilaku udang abnormal, atau kematian",
            "Salinitas, klorida, satuan pengukuran, ukuran udang, durasi paparan, dan kondisi biologi/biofilter kolam",
            "Minimal dua kali seminggu pada fase akhir pembesaran; lebih sering saat ada tren kenaikan",
            "Konfirmasi satuan dan kadar klorida, jaga pasokan oksigen, evaluasi input pakan dan beban organik, serta buat rencana koreksi terhitung sebelum menambahkan garam.",
          ],
          [
            "Nitrat (NO₃⁻-N)",
            "Pertahankan stabil dan berada dalam target sistem tambak",
            "Tren peningkatan yang terus-menerus",
            "Nitrat tinggi atau terus naik disertai pertumbuhan lambat, nafsu makan lemah, atau masalah kualitas air lainnya",
            "Salinitas, tipe sistem, durasi paparan, satuan, tingkat pergantian air, dan senyawa nitrogen lainnya",
            "Setiap 1–2 minggu, atau lebih sering pada sistem dengan pergantian air rendah (minimal exchange)",
            "Konfirmasi tren dan evaluasi padatan tersuspensi, biofiltrasi, input pakan, serta manajemen air yang diizinkan. Lihat [Kartu Skor Performa Kolam](/id/resources/pond-performance).",
          ],
        ],
      },
    },
    {
      heading: "Mengapa angka parameter yang sama dapat menimbulkan tingkat risiko yang berbeda",
      body: [
        "Ambang batas dalam penelitian berasal dari beragam ukuran udang, salinitas, suhu, durasi paparan, dan sistem budidaya yang berbeda. Gunakan angka-angka tersebut untuk memandu investigasi lapangan, bukan untuk menggantikan pengamatan langsung di kolam atau SOP tambak.",
      ],
      items: [
        "Oksigen terlarut: Kadar DO di dasar kolam seringkali lebih rendah daripada di permukaan karena udang dan dekomposisi bahan organik mengonsumsi oksigen di dekat sedimen dasar. Ukur pada beberapa kedalaman dan lokasi representatif, jangan menganggap satu pembacaan di permukaan mewakili seluruh kolam.",
        "Suhu: Suhu mengubah metabolisme udang, kebutuhan oksigen, nafsu makan, dan proporsi TAN yang berubah menjadi racun NH₃. Sesuaikan pemberian pakan hanya setelah memeriksa respons udang di anco, kadar DO, dan tren suhu beberapa hari terakhir.",
        "pH dan alkalinitas: Fotosintesis alga menaikkan pH pada siang hari, sedangkan respirasi menurunkannya di malam hari. Alkalinitas bertindak sebagai penyangga (buffer) untuk menahan perubahan pH yang drastis, namun kesadahan dan keseimbangan mineral juga sangat menentukan kualitas karapas udang; satu hasil tes alkalinitas rendah belum cukup untuk memastikan penyebab masalah molting.",
        "Senyawa nitrogen: TAN mencakup ion amonium (NH₄⁺) dan amonia bebas (NH₃). Nitrit dapat menurunkan oksigenasi hemolimfa serta mengganggu hemosianin dan metabolisme energi udang, sedangkan nitrat umumnya dipantau sebagai masalah akumulasi jangka panjang. Pastikan apakah laboratorium melaporkan nilai sebagai nitrogen (N) atau ion utuh.",
      ],
    },
    {
      heading: "Salinitas: Acuan pertumbuhan berbeda dengan toleransi atau toksisitas",
      body: [
        "Studi terkontrol pada benur dan juvenil mendukung observasi petambak bahwa salinitas payau rendah dapat menghasilkan laju pertumbuhan yang sangat baik. [Bray et al.](https://doi.org/10.1016/0044-8486(94)90505-3) menemukan bobot akhir tertinggi pada salinitas 5 dan 15 ppt dibandingkan dengan 25, 35, dan 49 ppt, sementara studi di [Indian Journal of Fisheries](https://doi.org/10.21077/ijf.2017.64.2.59404-04) melaporkan pertumbuhan yang sama kuatnya pada rentang 10 hingga 30 ppt.",
        "Bukti tersebut memperkuat rentang 10–20 ppt sebagai acuan praktis yang menguntungkan bagi pertumbuhan, namun bukan berarti 10–20 ppt adalah batas optimum mutlak atau titik isosmotik untuk semua kondisi. Udang vaname mampu mentoleransi dan bertumbuh pada rentang salinitas yang lebih luas asalkan proses aklimatisasi, suhu, dan keseimbangan ion mineral terjaga dengan baik.",
        "Salinitas juga mengubah dinamika risiko kimiawi. Salinitas dan konsentrasi klorida yang rendah dapat meningkatkan penyerapan nitrit oleh udang, dan salinitas secara langsung memengaruhi kalkulasi toksisitas amonia. Hubungan-hubungan ini harus dievaluasi secara terpisah dari acuan pertumbuhan berbasis salinitas.",
      ],
    },
    {
      heading: "Bagaimana parameter utama saling berinteraksi",
      body: [
        "Tinjau keterkaitan antar-parameter sebelum memutuskan tingkat kegentingan atau menentukan langkah koreksi:",
      ],
      items: [
        "1. TAN + pH + suhu + salinitas: pH dan suhu yang lebih tinggi meningkatkan proporsi amonia bebas beracun (NH₃). Gunakan formula kalkulasi yang diakui dengan data pengukuran pada waktu yang sama, serta pastikan salinitas dan satuan pengukuran tercatat jelas.",
        "2. Nitrit + salinitas + klorida: Ion klorida dapat menghambat penyerapan nitrit pada insang udang, namun penelitian membuktikan bahwa sekadar menambahkan garam bukanlah solusi instan universal. Ukur kadar klorida dan nitrit, pastikan satuannya, dan hitung kebutuhan aplikasi secara tepat sesuai kondisi kolam.",
        "3. pH + alkalinitas + alga + cuaca: Fluktuasi pH harian yang melebar dapat dipicu oleh laju fotosintesis, respirasi malam hari, kapasitas penyangga alkalinitas, hujan, atau pergantian air. Pastikan polanya terlebih dahulu sebelum melakukan perlakuan pada kolam.",
        "4. DO sore + DO dini hari + biomassa: DO sore yang tinggi akibat fotosintesis tidak menjamin ketersediaan oksigen aman sebelum matahari terbit. Bandingkan kedua waktu pengukuran tersebut dan tingkatkan frekuensi pemantauan seiring bertambahnya biomassa, cuaca mendung, atau beban bahan organik.",
      ],
      note: "Jangan membandingkan hasil uji TAN, NH₃, nitrit, atau nitrat sebelum bentuk senyawa kimia dan satuan pengukuran yang dilaporkan terverifikasi dengan jelas.",
    },
    {
      heading: "Protokol pengujian kualitas air berdasarkan umur pemeliharaan (DOC)",
      body: [
        "Prioritas pemantauan terus berkembang seiring pertumbuhan udang dan akumulasi bahan organik sepanjang siklus budidaya:",
      ],
      items: [
        "Tahap nursery dan awal tebar (DOC 1–30): Prioritaskan stabilitas lingkungan, aklimatisasi benur, pengukuran pH pagi dan sore, DO, suhu, salinitas, alkalinitas, serta pengamatan cermat pasca pergantian atau penambahan air.",
        "Pertengahan pembesaran (DOC 30–70): Seiring meningkatnya porsi pakan dan biomassa udang, pantau DO dini hari, DO dan pH sore, TAN, nitrit, kontrol anco, serta akumulasi endapan dasar kolam secara lebih ketat.",
        "Tahap akhir/finishing (DOC 70+ hingga panen): Tentukan frekuensi monitoring berdasarkan biomassa aktual, cadangan daya aerasi, nafsu makan udang, tren terkini, dan rencana manajemen risiko tambak. Tingkatkan pengecekan jika DO turun, senyawa nitrogen naik, terjadi perubahan cuaca ekstrem, atau respons anco melemah.",
      ],
    },
    {
      heading: "Tindakan praktis saat parameter menyimpang dari rentang aman",
      body: [
        "Konfirmasi hasil pembacaan alat, lindungi udang dari ancaman bahaya langsung, dan pantau responsnya. Aplikasi produk kimia atau biologi memerlukan kalkulasi dosis spesifik kolam serta harus mematuhi izin edar, regulasi setempat, standar keamanan lingkungan, dan SOP tambak.",
      ],
      items: [
        "DO rendah: Segera hidupkan semua kincir dan aerasi cadangan yang aman, hentikan penambahan jatah pakan, amati sebaran udang, dan cek ulang DO di beberapa titik serta kedalaman. Ambil tindakan darurat jika udang berenang ke permukaan, menepi di tanggul, mendekati kincir, atau jika DO tidak kunjung naik.",
        "pH atau alkalinitas tidak normal: Ulangi pengujian dengan alat yang sudah terkalibrasi, bandingkan angka pagi dan sore, serta periksa pengaruh hujan, kepekatan alga, pergantian air, dan alkalinitas. Jangan mengurangi aerasi yang dibutuhkan atau menebar kapur, sumber karbon, maupun probiotik menggunakan dosis perkiraan tanpa perhitungan.",
        "Peningkatan TAN atau NH₃: Padukan data TAN dengan pH, suhu, dan salinitas; evaluasi sisa pakan di anco, endapan lumpur, padatan tersuspensi, dan sirkulasi air. Tunda penambahan pakan dan ikuti SOP tambak untuk penyesuaian pakan, pergantian air, atau penyiponan lumpur.",
        "Peningkatan nitrit: Pastikan satuan apakah dilaporkan sebagai NO₂-N atau NO₂, serta ukur kadar salinitas dan klorida. Evaluasi biofilter atau ekosistem mikrobial kolam, input pakan harian, dan beban organik; buat perhitungan terukur sebelum menambahkan garam atau bakteri pengurai.",
        "Mortalitas berlanjut atau udang tidak mau makan: Catat kronologi waktu dan riwayat kualitas air, amankan sampel udang yang representatif, dan segera hubungi dokter hewan tambak, tenaga ahli kesehatan hewan akuatik, laboratorium uji penyakit, atau konsultan teknis berpengalaman.",
      ],
    },
    {
      heading: "Cara memanfaatkan Shrimply untuk pencatatan kualitas air",
      body: [
        "Catat hasil pengukuran kualitas air per kolam dan waktu sampling secara konsisten, sehingga manajer tambak dapat memantau pergerakan tren terkini alih-alih mengandalkan ingatan atau satu kali pengujian sesaat.",
        "Catat pH, suhu, salinitas, dan amonia secara bersamaan jika berasal dari sesi pengukuran yang sama. Shrimply menyimpan dan menyinkronkan data tersebut; gunakan metode kalkulasi baku untuk menghitung fraksi NH₃ dan cantumkan metode kalkulasi serta satuan pada catatan kolam.",
        "Bandingkan riwayat kualitas air dengan catatan pakan harian, sampling mingguan, estimasi biomassa, dan angka mortalitas. Data ini memberikan konteks berharga untuk investigasi operasional, bukan sebagai penentu otomatis penyebab pertumbuhan lambat atau penyakit.",
      ],
    },
    {
      heading: "Kapan harus mencari bantuan laboratorium atau tenaga ahli",
      body: [
        "Tingkatkan eskalasi penanganan ketika kematian udang terus berlanjut, udang menunjukkan cara berenang atau penampakan fisik yang abnormal, nafsu makan tetap lemah selama beberapa kali jam pakan berturut-turut, parameter kualitas air anjlok atau melonjak drastis, perlakuan koreksi tidak membuahkan hasil, atau jika tim tambak kesulitan membedakan apakah masalah bersumber dari kesalahan alat ukur, kimia air, biologi kolam, atau serangan patogen penyakit.",
        "Siapkan dan bagikan data identitas kolam, DOC, padat tebar dan estimasi biomassa, riwayat pakan terkini, linimasa mortalitas, catatan cuaca dan pergantian air, hasil uji kualitas air terkalibrasi lengkap beserta satuan dan jam pengambilan sampel, dokumentasi foto, serta laporan laboratorium sebelumnya.",
      ],
    },
  ],
  checklist: [
    "Kalibrasi dan rawat DO meter serta pH meter secara berkala sesuai petunjuk pabrikan dan jadwal kontrol kualitas tambak.",
    "Ukur DO sebelum fajar (pre-dawn) dan sore hari pada kedalaman serta titik kolam yang konsisten, lalu analisis tren perubahannya.",
    "Catat TAN, pH, suhu, salinitas, jam pengujian, metode tes, bentuk senyawa kimia, dan satuan pengukuran secara bersamaan.",
    "Pantau fluktuasi pH pagi dan sore bersamaan dengan alkalinitas, kondisi cuaca, dan riwayat pergantian air.",
    "Pastikan satuan nitrit dan ukur konsentrasi klorida sebelum mempertimbangkan penambahan garam atau mineral.",
    "Hubungkan dinamika kualitas air dengan kontrol anco, riwayat pemberian pakan, hasil sampling pertumbuhan, biomassa, dan angka mortalitas.",
  ],
  sources: [
    {
      title: "Shrimp Culture: Pond Design, Operation and Management — Water Quality",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/4/AC210E/AC210E09.htm",
    },
    {
      title: "Pond Aeration and Water Quality in Commercial Aquaculture",
      publisher: "Boyd & Fast",
      url: "https://www.was.org",
    },
    {
      title: "The Effect of Salinity on Growth and Survival of Penaeus vannamei",
      publisher: "Aquaculture",
      url: "https://doi.org/10.1016/0044-8486(94)90505-3",
    },
    {
      title: "Growth and Carcass Mineralisation of Pacific Whiteleg Shrimp in Response to Water Salinity",
      publisher: "Indian Journal of Fisheries",
      url: "https://doi.org/10.21077/ijf.2017.64.2.59404-04",
    },
    {
      title: "Acute Toxicity of Ammonia on Litopenaeus vannamei Juveniles at Different Salinity Levels",
      publisher: "Journal of Experimental Marine Biology and Ecology",
      url: "https://doi.org/10.1016/S0022-0981(01)00227-1",
    },
    {
      title: "Nitrite Toxicity to Litopenaeus vannamei in Low-Salt Water",
      publisher: "Journal of the World Aquaculture Society",
      url: "https://doi.org/10.1111/j.1749-7345.2004.tb00109.x",
    },
    {
      title: "Aqueous Ammonia Equilibrium Calculations: Effect of pH and Temperature",
      publisher: "Journal of the Fisheries Research Board of Canada",
      url: "https://doi.org/10.1139/f75-274",
    },
  ],
};
