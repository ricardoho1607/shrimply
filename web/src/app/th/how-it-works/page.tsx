"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import NavbarTH from '@/components/NavbarTH';
import FooterTH from '@/components/FooterTH';
import Cursor from '@/components/Cursor';
import { 
  Smartphone, 
  Monitor, 
  ChevronRight,
  ShieldAlert,
  BarChart3,
  QrCode,
  Users,
  FileText,
  ShoppingBag,
  Clock,
  UserLock
} from 'lucide-react';

export default function HowItWorksPageTH() {
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
      <NavbarTH />

      {/* HERO: THE SCALE OF SHRIMPLY */}
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', background: 'var(--off-white)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.2s', marginBottom: '16px' }}>ภาพรวมแพลตฟอร์ม</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.4s', marginBottom: '32px' }}>
            จากหน้าบ่อสู่ผลกำไร<br /><em>ระบบปฏิบัติการเต็มรูปแบบ</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.6s', maxWidth: '700px', margin: '0 auto', fontSize: '1.15rem', fontWeight: 500, color: 'var(--muted)' }}>
            ระบบนิเวศแบบครบวงจรที่เชื่อมโยงคนงานหน้าบ่อ ช่างซ่อม ผู้จัดการ และผู้ซื้อ ผ่านศูนย์กลางข้อมูลทางชีวภาพและการเงินหนึ่งเดียว
          </p>
        </div>
      </section>

      {/* PILLAR 1: FIELD & ASSETS */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '80px', alignItems: 'center' }}>
          <div>
            <div className="eyebrow r" style={{ color: 'var(--sky)', marginBottom: '16px' }}>01 / การจัดการภาคสนาม</div>
            <h2 className="section-title r d1" style={{ marginBottom: '24px' }}>
              ความแม่นยำและตรวจสอบได้ <em>ริมขอบบ่อ</em>
            </h2>
            <p className="r d2" style={{ marginBottom: '32px', fontSize: '1.05rem', fontWeight: 500 }}>
              หยุดปัญหาอุปกรณ์สูญหายและข้อมูลตกหล่น Shrimply เชื่อมช่องว่างระหว่างอุปกรณ์จริงและบันทึกดิจิทัล
            </p>
            <div className="r d3" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><QrCode size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>การติดตามสินทรัพย์ด้วย QR Code</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>ช่างเทคนิคและเจ้าของฟาร์มสแกนสินทรัพย์เพื่อบันทึกประวัติการซ่อมบำรุงและการเคลื่อนย้าย ไม่ต้องกังวลเรื่องปั๊มน้ำหรือใบพัดตีน้ำสูญหายอีกต่อไป</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><Clock size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>การแจ้งเตือนการบำรุงรักษา</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>แจ้งเตือนอัตโนมัติเมื่ออุปกรณ์ถึงรอบการตรวจเช็ก ดูแลเชิงรุกเพื่อป้องกันอุปกรณ์ขัดข้องระหว่างรอบการเลี้ยง</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><Smartphone size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>บันทึกข้อมูลออฟไลน์ได้อย่างเสถียร</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>อยู่ในพื้นที่ห่างไกลสัญญาณ? ไม่มีปัญหา ข้อมูลจะถูกบันทึกไว้ในเครื่องและซิงค์อัตโนมัติทันทีที่มีสัญญาณอินเทอร์เน็ต</p>
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
            <div className="eyebrow r" style={{ color: 'var(--sky)', marginBottom: '16px' }}>02 / การดำเนินงาน</div>
            <h2 className="section-title r d1" style={{ color: 'white' }}>
              ศูนย์บัญชาการ: <em>การกำกับดูแลที่ตรงจุด</em>
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }} className="r d2 mobile-stack-grid">
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <Users size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>การกำหนดสิทธิ์ตามบทบาท</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                <strong>เจ้าของฟาร์ม:</strong> ควบคุมดูแลทั้งหมด<br/>
                <strong>ผู้จัดการ:</strong> เน้นการเงินและคลังสินค้า<br/>
                <strong>ช่างเทคนิค:</strong> ข้อมูลภาคสนามและบันทึกเท่านั้น
              </p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <FileText size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>รายงานอัตโนมัติ</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>สร้างไฟล์ PDF สำหรับต้นทุนขาย (COGS) กำไรขาดทุน และกระแสเงินสดได้ในคลิกเดียว ตรวจสอบบัญชีการเงินระดับองค์กรได้ภายในไม่กี่วินาที</p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <BarChart3 size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>การแจ้งเตือนสต็อกสินค้า</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>กำหนดเกณฑ์การสั่งซื้อใหม่ของคุณเอง รับการแจ้งเตือนทันทีเมื่ออาหารหรือสารเคมีลดลงถึงระดับวิกฤต</p>
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
            <div className="eyebrow r d2" style={{ color: 'var(--sky)', marginBottom: '16px' }}>03 / ความปลอดภัยทางชีวภาพ</div>
            <h2 className="section-title r d3" style={{ marginBottom: '24px' }}>
              วัคซีน <em>เพื่อชุมชน</em>
            </h2>
            <p className="r d4" style={{ marginBottom: '32px', fontSize: '1.05rem', fontWeight: 500 }}>
              การปนเปื้อนตลอดแนวชายฝั่งคือภัยคุกคามที่ใหญ่ที่สุดของอุตสาหกรรม Shrimply เปลี่ยนความปลอดภัยของแต่ละฟาร์มให้เป็นระบบป้องกันร่วมกัน
            </p>
            <div className="r d5" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ color: '#e84c1a' }}><ShieldAlert size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>การแจ้งเตือนทันที</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>ทันทีที่ฟาร์มใกล้เคียงรายงานการพบโรค คุณจะได้รับการแจ้งเตือนทันที ทุกวินาทีมีค่าต่อการปกป้องรอบการเลี้ยง</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ color: 'var(--sky)' }}><UserLock size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>ความเป็นส่วนตัวอย่างสมบูรณ์</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>ข้อมูลแผนที่ถูกทำให้ไม่ระบุตัวตน ตัวตนของฟาร์มคุณจะยังคงเป็นความลับต่อชุมชน ในขณะที่ยังคงมีส่วนร่วมในการสร้างความปลอดภัยร่วมกัน</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLAR 4: MARKETPLACE */}
      <section className="section" style={{ background: 'var(--off-white)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow r d1" style={{ color: 'var(--sky)', marginBottom: '16px' }}>04 / ตลาดกลาง</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px' }}>
            เชื่อมช่องว่างสู่ <em>ผู้รับซื้อ</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '600px', margin: '0 auto 60px', fontSize: '1.05rem', fontWeight: 500 }}>
            Shrimply ไม่ได้ช่วยแค่การเลี้ยงดูเท่านั้น แต่ยังช่วยเรื่องการขาย เราเชื่อมต่อฟาร์มที่พร้อมจับกุ้งเข้ากับผู้รับซื้อที่ให้ราคาดีที่สุดในตลาด
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="r d4 mobile-stack-grid-compact">
            <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '1px solid var(--slate)', textAlign: 'left' }}>
              <ShoppingBag size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>สำหรับเจ้าของฟาร์ม</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>เลือกดูประกาศรับซื้อที่เปิดรับและราคาตลาดล่าสุด รู้มูลค่าที่แท้จริงของกุ้งในบ่อก่อนเริ่มเจรจาต่อรอง</p>
            </div>
            <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '1px solid var(--slate)', textAlign: 'left' }}>
              <Monitor size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>สำหรับผู้รับซื้อ</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>ติดตามขนาดเฉลี่ยและแนวโน้มประชากรกุ้งของฟาร์มใกล้เคียง เชื่อมต่อกับเจ้าของฟาร์มทันทีที่กุ้งในบ่อได้ขนาดตามที่คุณต้องการ</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSITION TO ORSON */}
      <section className="section dark-section" style={{ color: 'white', textAlign: 'center', padding: '120px 0' }}>
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
           <h2 className="section-title r d1" style={{ color: 'white', marginBottom: '32px' }}>
            ข้อมูลจะไร้ความหมายหากปราศจาก <em>ความฉลาดในการวิเคราะห์</em>
           </h2>
           <p className="r d2" style={{ maxWidth: '600px', margin: '0 auto 48px', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', fontWeight: 500 }}>
            ในขณะที่แพลตฟอร์ม Shrimply บันทึกการดำเนินงานของคุณ Orson AI จะทำหน้าที่แปลผลข้อมูลทางชีววิทยา
           </p>
           <div className="r d3">
              <Link href="/th/orson" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                เจาะลึก Orson AI <ChevronRight size={16} />
              </Link>
           </div>
        </div>
      </section>

      <FooterTH />
    </main>
  );
}
