import "@/app/globals.css";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Cpu,
  Heart,
  Home,
  Layers,
  LayoutGrid,
  Maximize2,
  RefreshCcwDot,
  Scale,
  Settings,
  Shrimp,
  TrendingUp,
  Zap,
} from "lucide-react";
import Cursor from "@/components/Cursor";
import FooterID from "@/components/FooterID";
import NavbarID from "@/components/NavbarID";
import RevealOnScroll from "@/components/RevealOnScroll";

const workflowCards = [
  {
    label: "Kendali kolam",
    title: "Catatan siklus di satu tempat",
    body: "Lacak DOC, tebar benur, survival rate, biomassa, panen, mortalitas, dan catatan kolam tanpa memecah riwayat siklus ke berbagai file.",
  },
  {
    label: "Kontrol pakan",
    title: "Pakan, stok, dan nafsu makan",
    body: "Hubungkan inventaris pakan, aktivitas pemberian pakan, respons anco, dan FCR agar manajer dapat melihat bagaimana tindakan harian memengaruhi kinerja kolam.",
  },
  {
    label: "Kejelasan keuangan",
    title: "Biaya dan laporan",
    body: "Ubah catatan operasional menjadi laporan arus kas, COGS, laba rugi, proyeksi, dan performa udang yang menjelaskan angka-angka secara transparan.",
  },
];

const operatingAreas = [
  "Setup kolam dan pelacakan siklus",
  "Sampling, MBW, ADG, FCR, dan biomassa",
  "Inventaris pakan dan log pemberian pakan",
  "Kualitas air dan sinyal risiko",
  "Panen, keuangan, aset, dan laporan",
  "Alur kerja tim berbasis peran",
];

const proofPoints = [
  ["01", "Catatan kolam", "Berikan pemilik dan manajer pandangan terpadu tentang siklus aktif, tebar benur, mortalitas, sampling, panen, dan status kolam."],
  ["02", "Kontrol pakan", "Jaga stok pakan, penggunaan pakan, nafsu makan, dan konteks pemesanan ulang tetap terhubung ke setiap siklus kolam."],
  ["03", "Konteks risiko", "Tinjau kualitas air, peringatan penyakit, pergerakan pertumbuhan, dan pola tidak biasa sebelum menjadi kerugian yang mahal."],
  ["04", "Laporan", "Buat laporan operasional dan keuangan yang berguna untuk evaluasi, perencanaan, dan akuntabilitas tim."],
];

export default function ShrimpFarmManagementLandingID() {
  return (
    <main>
      <RevealOnScroll />
      <Cursor />
      <NavbarID />

      <section className="hero seo-hero">
        <div className="hero-left seo-hero-copy">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.3s" }}>
            Software Manajemen Tambak Udang
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.52s", margin: "24px 0" }}>
            Jalankan setiap siklus kolam <em>dengan kendali lebih rapi.</em>
          </h1>
          <p className="animate-hero seo-hero-intro" style={{ animationDelay: "0.76s" }}>
            Shrimply menyatukan kolam, pakan, sampling, kualitas air, inventaris, panen, keuangan,
            peringatan penyakit, dan pelaporan ke dalam satu sistem operasi akuakultur.
          </p>
          <div className="animate-hero mobile-cta-row seo-hero-actions" style={{ animationDelay: "0.98s" }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Mulai Gratis</Link>
            <Link href="/id/how-it-works" className="btn-outline">Lihat Cara Kerja</Link>
          </div>
        </div>

        <div className="hero-right seo-hero-visual">
          <div className="hero-glow" />
          <div className="seo-dashboard app-mockup">
            <div className="app-title-bar">
              <div className="app-dot red" />
              <div className="app-dot yel" />
              <div className="app-dot grn" />
              <div className="app-url">shrimplytech.com/dashboard/ponds</div>
            </div>
            <div className="db-layout">
              <div className="db-sidebar">
                <div className="sb-icon active"><LayoutGrid size={14} /></div>
                <div className="sb-icon"><Activity size={14} /></div>
                <div className="sb-icon"><Home size={14} /></div>
                <div className="sb-icon"><Settings size={14} /></div>
              </div>
              <div className="db-main seo-db-main">
                <div className="seo-db-header">
                  <div>
                    <span>Ringkasan tambak</span>
                    <strong>Blok Utara</strong>
                  </div>
                  <div className="seo-status-pill">Sinkronisasi langsung</div>
                </div>

                <div className="seo-metric-row">
                  <div className="seo-metric">
                    <span>Kolam aktif</span>
                    <strong>12</strong>
                  </div>
                  <div className="seo-metric">
                    <span>Stok pakan</span>
                    <strong>8.4t</strong>
                  </div>
                  <div className="seo-metric">
                    <span>Laporan siap</span>
                    <strong>5</strong>
                  </div>
                </div>

                <div className="app-pond-card seo-pond-card">
                  <div className="app-pond-header">
                    <div className="app-pond-name">Kolam A1</div>
                    <div className="app-doc-badge" style={{ background: "#1e6fa8" }}>DOC 45</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Biomassa</span>
                          <span className="val">1.240 kg</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Shrimp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Populasi</span>
                          <span className="val">85.200</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Heart size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Survival</span>
                          <span className="val">92,4%</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Maximize2 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Ukuran</span>
                          <span className="val">54 ekor/kg</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <TrendingUp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">ADG</span>
                          <span className="val">0,24 g/hari</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <BarChart3 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">FCR</span>
                          <span className="val">1,32</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="seo-alert-card">
                  <div>
                    <span>Catatan Orson</span>
                    <strong>Tekanan pakan meningkat lebih cepat dibandingkan biomassa. Tinjau pembersihan anco sebelum menambah porsi pakan besok.</strong>
                  </div>
                  <Zap size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-band">
        {proofPoints.map(([number, label, description], index) => (
          <div className={`stat-box r d${index + 1}`} key={label}>
            <div className="stat-num">{number}</div>
            <div className="stat-lbl">{label}</div>
            <div className="stat-desc" style={{ fontWeight: 500 }}>{description}</div>
          </div>
        ))}
      </section>

      <section className="section seo-workflows">
        <div className="container">
          <div className="seo-section-heading">
            <div className="eyebrow r d1">OS Tambak</div>
            <h2 className="section-title r d2">
              Gantikan catatan yang tersebar dengan satu <em>tampilan operasional.</em>
            </h2>
          </div>
          <div className="features-grid seo-feature-grid">
            {workflowCards.map((card, index) => (
              <article className={`feature-card r d${index + 1}`} key={card.title}>
                <div className="seo-card-label">{card.label}</div>
                <h3 className="feature-title" style={{ marginBottom: "16px" }}>{card.title}</h3>
                <p style={{ fontWeight: 500 }}>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="highlight seo-platform-section">
        <div className="highlight-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
              Dibangun untuk operasional tambak udang
            </div>
            <h2 className="section-title" style={{ color: "var(--white)", marginBottom: "24px" }}>
              Pekerjaan harian tetap praktis. <em>Data menjadi lebih akurat.</em>
            </h2>
            <p className="seo-dark-copy">
              Shrimply menjaga alur kerja lapangan tetap sederhana sembari memberi pemilik dan manajer pandangan yang lebih jelas tentang
              produksi, performa biologis, biaya, dan kesiapan pelaporan.
            </p>
            <div className="seo-check-grid">
              {operatingAreas.map(item => (
                <div className="seo-check" key={item}>
                  <span />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/resources" className="btn-primary seo-dark-button">Jelajahi Panduan</Link>
          </div>

          <div className="r d3 seo-ops-panel">
            <div className="seo-ops-header">
              <div>
                <span>Lapisan manajemen</span>
                <strong>Yang dihubungkan Shrimply</strong>
              </div>
              <Cpu size={22} />
            </div>
            <div className="seo-ops-list">
              <div>
                <Layers size={18} />
                <span>Log lapangan mobile tersinkronisasi ke web dashboard.</span>
              </div>
              <div>
                <Activity size={18} />
                <span>Riwayat sampling dan kualitas air mendukung evaluasi pertumbuhan yang lebih baik.</span>
              </div>
              <div>
                <RefreshCcwDot size={18} />
                <span>Laporan inventaris, panen, dan keuangan tetap terhubung dengan operasional tambak.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section seo-faq-section">
        <div className="container mobile-stack-grid seo-faq-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ marginBottom: "16px" }}>Pertanyaan</div>
            <h2 className="section-title">
              Dibangun untuk tim tambak, <em>bukan spreadsheet biasa.</em>
            </h2>
          </div>
          <div className="seo-faq-list r d2">
            <details open>
              <summary>Apa saja yang dikelola oleh Shrimply?</summary>
              <p>Kolam, tebar benur, sampling, kualitas air, pemberian pakan, inventaris pakan, panen, aset, laporan keuangan, peringatan penyakit, pengaturan perusahaan, peran tim, dan wawasan Orson AI.</p>
            </details>
            <details>
              <summary>Apakah platform ini hanya untuk pencatatan?</summary>
              <p>Tidak. Shrimply dirancang untuk membantu tim menginterpretasikan catatan produksi, mengevaluasi kinerja kolam, menyusun laporan, dan mendeteksi risiko operasional lebih awal.</p>
            </details>
            <details>
              <summary>Apakah mendukung alur kerja mobile dan web?</summary>
              <p>Ya. Tim lapangan dapat mencatat aktivitas tambak di perangkat mobile, sementara manajer menggunakan web dashboard untuk peninjauan, analisis, pelaporan, dan visibilitas tingkat perusahaan.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section seo-final-cta">
        <div className="container r d1">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Shrimply</div>
          <h2 className="section-title">
            Berikan setiap siklus kolam <em>sistem manajemen yang lebih rapi.</em>
          </h2>
          <p>
            Mulai dari catatan harian yang memang dibutuhkan tambak Anda, lalu bangun visibilitas yang lebih baik di seluruh
            produksi, inventaris, keuangan, pelaporan, dan risiko biologis.
          </p>
          <div className="mobile-cta-row">
            <Link href="/auth/join" prefetch={false} className="btn-primary">Mulai Gratis</Link>
            <Link href="/id/vannamei-shrimp-farming-app" className="btn-outline">Aplikasi Vannamei</Link>
          </div>
        </div>
      </section>

      <FooterID />

    </main>
  );
}
