import Link from 'next/link';
import NavbarID from '@/components/NavbarID';
import FooterID from '@/components/FooterID';
import Cursor from '@/components/Cursor';
import RevealOnScroll from '@/components/RevealOnScroll';
import { GOOGLE_PLAY_URL } from '@/config/site';
import { 
  LayoutGrid, 
  Activity, 
  Home, 
  Settings, 
  Scale, 
  Heart, 
  Maximize2, 
  TrendingUp, 
  BarChart3,
  Cpu,
  Zap,
  Layers,
  RefreshCcwDot,
  Shrimp
} from 'lucide-react';

export default function LandingPage() {
  return (
    <main>
      <RevealOnScroll />
      <Cursor />
      <NavbarID />

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s' }}>Platform Inteligensi Akuakultur</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.52s', margin: '24px 0' }}>
            Software Manajemen Tambak Udang <br />
            <em>untuk kolam yang terkendali.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.76s', maxWidth: '420px', marginBottom: '40px', fontWeight: 500 }}>
            Lacak kolam, inventaris pakan, kualitas air, sampling pertumbuhan, panen, keuangan, dan sinyal risiko Orson AI dalam satu platform tambak udang.
          </p>
          <div className="animate-hero hero-actions" style={{ animationDelay: '0.98s', display: 'flex', gap: '16px' }}>
            <Link href="/id/how-it-works" className="btn-primary">Lihat Platform</Link>
            <Link href="/auth/join" prefetch={false} className="btn-outline">Mulai Gratis</Link>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-glow"></div>
          <div className="app-mockup" style={{ 
            animation: 'appSlide 1.1s cubic-bezier(0.25, 1, 0.5, 1) forwards 0.7s', 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            width: '88%',
            height: 'auto',
            aspectRatio: '16/10',
            transform: 'translate(-50%, -50%)', 
            opacity: 0 
          }}>
            <div className="app-title-bar">
              <div className="app-dot red"></div><div className="app-dot yel"></div><div className="app-dot grn"></div>
              <div className="app-url">shrimplytech.com/dashboard</div>
            </div>
            <div className="db-layout">
              <div className="db-sidebar">
                <div className="sb-icon active"><LayoutGrid size={14} /></div>
                <div className="sb-icon"><Activity size={14} /></div>
                <div className="sb-icon"><Home size={14} /></div>
                <div className="sb-icon"><Settings size={14} /></div>
              </div>
              <div className="db-main">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', animation: 'fup 0.8s forwards 1.0s', opacity: 0 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', color: '#fff' }}>Kolam Aktif</div>
                  <div style={{ background: 'var(--sky)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(26,184,232,0.3)' }}>+</div>
                </div>

                {/* Pond Card 1 */}
                <div className="app-pond-card" style={{ animation: 'fup 0.8s forwards 1.2s', opacity: 0 }}>
                  <div className="app-pond-header">
                    <div className="app-pond-name">Kolam A1</div>
                    <div className="app-doc-badge" style={{ background: '#1e6fa8' }}>DOC 45</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Biomassa</span>
                          <span className="val">1.240,5 kg</span>
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
                  <div className="app-pond-footer">
                    <span style={{ color: 'var(--sky)' }}>📅</span> Mulai: 15/03/2026 • Sampling Terakhir: 28/04/2026
                  </div>
                </div>

                {/* Pond Card 2 */}
                <div className="app-pond-card" style={{ animation: 'fup 0.8s forwards 1.4s', opacity: 0 }}>
                  <div className="app-pond-header">
                    <div className="app-pond-name">Kolam B2</div>
                    <div className="app-doc-badge" style={{ background: '#0d2137' }}>DOC 21</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Biomassa</span>
                          <span className="val">420,2 kg</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Shrimp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Populasi</span>
                          <span className="val">98.100</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Heart size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Survival</span>
                          <span className="val">96,1%</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Maximize2 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Ukuran</span>
                          <span className="val">233 ekor/kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="app-pond-footer">
                    <span style={{ color: 'var(--sky)' }}>📅</span> Mulai: 08/04/2026 • Sampling Terakhir: 27/04/2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="stats-band">
        <div className="stat-box r d1">
          <div className="stat-num">01</div>
          <div className="stat-lbl">Catatan Tambak</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Kolam, pakan, air, sampling, panen, dan keuangan dalam satu ruang kerja.</div>
        </div>
        <div className="stat-box r d2">
          <div className="stat-num">02</div>
          <div className="stat-lbl">Sinyal Risiko</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Hubungkan nafsu makan, pertumbuhan, mortalitas, dan dinamika kualitas air.</div>
        </div>
        <div className="stat-box r d3">
          <div className="stat-num">03</div>
          <div className="stat-lbl">Laporan</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Buat laporan udang, arus kas, COGS, P&L, dan proyeksi.</div>
        </div>
        <div className="stat-box r d4">
          <div className="stat-num">04</div>
          <div className="stat-lbl">Orson AI</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Interpretasi riwayat kolam, pakan, sampling, dan kualitas air terkini.</div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" style={{ background: 'var(--white)', padding: '140px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>Mengapa Shrimply?</div>
            <h2 className="section-title r d2" style={{ maxWidth: '800px', margin: '0 auto' }}>
              Akuakultur presisi <em>untuk ROI maksimal</em>
            </h2>
          </div>
          <div className="features-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="feature-card r d1">
              
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Layers size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Skala Enterprise</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Kelola banyak lokasi tambak di berbagai wilayah dari satu pusat kendali web terpadu.</p>
              
            </div>
            <div className="feature-card feature-accent r d2">
              
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Cpu size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Orson AI Core</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Orson menganalisis catatan kolam, respons pakan, dan tren kualitas air untuk mendeteksi risiko biologis lebih awal.</p>
             
            </div>
            <div className="feature-card r d3">
              
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><RefreshCcwDot size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Ekosistem Terpadu</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Aplikasi seluler berfitur lengkap untuk kerja lapangan dan portal web andal untuk analisis — selalu tersinkronisasi.</p>
             
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHT (ORSON AI) */}
      <section className="highlight">
        <div className="highlight-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>Kenali Orson</div>
            <h2 className="section-title" style={{ color: 'var(--white)', marginBottom: '24px' }}>
              Konsultan AI akuakultur Anda. <em>Selalu siap sedia.</em>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '440px', fontSize: '1.05rem', fontWeight: 500, marginBottom: '24px' }}>
              Orson bukan sekadar chatbot. Ini adalah sistem pakar yang mengubah catatan tambak menjadi konteks biologis praktis untuk pengambilan keputusan kolam.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><Activity size={18} strokeWidth={1.5} /></div>
                <div>Prospek risiko biologis 72 jam</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><TrendingUp size={18} strokeWidth={1.5} /></div>
                <div>Rekomendasi pemberian pakan dan tebar benur yang dapat ditindaklanjuti</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><Zap size={18} strokeWidth={1.5} /></div>
                <div>Peringatan instan untuk parameter air yang tidak normal</div>
              </div>
            </div>

            <Link href="/id/orson" className="btn-primary" style={{ padding: '16px 36px', display: 'inline-block' }}>Pelajari Cara Kerja Orson</Link>
          </div>
          <div className="r d3 chat-container" style={{ maxWidth: '100%' }}>
            <div className="chat-bubble bubble-user" style={{ animationDelay: '1.5s' }}>Bagaimana kondisi Kolam A1 hari ini?</div>
            <div className="chat-bubble bubble-orson" style={{ animationDelay: '3s' }}>Kolam A1 stabil. Namun, kadar DO sedikit turun pada pukul 04.00. Tingkatkan aerasi sebesar 15% selama 2 jam ke depan.</div>
            <div className="chat-bubble bubble-user" style={{ animationDelay: '6s' }}>Apakah pemberian pakan di B2 berlebihan?</div>
            <div className="chat-bubble bubble-orson" style={{ animationDelay: '7.5s' }}>Tekanan pakan berada di atas estimasi biomassa. Tahan kenaikan pakan berikutnya dan periksa anco sebelum menambah pakan.</div>
            <div className="chat-typing">Orson sedang berpikir...</div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="section" style={{ background: 'var(--off-white)', textAlign: 'center', padding: '160px 52px' }}>
        <div className="container r d1">
          <h2 className="section-title" style={{ marginBottom: '24px' }}>Siap mengembangkan <em>tambak Anda?</em></h2>
          <p style={{ marginBottom: '40px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', fontWeight: 500, fontSize: '1.05rem' }}>
            Dibangun oleh petambak, untuk petambak. Rasakan kejelasan yang layak untuk operasi Anda.
          </p>
          <div className="mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary" style={{ padding: '18px 46px', fontSize: '0.8rem' }}>Mulai Gratis</Link>
            <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: '18px 46px', fontSize: '0.8rem' }}>Unduh di Google Play</a>
          </div>
        </div>
      </section>

      <FooterID />
    </main>
  );
}
