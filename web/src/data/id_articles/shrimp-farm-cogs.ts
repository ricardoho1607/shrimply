import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorID, defaultOperationsReviewerID } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-farm-cogs",
  section: "Panen dan Keuangan",
  label: "Panen & Keuangan",
  author: defaultResourceAuthorID,
  reviewer: defaultOperationsReviewerID,
  title: "HPP Tambak Udang (COGS): Memahami Biaya Riil dan Harga Pokok Produksi per Siklus Budidaya",
  description:
    "Apakah siklus tambak udang Anda benar-benar menghasilkan laba? Pelajari cara menghitung HPP (COGS) tambak vaname berdasarkan biaya pakan, benur, energi listrik, solar, mineral, upah tenaga kerja, depresiasi kolam, dan tonase panen riil.",
  readTime: "7 menit baca",
  tags: [
    "HPP tambak udang",
    "COGS tambak udang",
    "biaya pokok produksi udang",
    "profitabilitas tambak vaname",
    "struktur biaya budidaya",
    "biaya pakan udang",
    "HPP per kg udang",
    "keuangan tambak udang",
    "biaya siklus tambak",
    "margin laba tambak",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-farm-cogs-cycle-cost-profitability.jpg",
    alt: "Infografis HPP dan COGS tambak udang yang memperlihatkan proporsi biaya pakan, benur, energi listrik dan solar, perlakuan air, tenaga kerja, biaya panen, HPP per kilogram, dan profitabilitas siklus budidaya",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Software Manajemen Keuangan Tambak Udang", href: "/id/features/shrimp-farm-finance" },
  takeaways: [
    "HPP (Cost of Goods Sold / Biaya Pokok Produksi) menghubungkan seluruh pengeluaran operasional budidaya secara langsung dengan total tonase udang panen riil.",
    "Struktur biaya utama seperti pakan (50–60%), benur PL, listrik kincir dan pompa, solar genset, probiotik & mineral, serta tenaga kerja wajib dialokasikan per petak kolam secara konsisten.",
    "Analisis profitabilitas tambak hanya valid dan objektif apabila data biologis kolam (FCR, SR, ADG, size udang) selaras dengan pencatatan neraca keuangan.",
  ],
  faqs: [
    {
      question: "Apa definisi dan perbedaan antara HPP (COGS), OPEX umum, dan CAPEX dalam operasional tambak udang?",
      answer:
        "HPP (Cost of Goods Sold / Biaya Pokok Produksi) adalah akumulasi seluruh pengeluaran langsung dan tidak langsung yang terjadi secara spesifik untuk memproduksi biomassa udang pada satu siklus kolam tertentu, seperti pakan, benur, listrik aerasi, probiotik, dan upah tim kolam. Sebaliknya, OPEX umum mencakup biaya operasional non-produksi seperti gaji staf administrasi kantor pusat, pajak bumi dan bangunan, atau biaya legal tahunan. Sementara itu, CAPEX (Capital Expenditure) adalah belanja modal aset jangka panjang (seperti konstruksi kolam beton/HDPE, genset baru, atau trafo PLN) yang tidak boleh langsung dibebankan 100% pada satu siklus panen, melainkan dialokasikan secara proporsional melalui beban depresiasi per hari pemeliharaan (DOC).",
    },
    {
      question: "Komponen biaya apa saja yang wajib dimasukkan ke dalam perhitungan HPP per siklus tambak udang?",
      answer:
        "Struktur HPP tambak udang vaname komersial mencakup 7 pos biaya utama: (1) Biaya Benur (pembelian PL SPF/SPR, uji skrining PCR penyakit, dan ongkos kirim beroksigen); (2) Biaya Pakan (seluruh pakan crumble dan pellet yang ditebar ke kolam); (3) Energi Operasional (listrik PLN kincir air dan pompa, serta solar genset dan armada pompa transfer); (4) Kimia, Mineral, & Probiotik (kaporit/klorin sterilisasi, kapur dolomit/kaptan, garam mineral esensial Mg/Ca/K, dan bakteri bioremediasi); (5) Tenaga Kerja Langsung (gaji teknisi petak, upah harian sipon/pemberi pakan, dan insentif bonus produksi); (6) Biaya Panen & Pascapanen (upah regu tangkap, es balok rantai dingin, dan tara keranjang timbang); serta (7) Depresiasi Alat Kolam (penyusutan dinamo kincir, pompa celup, dan geomembran HDPE selama masa DOC).",
    },
    {
      question: "Mengapa pakan udang menyerap 50–60% dari total HPP dan bagaimana cara mengendalikan pembengkakannya?",
      answer:
        "Formulasi pakan udang vaname komersial memerlukan kandungan protein tinggi (30–40%) berbahan tepung ikan laut, cumi, dan asam amino esensial yang berharga mahal, sehingga secara alami mendominasi 50% hingga 60% total pengeluaran siklus. Pengendalian biaya pakan bukan dilakukan dengan memotong jatah ransum secara sembarangan hingga udang mengalami kekurangan gizi (underfeeding), melainkan dengan menjaga efisiensi Rasio Konversi Pakan (FCR). Setiap pembengkakan FCR sebesar 0,1 poin (misalnya dari 1,3 menjadi 1,4) menaikkan biaya produksi sebesar Rp 1.500–2.000 per kg udang. Efisiensi dicapai melalui pemantauan ketat nampan kontrol (anco), penyesuaian pakan harian berdasarkan nafsu makan dan dinamika oksigen terlarut (DO), kalibrasi auto-feeder, serta disiplin rotasi stok gudang FIFO.",
    },
    {
      question: "Bagaimana rumus dan langkah menghitung HPP per kilogram udang pada siklus yang menerapkan panen parsial dan panen total?",
      answer:
        "Perhitungan HPP per kg dilakukan dengan membagi total seluruh biaya produksi yang dikeluarkan selama siklus dengan akumulasi total tonase bersih udang yang berhasil dijual, menggabungkan hasil seluruh panen parsial (thinning) dan panen total akhir: HPP per kg (Rp/kg) = Total Biaya Pokok Produksi Kolam (Rp) / Total Bobot Udang Terjual (kg). Misalnya, jika satu petak kolam menghabiskan total biaya produksi Rp 240.000.000 dan menghasilkan 1.500 kg dari panen parsial ditambah 3.500 kg dari panen total (total 5.000 kg udang terjual), maka HPP per kg adalah Rp 48.000 per kilogram. Nilai HPP riil ini menjadi batas bawah harga jual minimum saat bernegosiasi dengan pembeli atau cold storage.",
    },
    {
      question: "Mengapa panen yang menghasilkan tonase biomassa tinggi belum tentu menghasilkan margin laba yang tinggi?",
      answer:
        "Tonase panen yang besar dapat memberikan ilusi kesuksesan semu apabila dicapai dengan biaya yang membengkak tidak terkendali. Laba bersih dapat tergerus tajam jika: (1) FCR melonjak tinggi akibat overfeeding, sehingga keuntungan penjualan tersedot habis oleh tagihan pakan; (2) Masa budidaya berlangsung terlalu lama (DOC tinggi) dengan pertambahan bobot harian (ADG) yang stagnan (<0,15 g/hari), melipatgandakan tagihan listrik kincir dan gaji pekerja harian; (3) Tingkat kelangsungan hidup (SR) rendah akibat mortalitas tersembunyi di dasar kolam; atau (4) Sebagian besar udang yang dipanen berukuran kecil (size kecil) atau mengalami cacat cangkang (reject/BS) yang terkena potongan harga tajam dari pihak pembeli.",
    },
    {
      question: "Bagaimana cara membebankan biaya overhead bersama (listrik kantor, genset cadangan, kendaraan operasional) ke setiap petak kolam?",
      answer:
        "Biaya bersama (shared cost) fasilitas tambak dialokasikan ke masing-masing kolam menggunakan metode yang adil dan konsisten: (1) Berdasarkan Proporsi Luas Permukaan atau Volume Air Kolam untuk beban sewa lahan tambak, penerangan umum, dan biaya keamanan; (2) Berdasarkan Jam Operasional / Hari Pemeliharaan (DOC) untuk pemakaian solar genset sentral atau pompa intake air laut utama; atau (3) Berdasarkan Proporsi Biomassa Pakan yang Dikonsumsi untuk biaya timbangan dan logistik gudang. Kuncinya adalah konsistensi metode pencatatan sejak hari tebar hingga panen agar perbandingan performa antar-petak kolam tetap objektif dan dapat dipercaya.",
    },
  ],
  sections: [
    {
      heading: "Mengapa HPP (COGS) sangat krusial dalam budidaya udang vaname",
      body: [
        "Harga Pokok Penjualan (HPP / Cost of Goods Sold) merupakan metrik keuangan paling mendasar untuk mengukur berapa biaya riil yang dikeluarkan tambak guna menghasilkan setiap kilogram udang yang berhasil dipanen dan dijual. Tanpa kalkulasi HPP yang akurat, sebuah siklus budidaya dapat terlihat sangat berhasil berdasarkan tonase panen di timbangan, namun sebenarnya mengalami kerugian atau hanya menghasilkan margin laba yang sangat tipis.",
        "Kajian ilmiah mengenai profitabilitas tambak udang komersial menegaskan bahwa pakan, benur, energi listrik/BBM, perlakuan kimia/probiotik, dan tenaga kerja merupakan biaya variabel terbesar yang menentukan kelangsungan bisnis akuakultur. Manajemen pakan memegang peranan paling sentral karena berpengaruh ganda: menjadi beban biaya operasional terbesar sekaligus penentu utama stabilitas kualitas air kolam. Dengan mengelola pembukuan biaya per petak kolam secara transparan melalui [Software Manajemen Keuangan Tambak Udang](/id/features/shrimp-farm-finance), petambak dapat mendeteksi inefisiensi operasional jauh sebelum siklus berakhir.",
      ],
    },
    {
      heading: "Struktur biaya operasional tambak: Membedah 7 komponen utama HPP per siklus",
      body: [
        "Penetapan HPP tambak udang vaname (Litopenaeus vannamei) yang disiplin memerlukan pengelompokan seluruh pengeluaran langsung dan biaya pendukung ke dalam 7 pos operasional yang terikat langsung pada siklus petak kolam:",
      ],
      items: [
        "1. Biaya Pakan (50%–60% total HPP): Komponen biaya variabel terbesar dalam budidaya udang. Mengendalikan biaya pakan dilakukan dengan menjaga efisiensi FCR melalui pemantauan anco dan program pemberian pakan yang disiplin di [Panduan Optimalisasi FCR Tambak Udang](/id/resources/fcr-shrimp-farming) serta audit fisik stok gudang di [Kontrol Inventaris Pakan](/id/resources/feed-inventory-control).",
        "2. Biaya Benur (8%–15% total HPP): Pembelian benur post-larvae (PL 8–10) bersertifikat SPF (Specific Pathogen Free) atau SPR (Specific Pathogen Resistant), biaya transportasi beroksigen, dan uji laboratorium PCR terhadap virus mematikan (WSSV, IMNV, IHHNV) serta mikrosporidia EHP.",
        "3. Biaya Energi Listrik & Bahan Bakar (12%–18% total HPP): Tagihan listrik PLN untuk kincir air aerasi (paddle wheel), blower, dan pompa celup, ditambah konsumsi bahan bakar solar industri untuk genset cadangan dan pompa transfer air tandon.",
        "4. Kimia, Mineral, & Probiotik (6%–10% total HPP): Kaporit/klorin untuk sterilisasi air tandon pra-tebar, kapur pengatur pH dan alkalinitas (dolomit, kaptan/CaCO3), garam mineral penunjang molting (Mg, Ca, K), serta probiotik bakteri nitrifikasi dan Bacillus untuk bioremediasi bahan organik dasar kolam.",
        "5. Tenaga Kerja Langsung (5%–8% total HPP): Upah teknisi kolam, gaji harian pekerja pakan dan sipon lumpur malam hari, serta bonus target performa budidaya berbasis pencapaian SR dan tonase.",
        "6. Biaya Persiapan Kolam & Panen (3%–6% total HPP): Biaya pengurasan, pencucian semprot terpal/plastik HDPE, perbaikan pipa monik, upah tim tangkap jaring, pengadaan es balok rantai dingin (cold chain), dan perlengkapan penimbangan dari [Pelacakan Panen Udang](/id/resources/shrimp-harvest-tracking).",
        "7. Beban Depresiasi Sarana Kolam (3%–5% total HPP): Alokasi penyusutan nilai ekonomis aset bergerak per petak kolam selama masa DOC budidaya, seperti dinamo kincir, gearbox, pompa air, dan pelapisan geomembran HDPE.",
      ],
      note: "Prinsip Keuangan Tambak: Biaya pengeluaran modal (CAPEX) seperti pembelian genset baru atau pembuatan kolam baru tidak boleh langsung dibebankan seluruhnya ke dalam HPP satu siklus. Nilai tersebut harus disusutkan (depresiasi) secara proporsional sesuai estimasi umur ekonomis aset dan jumlah hari pemeliharaan (DOC).",
    },
    {
      heading: "Matriks rincian struktur biaya HPP tambak udang intensif",
      body: [
        "Berikut adalah tabel estimasi proporsi struktur biaya operasional standar pada budidaya udang vaname intensif bersalinitas sedang hingga tinggi, beserta pemicu pemborosan dan strategi pengendaliannya di lapangan:",
      ],
      table: {
        columns: ["Kategori Pengeluaran", "Estimasi Porsi HPP (%)", "Komponen Biaya Spesifik", "Pemicu Pembengkakan", "Strategi Pengendalian Tambak"],
        rows: [
          [
            "Pakan Udang",
            "50% – 60%",
            "Pakan crumble starter, pellet grower dan finisher berkadar protein 32–40%",
            "Overfeeding, FCR jebol di atas target, pakan tercecer di anco, pakan rusak/berjamur akibat gudang lembap",
            "Kontrol anco disiplin tiap 2 jam, pasang auto-feeder terkalibrasi, gunakan feeding rate berbasis biomassa riil, terapkan rotasi FIFO gudang",
          ],
          [
            "Benur (Post-Larvae PL)",
            "8% – 15%",
            "Benur PL 8–10 SPF/SPR, skrining PCR penyakit, biaya transportasi tabung oksigen",
            "Benur kualitas rendah berujung mortalitas dini, tebar ulang (re-stocking), survival rate (SR) di bawah 50%",
            "Pilih hatchery terakreditasi resmi, lakukan uji stres formalin dan salinitas sebelum tebar, lakukan aklimatisasi suhu bertahap",
          ],
          [
            "Energi (Listrik & Solar)",
            "12% – 18%",
            "Tarif listrik industri PLN untuk kincir air aerasi dan pompa tandon, solar industri genset cadangan",
            "Operasional kincir berlebihan di awal siklus saat biomassa masih kecil, mesin pompa diesel tua yang boros bahan bakar",
            "Tambah kincir bertahap mengikuti kurva biomassa (1 HP per 400–500 kg udang), servis rutin motor/gearbox, hindari jam tarif puncak PLN bila memungkinkan",
          ],
          [
            "Probiotik, Mineral, & Kimia",
            "6% – 10%",
            "Kaporit/klorin sterilisasi, dolomit, kaptan, mineral Mg/Ca/K, pupuk plankton, bakteri probiotik bioremediasi",
            "Aplikasi bahan kimia 'secara buta' tanpa cek parameter air, panik berlebih saat air kolam berubah warna",
            "Pemberian dosis berbasis data pengujian harian DO, pH, dan alkalinitas sesuai panduan kualitas air, seleksi probiotik bersertifikat",
          ],
          [
            "Tenaga Kerja Langsung",
            "5% – 8%",
            "Gaji teknisi kepala, upah harian pekerja kolam, uang lembur sipon dasar malam hari, bonus performa panen",
            "Produktivitas kerja rendah, tingginya pergantian pekerja (turnover), kelalaian pengecekan anco dan kontrol kincir",
            "Tetapkan SOP operasional harian yang jelas, alokasikan tanggung jawab per petak kolam, berikan insentif berbasis efisiensi FCR dan SR",
          ],
          [
            "Biaya Panen & Pascapanen",
            "3% – 6%",
            "Upah regu jaring panen, es balok food-grade rantai dingin (rasio es 1:1), boks fiber insulasi, susut timbang",
            "Susut timbang tinggi (>3%) akibat es kurang atau transit lambat, tingginya persentase udang reject/BS akibat cangkang lembek",
            "Puasakan udang 4–6 jam pra-panen, rendam es slurry instan 0–2°C, kalibrasi timbangan digital di depan pembeli, hindari panen saat molting massal",
          ],
          [
            "Depresiasi Sarana & Alat",
            "3% – 5%",
            "Penyusutan nilai geomembran HDPE, dinamo kincir, impeller, gearbox, pompa celup, dan pipa instalasi tambak",
            "Kerusakan dini mesin akibat korosi air asin yang tidak dibilas, perawatan alat kolam yang terbengkalai",
            "Jalankan program pemeliharaan preventif, bilas peralatan dengan air tawar pascapanen, simpan spare part kritis di gudang bengkel",
          ],
        ],
      },
      note: "Mengukur biaya secara konsisten: Biaya yang timbul selama satu siklus wajib dicatat sedekat mungkin dengan tanggal kejadiannya. Jangan menunda pencatatan hingga panen usai, karena biaya-biaya kecil yang tercecer sering kali terakumulasi menjadi deviasi pembengkakan yang signifikan.",
    },
    {
      heading: "Metodologi perhitungan matematis HPP per kilogram dan evaluasi margin laba kotor",
      body: [
        "Perhitungan HPP per kilogram udang yang dipanen merupakan tolok ukur utama daya saing ekonomi tambak. Nilai ini menggambarkan berapa biaya riil yang dihabiskan petambak untuk memproduksi satu kilogram udang di petak kolam bersangkutan.",
        "Rumus baku perhitungan HPP per kilogram tambak udang adalah:",
        "HPP per kg (Rp/kg) = Total Akumulasi Biaya Pokok Produksi Siklus (Rp) / Total Bobot Bersih Udang Panen Riil (kg)",
        "Di mana Total Bobot Bersih Udang Panen Riil adalah penjumlahan dari seluruh tonase panen parsial (thinning) ditambah tonase panen total akhir yang diterima oleh pihak pembeli.",
        "Setelah HPP per kilogram diketahui, manajemen tambak dapat mengevaluasi Margin Laba Kotor (Gross Profit Margin) dari siklus budidaya tersebut:",
        "Margin Laba Kotor (Rp/kg) = Rata-rata Harga Jual per kg (Rp/kg) - HPP per kg (Rp/kg)",
        "Persentase Margin Laba Kotor (%) = [Margin Laba Kotor (Rp/kg) / Rata-rata Harga Jual per kg (Rp/kg)] × 100%",
        "Contoh Kasus Riil Tambak Intensif: Sebuah petak kolam 1.000 m² dengan padat tebar 120 ekor/m² (total 120.000 benur) menghabiskan total biaya produksi siklus sebesar Rp 115.200.000 (mencakup pakan Rp 65.000.000, benur Rp 9.600.000, listrik/solar Rp 17.000.000, kimia/mineral Rp 8.000.000, tenaga kerja Rp 7.500.000, panen Rp 4.500.000, dan penyusutan alat Rp 3.600.000). Kolam tersebut menghasilkan 800 kg udang dari panen parsial di DOC 70 dan 1.600 kg dari panen total di DOC 100 (total panen 2.400 kg). Maka, HPP per kilogram kolam adalah Rp 115.200.000 / 2.400 kg = Rp 48.000/kg. Jika udang terjual dengan harga rata-rata Rp 68.000/kg, maka tambak memperoleh margin laba kotor sebesar Rp 20.000/kg (atau 29,4%).",
        "Perhitungan HPP harus selalu dianalisis bersama indikator performa biologis kolam: nilai kelangsungan hidup (SR), rasio konversi pakan (FCR), pertambahan bobot harian (ADG), dan distribusi size udang yang dipantau melalui [Grafik Pertumbuhan Udang Vannamei](/id/resources/vannamei-growth-chart). Hubungan ini membuktikan secara objektif apakah laba tambak tercapai berkat keunggulan teknis budidaya, kondisi harga pasar yang sedang melonjak, atau efisiensi pengendalian biaya operasional.",
      ],
    },
    {
      heading: "SOP pencatatan biaya tambak: Disiplin input real-time vs rekonstruksi pasca-panen",
      body: [
        "Salah satu kesalahan manajemen yang paling sering merugikan petambak adalah kebiasaan merekonstruksi biaya budidaya setelah panen selesai (post-harvest reconstruction). Ketika catatan pengeluaran baru dicari dan dikumpulkan berbulan-bulan setelah bibit ditebar, nota pembelian sering kali hilang, mutasi bahan bakar solar genset tercampur dengan kendaraan pribadi, dan biaya upah lembur atau perbaikan mendadak tidak terdokumentasi.",
        "Praktik terbaik dalam tata kelola tambak modern menuntut pencatatan biaya operasional secara langsung pada saat transaksi terjadi (real-time logging). Setiap karung pakan yang dikeluarkan dari gudang, setiap jeriken solar yang diisikan ke tangki genset, dan setiap pembelian karung dolomit harus langsung dialokasikan ke nomor petak kolam tujuan.",
        "Dengan mengintegrasikan log keuangan harian bersama pencatatan parameter kolam di [Pencatatan Tambak Udang](/id/resources/shrimp-farm-record-keeping) dan perencanaan anggaran di [Perencanaan Siklus Budidaya Udang](/id/resources/shrimp-cycle-planning), manajer tambak dapat memantau pergerakan akumulasi biaya terhadap kurva estimasi biomassa kolam secara langsung. Hal ini memberikan peringatan dini jika proyeksi HPP per kilogram mulai membengkak melampaui batas toleransi yang direncanakan.",
      ],
    },
  ],
  checklist: [
    "Catat seluruh pengeluaran operasional (pakan, benur, listrik, solar, probiotik, mineral, tenaga kerja) langsung ke petak kolam bersangkutan saat transaksi terjadi.",
    "Pisahkan pengeluaran investasi modal (CAPEX) jangka panjang dari biaya operasional langsung (HPP) dengan menerapkan beban depresiasi berkala per hari DOC.",
    "Rekonsiliasi pemotongan stok pakan gudang dengan total kilogram yang dikonsumsi kolam untuk memastikan biaya pakan riil terhitung akurat.",
    "Gabungkan seluruh tonase panen parsial (thinning) dan panen total akhir sebagai pembagi definitif dalam menghitung HPP per kilogram.",
    "Hitung metrik HPP per kilogram dan margin laba kotor (Gross Profit Margin) segera setelah berita acara panen dan slip pembayaran pembeli diterima.",
    "Bandingkan deviasi HPP per kilogram terhadap target awal siklus, lalu evaluasi korelasinya dengan nilai akhir FCR, Survival Rate (SR), dan rata-rata bobot (MBW).",
  ],
  sources: [
    {
      title: "Comparative Analysis of Profitability and Resource Use Efficiency Between Penaeus monodon and Litopenaeus vannamei in India",
      publisher: "Aquaculture Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8096089/",
    },
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
  ],
};
