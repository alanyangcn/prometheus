// IP information and score semantics derived from cmliu/edgetunnel admin (GPL-2.0).
export interface IPDetails {
  ip: string; location: { country?: string; country_code?: string; state?: string; city?: string; latitude?: number; longitude?: number; timezone?: string };
  company: { name?: string; type?: string; abuser_score?: string | number };
  asn: { asn?: number; org?: string; type?: string; abuser_score?: string | number };
  [key: string]: unknown;
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function normalizeIP(data: Record<string, unknown>): IPDetails {
  const location = Object.keys(object(data.location)).length ? object(data.location) : { country: data.country, country_code: data.cc, state: data.state, city: data.city, latitude: data.lat, longitude: data.lon, timezone: data.timezone };
  const company = Object.keys(object(data.company)).length ? object(data.company) : { name: data.company_name, type: data.company_type, abuser_score: data.company_abuser_score };
  const asn = Object.keys(object(data.asn)).length ? object(data.asn) : { asn: data.asn_num, org: data.asn_org, type: data.asn_type, abuser_score: data.asn_abuser_score };
  return { ...data, ip: String(data.ip || ''), location, company, asn } as IPDetails;
}
export function abuseScore(data: IPDetails): number | null {
  const base = ((parseFloat(String(data.company.abuser_score)) || 0) + (parseFloat(String(data.asn.abuser_score)) || 0)) / 2 * 5;
  const risk = ['is_crawler','is_proxy','is_vpn','is_tor','is_abuser'].filter(flag => data[flag] === true).length * .15;
  const score = base + risk + (data.is_bogon === true ? 1 : 0);
  return score === 0 ? null : score;
}
export function maskIP(ip: string): string { return ip.includes(':') ? ip.split(':').slice(0, 2).join(':') + ':****:****' : ip.replace(/\.\d+$/, '.*'); }

export function locationMap(info: IPDetails): string | null {
  const latitude = info.location.latitude, longitude = info.location.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=10/${latitude}/${longitude}`;
}
