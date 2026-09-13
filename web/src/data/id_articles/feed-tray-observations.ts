import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultNutritionReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "feed-tray-observations",
  section: "Pakan dan Inventaris",
  label: "Pakan dan Inventaris",
  author: defaultResourceAuthorID,
  reviewer: defaultNutritionReviewerID,
  title: "Observasi Anco Tambak Udang: Membaca Nafsu Makan Udang Sebelum Pakan Terbuang",
  description:
    "Panduan praktis observasi anco (feed tray) untuk petambak udang vaname: teknik monitoring nafsu makan, takaran porsi anco 1–2%, durasi cek 1,5–2 jam, evaluasi sisa pakan, kondisi usus, penyesuaian ransum, dan pencegahan risiko kualitas air.",
  readTime: "6 menit baca",
  tags: [
    "observasi anco",
    "feed tray udang",
    "nafsu makan udang",
    "kontrol anco",
    "respons pakan",
    "sisa pakan anco",
    "kualitas air tambak",
    "penyesuaian ransum",
    "manajemen pakan vaname",
  ],
  publishedAt: "2026-06-08",
  updatedAt: "2026-09-12",
  image: {
    src: "/resources/images/shrimp-feed-tray-observation-vannamei-pond.png",
    alt: "Petambak udang memeriksa anco (feed tray) di kolam udang vaname untuk memantau nafsu makan, kondisi usus, dan tingkat konsumsi pakan",
    width: 1448,
    height: 1086,
  },
  relatedFeature: { label: "Software Manajemen Pakan", href: "/id/features/feed-inventory" },
  takeaways: [
    "Anco (feed tray) adalah instrumen praktis untuk memantau nafsu makan riil udang secara langsung, bukan sekadar menduga-duga dari tabel pakan teoritis.",
    "Hasil kontrol anco wajib dihubungkan secara menyeluruh dengan parameter kualitas air (DO, pH, suhu), cuaca, siklus molting, dan indikasi awal gangguan penyakit.",
    "Pencatatan evaluasi anco yang konsisten mencegah penumpukan sisa pakan di dasar kolam, menekan FCR, serta memandu penyesuaian ransum pakan harian secara presisi.",
  ],
  faqs: [
    {
      question: "Berapa banyak pakan yang harus diberikan kepada udang setiap hari?",
      answer:
        "Gunakan rencana feeding program tambak atau feeding rate berbasis biomassa sebagai takaran awal (baseline), lalu sesuaikan secara bertahap menggunakan estimasi biomassa riil, ukuran udang (MBW), observasi anco, data sampling bobot terkini, parameter kualitas air (terutama oksigen terlarut dan suhu), cuaca, serta tren mortalitas harian. Jangan pernah menaikkan porsi pakan hanya karena anco habis bersih tanpa memastikan laju pertumbuhan dan daya dukung kualitas air kolam benar-benar memadai.",
    },
    {
      question: "Apa arti sisa pakan di anco (feed tray) udang vaname?",
      answer:
        "Sisa pakan di anco dapat mengindikasikan pemberian pakan berlebih (overfeeding) atau penurunan nafsu makan akibat stres lingkungan: penurunan kadar oksigen terlarut (DO), stres kualitas air (amonia, nitrit, atau fluktuasi pH), siklus ganti kulit (molting massal), perubahan cuaca mendadak (hujan dingin), atau fase awal infeksi penyakit. Selalu konfirmasikan pola sisa pakan di beberapa titik anco dan tinjau log kualitas air terkini sebelum melakukan perubahan ransum besar.",
    },
    {
      question: "Berapa porsi pakan yang ideal diletakkan di anco?",
      answer:
        "Standar operasional tambak komersial umumnya mengalokasikan 1% hingga 2% (rata-rata 1,2%–1,5%) dari total ransum pakan per jadwal pemberian (feeding meal) untuk dibagi rata ke seluruh anco di kolam. Sebagai contoh, jika satu sesi pemberian pakan adalah 20 kg dan kolam memiliki 4 titik anco, alokasi anco 1,2% setara dengan 240 gram total, atau sekitar 60 gram pakan per anco. Kuncinya adalah menjaga konsistensi persentase anco agar tren pembacaan nafsu makan harian tetap akurat.",
    },
    {
      question: "Berapa lama durasi waktu tunggu sebelum memeriksa anco (durasi cek anco)?",
      answer:
        "Durasi cek anco umumnya berkisar antara 1,5 hingga 2,0 jam setelah pakan ditebar pada kolam pembesaran (DOC > 30–40). Pada fase benur/juvenile awal (DOC 15–30), waktu kontrol dapat berkisar 2,0 hingga 2,5 jam karena pergerakan udang masih lambat. Sebaliknya, pada udang berukuran besar (> 15 gram) atau saat metabolisme tinggi di siang hari, durasi kontrol dapat dipersingkat menjadi 1,0 hingga 1,5 jam agar pelet pakan tidak telanjur hancur terendam air.",
    },
    {
      question: "Apa saja indikator biologis yang wajib diperiksa saat anco diangkat?",
      answer:
        "Selain menghitung persentase sisa butiran pelet pakan, teknisi wajib memeriksa lima indikator biologis langsung: (1) keaktifan udang yang berada di anco (apakah lincah melompat atau lemas/pasif); (2) kondisi saluran pencernaan (usus)—apakah usus penuh terisi pakan pelet, bergaris putus-putus, atau usus kosong; (3) kondisi hepatopankreas (berwarna cokelat tua pekat sehat atau pucat kemerahan); (4) kondisi kotoran udang (feces)—apakah padat tenggelam atau berlendir/berwarna putih (tanda WFS); serta (5) keberadaan cangkang molting.",
    },
    {
      question: "Bagaimana aturan baku penyesuaian ransum pakan berikutnya berdasarkan evaluasi anco?",
      answer:
        "Jika seluruh anco habis bersih (0% sisa) dan kualitas air optimal, pakan jadwal berikutnya dapat dinaikkan bertahap sekitar 5%–10% (maksimal kenaikan 10% per hari). Jika tersisa pakan tipis (< 10%), pertahankan dosis pakan tetap (hold). Jika pakan tersisa moderat (20%–50%), kurangi porsi pakan berikutnya sebesar 20%–30%. Jika pakan tersisa > 50% atau utuh, segera tunda atau potong pakan 50%–100%, maksimalkan aerasi kincir air, dan periksa parameter kualitas air serta kesehatan udang secara mendalam.",
    },
  ],
  sections: [
    {
      heading: "Fungsi utama anco: Membaca respons biologis nafsu makan udang",
      body: [
        "Anco (feed tray) adalah instrumen sederhana yang sangat krusial dalam budidaya udang vaname intensif untuk memastikan apakah udang mengonsumsi pakan sesuai takaran yang direncanakan. Anco bukanlah alat hitung biomassa absolut, melainkan jendela observasi biologis langsung bagi teknisi tambak untuk membaca nafsu makan riil, aktivitas gerak, dan kesehatan saluran pencernaan udang sebelum pakan telanjur menjadi limbah berbahaya di dasar kolam.",
        "Publikasi akuakultur FAO mengenai pengelolaan pakan udang menegaskan bahwa feeding tray berfungsi ganda: sebagai sarana penyaluran pakan terkontrol sekaligus instrumen pemantauan tingkat konsumsi dan laju pertumbuhan udang. Pada tambak komersial, pakan menyerap 50% hingga 70% dari total biaya operasional siklus budidaya. Pakan yang tidak terkonsumsi tidak hanya membakar modal tambak, tetapi juga cepat terurai menjadi amonia bebas (NH₃) dan nitrit (NO₂⁻), menguras oksigen terlarut (DO), memicu pembusukan anaerobik di dasar kolam, dan menyuburkan proliferasi bakteri patogen Vibrio.",
      ],
    },
    {
      heading: "Standarisasi operasional anco: Penempatan, porsi pakan, dan durasi kontrol",
      body: [
        "Keandalan data anco sangat bergantung pada standarisasi operasional prosedur (SOP) yang konsisten di tepi kolam. Pemasangan anco yang salah atau waktu kontrol yang tidak teratur akan menghasilkan data semu yang menyesatkan keputusan pemberian pakan.",
        "Petambak profesional menerapkan prinsip-prinsip operasional berikut untuk memastikan representasi data anco:",
      ],
      items: [
        "Penempatan posisi anco: Tempatkan anco pada jarak 2 hingga 4 meter dari tanggul pematang kolam pada area dasar yang keras dan bersih dari akumulasi lumpur hitam. Pastikan anco berada di luar hempasan arus kencang daun kincir air, namun tetap di dalam jalur jelajah alami udang saat mencari pakan. Kolam berukuran 1.000–3.000 m² umumnya dipasangi 4 hingga 6 titik anco secara proporsional di sekeliling kolam.",
        "Penimbangan porsi pakan anco: Alokasikan porsi pakan di anco sebesar 1% hingga 2% (standar umum 1,2%–1,5%) dari total porsi feeding meal yang ditebar pada jadwal tersebut, kemudian bagi rata ke seluruh anco terpasang. Timbang atau takar menggunakan cangkir ukur terkalibrasi agar persentasenya tidak berubah-ubah antar-jadwal.",
        "Durasi waktu kontrol anco: Standar waktu angkat anco disesuaikan dengan fase umur dan bobot udang. Pada fase benur/juvenile awal (DOC 15–30), kontrol dilakukan setelah 2,0 hingga 2,5 jam. Pada fase pembesaran menengah (DOC 31–60), kontrol dilakukan setelah 1,5 hingga 2,0 jam. Memasuki fase akhir (DOC > 60 atau bobot > 15 g), kontrol dipersingkat menjadi 1,0 hingga 1,5 jam. Durasi ini memastikan udang memiliki waktu makan yang cukup sebelum stabilitas fisik pelet melunak dan larut dalam air.",
      ],
    },
    {
      heading: "Parameter pengamatan biologis: Memeriksa sisa pelet, kondisi usus, dan kotoran udang",
      body: [
        "Ketika anco diangkat perlahan ke permukaan, teknisi tambak tidak boleh hanya memandang apakah butiran pelet habis atau tersisa. Pengamatan anco adalah inspeksi kesehatan klinis harian terhadap populasi udang.",
        "Pemeriksaan komprehensif di anco wajib mencakup indikator-indikator biologis berikut:",
      ],
      items: [
        "Evaluasi kuantitatif sisa pakan: Taksir persentase pelet pakan yang tersisa secara objektif (habis bersih 100%, sisa tipis <10%, sisa sedang 20%–50%, atau pakan tersisa utuh >50%).",
        "Pemeriksaan kepenuhan saluran pencernaan (usus): Ambil beberapa sampel udang yang berada di anco dan amati di bawah sinar terang. Udang dengan nafsu makan prima memiliki usus yang terisi penuh, padat, dan berwarna cokelat gelap seragam dari pangkal kepala hingga ekor. Usus yang kosong, bergaris putus-putus, atau berwarna putih pucat mengindikasikan udang berhenti makan akibat stres lingkungan atau infeksi saluran pencernaan.",
        "Kondisi hepatopankreas: Organ hepatopankreas pada kepala udang yang sehat berukuran proporsional, bertekstur padat kenyal, dan berwarna cokelat kehitaman mengkilap. Hepatopankreas yang membengkak, lembek berair, pucat keputihan, atau kemerahan merupakan tanda bahaya stres hepatik atau indikasi awal penyakit seperti AHPND (Acute Hepatopancreatic Necrosis Disease) atau EHP.",
        "Kotoran udang (feces): Kotoran yang tertinggal di atas nampan anco harus berbentuk silinder padat, lentur, dan berbobot (tenggelam). Adanya kotoran yang lembek berlendir, terapung, atau berwarna putih pucat merupakan gejala dini penyakit berak putih (White Feces Syndrome/WFS).",
        "Cangkang molting: Temuan cangkang terkelupas di anco menandakan adanya fase ganti kulit massal di kolam. Selama molting, nafsu makan udang secara alami akan menurun drastis selama 24 hingga 48 jam sehingga pakan harus ditahan agar tidak membusuk.",
      ],
    },
    {
      heading: "Tabel evaluasi sisa anco dan protokol penyesuaian pakan",
      body: [
        "Hindari mengubah takaran pakan harian hanya berdasarkan tebakan atau emosi sesaat. Terapkan protokol penyesuaian ransum terstandar berikut untuk memandu keputusan pakan pada jadwal berikutnya:",
      ],
      table: {
        columns: [
          "Hasil Pemeriksaan Anco",
          "Kondisi Biologis & Lingkungan",
          "Penyesuaian Pakan Sesi Berikutnya",
          "Tindakan Operasional & Kualitas Air",
        ],
        rows: [
          [
            "Habis Bersih (0% sisa)",
            "Nafsu makan agresif, biomassa meningkat atau dosis pakan kurang",
            "Naikkan pakan 5%–10% secara bertahap (jika DO dan suhu prima)",
            "Pertahankan aerasi normal, pantau agar amonia tidak melonjak",
          ],
          [
            "Sisa Sedikit (< 10%)",
            "Ransum pakan pas dan optimal sesuai biomassa dan daya dukung kolam",
            "Pertahankan dosis pakan tetap sama persis (hold feeding ration)",
            "Jalankan aerasi dan pemantauan air sesuai jadwal reguler",
          ],
          [
            "Sisa Moderat (20% – 50%)",
            "Penurunan nafsu makan, awal siklus molting, overfeeding ringan, atau DO menurun",
            "Kurangi porsi pakan berikutnya sebesar 20% – 30%",
            "Ukur DO dan suhu air segera; bersihkan anco dari sisa pakan yang melunak",
          ],
          [
            "Sisa Banyak (> 50% hingga Utuh)",
            "Stres parah, DO anjlok (<3,5 ppm), lonjakan amonia/nitrit, atau wabah penyakit",
            "Hentikan sementara (skip feed) atau potong pakan 50% – 100%",
            "Nyalakan seluruh kincir aerasi darurat, telusuri mortalitas dasar dan parameter air lengkap",
          ],
        ],
      },
      note: "Aturan batas aman: Jangan menaikkan dosis pakan lebih dari 10% dalam rentang waktu 24 jam meskipun seluruh anco selalu habis bersih. Kenaikan pakan yang terlalu agresif membebani kapasitas daya dukung biofilter kolam dan sering kali memicu ledakan amonia mendadak.",
    },
    {
      heading: "Hindari reaksi berlebihan pada satu anco: Wajib korelasi data terpadu",
      body: [
        "Satu nampan anco yang menyisakan pakan tidak boleh langsung memicu keputusan memotong pakan secara drastis untuk seluruh kolam. Sebaliknya, satu anco yang bersih tuntas tidak menjamin seluruh populasi udang sedang kelaparan. Faktor arus putaran kincir air, sedimentasi lokal, atau titik mati aerasi (dead zone) dapat membuat udang enggan berkumpul di sudut tertentu.",
        "Praktik terbaik dalam manajemen akuakultur modern adalah merekam observasi seluruh anco secara konsisten, merata-ratakan hasilnya, lalu menghubungkannya langsung dengan parameter lingkungan kolam:",
        "Oksigen Terlarut (DO): Jika kadar DO berada di bawah batas aman (<4,0 mg/L), nafsu makan udang otomatis terhenti karena laju respirasi tertekan. Menambah pakan saat DO rendah hanya akan mempercepat kematian udang di dasar kolam.",
        "Suhu Air Kolam: Penurunan suhu air akibat hujan deras atau cuaca mendung dingin (<26°C) memperlambat laju metabolisme udang hingga 30%–50%. Pakan harus segera dipotong secara proporsional.",
        "pH dan Senyawa Nitrogen: Fluktuasi pH drastis (>0,5 unit antara fajar dan sore) serta peningkatan kadar total amonia nitrogen (TAN) dan nitrit (NO₂⁻) memicu stres fisiologis yang menekan konsumsi pakan.",
        "Untuk menetapkan takaran ransum awal yang presisi sebelum mengevaluasi anco, gunakan [Tabel & Kalkulator Feeding Rate Vannamei](/id/resources/vannamei-feeding-rate) yang menghitung kuota pakan berbasis biomassa dan bobot rata-rata tubuh (MBW/ABW). Integrasikan pula hasil pencatatan anco dengan log operasional terpusat melalui [Pencatatan Tambak Udang](/id/resources/shrimp-farm-record-keeping) dan tinjau efisiensinya secara berkala di [Optimalisasi FCR Tambak Udang](/id/resources/fcr-shrimp-farming).",
      ],
    },
  ],
  checklist: [
    "Pasang anco pada lokasi representatif (kedalaman rata, bersih dari lumpur mati, dan di luar arus kencang daun kincir).",
    "Timbang porsi pakan anco secara presisi dan konsisten (1% hingga 2% dari total porsi feeding meal).",
    "Disiplin memeriksa anco tepat waktu (1,5 hingga 2,0 jam pasca sebar pakan di kolam pembesaran).",
    "Periksa kondisi biologis udang mencakup kepenuhan usus, kenampakan hepatopankreas, kotoran (feces), dan indikasi molting saat anco diangkat.",
    "Rata-ratakan hasil evaluasi seluruh anco sebelum memutuskan untuk menaikkan, mempertahankan, atau memotong ransum pakan.",
    "Verifikasi kadar oksigen terlarut (DO), suhu air, dan cuaca sebelum menyetujui kenaikan porsi pakan kolam.",
    "Bersihkan nampan anco dari sisa pakan lama yang melunak dan lumut sebelum sesi pemberian pakan berikutnya.",
  ],
  sources: [
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
    {
      title: "How do I keep track of the results of feeding?",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/4/s4314e/s4314e0a.htm",
    },
    {
      title: "Nutrient Impacts of Finfish Aquaculture",
      publisher: "NOAA Fisheries",
      url: "https://www.fisheries.noaa.gov/aquaculture/nutrient-impacts-finfish-aquaculture",
    },
  ],
};
