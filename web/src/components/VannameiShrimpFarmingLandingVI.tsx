import "@/app/globals.css";
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
import FooterVI from "@/components/FooterVI";
import NavbarVI from "@/components/NavbarVI";
import RevealOnScroll from "@/components/RevealOnScroll";

const cycleStats = [
  ["01", "Rõ ràng DOC", "Giữ ngày thả giống, tuổi ao, lấy mẫu, tỷ lệ chết và bối cảnh thu hoạch luôn liên kết chặt chẽ trong suốt vụ nuôi."],
  ["02", "Tín hiệu tăng trưởng", "Đánh giá MBW, ADG, FCR, tỷ lệ sống và biến động sinh khối mà không cần tính toán thủ công lại từ đầu."],
  ["03", "Kiểm tra hàng ngày", "Ghi lại lượng cho ăn, chất lượng nước, tỷ lệ chết và nhật ký ao ngay tại hiện trường trước khi dữ liệu bị thất lạc."],
  ["04", "Góc nhìn quản lý", "Cung cấp cho người quản lý dashboard web trực quan để đánh giá ao nuôi, lập báo cáo, theo dõi tài chính và ra quyết định kịp thời."],
];

const workflowCards = [
  {
    label: "Ghi chép thực địa",
    title: "Nhập liệu nhanh chóng ngay bên bờ ao",
    body: "Kỹ thuật viên có thể ghi lại các hoạt động ao nuôi tôm thẻ chân trắng từ di động, bao gồm lấy mẫu, tỷ lệ chết, cho ăn, chất lượng nước và ghi chú hàng ngày.",
  },
  {
    label: "Đánh giá vụ nuôi",
    title: "Bối cảnh vụ nuôi dành cho người quản lý",
    body: "Chủ trang trại và quản lý có thể so sánh DOC, MBW, ADG, FCR, xu hướng sử dụng thức ăn, tỷ lệ sống và mức độ sẵn sàng thu hoạch từ dashboard web.",
  },
  {
    label: "Hỗ trợ quyết định",
    title: "Tín hiệu cảnh báo sớm trước kỳ thu hoạch",
    body: "Shrimply liên kết hồ sơ tăng trưởng, sức ăn, chất lượng nước và rủi ro để trang trại nắm rõ những thay đổi và phần nào cần kiểm tra ngay.",
  },
];

const appCoverage = [
  "Thả giống, DOC, trạng thái ao và hồ sơ vụ nuôi",
  "Lấy mẫu, MBW, ADG, FCR, tỷ lệ sống và sinh khối",
  "Hoạt động cho ăn, bối cảnh sức ăn và kho thức ăn",
  "Nhật ký chất lượng nước và đánh giá xu hướng gần đây",
  "Tỷ lệ chết, kế hoạch thu hoạch và báo cáo sản xuất",
  "Làm việc thực địa trên di động kèm đánh giá tổng hợp trên web dashboard",
];

export default function VannameiShrimpFarmingLandingVI() {
  return (
    <main>
      <RevealOnScroll />
      <Cursor />
      <NavbarVI />

      <section className="hero van-hero">
        <div className="hero-left van-hero-copy">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.3s" }}>
            Ứng dụng Nuôi Tôm Thẻ Chân Trắng
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.52s", margin: "24px 0" }}>
            Theo dõi từng vụ tôm thẻ chân trắng <em>từ bờ ao đến báo cáo tổng hợp.</em>
          </h1>
          <p className="animate-hero van-hero-intro" style={{ animationDelay: "0.76s" }}>
            Shrimply giúp các trang trại tôm thẻ chân trắng ghi chép hoạt động thực địa, theo dõi tăng trưởng, kiểm soát thức ăn
            và chất lượng nước, đánh giá hiệu suất ao nuôi và lập báo cáo trên một nền tảng di động và web thống nhất.
          </p>
          <div className="animate-hero mobile-cta-row van-hero-actions" style={{ animationDelay: "0.98s" }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Dùng thử miễn phí</Link>
            <Link href="/vi/shrimp-farm-management-software" className="btn-outline">Phần mềm trang trại</Link>
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
                      <span>Vụ nuôi hiện tại</span>
                      <strong>Vannamei Khu A</strong>
                    </div>
                    <div className="van-sync-pill">Đã đồng bộ</div>
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
                      Xu hướng tăng trưởng
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
                  <span>Hôm nay</span>
                  <strong>Ao A1</strong>
                </div>
                <div className="van-phone-card active">
                  <div>
                    <ClipboardList size={17} />
                    <span>Lấy mẫu</span>
                  </div>
                  <strong>MBW 18.5g</strong>
                </div>
                <div className="van-phone-grid">
                  <div>
                    <Scale size={15} />
                    <span>Sinh khối</span>
                    <strong>1.24t</strong>
                  </div>
                  <div>
                    <Heart size={15} />
                    <span>Tỷ lệ sống</span>
                    <strong>92%</strong>
                  </div>
                </div>
                <div className="van-phone-card">
                  <div>
                    <Droplets size={17} />
                    <span>Chất lượng nước</span>
                  </div>
                  <strong>Ổn định</strong>
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
            <div className="eyebrow r d1">Quy trình Nuôi Tôm Thẻ</div>
            <h2 className="section-title r d2">
              Được xây dựng dựa trên những dữ liệu quyết định <em>hiệu quả mùa vụ.</em>
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
              Di động và web
            </div>
            <h2 className="section-title" style={{ color: "var(--white)", marginBottom: "24px" }}>
              Đội ngũ thực địa ghi chép nhanh hơn. <em>Người quản lý đánh giá chuẩn xác hơn.</em>
            </h2>
            <p className="van-dark-copy">
              Các trang trại tôm thẻ chân trắng cần các ghi chép hàng ngày vẫn mang lại giá trị thiết thực sau khi kiểm tra ao hoàn tất.
              Shrimply giữ cho quy trình làm việc di động luôn đơn giản trong khi duy trì bối cảnh mà người quản lý cần
              để đánh giá tăng trưởng, điều chỉnh lượng thức ăn và lập báo cáo.
            </p>
            <div className="van-check-grid">
              {appCoverage.map(item => (
                <div className="van-check" key={item}>
                  <span />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/vi/how-it-works" className="btn-primary van-dark-button">Xem nền tảng</Link>
          </div>

          <div className="r d3 van-analysis-panel">
            <div className="van-analysis-header">
              <div>
                <span>Đánh giá từ Orson</span>
                <strong>Bối cảnh biến động tăng trưởng</strong>
              </div>
              <Zap size={22} />
            </div>
            <div className="van-analysis-list">
              <div>
                <BarChart3 size={18} />
                <span>MBW gần nhất tăng, nhưng tốc độ tăng trưởng hàng ngày (ADG) chậm lại so với lần lấy mẫu trước.</span>
              </div>
              <div>
                <Droplets size={18} />
                <span>Hàm lượng oxy hòa tan (DO) buổi sáng đã giảm 2 lần kể từ đợt lấy mẫu gần nhất.</span>
              </div>
              <div>
                <Database size={18} />
                <span>Kiểm tra độ sạch của nhá trước khi tăng thêm cữ thức ăn tiếp theo.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section van-faq-section">
        <div className="container mobile-stack-grid van-faq-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ marginBottom: "16px" }}>Câu hỏi thường gặp</div>
            <h2 className="section-title">
              Ứng dụng thiết thực <em>cho đội ngũ trang trại tôm thẻ chân trắng.</em>
            </h2>
          </div>
          <div className="van-faq-list r d2">
            <details open>
              <summary>Ứng dụng này theo dõi những gì cho trang trại tôm thẻ?</summary>
              <p>Shrimply theo dõi thiết lập ao, DOC, thả giống, lấy mẫu, MBW, ADG, FCR, tỷ lệ chết, cho ăn, kho thức ăn, chất lượng nước, thu hoạch, báo cáo tài chính và ghi chép rủi ro dịch bệnh.</p>
            </details>
            <details>
              <summary>Đội ngũ thực địa có thể nhập dữ liệu trên ứng dụng di động không?</summary>
              <p>Có. Đội ngũ thực địa có thể sử dụng ứng di động cho các hoạt động hàng ngày tại ao, trong khi người quản lý đánh giá cùng dữ liệu đó từ dashboard web.</p>
            </details>
            <details>
              <summary>Shrimply hỗ trợ ra quyết định vận hành như thế nào?</summary>
              <p>Shrimply kết nối các dữ liệu lấy mẫu gần nhất, thức ăn, chất lượng nước, tỷ lệ chết và thu hoạch để đội ngũ đánh giá động lực tăng trưởng, thay đổi sức ăn và rủi ro vận hành với bối cảnh toàn diện hơn.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section van-final-cta">
        <div className="container r d1">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Shrimply</div>
          <h2 className="section-title">
            Đưa quy trình sản xuất tôm thẻ <em>vào hệ thống quản lý chuyên nghiệp hơn.</em>
          </h2>
          <p>
            Ghi chép các dữ liệu quan trọng ngoài hiện trường, sau đó ứng dụng để đánh giá tăng trưởng, kiểm soát thức ăn,
            lập báo cáo và minh bạch hóa toàn bộ vụ nuôi.
          </p>
          <div className="mobile-cta-row">
            <Link href="/auth/join" prefetch={false} className="btn-primary">Dùng thử miễn phí</Link>
            <Link href="/resources" className="btn-outline">Trung tâm tài liệu</Link>
          </div>
        </div>
      </section>

      <FooterVI />
    </main>
  );
}
