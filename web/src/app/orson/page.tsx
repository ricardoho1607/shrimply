"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  BarChart2, 
  Cpu
} from 'lucide-react';

import Cursor from '@/components/Cursor';

export default function HowItWorksPage() {
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
      <Navbar />

      {/* Hero Section */}
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s', marginBottom: '16px' }}>Inside the Mind of Orson</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.5s', marginBottom: '32px' }}>
            Beyond Data.<br /><em>Biological Intelligence.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.7s', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
            Orson uses a frontier model for reasoning, connecting your recent water quality, sampling, and feed records to help you understand what needs a closer look.
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
            <div className="eyebrow r" style={{ marginBottom: '16px' }}>The Challenge</div>
            <h2 className="section-title r d1" style={{ marginBottom: '24px', color: 'var(--white)' }}>
              The numbers aren&apos;t telling you the <em>whole story.</em>
            </h2>
            <p className="r d2" style={{ marginBottom: '32px', color: 'rgba(255,255,255,0.72)' }}>
              Traditional farming relies on morning snapshots. But a single data point is not a biological reality. While you see a normal pH level, Orson sees a 3-day downward trend correlating with your rising feeding logs.
            </p>
          </div>
          <div className="r d3">
            <div className="orson-chat-panel" style={{ background: 'rgba(244,248,252,0.96)', border: '1px solid rgba(26,184,232,0.26)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 26px 80px rgba(0,0,0,0.32)' }}>
              <div className="orson-chat-bubble-user" style={{ padding: '14px 18px', borderRadius: '10px', fontSize: '0.9rem', maxWidth: '82%', background: 'linear-gradient(135deg, var(--blue) 0%, var(--sky) 100%)', color: 'var(--white)', alignSelf: 'flex-end', borderBottomRightRadius: '2px', lineHeight: 1.6, boxShadow: '0 10px 24px rgba(26,184,232,0.22)' }}>
                &quot;I check my ponds every morning. I have stacks of notebooks filled with pH and Temp. But last month, a sudden algae crash took out 10% of my stock. Why didn&apos;t I see it coming?&quot;
              </div>
              <div className="orson-chat-bubble-orson" style={{ padding: '14px 18px', borderRadius: '10px', fontSize: '0.9rem', maxWidth: '82%', background: 'var(--white)', color: 'var(--ink)', alignSelf: 'flex-start', borderBottomLeftRadius: '2px', border: '1px solid var(--slate)', lineHeight: 1.6 }}>
                &quot;Because a single number is just a snapshot. I look at the biological pattern: feed pressure, DO movement, pH swing, and growth trend. That combination would have raised a warning before the visual signs were obvious.&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sampling Gap Section */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container">
          <div className="eyebrow r" style={{ marginBottom: '16px', textAlign: 'center' }}>The Sampling Gap</div>
          <h2 className="section-title r d1" style={{ textAlign: 'center', marginBottom: '64px' }}>
            Solving the problem of <em>inaccurate manual measurements.</em>
          </h2>
          <div className="features-grid">
            <div className="feature-card r d2">
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><BarChart2 size={26} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>The &quot;Noisy&quot; Reality</h3>
              <p>Manual sampling is never 100% accurate. Sometimes you catch the small shrimp; sometimes the big ones. In traditional farming, this &quot;noise&quot; makes growth charts look like a roller coaster.</p>
            </div>
            <div className="feature-card r d3" style={{ gridColumn: 'span 2' }}>
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Cpu size={26} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Orson&apos;s Statistical Smoothing</h3>
              <p>Orson doesn&apos;t just &quot;connect the dots.&quot; He uses recent biological trend-lines to reduce sampling noise, highlight outliers, and estimate growth confidence from the data your farm actually records.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Appetite Section */}
      <section className="section">
        <div className="container mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div className="r d1">
            <div style={{ background: 'var(--white)', border: '1px solid var(--slate)', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ color: 'var(--ink)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Real-Time Diagnosis</div>
              <div style={{ background: 'var(--ice)', color: 'var(--ink)', fontStyle: 'italic', fontSize: '1rem', padding: '12px 16px', borderRadius: '8px', alignSelf: 'flex-start', borderBottomLeftRadius: '2px' }}>
                &quot;Water parameters are currently in range, but 40% tray clearance suggests stress or overfeeding risk. Hold the next feed increase and recheck DO, pH swing, and appetite trend.&quot;
              </div>
            </div>
          </div>
          <div>
            <div className="eyebrow r d2" style={{ marginBottom: '16px' }}>Appetite Analysis</div>
            <h2 className="section-title r d3" style={{ marginBottom: '24px' }}>
              The Feed <em>Intelligence System.</em>
            </h2>
            <p className="r d4" style={{ marginBottom: '32px' }}>
              Appetite often changes before mortality is visible. Orson uses feed tray checks, biomass estimates, and water quality together as an early stress signal.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="stats-band">
        <div className="stat-box r d1">
          <div className="stat-num">01</div>
          <div className="stat-lbl">Biosecurity First</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Flagging biological risk patterns before they become obvious visually.</p>
        </div>
        <div className="stat-box r d2">
          <div className="stat-num">02</div>
          <div className="stat-lbl">Precision Feeding</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Optimizing FCR to reduce the most expensive part of farming.</p>
        </div>
        <div className="stat-box r d3">
          <div className="stat-num">03</div>
          <div className="stat-lbl">Harvest Forecasts</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Knowing your market size and weight weeks in advance.</p>
        </div>
        <div className="stat-box r d4">
          <div className="stat-num">04</div>
          <div className="stat-lbl">Stress Detection</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Spotting appetite drops and hidden stress before mortality starts.</p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--off-white)' }}>
        <div className="container">
          <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>Related Farm Intelligence Guides</div>
          <h2 className="section-title r d2" style={{ maxWidth: '860px', marginBottom: '28px' }}>
            Connect Orson AI with the farm records that explain pond performance.
          </h2>
          <div className="resource-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            {[
              {
                href: '/resources/fcr-shrimp-farming',
                title: 'Improving FCR in shrimp farming',
                body: 'Use feed, biomass, mortality, and harvest records to interpret feed conversion ratio more accurately.',
              },
              {
                href: '/resources/feed-tray-observations',
                title: 'Feed tray observations',
                body: 'Review appetite signals before uneaten feed becomes a water-quality and FCR problem.',
              },
              {
                href: '/resources/water-quality-trends',
                title: 'Water quality trends',
                body: 'Read DO, pH, salinity, ammonia, and nitrite together instead of treating readings as isolated numbers.',
              },
              {
                href: '/resources/white-spot-syndrome-virus-shrimp',
                title: 'WSSV response and prevention',
                body: 'Connect mortality, appetite, pond movement, and biosecurity actions when WSSV is suspected.',
              },
              {
                href: '/features/disease-alerts',
                title: 'Disease alerts',
                body: 'See how Shrimply keeps disease-risk context close to water, feed, growth, and mortality records.',
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
          <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>Get Started</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px' }}>
            Ready to <em>farm smarter?</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '480px', margin: '0 auto 40px' }}>
            Experience the power of biological intelligence today. Start your first pond with Orson.
          </p>
          <div className="r d4 mobile-cta-row" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Try Shrimply for Free</Link>
            <Link href="/" className="btn-outline">Back to Home</Link>
          </div>
        </div>
      </section>

      <Footer />

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
