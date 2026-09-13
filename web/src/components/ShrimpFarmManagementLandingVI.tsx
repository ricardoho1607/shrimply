import "@/app/globals.css";
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
import FooterVI from "@/components/FooterVI";
import NavbarVI from "@/components/NavbarVI";
import RevealOnScroll from "@/components/RevealOnScroll";

const workflowCards = [
  {
    label: "Kiểm soát ao nuôi",
    title: "Hồ sơ vụ nuôi tại một nơi duy nhất",
    body: "Theo dõi DOC, thả giống, tỷ lệ sống, sinh khối, thu hoạch, tỷ lệ chết và ghi chép ao nuôi mà không cần chia nhỏ dữ liệu vào nhiều tập tin.",
  },
  {
    label: "Quản lý thức ăn",
    title: "Thức ăn, tồn kho và sức ăn",
    body: "Kết nối kho thức ăn, nhật ký cho ăn, phản hồi nhá và FCR để người quản lý thấy rõ các hoạt động hàng ngày ảnh hưởng như thế nào đến hiệu suất ao.",
  },
  {
    label: "Minh bạch tài chính",
    title: "Chi phí và báo cáo",
    body: "Biến các ghi chép vận hành thành báo cáo dòng tiền, giá vốn hàng bán (COGS), lãi lỗ, dự báo và hiệu suất tôm một cách minh bạch.",
  },
];

const operatingAreas = [
  "Thiết lập ao và theo dõi vụ nuôi",
  "Lấy mẫu, MBW, ADG, FCR và sinh khối",
  "Kho thức ăn và nhật ký cho ăn",
  "Chất lượng nước và tín hiệu rủi ro",
  "Thu hoạch, tài chính, tài sản và báo cáo",
  "Quy trình làm việc của đội ngũ theo vai trò",
];

const proofPoints = [
  ["01", "Hồ sơ ao nuôi", "Cung cấp cho chủ trang trại và quản lý góc nhìn thống nhất về các vụ nuôi đang hoạt động, thả giống, tỷ lệ chết, lấy mẫu, thu hoạch và trạng thái ao."],
  ["02", "Kiểm soát thức ăn", "Giữ dữ liệu kho thức ăn, lượng sử dụng, sức ăn và kế hoạch đặt hàng luôn liên kết chặt chẽ với từng vụ nuôi."],
  ["03", "Bối cảnh rủi ro", "Đánh giá chất lượng nước, cảnh báo dịch bệnh, biến động tăng trưởng và các mẫu bất thường trước khi trở thành tổn thất tốn kém."],
  ["04", "Báo cáo", "Tạo các báo cáo vận hành và tài chính hữu ích cho việc đánh giá, lập kế hoạch và trách nhiệm giải trình của đội ngũ."],
];

export default function ShrimpFarmManagementLandingVI() {
  return (
    <main>
      <RevealOnScroll />
      <Cursor />
      <NavbarVI />

      <section className="hero seo-hero">
        <div className="hero-left seo-hero-copy">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.3s" }}>
            Phần mềm Quản lý Trang trại Nuôi tôm
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.52s", margin: "24px 0" }}>
            Vận hành từng vụ nuôi <em>với khả năng kiểm soát chặt chẽ hơn.</em>
          </h1>
          <p className="animate-hero seo-hero-intro" style={{ animationDelay: "0.76s" }}>
            Shrimply hợp nhất dữ liệu ao nuôi, thức ăn, lấy mẫu, chất lượng nước, kho hàng, thu hoạch, tài chính,
            cảnh báo dịch bệnh và báo cáo vào một hệ điều hành nuôi trồng thủy sản toàn diện.
          </p>
          <div className="animate-hero mobile-cta-row seo-hero-actions" style={{ animationDelay: "0.98s" }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Dùng thử miễn phí</Link>
            <Link href="/vi/how-it-works" className="btn-outline">Xem cách hoạt động</Link>
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
                    <span>Tổng quan trang trại</span>
                    <strong>Khu vực Bắc</strong>
                  </div>
                  <div className="seo-status-pill">Đồng bộ trực tiếp</div>
                </div>

                <div className="seo-metric-row">
                  <div className="seo-metric">
                    <span>Ao hoạt động</span>
                    <strong>12</strong>
                  </div>
                  <div className="seo-metric">
                    <span>Kho thức ăn</span>
                    <strong>8.4t</strong>
                  </div>
                  <div className="seo-metric">
                    <span>Báo cáo sẵn sàng</span>
                    <strong>5</strong>
                  </div>
                </div>

                <div className="app-pond-card seo-pond-card">
                  <div className="app-pond-header">
                    <div className="app-pond-name">Ao A1</div>
                    <div className="app-doc-badge" style={{ background: "#1e6fa8" }}>DOC 45</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Sinh khối</span>
                          <span className="val">1.240 kg</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Shrimp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Quần đàn</span>
                          <span className="val">85.200</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Heart size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Tỷ lệ sống</span>
                          <span className="val">92,4%</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Maximize2 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Kích cỡ</span>
                          <span className="val">54 con/kg</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <TrendingUp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">ADG</span>
                          <span className="val">0,24 g/ngày</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <BarChart3 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">FCR</span>
                          <span className="val">1,32</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="seo-alert-card">
                  <div>
                    <span>Ghi chú từ Orson</span>
                    <strong>Áp lực thức ăn tăng nhanh hơn sinh khối. Hãy kiểm tra độ sạch của nhá trước khi tăng khẩu phần thức ăn ngày mai.</strong>
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
            <div className="eyebrow r d1">Hệ điều hành Trang trại</div>
            <h2 className="section-title r d2">
              Thay thế ghi chép phân tán bằng một <em>bức tranh vận hành liền mạch.</em>
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
              Xây dựng cho vận hành trang trại tôm
            </div>
            <h2 className="section-title" style={{ color: "var(--white)", marginBottom: "24px" }}>
              Công việc hàng ngày đơn giản hơn. <em>Dữ liệu chính xác hơn.</em>
            </h2>
            <p className="seo-dark-copy">
              Shrimply giữ cho quy trình làm việc tại ao luôn nhanh gọn trong khi mang lại cho chủ trang trại và quản lý góc nhìn rõ ràng hơn về
              sản xuất, hiệu suất sinh học, chi phí và báo cáo sẵn sàng.
            </p>
            <div className="seo-check-grid">
              {operatingAreas.map(item => (
                <div className="seo-check" key={item}>
                  <span />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/resources" className="btn-primary seo-dark-button">Khám phá tài liệu</Link>
          </div>

          <div className="r d3 seo-ops-panel">
            <div className="seo-ops-header">
              <div>
                <span>Tầng quản lý</span>
                <strong>Những gì Shrimply kết nối</strong>
              </div>
              <Cpu size={22} />
            </div>
            <div className="seo-ops-list">
              <div>
                <Layers size={18} />
                <span>Nhật ký di động thực địa được đồng bộ trực tiếp lên dashboard web.</span>
              </div>
              <div>
                <Activity size={18} />
                <span>Lịch sử lấy mẫu và chất lượng nước hỗ trợ đánh giá tăng trưởng chính xác hơn.</span>
              </div>
              <div>
                <RefreshCcwDot size={18} />
                <span>Báo cáo kho hàng, thu hoạch và tài chính luôn gắn liền với vận hành ao thực tế.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section seo-faq-section">
        <div className="container mobile-stack-grid seo-faq-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ marginBottom: "16px" }}>Câu hỏi</div>
            <h2 className="section-title">
              Được xây dựng cho đội ngũ trang trại tôm, <em>không phải bảng tính thông thường.</em>
            </h2>
          </div>
          <div className="seo-faq-list r d2">
            <details open>
              <summary>Shrimply quản lý những gì cho trang trại tôm?</summary>
              <p>Ao nuôi, thả giống, lấy mẫu, chất lượng nước, cho ăn, kho thức ăn, thu hoạch, tài sản, báo cáo tài chính, cảnh báo dịch bệnh, thiết lập công ty, vai trò đội ngũ và thông tin chi tiết từ Orson AI.</p>
            </details>
            <details>
              <summary>Nền tảng này có đơn thuần chỉ là sổ ghi chép?</summary>
              <p>Không. Shrimply được thiết kế để giúp đội ngũ phân tích số liệu sản xuất, đánh giá hiệu suất ao nuôi, lập báo cáo và phát hiện sớm các rủi ro vận hành.</p>
            </details>
            <details>
              <summary>Nền tảng có hỗ trợ quy trình làm việc trên di động và web không?</summary>
              <p>Có. Đội ngũ thực địa có thể ghi chép hoạt động ao nuôi trên ứng dụng di động, trong khi người quản lý sử dụng dashboard web để đánh giá, phân tích, lập báo cáo và theo dõi toàn diện trang trại.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section seo-final-cta">
        <div className="container r d1">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Shrimply</div>
          <h2 className="section-title">
            Nâng tầm quản lý từng vụ nuôi <em>với hệ thống vận hành chuyên nghiệp hơn.</em>
          </h2>
          <p>
            Bắt đầu từ các ghi chép hàng ngày cần thiết cho trang trại của bạn, sau đó xây dựng tính minh bạch trên toàn bộ quy trình
            sản xuất, kho hàng, tài chính, báo cáo và kiểm soát rủi ro sinh học.
          </p>
          <div className="mobile-cta-row">
            <Link href="/auth/join" prefetch={false} className="btn-primary">Dùng thử miễn phí</Link>
            <Link href="/vi/vannamei-shrimp-farming-app" className="btn-outline">Ứng dụng Vannamei</Link>
          </div>
        </div>
      </section>

      <FooterVI />
    </main>
  );
}
