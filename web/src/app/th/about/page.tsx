"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import NavbarTH from '@/components/NavbarTH';
import FooterTH from '@/components/FooterTH';
import { 
  BarChart2, 
  Database, 
  Brain, 
  ShieldCheck, 
  TrendingDown,
  Shuffle,
  ClipboardX
} from 'lucide-react';

import Cursor from '@/components/Cursor';

export default function AboutPageTH() {
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

      {/* Hero Section */}
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s', marginBottom: '20px' }}>เกี่ยวกับ Shrimply</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.5s', marginBottom: '32px', maxWidth: '900px' }}>
            อุตสาหกรรมเพาะเลี้ยงสัตว์น้ำ<br />เคยประสบปัญหาเรื่องข้อมูล<br /><em>เราเข้ามาแก้ไขปัญหานั้น</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.7s', maxWidth: '560px', fontSize: '1.1rem', lineHeight: 1.8 }}>
            สร้างขึ้นโดยเกษตรกรผู้เลี้ยงกุ้งที่เผชิญกับความวุ่นวายของข้อมูลที่กระจัดกระจาย รอบการเลี้ยงที่ล้มเหลว และแพลตฟอร์มที่ไม่เคยมอบข้อมูลเชิงลึกที่แท้จริง Shrimply คือระบบปฏิบัติการที่อุตสาหกรรมนี้คู่ควรและไม่เคยมีมาก่อน
          </p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="section dark-section">
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            <div>
              <div className="eyebrow r" style={{ marginBottom: '16px' }}>ปัญหาที่เกิดขึ้น</div>
              <h2 className="section-title r d1" style={{ marginBottom: '24px', color: 'var(--white)' }}>
                การเลี้ยงกุ้งเป็นหนึ่งในอุตสาหกรรมที่ต้องใช้ความเชี่ยวชาญทางเทคนิคสูงที่สุดในโลก<br /><em>แต่ซอฟต์แวร์ที่มีไม่เคยสะท้อนสิ่งนั้นเลย</em>
              </h2>
              <p className="r d2" style={{ marginBottom: '20px' }}>
                เกษตรกรต้องดำเนินงานผ่านสเปรดชีตที่กระจัดกระจาย แอปพลิเคชันที่ไม่เชื่อมต่อกัน และรายงานที่ไม่สอดคล้องกัน ข้อมูลขาดหายไประหว่างผลัดเปลี่ยนกะ สต็อกสินค้าอยู่ในแอปหนึ่ง อาหารอยู่อีกแอปหนึ่ง คุณภาพน้ำอยู่ในแอปที่สาม
              </p>
              <p className="r d3">
                และเมื่อสิ้นสุดทุกรอบการเลี้ยง ต้องมานั่งกระทบยอดที่ยาวนานและเหน็ดเหนื่อย ซึ่งแทบไม่เคยสรุปออกมาเป็นผลกำไรที่แท้จริงได้เลย
              </p>
            </div>
            <div className="r d2">
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(26,184,232,0.12)', borderRadius: '16px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { icon: <ClipboardX size={18} strokeWidth={1.5} />, text: "บันทึกข้อมูลฟาร์มที่กระจัดกระจายอยู่ในสมุดจดและสเปรดชีต" },
                  { icon: <BarChart2 size={18} strokeWidth={1.5} />, text: "แพลตฟอร์มที่ทำได้แค่เก็บข้อมูล แต่ไม่เคยมอบการวิเคราะห์อัจฉริยะใดๆ" },
                  { icon: <Shuffle size={18} strokeWidth={1.5} />, text: "ต้องใช้ถึง 5 แอปพลิเคชันเพื่อจัดการการทำงานของฟาร์มเพียงแห่งเดียว" },
                  { icon: <TrendingDown size={18} strokeWidth={1.5} />, text: "พลาดเป้าหมายมวลชีวภาพในทุกรอบการเลี้ยงโดยไม่มีการแจ้งเตือนล่วงหน้า" }
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
          <div className="eyebrow r" style={{ marginBottom: '16px', textAlign: 'center' }}>มาตรฐานที่เรากำหนดขึ้น</div>
          <h2 className="section-title r d1" style={{ textAlign: 'center', marginBottom: '20px' }}>
            เราสร้างแพลตฟอร์ม <em>ที่เราอยากใช้งานมาโดยตลอด</em>
          </h2>
          <p className="r d2" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 80px' }}>
            Shrimply คือระบบปฏิบัติการเพาะเลี้ยงสัตว์น้ำแบบรวมศูนย์อย่างแท้จริงระบบแรก สร้างขึ้นเพื่อปิดช่องว่างของข้อมูล เชื่อมโยงทุกส่วนของการดำเนินงาน และช่วยให้คุณเข้าใจสิ่งที่เกิดขึ้นในบ่อเลี้ยงได้อย่างแท้จริง
          </p>
          
          <div className="features-grid">
            <div className="feature-card r d1">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Database size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>ศูนย์กลางข้อมูลหนึ่งเดียว</h3>
              <p>ข้อมูลอาหาร คลังสินค้า คุณภาพน้ำ และการเก็บเกี่ยว รวมอยู่ในที่เดียว ไม่ต้องเสียเวลากระทบยอดข้อมูล ไม่ต้องคาดเดาระหว่างผลัดเปลี่ยนกะอีกต่อไป การดำเนินงานของคุณจะเชื่อมโยงกันอย่างสมบูรณ์แบบ</p>
            </div>
            <div className="feature-card r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Brain size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>ปัญญาประดิษฐ์ทางชีวภาพ</h3>
              <p>Orson AI ไม่ได้ทำหน้าที่เพียงแค่จัดเก็บข้อมูลของคุณ แต่เข้าใจข้อมูลเหล่านั้น โดยเปลี่ยนตัวเลขดิบให้เป็นการคาดการณ์ล่วงหน้า 72 ชั่วโมง การแจ้งเตือนแนวโน้ม และข้อมูลเชิงลึกทางชีวภาพที่ช่วยให้คุณรับมือกับปัญหาก่อนที่จะเกิดความเสียหาย</p>
            </div>
            <div className="feature-card r d3">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><ShieldCheck size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>การป้องกันโรคเชิงรุก</h3>
              <p>โรคไม่เคยรอให้คุณสังเกตเห็น แผนที่การระบาดแบบเรียลไทม์ของเราจะแจ้งเตือนเมื่อฟาร์มใกล้เคียงรายงานการพบโรค มอบเวลาเตรียมความพร้อมที่สามารถปกป้องผลผลิตได้ทั้งรอบการเลี้ยง</p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div className="eyebrow r" style={{ marginBottom: '16px' }}>สิ่งที่เรายึดมั่น</div>
          <h2 className="section-title r d1">
            สี่หลักการสำคัญที่ขับเคลื่อน <em>ทุกการตัดสินใจของเรา</em>
          </h2>
        </div>
        <section className="stats-band">
          <div className="stat-box r d1">
            <div className="stat-num">01</div>
            <span className="stat-lbl">สร้างโดยผู้เลี้ยงกุ้ง</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>ก่อตั้งโดยเกษตรกรผู้เลี้ยงกุ้งที่เผชิญปัญหาจริงด้วยตนเอง ไม่ใช่ทีมซอฟต์แวร์ที่เดาเอาเอง</p>
          </div>
          <div className="stat-box r d2">
            <div className="stat-num">02</div>
            <span className="stat-lbl">ครบจบในที่เดียว</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>แพลตฟอร์มเดียวที่เข้ามาแทนที่กองแอปพลิเคชันและสเปรดชีตที่ฟาร์มส่วนใหญ่ใช้งานอยู่</p>
          </div>
          <div className="stat-box r d3">
            <div className="stat-num">03</div>
            <span className="stat-lbl">เฉพาะทางสำหรับกุ้ง</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>ทุกฟังก์ชันถูกสร้างขึ้นโดยอิงจากชีววิทยาเฉพาะ รูปแบบความเสี่ยง และเศรษฐศาสตร์ของการเพาะเลี้ยงกุ้ง</p>
          </div>
          <div className="stat-box r d4">
            <div className="stat-num">04</div>
            <span className="stat-lbl">การปกป้องเชิงรุก</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>เปลี่ยนผ่านอุตสาหกรรมจากการตามแก้ปัญหาไปสู่การป้องกันเชิงรุก — โดยเฉพาะการแพร่กระจายของโรคที่สร้างความเสียหายร้ายแรง</p>
          </div>
        </section>
      </section>

      {/* CTA Section */}
      <section className="section dark-section" style={{ textAlign: 'center', background: 'linear-gradient(160deg, var(--navy) 0%, var(--deep) 100%)' }}>
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="eyebrow r d1" style={{ marginBottom: '20px' }}>บทสรุป</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px', color: 'var(--white)', maxWidth: '700px', margin: '0 auto 24px' }}>
            การทำฟาร์มคือธุรกิจ<br /><em>เราสร้าง Orson AI เพื่อให้ธุรกิจของคุณเติบโตอย่างมั่นคง</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '480px', margin: '0 auto 48px', color: 'rgba(255,255,255,0.65)' }}>
            ขจัดความวุ่นวาย ป้องกันการสูญเสีย บรรลุเป้าหมายของคุณด้วยความชัดเจนและประสิทธิภาพที่ฟาร์มของคุณสมควรได้รับ
          </p>
          <div className="r d4 mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">เริ่มต้นใช้งานฟรี</Link>
            <Link href="/th/how-it-works" className="btn-outline" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)' }}>ดูวิธีใช้งาน</Link>
          </div>
        </div>
      </section>

      <FooterTH />
    </main>
  );
}
