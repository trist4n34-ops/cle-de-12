/**
 * Catalogue des marques et modèles, accessible gratuitement. Deux couches :
 * - une sélection éditée à la main pour le parc français, avec les générations
 *   et les motorisations des modèles les plus réparés ;
 * - les registres ouverts européens (immatriculations neuves de l'UE, registre
 *   néerlandais RDW, parc britannique), regroupés par scripts/build-vehicle-catalog.py
 *   dans vehicles-open-data.json, qui complètent les marques et modèles manquants.
 * La saisie libre reste possible.
 */
import type { Fuel } from '@/lib/diagnosis';

import openData from './vehicles-open-data.json';

export type EngineOption = { label: string; fuel: Fuel };
export type CarModel = { name: string; from: number; to?: number; engines?: EngineOption[] };
export type CarMake = { name: string; models: CarModel[] };

const e = (label: string, fuel: Fuel): EngineOption => ({ label, fuel });
const m = (name: string, from: number, to?: number, engines?: EngineOption[]): CarModel => ({ name, from, to, engines });

// Motorisations partagées entre plusieurs modèles d'un même groupe.
const PSA_RECENT = [
  e('1.2 PureTech 75/82 ch', 'Essence'), e('1.2 PureTech 100/110 ch', 'Essence'), e('1.2 PureTech 130 ch', 'Essence'),
  e('1.5 BlueHDi 100/130 ch', 'Diesel'), e('1.6 BlueHDi 75/100/120 ch', 'Diesel'), e('1.2 Hybrid 136 ch', 'Hybride'), e('Électrique 136/156 ch', 'Électrique'),
];
const PSA_2000S = [
  e('1.1 60 ch', 'Essence'), e('1.4 75 ch', 'Essence'), e('1.4 VTi 95 ch', 'Essence'), e('1.6 16v 110 ch', 'Essence'), e('1.6 THP 150/156 ch', 'Essence'),
  e('1.4 HDi 68/70 ch', 'Diesel'), e('1.6 HDi 90/92 ch', 'Diesel'), e('1.6 HDi 110/112 ch', 'Diesel'), e('2.0 HDi 90 ch', 'Diesel'),
];
const RENAULT_RECENT = [
  e('1.0 SCe 65/75 ch', 'Essence'), e('1.0 TCe 90/100 ch', 'Essence'), e('0.9 TCe 90 ch', 'Essence'), e('1.2 TCe 120 ch', 'Essence'), e('1.3 TCe 130/140/160 ch', 'Essence'),
  e('1.5 dCi / Blue dCi 75 à 115 ch', 'Diesel'), e('E-Tech Hybride 140/145 ch', 'Hybride'), e('E-Tech Électrique', 'Électrique'),
];
const RENAULT_2000S = [
  e('1.2 16v 75 ch', 'Essence'), e('1.4 16v 98 ch', 'Essence'), e('1.6 16v 110/112 ch', 'Essence'), e('2.0 16v 135/140 ch', 'Essence'),
  e('1.5 dCi 65 à 110 ch', 'Diesel'), e('1.9 dCi 120/130 ch', 'Diesel'), e('2.0 dCi 150/160 ch', 'Diesel'),
];
const VAG = [
  e('1.0 TSI 95/110/115 ch', 'Essence'), e('1.2 TSI 90/105 ch', 'Essence'), e('1.4 TSI 122 à 150 ch', 'Essence'), e('1.5 TSI 130/150 ch', 'Essence'), e('2.0 TSI 190 à 320 ch', 'Essence'),
  e('1.6 TDI 90 à 115 ch', 'Diesel'), e('1.9 TDI 90 à 130 ch', 'Diesel'), e('2.0 TDI 110 à 200 ch', 'Diesel'), e('1.4 TSI eHybrid', 'Hybride'),
];
const TOYOTA_HYBRID = [e('1.0 VVT-i 69/72 ch', 'Essence'), e('1.33 Dual VVT-i 99 ch', 'Essence'), e('1.5 Hybrid 100/116 ch', 'Hybride'), e('1.8 Hybrid 122/140 ch', 'Hybride'), e('2.0 Hybrid 184/196 ch', 'Hybride'), e('1.4 D-4D 90 ch', 'Diesel')];

const CURATED: CarMake[] = [
  { name: 'Peugeot', models: [
    m('106', 1991, 2003, [e('1.0 50 ch', 'Essence'), e('1.1 60 ch', 'Essence'), e('1.4 75 ch', 'Essence'), e('1.5 D 57 ch', 'Diesel')]),
    m('107', 2005, 2014, [e('1.0 68 ch', 'Essence'), e('1.4 HDi 54 ch', 'Diesel')]),
    m('108', 2014, 2021, [e('1.0 VTi 68/72 ch', 'Essence'), e('1.2 PureTech 82 ch', 'Essence')]),
    m('206', 1998, 2012, [...PSA_2000S, e('1.9 D 70 ch', 'Diesel')]),
    m('206+', 2009, 2013, PSA_2000S),
    m('207', 2006, 2014, PSA_2000S),
    m('208', 2012, undefined, [...PSA_RECENT, e('1.0 VTi 68 ch', 'Essence'), e('1.4 HDi 68 ch', 'Diesel')]),
    m('306', 1993, 2002), m('307', 2001, 2008, PSA_2000S), m('308', 2007, undefined, [...PSA_2000S, ...PSA_RECENT]),
    m('406', 1995, 2004), m('407', 2004, 2011), m('408', 2022), m('508', 2011, undefined, PSA_RECENT),
    m('607', 2000, 2010), m('806', 1994, 2002), m('807', 2002, 2014),
    m('1007', 2005, 2009), m('2008', 2013, undefined, PSA_RECENT), m('3008', 2009, undefined, PSA_RECENT), m('4007', 2007, 2012),
    m('5008', 2009, undefined, PSA_RECENT), m('Partner', 1996, undefined, [...PSA_2000S, ...PSA_RECENT]), m('Bipper', 2008, 2018),
    m('Expert', 1996), m('Boxer', 1994), m('Rifter', 2018, undefined, PSA_RECENT), m('Traveller', 2016), m('RCZ', 2010, 2015), m('iOn', 2011, 2020),
  ] },
  { name: 'Renault', models: [
    m('Twingo', 1993, undefined, [e('1.2 8v 58/60 ch', 'Essence'), e('1.2 16v 75 ch', 'Essence'), e('1.0 SCe 70/75 ch', 'Essence'), e('0.9 TCe 90 ch', 'Essence'), e('1.5 dCi 65/75/85 ch', 'Diesel'), e('Électrique 82 ch', 'Électrique')]),
    m('Clio II', 1998, 2012, [e('1.2 8v 58/60 ch', 'Essence'), e('1.2 16v 75 ch', 'Essence'), e('1.4 16v 98 ch', 'Essence'), e('1.6 16v 110 ch', 'Essence'), e('1.5 dCi 65/80/100 ch', 'Diesel'), e('1.9 D 65 ch', 'Diesel')]),
    m('Clio III', 2005, 2014, RENAULT_2000S),
    m('Clio IV', 2012, 2019, [...RENAULT_RECENT, e('1.2 16v 75 ch', 'Essence')]),
    m('Clio V', 2019, undefined, RENAULT_RECENT),
    m('Mégane I', 1995, 2003), m('Mégane II', 2002, 2009, RENAULT_2000S), m('Mégane III', 2008, 2016, [...RENAULT_2000S, ...RENAULT_RECENT]),
    m('Mégane IV', 2016, 2023, RENAULT_RECENT), m('Mégane E-Tech', 2022, undefined, [e('Électrique 130/220 ch', 'Électrique')]),
    m('Scénic', 1996, undefined, [...RENAULT_2000S, ...RENAULT_RECENT]), m('Grand Scénic', 2004, 2022, RENAULT_RECENT),
    m('Captur', 2013, undefined, RENAULT_RECENT), m('Kadjar', 2015, 2022, RENAULT_RECENT), m('Austral', 2022, undefined, RENAULT_RECENT),
    m('Arkana', 2021, undefined, RENAULT_RECENT), m('Koleos', 2008, 2023), m('Espace', 1996), m('Laguna', 1994, 2015, RENAULT_2000S),
    m('Modus', 2004, 2012), m('Kangoo', 1997, undefined, [...RENAULT_2000S, ...RENAULT_RECENT]), m('Trafic', 1998), m('Master', 1997),
    m('Zoe', 2012, 2024, [e('Électrique 88 à 135 ch', 'Électrique')]), m('Talisman', 2015, 2022), m('Fluence', 2010, 2016), m('Vel Satis', 2002, 2009),
    m('R5 E-Tech', 2024, undefined, [e('Électrique 120/150 ch', 'Électrique')]), m('Rafale', 2024), m('Symbioz', 2024),
  ] },
  { name: 'Citroën', models: [
    m('Saxo', 1996, 2004), m('C1', 2005, 2022, [e('1.0 68/72 ch', 'Essence'), e('1.2 PureTech 82 ch', 'Essence'), e('1.4 HDi 54 ch', 'Diesel')]),
    m('C2', 2003, 2009, PSA_2000S), m('C3 (2002-2009)', 2002, 2009, PSA_2000S), m('C3 (2009-2016)', 2009, 2016, [...PSA_2000S, ...PSA_RECENT]),
    m('C3 (2016-2024)', 2016, 2024, PSA_RECENT), m('C3 (2024-)', 2024, undefined, PSA_RECENT), m('C3 Picasso', 2009, 2017, PSA_2000S),
    m('C3 Aircross', 2017, undefined, PSA_RECENT), m('C4', 2004, undefined, [...PSA_2000S, ...PSA_RECENT]), m('C4 Picasso / SpaceTourer', 2006, 2022, [...PSA_2000S, ...PSA_RECENT]),
    m('C4 Cactus', 2014, 2020, PSA_RECENT), m('C4 X', 2022), m('C5', 2001, 2017), m('C5 Aircross', 2018, undefined, PSA_RECENT), m('C5 X', 2021),
    m('C6', 2005, 2012), m('C8', 2002, 2014), m('Xsara', 1997, 2006), m('Xsara Picasso', 1999, 2012, PSA_2000S), m('ZX', 1991, 1998),
    m('Berlingo', 1996, undefined, [...PSA_2000S, ...PSA_RECENT]), m('Nemo', 2008, 2017), m('Jumpy', 1995), m('Jumper', 1994),
    m('DS3', 2009, 2016), m('DS4', 2011, 2015), m('DS5', 2011, 2015), m('Ami', 2020, undefined, [e('Électrique 8 ch', 'Électrique')]),
  ] },
  { name: 'DS', models: [m('DS 3 / DS 3 Crossback', 2016, undefined, PSA_RECENT), m('DS 4', 2015), m('DS 5', 2015, 2018), m('DS 7', 2017), m('DS 9', 2020)] },
  { name: 'Dacia', models: [
    m('Logan', 2004, undefined, [e('1.4 MPI 75 ch', 'Essence'), e('1.6 MPI 85/90 ch', 'Essence'), e('1.0 SCe 65/75 ch', 'Essence'), e('1.0 TCe 90/100 ch', 'Essence'), e('1.5 dCi 70 à 90 ch', 'Diesel'), e('1.0 TCe 100 Eco-G (GPL)', 'GPL')]),
    m('Sandero', 2008, undefined, [e('1.2 16v 75 ch', 'Essence'), e('1.0 SCe 65/75 ch', 'Essence'), e('0.9 TCe 90 ch', 'Essence'), e('1.0 TCe 90/100 ch', 'Essence'), e('1.5 dCi 75/90 ch', 'Diesel'), e('1.0 TCe 100 Eco-G (GPL)', 'GPL')]),
    m('Duster', 2010, undefined, [e('1.6 16v 105/115 ch', 'Essence'), e('1.2 TCe 125 ch', 'Essence'), e('1.3 TCe 130/150 ch', 'Essence'), e('1.5 dCi / Blue dCi 90 à 115 ch', 'Diesel'), e('1.0 TCe 100 Eco-G (GPL)', 'GPL'), e('1.6 Hybrid 140 ch', 'Hybride')]),
    m('Lodgy', 2012, 2022), m('Dokker', 2012, 2021), m('Spring', 2021, undefined, [e('Électrique 45/65 ch', 'Électrique')]), m('Jogger', 2022), m('Bigster', 2025),
  ] },
  { name: 'Volkswagen', models: [
    m('Up!', 2011, 2023), m('Lupo', 1998, 2005), m('Fox', 2005, 2011), m('Polo', 1994, undefined, VAG), m('Golf', 1991, undefined, VAG), m('Golf Plus / Sportsvan', 2005, 2020, VAG),
    m('Bora', 1998, 2005), m('Jetta', 2005, 2018), m('Passat', 1996, undefined, VAG), m('Arteon', 2017, 2024), m('Touran', 2003, undefined, VAG), m('Sharan', 1995, 2022),
    m('T-Cross', 2019, undefined, VAG), m('T-Roc', 2017, undefined, VAG), m('Tiguan', 2007, undefined, VAG), m('Touareg', 2002), m('Taigo', 2021, undefined, VAG),
    m('Scirocco', 2008, 2017), m('Beetle', 1998, 2019), m('Caddy', 1995, undefined, VAG), m('Transporter', 1990), m('Crafter', 2006), m('Amarok', 2010),
    m('ID.3', 2020, undefined, [e('Électrique 150 à 204 ch', 'Électrique')]), m('ID.4', 2021, undefined, [e('Électrique 148 à 299 ch', 'Électrique')]), m('ID.5', 2022), m('ID. Buzz', 2022),
  ] },
  { name: 'Audi', models: [m('A1', 2010, undefined, VAG), m('A2', 2000, 2005), m('A3', 1996, undefined, VAG), m('A4', 1994, undefined, VAG), m('A5', 2007, undefined, VAG), m('A6', 1994, undefined, VAG), m('A7', 2010), m('A8', 1994), m('Q2', 2016, undefined, VAG), m('Q3', 2011, undefined, VAG), m('Q4 e-tron', 2021), m('Q5', 2008, undefined, VAG), m('Q7', 2006), m('Q8', 2018), m('TT', 1998, 2023), m('e-tron', 2019)] },
  { name: 'Seat', models: [m('Arosa', 1997, 2004), m('Ibiza', 1993, undefined, VAG), m('Leon', 1999, undefined, VAG), m('Toledo', 1991, 2019), m('Altea', 2004, 2015), m('Alhambra', 1996, 2020), m('Arona', 2017, undefined, VAG), m('Ateca', 2016, undefined, VAG), m('Tarraco', 2018), m('Mii', 2012, 2021)] },
  { name: 'Cupra', models: [m('Formentor', 2020, undefined, VAG), m('Leon', 2020, undefined, VAG), m('Born', 2021), m('Ateca', 2018), m('Terramar', 2024), m('Tavascan', 2024)] },
  { name: 'Skoda', models: [m('Citigo', 2012, 2020), m('Fabia', 1999, undefined, VAG), m('Rapid', 2012, 2019), m('Octavia', 1996, undefined, VAG), m('Superb', 2001, undefined, VAG), m('Roomster', 2006, 2015), m('Yeti', 2009, 2017), m('Kamiq', 2019, undefined, VAG), m('Karoq', 2017, undefined, VAG), m('Kodiaq', 2016, undefined, VAG), m('Scala', 2019, undefined, VAG), m('Enyaq', 2021), m('Elroq', 2024)] },
  { name: 'Toyota', models: [
    m('Aygo / Aygo X', 2005, undefined, TOYOTA_HYBRID), m('Yaris', 1999, undefined, TOYOTA_HYBRID), m('Yaris Cross', 2021, undefined, TOYOTA_HYBRID), m('Corolla', 1995, undefined, TOYOTA_HYBRID),
    m('Auris', 2007, 2019, TOYOTA_HYBRID), m('Prius', 2000, undefined, TOYOTA_HYBRID), m('C-HR', 2016, undefined, TOYOTA_HYBRID), m('RAV4', 1994, undefined, TOYOTA_HYBRID),
    m('Avensis', 1997, 2018), m('Verso', 2009, 2018), m('Land Cruiser', 1990), m('Hilux', 1990), m('Proace / Proace City', 2013), m('bZ4X', 2022), m('GR86 / GT86', 2012),
  ] },
  { name: 'Ford', models: [m('Ka / Ka+', 1996, 2020), m('Fiesta', 1995, 2023), m('Fusion', 2002, 2012), m('Focus', 1998, 2025), m('C-Max', 2003, 2019), m('S-Max', 2006, 2023), m('Galaxy', 1995, 2023), m('Mondeo', 1993, 2022), m('EcoSport', 2014, 2023), m('Puma', 2019), m('Kuga', 2008), m('Mustang Mach-E', 2021), m('Transit / Transit Custom', 1995), m('Ranger', 1998)] },
  { name: 'Opel', models: [m('Agila', 2000, 2014), m('Adam', 2013, 2019), m('Corsa', 1993, undefined, PSA_RECENT), m('Astra', 1991), m('Zafira', 1999, 2019), m('Meriva', 2003, 2017), m('Mokka', 2012), m('Crossland', 2017, undefined, PSA_RECENT), m('Grandland', 2017, undefined, PSA_RECENT), m('Insignia', 2008, 2022), m('Vectra', 1995, 2008), m('Combo', 1994), m('Vivaro', 2001), m('Movano', 1998)] },
  { name: 'Fiat', models: [m('Panda', 1980, undefined, [e('1.1 54 ch', 'Essence'), e('1.2 60/69 ch', 'Essence'), e('0.9 TwinAir 85 ch', 'Essence'), e('1.0 Hybrid 70 ch', 'Hybride'), e('1.3 Multijet 75/95 ch', 'Diesel')]), m('500', 2007, undefined, [e('1.2 69 ch', 'Essence'), e('0.9 TwinAir 85 ch', 'Essence'), e('1.0 Hybrid 70 ch', 'Hybride'), e('Électrique 95/118 ch', 'Électrique')]), m('500X', 2014), m('500L', 2012, 2022), m('Punto', 1993, 2018), m('Tipo', 2015), m('Bravo', 2007, 2014), m('Doblo', 2000), m('Ducato', 1994), m('Fiorino / Qubo', 2008), m('600', 2023), m('Seicento', 1998, 2010), m('Multipla', 1998, 2010)] },
  { name: 'Alfa Romeo', models: [m('MiTo', 2008, 2018), m('147', 2000, 2010), m('Giulietta', 2010, 2020), m('159', 2005, 2011), m('Giulia', 2016), m('Stelvio', 2017), m('Tonale', 2022), m('Junior', 2024)] },
  { name: 'Lancia', models: [m('Ypsilon', 2003), m('Delta', 2008, 2014), m('Musa', 2004, 2012)] },
  { name: 'Jeep', models: [m('Renegade', 2014), m('Compass', 2007), m('Avenger', 2023), m('Cherokee', 2014, 2021), m('Grand Cherokee', 1993), m('Wrangler', 1987)] },
  { name: 'Nissan', models: [m('Micra', 1992), m('Note', 2006, 2017), m('Juke', 2010), m('Qashqai', 2007), m('X-Trail', 2001), m('Leaf', 2011), m('Pulsar', 2014, 2018), m('Primera', 1990, 2008), m('Almera', 1995, 2006), m('Navara', 1997), m('NV200', 2009), m('Ariya', 2022)] },
  { name: 'Hyundai', models: [m('i10', 2008), m('i20', 2008), m('i30', 2007), m('ix20', 2010, 2019), m('ix35', 2010, 2015), m('Bayon', 2021), m('Kona', 2017), m('Tucson', 2004), m('Santa Fe', 2001), m('Ioniq', 2016, 2022), m('Ioniq 5', 2021), m('Ioniq 6', 2022), m('Getz', 2002, 2011)] },
  { name: 'Kia', models: [m('Picanto', 2004), m('Rio', 2000, 2023), m("Cee'd / Ceed", 2007), m('Venga', 2010, 2019), m('Stonic', 2017), m('Niro', 2016), m('Sportage', 1993), m('Sorento', 2002), m('Soul', 2009), m('EV6', 2021), m('EV3', 2024), m('XCeed', 2019)] },
  { name: 'BMW', models: [m('Série 1', 2004), m('Série 2', 2014), m('Série 3', 1990), m('Série 4', 2013), m('Série 5', 1988), m('Série 7', 1994), m('X1', 2009), m('X2', 2018), m('X3', 2003), m('X4', 2014), m('X5', 1999), m('X6', 2008), m('Z4', 2002), m('i3', 2013, 2022), m('iX / iX1 / iX3', 2020), m('i4', 2021)] },
  { name: 'Mini', models: [m('Mini (3/5 portes)', 2001), m('Cabriolet', 2004), m('Clubman', 2007, 2024), m('Countryman', 2010), m('Paceman', 2013, 2016), m('Aceman', 2024)] },
  { name: 'Mercedes-Benz', models: [m('Classe A', 1997), m('Classe B', 2005), m('Classe C', 1993), m('Classe E', 1993), m('Classe S', 1991), m('CLA', 2013), m('CLK', 1997, 2010), m('GLA', 2014), m('GLB', 2019), m('GLC', 2015), m('ML / GLE', 1997), m('Vito / Classe V', 1996), m('Sprinter', 1995), m('Citan', 2012), m('EQA / EQB / EQC', 2019)] },
  { name: 'Smart', models: [m('Fortwo', 1998), m('Forfour', 2004, 2021), m('#1', 2022), m('#3', 2024)] },
  { name: 'Volvo', models: [m('C30', 2006, 2013), m('V40', 1995, 2019), m('S40 / V50', 1995, 2012), m('S60 / V60', 2000), m('S80 / V70', 1996, 2016), m('S90 / V90', 2016), m('XC40', 2017), m('XC60', 2008), m('XC90', 2002), m('EX30', 2023)] },
  { name: 'Suzuki', models: [m('Alto', 1994, 2014), m('Celerio', 2014, 2020), m('Ignis', 2000), m('Swift', 1990), m('Baleno', 2016, 2019), m('SX4 / S-Cross', 2006), m('Vitara / Grand Vitara', 1988), m('Jimny', 1998), m('Swace', 2020), m('Across', 2020)] },
  { name: 'Mazda', models: [m('2', 2003), m('3', 2003), m('6', 2002, 2024), m('5', 2005, 2015), m('CX-3', 2015, 2022), m('CX-30', 2019), m('CX-5', 2012), m('CX-60', 2022), m('MX-5', 1989), m('MX-30', 2020)] },
  { name: 'Honda', models: [m('Jazz', 2002), m('Civic', 1995), m('HR-V', 1999), m('CR-V', 1995), m('Accord', 1993, 2015), m('e', 2020, 2024), m('ZR-V', 2023)] },
  { name: 'Mitsubishi', models: [m('Space Star', 2013), m('Colt', 2004), m('ASX', 2010), m('Outlander', 2003), m('Eclipse Cross', 2018), m('L200', 1996), m('Pajero', 1991, 2021)] },
  { name: 'Subaru', models: [m('Impreza', 1992), m('XV / Crosstrek', 2012), m('Forester', 1997), m('Outback', 1995), m('Legacy', 1989, 2014)] },
  { name: 'Land Rover', models: [m('Defender', 1990), m('Discovery', 1989), m('Discovery Sport', 2014), m('Freelander', 1997, 2014), m('Range Rover', 1990), m('Range Rover Evoque', 2011), m('Range Rover Sport', 2005), m('Range Rover Velar', 2017)] },
  { name: 'Jaguar', models: [m('XE', 2015, 2024), m('XF', 2007, 2024), m('F-Pace', 2016), m('E-Pace', 2017), m('I-Pace', 2018)] },
  { name: 'Porsche', models: [m('911', 1990), m('Boxster / Cayman', 1996), m('Cayenne', 2002), m('Macan', 2014), m('Panamera', 2009), m('Taycan', 2019)] },
  { name: 'Tesla', models: [m('Model 3', 2019, undefined, [e('Propulsion / Grande Autonomie', 'Électrique')]), m('Model Y', 2021, undefined, [e('Propulsion / Grande Autonomie', 'Électrique')]), m('Model S', 2013), m('Model X', 2016)] },
  { name: 'MG', models: [m('MG3', 2013), m('MG4', 2022), m('MG5', 2020), m('ZS', 2017), m('HS', 2019), m('Marvel R', 2021)] },
  { name: 'BYD', models: [m('Dolphin', 2023), m('Dolphin Surf', 2025), m('Atto 2', 2025), m('Atto 3', 2022), m('Seal', 2023), m('Seal U', 2024)] },
  { name: 'Lexus', models: [m('CT', 2011, 2022), m('IS', 1999), m('UX', 2018), m('NX', 2014), m('RX', 1998), m('LBX', 2023)] },
  { name: 'Alpine', models: [m('A110', 2017), m('A290', 2024)] },
  { name: 'Abarth', models: [m('500 / 595 / 695', 2008), m('600e', 2024)] },
  { name: 'SsangYong / KGM', models: [m('Tivoli', 2015), m('Korando', 1996), m('Rexton', 2001)] },
  { name: 'Chevrolet', models: [m('Spark', 2010, 2015), m('Aveo', 2006, 2015), m('Cruze', 2009, 2015), m('Captiva', 2006, 2015)] },
  { name: 'Saab', models: [m('9-3', 1998, 2014), m('9-5', 1997, 2011)] },
  { name: 'Rover', models: [m('25', 1999, 2005), m('45', 1999, 2005), m('75', 1999, 2005)] },
  { name: 'Daihatsu', models: [m('Cuore', 1990, 2013), m('Sirion', 1998, 2013), m('Terios', 1997, 2013)] },
];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const MAKE_ALIASES: Record<string, string> = { ssangyong: 'SsangYong / KGM', kgm: 'SsangYong / KGM' };
const compact = (s: string) => fold(s).replace(/[^a-z0-9+]/g, '');

/** Année au-delà de laquelle un modèle encore immatriculé est considéré comme toujours vendu. */
const ONGOING_FROM = 2024;

function mergeOpenData(curated: CarMake[], open: [string, [string, number, number][]][]): CarMake[] {
  const byName = new Map(curated.map((mk) => [fold(mk.name), { ...mk, models: [...mk.models] }]));
  for (const [rawMake, models] of open) {
    const name = MAKE_ALIASES[fold(rawMake)] ?? rawMake;
    const make = byName.get(fold(name)) ?? { name, models: [] };
    byName.set(fold(name), make);
    const known = make.models.map((md) => compact(md.name));
    for (const [model, from, to] of models) {
      const key = compact(model);
      // « Clio » est déjà couvert par « Clio II », « Clio III »… de la sélection éditée.
      if (known.some((k) => k === key || k.startsWith(key))) continue;
      make.models.push({ name: model, from, to: to >= ONGOING_FROM ? undefined : to });
      known.push(key);
    }
  }
  const order = (a: string, b: string) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
  return [...byName.values()]
    .map((mk) => ({ ...mk, models: mk.models.sort((a, b) => order(a.name, b.name)) }))
    .sort((a, b) => order(a.name, b.name));
}

export const CAR_MAKES: CarMake[] = mergeOpenData(CURATED, openData.makes as [string, [string, number, number][]][]);

/** Sources des données ouvertes, à citer dans l'app (licences CC BY 4.0 et OGL). */
export const CATALOG_SOURCES: string[] = openData.sources;

/** Marques dont le nom contient la recherche (sans tenir compte des accents). */
export function searchMakes(query: string): CarMake[] {
  const q = fold(query.trim());
  return q ? CAR_MAKES.filter((mk) => fold(mk.name).includes(q)) : CAR_MAKES;
}

export function findMake(name: string): CarMake | undefined {
  const q = fold(name.trim());
  return CAR_MAKES.find((mk) => fold(mk.name) === q);
}

/** Modèles d'une marque, filtrés par la recherche et par l'année si elle est connue. */
export function searchModels(make: string, query = '', year?: number): CarModel[] {
  const mk = findMake(make);
  if (!mk) return [];
  const q = fold(query.trim());
  return mk.models.filter(
    (md) =>
      (!q || fold(md.name).includes(q)) &&
      (!year || (year >= md.from - 1 && (md.to === undefined || year <= md.to + 1))),
  );
}

export function findModel(make: string, model: string): CarModel | undefined {
  const q = fold(model.trim());
  return findMake(make)?.models.find((md) => fold(md.name) === q);
}

export const MODEL_COUNT = CAR_MAKES.reduce((n, mk) => n + mk.models.length, 0);
