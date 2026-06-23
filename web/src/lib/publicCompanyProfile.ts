import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type CompanyProfileSource = {
  id?: string;
  companyName?: string;
  primaryLocation?: string | { address?: string; city?: string; state?: string; country?: string };
  location?: string;
  country?: string;
  farmType?: string;
  businessType?: string;
  businessSize?: string;
  description?: string;
  contactPhone?: string;
  isPublicProfile?: boolean;
  isSearchable?: boolean;
  publicPondCount?: number;
  pondCount?: number;
  publicAverageDOC?: number;
  averageDOC?: number;
  avgDOC?: number;
  publicAverageSize?: number;
  averageSize?: number;
  avgSize?: number;
  publicAverageBiomass?: number;
  averageBiomass?: number;
  totalBiomass?: number;
};

const asString = (value: unknown) => typeof value === 'string' ? value.trim() : '';

const asFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const getLocationText = (source: CompanyProfileSource) => {
  const primaryLocation = source.primaryLocation;
  if (typeof primaryLocation === 'string') return primaryLocation.trim();
  return asString(primaryLocation?.address) || asString(source.location);
};

export const buildPublicCompanyProfile = (companyId: string, source: CompanyProfileSource) => {
  const primaryLocation = source.primaryLocation;
  const locationCountry = typeof primaryLocation === 'object' ? asString(primaryLocation?.country) : '';

  return {
    companyId,
    companyName: asString(source.companyName),
    location: getLocationText(source),
    country: locationCountry || asString(source.country),
    farmType: asString(source.farmType || source.businessType),
    businessSize: asString(source.businessSize),
    description: asString(source.description),
    contactPhone: asString(source.contactPhone),
    isPublicProfile: source.isPublicProfile === true || source.isSearchable === true,
    publicPondCount: asFiniteNumber(source.publicPondCount ?? source.pondCount),
    publicAverageDOC: asFiniteNumber(source.publicAverageDOC ?? source.averageDOC ?? source.avgDOC),
    publicAverageSize: asFiniteNumber(source.publicAverageSize ?? source.averageSize ?? source.avgSize),
    publicAverageBiomass: asFiniteNumber(source.publicAverageBiomass ?? source.averageBiomass ?? source.totalBiomass),
    updatedAt: serverTimestamp(),
  };
};

export const syncPublicCompanyProfile = async (companyId: string, source: CompanyProfileSource) => {
  const profileRef = doc(db, 'publicCompanyProfiles', companyId);
  const shouldPublish = source.isPublicProfile === true || source.isSearchable === true;

  if (!shouldPublish) {
    await deleteDoc(profileRef).catch(() => undefined);
    return;
  }

  await setDoc(profileRef, buildPublicCompanyProfile(companyId, source), { merge: true });
};
