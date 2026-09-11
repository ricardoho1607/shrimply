"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Cursor from '@/components/Cursor';
import { 
  Smartphone, 
  Monitor, 
  Database, 
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

      {/* HERO: THE SCALE OF SHRIMPLY */}
      <section className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', background: 'var(--off-white)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow animate-hero" style={{ animationDelay: '0.2s', marginBottom: '16px' }}>Platform Overview</div>
          <h1 className="animate-hero" style={{ animationDelay: '0.4s', marginBottom: '32px' }}>
            From Pond to Profit.<br /><em>The full-scale OS.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: '0.6s', maxWidth: '700px', margin: '0 auto', fontSize: '1.15rem', fontWeight: 500, color: 'var(--muted)' }}>
            A unified ecosystem connecting farm hands, mechanics, managers, and buyers through a single source of biological and financial truth.
          </p>
        </div>
      </section>

      {/* PILLAR 1: FIELD & ASSETS */}
      <section className="section" style={{ background: 'var(--white)' }}>
        <div className="container mobile-stack-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '80px', alignItems: 'center' }}>
          <div>
            <div className="eyebrow r" style={{ color: 'var(--sky)', marginBottom: '16px' }}>01 / Field Intelligence</div>
            <h2 className="section-title r d1" style={{ marginBottom: '24px' }}>
              Accountability on the <em>pond edge.</em>
            </h2>
            <p className="r d2" style={{ marginBottom: '32px', fontSize: '1.05rem', fontWeight: 500 }}>
              Stop losing equipment and missing data. Shrimply bridge the gap between physical assets and digital records.
            </p>
            <div className="r d3" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><QrCode size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>QR Asset Tracking</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Mechanics and owners scan assets to log service history and movement. Never lose a pump or paddlewheel again.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><Clock size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Maintenance Alerts</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Automatic reminders when equipment hits service intervals. Proactive care to prevent mid-cycle failures.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ color: 'var(--sky)', flexShrink: 0 }}><Smartphone size={26} strokeWidth={1.5} /></div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Robust Offline Logging</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Remote location? No problem. Entry data is saved locally and auto-syncs the moment you have a signal.</p>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Last Service:</span> <strong>Apr 12, 2026</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>Location:</span> <strong>Pond B2</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e84c1a', fontWeight: 700 }}><span>Status:</span> <span>Service Required</span></div>
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
            <div className="eyebrow r" style={{ color: 'var(--sky)', marginBottom: '16px' }}>02 / Operations</div>
            <h2 className="section-title r d1" style={{ color: 'white' }}>
              The Command Center: <em>Focused Governance.</em>
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }} className="r d2 mobile-stack-grid">
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <Users size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Role-Based Access</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                <strong>Owners:</strong> Total control.<br/>
                <strong>Managers:</strong> Finance & Inventory focus.<br/>
                <strong>Technicians:</strong> Field data & Logs only.
              </p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <FileText size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Automated Reporting</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>One-click PDF generation for COGS, Profit & Loss, and Cashflow. Enterprise-grade financial auditing in seconds.</p>
            </div>
            <div className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
              <BarChart3 size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>Inventory Alerts</h4>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Set your own reorder thresholds. Receive instant notifications when feed or chemicals hit critical low levels.</p>
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
                  ⚠️ Outbreak Alert: 2.4km away
               </div>
            </div>
          </div>
          <div>
            <div className="eyebrow r d2" style={{ color: 'var(--sky)', marginBottom: '16px' }}>03 / Biosecurity</div>
            <h2 className="section-title r d3" style={{ marginBottom: '24px' }}>
              The Community <em>&quot;Vaccine.&quot;</em>
            </h2>
            <p className="r d4" style={{ marginBottom: '32px', fontSize: '1.05rem', fontWeight: 500 }}>
              Coast-wide contamination is the industry&apos;s biggest threat. Shrimply transforms individual farm safety into a collective defense system.
            </p>
            <div className="r d5" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ color: '#e84c1a' }}><ShieldAlert size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Instant Notifications</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>The moment a nearby farm reports a disease, you are alerted. Seconds save cycles.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ color: 'var(--sky)' }}><UserLock size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>Total Privacy</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Map data is anonymized. Your farm identity remains private to the community while still contributing to the collective safety.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLAR 4: MARKETPLACE */}
      <section className="section" style={{ background: 'var(--off-white)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow r d1" style={{ color: 'var(--sky)', marginBottom: '16px' }}>04 / The Marketplace</div>
          <h2 className="section-title r d2" style={{ marginBottom: '24px' }}>
            Closing the <em>Buyer Gap.</em>
          </h2>
          <p className="r d3" style={{ maxWidth: '600px', margin: '0 auto 60px', fontSize: '1.05rem', fontWeight: 500 }}>
            Browse buyer posts and market information, then connect with potential buyers. Midtrans payments on Shrimply are exclusively for software subscriptions, not marketplace purchases, escrow, or seller payouts. <Link href="/pricing">View subscription products and prices.</Link>
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="r d4 mobile-stack-grid-compact">
            <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '1px solid var(--slate)', textAlign: 'left' }}>
              <ShoppingBag size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>For Farm Owners</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Browse active buyer posts and current market prices. Know exactly what your shrimp is worth before you negotiate.</p>
            </div>
            <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: '1px solid var(--slate)', textAlign: 'left' }}>
              <Monitor size={24} style={{ color: 'var(--sky)', marginBottom: '20px' }} />
              <h4 style={{ marginBottom: '12px' }}>For Buyers</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>Monitor average size and population trends of nearby farms. Connect with owners exactly when their ponds hit your target weight.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSITION TO ORSON */}
      <section className="section dark-section" style={{ color: 'white', textAlign: 'center', padding: '120px 0' }}>
        <div className="dark-glow"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
           <h2 className="section-title r d1" style={{ color: 'white', marginBottom: '32px' }}>
            Data is nothing without <em>intelligence.</em>
           </h2>
           <p className="r d2" style={{ maxWidth: '600px', margin: '0 auto 48px', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', fontWeight: 500 }}>
            While the Shrimply platform logs your operation, Orson AI interprets the biology.
           </p>
           <div className="r d3">
              <Link href="/orson" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                Deep Dive into Orson AI <ChevronRight size={16} />
              </Link>
           </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
