"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import NavbarVI from '@/components/NavbarVI';
import FooterVI from '@/components/FooterVI';
import { 
  BarChart2, 
  Cpu
} from 'lucide-react';

import Cursor from '@/components/Cursor';

export default function OrsonPageVI() {
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

      {/* Hero Section */}
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s', marginBottom: '16px' }}>Khám phá Trí tuệ Orson</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.5s', marginBottom: '32px' }}>
            Vượt xa dữ liệu thuần túy.<br /><em>Trí tuệ Sinh học Thực thụ.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.7s', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
            Orson sử dụng mô hình frontier để suy luận, kết nối dữ liệu chất lượng nước, lấy mẫu và thức ăn gần đây để giúp bạn nhận ra điều cần kiểm tra kỹ hơn.
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
            <div className="eyebrow r" style={{ marginBottom: '16px' }}>Thách thức</div>
            <h2 className="section-title r d1" style={{ marginBottom: '24px', color: 'var(--white)' }}>
              Những con số đơn lẻ không phản ánh <em>toàn bộ câu chuyện.</em>
            </h2>
            <p className="r d2" style={{ marginBottom: '32px', color: 'rgba(255,255,255,0.72)' }}>
              Phương pháp nuôi truyền thống thường dựa vào dữ liệu đo nhanh buổi sáng. Nhưng một điểm dữ liệu đơn lẻ không đại diện cho thực tế sinh học. Trong khi bạn thấy mức pH bình thường, Orson nhận diện một xu hướng giảm kéo dài 3 ngày tương ứng với lượng thức ăn tăng lên trong nhật ký của bạn.
            </p>
          </div>
          <div className="r d3">
            <div className="orson-chat-panel" style={{ background: 'rgba(244,248,252,0.96)', border: '1px solid rgba(26,184,232,0.26)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 26px 80px rgba(0,0,0,0.32)' }}>
              <div className="orson-chat-bubble-user" style={{ padding: '14px 18px', borderRadius: '10px', fontSize: '0.9rem', maxWidth: '82%', background: 'linear-gradient(135deg, var(--blue) 0%, var(--sky) 100%)', color: 'var(--white)', alignSelf: 'flex-end', borderBottomRightRadius: '2px', lineHeight: 1.6, boxShadow: '0 10px 24px rgba(26,184,232,0.22)' }}>
                &quot;Tôi kiểm tra ao mỗi sáng và ghi chép đầy đủ pH cùng nhiệt độ vào sổ. Nhưng tháng trước, một đợt sụp tảo bất ngờ đã làm hao hụt 10% đàn tôm. Tại sao tôi không nhận thấy tín hiệu cảnh báo trước?&quot;
              </div>
              <div className="orson-chat-bubble-orson" style={{ padding: '14px 18px', borderRadius: '10px', fontSize: '0.9rem', maxWidth: '82%', background: 'var(--white)', color: 'var(--ink)', alignSelf: 'flex-start', borderBottomLeftRadius: '2px', border: '1px solid var(--slate)', lineHeight: 1.6 }}>
                &quot;Bởi vì một con số đơn lẻ chỉ là một bức ảnh chụp tức thời. Tôi quan sát các mô hình sinh học: áp lực thức ăn, biến động DO, dao động pH và xu hướng tăng trưởng. Sự kết hợp này sẽ phát tín hiệu cảnh báo trước khi các dấu hiệu bất thường biểu hiện rõ bằng mắt thường.&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sampling Gap Section */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <div className="eyebrow r" style={{ marginBottom: '16px', textAlign: 'center' }}>Khoảng trống lấy mẫu</div>
          <h2 className="section-title r d1" style={{ textAlign: 'center', marginBottom: '64px' }}>
            Giải quyết vấn đề <em>sai số từ việc đo lường thủ công.</em>
          </h2>
          <div className="features-grid">
            <div className="feature-card r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><BarChart2 size={26} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Thực tế &quot;Nhiễu loạn&quot;</h3>
              <p>Lấy mẫu tôm thủ công không bao giờ đạt độ chính xác tuyệt đối. Đôi khi bạn chài phải tôm nhỏ, đôi khi lại trúng tôm lớn. Trong nuôi tôm truyền thống, độ &quot;nhiễu&quot; này làm biểu đồ tăng trưởng trồi sụt thất thường như tàu lượn siêu tốc.</p>
            </div>
            <div className="feature-card r d3" style={{ gridColumn: 'span 2' }}>
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Cpu size={26} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Làm mịn thống kê của Orson</h3>
              <p>Orson không chỉ đơn thuần &quot;nối các điểm dữ liệu&quot;. Orson sử dụng các đường xu hướng sinh học gần nhất để giảm thiểu nhiễu lấy mẫu, làm nổi bật các giá trị ngoại lệ (outliers) và ước tính độ tin cậy tăng trưởng từ chính dữ liệu thực tế mà trang trại của bạn ghi nhận.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Appetite Section */}
      <section className="section">
        <div className="container mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div className="r d1">
            <div style={{ background: 'var(--white)', border: '1px solid var(--slate)', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ color: 'var(--ink)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Chẩn đoán thời gian thực</div>
              <div style={{ background: 'var(--ice)', color: 'var(--ink)', fontStyle: 'italic', fontSize: '1rem', padding: '12px 16px', borderRadius: '8px', alignSelf: 'flex-start', borderBottomLeftRadius: '2px' }}>
                &quot;Các chỉ số chất lượng nước hiện tại vẫn nằm trong ngưỡng, nhưng tỷ lệ hết thức ăn trên nhá chỉ đạt 40% cho thấy nguy cơ stress hoặc cho ăn quá mức. Hãy dừng tăng cữ ăn tiếp theo và kiểm tra lại DO, dao động pH cũng như xu hướng sức ăn của tôm.&quot;
              </div>
            </div>
          </div>
          <div>
            <div className="eyebrow r d2" style={{ marginBottom: '16px' }}>Phân tích sức ăn</div>
            <h2 className="section-title r d3" style={{ marginBottom: '24px' }}>
              Hệ thống <em>Trí tuệ Thức ăn.</em>
            </h2>
            <p className="r d4" style={{ marginBottom: '32px' }}>
              Sức ăn của tôm thường thay đổi trước khi hiện tượng chết xảy ra. Orson kết hợp việc kiểm tra nhá thức ăn, ước tính sinh khối và chất lượng nước thành tín hiệu cảnh báo stress sớm.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="stats-band">
        <div className="stat-box r d1">
          <div className="stat-num">01</div>
          <div className="stat-lbl">An toàn sinh học hàng đầu</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Nhận diện các mô hình rủi ro sinh học trước khi chúng bộc lộ rõ ràng bằng mắt thường.</p>
        </div>
        <div className="stat-box r d2">
          <div className="stat-num">02</div>
          <div className="stat-lbl">Cho ăn chuẩn xác</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Tối ưu hóa hệ số FCR để giảm thiểu khoản chi phí chiếm tỷ trọng lớn nhất của trang trại.</p>
        </div>
        <div className="stat-box r d3">
          <div className="stat-num">03</div>
          <div className="stat-lbl">Dự báo thu hoạch</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Nắm bắt kích cỡ thương phẩm và trọng lượng mục tiêu trước nhiều tuần.</p>
        </div>
        <div className="stat-box r d4">
          <div className="stat-num">04</div>
          <div className="stat-lbl">Phát hiện stress sớm</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Nhận biết dấu hiệu giảm ăn và căng thẳng tiềm ẩn trước khi tỷ lệ chết bắt đầu xuất hiện.</p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--off-white)' }}>
        <div className="container">
          <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>Cẩm nang Trí tuệ Trang trại Liên quan</div>
          <h2 className="section-title r d2" style={{ maxWidth: '860px', marginBottom: '28px' }}>
            Kết nối Orson AI với các ghi chép trang trại giải thích hiệu suất ao nuôi.
          </h2>
          <div className="resource-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            {[
              {
                href: '/resources/fcr-shrimp-farming',
                title: 'Cải thiện FCR trong nuôi tôm',
                body: 'Sử dụng nhật ký thức ăn, sinh khối, tỷ lệ chết và thu hoạch để diễn giải hệ số chuyển đổi thức ăn chính xác hơn.',
              },
              {
                href: '/resources/feed-tray-observations',
                title: 'Quan sát và kiểm tra nhá thức ăn',
                body: 'Đánh giá các tín hiệu sức ăn trước khi thức ăn thừa trở thành vấn đề về chất lượng nước và FCR.',
              },
              {
                href: '/resources/water-quality-trends',
                title: 'Xu hướng chất lượng nước ao nuôi',
                body: 'Theo dõi đồng thời DO, pH, độ mặn, amonia và nitrit thay vì đánh giá từng chỉ số riêng lẻ.',
              },
              {
                href: '/resources/white-spot-syndrome-virus-shrimp',
                title: 'Ứng phó và phòng ngừa virus đốm trắng (WSSV)',
                body: 'Liên kết tỷ lệ chết, sức ăn, lưu chuyển nguồn nước và các biện pháp an toàn sinh học khi nghi ngờ nhiễm WSSV.',
              },
              {
                href: '/vi/features/disease-alerts',
                title: 'Cảnh báo dịch bệnh',
                body: 'Xem cách Shrimply liên kết chặt chẽ bối cảnh rủi ro dịch bệnh với các ghi chép chất lượng nước, thức ăn, tăng trưởng và tỷ lệ hao hụt.',
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
          <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>Bắt đầu ngay</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px' }}>
            Sẵn sàng <em>nuôi tôm thông minh hơn?</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '480px', margin: '0 auto 40px' }}>
            Trải nghiệm sức mạnh của trí tuệ sinh học ngay hôm nay. Bắt đầu quản lý ao nuôi đầu tiên của bạn cùng Orson.
          </p>
          <div className="r d4 mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Dùng thử Shrimply miễn phí</Link>
            <Link href="/vi" className="btn-outline">Trở về Trang chủ</Link>
          </div>
        </div>
      </section>

      <FooterVI />

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
