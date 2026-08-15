import assert from 'node:assert/strict';
import test from 'node:test';
import { getCompanyCountry, validateMarketplaceListing } from './marketplaceParity.ts';

test('marketplace country comes from the company instead of a hardcoded country', () => {
  assert.equal(getCompanyCountry({ primaryLocation: { country: 'Australia' } }), 'Australia');
  assert.equal(getCompanyCountry({ country: 'Vietnam' }), 'Vietnam');
});

test('marketplace expiry is limited to the same 30-day window as mobile', () => {
  const base = {
    buyerName: 'Buyer', city: 'Melbourne', country: 'Australia', deliveryLocation: 'Port',
    contactPhone: '+61 400 000 000', contactEmail: 'buyer@example.com', priceList: { size40: 12 },
  };
  assert.equal(validateMarketplaceListing({ ...base, expiryDate: '2026-09-14' }, new Date('2026-08-15T00:00:00Z')), null);
  assert.match(validateMarketplaceListing({ ...base, expiryDate: '2026-09-15' }, new Date('2026-08-15T00:00:00Z')) || '', /30 days/);
});
