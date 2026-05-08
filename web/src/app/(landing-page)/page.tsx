"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Cursor from '@/components/Cursor';
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
  Smartphone,
  ChevronRight,
  Zap,
  Layers,
  RefreshCcwDot
} from 'lucide-react';

export default function LandingPage() {
  useEffect(() => {
    // Intersection Observer for Reveal Animations
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('v');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.r, .stat-box').forEach(el => observer.observe(el));
    
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Cursor />
      <Navbar />

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.3s' }}>Aquaculture Intelligence Platform</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.52s', margin: '24px 0' }}>
            Your Pond. <br />
            <em>Under Control.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.76s', maxWidth: '420px', marginBottom: '40px', fontWeight: 500 }}>
            Harness Orson AI to detect biological risk patterns, optimize feeding, and protect your pond's yield.
          </p>
          <div className="animate-hero" style={{ animationDelay: '0.98s', display: 'flex', gap: '16px' }}>
            <Link href="/how-it-works" className="btn-primary">See the Platform</Link>
            <Link href="/auth/join" className="btn-outline">Start Free Trial</Link>
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
              <div className="app-url">shrimply.tech/dashboard</div>
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
                  <div style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', color: '#fff' }}>Active Ponds</div>
                  <div style={{ background: 'var(--sky)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(26,184,232,0.3)' }}>+</div>
                </div>

                {/* Pond Card 1 */}
                <div className="app-pond-card" style={{ animation: 'fup 0.8s forwards 1.2s', opacity: 0 }}>
                  <div className="app-pond-header">
                    <div className="app-pond-name">Pond A1</div>
                    <div className="app-doc-badge" style={{ background: '#1e6fa8' }}>DOC 45</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Biomass</span>
                          <span className="val">1,240.5 kg</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <span className="icon" style={{ fontSize: '0.8rem' }}>🦐</span>
                        <div className="col">
                          <span className="lbl">Population</span>
                          <span className="val">85,200</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Heart size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Survival</span>
                          <span className="val">92.4%</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Maximize2 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Size</span>
                          <span className="val">54 pcs/kg</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <TrendingUp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">ADG</span>
                          <span className="val">0.24 g/day</span>
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
                  <div className="app-pond-footer">
                    <span style={{ color: 'var(--sky)' }}>📅</span> Started: 03/15/2026 • Last Sample: 04/28/2026
                  </div>
                </div>

                {/* Pond Card 2 */}
                <div className="app-pond-card" style={{ animation: 'fup 0.8s forwards 1.4s', opacity: 0 }}>
                  <div className="app-pond-header">
                    <div className="app-pond-name">Pond B2</div>
                    <div className="app-doc-badge" style={{ background: '#0d2137' }}>DOC 21</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Biomass</span>
                          <span className="val">420.2 kg</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <span className="icon" style={{ fontSize: '0.8rem' }}>🦐</span>
                        <div className="col">
                          <span className="lbl">Population</span>
                          <span className="val">98,100</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Heart size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Survival</span>
                          <span className="val">96.1%</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Maximize2 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Size</span>
                          <span className="val">233 pcs/kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="app-pond-footer">
                    <span style={{ color: 'var(--sky)' }}>📅</span> Started: 04/08/2026 • Last Sample: 04/27/2026
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
          <div className="stat-num">15<span style={{ color: 'var(--sky)' }}>%</span></div>
          <div className="stat-lbl">Avg yield increase</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Proven across our enterprise clients.</div>
        </div>
        <div className="stat-box r d2">
          <div className="stat-num">72<span style={{ color: 'var(--sky)' }}>h</span></div>
          <div className="stat-lbl">Advance warning</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Spot biological risk before it becomes expensive.</div>
        </div>
        <div className="stat-box r d3">
          <div className="stat-num">90<span style={{ color: 'var(--sky)' }}>%</span></div>
          <div className="stat-lbl">Time saved</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Automated reporting and logs.</div>
        </div>
        <div className="stat-box r d4">
          <div className="stat-num">24<span style={{ color: 'var(--sky)' }}>/7</span></div>
          <div className="stat-lbl">AI Monitoring</div>
          <div className="stat-desc" style={{ fontWeight: 500 }}>Continuous water checks.</div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" style={{ background: 'var(--white)', padding: '140px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div className="eyebrow r d1" style={{ marginBottom: '16px' }}>Why Shrimply?</div>
            <h2 className="section-title r d2" style={{ maxWidth: '800px', margin: '0 auto' }}>
              Precision aquaculture <em>for maximum ROI</em>
            </h2>
          </div>
          <div className="features-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="feature-card r d1">
              
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Layers size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Enterprise Scaling</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Manage multiple farm locations across different regions from a single unified web command center.</p>
              
            </div>
            <div className="feature-card feature-accent r d2">
              
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><Cpu size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Orson AI Core</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Orson analyzes pond records, feed response, and water-quality trends to flag biological risk early.</p>
             
            </div>
            <div className="feature-card r d3">
              
              <div style={{ color: 'var(--sky)', marginBottom: '24px' }}><RefreshCcwDot size={26} /></div>
              <h3 className="feature-title" style={{ marginBottom: '16px' }}>Seamless Ecosystem</h3>
              <p style={{ marginBottom: '24px', fontWeight: 500 }}>Full-featured mobile app for field work and a heavy-duty web portal for analysis - always in sync.</p>
             
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHT (ORSON AI) */}
      <section className="highlight">
        <div className="highlight-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>Meet Orson</div>
            <h2 className="section-title" style={{ color: 'var(--white)', marginBottom: '24px' }}>
              Your AI aquaculture consultant. <em>Always on call.</em>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '440px', fontSize: '1.05rem', fontWeight: 500, marginBottom: '24px' }}>
              Orson isn't just a chatbot. He's an expert system providing biological advice that helps you save money and increase survival rates.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><Activity size={18} strokeWidth={1.5} /></div>
                <div>72-hour biological risk outlooks</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><TrendingUp size={18} strokeWidth={1.5} /></div>
                <div>Actionable feeding and stocking recommendations</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                <div style={{ color: 'var(--sky)', display: 'flex', alignItems: 'center' }}><Zap size={18} strokeWidth={1.5} /></div>
                <div>Instant alerts on abnormal water parameters</div>
              </div>
            </div>

            <Link href="/orson" className="btn-primary" style={{ padding: '16px 36px', display: 'inline-block' }}>Learn How Orson Works</Link>
          </div>
          <div className="r d3 chat-container" style={{ maxWidth: '100%' }}>
            <div className="chat-bubble bubble-user" style={{ animationDelay: '1.5s' }}>How's Pond A1 looking today?</div>
            <div className="chat-bubble bubble-orson" style={{ animationDelay: '3s' }}>Pond A1 is stable. However, DO levels dipped slightly at 4 AM. Increase aeration by 15% for the next 2 hours.</div>
            <div className="chat-bubble bubble-user" style={{ animationDelay: '6s' }}>Is B2 overfeeding?</div>
            <div className="chat-bubble bubble-orson" style={{ animationDelay: '7.5s' }}>Feed pressure is above the biomass estimate. Hold the next increase and verify tray clearance before feeding up.</div>
            <div className="chat-typing">Orson is thinking...</div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="section" style={{ background: 'var(--off-white)', textAlign: 'center', padding: '160px 52px' }}>
        <div className="container r d1">
          <h2 className="section-title" style={{ marginBottom: '24px' }}>Ready to scale your <em>farm?</em></h2>
          <p style={{ marginBottom: '40px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', fontWeight: 500, fontSize: '1.05rem' }}>
            Built by farmers, for farmers. Experience the clarity your operation deserves.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
            <Link href="/auth/join" className="btn-primary" style={{ padding: '18px 46px', fontSize: '0.8rem' }}>Start Your Free Trial</Link>
            <Link href="/" className="btn-outline" style={{ padding: '18px 46px', fontSize: '0.8rem' }}>Download App</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
