"use client";

import React, { useState } from 'react';
import { Building2, Rocket, ArrowRight, ShieldCheck, Phone, MapPin, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function CompanySetupPage() {
  const { completeCompanySetup, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    primaryLocation: '',
    farmType: '',
    businessSize: 'medium',
    description: '',
    contactPhone: '',
    isPublicProfile: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await completeCompanySetup(formData);
      router.push('/dashboard');
    } catch (error: any) {
      alert(error.message || 'Failed to set up company');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#F8FAFC',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '14px 18px',
    outline: 'none',
    fontSize: '15px',
    transition: 'all 0.2s',
    color: 'var(--text-primary)',
    fontFamily: 'inherit'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginLeft: '4px',
    display: 'block',
    marginBottom: '8px'
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      padding: '80px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'var(--gradient-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          color: 'var(--primary)'
        }}>
          <Building2 size={40} />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>
          Setup Your Farm
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
          Tell us about your aquaculture business to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        maxWidth: '600px',
        width: '100%',
        background: '#FFFFFF',
        padding: '48px',
        borderRadius: '32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }}>
        <div>
          <label style={labelStyle}>Company / Farm Name *</label>
          <input 
            style={inputStyle}
            placeholder="e.g. Blue Ocean Shrimp Farm"
            value={formData.companyName}
            onChange={e => setFormData({...formData, companyName: e.target.value})}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Location *</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input 
                style={{ ...inputStyle, paddingLeft: '44px' }}
                placeholder="e.g. Jakarta, ID"
                value={formData.primaryLocation}
                onChange={e => setFormData({...formData, primaryLocation: e.target.value})}
                required
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Farm Type</label>
            <input 
              style={inputStyle}
              placeholder="e.g. Vannamei"
              value={formData.farmType}
              onChange={e => setFormData({...formData, farmType: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Business Size</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {['small', 'medium', 'large'].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setFormData({...formData, businessSize: size as any})}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor: formData.businessSize === size ? 'var(--primary)' : 'var(--border)',
                  background: formData.businessSize === size ? 'var(--primary-dim)' : 'transparent',
                  color: formData.businessSize === size ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'capitalize',
                  cursor: 'pointer'
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Contact Phone</label>
          <div style={{ position: 'relative' }}>
            <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input 
              style={{ ...inputStyle, paddingLeft: '44px' }}
              placeholder="+62 812..."
              value={formData.contactPhone}
              onChange={e => setFormData({...formData, contactPhone: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Farm Description</label>
          <textarea 
            style={{ ...inputStyle, minHeight: '100px', resize: 'none' }}
            placeholder="Tell us a bit about your operation..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'var(--bg-mid)',
          borderRadius: '16px',
          border: '1px solid var(--border)'
        }}>
          <input 
            type="checkbox" 
            checked={formData.isPublicProfile}
            onChange={e => setFormData({...formData, isPublicProfile: e.target.checked})}
            style={{ width: '20px', height: '20px' }}
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Public Profile</div>
            <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Allow buyers to find your farm in the marketplace</div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          style={{
            marginTop: '12px',
            padding: '18px',
            borderRadius: '16px',
            background: 'var(--primary)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(15,76,117,0.2)'
          }}
        >
          {loading ? 'Setting up...' : (
            <>
              Launch Command Center
              <Rocket size={20} />
            </>
          )}
        </button>
      </form>
    </main>
  );
}
