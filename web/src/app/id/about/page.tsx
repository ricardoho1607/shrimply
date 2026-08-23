"use client";

import React, { useEffect } from 'react';
import NavbarID from '@/components/NavbarID';
import FooterID from '@/components/FooterID';
import { 
  Zap, 
  BarChart2, 
  Database, 
  Brain, 
  ShieldCheck, 
  TrendingDown,
  Shuffle,
  ClipboardX
} from 'lucide-react';

import Cursor from '@/components/Cursor';

export default function AboutPage() {
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

      {/* Hero Section */}
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s', marginBottom: '20px' }}>Tentang Shrimply</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.5s', marginBottom: '32px', maxWidth: '900px' }}>
            Industri akuakultur punya<br />masalah data.<br /><em>Kami perbaiki.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.7s', maxWidth: '560px', fontSize: '1.1rem', lineHeight: 1.8 }}>
            Dibangun oleh petambak yang merasakan langsung kekacauan data yang terfragmentasi, siklus yang gagal, dan platform yang tidak memberikan wawasan nyata. Shrimply adalah sistem operasi yang layak didapatkan industri ini dan belum pernah ada sebelumnya.
          </p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="section dark-section">
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            <div>
              <div className="eyebrow r" style={{ marginBottom: '16px' }}>Masalahnya</div>
              <h2 className="section-title r d1" style={{ marginBottom: '24px', color: 'var(--white)' }}>
                Budidaya udang adalah salah satu industri paling teknis di dunia.<br /><em>Software yang ada tidak pernah mencerminkan hal itu.</em>
              </h2>
              <p className="r d2" style={{ marginBottom: '20px' }}>
                Petambak menjalankan operasional melalui spreadsheet yang terfragmentasi, aplikasi yang terputus, dan laporan yang tidak konsisten. Celah data antar shift. Inventaris di satu aplikasi, pakan di aplikasi lain, kualitas air di aplikasi ketiga.
              </p>
              <p className="r d3">
                Dan di akhir setiap siklus, rekonsiliasi yang panjang dan melelahkan yang tidak pernah benar-benar menghasilkan panen yang menguntungkan.
              </p>
            </div>
            <div className="r d2">
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(26,184,232,0.12)', borderRadius: '16px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { icon: <ClipboardX size={18} strokeWidth={1.5} />, text: "Catatan tambak yang tersimpan di buku catatan dan spreadsheet" },
                  { icon: <BarChart2 size={18} strokeWidth={1.5} />, text: "Platform yang menyimpan data tetapi tidak memberikan kecerdasan sama sekali" },
                  { icon: <Shuffle size={18} strokeWidth={1.5} />, text: "Lima aplikasi berbeda untuk mengelola satu operasional tambak" },
                  { icon: <TrendingDown size={18} strokeWidth={1.5} />, text: "Target biomassa terlewat di setiap siklus tanpa peringatan dini" }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <span style={{ color: 'var(--sky)', flexShrink: 0, marginTop: '3px' }}>{item.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Standard Section */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <div className="eyebrow r" style={{ marginBottom: '16px', textAlign: 'center' }}>Standar yang Kami Tetapkan</div>
          <h2 className="section-title r d1" style={{ textAlign: 'center', marginBottom: '20px' }}>
            Kami membangun platform yang <em>selalu kami impikan.</em>
          </h2>
          <p className="r d2" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 80px' }}>
            Shrimply adalah sistem operasi akuakultur terpadu pertama, yang dibangun untuk menutup celah data, menghubungkan setiap bagian operasional Anda, dan benar-benar membantu Anda memahami apa yang terjadi di kolam Anda.
          </p>
          
          <div className="features-grid">
            <div className="feature-card r d1">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Database size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Satu Sumber Kebenaran</h3>
              <p>Data pakan, inventaris, kualitas air, dan panen, semuanya di satu tempat. Tidak ada lagi rekonsiliasi. Tidak ada lagi tebak-tebakan antar shift. Operasional Anda, sepenuhnya terpadu.</p>
            </div>
            <div className="feature-card r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Brain size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Kecerdasan Biologis</h3>
              <p>Orson AI tidak hanya menyimpan data Anda. Ia memahaminya, mengubah angka mentah menjadi prakiraan 72 jam, peringatan tren, dan wawasan biologis yang membuat Anda selalu selangkah di depan sebelum masalah merugikan Anda.</p>
            </div>
            <div className="feature-card r d3">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><ShieldCheck size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Pertahanan Penyakit Proaktif</h3>
              <p>Penyakit tidak menunggu Anda menyadarinya. Peta wabah real-time kami memberi peringatan saat tambak di sekitar melaporkan aktivitas penyakit, memberi Anda waktu persiapan untuk menyelamatkan seluruh siklus.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div className="eyebrow r" style={{ marginBottom: '16px' }}>Apa yang Kami Perjuangkan</div>
          <h2 className="section-title r d1">
            Empat prinsip yang mendasari <em>setiap keputusan yang kami buat.</em>
          </h2>
        </div>
        <section className="stats-band">
          <div className="stat-box r d1">
            <div className="stat-num">01</div>
            <span className="stat-lbl">Dibangun Petambak</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Didirikan oleh petambak yang mengalami masalahnya secara langsung, bukan tim software yang hanya menebak-nebak.</p>
          </div>
          <div className="stat-box r d2">
            <div className="stat-num">02</div>
            <span className="stat-lbl">Semua dalam Satu</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Satu platform menggantikan tumpukan aplikasi dan spreadsheet yang digunakan sebagian besar operasional saat ini.</p>
          </div>
          <div className="stat-box r d3">
            <div className="stat-num">03</div>
            <span className="stat-lbl">Khusus Udang</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Setiap fitur dibangun berdasarkan biologi spesifik, profil risiko, dan ekonomi budidaya tambak udang.</p>
          </div>
          <div className="stat-box r d4">
            <div className="stat-num">04</div>
            <span className="stat-lbl">Perlindungan Proaktif</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Mengubah industri dari penanganan masalah reaktif menjadi pertahanan proaktif — terutama terhadap penyebaran penyakit yang merusak.</p>
          </div>
        </section>
      </section>

      {/* CTA Section */}
      <section className="section dark-section" style={{ textAlign: 'center', background: 'linear-gradient(160deg, var(--navy) 0%, var(--deep) 100%)' }}>
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="eyebrow r d1" style={{ marginBottom: '20px' }}>Intinya</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px', color: 'var(--white)', maxWidth: '700px', margin: '0 auto 24px' }}>
            Tambak adalah bisnis.<br /><em>Kami membangun Orson AI untuk menjaganya tetap seperti itu.</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '480px', margin: '0 auto 48px', color: 'rgba(255,255,255,0.65)' }}>
            Hilangkan kekacauan. Cegah kerugian. Capai target Anda dengan kejelasan dan efisiensi yang layak didapatkan tambak Anda.
          </p>
          <div className="r d4 mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <a href="/auth/join" className="btn-primary">Mulai Gratis</a>
            <a href="/id/how-it-works" className="btn-outline" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)' }}>Lihat Cara Kerja</a>
          </div>
        </div>
      </section>

      <FooterID />
    </main>
  );
}
