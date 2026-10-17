"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import NavbarVI from '@/components/NavbarVI';
import FooterVI from '@/components/FooterVI';
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

export default function HowItWorksPageVI() {
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
      <NavbarVI />

      {/* HERO: THE SCALE OF SHRIMPLY */}
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', background: 'var(--off-white)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.2s', marginBottom: '16px' }}>Tổng quan nền tảng</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.4s', marginBottom: '32px' }}>
            Từ ao nuôi đến lợi nhuận.<br /><em>Hệ điều hành toàn diện.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.6s', maxWidth: '700px', margin: '0 auto', fontSize: '1.15rem', fontWeight: 500, color: 'var(--muted)' }}>
            Hệ sinh thái hợp nhất kết nối công nhân thực địa, kỹ thuật viên bảo trì, quản lý trang trại và thương lái thông qua một nguồn dữ liệu sinh học và tài chính duy nhất.
          </p>
        </div>
      </section>

      {/* PILLAR 1: FIELD & ASSETS */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '80px', alignItems: 'center' }}>
          <div>
            <div className="eyebrow r" style={{ color: 'var(--sky)', marginBottom: '16px' }}>01 / Quản lý thực địa</div>
            <h2 className="section-title r d1" style={{ marginBottom: '24px' }}>
              Minh bạch và trách nhiệm ngay tại <em>bờ ao.</em>
            </h2>
            <p className="r d2" style={{ marginBottom: '32px', fontSize: '1.05rem', fontWeight: 500 }}>
              Chấm dứt tình trạng thất lạc thiết bị và bỏ sót dữ liệu. Shrimply thu hẹp khoảng cách giữa tài sản vật lý và hồ sơ kỹ thuật số.
            </p>
            <div className="r d3" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><QrCode size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Theo dõi tài sản bằng mã QR</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Kỹ thuật viên và chủ trang trại quét mã tài sản để ghi nhận lịch sử bảo dưỡng và vị trí luân chuyển. Không bao giờ lo thất lạc máy bơm hay dàn quạt nước nữa.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><Clock size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Cảnh báo bảo trì</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Tự động nhắc nhở khi thiết bị đến kỳ bảo dưỡng. Chăm sóc chủ động để ngăn ngừa sự cố hỏng hóc giữa vụ nuôi.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><Smartphone size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Ghi chép ngoại tuyến mượt mà</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Khu vực ao nuôi không có sóng? Không vấn đề gì. Dữ liệu nhập được lưu cục bộ và tự động đồng bộ hóa ngay khi có kết nối mạng.</p>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Bảo dưỡng gần nhất:</span> <strong>12/04/2026</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Vị trí:</span> <strong>Ao B2</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e84c1a', fontWeight: 700 }}><span>Trạng thái:</span> <span>Cần bảo dưỡng</span></div>
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
            <div className="eyebrow r" style={{ color: 'var(--sky)', marginBottom: '16px' }}>02 / Vận hành trang trại</div>
            <h2 className="section-title r d1" style={{ color: 'white' }}>
              Trung tâm chỉ huy: <em>Quản trị tập trung và hiệu quả.</em>
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }} className="r d2 mobile-stack-grid">
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <Users size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Phân quyền theo vai trò</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                <strong>Chủ trang trại:</strong> Toàn quyền kiểm soát.<br/>
                <strong>Quản lý:</strong> Tập trung Tài chính &amp; Kho hàng.<br/>
                <strong>Kỹ thuật viên:</strong> Chỉ xem dữ liệu thực địa &amp; nhật ký.
              </p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <FileText size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Báo cáo tự động hóa</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Tạo tệp PDF nhanh chóng với một cú nhấp chuột cho giá vốn hàng bán (COGS), lãi lỗ và dòng tiền. Kiểm toán tài chính chuẩn doanh nghiệp chỉ trong vài giây.</p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <BarChart3 size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Cảnh báo tồn kho</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Tự thiết lập ngưỡng đặt hàng lại của riêng bạn. Nhận thông báo tức thì khi lượng thức ăn hoặc hóa chất xuống mức thấp nguy cấp.</p>
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
                  ⚠️ Cảnh báo dịch bệnh: Cách 2,4km
               </div>
            </div>
          </div>
          <div>
            <div className="eyebrow r d2" style={{ color: 'var(--sky)', marginBottom: '16px' }}>03 / An toàn sinh học</div>
            <h2 className="section-title r d3" style={{ marginBottom: '24px' }}>
              &quot;Vắc-xin&quot; <em>cho toàn cộng đồng.</em>
            </h2>
            <p className="r d4" style={{ marginBottom: '32px', fontSize: '1.05rem', fontWeight: 500 }}>
              Sự lây nhiễm chéo dọc theo bờ biển là mối đe dọa lớn nhất của ngành nuôi tôm. Shrimply biến sự an toàn của từng trang trại riêng lẻ thành hệ thống phòng thủ tập thể.
            </p>
            <div className="r d5" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ color: '#e84c1a' }}><ShieldAlert size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Thông báo tức thì</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Ngay khi một trang trại lân cận ghi nhận dịch bệnh, bạn sẽ nhận được cảnh báo ngay lập tức. Từng giây đều giúp bảo vệ cả vụ nuôi.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ color: 'var(--sky)' }}><UserLock size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Bảo mật tuyệt đối</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Dữ liệu trên bản đồ được ẩn danh hoàn toàn. Danh tính trang trại của bạn luôn được giữ kín với cộng đồng trong khi vẫn đóng góp vào sự an toàn chung.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLAR 4: MARKETPLACE */}
      <section className="section" style={{ background: 'var(--off-white)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow r d1" style={{ color: 'var(--sky)', marginBottom: '16px' }}>04 / Chợ tôm</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px' }}>
            Kết nối trực tiếp với <em>thương lái.</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '600px', margin: '0 auto 60px', fontSize: '1.05rem', fontWeight: 500 }}>
            Shrimply không chỉ giúp bạn nuôi tôm hiệu quả. Chúng tôi giúp bạn bán tôm giá tốt. Chúng tôi kết nối các ao sẵn sàng thu hoạch với mức giá tốt nhất trên thị trường.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="r d4 mobile-stack-grid-compact">
            <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '1px solid var(--slate)', textAlign: 'left' }}>
              <ShoppingBag size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Dành cho chủ trang trại</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Duyệt qua các bài đăng thu mua đang hoạt động và giá thị trường hiện tại. Biết chính xác giá trị đàn tôm của bạn trước khi bước vào đàm phán.</p>
            </div>
            <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '1px solid var(--slate)', textAlign: 'left' }}>
              <Monitor size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Dành cho thương lái &amp; người mua</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Theo dõi kích cỡ tôm trung bình (MBW) và xu hướng quần đàn tại các trang trại lân cận. Kết nối với chủ ao ngay khi tôm đạt đúng trọng lượng mục tiêu.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSITION TO ORSON */}
      <section className="section dark-section" style={{ color: 'white', textAlign: 'center', padding: '120px 0' }}>
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
           <h2 className="section-title r d1" style={{ color: 'white', marginBottom: '32px' }}>
            Dữ liệu sẽ vô nghĩa nếu thiếu <em>trí tuệ phân tích.</em>
           </h2>
           <p className="r d2" style={{ maxWidth: '600px', margin: '0 auto 48px', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', fontWeight: 500 }}>
            Trong khi nền tảng Shrimply ghi lại toàn bộ hoạt động vận hành, Orson AI sẽ phân tích và giải mã các yếu tố sinh học.
           </p>
           <div className="r d3">
              <Link href="/vi/orson" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                Tìm hiểu sâu về Orson AI <ChevronRight size={16} />
              </Link>
           </div>
        </div>
      </section>

      <FooterVI />
    </main>
  );
}
