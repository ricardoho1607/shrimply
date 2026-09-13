import "@/app/globals.css";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Database,
  Droplets,
  Heart,
  Home,
  LayoutGrid,
  Scale,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import Cursor from "@/components/Cursor";
import FooterID from "@/components/FooterID";
import NavbarID from "@/components/NavbarID";
import RevealOnScroll from "@/components/RevealOnScroll";

const cycleStats = [
  ["01", "Kejelasan DOC", "Jaga tanggal tebar, umur kolam, sampling, mortalitas, dan konteks panen tetap terhubung sepanjang siklus budidaya."],
  ["02", "Sinyal pertumbuhan", "Tinjau MBW, ADG, FCR, survival rate, dan pergerakan biomassa tanpa harus menyusun ulang angka secara manual."],
  ["03", "Pemeriksaan harian", "Catat pakan, kualitas air, mortalitas, dan catatan kolam dari lapangan sebelum data hilang atau terlewat."],
  ["04", "Tampilan manajer", "Beri manajer web dashboard yang lebih rapi untuk evaluasi kolam, laporan, keuangan, dan tindak lanjut keputusan."],
];

const workflowCards = [
  {
    label: "Pencatatan lapangan",
    title: "Entri cepat dari tepi kolam",
    body: "Teknisi dapat mencatat aktivitas kolam vannamei dari mobile, termasuk sampling, mortalitas, pakan, kualitas air, dan catatan harian.",
  },
  {
    label: "Evaluasi siklus",
    title: "Konteks siklus budidaya untuk manajer",
    body: "Pemilik dan manajer dapat membandingkan DOC, MBW, ADG, FCR, pergerakan pakan, survival rate, dan kesiapan panen dari web dashboard.",
  },
  {
    label: "Dukungan keputusan",
    title: "Sinyal lebih baik sebelum panen",
    body: "Shrimply menghubungkan catatan pertumbuhan, nafsu makan, kualitas air, dan risiko agar tambak dapat melihat apa yang berubah dan bagian mana yang perlu diperiksa.",
  },
];

const appCoverage = [
  "Tebar benur, DOC, status kolam, dan catatan siklus budidaya",
  "Sampling, MBW, ADG, FCR, survival rate, dan biomassa",
  "Aktivitas pakan, konteks nafsu makan, dan inventaris pakan",
  "Log kualitas air dan evaluasi tren terkini",
  "Mortalitas, perencanaan panen, dan laporan produksi",
  "Kerja lapangan mobile dengan evaluasi web dashboard",
];

export default function VannameiShrimpFarmingLandingID() {
  return (
    <main>
      <RevealOnScroll />
      <Cursor />
      <NavbarID />

      <section className="hero van-hero">
        <div className="hero-left van-hero-copy">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.3s" }}>
            Aplikasi Budidaya Udang Vannamei
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.52s", margin: "24px 0" }}>
            Pantau setiap siklus vannamei <em>dari kolam hingga laporan.</em>
          </h1>
          <p className="animate-hero van-hero-intro" style={{ animationDelay: "0.76s" }}>
            Shrimply membantu tambak vannamei mencatat aktivitas lapangan, melacak pertumbuhan, memantau pakan dan kualitas
            air, mengevaluasi kinerja kolam, serta menyusun laporan dari satu platform mobile dan web.
          </p>
          <div className="animate-hero mobile-cta-row van-hero-actions" style={{ animationDelay: "0.98s" }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Mulai Gratis</Link>
            <Link href="/id/shrimp-farm-management-software" className="btn-outline">Software Tambak</Link>
          </div>
        </div>

        <div className="hero-right van-hero-visual">
          <div className="hero-glow" />
          <div className="van-device-stage">
            <div className="van-web-panel">
              <div className="app-title-bar">
                <div className="app-dot red" />
                <div className="app-dot yel" />
                <div className="app-dot grn" />
                <div className="app-url">shrimplytech.com/dashboard</div>
              </div>
              <div className="van-web-body">
                <div className="db-sidebar van-sidebar">
                  <div className="sb-icon active"><LayoutGrid size={14} /></div>
                  <div className="sb-icon"><Activity size={14} /></div>
                  <div className="sb-icon"><Home size={14} /></div>
                  <div className="sb-icon"><Settings size={14} /></div>
                </div>
                <div className="van-web-main">
                  <div className="van-web-header">
                    <div>
                      <span>Siklus budidaya</span>
                      <strong>Vannamei Blok A</strong>
                    </div>
                    <div className="van-sync-pill">Tersinkronisasi</div>
                  </div>
                  <div className="van-metric-grid">
                    <div>
                      <span>DOC</span>
                      <strong>45</strong>
                    </div>
                    <div>
                      <span>MBW</span>
                      <strong>18.5g</strong>
                    </div>
                    <div>
                      <span>FCR</span>
                      <strong>1.32</strong>
                    </div>
                  </div>
                  <div className="van-growth-card">
                    <div className="van-card-title">
                      <TrendingUp size={15} />
                      Tren pertumbuhan
                    </div>
                    <div className="van-bars">
                      <span style={{ height: "38%" }} />
                      <span style={{ height: "48%" }} />
                      <span style={{ height: "62%" }} />
                      <span style={{ height: "70%" }} />
                      <span style={{ height: "84%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="van-phone">
              <div className="van-phone-speaker" />
              <div className="van-phone-screen">
                <div className="van-phone-top">
                  <span>Hari ini</span>
                  <strong>Kolam A1</strong>
                </div>
                <div className="van-phone-card active">
                  <div>
                    <ClipboardList size={17} />
                    <span>Sampling</span>
                  </div>
                  <strong>MBW 18.5g</strong>
                </div>
                <div className="van-phone-grid">
                  <div>
                    <Scale size={15} />
                    <span>Biomassa</span>
                    <strong>1.24t</strong>
                  </div>
                  <div>
                    <Heart size={15} />
                    <span>Survival</span>
                    <strong>92%</strong>
                  </div>
                </div>
                <div className="van-phone-card">
                  <div>
                    <Droplets size={17} />
                    <span>Kualitas air</span>
                  </div>
                  <strong>Stabil</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-band">
        {cycleStats.map(([number, label, description], index) => (
          <div className={`stat-box r d${index + 1}`} key={label}>
            <div className="stat-num">{number}</div>
            <div className="stat-lbl">{label}</div>
            <div className="stat-desc" style={{ fontWeight: 500 }}>{description}</div>
          </div>
        ))}
      </section>

      <section className="section van-workflows">
        <div className="container">
          <div className="van-section-heading">
            <div className="eyebrow r d1">Alur Kerja Vannamei</div>
            <h2 className="section-title r d2">
              Dibangun berdasarkan catatan yang menentukan <em>keputusan budidaya.</em>
            </h2>
          </div>
          <div className="features-grid van-feature-grid">
            {workflowCards.map((card, index) => (
              <article className={`feature-card r d${index + 1}`} key={card.title}>
                <div className="van-card-label">{card.label}</div>
                <h3 className="feature-title" style={{ marginBottom: "16px" }}>{card.title}</h3>
                <p style={{ fontWeight: 500 }}>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="highlight van-dark-section">
        <div className="highlight-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
              Mobile dan web
            </div>
            <h2 className="section-title" style={{ color: "var(--white)", marginBottom: "24px" }}>
              Tim lapangan mencatat lebih cepat. <em>Manajer mengevaluasi lebih baik.</em>
            </h2>
            <p className="van-dark-copy">
              Tambak vannamei membutuhkan catatan harian yang tetap berguna setelah pemeriksaan kolam selesai.
              Shrimply menjaga alur kerja mobile tetap sederhana sembari mempertahankan konteks yang dibutuhkan manajer
              untuk evaluasi pertumbuhan, keputusan pakan, dan pelaporan.
            </p>
            <div className="van-check-grid">
              {appCoverage.map(item => (
                <div className="van-check" key={item}>
                  <span />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/id/how-it-works" className="btn-primary van-dark-button">Lihat Platform</Link>
          </div>

          <div className="r d3 van-analysis-panel">
            <div className="van-analysis-header">
              <div>
                <span>Evaluasi Orson</span>
                <strong>Konteks variasi pertumbuhan</strong>
              </div>
              <Zap size={22} />
            </div>
            <div className="van-analysis-list">
              <div>
                <BarChart3 size={18} />
                <span>MBW terbaru meningkat, namun ADG melambat dibandingkan sampling sebelumnya.</span>
              </div>
              <div>
                <Droplets size={18} />
                <span>Oksigen terlarut (DO) pagi hari turun dua kali sejak periode sampling terakhir.</span>
              </div>
              <div>
                <Database size={18} />
                <span>Tinjau pembersihan anco sebelum menambah jadwal porsi pakan berikutnya.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section van-faq-section">
        <div className="container mobile-stack-grid van-faq-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ marginBottom: "16px" }}>Pertanyaan</div>
            <h2 className="section-title">
              Aplikasi praktis untuk <em>tim tambak vannamei.</em>
            </h2>
          </div>
          <div className="van-faq-list r d2">
            <details open>
              <summary>Apa saja yang dilacak aplikasi ini untuk tambak vannamei?</summary>
              <p>Shrimply melacak setup kolam, DOC, tebar benur, sampling, MBW, ADG, FCR, mortalitas, pemberian pakan, inventaris pakan, kualitas air, panen, laporan keuangan, dan catatan risiko penyakit.</p>
            </details>
            <details>
              <summary>Bisakah tim lapangan mencatat data di aplikasi mobile?</summary>
              <p>Ya. Tim lapangan dapat menggunakan aplikasi mobile untuk aktivitas harian kolam, sementara manajer mengevaluasi catatan tambak yang sama dari web dashboard.</p>
            </details>
            <details>
              <summary>Bagaimana Shrimply membantu pengambilan keputusan operasional?</summary>
              <p>Shrimply menghubungkan catatan sampling terkini, pakan, kualitas air, mortalitas, dan panen agar tim dapat mengevaluasi dinamika pertumbuhan, perubahan nafsu makan, dan risiko operasional dengan konteks yang lebih utuh.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section van-final-cta">
        <div className="container r d1">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Shrimply</div>
          <h2 className="section-title">
            Berikan produksi vannamei <em>alur kerja harian yang lebih rapi.</em>
          </h2>
          <p>
            Catat data penting di lapangan, lalu gunakan untuk evaluasi pertumbuhan, kontrol pakan,
            pelaporan, dan visibilitas siklus yang lebih baik.
          </p>
          <div className="mobile-cta-row">
            <Link href="/auth/join" prefetch={false} className="btn-primary">Mulai Gratis</Link>
            <Link href="/id/resources" className="btn-outline">Pusat Edukasi</Link>
          </div>
        </div>
      </section>

      <FooterID />

    </main>
  );
}
