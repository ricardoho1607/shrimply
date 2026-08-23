import Link from 'next/link';
import NavbarVI from '@/components/NavbarVI';
import FooterVI from '@/components/FooterVI';
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
      <NavbarVI />

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s' }}>Nền tảng trí tuệ nhân tạo nuôi trồng thủy sản</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.52s', margin: '24px 0' }}>
            Phần mềm quản lý trang trại tôm <br />
            <em>để kiểm soát chặt chẽ từng ao nuôi.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.76s', maxWidth: '420px', marginBottom: '40px', fontWeight: 500 }}>
            Theo dõi ao nuôi, kho thức ăn, chất lượng nước, lấy mẫu, thu hoạch, tài chính và tín hiệu rủi ro từ Orson AI trong một nền tảng duy nhất.
          </p>
          <div className="animate-hero hero-actions" style={{ animationDelay: '0.98s', display: 'flex', gap: '16px' }}>
            <Link href="/vi/how-it-works" className="btn-primary">Xem nền tảng</Link>
            <Link href="/auth/join" prefetch={false} className="btn-outline">Dùng thử miễn phí</Link>
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
                  <div style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', color: '#fff' }}>Ao đang hoạt động</div>
                  <div style={{ background: 'var(--sky)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(26,184,232,0.3)' }}>+</div>
                </div>

                {/* Pond Card 1 */}
                <div className="app-pond-card" style={{ animation: 'fup 0.8s forwards 1.2s', opacity: 0 }}>
                  <div className="app-pond-header">
                    <div className="app-pond-name">Ao A1</div>
                    <div className="app-doc-badge" style={{ background: '#1e6fa8' }}>DOC 45</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Sinh khối</span>
                          <span className="val">1.240,5 kg</span>
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
                  <div className="app-pond-footer">
                    <span style={{ color: 'var(--sky)' }}>📅</span> Bắt đầu: 15/03/2026 • Lấy mẫu gần nhất: 28/04/2026
                  </div>
                </div>

                {/* Pond Card 2 */}
                <div className="app-pond-card" style={{ animation: 'fup 0.8s forwards 1.4s', opacity: 0 }}>
                  <div className="app-pond-header">
                    <div className="app-pond-name">Ao B2</div>
                    <div className="app-doc-badge" style={{ background: '#0d2137' }}>DOC 21</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Sinh khối</span>
                          <span className="val">420,2 kg</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Shrimp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Quần đàn</span>
                          <span className="val">98.100</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Heart size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Tỷ lệ sống</span>
                          <span className="val">96,1%</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Maximize2 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Kích cỡ</span>
                          <span className="val">233 con/kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="app-pond-footer">
                    <span style={{ color: 'var(--sky)' }}>📅</span> Bắt đầu: 08/04/2026 • Lấy mẫu gần nhất: 27/04/2026
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
          <div className="stat-lbl">Hồ sơ trang trại</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Ao nuôi, thức ăn, chất lượng nước, lấy mẫu, thu hoạch và tài chính trong một không gian làm việc duy nhất.</div>
        </div>
        <div className="stat-box r d2">
          <div className="stat-num">02</div>
          <div className="stat-lbl">Tín hiệu rủi ro</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Kết nối sức ăn, tăng trưởng, tỷ lệ chết và biến động chất lượng nước.</div>
        </div>
        <div className="stat-box r d3">
          <div className="stat-num">03</div>
          <div className="stat-lbl">Báo cáo</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Tạo báo cáo sản lượng tôm, dòng tiền, giá vốn hàng bán (COGS), lãi lỗ và dự báo.</div>
        </div>
        <div className="stat-box r d4">
          <div className="stat-num">04</div>
          <div className="stat-lbl">Orson AI</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Phân tích lịch sử ao nuôi, thức ăn, lấy mẫu và xu hướng chất lượng nước mới nhất.</div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" style={{ background: 'var(--white)', padding: '140px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>Tại sao chọn Shrimply?</div>
            <h2 className="section-title r d2" style={{ maxWidth: '800px', margin: '0 auto' }}>
              Nuôi tôm chính xác <em>để tối đa hóa ROI</em>
            </h2>
          </div>
          <div className="features-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="feature-card r d1">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Layers size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Quy mô doanh nghiệp</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Quản lý nhiều địa điểm trang trại ở các khu vực khác nhau từ một trung tâm điều khiển web thống nhất.</p>
            </div>
            <div className="feature-card feature-accent r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Cpu size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Lõi Orson AI</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Orson phân tích dữ liệu ao nuôi, phản ứng thức ăn và xu hướng chất lượng nước để phát hiện sớm rủi ro sinh học.</p>
            </div>
            <div className="feature-card r d3">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><RefreshCcwDot size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Hệ sinh thái liền mạch</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Ứng dụng di động đầy đủ tính năng cho công việc thực địa và cổng thông tin web mạnh mẽ để phân tích — luôn đồng bộ hóa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHT (ORSON AI) */}
      <section className="highlight">
        <div className="highlight-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>Gặp gỡ Orson</div>
            <h2 className="section-title" style={{ color: 'var(--white)', marginBottom: '24px' }}>
              Chuyên gia tư vấn AI nuôi tôm của bạn. <em>Luôn sẵn sàng hỗ trợ.</em>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '440px', fontSize: '1.05rem', fontWeight: 500, marginBottom: '24px' }}>
              Orson không chỉ là một chatbot. Đây là một hệ thống chuyên gia biến dữ liệu trang trại thành bối cảnh sinh học thực tiễn cho từng quyết định ao nuôi.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><Activity size={18} strokeWidth={1.5} /></div>
                <div>Dự báo triển vọng rủi ro sinh học trước 72 giờ</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><TrendingUp size={18} strokeWidth={1.5} /></div>
                <div>Khuyến nghị cho ăn và thả giống có thể áp dụng ngay</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><Zap size={18} strokeWidth={1.5} /></div>
                <div>Cảnh báo tức thì về các chỉ số chất lượng nước bất thường</div>
              </div>
            </div>

            <Link href="/vi/orson" className="btn-primary" style={{ padding: '16px 36px', display: 'inline-block' }}>Tìm hiểu cách Orson hoạt động</Link>
          </div>
          <div className="r d3 chat-container" style={{ maxWidth: '100%' }}>
            <div className="chat-bubble bubble-user" style={{ animationDelay: '1.5s' }}>Tình hình Ao A1 hôm nay thế nào?</div>
            <div className="chat-bubble bubble-orson" style={{ animationDelay: '3s' }}>Ao A1 đang ổn định. Tuy nhiên, nồng độ DO giảm nhẹ lúc 04:00 sáng. Khuyến nghị tăng sục khí thêm 15% trong 2 giờ tới.</div>
            <div className="chat-bubble bubble-user" style={{ animationDelay: '6s' }}>Ao B2 có đang bị cho ăn quá mức không?</div>
            <div className="chat-bubble bubble-orson" style={{ animationDelay: '7.5s' }}>Lượng thức ăn đang cao hơn ước tính sinh khối. Tạm dừng tăng lượng thức ăn cữ tới và kiểm tra nhá trước khi điều chỉnh tăng.</div>
            <div className="chat-typing">Orson đang suy nghĩ...</div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="section" style={{ background: 'var(--off-white)', textAlign: 'center', padding: '160px 52px' }}>
        <div className="container r d1">
          <h2 className="section-title" style={{ marginBottom: '24px' }}>Sẵn sàng mở rộng quy mô <em>trang trại của bạn?</em></h2>
          <p style={{ marginBottom: '40px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', fontWeight: 500, fontSize: '1.05rem' }}>
            Được xây dựng bởi người nuôi tôm, dành cho người nuôi tôm. Trải nghiệm sự rõ ràng và khả năng kiểm soát mà trang trại của bạn xứng đáng có được.
          </p>
          <div className="mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary" style={{ padding: '18px 46px', fontSize: '0.8rem' }}>Dùng thử miễn phí</Link>
            <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: '18px 46px', fontSize: '0.8rem' }}>Tải về trên Google Play</a>
          </div>
        </div>
      </section>

      <FooterVI />
    </main>
  );
}
