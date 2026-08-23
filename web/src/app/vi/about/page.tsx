"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import NavbarVI from '@/components/NavbarVI';
import FooterVI from '@/components/FooterVI';
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

export default function AboutPageVI() {
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
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s', marginBottom: '20px' }}>Về Shrimply</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.5s', marginBottom: '32px', maxWidth: '900px' }}>
            Ngành nuôi trồng thủy sản<br />từng gặp bài toán nan giải về dữ liệu.<br /><em>Chúng tôi đã giải quyết điều đó.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.7s', maxWidth: '560px', fontSize: '1.1rem', lineHeight: 1.8 }}>
            Được xây dựng bởi những người nuôi tôm từng trải qua sự hỗn loạn của dữ liệu phân tán, các vụ nuôi thất bại và những nền tảng không mang lại bất kỳ thông tin giá trị thực tế nào. Shrimply là hệ điều hành mà ngành nuôi tôm xứng đáng có được và chưa từng có trước đây.
          </p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="section dark-section">
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            <div>
              <div className="eyebrow r" style={{ marginBottom: '16px' }}>Vấn đề thực tế</div>
              <h2 className="section-title r d1" style={{ marginBottom: '24px', color: 'var(--white)' }}>
                Nuôi tôm là một trong những ngành đòi hỏi kỹ thuật cao nhất thế giới.<br /><em>Nhưng phần mềm hiện có chưa bao giờ phản ánh được điều đó.</em>
              </h2>
              <p className="r d2" style={{ marginBottom: '20px' }}>
                Người nuôi tôm phải vận hành trang trại qua các bảng tính phân tán, ứng dụng rời rạc và báo cáo thiếu nhất quán. Dữ liệu bị gián đoạn giữa các ca trực. Tồn kho ở một ứng dụng, thức ăn ở ứng dụng khác, chất lượng nước ở ứng dụng thứ ba.
              </p>
              <p className="r d3">
                Và vào cuối mỗi vụ nuôi là quá trình đối soát kéo dài, mệt mỏi mà không bao giờ thực sự phản ánh chính xác một vụ thu hoạch có lợi nhuận.
              </p>
            </div>
            <div className="r d2">
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(26,184,232,0.12)', borderRadius: '16px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { icon: <ClipboardX size={18} strokeWidth={1.5} />, text: "Sổ sách ghi chép trang trại nằm rải rác trong sổ tay và bảng tính" },
                  { icon: <BarChart2 size={18} strokeWidth={1.5} />, text: "Các nền tảng chỉ lưu trữ dữ liệu nhưng không mang lại bất kỳ phân tích thông minh nào" },
                  { icon: <Shuffle size={18} strokeWidth={1.5} />, text: "Phải dùng 5 ứng dụng khác nhau chỉ để quản lý một hoạt động trang trại" },
                  { icon: <TrendingDown size={18} strokeWidth={1.5} />, text: "Bỏ lỡ mục tiêu sinh khối ở mỗi vụ nuôi mà không có bất kỳ cảnh báo sớm nào" }
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
          <div className="eyebrow r" style={{ marginBottom: '16px', textAlign: 'center' }}>Tiêu chuẩn chúng tôi thiết lập</div>
          <h2 className="section-title r d1" style={{ textAlign: 'center', marginBottom: '20px' }}>
            Chúng tôi xây dựng nền tảng <em>mà chúng tôi hằng mong muốn.</em>
          </h2>
          <p className="r d2" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 80px' }}>
            Shrimply là hệ điều hành nuôi trồng thủy sản thực sự hợp nhất đầu tiên, được xây dựng để xóa bỏ khoảng trống dữ liệu, kết nối mọi bộ phận trong quy trình vận hành và thực sự giúp bạn hiểu rõ những gì đang diễn ra trong ao nuôi của mình.
          </p>
          
          <div className="features-grid">
            <div className="feature-card r d1">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Database size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Một nguồn dữ liệu tin cậy duy nhất</h3>
              <p>Dữ liệu thức ăn, tồn kho, chất lượng nước và thu hoạch gom về một nơi duy nhất. Không còn phải đối soát thủ công. Không còn phỏng đoán giữa các ca làm việc. Toàn bộ hoạt động vận hành của bạn được hợp nhất hoàn toàn.</p>
            </div>
            <div className="feature-card r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Brain size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Trí tuệ nhân tạo sinh học</h3>
              <p>Orson AI không chỉ đơn thuần lưu trữ dữ liệu của bạn. Nó thấu hiểu dữ liệu, chuyển đổi các con số thô thành dự báo 72 giờ, cảnh báo xu hướng và các thông tin sinh học chuyên sâu giúp bạn đón đầu vấn đề trước khi chúng gây thiệt hại.</p>
            </div>
            <div className="feature-card r d3">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><ShieldCheck size={28} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Chủ động phòng chống dịch bệnh</h3>
              <p>Dịch bệnh không chờ bạn phát hiện ra nó. Bản đồ dịch bệnh theo thời gian thực của chúng tôi cảnh báo ngay khi các trang trại lân cận ghi nhận ổ dịch, mang lại cho bạn thời gian chuẩn bị quý báu để bảo vệ toàn bộ vụ nuôi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div className="eyebrow r" style={{ marginBottom: '16px' }}>Giá trị cốt lõi</div>
          <h2 className="section-title r d1">
            Bốn nguyên tắc định hình <em>mọi quyết định của chúng tôi.</em>
          </h2>
        </div>
        <section className="stats-band">
          <div className="stat-box r d1">
            <div className="stat-num">01</div>
            <span className="stat-lbl">Xây dựng bởi người nuôi tôm</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Được sáng lập bởi người nuôi tôm đã trực tiếp trải qua khó khăn thực tế, không phải bởi đội ngũ phần mềm phỏng đoán từ xa.</p>
          </div>
          <div className="stat-box r d2">
            <div className="stat-num">02</div>
            <span className="stat-lbl">Tất cả trong một</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Một nền tảng duy nhất thay thế toàn bộ chồng ứng dụng và bảng tính mà phần lớn trang trại đang sử dụng hiện nay.</p>
          </div>
          <div className="stat-box r d3">
            <div className="stat-num">03</div>
            <span className="stat-lbl">Chuyên biệt cho ngành tôm</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Mọi tính năng đều được thiết kế xoay quanh đặc tính sinh học, hồ sơ rủi ro và bài toán kinh tế đặc thù của nghề nuôi tôm.</p>
          </div>
          <div className="stat-box r d4">
            <div className="stat-num">04</div>
            <span className="stat-lbl">Bảo vệ chủ động</span>
            <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Chuyển dịch ngành nuôi từ ứng phó bị động sang phòng vệ chủ động — đặc biệt là trước sự lây lan tàn khốc của dịch bệnh.</p>
          </div>
        </section>
      </section>

      {/* CTA Section */}
      <section className="section dark-section" style={{ textAlign: 'center', background: 'linear-gradient(160deg, var(--navy) 0%, var(--deep) 100%)' }}>
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="eyebrow r d1" style={{ marginBottom: '20px' }}>Điểm mấu chốt</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px', color: 'var(--white)', maxWidth: '700px', margin: '0 auto 24px' }}>
            Nuôi tôm là một hoạt động kinh doanh.<br /><em>Chúng tôi tạo ra Orson AI để giữ cho kinh doanh luôn hiệu quả.</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '480px', margin: '0 auto 48px', color: 'rgba(255,255,255,0.65)' }}>
            Loại bỏ sự hỗn loạn. Ngăn ngừa thất thoát. Đạt được mục tiêu với sự rõ ràng và hiệu quả mà trang trại của bạn xứng đáng có được.
          </p>
          <div className="r d4 mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Bắt đầu miễn phí</Link>
            <Link href="/vi/how-it-works" className="btn-outline" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)' }}>Xem cách hoạt động</Link>
          </div>
        </div>
      </section>

      <FooterVI />
    </main>
  );
}
