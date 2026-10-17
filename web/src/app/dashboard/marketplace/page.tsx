"use client";

import { useSaveOperation } from '../../../../../shared/useSaveOperation';
import { createRecordOnce } from '@/lib/saveData';
import { prepareSaveData as removeUndefinedFields } from '@/lib/saveData';
import { updateRecordOnline } from '@/lib/saveData';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Plus, Clock, Eye, MessageSquare, Tag, CreditCard, Loader2, X, CheckCircle2, ArrowUpRight, TrendingUp, Store, Edit, Trash2 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, serverTimestamp, increment, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useCurrency } from '@/contexts/CurrencyContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { getCompanyCountry, getDefaultMarketplaceExpiry, validateMarketplaceListing } from '../../../../../shared/marketplaceParity';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';

/* --- Types --------------------------------------------------- */
interface PriceList {
  size20?: number; size30?: number; size40?: number; size50?: number;
  size60?: number; size70?: number; size80?: number; size90?: number;
  size100?: number; size100Plus?: number;
}

type PriceListKey = keyof PriceList;

const priceListKeyForSize = (size: number): PriceListKey => `size${size}` as PriceListKey;

interface BuyerListing {
  id: string; companyId: string; companyName: string; buyerName: string;
  contactPhone: string; contactEmail: string; deliveryLocation: string;
  city: string; country: string; priceList: PriceList;
  paymentMethod: 'cash' | 'top'; topDays?: number;
  additionalNotes?: string; postedDate: string; expiryDate: string;
  viewCount: number; status: 'active' | 'expired';
  userId?: string;
}

interface ListingFormState {
  buyerName: string;
  city: string;
  country: string;
  deliveryLocation: string;
  contactPhone: string;
  contactEmail: string;
  expiryDate: string;
  paymentMethod: 'cash' | 'top';
  topDays: string;
  additionalNotes: string;
  priceList: PriceList;
}

const emptyListingForm: ListingFormState = {
  buyerName: '',
  city: '',
  country: '',
  deliveryLocation: '',
  contactPhone: '',
  contactEmail: '',
  expiryDate: getDefaultMarketplaceExpiry(),
  paymentMethod: 'cash',
  topDays: '',
  additionalNotes: '',
  priceList: {},
};

export default function MarketplacePage() {
  const copy = useDashboardCopy();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { user, company } = useAuth();
  const hasPermission = useFarmPermissions();
  const canManageMarketplace = hasPermission('manageMarketplace');
  const [listings, setListings] = useState<BuyerListing[]>([]);
  const { save, busy: savePending } = useSaveOperation();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState<BuyerListing | null>(null);
  const [isPostModalOpen, setPostModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'my'>('all');

  // Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  // Create Listing State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newListing, setNewListing] = useState<ListingFormState>(emptyListingForm);
  const [listingDateLimits] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { min: tomorrow.toISOString().slice(0, 10), max: getDefaultMarketplaceExpiry() };
  });

  // Removed local auth effect as we use AuthContext now

  useEffect(() => {
    if (!user) return;

    // Load all active listings in user's country
    const q = query(
      collection(db, 'marketplace_listings'),
      where('status', '==', 'active')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BuyerListing));
      // Client-side filtering for country if needed, or better UX
      setListings(all.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()));
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const filteredListings = useMemo(() => {
    const companyCountry = getCompanyCountry(company);
    return listings.filter(l => {
      const companyName = l.companyName || '';
      const city = l.city || '';
      const matchesSearch = companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeFilter === 'all' ? true : (l.companyId === company?.id || l.userId === user?.uid);
      const matchesCountry = !companyCountry || l.country === companyCountry || l.companyId === company?.id || l.userId === user?.uid;
      return matchesSearch && matchesTab && matchesCountry;
    });
  }, [listings, searchQuery, activeFilter, company, user]);

  const myListingsCount = useMemo(() => {
    return listings.filter(l => l.companyId === company?.id || l.userId === user?.uid).length;
  }, [listings, company, user]);

  const totalViews = useMemo(() => {
    return filteredListings.reduce((sum, listing) => sum + (listing.viewCount || 0), 0);
  }, [filteredListings]);

  const handleDeleteListing = async (listingId: string) => {
    if (!canManageMarketplace) return;
    setDeleteConfirm({ isOpen: true, id: listingId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id || !user) return;
    
    setIsSubmitting(true);
    try {
      const responses = await getDocs(query(collection(db, 'marketplace_responses'), where('listingId', '==', deleteConfirm.id)));
      await Promise.all(responses.docs.map((response) => deleteDoc(response.ref)));
      await deleteDoc(doc(db, 'marketplace_listings', deleteConfirm.id));
      
      // Cleanup local state
      setSelectedListing(null);
      setDeleteConfirm({ isOpen: false, id: null });
      
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      console.error("Error deleting listing:", error);
      if (firebaseError.code === 'permission-denied') {
        alert(copy('Permission Denied: You do not have authority to delete this listing. Please check your Firestore rules.'));
      } else {
        alert("Failed to delete listing: " + (firebaseError.message || "Unknown error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditListing = (listing: BuyerListing) => {
    if (!save.reset()) return;
    if (!canManageMarketplace) return;
    setEditingId(listing.id);
    setNewListing({
      buyerName: listing.buyerName,
      city: listing.city,
      country: listing.country || getCompanyCountry(company),
      deliveryLocation: listing.deliveryLocation,
      contactPhone: listing.contactPhone || user?.phone || '',
      contactEmail: listing.contactEmail || user?.email || '',
      expiryDate: listing.expiryDate?.slice(0, 10) || getDefaultMarketplaceExpiry(),
      paymentMethod: listing.paymentMethod,
      topDays: listing.topDays ? String(listing.topDays) : '',
      additionalNotes: listing.additionalNotes || '',
      priceList: { ...listing.priceList }
    });
    setPostModalOpen(true);
    setSelectedListing(null);
  };

  const handleViewListing = async (listing: BuyerListing) => {
    setSelectedListing(listing);
    // Increment view count - silent fail if no permissions
    try {
      await updateDoc(doc(db, 'marketplace_listings', listing.id), {
        viewCount: increment(1)
      });
    } catch (e) { 
      // Silently ignore permission errors for view increments
      console.warn("Marketplace: Could not increment view count (permissions)"); 
    }
  };

  const handlePostListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (save.busy) return;
    if (!user || !canManageMarketplace) {
      alert(copy('You must be logged in to post.'));
      return;
    }
    
    setIsSubmitting(true);

    if (!save.acquire()) return;
    try {
      // Sanitize priceList: remove undefined values as Firestore doesn't accept them
      const sanitizedPriceList = Object.fromEntries(
        Object.entries(newListing.priceList).filter(([_, v]) => v !== undefined && v !== null && v !== 0)
      );

      const validationError = validateMarketplaceListing({ ...newListing, priceList: sanitizedPriceList });
      if (validationError) {
        alert(validationError);
        return;
      }

      const topDays = Number(newListing.topDays);
      if (newListing.paymentMethod === 'top' && (!Number.isFinite(topDays) || topDays <= 0)) {
        alert(copy('Please enter valid TOP days.'));
        return;
      }

      const listingData = {
        buyerName: newListing.buyerName,
        city: newListing.city,
        country: newListing.country,
        deliveryLocation: newListing.deliveryLocation,
        contactPhone: newListing.contactPhone,
        contactEmail: newListing.contactEmail,
        expiryDate: new Date(`${newListing.expiryDate}T23:59:59`).toISOString(),
        paymentMethod: newListing.paymentMethod,
        ...(newListing.paymentMethod === 'top' ? { topDays } : {}),
        additionalNotes: newListing.additionalNotes,
        priceList: sanitizedPriceList,
      };

      if (editingId) {
        await updateRecordOnline(db, doc(db, 'marketplace_listings', editingId), removeUndefinedFields({
          ...listingData,
          updatedAt: serverTimestamp()
        }));
      } else {
        // If company is missing (common for new buyers), fallback to user details
        const finalCompanyId = company?.id || user.uid;
        const finalCompanyName = company?.companyName || newListing.buyerName || user.name || 'Verified Buyer';

        await createRecordOnce(db, doc(db, 'marketplace_listings', save.id(`listing:${user.uid}`)), {
          ...listingData,
          companyId: finalCompanyId,
          userId: user.uid,
          createdBy: user.uid,
          companyName: finalCompanyName,
          postedDate: new Date().toISOString(),
          viewCount: 0,
          status: 'active',
          createdAt: serverTimestamp()
        });
      }

      save.complete();
      setPostModalOpen(false);
      setEditingId(null);
      setNewListing(emptyListingForm);
    } catch (error) {
      console.error("Error saving listing:", error);
      alert(copy('Failed to save listing. Make sure all price fields are valid numbers.'));
    } finally {
      save.release();
      setIsSubmitting(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

  return (
    <div className="dashboard-page authenticated-compact-page">
      <div className="dashboard-action-row">
        {canManageMarketplace && <button
          onClick={() => {
            setEditingId(null);
            setNewListing({
              ...emptyListingForm,
              buyerName: company?.companyName || user?.name || '',
              country: getCompanyCountry(company),
              contactPhone: company?.contactPhone || user?.phone || '',
              contactEmail: user?.email || '',
              expiryDate: getDefaultMarketplaceExpiry(),
            });
            if (!save.reset()) return;
            setPostModalOpen(true);
          }}
          className="btn-primary" disabled={savePending}
        >
          <Plus size={20} /> {t.MarketplaceScreen.createListing}
        </button>}
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px', background: 'var(--gradient)', color: '#FFF', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>{t.MarketplaceScreen.activeListings}</div>
              <div style={{ fontSize: '28px', fontWeight: 600 }}>{listings.length}</div>
            </div>
            <Store size={24} style={{ opacity: 0.8 }} />
          </div>
        </div>
        <div className="glass-card" style={{ padding: '24px', background: '#FFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>{copy('Visible Results')}</div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)' }}>{filteredListings.length}</div>
            </div>
            <TrendingUp size={24} color="#059669" />
          </div>
        </div>
        <div className="glass-card" style={{ padding: '24px', background: '#FFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>{copy('My Offers')}</div>
              <div style={{ fontSize: '28px', fontWeight: 600 }}>{myListingsCount}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '4px' }}>{totalViews} {copy('total views in current feed')}</div>
            </div>
            <CheckCircle2 size={24} color="var(--primary)" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '32px' }}>
        
        {/* Main Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Filters & Search */}
          <div className="glass-card" style={{ padding: '18px', background: '#FFFFFF', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input 
                placeholder={copy('Search by company or city...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '14px', border: '1px solid var(--border)', background: '#FFF', fontSize: '14px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', background: 'var(--bg-mid)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setActiveFilter('all')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeFilter === 'all' ? '#FFF' : 'transparent', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: activeFilter === 'all' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', color: activeFilter === 'all' ? 'var(--primary)' : 'var(--text-muted)' }} disabled={savePending}
              >{t.MarketplaceScreen.allListings}</button>
              <button 
                onClick={() => setActiveFilter('my')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeFilter === 'my' ? '#FFF' : 'transparent', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: activeFilter === 'my' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', color: activeFilter === 'my' ? 'var(--primary)' : 'var(--text-muted)' }} disabled={savePending}
              >{t.MarketplaceScreen.myPosts}</button>
            </div>
          </div>

          {/* Listings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredListings.length === 0 ? (
              <div className="glass-card" style={{ background: '#FFFFFF', padding: '48px 36px', textAlign: 'center', gridColumn: '1 / -1' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--bg-mid)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <Store size={32} />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>{copy('No matching listings')}</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>{copy('Try a different city or switch back to all listings to broaden the feed.')}</p>
              </div>
            ) : filteredListings.map((listing) => (
              <div 
                key={listing.id} 
                className="glass-card" 
                onClick={() => handleViewListing(listing)}
                style={{ background: '#FFFFFF', cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ padding: '24px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <Store size={22} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{listing.companyName}</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {listing.city}, {listing.country}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ padding: '4px 10px', borderRadius: '6px', background: listing.paymentMethod === 'cash' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(15, 76, 117, 0.1)', color: listing.paymentMethod === 'cash' ? '#059669' : 'var(--primary)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>
                        {listing.paymentMethod === 'cash' ? (t.MarketplaceScreen.cod || 'COD') : `${t.CreateBuyerListingScreen.termsOfPayment || 'TOP'} ${listing.topDays}${t.CreateBuyerListingScreen.days || 'D'}`}
                      </div>
                      {canManageMarketplace && (listing.companyId === company?.id || listing.userId === user?.uid) && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEditListing(listing); }}
                            style={{ padding: '4px', borderRadius: '6px', background: 'var(--bg-mid)', border: 'none', color: 'var(--primary)', cursor: 'pointer' }} disabled={savePending}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteListing(listing.id); }}
                            style={{ padding: '4px', borderRadius: '6px', background: 'var(--bg-mid)', border: 'none', color: '#EF4444', cursor: 'pointer' }} disabled={savePending}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-mid)', borderRadius: '12px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    {[30, 40, 50].map(size => {
                      const price = listing.priceList[priceListKeyForSize(size)];
                      return (
                        <div key={size} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{t.shrimp.size} {size}</div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{price ? formatCurrency(price) : '--'}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-faint)' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {new Date(listing.postedDate).toLocaleDateString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={12} /> {listing.viewCount}</span>
                    </div>
                    <button style={{ color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} disabled={savePending}>
                      {t.MarketplaceScreen.details || 'Details'} <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Sidebar Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Market Trends */}
          <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#059669" /> {t.buyer.marketInsights}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{t.MarketplaceScreen.globalDemandIndex}</p>
                <div style={{ height: '6px', width: '100%', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '75%', background: '#059669' }} />
                </div>
                <p style={{ fontSize: '12px', color: '#475569', marginTop: '8px', lineHeight: 1.5 }}>{t.MarketplaceScreen.demandHigh}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>{t.MarketplaceScreen.topRegion}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.MarketplaceScreen.topRegionName || 'East Java'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>{t.MarketplaceScreen.avgSize50}</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(6.45)}/{t.common.kg}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div style={{ background: 'var(--bg-mid)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>{t.MarketplaceScreen.howItWorks}</h4>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <li style={{ fontSize: '13px', display: 'flex', gap: '12px', color: '#1e293b', lineHeight: 1.4 }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>1</div>
                <span>{t.MarketplaceScreen.step1}</span>
              </li>
              <li style={{ fontSize: '13px', display: 'flex', gap: '12px', color: '#1e293b', lineHeight: 1.4 }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>2</div>
                <span>{t.MarketplaceScreen.step2}</span>
              </li>
              <li style={{ fontSize: '13px', display: 'flex', gap: '12px', color: '#1e293b', lineHeight: 1.4 }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>3</div>
                <span>{t.MarketplaceScreen.step3}</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* Post Listing Modal */}
      {isPostModalOpen && (
        <div className="responsive-modal-overlay marketplace-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card responsive-modal animate-fade-up marketplace-post-modal" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', background: '#FFF', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            <div className="responsive-modal-header marketplace-modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Plus size={24} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{editingId ? t.CreateBuyerListingScreen.updateListing : t.CreateBuyerListingScreen.publishRequirement}</h2>
              </div>
              <button onClick={() => { setPostModalOpen(false); setEditingId(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} disabled={savePending}><X size={24} /></button>
            </div>

            <form className="responsive-modal-body marketplace-post-form" onSubmit={handlePostListing} style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}><fieldset disabled={savePending} style={{ display: 'contents' }}>
              
              {/* Basic Info */}
              <div className="marketplace-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.CreateBuyerListingScreen.companyName}</label>
                  <input required value={newListing.buyerName} onChange={e => setNewListing({...newListing, buyerName: e.target.value})} placeholder={t.CreateBuyerListingScreen.yourCompanyName} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.CreateBuyerListingScreen.city}</label>
                  <input required value={newListing.city} onChange={e => setNewListing({...newListing, city: e.target.value})} placeholder={t.CreateBuyerListingScreen.cityExample} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{copy('Country')}</label>
                  <input required value={newListing.country} onChange={e => setNewListing({...newListing, country: e.target.value})} placeholder="Australia" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{copy('Expiry date')}</label>
                  <input required type="date" min={listingDateLimits.min} max={listingDateLimits.max} value={newListing.expiryDate} onChange={e => setNewListing({...newListing, expiryDate: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.CreateBuyerListingScreen.deliveryAddress}</label>
                  <input required value={newListing.deliveryLocation} onChange={e => setNewListing({...newListing, deliveryLocation: e.target.value})} placeholder={t.CreateBuyerListingScreen.deliveryPlaceholder} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{copy('Contact phone')}</label>
                  <input required type="tel" value={newListing.contactPhone} onChange={e => setNewListing({...newListing, contactPhone: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{copy('Contact email')}</label>
                  <input required type="email" value={newListing.contactEmail} onChange={e => setNewListing({...newListing, contactEmail: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
                </div>
              </div>

              {/* Payment Terms */}
              <div className="marketplace-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.CreateBuyerListingScreen.paymentMethod}</label>
                  <select value={newListing.paymentMethod} onChange={e => setNewListing({...newListing, paymentMethod: e.target.value as 'cash' | 'top'})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }}>
                    <option value="cash">{t.CreateBuyerListingScreen.cashOnDelivery}</option>
                    <option value="top">{t.CreateBuyerListingScreen.termsOfPayment}</option>
                  </select>
                </div>
                {newListing.paymentMethod === 'top' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.CreateBuyerListingScreen.topDays}</label>
                    <input type="number" value={newListing.topDays} onChange={e => setNewListing({...newListing, topDays: e.target.value})} placeholder="e.g. 7" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none' }} />
                  </div>
                )}
              </div>

              {/* Price List Matrix */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={18} color="var(--primary)" /> {t.CreateBuyerListingScreen.buyingPriceList}
                </h3>
                <div className="marketplace-price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[30, 40, 50, 60, 70, 80, 90, 100].map(size => (
                    <div key={size} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)' }}>{copy('Size')} {size}</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={newListing.priceList[priceListKeyForSize(size)] ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNewListing({
                            ...newListing, 
                            priceList: { ...newListing.priceList, [priceListKeyForSize(size)]: val === '' ? undefined : parseFloat(val) }
                          });
                        }} 
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', fontSize: '13px' }} 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.CreateBuyerListingScreen.additionalNotes}</label>
                <textarea value={newListing.additionalNotes} onChange={e => setNewListing({...newListing, additionalNotes: e.target.value})} placeholder={t.CreateBuyerListingScreen.notesPlaceholder} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', minHeight: '80px', resize: 'none' }} />
              </div>

              <div className="responsive-modal-footer marketplace-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <button type="button" onClick={() => setPostModalOpen(false)} className="btn-secondary" style={{ padding: '12px 24px', borderRadius: '12px' }} disabled={savePending}>{t.actions.cancel}</button>
                <button type="submit" disabled={savePending || (isSubmitting)} className="btn-primary" style={{ padding: '12px 32px', borderRadius: '12px' }}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (editingId ? t.CreateBuyerListingScreen.updateListing : t.CreateBuyerListingScreen.publishRequirement)}
                </button>
              </div>
            </fieldset></form>
          </div>
        </div>
      )}

      {/* Listing Detail Drawer/Modal */}
      {selectedListing && (
        <div className="responsive-side-drawer-overlay marketplace-detail-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="responsive-side-drawer marketplace-detail-drawer animate-fade-up" style={{ width: '560px', height: '100%', background: '#FFF', boxShadow: '-20px 0 50px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Drawer Header */}
            <div className="responsive-modal-header marketplace-detail-header" style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Store size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 600 }}>{selectedListing.companyName}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{copy('Buyer Requirement • ID:')} {selectedListing.id.slice(-6)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedListing(null)} style={{ background: 'var(--bg-mid)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }} disabled={savePending}>
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="responsive-modal-body marketplace-detail-body" style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Specs Grid */}
              <div className="marketplace-detail-specs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-mid)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <MapPin size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{copy('Delivery To')}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedListing.city}, {selectedListing.country}</div>
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-mid)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <CreditCard size={20} color="#059669" />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{copy('Payment')}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedListing.paymentMethod === 'cash' ? copy('Cash on Delivery') : `${selectedListing.topDays} ${copy('Days TOP')}`}</div>
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', gap: '12px', alignItems: 'center', gridColumn: 'span 2' }}>
                  <Clock size={20} color="#EF4444" />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{copy('Expiry Date')}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{new Date(selectedListing.expiryDate).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Price Table */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={18} color="var(--primary)" /> {t.CreateBuyerListingScreen.buyingPriceList}
                </h4>
                <div className="glass-card" style={{ padding: '12px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '8px' }}>{copy('Size')}</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>{copy('Price')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[20, 30, 40, 50, 60, 70, 80, 90, 100].map(size => {
                        const price = selectedListing.priceList[priceListKeyForSize(size)];
                        if (!price) return null;
                        return (
                          <tr key={size} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 600 }}>{copy('Size')} {size}</td>
                            <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 600, textAlign: 'right', color: 'var(--primary)' }}>{formatCurrency(price)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Notes */}
              {selectedListing.additionalNotes && (
                <div style={{ padding: '20px', borderRadius: '16px', background: '#fff9f2', border: '1px solid #fee2e2' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#d97706' }}>{copy('Special Instructions')}</h4>
                  <p style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.6 }}>{selectedListing.additionalNotes}</p>
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div className="responsive-modal-footer marketplace-detail-footer" style={{ padding: '32px', borderTop: '1px solid var(--border)', background: '#F8FAFC', display: 'flex', gap: '16px' }}>
              {(selectedListing.companyId === company?.id || selectedListing.userId === user?.uid) ? (
                <>
                  <button 
                    onClick={() => handleDeleteListing(selectedListing.id)}
                    className="btn-secondary" 
                    style={{ flex: 1, height: '48px', color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={savePending}
                  >
                    <Trash2 size={18} /> {copy('Delete')}
                  </button>
                  <button 
                    onClick={() => handleEditListing(selectedListing)}
                    className="btn-primary" 
                    style={{ flex: 1, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={savePending}
                  >
                    <Edit size={18} /> {copy('Edit Post')}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-secondary" style={{ flex: 1, height: '48px' }} disabled={savePending}>{copy('Save Listing')}</button>
                  <button className="btn-primary" style={{ flex: 2, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} disabled={savePending}>
                    <MessageSquare size={18} /> {copy('Send Offer')}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={deleteConfirm.isOpen}
        title={t.MarketplaceScreen.deleteListing || 'Delete Listing?'}
        message={t.MarketplaceScreen.deleteListingConfirm || 'Are you sure you want to delete this listing?'}
        confirmText={t.actions.delete || 'Delete Post'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        isLoading={isSubmitting}
      />

    </div>
  );
}
