"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import NavbarID from '@/components/NavbarID';
import FooterID from '@/components/FooterID';
import { 
  BarChart2, 
  Cpu
} from 'lucide-react';

import Cursor from '@/components/Cursor';

export default function OrsonPageID() {
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
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s', marginBottom: '16px' }}>Di Dalam Pikiran Orson</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.5s', marginBottom: '32px' }}>
            Melampaui Data.<br /><em>Kecerdasan Biologis.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.7s', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
            Pelajari bagaimana Orson mengubah data tambak yang kompleks menjadi deteksi risiko biologis, kecerdasan pakan, dan perkiraan praktis untuk 72 jam ke depan.
          </p>
        </div>
      </section>

      {/* Challenge Section */}
      <section
        className="section dark-section"
        style={{
          background: 'linear-gradient(160deg, var(--navy) 0%, var(--deep) 100%)',
          overflow: 'hidden'
        }}
      >
        <div className="dark-glow"></div>
        <div className="container orson-challenge-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div>
            <div className="eyebrow r" style={{ marginBottom: '16px' }}>Tantangannya</div>
            <h2 className="section-title r d1" style={{ marginBottom: '24px', color: 'var(--white)' }}>
              Angka-angka tidak menceritakan <em>seluruh kisahnya.</em>
            </h2>
            <p className="r d2" style={{ marginBottom: '32px', color: 'rgba(255,255,255,0.72)' }}>
              Metode tambak tradisional mengandalkan gambaran sekilas di pagi hari. Namun satu titik data bukanlah realitas biologis. Saat Anda melihat tingkat pH normal, Orson melihat tren penurunan selama 3 hari yang berkorelasi dengan peningkatan catatan pakan Anda.
            </p>
          </div>
          <div className="r d3">
            <div className="orson-chat-panel" style={{ background: 'rgba(244,248,252,0.96)', border: '1px solid rgba(26,184,232,0.26)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 26px 80px rgba(0,0,0,0.32)' }}>
              <div className="orson-chat-bubble-user" style={{ padding: '14px 18px', borderRadius: '10px', fontSize: '0.9rem', maxWidth: '82%', background: 'linear-gradient(135deg, var(--blue) 0%, var(--sky) 100%)', color: 'var(--white)', alignSelf: 'flex-end', borderBottomRightRadius: '2px', lineHeight: 1.6, boxShadow: '0 10px 24px rgba(26,184,232,0.22)' }}>
                &quot;Saya memeriksa kolam setiap pagi. Saya punya tumpukan buku catatan berisi data pH dan Suhu. Tapi bulan lalu, algae crash yang tiba-tiba memusnahkan 10% populasi udang saya. Mengapa saya tidak menyadarinya sebelumnya?&quot;
              </div>
              <div className="orson-chat-bubble-orson" style={{ padding: '14px 18px', borderRadius: '10px', fontSize: '0.9rem', maxWidth: '82%', background: 'var(--white)', color: 'var(--ink)', alignSelf: 'flex-start', borderBottomLeftRadius: '2px', border: '1px solid var(--slate)', lineHeight: 1.6 }}>
                &quot;Karena satu angka hanyalah gambaran sesaat. Saya melihat pola biologisnya: tekanan pakan, pergerakan DO, fluktuasi pH, dan tren pertumbuhan. Kombinasi tersebut seharusnya sudah memberikan peringatan dini sebelum tanda-tanda visual terlihat jelas.&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sampling Gap Section */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <div className="eyebrow r" style={{ marginBottom: '16px', textAlign: 'center' }}>Kesenjangan Sampling</div>
          <h2 className="section-title r d1" style={{ textAlign: 'center', marginBottom: '64px' }}>
            Menyelesaikan masalah <em>pengukuran manual yang tidak akurat.</em>
          </h2>
          <div className="features-grid">
            <div className="feature-card r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><BarChart2 size={26} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Realitas yang &quot;Berisik&quot;</h3>
              <p>Sampling manual tidak pernah 100% akurat. Terkadang Anda menjaring udang berukuran kecil; terkadang yang besar. Dalam budidaya tradisional, &quot;noise&quot; ini membuat grafik pertumbuhan tampak seperti roller coaster.</p>
            </div>
            <div className="feature-card r d3" style={{ gridColumn: 'span 2' }}>
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Cpu size={26} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Penghalusan Statistik Orson</h3>
              <p>Orson tidak hanya sekadar &quot;menghubungkan titik-titik data.&quot; Orson menggunakan garis tren biologis terkini untuk mengurangi noise sampling, menyoroti outlier, dan mengestimasi tingkat keyakinan pertumbuhan dari data yang dicatat tambak Anda.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Appetite Section */}
      <section className="section">
        <div className="container mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div className="r d1">
            <div style={{ background: 'var(--white)', border: '1px solid var(--slate)', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ color: 'var(--ink)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Diagnosis Real-Time</div>
              <div style={{ background: 'var(--ice)', color: 'var(--ink)', fontStyle: 'italic', fontSize: '1rem', padding: '12px 16px', borderRadius: '8px', alignSelf: 'flex-start', borderBottomLeftRadius: '2px' }}>
                &quot;Parameter air saat ini dalam rentang normal, namun konsumsi anco 40% mengindikasikan risiko stres atau overfeeding. Tahan peningkatan pakan berikutnya dan periksa kembali DO, fluktuasi pH, serta tren nafsu makan.&quot;
              </div>
            </div>
          </div>
          <div>
            <div className="eyebrow r d2" style={{ marginBottom: '16px' }}>Analisis Nafsu Makan</div>
            <h2 className="section-title r d3" style={{ marginBottom: '24px' }}>
              Sistem <em>Kecerdasan Pakan.</em>
            </h2>
            <p className="r d4" style={{ marginBottom: '32px' }}>
              Nafsu makan sering kali berubah sebelum kematian terlihat. Orson memadukan pengecekan anco pakan, estimasi biomassa, dan kualitas air sebagai sinyal peringatan dini stres.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="stats-band">
        <div className="stat-box r d1">
          <div className="stat-num">01</div>
          <div className="stat-lbl">Biosekuriti Utama</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Menandai pola risiko biologis sebelum terlihat jelas secara visual.</p>
        </div>
        <div className="stat-box r d2">
          <div className="stat-num">02</div>
          <div className="stat-lbl">Pemberian Pakan Presisi</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Mengoptimalkan FCR untuk menekan komponen biaya terbesar dalam tambak.</p>
        </div>
        <div className="stat-box r d3">
          <div className="stat-num">03</div>
          <div className="stat-lbl">Perkiraan Panen</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Mengetahui target ukuran pasar dan bobot beberapa minggu sebelumnya.</p>
        </div>
        <div className="stat-box r d4">
          <div className="stat-num">04</div>
          <div className="stat-lbl">Deteksi Stres</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Mendeteksi penurunan nafsu makan dan stres tersembunyi sebelum kematian dimulai.</p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--off-white)' }}>
        <div className="container">
          <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>Panduan Kecerdasan Tambak Terkait</div>
          <h2 className="section-title r d2" style={{ maxWidth: '860px', marginBottom: '28px' }}>
            Hubungkan Orson AI dengan catatan tambak yang menjelaskan performa kolam.
          </h2>
          <div className="resource-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            {[
              {
                href: '/resources/fcr-shrimp-farming',
                title: 'Meningkatkan FCR dalam budidaya udang',
                body: 'Gunakan catatan pakan, biomassa, mortalitas, dan panen untuk menginterpretasikan feed conversion ratio secara lebih akurat.',
              },
              {
                href: '/resources/feed-tray-observations',
                title: 'Pengamatan anco pakan',
                body: 'Evaluasi sinyal nafsu makan sebelum pakan tak termakan menjadi masalah kualitas air dan FCR.',
              },
              {
                href: '/resources/water-quality-trends',
                title: 'Tren kualitas air',
                body: 'Pantau DO, pH, salinitas, amonia, dan nitrit secara bersamaan daripada memperlakukan pembacaan sebagai angka terpisah.',
              },
              {
                href: '/resources/white-spot-syndrome-virus-shrimp',
                title: 'Respon dan pencegahan WSSV',
                body: 'Hubungkan mortalitas, nafsu makan, pergerakan kolam, dan tindakan biosekuriti saat WSSV dicurigai.',
              },
              {
                href: '/features/disease-alerts',
                title: 'Peringatan penyakit',
                body: 'Lihat bagaimana Shrimply menjaga konteks risiko penyakit tetap terhubung dengan catatan air, pakan, pertumbuhan, dan mortalitas.',
              },
            ].map(item => (
              <Link
                href={item.href}
                key={item.href}
                className="r d3"
                style={{
                  display: 'block',
                  background: 'var(--white)',
                  border: '1px solid var(--slate)',
                  borderRadius: '12px',
                  padding: '22px',
                  color: 'var(--ink)',
                }}
              >
                <h3 className="feature-title" style={{ fontSize: '1.12rem', marginBottom: '10px' }}>{item.title}</h3>
                <p style={{ fontWeight: 500 }}>{item.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section" style={{ textAlign: 'center', background: 'var(--white)' }}>
        <div className="container">
          <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>Mulai</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px' }}>
            Siap <em>bertambak lebih cerdas?</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '480px', margin: '0 auto 40px' }}>
            Rasakan kecanggihan kecerdasan biologis hari ini. Mulai kolam pertama Anda bersama Orson.
          </p>
          <div className="r d4 mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Coba Shrimply Gratis</Link>
            <Link href="/id" className="btn-outline">Kembali ke Beranda</Link>
          </div>
        </div>
      </section>

      <FooterID />

      <style jsx>{`
        @media (max-width: 900px) {
          .orson-challenge-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }

          .orson-chat-panel {
            padding: 22px !important;
          }

          .orson-chat-bubble-user,
          .orson-chat-bubble-orson {
            max-width: 100% !important;
          }
        }
      `}</style>
    </main>
  );
}
