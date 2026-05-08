"use client";

import React from 'react';
import { ShieldAlert, Construction, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DiseaseReportPage() {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="glass-card animate-fade-up" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh', 
        gap: '24px', 
        textAlign: 'center',
        padding: '40px'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '24px', 
          background: 'var(--primary-dim)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'var(--primary)',
          border: '1px solid var(--border)'
        }}>
          <ShieldAlert size={40} />
        </div>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', fontSize: '16px', lineHeight: 1.6 }}>
          Our AI-powered disease detection and reporting system is currently being optimized for the Orson AI web portal. 
          <br />
          <strong style={{ color: 'var(--primary)' }}>Please use the mobile app for real-time diagnostic reporting.</strong>
        </p>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ padding: '12px 24px', borderRadius: '12px' }}>
              <ArrowLeft size={18} /> Back to Dashboard
            </button>
          </Link>
          <button className="btn-primary" style={{ padding: '12px 24px', borderRadius: '12px', opacity: 0.7, cursor: 'not-allowed' }}>
            <Construction size={18} /> Coming Soon to Web
          </button>
        </div>
      </div>
    </div>
  );
}
