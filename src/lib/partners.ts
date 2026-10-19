/**
 * Liens vers les vendeurs de pièces et les garages partenaires. Aujourd'hui ce
 * sont des recherches pré-remplies ; les identifiants d'affiliation et, plus
 * tard, le catalogue de références compatibles (TecAlliance) se branchent ici.
 */
import { Vehicle } from '@/lib/diagnosis';

export type PartnerLink = { label: string; url: string };

const tag = (url: string, param: string | undefined) =>
  param ? `${url}${url.includes('?') ? '&' : '?'}${param}` : url;

export function partLinks(part: string, v: Partial<Vehicle>): PartnerLink[] {
  const q = encodeURIComponent([part, v.make, v.model, v.engine].filter(Boolean).join(' '));
  return [
    { label: 'Oscaro', url: tag(`https://www.oscaro.com/fr/search?q=${q}`, process.env.EXPO_PUBLIC_AFFILIATE_OSCARO) },
    { label: 'Mister-Auto', url: tag(`https://www.mister-auto.com/nwsearch/?q=${q}`, process.env.EXPO_PUBLIC_AFFILIATE_MISTERAUTO) },
    { label: 'Autodoc', url: tag(`https://www.auto-doc.fr/search?keyword=${q}`, process.env.EXPO_PUBLIC_AFFILIATE_AUTODOC) },
  ];
}

export function garageLinks(): PartnerLink[] {
  return [
    { label: 'Vroomly', url: tag('https://www.vroomly.com/', process.env.EXPO_PUBLIC_AFFILIATE_VROOMLY) },
    { label: 'iDGARAGE', url: tag('https://www.idgarages.com/', process.env.EXPO_PUBLIC_AFFILIATE_IDGARAGE) },
  ];
}
