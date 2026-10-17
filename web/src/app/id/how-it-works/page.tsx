"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import NavbarID from '@/components/NavbarID';
import FooterID from '@/components/FooterID';
import Cursor from '@/components/Cursor';
import { Smartphone, Monitor, ChevronRight, ShieldAlert, BarChart3, QrCode, Users, FileText, ShoppingBag, Clock, UserLock } from 'lucide-react';

export default function HowItWorksPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('v');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.r').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Cursor />
      <NavbarID />

      {/* HERO: THE SCALE OF SHRIMPLY */}
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', background: 'var(--off-white)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.2s', marginBottom: '16px' }}>Ringkasan Platform</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.4s', marginBottom: '32px' }}>
            Dari Kolam ke Keuntungan.<br /><em>OS skala penuh.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.6s', maxWidth: '700px', margin: '0 auto', fontSize: '1.15rem', fontWeight: 500, color: 'var(--muted)' }}>
            Ekosistem terpadu yang menghubungkan pekerja tambak, teknisi, manajer, dan pembeli melalui satu sumber kebenaran biologis dan finansial.
          </p>
        </div>
      </section>

      {/* PILLAR 1: FIELD & ASSETS */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '80px', alignItems: 'center' }}>
          <div>
            <div className="eyebrow r" style={{ color: 'var(--sky)', marginBottom: '16px' }}>01 / Kecerdasan Lapangan</div>
            <h2 className="section-title r d1" style={{ marginBottom: '24px' }}>
              Akuntabilitas di <em>tepi kolam.</em>
            </h2>
            <p className="r d2" style={{ marginBottom: '32px', fontSize: '1.05rem', fontWeight: 500 }}>
              Hentikan kehilangan peralatan dan data yang hilang. Shrimply menjembatani kesenjangan antara aset fisik dan catatan digital.
            </p>
            <div className="r d3" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><QrCode size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Pelacakan Aset QR</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Teknisi dan pemilik memindai aset untuk mencatat riwayat servis dan perpindahan. Jangan pernah kehilangan pompa atau kincir air lagi.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><Clock size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Peringatan Perawatan</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Pengingat otomatis saat peralatan mencapai interval servis. Perawatan proaktif untuk mencegah kerusakan di tengah siklus.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><Smartphone size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Pencatatan Offline Tangguh</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Lokasi terpencil? Tidak masalah. Data entri disimpan secara lokal dan otomatis tersinkronisasi begitu mendapat sinyal.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="r d4">
             <div style={{ background: 'var(--ice)', borderRadius: '24px', padding: '40px', border: '1px solid var(--slate)' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><QrCode size={20} /></div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Asset #PW-042</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--sky)', fontWeight: 600 }}>PADDLEWHEEL MOTOR</div>
                      </div>
                   </div>
                   <div style={{ borderTop: '1px solid var(--off-white)', paddingTop: '16px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Last Service:</span> <strong>Apr 12, 2026</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Location:</span> <strong>Pond B2</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e84c1a', fontWeight: 700 }}><span>Status:</span> <span>Service Required</span></div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* PILLAR 2: COMMAND CENTER & RBAC */}
      <section className="section dark-section">
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div className="eyebrow r" style={{ color: 'var(--sky)', marginBottom: '16px' }}>02 / Operasi</div>
            <h2 className="section-title r d1" style={{ color: 'white' }}>
              Pusat Komando: <em>Tata Kelola Terfokus.</em>
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }} className="r d2 mobile-stack-grid">
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <Users size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Akses Berbasis Peran</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                <strong>Pemilik:</strong> Kontrol penuh.<br/>
                <strong>Manajer:</strong> Fokus Keuangan &amp; Inventaris.<br/>
                <strong>Teknisi:</strong> Hanya data lapangan &amp; log.
              </p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <FileText size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Laporan Otomatis</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Pembuatan PDF sekali klik untuk COGS, Profit &amp; Loss, dan Cashflow. Audit keuangan kelas enterprise dalam hitungan detik.</p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <BarChart3 size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Peringatan Inventaris</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Atur batas pemesanan ulang Anda sendiri. Terima notifikasi instan saat pakan atau bahan kimia mencapai level kritis rendah.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PILLAR 3: DISEASE MAP */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '100px', alignItems: 'center' }}>
          <div className="r d1">
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--slate)', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
               <img 
                 src="/assets/disease-map-clean.webp"
                 width="1024"
                 height="1024"
                 alt="Disease Outbreak Map" 
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
               />
               <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--slate)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy)', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                  ⚠️ Outbreak Alert: 2.4km away
               </div>
            </div>
          </div>
          <div>
            <div className="eyebrow r d2" style={{ color: 'var(--sky)', marginBottom: '16px' }}>03 / Biosekuriti</div>
            <h2 className="section-title r d3" style={{ marginBottom: '24px' }}>
              Vaksin <em>Komunitas.</em>
            </h2>
            <p className="r d4" style={{ marginBottom: '32px', fontSize: '1.05rem', fontWeight: 500 }}>
              Kontaminasi di sepanjang pesisir adalah ancaman terbesar industri. Shrimply mengubah keamanan tambak individu menjadi sistem pertahanan kolektif.
            </p>
            <div className="r d5" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ color: '#e84c1a' }}><ShieldAlert size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Notifikasi Instan</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Saat tambak terdekat melaporkan adanya penyakit, Anda langsung diperingatkan. Hitungan detik menyelamatkan siklus panen.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ color: 'var(--sky)' }}><UserLock size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Privasi Total</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Data peta dianonimkan. Identitas tambak Anda tetap privat bagi komunitas sembari tetap berkontribusi pada keamanan kolektif.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLAR 4: MARKETPLACE */}
      <section className="section" style={{ background: 'var(--off-white)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow r d1" style={{ color: 'var(--sky)', marginBottom: '16px' }}>04 / Pasar</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px' }}>
            Menutup <em>Kesenjangan Pembeli.</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '600px', margin: '0 auto 60px', fontSize: '1.05rem', fontWeight: 500 }}>
            Jelajahi postingan pembeli dan informasi pasar, lalu terhubung dengan calon pembeli. Midtrans di Shrimply hanya digunakan untuk pembayaran langganan software, bukan transaksi marketplace, escrow, atau pencairan dana penjual. <Link href="/id/pricing">Lihat produk dan harga langganan.</Link>
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="r d4 mobile-stack-grid-compact">
            <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '1px solid var(--slate)', textAlign: 'left' }}>
              <ShoppingBag size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Untuk Pemilik Tambak</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Jelajahi postingan pembeli aktif dan harga pasar saat ini. Ketahui dengan tepat nilai udang Anda sebelum bernegosiasi.</p>
            </div>
            <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '1px solid var(--slate)', textAlign: 'left' }}>
              <Monitor size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Untuk Pembeli</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Pantau ukuran rata-rata dan tren populasi tambak terdekat. Terhubung dengan pemilik tepat saat kolam mereka mencapai target ukuran Anda.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSITION TO ORSON */}
      <section className="section dark-section" style={{ color: 'white', textAlign: 'center', padding: '120px 0' }}>
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
           <h2 className="section-title r d1" style={{ color: 'white', marginBottom: '32px' }}>
            Data tidak ada artinya tanpa <em>kecerdasan.</em>
           </h2>
           <p className="r d2" style={{ maxWidth: '600px', margin: '0 auto 48px', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', fontWeight: 500 }}>
            Sementara platform Shrimply mencatat operasional Anda, Orson AI menafsirkan biologinya.
           </p>
           <div className="r d3">
              <Link href="/id/orson" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                Pelajari Orson AI Lebih Dalam <ChevronRight size={16} />
              </Link>
           </div>
        </div>
      </section>

      <FooterID />
    </main>
  );
}
