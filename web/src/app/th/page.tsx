import Link from 'next/link';
import NavbarTH from '@/components/NavbarTH';
import FooterTH from '@/components/FooterTH';
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
      <NavbarTH />

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s' }}>แพลตฟอร์มปัญญาประดิษฐ์สำหรับการเพาะเลี้ยงสัตว์น้ำ</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.52s', margin: '24px 0' }}>
            ซอฟต์แวร์จัดการฟาร์มกุ้ง <br />
            <em>เพื่อการควบคุมบ่อที่แม่นยำ</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.76s', maxWidth: '420px', marginBottom: '40px', fontWeight: 500 }}>
            ติดตามบ่อ สต็อกอาหาร คุณภาพน้ำ การสุ่มตัวอย่าง การเก็บเกี่ยว การเงิน และสัญญาณความเสี่ยงจาก Orson AI ในแพลตฟอร์มเดียว
          </p>
          <div className="animate-hero hero-actions" style={{ animationDelay: '0.98s', display: 'flex', gap: '16px' }}>
            <Link href="/th/how-it-works" className="btn-primary">ดูแพลตฟอร์ม</Link>
            <Link href="/auth/join" prefetch={false} className="btn-outline">เริ่มต้นใช้งานฟรี</Link>
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
                  <div style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', color: '#fff' }}>บ่อที่ใช้งาน</div>
                  <div style={{ background: 'var(--sky)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(26,184,232,0.3)' }}>+</div>
                </div>

                {/* Pond Card 1 */}
                <div className="app-pond-card" style={{ animation: 'fup 0.8s forwards 1.2s', opacity: 0 }}>
                  <div className="app-pond-header">
                    <div className="app-pond-name">บ่อ A1</div>
                    <div className="app-doc-badge" style={{ background: '#1e6fa8' }}>DOC 45</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">มวลชีวภาพ</span>
                          <span className="val">1,240.5 kg</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Shrimp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">ประชากร</span>
                          <span className="val">85,200</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Heart size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">อัตรารอด</span>
                          <span className="val">92.4%</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Maximize2 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">ขนาด</span>
                          <span className="val">54 ตัว/กก.</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <TrendingUp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">ADG</span>
                          <span className="val">0.24 g/วัน</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <BarChart3 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">FCR</span>
                          <span className="val">1.32</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="app-pond-footer">
                    <span style={{ color: 'var(--sky)' }}>📅</span> เริ่มต้น: 15/03/2026 • สุ่มตัวอย่างล่าสุด: 28/04/2026
                  </div>
                </div>

                {/* Pond Card 2 */}
                <div className="app-pond-card" style={{ animation: 'fup 0.8s forwards 1.4s', opacity: 0 }}>
                  <div className="app-pond-header">
                    <div className="app-pond-name">บ่อ B2</div>
                    <div className="app-doc-badge" style={{ background: '#0d2137' }}>DOC 21</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">มวลชีวภาพ</span>
                          <span className="val">420.2 kg</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Shrimp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">ประชากร</span>
                          <span className="val">98,100</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Heart size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">อัตรารอด</span>
                          <span className="val">96.1%</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Maximize2 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">ขนาด</span>
                          <span className="val">233 ตัว/กก.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="app-pond-footer">
                    <span style={{ color: 'var(--sky)' }}>📅</span> เริ่มต้น: 08/04/2026 • สุ่มตัวอย่างล่าสุด: 27/04/2026
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
          <div className="stat-lbl">บันทึกฟาร์ม</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>บ่อ อาหาร คุณภาพน้ำ การสุ่มตัวอย่าง การเก็บเกี่ยว และการเงินในพื้นที่ทำงานเดียว</div>
        </div>
        <div className="stat-box r d2">
          <div className="stat-num">02</div>
          <div className="stat-lbl">สัญญาณความเสี่ยง</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>เชื่อมโยงพฤติกรรมการกิน การเติบโต อัตราการตาย และความเปลี่ยนแปลงของคุณภาพน้ำ</div>
        </div>
        <div className="stat-box r d3">
          <div className="stat-num">03</div>
          <div className="stat-lbl">รายงาน</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>สร้างรายงานผลผลิตกุ้ง กระแสเงินสด ต้นทุนขาย (COGS) กำไรขาดทุน และการคาดการณ์</div>
        </div>
        <div className="stat-box r d4">
          <div className="stat-num">04</div>
          <div className="stat-lbl">Orson AI</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>วิเคราะห์ประวัติบ่อ การให้อาหาร การสุ่มตัวอย่าง และแนวโน้มคุณภาพน้ำล่าสุด</div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" style={{ background: 'var(--white)', padding: '140px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>ทำไมต้อง Shrimply?</div>
            <h2 className="section-title r d2" style={{ maxWidth: '800px', margin: '0 auto' }}>
              การเพาะเลี้ยงสัตว์น้ำแม่นยำ <em>เพื่อผลตอบแทนสูงสุด</em>
            </h2>
          </div>
          <div className="features-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="feature-card r d1">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Layers size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>รองรับระดับองค์กร</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>จัดการฟาร์มหลายแห่งในหลากหลายพื้นที่ได้จากศูนย์ควบคุมบนเว็บที่รวมเป็นหนึ่งเดียว</p>
            </div>
            <div className="feature-card feature-accent r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Cpu size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Orson AI Core</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Orson วิเคราะห์บันทึกบ่อ การตอบสนองต่ออาหาร และแนวโน้มคุณภาพน้ำเพื่อตรวจจับความเสี่ยงทางชีวภาพล่วงหน้า</p>
            </div>
            <div className="feature-card r d3">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><RefreshCcwDot size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>ระบบนิเวศที่ไร้รอยต่อ</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>แอปพลิเคชันมือถือครบวงจรสำหรับการทำงานภาคสนาม และเว็บพอร์ทัลประสิทธิภาพสูงสำหรับการวิเคราะห์ — ซิงค์ข้อมูลตรงกันตลอดเวลา</p>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHT (ORSON AI) */}
      <section className="highlight">
        <div className="highlight-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>พบกับ Orson</div>
            <h2 className="section-title" style={{ color: 'var(--white)', marginBottom: '24px' }}>
              ที่ปรึกษา AI ด้านการเพาะเลี้ยงสัตว์น้ำของคุณ <em>พร้อมให้คำแนะนำตลอดเวลา</em>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '440px', fontSize: '1.05rem', fontWeight: 500, marginBottom: '24px' }}>
              Orson ไม่ใช่แค่แชทบอท แต่เป็นระบบผู้เชี่ยวชาญที่เปลี่ยนบันทึกฟาร์มให้เป็นบริบททางชีวภาพที่นำไปปฏิบัติได้จริงเพื่อการตัดสินใจในแต่ละบ่อ
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><Activity size={18} strokeWidth={1.5} /></div>
                <div>ประเมินแนวโน้มความเสี่ยงทางชีวภาพล่วงหน้า 72 ชั่วโมง</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><TrendingUp size={18} strokeWidth={1.5} /></div>
                <div>คำแนะนำในการให้อาหารและการปล่อยลูกกุ้งที่นำไปปฏิบัติได้จริง</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><Zap size={18} strokeWidth={1.5} /></div>
                <div>การแจ้งเตือนทันทีเมื่อพารามิเตอร์คุณภาพน้ำผิดปกติ</div>
              </div>
            </div>

            <Link href="/th/orson" className="btn-primary" style={{ padding: '16px 36px', display: 'inline-block' }}>เรียนรู้วิธีการทำงานของ Orson</Link>
          </div>
          <div className="r d3 chat-container" style={{ maxWidth: '100%' }}>
            <div className="chat-bubble bubble-user" style={{ animationDelay: '1.5s' }}>บ่อ A1 วันนี้เป็นอย่างไรบ้าง?</div>
            <div className="chat-bubble bubble-orson" style={{ animationDelay: '3s' }}>บ่อ A1 มีความเสถียรดี อย่างไรก็ตาม ระดับ DO ลดลงเล็กน้อยเมื่อเวลา 04:00 น. แนะนำให้เพิ่มการเติมอากาศขึ้น 15% ในช่วง 2 ชั่วโมงข้างหน้า</div>
            <div className="chat-bubble bubble-user" style={{ animationDelay: '6s' }}>บ่อ B2 ให้อาหารมากเกินไปหรือไม่?</div>
            <div className="chat-bubble bubble-orson" style={{ animationDelay: '7.5s' }}>ปริมาณการให้อาหารสูงกว่าการประเมินมวลชีวภาพ แนะนำให้ชะลอการเพิ่มอาหารรอบถัดไปและตรวจสอบการกินอาหารในยอก่อนปรับเพิ่ม</div>
            <div className="chat-typing">Orson กำลังคิด...</div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="section" style={{ background: 'var(--off-white)', textAlign: 'center', padding: '160px 52px' }}>
        <div className="container r d1">
          <h2 className="section-title" style={{ marginBottom: '24px' }}>พร้อมยกระดับ <em>ฟาร์มของคุณแล้วหรือยัง?</em></h2>
          <p style={{ marginBottom: '40px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', fontWeight: 500, fontSize: '1.05rem' }}>
            สร้างขึ้นโดยผู้เลี้ยงกุ้ง เพื่อผู้เลี้ยงกุ้ง สัมผัสความชัดเจนและการควบคุมที่ฟาร์มของคุณคู่ควร
          </p>
          <div className="mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary" style={{ padding: '18px 46px', fontSize: '0.8rem' }}>เริ่มต้นใช้งานฟรี</Link>
            <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: '18px 46px', fontSize: '0.8rem' }}>ดาวน์โหลดบน Google Play</a>
          </div>
        </div>
      </section>

      <FooterTH />
    </main>
  );
}
