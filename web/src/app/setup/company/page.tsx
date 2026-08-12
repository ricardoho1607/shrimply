"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Rocket, Phone, MapPin, ArrowLeft, LogOut, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { OnboardingLoading, useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { BUSINESS_SIZES, DEFAULT_COMPANY_SETUP, type BusinessSize } from '@/config/business';
import { ROUTES } from '@/config/routes';
import { getSupportedTimeZones, getSystemTimeZone } from '../../../../../shared/farmDate';
import {
  getLocationDetails,
  searchCityLocations,
  type PlaceSuggestion,
  type SelectedLocation,
} from '@/lib/googlePlacesClient';
import OnboardingProgress from '@/components/OnboardingProgress';
import { getCompanySetupProgress } from '../../../../../shared/onboarding';

export default function CompanySetupPage() {
  const isReady = useOnboardingGuard('setup');
  const { completeCompanySetup, loading, signOut, company, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [formData, setFormData] = useState(() => ({
    ...DEFAULT_COMPANY_SETUP,
    timeZone: getSystemTimeZone(),
  }));
  const [signingOut, setSigningOut] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [locationError, setLocationError] = useState('');
  const timeZoneOptions = useMemo(() => getSupportedTimeZones(), []);
  const setupProgress = getCompanySetupProgress(formData, Boolean(selectedLocation));

  useEffect(() => {
    if (!company || user?.hasCompletedSetup) return;
    const existingLocation = company.primaryLocation;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setFormData(current => ({
        ...current,
        companyName: company.companyName || '',
        primaryLocation: typeof existingLocation === 'string' ? existingLocation : existingLocation?.address || '',
        farmType: company.farmType || '',
        businessSize: company.businessSize || current.businessSize,
        description: company.description || '',
        contactPhone: company.contactPhone || '',
        isPublicProfile: company.isPublicProfile ?? true,
        timeZone: company.timeZone || current.timeZone,
      }));
      if (existingLocation && typeof existingLocation === 'object'
        && Number.isFinite(existingLocation.latitude) && Number.isFinite(existingLocation.longitude)) {
        setSelectedLocation({
          address: existingLocation.address || '',
          latitude: existingLocation.latitude || 0,
          longitude: existingLocation.longitude || 0,
          city: existingLocation.city || '',
          state: existingLocation.state || '',
          country: existingLocation.country || '',
          ...(existingLocation.postalCode ? { postalCode: existingLocation.postalCode } : {}),
          placeId: existingLocation.placeId || 'existing-location',
        });
      }
    });
    return () => {
      active = false;
    };
  }, [company, user?.hasCompletedSetup]);

  useEffect(() => {
    const query = formData.primaryLocation.trim();
    if (query.length < 2 || selectedLocation) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchingLocations(true);
      setLocationError('');
      try {
        const suggestions = await searchCityLocations(query);
        if (!controller.signal.aborted) setLocationSuggestions(suggestions);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLocationSuggestions([]);
        setLocationError('Could not search locations. Please try again.');
      } finally {
        if (!controller.signal.aborted) setSearchingLocations(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [formData.primaryLocation, selectedLocation]);

  const selectLocation = async (suggestion: PlaceSuggestion) => {
    setSearchingLocations(true);
    setLocationError('');
    try {
      const location = await getLocationDetails(suggestion.placeId);
      setSelectedLocation(location);
      setLocationSuggestions([]);
      setFormData(current => ({
        ...current,
        primaryLocation: location.address,
      }));
    } catch {
      setLocationError('Could not load that location. Please try another result.');
    } finally {
      setSearchingLocations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      setLocationError('Select a city from the suggestions before continuing.');
      return;
    }
    if (!formData.farmType.trim()) {
      alert(t.onboardingProgress.farmTypeRequired);
      return;
    }
    try {
      await completeCompanySetup({
        ...formData,
        primaryLocation: selectedLocation,
        country: selectedLocation.country,
      });
      router.push(ROUTES.dashboard);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to set up company');
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
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

  if (!isReady) return <OnboardingLoading />;

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      padding: '80px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <OnboardingProgress
        percent={setupProgress}
        title={t.onboardingProgress.company}
        detail={t.onboardingProgress.companyDetail}
      />
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <button
            type="button"
            onClick={() => router.push(ROUTES.setupChoice)}
            style={{
              padding: '12px 16px',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              color: 'var(--text-primary)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(15, 76, 117, 0.08)'
            }}
          >
            <ArrowLeft size={16} />
            Back to setup options
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              padding: '12px 16px',
              borderRadius: '999px',
              border: '1px solid #FECDCA',
              background: '#FEF3F2',
              color: '#B42318',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: signingOut ? 'not-allowed' : 'pointer',
              opacity: signingOut ? 0.7 : 1,
            }}
          >
            <LogOut size={16} />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
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
          <label htmlFor="company-name" style={labelStyle}>Company / Farm Name *</label>
          <input 
            id="company-name"
            style={inputStyle}
            placeholder="e.g. Blue Ocean Shrimp Farm"
            value={formData.companyName}
            onChange={e => setFormData({...formData, companyName: e.target.value})}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label htmlFor="company-location" style={labelStyle}>Location *</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '17px', color: 'var(--text-faint)', zIndex: 1 }} />
              <input 
                id="company-location"
                style={{ ...inputStyle, paddingLeft: '44px' }}
                placeholder="Type a city or country"
                value={formData.primaryLocation}
                onChange={e => {
                  setSelectedLocation(null);
                  setLocationSuggestions([]);
                  setLocationError('');
                  setFormData({...formData, primaryLocation: e.target.value});
                }}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="company-location-suggestions"
                required
              />
              {searchingLocations && (
                <LoaderCircle size={18} style={{ position: 'absolute', right: '14px', top: '17px', color: 'var(--primary)' }} />
              )}
              {locationSuggestions.length > 0 && (
                <div
                  id="company-location-suggestions"
                  role="listbox"
                  style={{
                    position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 20,
                    background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '14px',
                    overflow: 'hidden', boxShadow: '0 16px 36px rgba(15, 76, 117, 0.16)'
                  }}
                >
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.placeId}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => selectLocation(suggestion)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                        padding: '12px 14px', background: '#FFFFFF', border: 'none', cursor: 'pointer',
                        borderBottom: index < locationSuggestions.length - 1 ? '1px solid var(--border)' : 'none',
                        color: 'var(--text-primary)', fontFamily: 'inherit'
                      }}
                    >
                      <MapPin size={17} color="var(--secondary)" />
                      <span>
                        <strong style={{ display: 'block', fontSize: '13px' }}>{suggestion.mainText}</strong>
                        {suggestion.secondaryText && (
                          <span style={{ display: 'block', marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {suggestion.secondaryText}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                  <div style={{ padding: '7px 12px', background: '#F8FAFC', color: 'var(--text-faint)', fontSize: '10px', textAlign: 'right' }}>
                    Powered by Google
                  </div>
                </div>
              )}
            </div>
            {selectedLocation && (
              <p style={{ margin: '7px 4px 0', color: '#15803d', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={13} /> Standardized location selected
              </p>
            )}
            {locationError && (
              <p role="alert" style={{ margin: '7px 4px 0', color: '#B42318', fontSize: '11px' }}>{locationError}</p>
            )}
          </div>
          <div>
            <label htmlFor="company-farm-type" style={labelStyle}>Farm Type</label>
            <input 
              id="company-farm-type"
              style={inputStyle}
              placeholder="e.g. Vannamei"
              value={formData.farmType}
              onChange={e => setFormData({...formData, farmType: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Business Size</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '12px' }}>
            {BUSINESS_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setFormData({...formData, businessSize: size as BusinessSize})}
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
                <span style={{ display: 'block' }}>{size === 'enterprise' ? 'Enterprise' : size}</span>
                {size === 'enterprise' && (
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'none' }}>
                    100+ ponds • managed by blocks
                  </span>
                )}
              </button>
            ))}
          </div>
          {formData.businessSize === 'enterprise' && (
            <p style={{ margin: '12px 2px 0', color: 'var(--primary)', fontSize: '12px', lineHeight: 1.6, fontWeight: 650 }}>
              {t.onboardingProgress.enterpriseNext}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="company-timezone" style={labelStyle}>Farm timezone *</label>
          <select
            id="company-timezone"
            style={inputStyle}
            value={formData.timeZone}
            onChange={e => setFormData({...formData, timeZone: e.target.value})}
            required
          >
            {!timeZoneOptions.includes(formData.timeZone) && (
              <option value={formData.timeZone}>{formData.timeZone}</option>
            )}
            {timeZoneOptions.map(timeZone => (
              <option key={timeZone} value={timeZone}>{timeZone}</option>
            ))}
          </select>
          <p style={{ margin: '8px 4px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
            Confirm this matches the selected city. Daily farm records roll over at midnight here.
          </p>
        </div>

        <div>
          <label htmlFor="company-phone" style={labelStyle}>Contact Phone</label>
          <div style={{ position: 'relative' }}>
            <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input 
              id="company-phone"
              style={{ ...inputStyle, paddingLeft: '44px' }}
              placeholder="+62 812..."
              value={formData.contactPhone}
              onChange={e => setFormData({...formData, contactPhone: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label htmlFor="company-description" style={labelStyle}>Farm Description</label>
          <textarea 
            id="company-description"
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
            id="company-public-profile"
            type="checkbox" 
            checked={formData.isPublicProfile}
            onChange={e => setFormData({...formData, isPublicProfile: e.target.checked})}
            style={{ width: '20px', height: '20px' }}
          />
          <div>
            <label htmlFor="company-public-profile" style={{ fontSize: '14px', fontWeight: 700, display: 'block' }}>Public Profile</label>
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
