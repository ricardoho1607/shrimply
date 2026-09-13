import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultTechnicalReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-pond-water-colour-algae",
  section: "Air, Kesehatan, dan Risiko",
  label: "Kualitas Air",
  author: defaultResourceAuthorID,
  reviewer: defaultTechnicalReviewerID,
  title: "Warna Air Tambak Udang: Jenis Alga, Risiko, dan Solusinya",
  description: "Pelajari arti warna air tambak hijau, cokelat, hijau-biru, merah, bening, atau gelap, serta cara memantau dan mengelola kestabilan alga secara aman.",
  readTime: "13 menit baca",
  tags: [
    "warna air tambak udang",
    "fitoplankton tambak udang",
    "alga tambak udang",
    "sianobakteri",
    "alga crash",
    "oksigen terlarut",
  ],
  publishedAt: "2026-08-28",
  image: {
    src: "/resources/images/shrimp-pond-water-colour-algae-infographic.jpg",
    alt: "Infografis Shrimply membandingkan warna air tambak udang hijau, cokelat kekuningan, hijau-biru, dan hijau tua disertai panduan pemantauannya",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Software Pemantauan Kualitas Air", href: "/id/features/water-quality-monitoring" },
  takeaways: [
    "Warna air adalah petunjuk awal, bukan identifikasi pasti jenis alga atau diagnosis mutlak kondisi kolam.",
    "Perubahan warna air yang cepat harus segera memicu pemeriksaan oksigen terlarut (DO), pH, kecerahan Secchi disk, amonia, dan nitrit.",
    "Pastikan jenis plankton yang mendominasi melalui mikroskop sebelum memutuskan pemberian perlakuan kimiawi apa pun.",
  ],
  sections: [
    {
      heading: "Ringkasan cepat",
      body: [
        "Warna air tambak udang memberikan petunjuk awal mengenai kepadatan plankton dan perubahan dinamika kondisi kolam. Namun, warna air semata tidak dapat mengidentifikasi spesies alga secara pasti ataupun memastikan apakah suatu blooming berbahaya atau tidak.",
        "Ketika warna air berubah cepat, langkah pertama adalah mengukur oksigen terlarut (DO), pH, kecerahan air (transparansi), amonia, dan nitrit. Jika udang terlihat berkerumun di dekat kincir aerasi, berenang menggantung di permukaan air, atau mengalami kematian, segera tangani situasi tersebut sebagai kondisi darurat.",
      ],
    },
    {
      heading: "Mengapa warna air tambak sangat penting",
      body: [
        "Komunitas fitoplankton yang stabil membantu memproduksi oksigen terlarut melalui fotosintesis di siang hari, menyerap kelebihan nutrien, dan menyediakan pakan alami bagi udang muda. Blooming air cokelat yang kaya diatom sering kali menguntungkan tambak, namun keberadaannya tidak dapat dipastikan hanya dari pengamatan visual warna air.",
        "Blooming alga yang terlalu pekat atau tidak stabil dapat memicu lonjakan pH tinggi di sore hari, menguras oksigen terlarut di malam hari karena respirasi, serta meningkatkan risiko penurunan oksigen drastis (oxygen crash) menjelang fajar. Saat alga mengalami kematian massal (crash), bakteri akan menguraikan sel-sel alga mati tersebut dan mengonsumsi lebih banyak oksigen. Air kolam bisa mendadak berubah menjadi bening atau keruh susu, bersamaan dengan melonjaknya konsentrasi amonia dan limbah organik.",
      ],
    },
    {
      heading: "Panduan cepat warna air tambak udang",
      body: [
        "Gunakan warna air sebagai pemicu untuk segera melakukan pengukuran parameter, bukan sebagai vonis diagnosis akhir. Sianobakteri, misalnya, tidak selalu berwarna hijau-biru tetapi juga dapat tampak cokelat, kuning, atau bahkan kemerahan.",
      ],
      table: {
        columns: ["Warna air", "Kemungkinan indikasi", "Potensi manfaat atau risiko", "Langkah pengecekan selanjutnya"],
        rows: [
          ["Hijau", "Alga hijau (chlorophyta) atau komunitas fitoplankton campuran", "Blooming yang stabil bermanfaat bagi tambak; pertumbuhan yang terlalu pekat dapat menguras oksigen di malam hari", "DO menjelang fajar, pH sore hari, dan kecerahan Secchi disk"],
          ["Hijau kekuningan", "Campuran alga hijau, sianobakteri, atau partikel tersuspensi", "Bisa normal atau menandakan adanya transisi pergantian dominasi alga", "Bandingkan perubahan warna selama beberapa hari dan amati di bawah mikroskop"],
          ["Cokelat kekuningan", "Kemungkinan dominasi diatom atau partikel tanah/lumpur tersuspensi", "Diatom mendukung produktivitas tambak dan pakan alami, namun warna air saja bukan bukti pasti", "Kecerahan Secchi disk, pemeriksaan mikroskopis, dan kondisi air pasokan (intake)"],
          ["Cokelat", "Kemungkinan diatom, dinoflagellata, atau plankton campuran", "Bisa menguntungkan atau berbahaya tergantung pada jenis spesies dan kepadatannya", "Identifikasi mikroskopis, tren oksigen terlarut (DO), dan pH"],
          ["Hijau kebiruan (Blue-green)", "Kemungkinan sianobakteri (alga hijau-biru)", "Beberapa spesies menghasilkan bau tanah/amis, menurunkan kualitas air, atau melepaskan toksin", "Periksa lapisan buih/lendir di permukaan (scum) dan lakukan uji mikroskopis atau laboratorium"],
          ["Hijau tua / pekat", "Blooming fitoplankton yang sangat padat", "Risiko tinggi lonjakan pH sore, penurunan kritis DO dini hari, dan keruntuhan alga (crash)", "DO sebelum matahari terbit, pH saat fajar dan sore hari, serta kecerahan Secchi disk"],
          ["Merah atau cokelat kemerahan", "Alga berpigmen, termasuk kemungkinan dinoflagellata", "Beberapa spesies dapat mengiritasi insang atau meracuni udang", "Identifikasi mikroorganisme sebelum menentukan tindakan perlakuan"],
          ["Bening", "Kepadatan plankton rendah, terjadi alga crash, atau pengendapan partikel berat", "Produktivitas alami menurun; perubahan mendadak sering mendahului krisis oksigen atau lonjakan amonia", "Oksigen terlarut, amonia, nitrit, dan riwayat perubahan warna beberapa hari terakhir"],
          ["Keruh susu atau keputihan", "Kematian massal alga, ledakan bakteri, partikel lempung, atau bahan organik tersuspensi", "Indikasi proses pembusukan aktif yang menguras pasokan oksigen", "Oksigen terlarut, amonia, bau air, kondisi lumpur dasar, dan uji mikroskopis"],
        ],
      },
    },
    {
      heading: "Apakah alga menguntungkan atau merugikan bagi tambak udang?",
      body: [
        "Alga tidak selalu berdampak buruk bagi tambak. Pertanyaan kuncinya adalah apakah blooming alga tersebut stabil, memiliki kepadatan yang terkendali, serta didukung oleh tren oksigen terlarut dan pH yang berada dalam batas aman.",
        "Blooming yang stabil mampu memproduksi oksigen melalui fotosintesis di siang hari, menyerap kelebihan senyawa nutrien, membatasi penetrasi cahaya berlebih ke dasar kolam (mencegah pertumbuhan lumut dasar/klekap), serta menyediakan pakan alami untuk post-larva dan zooplankton. Sebaliknya, blooming yang bermasalah akan menguras terlalu banyak oksigen di malam hari, mendongkrak pH sore terlalu tinggi, rentan mengalami kematian massal (crash) saat cuaca mendung berhari-hari, atau mengandung mikroorganisme yang berpotensi menghasilkan racun.",
      ],
    },
    {
      heading: "Nilai acuan praktis kualitas air",
      body: [
        "Angka-angka ini merupakan acuan praktis manajemen tambak secara umum, bukan batas mutlak universal. Spesies udang, biomassa, suhu, salinitas, konstruksi kolam, dan SOP operasional di lapangan memengaruhi rentang batas aman masing-masing tambak.",
      ],
      table: {
        columns: ["Parameter", "Acuan praktis", "Tanda peringatan / bahaya", "Konteks penting"],
        rows: [
          ["Oksigen terlarut (DO)", "Targetkan selalu di atas 4 mg/L", "Nilai DO dini hari terus menurun atau udang menunjukkan gejala stres", "Kebutuhan DO dipengaruhi oleh ukuran udang, biomassa total, suhu air, dan salinitas"],
          ["pH", "Kisaran optimal umumnya 7,5–9,0 (fluktuasi harian < 0,5)", "pH sore hari mendekati atau melampaui 9,5", "Selalu bandingkan hasil pembacaan saat fajar dan sore hari, bukan hanya mengandalkan satu kali pengukuran"],
          ["Kecerahan Secchi disk", "Umumnya berkisar antara 25–40 cm pada kolam dengan manajemen plankton", "Kurang dari 25 cm menandakan blooming alga yang terlalu pekat", "Hanya akurat untuk mengukur kepadatan alga jika kekeruhan bukan disebabkan oleh partikel tanah atau suspensi lumpur"],
          ["Warna air", "Stabil dari hari ke hari", "Perubahan warna mendadak, air mendadak bening, terbentuknya buih pekat (scum), atau warna abnormal", "Lakukan pengamatan di titik lokasi, kedalaman, dan waktu yang sama setiap hari"],
        ],
      },
    },
    {
      heading: "Air kolam berwarna hijau",
      body: [
        "Air kolam yang berwarna hijau umumnya menandakan dominasi alga hijau (Chlorophyta) atau komunitas fitoplankton campuran. Blooming alga hijau yang stabil mendukung produktivitas kolam, terutama pada fase awal hingga pertengahan siklus budidaya.",
        "Air yang berwarna hijau sangat tua atau pekat menunjukkan kepadatan fitoplankton yang berlebihan. Di siang hari, fotosintesis yang intens memicu lonjakan DO dan pH yang sangat tinggi, namun seluruh organisme di kolam akan mengonsumsi oksigen setelah matahari terbenam. Titik terendah oksigen terlarut biasanya terjadi menjelang fajar.",
      ],
      items: [
        "Ukur oksigen terlarut (DO) sebelum matahari terbit (dini hari) dan di sore hari.",
        "Ukur pH saat fajar dan sore hari untuk memantau rentang fluktuasi harian.",
        "Catat kecerahan Secchi disk, respons pakan di anco, dan perilaku gerak udang.",
      ],
    },
    {
      heading: "Air kolam berwarna cokelat atau cokelat kekuningan",
      body: [
        "Air berwarna cokelat sering kali mengandung diatom (Bacillariophyceae), yang dikenal sebagai organisme pakan alami yang sangat bernutrisi bagi udang. Kendati demikian, warna cokelat juga bisa berasal dari ledakan dinoflagellata, partikel lumpur/tanah tersuspensi akibat erosi tanggul, atau campuran alga lain.",
        "Jangan langsung menyimpulkan bahwa air cokelat pasti didominasi diatom yang baik tanpa verifikasi mikroskopis. Dua kolam dengan penampakan warna cokelat yang serupa bisa saja dihuni oleh komunitas mikroorganisme yang bertolak belakang fungsinya.",
      ],
    },
    {
      heading: "Air kolam berwarna hijau kebiruan (Blue-Green)",
      body: [
        "Warna hijau kebiruan, terbentuknya lapisan lendir mengapung (scum) di permukaan, serta timbulnya bau tanah atau bau menyengat yang khas menandakan keberadaan sianobakteri (alga hijau-biru/BGA). Suhu air yang hangat, terik matahari intens, sirkulasi air yang lemah, serta rasio nitrogen dan fosfor yang tidak seimbang memicu ledakan alga jenis ini.",
        "Sebagian genus sianobakteri (seperti Microcystis atau Oscillatoria) mampu memproduksi toksin berbahaya bagi udang dan mencemari cita rasa daging (off-flavor). Namun, pengamatan warna semata belum membuktikan adanya racun. Segera lakukan pengujian mikroskopis atau analisis laboratorium jika udang mengalami stres berat atau mortalitas.",
      ],
    },
    {
      heading: "Air kolam berwarna merah atau cokelat kemerahan",
      body: [
        "Air berwarna merah atau cokelat kemerahan dapat dipicu oleh dinoflagellata atau fitoplankton berpigmen lainnya. Sebagian spesies tidak berbahaya, namun beberapa spesies tertentu dapat menghasilkan racun, lendir yang menyumbat insang udang, atau memicu anjloknya pasokan oksigen.",
        "Perhatikan seberapa cepat warna tersebut muncul, apakah membentuk garis-garis atau bercak di permukaan air, bagaimana respons gerak udang, angka mortalitas harian, kadar DO sebelum fajar, dan hasil identifikasi mikroskopis. Hindari langsung menebar bahan kimia semata-mata karena melihat perubahan warna merah.",
      ],
    },
    {
      heading: "Air bening atau keruh susu akibat keruntuhan alga (algae crash)",
      body: [
        "Air yang menjadi bening secara perlahan mungkin hanya menandakan rendahnya kepadatan plankton. Namun, air kolam yang mendadak bening setelah sebelumnya mengalami blooming pekat merupakan pertanda kuat telah terjadi keruntuhan alga (algae crash).",
        "Setelah terjadi crash alga, produksi oksigen melalui fotosintesis terhenti drastis, sementara populasi bakteri mengonsumsi oksigen dalam jumlah masif untuk menguraikan bangkai alga. Akibatnya, amonia dan limbah organik melonjak tajam, membuka peluang tumbuhnya bakteri oportunistik atau blooming alga jenis lain yang tidak terkontrol.",
      ],
    },
    {
      heading: "Tanda-tanda bahaya ledakan alga (blooming kritis)",
      body: [
        "Perubahan perilaku udang juga dapat disebabkan oleh suhu ekstrem, infeksi penyakit, atau gangguan kualitas air lainnya. Selalu lakukan pengukuran parameter kolam secara menyeluruh sebelum menyimpulkan akar penyebabnya.",
      ],
      items: [
        "Warna air berubah sangat drastis, mendadak bening, atau membentuk lapisan buih pekat (scum) di permukaan.",
        "Air tambak mengeluarkan bau busuk, bau tanah menyengat, atau aroma aneh lainnya.",
        "Kecerahan Secchi disk anjlok cepat atau selisih antara pH pagi dan sore hari melebar (> 0,5).",
        "Kadar oksigen terlarut (DO) dini hari terus menurun dari hari ke hari.",
        "Nafsu makan di anco menurun drastis, atau udang berkerumun di dekat kincir dan tepi pematang.",
        "Udang terlihat berenang menggantung di permukaan air pada siang hari atau terjadi peningkatan angka kematian.",
        "Blooming alga mulai rontok atau mati massal setelah beberapa hari berturut-turut cuaca mendung/hujan.",
      ],
    },
    {
      heading: "Penyebab umum dan cara memeriksanya",
      body: [
        "Urutkan berbagai kemungkinan berdasarkan data pengukuran nyata dan riwayat kolam, bukan hanya berspekulasi dari penampakan warna air semata.",
      ],
      ordered: true,
      items: [
        "Pemberian pakan berlebih dan akumulasi limbah organik: periksa sisa pakan di anco, estimasi biomassa riil, ketebalan lumpur di central drain, dan kebiasaan feeding rate.",
        "Ketersediaan nutrien terlarut yang tinggi: periksa konsentrasi amonia, nitrit, dan fosfat, serta evaluasi riwayat pemupukan dan penambahan pakan beberapa hari terakhir.",
        "Ketidakseimbangan rasio nutrien: gunakan identifikasi mikroskopis dan konsultasi teknis spesialis alih-alih berpatokan pada satu rasio teoritis umum.",
        "Penumpukan endapan lumpur (sludge): periksa area pembuangan tengah (central drain) dan cium aroma sampel lumpur dasar; endapan hitam berbau telur busuk (H2S) menandakan kondisi dasar kolam yang anaerobik dan memburuk.",
        "Sirkulasi dan aerasi yang lemah: periksa sudut-sudut mati kolam yang tidak terjangkau arus kincir, titik penumpukan buih, dan gradasi warna air yang tidak merata.",
        "Cuaca panas terik dan intensitas cahaya tinggi: pantau perbandingan tren warna air, pH sore, dan DO selama beberapa hari berturut-turut.",
        "Air pasokan (intake) yang bermasalah: periksa kualitas air tandon/sumber sebelum pengisian, terutama terkait kepadatan alga liar, suspensi lumpur, dan risiko patogen biosekuriti.",
        "Hujan lebat atau fluktuasi salinitas mendadak: ukur salinitas dan kadar oksigen di berbagai kedalaman karena lapisan air hujan tawar dapat membentuk stratifikasi permukaan yang memicu goncangan alga.",
      ],
    },
    {
      heading: "Tindakan penanganan darurat",
      body: [
        "Prioritaskan keselamatan pasokan oksigen dan ketahanan udang terlebih dahulu, kemudian identifikasi perubahan apa yang terjadi sebelum memilih tindakan perbaikan.",
      ],
      ordered: true,
      items: [
        "Ukur oksigen terlarut sebelum fajar. Maksimalkan seluruh kincir aerasi jika kadar DO turun atau udang tampak stres, dan lanjutkan pemantauan berkala hingga parameter dan perilaku udang stabil.",
        "Ukur pH pagi dan sore hari. pH sore yang melambung tinggi di air yang pekat menandakan fotosintesis berlebihan; selisih harian yang melebar adalah sinyal peringatan bahwa keseimbangan kolam mulai goyah.",
        "Periksa anco dan biomassa. Sesuaikan porsi pakan berikutnya berdasarkan sisa pakan di anco, kondisi fisik udang, dan biomassa terkini—jangan hanya berpatokan pada rencana pakan tertulis sebelumnya.",
        "Periksa lumpur dasar dan alga yang mati. Buang endapan bahan organik mati melalui sifon atau central drain secara hati-hati bila sistem kolam memungkinkan, tanpa mengaduk sedimen beracun ke kolom air.",
        "Konfirmasi jenis fitoplankton dominan melalui pemeriksaan mikroskop atau laboratorium rujukan saat terjadi perubahan warna mendadak, timbul busuk/scum, atau kondisi udang terganggu.",
        "Evaluasi kelayakan air pengganti. Lakukan pergantian air hanya jika sumber air di tandon aman, terfiltrasi baik, dan memenuhi kaidah biosekuriti, serta hindari perubahan drastis pada suhu, salinitas, atau pH.",
        "Segera hubungi ahli kesehatan hewan akuatik jika kematian udang terus berlanjut, udang tetap stres, atau terdapat kecurigaan infeksi patogen menular.",
      ],
      note: "Hindari menebar algesida, disinfektan, pestisida, probiotik, mineral, atau bahan kimia lainnya hanya atas dasar kecurigaan warna air. Membunuh blooming alga pekat secara instan justru akan memicu deoksigenasi massal yang berakibat fatal bagi udang, dan regulasi penggunaan produk kimia berbeda-beda di tiap wilayah.",
    },
    {
      heading: "Manajemen alga jangka panjang",
      body: [
        "Kestabilan ekosistem tambak tercipta dari kedisiplinan kontrol pakan, pembuangan limbah, aerasi, biosekuriti air pasokan, dan pemantauan data secara konsisten—bukan dari obat ajaib pembasmi alga.",
      ],
      items: [
        "Sesuaikan pemberian pakan secara presisi berdasarkan biomassa riil dan kontrol anco berkala.",
        "Pastikan kapasitas kincir aerasi dan pola arus sirkulasi memadai seiring pertambahan biomassa udang.",
        "Bersihkan dan buang endapan lumpur secara rutin antar siklus maupun selama pemeliharaan sesuai desain konstruksi tambak.",
        "Pantau tren akumulasi nutrien terlarut dan bahan organik secara berkala.",
        "Lindungi kualitas air intake melalui filtrasi fisik, kolam tandon pengendapan, dan sterilisasi biosekuriti.",
        "Jaga kestabilan alkalinitas dan kapasitas penyangga (buffer) pH dengan panduan teknis yang tepat.",
        "Bandingkan data parameter harian yang sedang berjalan dengan riwayat siklus budidaya yang sukses sebelumnya.",
        "Lakukan pemeriksaan mikroskopis secara berkala ketika komposisi komunitas plankton mulai bergeser.",
        "Dokumentasikan dinamika cuaca, curah hujan, pergantian air, dan perubahan warna air kolam secara teratur.",
      ],
    },
    {
      heading: "Jadwal pemantauan praktis",
      body: [
        "Frekuensi pengecekan harus ditingkatkan ketika kepekatan blooming meningkat, cuaca fluktuatif, dosis pakan naik, atau udang menunjukkan indikasi stres.",
      ],
      table: {
        columns: ["Parameter pemantauan", "Waktu pengecekan yang disarankan", "Kondisi yang menuntut pengecekan lebih sering"],
        rows: [
          ["Oksigen terlarut (DO)", "Sebelum fajar dan sore hari, setiap hari", "Blooming pekat, cuaca mendung, peningkatan dosis pakan, atau udang stres"],
          ["pH", "Saat matahari terbit dan sore hari, setiap hari", "Perubahan warna air yang cepat atau fluktuasi harian melebihi 0,5"],
          ["Warna air", "Di titik dan waktu yang sama setiap hari", "Terjadi perubahan warna mendadak atau timbul keanehan visual"],
          ["Kecerahan Secchi disk", "Setiap hari pada kondisi intensitas cahaya yang serupa", "Air kolam tampak semakin pekat atau nilai DO pagi menurun"],
          ["Respons pakan di anco", "Pada setiap jadwal kontrol anco", "Nafsu makan menurun atau kondisi air kolam tidak stabil"],
          ["Mortalitas dan perilaku udang", "Minimal satu kali sehari secara rutin", "Tampak gejala stres, udang berenang menggantung, atau kecurigaan penyakit"],
          ["Alkalinitas", "Sesuai jadwal rutin manajemen kualitas air tambak", "Setelah hujan lebat atau saat pH harian berfluktuasi lebar"],
          ["Amonia (TAN/NH3) dan nitrit (NO2)", "Sesuai jadwal monitoring berkala tambak", "Terjadi algae crash, pakan berlebih di anco, atau mortalitas meningkat"],
          ["Identifikasi plankton (mikroskop)", "Secara berkala jika fasilitas tersedia", "Muncul buih scum, bau menyengat, perubahan warna tiba-tiba, atau air tidak kunjung stabil"],
        ],
      },
    },
    {
      heading: "Gunakan Shrimply untuk memantau kondisi kolam",
      body: [
        "Shrimply membantu merapikan dan membandingkan riwayat data tambak Anda secara terintegrasi. Platform ini dirancang untuk mendampingi keputusan lapangan, bukan menggantikan uji laboratorium atau diagnosis penyakit mandiri.",
      ],
      items: [
        "Catat oksigen terlarut, pH, alkalinitas, amonia, nitrit, salinitas, dan suhu pada modul Kualitas Air.",
        "Bandingkan tren fluktuasi harian antara pH pagi dan sore serta dinamika oksigen terlarut.",
        "Evaluasi Riwayat Pakan berdampingan dengan estimasi biomassa terkini dan hasil Sampling.",
        "Dokumentasikan kematian udang di Riwayat Mortalitas untuk melihat pola awal dan laju keparahannya secara jelas.",
        "Bandingkan kondisi siklus yang sedang berlangsung dengan data Siklus Produksi Tambak terdahulu.",
        "Ekspor catatan data relevan saat berdiskusi dengan manajer operasional, konsultan teknis, atau laboratorium kesehatan udang.",
      ],
    },
    {
      heading: "Kapan harus menghubungi ahli akuakultur atau laboratorium spesialis",
      body: [
        "Sertakan riwayat pengukuran kualitas air terakhir, catatan pakan harian, riwayat mortalitas, log perubahan cuaca, serta sampel air dan udang representatif yang diambil sesuai instruksi laboratorium rujukan.",
      ],
      items: [
        "Kematian udang terus berlanjut atau jumlahnya kian bertambah.",
        "Udang tetap berenang menggantung di permukaan air meskipun aerasi kincir telah dimaksimalkan.",
        "Blooming alga hijau-biru (BGA), alga merah, atau penampakan warna abnormal bertahan lama dan sulit dikendalikan.",
        "Terbentuk lapisan lendir/scum tebal di permukaan atau timbul bau busuk yang kuat.",
        "Air kolam berulang kali mengalami keruntuhan alga (crash) atau parameter kualitas air tidak kunjung membaik.",
        "Terdapat kecurigaan kuat adanya paparan mikotoksin/algotoksin atau serangan penyakit menular.",
      ],
    },
  ],
  checklist: [
    "Ukur oksigen terlarut sebelum fajar dan tingkatkan aerasi kincir jika angka DO turun atau udang menunjukkan gejala stres.",
    "Bandingkan nilai pH saat matahari terbit dan sore hari daripada hanya mengandalkan satu kali pembacaan.",
    "Periksa kecerahan Secchi disk, amonia, nitrit, sisa pakan di anco, kondisi lumpur dasar, dan riwayat cuaca terkini.",
    "Pastikan jenis plankton dominan melalui mikroskop sebelum memutuskan penggunaan bahan kimia apa pun.",
    "Gunakan hanya air pengganti yang aman, tersaring halus, dan berbiosekuriti tinggi untuk pergantian air terukur.",
    "Segera hubungi tenaga ahli kesehatan hewan akuatik jika kematian udang terus berlanjut atau dicurigai ada wabah penyakit.",
  ],
  faqs: [
    {
      question: "Warna air apa yang paling ideal untuk tambak udang?",
      answer: "Tidak ada satu warna tunggal yang mutlak terbaik. Air hijau stabil atau cokelat diatom umumnya menguntungkan bagi tambak, namun data parameter terukur dan identifikasi mikroskopis jauh lebih menentukan daripada penampakan warna semata.",
    },
    {
      question: "Apakah air kolam berwarna hijau bagus untuk udang vannamei?",
      answer: "Air hijau dengan kepadatan sedang dan stabil sangat baik untuk menunjang produktivitas tambak. Namun, air hijau yang terlalu pekat atau berubah warna secara mendadak mengindikasikan populasi fitoplankton berlebih yang meningkatkan risiko anjloknya pasokan oksigen di malam hari.",
    },
    {
      question: "Mengapa air tambak udang berubah menjadi hijau tua pekat?",
      answer: "Penyebab umumnya meliputi blooming fitoplankton yang terlalu padat, tingginya akumulasi nutrien (nitrogen dan fosfor), kelebihan bahan organik dari sisa pakan, serta terik sinar matahari yang intens. Pastikan kondisinya melalui pengecekan kecerahan Secchi disk, pH, DO, dan pemeriksaan mikroskop.",
    },
    {
      question: "Apa penyebab munculnya alga hijau-biru (blue-green algae) di tambak?",
      answer: "Suhu air yang hangat, penetrasi sinar matahari yang kuat, penumpukan nutrien terlarut, dan sirkulasi air yang kurang merata dapat memicu dominasi sianobakteri. Komposisi spesies dan kondisi lingkungan tambak menentukan seberapa besar risiko toksin yang ditimbulkan.",
    },
    {
      question: "Bagaimana cara petambak mengendalikan blooming alga secara aman?",
      answer: "Mulailah dengan mengevaluasi oksigen terlarut, memaksimalkan aerasi kincir, memantau fluktuasi pH, membatasi pakan, menyifon endapan lumpur dasar, serta mengidentifikasi jenis plankton. Pertimbangkan pergantian air atau perlakuan lain hanya setelah memastikan aspek biosekuriti, kondisi udang, dan petunjuk teknis yang tepat.",
    },
    {
      question: "Apa yang terjadi saat alga di tambak mendadak mati (algae crash)?",
      answer: "Air kolam biasanya mendadak berubah menjadi bening atau keruh keputihan seperti susu. Proses penguraian bangkai sel alga oleh bakteri akan menguras habis oksigen terlarut serta memicu lonjakan amonia dan beban bahan organik.",
    },
    {
      question: "Bagaimana algae crash memengaruhi kadar oksigen terlarut (DO)?",
      answer: "Kolam kehilangan pasokan oksigen dari fotosintesis siang hari, sementara dekomposisi bakteri menyerap oksigen dalam jumlah masif. Titik DO terendah dan paling mematikan bagi udang umumnya terjadi menjelang fajar.",
    },
    {
      question: "Apakah diatom bermanfaat bagi tambak udang?",
      answer: "Diatom adalah pakan alami yang sangat bernutrisi dan mendukung perkembangbiakan zooplankton. Kendati demikian, warna air cokelat semata belum bisa memastikan bahwa diatom yang mendominasi kolam tanpa uji mikroskop.",
    },
    {
      question: "Bagaimana cara mengidentifikasi alga yang berbahaya bagi udang?",
      answer: "Gunakan pemeriksaan mikroskop dan, jika dicurigai ada paparan racun alga, kirimkan sampel ke laboratorium pengujian. Warna air dan aroma tidak sedap hanyalah sinyal peringatan awal, bukan bukti konfirmasi definitif.",
    },
    {
      question: "Seberapa sering warna air dan kondisi plankton tambak harus diperiksa?",
      answer: "Amati warna air setiap hari pada jam dan titik pengamatan yang konsisten. Lakukan identifikasi komunitas plankton dengan mikroskop setiap kali terjadi perubahan warna, penurunan kecerahan, timbul bau aneh, gangguan nafsu makan udang, atau ketidakstabilan tren kualitas air.",
    },
  ],
  sources: [
    {
      title: "Australian Prawn Farming Manual",
      publisher: "Australian Centre for International Agricultural Research",
      url: "https://www.aciar.gov.au/sites/default/files/legacy/node/737/Australian%20prawnfarming%20manual%20final.pdf",
    },
    {
      title: "Manual on Pond Culture of Penaeid Shrimp: Indicators of Problems in a Pond",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/4/ac006e/AC006E11.htm",
    },
    {
      title: "Shrimp Culture: Pond Design, Operation and Management — Water Quality",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/4/AC210E/AC210E09.htm",
    },
    {
      title: "Cyanobacteria (Blue-Green Algae) and Water Quality",
      publisher: "Australian Government",
      url: "https://www.waterquality.gov.au/issues/blue-green-algae",
    },
    {
      title: "Characterising and Managing Harmful Algal Blooms That Cause Production Loss on Australian Prawn Farms",
      publisher: "Queensland Department of Agriculture and Fisheries",
      url: "https://era.dpi.qld.gov.au/id/eprint/6101/",
    },
    {
      title: "Co-Occurrence of White Shrimp Mortalities and Microcystin Toxin in a Shrimp Facility",
      publisher: "Aquaculture",
      url: "https://doi.org/10.1016/j.aquaculture.2006.08.037",
    },
    {
      title: "Phytoplankton Succession in Intensive Marine Shrimp Culture Ponds",
      publisher: "Aquaculture Research",
      url: "https://doi.org/10.1046/j.1355-557x.2002.00671.x",
    },
  ],
};
