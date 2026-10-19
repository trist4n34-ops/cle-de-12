"""
Construit src/data/vehicles-open-data.json à partir des registres ouverts
regroupés dans le paquet npm @meterapp/vehicle-db (licence ISC) :
- registre européen des immatriculations neuves (EEA CO2 monitoring, CC BY 4.0) ;
- registre néerlandais RDW (domaine public) ;
- parc britannique DfT (Open Government Licence v3.0).

Usage : node scripts/dump-vehicle-db.js > raw.json && python3 scripts/build-vehicle-catalog.py raw.json
"""
import json
import re
import sys
import unicodedata

RAW = json.load(open(sys.argv[1]))
OUT = sys.argv[2] if len(sys.argv) > 2 else 'src/data/vehicles-open-data.json'

# Carrossiers de camping-cars, poids lourds, quads et marques hors marché français.
BLOCKED_MAKES = {
    'HYMER', 'DETHLEFFS', 'BUERSTNER', 'BURSTNER', 'ADRIA', 'CAPRON', 'CARTHAGO', 'CHAUSSON', 'KNAUS', 'KNAUS TABBERT',
    'CONCORDE', 'ITINEO', 'BINZ', 'FORSTER', 'LA STRADA', 'HOME', 'JOINT', 'MAN', 'ISUZU TRUCKS', 'RENAULT TRUCKS',
    'POLARIS', 'VM', 'IAV', 'AUTO SLEEPERS', 'ELDDIS', 'BAILEY', 'ALLIED', 'VAUXHALL', 'LONDON TAXIS INT', 'LEVC',
    'COLEMAN MILNE', 'HUMBER', 'MORRIS', 'MERCURY', 'ACURA', 'CORVETTE', 'MGXPOWER', 'RAPIDO', 'PILOTE', 'BAVARIA',
    'FRANKIA', 'LAIKA', 'MCLOUIS', 'MOBILVETTA', 'ROLLER TEAM', 'SUNLIGHT', 'WESTFALIA', 'WEINSBERG', 'EURA MOBIL',
    'NIESMANN', 'MALIBU', 'PÖSSL', 'POSSL', 'CHALLENGER', 'BENIMAR', 'AUTOSTAR', 'GIOTTILINE', 'FLEURETTE', 'ETRUSCO',
    'CI', 'ELNAGH', 'RIMOR', 'SEA', 'MOBILHOME', 'TRIGANO', 'HOBBY', 'FIFTH WHEEL', 'VOLKNER', 'MORELO', 'LMC', 'TABBERT',
    'EURAMOBIL', 'GLOBECAR', 'CARADO', 'SUNLIVING', 'ARCA', 'MCLOUIS', 'BLUCAMP', 'NOTIN', 'FONT VENDOME', 'DREAMER',
    'CAMPEREVE', 'ITINEO', 'MAGNUM', 'ADRIA MOBIL', 'ALKO', 'KARMANN MOBIL', 'LAIKA CARAVANS', 'NIESMANN+BISCHOFF',
    'NIESMANN-BISCHOFF', 'POESSL', 'SUN LIVING', 'IVECO', 'LDV', 'PERODUA', 'DAIMLERCHRYSLER', 'GMC', 'LINCOLN', 'BUICK',
    'PONTIAC', 'DALLARA',
}
# Transformateurs de camping-cars et appellations parasites des registres.
JUNK_MODELS = {'ALLIED', 'AUTO SLEEPERS', 'ELDDIS', 'INDEPENDENCE', 'EUROBUS', 'PREMIER', 'NUEVO', 'NEW', 'BAILEY',
               'SWIFT MOTORHOME', 'AUTOTRAIL', 'AUTO-TRAIL', 'RAPIDO', 'PILOTE', 'BURSTNER', 'HYMER', 'LAND', 'LANDCR', 'LEXUS',
               'DAIHATSU CHARADE', 'MODEL F'}
# Marques dont le catalogue intégré couvre déjà les gammes : les registres y listent une ligne par moteur.
ENGINE_CODED = {'BMW': re.compile(r'^\d|^[XZMI]\d{1,2} ?\d|REIHE|SERIE'), 'MERCEDES-BENZ': re.compile(r'^\d|^[A-Z]{1,3} ?\d{2,3}\b|KLASSE|CLASS|^AMG |^MERCEDES|^MCLAREN|^COLEMAN'),
                'LEXUS': re.compile(r'^[A-Z]{2,3} ?\d{3}'), 'VOLKSWAGEN': re.compile(r'^\d[A-Z0-9]{0,6}$|^70X|^[A-Z]{0,2}\d[A-Z]\d')}
DROP_PATTERNS = re.compile(
    r'\*|KAMPEER|CAMPER|WOHNMOBIL|MOTORHOME|\bU9\b|\bE2\b|AUTOMAAT|\bL\d ?/?H\d\b|\b\d[.,]\dT\b|\b\d[.,]\d ?[A-Z]*\b|'
    r'\bT\d{2,3}\b|\bVAN\b|\bCHASSIS\b|\bPICK-?UP\b|\bFOURGON\b|\bKOMBI\b|\bCARGO\b|\b\d{3,4}[A-Z]{2}\b|^\d{1,2}$|^0'
)
TRIMS = set('''ALLURE ACTIVE ACTIVA GT LINE SPORT SPORTS URBAN MILLESIM ENVY VERVE S SE SXI XS XR XT XN XND XSI XRD GL GLD GLX GR
GRD GRI GTI GTD RN RT RL RXE RXT RTE RS PREMIUM EXCLUSIVE COLLECTION PACK S-A DT TD D TDI TSI TFSI HDI THP TURBO 16V 8V ACCENT
RALLYE SRI SLI SV LIFE ZEN INTENS EXPRESSION DYNAMIQUE PRIVILEGE AUTHENTIQUE BUSINESS TREND COMFORT COMFORTLINE TRENDLINE
HIGHLINE SPORTLINE STYLE LX EX ELEGANCE AMBIENTE TITANIUM ZETEC GHIA ESSENTIA ESSENTIAL FEEL SHINE LIVE PLAY ICONIC TECHNO
EVOLUTION EDITION LIMITED PLUS+ LUXURY SPORTIVE ROADLINE CONFORT EXECUTIVE AVANTGARDE CLASSIC CDI CDTI DCI CRDI TDCI VTI MPI
GPL LPG AUTOMATIC AUTO AUTOMATIQUE MANUAL 4X4 4WD AWD QUATTRO XDRIVE 4MOTION 2WD FWD ECO ECOMOTIVE BLUEMOTION BLUEHDI PURETECH
TCE SCE ECOBOOST HYBRID-4 SPORTBACK? NUEVO NEW N'''.split())
KEEP_SUFFIX = set('CC SW BREAK CABRIOLET CABRIO COUPE COUPÉ PICASSO SCENIC AIRCROSS CACTUS CROSSBACK CROSS SPORTSVAN SPORTSWAGEN '
                  'VARIANT TOURER ESTATE GRAND XL X E-TECH ELECTRIC ELECTRIQUE HYBRID E PLUG-IN ROADSTER SPIDER SPYDER '
                  'CROSSLAND GRANDLAND COUNTRYMAN CLUBMAN PACEMAN GRANCOUPE GRAN AVANT'.split())

def longest_run(years):
    """Plus longue suite d'années (un trou d'un an toléré) : écarte les immatriculations tardives d'occasions importées."""
    best, cur = None, None
    for y in sorted(years):
        cur = [cur[0], y] if cur and y - cur[1] <= 2 else [y, y]
        if not best or cur[1] - cur[0] > best[1] - best[0]:
            best = list(cur)
    return best


def span(by_source):
    """Années de commercialisation : registres européens d'abord, parc britannique à défaut."""
    runs = [longest_run(by_source[t]) for t in ('e', 'r') if t in by_source] or [longest_run(by_source['u'])]
    return min(r[0] for r in runs), max(r[1] for r in runs), ''.join(sorted(by_source))


def fold(s):
    return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().upper().strip()

def strip_trims(name):
    toks = name.split()
    while len(toks) > 1 and toks[-1] in TRIMS:
        toks.pop()
    return ' '.join(toks)

def pretty(word):
    if any(c.isdigit() for c in word) or (len(word) <= 3 and word.isalpha() and word not in {'ONE', 'FOX', 'UP!', 'KA', 'ION', 'AMI'}):
        return word
    return '-'.join(p[:1] + p[1:].lower() for p in word.split('-'))

out = []
for make, models in RAW:
    if fold(make) in BLOCKED_MAKES:
        continue
    merged = {}
    for name, by_source in models:
        frm, to, src = span(by_source)
        if not (len(src) >= 2 or to - frm >= 2):
            continue
        n = re.sub(r'\s+', ' ', name.replace('.', ' ').replace('_', ' ')).strip().upper()
        if DROP_PATTERNS.search(n) or len(n) > 30 or n in JUNK_MODELS or not re.fullmatch(r"[A-Z0-9 +&!'/-]+", n):
            continue
        if len(n) == 1 or '/' in n or n in BLOCKED_MAKES or any(n.startswith(b + ' ') for b in ('LEXUS', 'LINCOLN', 'DAIHATSU')):
            continue
        coded = ENGINE_CODED.get(fold(make))
        if coded and coded.search(n):
            continue
        n = strip_trims(n)
        r = merged.setdefault(n, [frm, to, set()])
        r[0], r[1] = min(r[0], frm), max(r[1], to)
        r[2] |= set(src)
    # Fusionne les variantes « BASE + finition » dans la base.
    names = sorted(merged, key=len)
    for n in names:
        for base in names:
            if base != n and n.startswith(base + ' ') and n in merged and base in merged:
                rest = n[len(base) + 1:].split()
                if not any(t in KEEP_SUFFIX for t in rest):
                    merged[base][0] = min(merged[base][0], merged[n][0])
                    merged[base][1] = max(merged[base][1], merged[n][1])
                    merged[base][2] |= merged[n][2]
                    del merged[n]
                    break
    kept = {}
    for n, r in sorted(merged.items(), key=lambda kv: -(kv[1][1] - kv[1][0])):
        if not (len(r[2]) >= 2 or r[1] - r[0] >= 3):
            continue
        key = re.sub(r'[ -]', '', n)
        if key in {re.sub(r'[ -]', '', k) for k in kept}:
            continue
        kept[n] = r
    has_eu = any('e' in r[2] or 'r' in r[2] for r in kept.values())
    if not kept or not has_eu or (len(kept) < 2 and not any('e' in r[2] for r in kept.values())):
        continue
    out.append([' '.join(pretty(w) for w in make.split()),
                sorted([[' '.join(pretty(w) for w in n.split()), r[0], r[1]] for n, r in kept.items()], key=lambda x: x[0])])

out.sort(key=lambda x: x[0])
json.dump({'sources': ['EEA CO2 monitoring (CC BY 4.0)', 'RDW Open Data (domaine public)', 'UK DfT vehicle licensing (OGL v3.0)'],
           'makes': out}, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'marques', sum(len(m[1]) for m in out), 'modèles')
