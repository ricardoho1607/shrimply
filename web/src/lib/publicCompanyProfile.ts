import { doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type CompanyProfileSource = {
  id?: string;
  ownerId?: string;
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
  teamMembers?: string[];
  publicMemberCount?: number;
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

const asOptionalFiniteNumber = (...values: unknown[]): number | undefined => {
  const value = values.find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');
  return value === undefined ? undefined : asFiniteNumber(value);
};

const getPublicMemberCount = (source: CompanyProfileSource): number | undefined => {
  if (Array.isArray(source.teamMembers)) {
    return new Set([
      ...source.teamMembers,
      source.ownerId,
    ].filter((memberId): memberId is string => typeof memberId === 'string' && Boolean(memberId.trim()))).size;
  }
  if (source.publicMemberCount === undefined) return undefined;
  return Math.floor(asFiniteNumber(source.publicMemberCount));
};

const getLocationText = (source: CompanyProfileSource) => {
  const primaryLocation = source.primaryLocation;
  if (typeof primaryLocation === 'string') return primaryLocation.trim();
  return asString(primaryLocation?.address) || asString(source.location);
};

export const buildPublicCompanyProfile = (companyId: string, source: CompanyProfileSource) => {
  const primaryLocation = source.primaryLocation;
  const locationCountry = typeof primaryLocation === 'object' ? asString(primaryLocation?.country) : '';
  const publicMemberCount = getPublicMemberCount(source);
  const publicPondCount = asOptionalFiniteNumber(source.publicPondCount, source.pondCount);
  const publicAverageDOC = asOptionalFiniteNumber(source.publicAverageDOC, source.averageDOC, source.avgDOC);
  const publicAverageSize = asOptionalFiniteNumber(source.publicAverageSize, source.averageSize, source.avgSize);
  const publicAverageBiomass = asOptionalFiniteNumber(
    source.publicAverageBiomass,
    source.averageBiomass,
    source.totalBiomass,
  );

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
    ...(publicMemberCount !== undefined ? { publicMemberCount } : {}),
    ...(publicPondCount !== undefined ? { publicPondCount } : {}),
    ...(publicAverageDOC !== undefined ? { publicAverageDOC } : {}),
    ...(publicAverageSize !== undefined ? { publicAverageSize } : {}),
    ...(publicAverageBiomass !== undefined ? { publicAverageBiomass } : {}),
    updatedAt: serverTimestamp(),
  };
};

export const syncPublicCompanyProfile = async (companyId: string, source: CompanyProfileSource) => {
  const profileRef = doc(db, 'publicCompanyProfiles', companyId);
  const shouldPublish = source.isPublicProfile === true || source.isSearchable === true;

  if (!shouldPublish) {
    await runTransaction(db, async tx => {
      await tx.get(doc(db, 'companies', companyId));
      tx.delete(profileRef);
    });
    return;
  }

  await runTransaction(db, async tx => {
    await tx.get(doc(db, 'companies', companyId));
    tx.set(profileRef, buildPublicCompanyProfile(companyId, source), { merge: true });
  });
};

export const syncPublicCompanyMemberCount = async (
  companyId: string,
  source: Pick<CompanyProfileSource, 'ownerId' | 'teamMembers' | 'publicMemberCount'>,
) => {
  const publicMemberCount = getPublicMemberCount(source);
  if (publicMemberCount === undefined) return;

  await updateDoc(doc(db, 'publicCompanyProfiles', companyId), {
    publicMemberCount,
    updatedAt: serverTimestamp(),
  });
};
