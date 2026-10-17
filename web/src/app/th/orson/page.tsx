"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import NavbarTH from '@/components/NavbarTH';
import FooterTH from '@/components/FooterTH';
import { 
  BarChart2, 
  Cpu
} from 'lucide-react';

import Cursor from '@/components/Cursor';

export default function OrsonPageTH() {
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
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s', marginBottom: '16px' }}>เบื้องหลังการทำงานของ Orson</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.5s', marginBottom: '32px' }}>
            ก้าวล้ำกว่าแค่ข้อมูลตัวเลข<br /><em>สู่ความฉลาดทางชีววิทยา</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.7s', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
            Orson ใช้โมเดล frontier ในการให้เหตุผล โดยเชื่อมบันทึกคุณภาพน้ำ การสุ่มตัวอย่าง และอาหารล่าสุด เพื่อช่วยให้คุณเห็นสิ่งที่ควรตรวจสอบเพิ่มเติม
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
            <div className="eyebrow r" style={{ marginBottom: '16px' }}>ความท้าทาย</div>
            <h2 className="section-title r d1" style={{ marginBottom: '24px', color: 'var(--white)' }}>
              ตัวเลขเพียงอย่างเดียวอาจไม่ได้บอก <em>เรื่องราวทั้งหมด</em>
            </h2>
            <p className="r d2" style={{ marginBottom: '32px', color: 'rgba(255,255,255,0.72)' }}>
              การทำฟาร์มแบบดั้งเดิมมักพึ่งพาข้อมูลสรุปเฉพาะช่วงเช้า แต่จุดข้อมูลเพียงจุดเดียวไม่ได้สะท้อนความจริงทางชีววิทยา ในขณะที่คุณเห็นค่า pH อยู่ในระดับปกติ Orson กลับตรวจพบแนวโน้มที่ลดลงต่อเนื่อง 3 วันซึ่งสอดคล้องกับปริมาณการให้อาหารที่เพิ่มขึ้นในบันทึกของคุณ
            </p>
          </div>
          <div className="r d3">
            <div className="orson-chat-panel" style={{ background: 'rgba(244,248,252,0.96)', border: '1px solid rgba(26,184,232,0.26)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 26px 80px rgba(0,0,0,0.32)' }}>
              <div className="orson-chat-bubble-user" style={{ padding: '14px 18px', borderRadius: '10px', fontSize: '0.9rem', maxWidth: '82%', background: 'linear-gradient(135deg, var(--blue) 0%, var(--sky) 100%)', color: 'var(--white)', alignSelf: 'flex-end', borderBottomRightRadius: '2px', lineHeight: 1.6, boxShadow: '0 10px 24px rgba(26,184,232,0.22)' }}>
                &quot;ผมตรวจเช็กบ่อทุกเช้า และมีสมุดบันทึกค่า pH กับอุณหภูมิเต็มไปหมด แต่เมื่อเดือนที่แล้ว ปัญหาแพลงก์ตอนดรอป (algae crash) กะทันหันทำให้กุ้งเสียหายไปถึง 10% ทำไมผมถึงมองไม่เห็นสัญญาณเตือนล่วงหน้า?&quot;
              </div>
              <div className="orson-chat-bubble-orson" style={{ padding: '14px 18px', borderRadius: '10px', fontSize: '0.9rem', maxWidth: '82%', background: 'var(--white)', color: 'var(--ink)', alignSelf: 'flex-start', borderBottomLeftRadius: '2px', border: '1px solid var(--slate)', lineHeight: 1.6 }}>
                &quot;เพราะตัวเลขเพียงค่าเดียวเป็นแค่ภาพถ่ายชั่วขณะ แต่ผมวิเคราะห์รูปแบบทางชีววิทยา ทั้งแรงกดดันจากการให้อาหาร การเปลี่ยนแปลงของค่า DO การแกว่งของค่า pH และแนวโน้มการเติบโต การผสมผสานของข้อมูลเหล่านี้จะส่งสัญญาณเตือนก่อนที่ความเสียหายจะปรากฏให้เห็นด้วยตาเปล่า&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sampling Gap Section */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <div className="eyebrow r" style={{ marginBottom: '16px', textAlign: 'center' }}>ช่องว่างจากการสุ่มตัวอย่าง</div>
          <h2 className="section-title r d1" style={{ textAlign: 'center', marginBottom: '64px' }}>
            แก้ปัญหา <em>ความคลาดเคลื่อนจากการวัดตัวอย่างด้วยตนเอง</em>
          </h2>
          <div className="features-grid">
            <div className="feature-card r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><BarChart2 size={26} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>ความเป็นจริงที่มี &quot;สัญญาณรบกวน&quot; (Noise)</h3>
              <p>การสุ่มตัวอย่างกุ้งด้วยตนเองไม่เคยแม่นยำ 100% บางครั้งคุณอาจสุ่มได้กุ้งตัวเล็ก บางครั้งได้ตัวใหญ่ ในการเลี้ยงแบบดั้งเดิม สัญญาณรบกวนนี้ทำให้กราฟการเติบโตดูผันผวนเหมือนรถไฟเหาะ</p>
            </div>
            <div className="feature-card r d3" style={{ gridColumn: 'span 2' }}>
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Cpu size={26} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>การปรับความเรียบทางสถิติของ Orson</h3>
              <p>Orson ไม่ได้แค่ &quot;ลากเส้นต่อจุด&quot; แต่ใช้เส้นแนวโน้มทางชีววิทยาล่าสุดเพื่อลดสัญญาณรบกวนจากการสุ่มตัวอย่าง ชี้ให้เห็นค่าที่ผิดปกติ (outliers) และประเมินความเชื่อมั่นในการเติบโตจากข้อมูลที่ฟาร์มของคุณบันทึกจริง</p>
            </div>
          </div>
        </div>
      </section>

      {/* Appetite Section */}
      <section className="section">
        <div className="container mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div className="r d1">
            <div style={{ background: 'var(--white)', border: '1px solid var(--slate)', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ color: 'var(--ink)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>การวินิจฉัยแบบเรียลไทม์</div>
              <div style={{ background: 'var(--ice)', color: 'var(--ink)', fontStyle: 'italic', fontSize: '1rem', padding: '12px 16px', borderRadius: '8px', alignSelf: 'flex-start', borderBottomLeftRadius: '2px' }}>
                &quot;พารามิเตอร์น้ำขณะนี้อยู่ในเกณฑ์ปกติ แต่การกินอาหารในยอเพียง 40% บ่งชี้ถึงความเครียดหรือความเสี่ยงจากการให้อาหารเกิน ควรงดการเพิ่มปริมาณอาหารในมื้อถัดไป และตรวจเช็กค่า DO การแกว่งของ pH รวมถึงแนวโน้มความอยากอาหารอีกครั้ง&quot;
              </div>
            </div>
          </div>
          <div>
            <div className="eyebrow r d2" style={{ marginBottom: '16px' }}>การวิเคราะห์ความอยากอาหาร</div>
            <h2 className="section-title r d3" style={{ marginBottom: '24px' }}>
              ระบบ <em>ความฉลาดด้านอาหาร</em>
            </h2>
            <p className="r d4" style={{ marginBottom: '32px' }}>
              ความอยากอาหารของกุ้งมักเปลี่ยนแปลงก่อนที่จะเริ่มเห็นการตาย Orson เชื่อมโยงการตรวจเช็กยออาหาร การประมาณการมวลชีวภาพ (biomass) และคุณภาพน้ำเข้าด้วยกันเพื่อใช้เป็นสัญญาณเตือนความเครียดล่วงหน้า
            </p>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="stats-band">
        <div className="stat-box r d1">
          <div className="stat-num">01</div>
          <div className="stat-lbl">ความปลอดภัยทางชีวภาพเป็นอันดับแรก</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>ระบุรูปแบบความเสี่ยงทางชีวภาพก่อนที่จะเห็นความผิดปกติด้วยตาเปล่า</p>
        </div>
        <div className="stat-box r d2">
          <div className="stat-num">02</div>
          <div className="stat-lbl">การให้อาหารอย่างแม่นยำ</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>เพิ่มประสิทธิภาพค่า FCR เพื่อลดต้นทุนที่เป็นค่าใช้จ่ายหลักในการทำฟาร์ม</p>
        </div>
        <div className="stat-box r d3">
          <div className="stat-num">03</div>
          <div className="stat-lbl">การคาดการณ์การเก็บเกี่ยว</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>รู้ขนาดและน้ำหนักกุ้งที่ตลาดต้องการล่วงหน้านานหลายสัปดาห์</p>
        </div>
        <div className="stat-box r d4">
          <div className="stat-num">04</div>
          <div className="stat-lbl">การตรวจจับความเครียด</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>ตรวจจับการกินอาหารที่ลดลงและความเครียดแฝงก่อนที่กุ้งจะเริ่มตาย</p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--off-white)' }}>
        <div className="container">
          <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>คู่มือความฉลาดทางฟาร์มที่เกี่ยวข้อง</div>
          <h2 className="section-title r d2" style={{ maxWidth: '860px', marginBottom: '28px' }}>
            เชื่อมต่อ Orson AI เข้ากับบันทึกฟาร์มที่อธิบายประสิทธิภาพของบ่อเลี้ยง
          </h2>
          <div className="resource-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            {[
              {
                href: '/th/resources/fcr-shrimp-farming',
                title: 'การปรับปรุงค่า FCR ในการเลี้ยงกุ้ง',
                body: 'ใช้บันทึกอาหาร มวลชีวภาพ อัตราการตาย และการเก็บเกี่ยวเพื่อแปลผล Feed Conversion Ratio ได้อย่างแม่นยำยิ่งขึ้น',
              },
              {
                href: '/th/resources/feed-tray-observations',
                title: 'การสังเกตและเช็กยออาหาร',
                body: 'ประเมินสัญญาณความอยากอาหารก่อนที่อาหารเหลือจะกลายเป็นปัญหาคุณภาพน้ำและค่า FCR',
              },
              {
                href: '/th/resources/water-quality-trends',
                title: 'แนวโน้มคุณภาพน้ำ',
                body: 'อ่านค่า DO, pH, ความเค็ม, แอมโมเนีย และไนไตรท์ร่วมกัน แทนที่จะดูค่าแต่ละตัวแยกจากกัน',
              },
              {
                href: '/th/resources/white-spot-syndrome-virus-shrimp',
                title: 'การรับมือและป้องกันโรคตัวแดงดวงขาว (WSSV)',
                body: 'เชื่อมโยงอัตราการตาย ความอยากอาหาร การเคลื่อนไหวของน้ำในบ่อ และมาตรการความปลอดภัยทางชีวภาพเมื่อสงสัยว่าเกิด WSSV',
              },
              {
                href: '/th/features/disease-alerts',
                title: 'การแจ้งเตือนโรค',
                body: 'ดูวิธีที่ Shrimply เชื่อมโยงบริบทความเสี่ยงของโรคเข้ากับบันทึกคุณภาพน้ำ อาหาร การเติบโต และอัตราการตาย',
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
          <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>เริ่มต้นใช้งาน</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px' }}>
            พร้อมที่จะ <em>ทำฟาร์มอย่างชาญฉลาดขึ้นแล้วหรือยัง?</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '480px', margin: '0 auto 40px' }}>
            สัมผัสพลังแห่งความฉลาดทางชีววิทยาได้แล้ววันนี้ เริ่มต้นจัดการบ่อแรกของคุณไปพร้อมกับ Orson
          </p>
          <div className="r d4 mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">ทดลองใช้ Shrimply ฟรี</Link>
            <Link href="/th" className="btn-outline">กลับสู่หน้าหลัก</Link>
          </div>
        </div>
      </section>

      <FooterTH />

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
