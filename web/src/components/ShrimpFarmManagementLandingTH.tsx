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
import FooterTH from "@/components/FooterTH";
import NavbarTH from "@/components/NavbarTH";
import RevealOnScroll from "@/components/RevealOnScroll";

const workflowCards = [
  {
    label: "การควบคุมบ่อ",
    title: "บันทึกรอบการเลี้ยงในที่เดียว",
    body: "ติดตาม DOC, การปล่อยลูกกุ้ง, อัตรารอด, มวลชีวภาพ, การเก็บเกี่ยว, อัตราการตาย และบันทึกบ่อโดยไม่ต้องแยกข้อมูลลงในหลายไฟล์",
  },
  {
    label: "การจัดการอาหาร",
    title: "อาหาร สต็อก และความอยากอาหาร",
    body: "เชื่อมโยงสต็อกอาหาร บันทึกการให้อาหาร การตรวจสอบยอ และ FCR เพื่อให้ผู้จัดการเห็นว่าการดำเนินการประจำวันส่งผลต่อประสิทธิภาพของบ่ออย่างไร",
  },
  {
    label: "ความชัดเจนทางการเงิน",
    title: "ต้นทุนและรายงาน",
    body: "เปลี่ยนบันทึกการปฏิบัติงานเป็นรายงานกระแสเงินสด ต้นทุนขาย (COGS) กำไรขาดทุน การคาดการณ์ และประสิทธิภาพการผลิตอย่างโปร่งใส",
  },
];

const operatingAreas = [
  "การตั้งค่าบ่อและการติดตามรอบการเลี้ยง",
  "การสุ่มตัวอย่าง, MBW, ADG, FCR และมวลชีวภาพ",
  "คลังสินค้าอาหารและบันทึกการให้อาหาร",
  "คุณภาพน้ำและสัญญาณเตือนความเสี่ยง",
  "การเก็บเกี่ยว การเงิน สินทรัพย์ และรายงาน",
  "เวิร์กโฟลว์ของทีมตามบทบาทหน้าที่",
];

const proofPoints = [
  ["01", "บันทึกบ่อ", "มอบมุมมองแบบรวมศูนย์ให้แก่เจ้าของและผู้จัดการเกี่ยวกับรอบการเลี้ยงที่ใช้งานอยู่ การปล่อยลูกกุ้ง อัตราการตาย การสุ่มตัวอย่าง การเก็บเกี่ยว และสถานะของบ่อ"],
  ["02", "การควบคุมอาหาร", "รักษาข้อมูลสต็อกอาหาร การใช้อาหาร พฤติกรรมการกิน และการสั่งซื้อล่วงหน้าให้เชื่อมโยงกับทุกรอบการเลี้ยง"],
  ["03", "การจัดการความเสี่ยง", "ตรวจสอบคุณภาพน้ำ การแจ้งเตือนโรค อัตราการเติบโต และความผิดปกติก่อนที่จะเกิดความเสียหายร้ายแรง"],
  ["04", "รายงาน", "สร้างรายงานการดำเนินงานและการเงินที่มีประโยชน์สำหรับการประเมินผล การวางแผน และความรับผิดชอบของทีม"],
];

export default function ShrimpFarmManagementLandingTH() {
  return (
    <main>
      <RevealOnScroll />
      <Cursor />
      <NavbarTH />

      <section className="hero seo-hero">
        <div className="hero-left seo-hero-copy">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.3s" }}>
            ซอฟต์แวร์จัดการฟาร์มกุ้ง
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.52s", margin: "24px 0" }}>
            บริหารจัดการทุกรอบการเลี้ยง <em>ด้วยการควบคุมที่แม่นยำยิ่งขึ้น</em>
          </h1>
          <p className="animate-hero seo-hero-intro" style={{ animationDelay: "0.76s" }}>
            Shrimply รวมข้อมูลบ่อ อาหาร การสุ่มตัวอย่าง คุณภาพน้ำ สินค้าคงคลัง การเก็บเกี่ยว การเงิน
            การแจ้งเตือนโรค และรายงานเข้าสู่ระบบปฏิบัติการเพาะเลี้ยงสัตว์น้ำระบบเดียว
          </p>
          <div className="animate-hero mobile-cta-row seo-hero-actions" style={{ animationDelay: "0.98s" }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">เริ่มต้นใช้งานฟรี</Link>
            <Link href="/th/how-it-works" className="btn-outline">ดูวิธีใช้งาน</Link>
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
                    <span>ภาพรวมฟาร์ม</span>
                    <strong>โซนเหนือ</strong>
                  </div>
                  <div className="seo-status-pill">ซิงค์ข้อมูลสด</div>
                </div>

                <div className="seo-metric-row">
                  <div className="seo-metric">
                    <span>บ่อที่ใช้งาน</span>
                    <strong>12</strong>
                  </div>
                  <div className="seo-metric">
                    <span>สต็อกอาหาร</span>
                    <strong>8.4t</strong>
                  </div>
                  <div className="seo-metric">
                    <span>รายงานพร้อม</span>
                    <strong>5</strong>
                  </div>
                </div>

                <div className="app-pond-card seo-pond-card">
                  <div className="app-pond-header">
                    <div className="app-pond-name">บ่อ A1</div>
                    <div className="app-doc-badge" style={{ background: "#1e6fa8" }}>DOC 45</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">มวลชีวภาพ</span>
                          <span className="val">1,240 กก.</span>
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
                          <span className="val">0.24 ก./วัน</span>
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
                </div>

                <div className="seo-alert-card">
                  <div>
                    <span>ข้อสังเกตจาก Orson</span>
                    <strong>ปริมาณการให้อาหารเพิ่มขึ้นเร็วกว่ามวลชีวภาพ ตรวจสอบการกินอาหารในยอก่อนเพิ่มมื้ออาหารในวันพรุ่งนี้</strong>
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
            <div className="eyebrow r d1">ระบบปฏิบัติการฟาร์มกุ้ง</div>
            <h2 className="section-title r d2">
              เปลี่ยนข้อมูลที่กระจัดกระจายสู่ <em>มุมมองการทำงานที่สมบูรณ์แบบ</em>
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
              สร้างขึ้นเพื่อการดำเนินงานฟาร์มกุ้ง
            </div>
            <h2 className="section-title" style={{ color: "var(--white)", marginBottom: "24px" }}>
              การทำงานประจำวันง่ายขึ้น <em>ข้อมูลแม่นยำยิ่งขึ้น</em>
            </h2>
            <p className="seo-dark-copy">
              Shrimply ช่วยให้ขั้นตอนการบันทึกข้อมูลหน้าบ่อเรียบง่าย ขณะเดียวกันก็มอบความชัดเจนให้กับเจ้าของและผู้จัดการเกี่ยวกับ
              ผลผลิต ประสิทธิภาพทางชีวภาพ ต้นทุน และรายงานที่พร้อมใช้งาน
            </p>
            <div className="seo-check-grid">
              {operatingAreas.map(item => (
                <div className="seo-check" key={item}>
                  <span />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/resources" className="btn-primary seo-dark-button">สำรวจคู่มือ</Link>
          </div>

          <div className="r d3 seo-ops-panel">
            <div className="seo-ops-header">
              <div>
                <span>ระดับการจัดการ</span>
                <strong>สิ่งที่ Shrimply เชื่อมต่อ</strong>
              </div>
              <Cpu size={22} />
            </div>
            <div className="seo-ops-list">
              <div>
                <Layers size={18} />
                <span>บันทึกข้อมูลผ่านมือถือ ซิงค์ตรงสู่แดชบอร์ดบนเว็บ</span>
              </div>
              <div>
                <Activity size={18} />
                <span>ประวัติการสุ่มตัวอย่างและคุณภาพน้ำช่วยประเมินการเติบโตได้แม่นยำ</span>
              </div>
              <div>
                <RefreshCcwDot size={18} />
                <span>รายงานสินค้าคงคลัง การเก็บเกี่ยว และการเงินเชื่อมต่อกับการปฏิบัติงานจริง</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section seo-faq-section">
        <div className="container mobile-stack-grid seo-faq-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ marginBottom: "16px" }}>คำถามที่พบบ่อย</div>
            <h2 className="section-title">
              สร้างขึ้นเพื่อทีมฟาร์มกุ้ง <em>ไม่ใช่แค่สเปรดชีตทั่วไป</em>
            </h2>
          </div>
          <div className="seo-faq-list r d2">
            <details open>
              <summary>Shrimply จัดการอะไรได้บ้าง?</summary>
              <p>บ่อเลี้ยง, การปล่อยลูกกุ้ง, การสุ่มตัวอย่าง, คุณภาพน้ำ, การให้อาหาร, สต็อกอาหาร, การเก็บเกี่ยว, สินทรัพย์, รายงานการเงิน, การแจ้งเตือนโรค, การตั้งค่าบริษัท, บทบาทของทีม และข้อมูลเชิงลึกจาก Orson AI</p>
            </details>
            <details>
              <summary>แพลตฟอร์มนี้เป็นเพียงสมุดบันทึกข้อมูลหรือไม่?</summary>
              <p>ไม่ใช่ Shrimply ถูกออกแบบมาเพื่อช่วยวิเคราะห์บันทึกการผลิต ประเมินประสิทธิภาพของบ่อ สร้างรายงาน และตรวจจับความเสี่ยงในการดำเนินงานได้ตั้งแต่เนิ่นๆ</p>
            </details>
            <details>
              <summary>รองรับการใช้งานทั้งบนมือถือและเว็บหรือไม่?</summary>
              <p>ใช่ ทีมงานภาคสนามสามารถบันทึกกิจกรรมในฟาร์มผ่านมือถือได้ ในขณะที่ผู้จัดการสามารถใช้แดชบอร์ดบนเว็บเพื่อตรวจสอบ วิเคราะห์ ออกรายงาน และติดตามภาพรวมระดับบริษัท</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section seo-final-cta">
        <div className="container r d1">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Shrimply</div>
          <h2 className="section-title">
            ยกระดับการจัดการฟาร์มกุ้งทุกรอบการเลี้ยง <em>สู่ระบบที่มีประสิทธิภาพสูงสุด</em>
          </h2>
          <p>
            เริ่มต้นจากบันทึกประจำวันของฟาร์มคุณ แล้วสร้างความโปร่งใสในทุกมิติ ทั้งการผลิต สินค้าคงคลัง การเงิน รายงาน และการควบคุมความเสี่ยงทางชีวภาพ
          </p>
          <div className="mobile-cta-row">
            <Link href="/auth/join" prefetch={false} className="btn-primary">เริ่มต้นใช้งานฟรี</Link>
            <Link href="/th/vannamei-shrimp-farming-app" className="btn-outline">แอปเลี้ยงกุ้งแวนนาไม</Link>
          </div>
        </div>
      </section>

      <FooterTH />
    </main>
  );
}
