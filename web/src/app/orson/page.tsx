"use client";

import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  BarChart2, 
  Cpu, 
  Zap,
  TrendingUp,
  Activity
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
            Learn how Orson turns messy pond data into a 72-hour forecast and why he is the 24/7 consultant your farm deserves.
          </p>
        </div>
      </section>

      {/* Challenge Section */}
      <section className="section dark-section">
        <div className="dark-glow"></div>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <div>
            <div className="eyebrow r" style={{ marginBottom: '16px' }}>The Challenge</div>
            <h2 className="section-title r d1" style={{ marginBottom: '24px' }}>
              The numbers aren't telling you the <em>whole story.</em>
            </h2>
            <p className="r d2" style={{ marginBottom: '32px' }}>
              Traditional farming relies on morning snapshots. But a single data point is not a biological reality. While you see a normal pH level, Orson sees a 3-day downward trend correlating with your rising feeding logs.
            </p>
          </div>
          <div className="r d3">
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(26,184,232,0.09)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '0.88rem', maxWidth: '80%', background: 'rgba(26,184,232,0.1)', color: 'var(--white)', alignSelf: 'flex-end', borderBottomRightRadius: '2px' }}>
                "I check my ponds every morning. I have stacks of notebooks filled with pH and Temp. But last month, a sudden algae crash took out 10% of my stock. Why didn't I see it coming?"
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '8px', fontSize: '0.88rem', maxWidth: '80%', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', alignSelf: 'flex-start', borderBottomLeftRadius: '2px' }}>
                "Because a single number is just a snapshot. I look at the Biological Story. Your pond's carrying capacity was at a breaking point, but the visual signs hadn't surfaced yet. I could have warned you 48 hours earlier."
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
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>The "Noisy" Reality</h3>
              <p>Manual sampling is never 100% accurate. Sometimes you catch the small shrimp; sometimes the big ones. In traditional farming, this "noise" makes growth charts look like a roller coaster.</p>
            </div>
            <div className="feature-card r d3" style={{ gridColumn: 'span 2' }}>
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Cpu size={26} strokeWidth={1.5} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Orson's Statistical Smoothing</h3>
              <p>Orson doesn't just "connect the dots." He uses biological trend-lines to filter out sampling errors. He looks at the 7-day trajectory and compares it against thousands of successful Vannamei growth models to find the truth, giving you a smooth, highly accurate growth curve.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Appetite Section */}
      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div className="r d1">
            <div style={{ background: 'var(--white)', border: '1px solid var(--slate)', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ color: 'var(--ink)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Real-Time Diagnosis</div>
              <div style={{ background: 'var(--ice)', color: 'var(--ink)', fontStyle: 'italic', fontSize: '1rem', padding: '12px 16px', borderRadius: '8px', alignSelf: 'flex-start', borderBottomLeftRadius: '2px' }}>
                "Water parameters are currently in range, but the 40% Tray clearance indicates a hidden stressor. Check for early signs of disease or Vibrio before mortality begins."
              </div>
            </div>
          </div>
          <div>
            <div className="eyebrow r d2" style={{ marginBottom: '16px' }}>Appetite Analysis</div>
            <h2 className="section-title r d3" style={{ marginBottom: '24px' }}>
              The Feed <em>Intelligence System.</em>
            </h2>
            <p className="r d4" style={{ marginBottom: '32px' }}>
              Shrimp stop eating 24-48 hours before they start dying. Orson uses your feed tray checks as the ultimate early warning indicator.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="stats-band">
        <div className="stat-box r d1">
          <div className="stat-num">01</div>
          <div className="stat-lbl">Biosecurity First</div>
          <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Predicting outbreaks before they manifest visually.</p>
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
          <div className="r d4" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <a href="/auth/join" className="btn-primary">Try Shrimply for Free</a>
            <a href="/" className="btn-outline">Back to Home</a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
