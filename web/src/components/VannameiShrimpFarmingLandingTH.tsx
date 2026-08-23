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
import FooterTH from "@/components/FooterTH";
import NavbarTH from "@/components/NavbarTH";
import RevealOnScroll from "@/components/RevealOnScroll";

const cycleStats = [
  ["01", "ความชัดเจนของ DOC", "รักษาบันทึกวันปล่อยกุ้ง อายุบ่อ การสุ่มตัวอย่าง อัตราการตาย และบริบทการเก็บเกี่ยวให้เชื่อมโยงกันตลอดรอบการเลี้ยง"],
  ["02", "สัญญาณการเติบโต", "ตรวจสอบ MBW, ADG, FCR, อัตรารอด และการเปลี่ยนแปลงของมวลชีวภาพโดยไม่ต้องคำนวณตัวเลขใหม่ด้วยตนเอง"],
  ["03", "การตรวจสอบประจำวัน", "บันทึกการให้อาหาร คุณภาพน้ำ อัตราการตาย และบันทึกบ่อจากหน้างานก่อนที่ข้อมูลจะสูญหาย"],
  ["04", "มุมมองของผู้จัดการ", "มอบแดชบอร์ดบนเว็บที่ใช้งานง่ายแก่ผู้จัดการเพื่อประเมินบ่อ ออกรายงาน ติดตามการเงิน และตัดสินใจอย่างทันท่วงที"],
];

const workflowCards = [
  {
    label: "การบันทึกข้อมูลภาคสนาม",
    title: "บันทึกข้อมูลรวดเร็วจากขอบบ่อ",
    body: "ทีมงานภาคสนามสามารถบันทึกกิจกรรมในบ่อกุ้งแวนนาไมผ่านมือถือ รวมถึงการสุ่มตัวอย่าง อัตราการตาย การให้อาหาร คุณภาพน้ำ และบันทึกประจำวัน",
  },
  {
    label: "การประเมินรอบการเลี้ยง",
    title: "บริบทของรอบการเลี้ยงสำหรับผู้จัดการ",
    body: "เจ้าของและผู้จัดการสามารถเปรียบเทียบ DOC, MBW, ADG, FCR, การใช้อาหาร, อัตรารอด และความพร้อมในการเก็บเกี่ยวได้จากแดชบอร์ดบนเว็บ",
  },
  {
    label: "สนับสนุนการตัดสินใจ",
    title: "สัญญาณเตือนล่วงหน้าก่อนการเก็บเกี่ยว",
    body: "Shrimply เชื่อมโยงบันทึกการเติบโต พฤติกรรมการกิน คุณภาพน้ำ และความเสี่ยง เพื่อให้ฟาร์มเห็นการเปลี่ยนแปลงและจุดที่ต้องตรวจสอบอย่างชัดเจน",
  },
];

const appCoverage = [
  "การปล่อยลูกกุ้ง, DOC, สถานะบ่อ และบันทึกรอบการเลี้ยง",
  "การสุ่มตัวอย่าง, MBW, ADG, FCR, อัตรารอด และมวลชีวภาพ",
  "กิจกรรมการให้อาหาร, พฤติกรรมการกิน และคลังสินค้าอาหาร",
  "บันทึกคุณภาพน้ำและการประเมินแนวโน้มล่าสุด",
  "อัตราการตาย, การวางแผนการเก็บเกี่ยว และรายงานการผลิต",
  "การทำงานภาคสนามผ่านมือถือพร้อมการประเมินผลบนเว็บแดชบอร์ด",
];

export default function VannameiShrimpFarmingLandingTH() {
  return (
    <main>
      <RevealOnScroll />
      <Cursor />
      <NavbarTH />

      <section className="hero van-hero">
        <div className="hero-left van-hero-copy">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.3s" }}>
            แอปเลี้ยงกุ้งขาวแวนนาไม
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.52s", margin: "24px 0" }}>
            ติดตามทุกรอบการเลี้ยงกุ้งแวนนาไม <em>ตั้งแต่ขอบบ่อจนถึงรายงานผล</em>
          </h1>
          <p className="animate-hero van-hero-intro" style={{ animationDelay: "0.76s" }}>
            Shrimply ช่วยฟาร์มกุ้งแวนนาไมบันทึกกิจกรรมภาคสนาม ติดตามการเติบโต ตรวจสอบอาหารและคุณภาพน้ำ
            ประเมินประสิทธิภาพของบ่อ และสร้างรายงานผ่านแพลตฟอร์มมือถือและเว็บ
          </p>
          <div className="animate-hero mobile-cta-row van-hero-actions" style={{ animationDelay: "0.98s" }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">เริ่มต้นใช้งานฟรี</Link>
            <Link href="/th/shrimp-farm-management-software" className="btn-outline">ซอฟต์แวร์ฟาร์มกุ้ง</Link>
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
                      <span>รอบการเลี้ยง</span>
                      <strong>แวนนาไม บล็อก A</strong>
                    </div>
                    <div className="van-sync-pill">ซิงค์เรียบร้อย</div>
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
                      แนวโน้มการเติบโต
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
                  <span>วันนี้</span>
                  <strong>บ่อ A1</strong>
                </div>
                <div className="van-phone-card active">
                  <div>
                    <ClipboardList size={17} />
                    <span>การสุ่มตัวอย่าง</span>
                  </div>
                  <strong>MBW 18.5g</strong>
                </div>
                <div className="van-phone-grid">
                  <div>
                    <Scale size={15} />
                    <span>มวลชีวภาพ</span>
                    <strong>1.24t</strong>
                  </div>
                  <div>
                    <Heart size={15} />
                    <span>อัตรารอด</span>
                    <strong>92%</strong>
                  </div>
                </div>
                <div className="van-phone-card">
                  <div>
                    <Droplets size={17} />
                    <span>คุณภาพน้ำ</span>
                  </div>
                  <strong>ปกติ</strong>
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
            <div className="eyebrow r d1">เวิร์กโฟลว์แวนนาไม</div>
            <h2 className="section-title r d2">
              สร้างขึ้นจากข้อมูลสำคัญ <em>เพื่อการตัดสินใจในการเลี้ยงกุ้ง</em>
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
              มือถือและเว็บ
            </div>
            <h2 className="section-title" style={{ color: "var(--white)", marginBottom: "24px" }}>
              ทีมภาคสนามบันทึกได้เร็วขึ้น <em>ผู้จัดการประเมินผลได้ดียิ่งขึ้น</em>
            </h2>
            <p className="van-dark-copy">
              ฟาร์มกุ้งแวนนาไมต้องการบันทึกประจำวันที่ยังคงมีประโยชน์หลังจากการตรวจบ่อเสร็จสิ้น
              Shrimply รักษาขั้นตอนการทำงานบนมือถือให้เรียบง่าย ในขณะที่มอบข้อมูลเชิงลึกที่ผู้จัดการต้องการ
              สำหรับการประเมินการเติบโต การปรับแผนการให้อาหาร และการรายงานผล
            </p>
            <div className="van-check-grid">
              {appCoverage.map(item => (
                <div className="van-check" key={item}>
                  <span />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/th/how-it-works" className="btn-primary van-dark-button">ดูแพลตฟอร์ม</Link>
          </div>

          <div className="r d3 van-analysis-panel">
            <div className="van-analysis-header">
              <div>
                <span>การประเมินจาก Orson</span>
                <strong>บริบทความผันแปรของการเติบโต</strong>
              </div>
              <Zap size={22} />
            </div>
            <div className="van-analysis-list">
              <div>
                <BarChart3 size={18} />
                <span>MBW ล่าสุดเพิ่มขึ้น แต่อัตราการเติบโตรายวัน (ADG) ชะลอตัวลงเมื่อเทียบกับการสุ่มครั้งก่อน</span>
              </div>
              <div>
                <Droplets size={18} />
                <span>ค่าออกซิเจนละลายน้ำ (DO) ในช่วงเช้าลดลง 2 ครั้งตั้งแต่ช่วงการสุ่มตัวอย่างล่าสุด</span>
              </div>
              <div>
                <Database size={18} />
                <span>ตรวจสอบการกินอาหารในยอก่อนปรับเพิ่มปริมาณอาหารในมื้อถัดไป</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section van-faq-section">
        <div className="container mobile-stack-grid van-faq-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ marginBottom: "16px" }}>คำถามที่พบบ่อย</div>
            <h2 className="section-title">
              แอปพลิเคชันที่ใช้งานได้จริง <em>สำหรับทีมฟาร์มกุ้งแวนนาไม</em>
            </h2>
          </div>
          <div className="van-faq-list r d2">
            <details open>
              <summary>แอปนี้ติดตามอะไรบ้างสำหรับฟาร์มกุ้งแวนนาไม?</summary>
              <p>Shrimply ติดตามการตั้งค่าบ่อ, DOC, การปล่อยลูกกุ้ง, การสุ่มตัวอย่าง, MBW, ADG, FCR, อัตราการตาย, การให้อาหาร, สต็อกอาหาร, คุณภาพน้ำ, การเก็บเกี่ยว, รายงานการเงิน และบันทึกความเสี่ยงของโรค</p>
            </details>
            <details>
              <summary>ทีมงานภาคสนามสามารถบันทึกข้อมูลผ่านแอปมือถือได้หรือไม่?</summary>
              <p>ได้ ทีมงานภาคสนามสามารถใช้แอปมือถือบันทึกกิจกรรมประจำวันหน้าบ่อได้ ขณะที่ผู้จัดการประเมินข้อมูลเดียวกันผ่านแดชบอร์ดบนเว็บ</p>
            </details>
            <details>
              <summary>Shrimply ช่วยในการตัดสินใจในการดำเนินงานอย่างไร?</summary>
              <p>Shrimply เชื่อมโยงบันทึกการสุ่มตัวอย่างล่าสุด อาหาร คุณภาพน้ำ อัตราการตาย และการเก็บเกี่ยว เพื่อให้ทีมประเมินการเติบโต พฤติกรรมการกิน และความเสี่ยงในการดำเนินงานได้อย่างรอบด้าน</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section van-final-cta">
        <div className="container r d1">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Shrimply</div>
          <h2 className="section-title">
            ยกระดับการผลิตกุ้งแวนนาไม <em>สู่กระบวนการทำงานที่เป็นระบบ</em>
          </h2>
          <p>
            บันทึกข้อมูลสำคัญในฟาร์ม แล้วนำมาใช้เพื่อประเมินการเติบโต ควบคุมการให้อาหาร
            ออกรายงาน และสร้างความโปร่งใสในทุกรอบการเลี้ยง
          </p>
          <div className="mobile-cta-row">
            <Link href="/auth/join" prefetch={false} className="btn-primary">เริ่มต้นใช้งานฟรี</Link>
            <Link href="/resources" className="btn-outline">ศูนย์การเรียนรู้</Link>
          </div>
        </div>
      </section>

      <FooterTH />
    </main>
  );
}
