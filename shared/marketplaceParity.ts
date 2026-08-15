interface CompanyLocationSource {
  country?: string;
  primaryLocation?: string | { country?: string };
}

interface MarketplaceListingInput {
  buyerName: string;
  city: string;
  country: string;
  deliveryLocation: string;
  contactPhone: string;
  contactEmail: string;
  expiryDate: string;
  priceList: Record<string, number | undefined>;
}

export const getCompanyCountry = (company?: CompanyLocationSource | null) => {
  if (!company) return '';
  if (typeof company.primaryLocation === 'object') return company.primaryLocation.country?.trim() || company.country?.trim() || '';
  return company.country?.trim() || '';
};

export const getDefaultMarketplaceExpiry = (now = new Date()) => {
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + 30);
  return expiry.toISOString().slice(0, 10);
};

export const validateMarketplaceListing = (listing: MarketplaceListingInput, now = new Date()): string | null => {
  if (!listing.buyerName.trim() || !listing.city.trim() || !listing.country.trim() || !listing.deliveryLocation.trim()) {
    return 'Complete the buyer and delivery location details.';
  }
  if (!listing.contactPhone.trim()) return 'Enter a contact phone number.';
  if (!/^\S+@\S+\.\S+$/.test(listing.contactEmail.trim())) return 'Enter a valid contact email.';
  if (!Object.values(listing.priceList).some((price) => Number(price) > 0)) return 'Enter at least one buying price.';

  const expiry = new Date(`${listing.expiryDate}T00:00:00Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const maxExpiry = new Date(today);
  maxExpiry.setUTCDate(maxExpiry.getUTCDate() + 30);
  if (!Number.isFinite(expiry.getTime()) || expiry <= today) return 'Expiry date must be in the future.';
  if (expiry > maxExpiry) return 'Expiry date cannot be more than 30 days away.';
  return null;
};
