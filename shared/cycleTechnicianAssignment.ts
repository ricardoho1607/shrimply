import { getEnterpriseTechnicianLabel, type EnterpriseTechnician } from './enterpriseBlocks';

export type CompanyTechnician = EnterpriseTechnician;

export const formatTechnicianLabel = getEnterpriseTechnicianLabel;

interface TechnicianUser {
  id: string;
  companyId?: unknown;
  role?: unknown;
  name?: unknown;
  email?: unknown;
}

export const getCompanyTechnicians = (users: TechnicianUser[], companyId: string): CompanyTechnician[] => users
  .filter((member) => member.companyId === companyId && member.role === 'technician')
  .map((member) => ({
    id: member.id,
    uid: member.id,
    name: typeof member.name === 'string' ? member.name.trim() : '',
    email: typeof member.email === 'string' ? member.email.trim() : '',
  }))
  .sort((a, b) => formatTechnicianLabel(a.name, a.email, '').localeCompare(formatTechnicianLabel(b.name, b.email, '')));

export const resolveCycleTechnicianId = (selectedId: string | null | undefined, technicians: CompanyTechnician[]): string | null => {
  const id = selectedId?.trim();
  return id && technicians.some((technician) => technician.uid === id) ? id : null;
};
