export type CompanyCurrency = 'USD' | 'AUD' | 'IDR' | 'THB' | 'CNY' | 'VND';

const SUPPORTED_CURRENCIES = new Set<CompanyCurrency>(['USD', 'AUD', 'IDR', 'THB', 'CNY', 'VND']);

export const resolveCompanyCurrency = (
  company: { currency?: unknown; currencyCode?: unknown } | null | undefined,
  fallback: CompanyCurrency = 'IDR',
): CompanyCurrency => {
  const configuredCurrency = company?.currency ?? company?.currencyCode;
  return typeof configuredCurrency === 'string'
    && SUPPORTED_CURRENCIES.has(configuredCurrency as CompanyCurrency)
    ? configuredCurrency as CompanyCurrency
    : fallback;
};
