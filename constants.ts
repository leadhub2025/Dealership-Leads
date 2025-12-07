
import { NaamsaBrand } from "./types";

export const NAAMSA_BRANDS: NaamsaBrand[] = [
  // A
  { id: 'alfa-romeo', name: 'Alfa Romeo', tier: 'Luxury' },
  { id: 'audi', name: 'Audi', tier: 'Luxury' },
  // B
  { id: 'baic', name: 'BAIC', tier: 'Volume' },
  { id: 'bentley', name: 'Bentley', tier: 'Luxury' },
  { id: 'bmw', name: 'BMW', tier: 'Luxury' },
  { id: 'byd', name: 'BYD', tier: 'Volume' },
  // C
  { id: 'chery', name: 'Chery', tier: 'Volume' },
  { id: 'citroen', name: 'Citroen', tier: 'Volume' },
  // F
  { id: 'ferrari', name: 'Ferrari', tier: 'Luxury' },
  { id: 'fiat', name: 'Fiat', tier: 'Volume' },
  { id: 'ford', name: 'Ford', tier: 'Volume' },
  // G
  { id: 'gwm', name: 'GWM', tier: 'Volume' },
  // H
  { id: 'haval', name: 'Haval', tier: 'Volume' },
  { id: 'hino', name: 'Hino', tier: 'Commercial' },
  { id: 'honda', name: 'Honda', tier: 'Volume' },
  { id: 'hyundai', name: 'Hyundai', tier: 'Volume' },
  // I
  { id: 'ineos', name: 'Ineos', tier: 'Luxury' },
  { id: 'isuzu', name: 'Isuzu', tier: 'Commercial' },
  { id: 'iveco', name: 'Iveco', tier: 'Commercial' },
  // J
  { id: 'jac', name: 'JAC', tier: 'Commercial' },
  { id: 'jaecoo', name: 'Jaecoo', tier: 'Volume' },
  { id: 'jaguar', name: 'Jaguar', tier: 'Luxury' },
  { id: 'jeep', name: 'Jeep', tier: 'Luxury' },
  // K
  { id: 'kia', name: 'Kia', tier: 'Volume' },
  // L
  { id: 'lamborghini', name: 'Lamborghini', tier: 'Luxury' },
  { id: 'land-rover', name: 'Land Rover', tier: 'Luxury' },
  { id: 'lexus', name: 'Lexus', tier: 'Luxury' },
  // M
  { id: 'mahindra', name: 'Mahindra', tier: 'Volume' },
  { id: 'man', name: 'MAN', tier: 'Commercial' },
  { id: 'maserati', name: 'Maserati', tier: 'Luxury' },
  { id: 'mazda', name: 'Mazda', tier: 'Volume' },
  { id: 'mercedes', name: 'Mercedes-Benz', tier: 'Luxury' },
  { id: 'mini', name: 'Mini', tier: 'Luxury' },
  { id: 'mitsubishi', name: 'Mitsubishi', tier: 'Volume' },
  // N
  { id: 'nissan', name: 'Nissan', tier: 'Volume' },
  // O
  { id: 'omoda', name: 'Omoda', tier: 'Volume' },
  { id: 'opel', name: 'Opel', tier: 'Volume' },
  // P
  { id: 'peugeot', name: 'Peugeot', tier: 'Volume' },
  { id: 'porsche', name: 'Porsche', tier: 'Luxury' },
  { id: 'proton', name: 'Proton', tier: 'Volume' },
  // R
  { id: 'renault', name: 'Renault', tier: 'Volume' },
  // S
  { id: 'scania', name: 'Scania', tier: 'Commercial' },
  { id: 'subaru', name: 'Subaru', tier: 'Volume' },
  { id: 'suzuki', name: 'Suzuki', tier: 'Volume' },
  // T
  { id: 'tata', name: 'Tata', tier: 'Commercial' },
  { id: 'toyota', name: 'Toyota', tier: 'Volume' },
  // U
  { id: 'ud-trucks', name: 'UD Trucks', tier: 'Commercial' },
  // V
  { id: 'volkswagen', name: 'Volkswagen', tier: 'Volume' },
  { id: 'volvo', name: 'Volvo', tier: 'Luxury' },
];

export const SA_REGIONS = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Mpumalanga",
  "North West",
  "Limpopo",
  "Northern Cape"
];

// Adjacency list for "Nearest Region" fallback logic
export const REGION_ADJACENCY: Record<string, string[]> = {
  "Gauteng": ["North West", "Mpumalanga", "Free State", "Limpopo"],
  "Western Cape": ["Eastern Cape", "Northern Cape"],
  "KwaZulu-Natal": ["Free State", "Mpumalanga", "Eastern Cape"],
  "Eastern Cape": ["Western Cape", "KwaZulu-Natal", "Free State", "Northern Cape"],
  "Free State": ["Gauteng", "North West", "Mpumalanga", "KwaZulu-Natal", "Eastern Cape", "Northern Cape"],
  "Mpumalanga": ["Gauteng", "Limpopo", "KwaZulu-Natal", "Free State"],
  "North West": ["Gauteng", "Limpopo", "Free State", "Northern Cape"],
  "Limpopo": ["Gauteng", "Mpumalanga", "North West"],
  "Northern Cape": ["Western Cape", "Eastern Cape", "Free State", "North West"]
};

// Mappings for Model Dropdowns
export const BRAND_MODELS: Record<string, string[]> = {
  'alfa-romeo': ['Giulia', 'Stelvio', 'Tonale'],
  'audi': ['A1', 'A3', 'A4', 'A5', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'RS3', 'RS6'],
  'baic': ['Beijing X55', 'B40 Plus'],
  'bentley': ['Continental GT', 'Bentayga', 'Flying Spur'],
  'bmw': ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', 'X1', 'X3', 'X5', 'X7', 'iX', 'M2', 'M3', 'M4'],
  'byd': ['Atto 3', 'Dolphin'],
  'chery': ['Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 8 Pro', 'Omoda C5'],
  'citroen': ['C3', 'C3 Aircross', 'C5 Aircross'],
  'ferrari': ['296 GTB', 'Roma', 'F8 Tributo', 'Purosangue'],
  'fiat': ['500', 'Tipo', 'Fiorino'],
  'ford': ['Ranger', 'Everest', 'Mustang', 'Puma', 'Territory', 'Tourneo'],
  'gwm': ['P-Series', 'Steed', 'Tank 300', 'Tank 500', 'Ora 03'],
  'haval': ['Jolion', 'H6', 'H6 GT'],
  'hino': ['200 Series', '300 Series', '500 Series', '700 Series'],
  'honda': ['Amaze', 'Fit', 'BR-V', 'HR-V', 'CR-V', 'Civic Type R'],
  'hyundai': ['Grand i10', 'i20', 'Venue', 'Creta', 'Tucson', 'Santa Fe', 'H100', 'Staria'],
  'ineos': ['Grenadier'],
  'isuzu': ['D-Max', 'mu-X'],
  'iveco': ['Daily'],
  'jac': ['T6', 'T8', 'T9', 'X200'],
  'jaecoo': ['J7'],
  'jaguar': ['F-Pace', 'E-Pace', 'I-Pace', 'F-Type'],
  'jeep': ['Renegade', 'Compass', 'Wrangler', 'Grand Cherokee', 'Gladiator'],
  'kia': ['Picanto', 'Pegas', 'Rio', 'Sonet', 'Seltos', 'Sportage', 'Sorento', 'Carnival'],
  'lamborghini': ['Urus', 'Huracan', 'Revuelto'],
  'land-rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque'],
  'lexus': ['ES', 'IS', 'LS', 'UX', 'NX', 'RX', 'LX'],
  'mahindra': ['Pik Up', 'Scorpio-N', 'XUV300', 'XUV700', 'Thar'],
  'man': ['TGS', 'TGX'],
  'maserati': ['Grecale', 'Levante', 'MC20'],
  'mazda': ['Mazda2', 'Mazda3', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'BT-50'],
  'mercedes': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'G-Class', 'V-Class', 'Sprinter'],
  'mini': ['Hatch', 'Countryman', 'Clubman'],
  'mitsubishi': ['Triton', 'Pajero Sport', 'ASX', 'Eclipse Cross', 'Outlander', 'Xpander'],
  'nissan': ['Magnite', 'Navara', 'Patrol', 'Qashqai', 'X-Trail', 'NP200'],
  'omoda': ['C5', 'C9'],
  'opel': ['Corsa', 'Mokka', 'Grandland', 'Combo', 'Zafira'],
  'peugeot': ['208', '2008', '3008', 'Landtrek'],
  'porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', '718'],
  'proton': ['X50', 'X70', 'Saga'],
  'renault': ['Kwid', 'Triber', 'Kiger', 'Clio', 'Captur', 'Duster', 'Koleos', 'Oroch'],
  'scania': ['R-Series', 'G-Series'],
  'subaru': ['Forester', 'Outback', 'Crosstrek', 'WRX'],
  'suzuki': ['Swift', 'S-Presso', 'Celerio', 'Dzire', 'Baleno', 'Ignis', 'Fronx', 'Jimny', 'Ertiga', 'Grand Vitara', 'Eeco', 'Super Carry'],
  'tata': ['Xenon'],
  'toyota': ['Hilux', 'Fortuner', 'Corolla Cross', 'Corolla Quest', 'Starlet', 'Urban Cruiser', 'Vitz', 'Rumion', 'Hiace', 'Land Cruiser 79', 'Land Cruiser 300', 'Prado', 'RAV4'],
  'ud-trucks': ['Quester', 'Croner'],
  'volkswagen': ['Polo Vivo', 'Polo', 'Golf GTI', 'Golf R', 'T-Cross', 'Taigo', 'T-Roc', 'Tiguan', 'Touareg', 'Amarok', 'Kombi', 'Caravelle', 'Caddy'],
  'volvo': ['XC40', 'XC60', 'XC90', 'EX30', 'C40'],
};

export const COMMON_TRIMS = [
  'Ambition', 'AMG Line', 'Avantgarde', 'Comfortline', 'Cross', 'Dark Label', 'Distinctive', 
  'Dynamic', 'Elegance', 'Elite', 'Essence', 'Evolution', 'Executive', 'Expression', 'Extreme', 
  'Fluid', 'GA-Z', 'GL', 'GLS', 'GLX', 'GR-S', 'GR-Sport', 'GTI', 'Highline', 'Individual', 
  'Inscription', 'Legend', 'Legend RS', 'Life', 'Limited', 'Luxury', 'M Sport', 'Momentum', 
  'Motion', 'Premium', 'Prestige', 'Pro', 'Pure', 'R-Dynamic', 'R-Line', 'Raptor', 'Rebel', 
  'RS', 'Rubicon', 'S edition', 'Sahara', 'SE', 'Shine', 'Sport', 'Stormtrak', 'Style', 
  'Supercab', 'Titanium', 'Trendline', 'Turbo', 'Veloce', 'Wildtrak', 'XLT', 'X-Rider', '2.4 GD-6', '2.8 GD-6'
];

export const POPIA_DISCLAIMER = `
## POPIA Compliance Notice

In accordance with the **Protection of Personal Information Act (POPIA)** of South Africa, this application is designed to respect user privacy and data sovereignty.

1.  **Public Data Only:** This tool aggregates publicly available market signals and intent data indexed by search engines. It does not bypass privacy settings to scrape non-public personal contact details (e.g., private phone numbers or emails) without consent.
2.  **Lead Generation:** "Leads" generated here represent *market opportunities* and *intent signals* (e.g., a public request for a quote on a forum).
3.  **Dealer Responsibility:** As a dealer using this tool, you are the "Responsible Party" for any personal information you subsequently collect. You must ensure you have a lawful basis (such as legitimate interest or consent) before directly contacting individuals.
4.  **Data Minimization:** We only process data relevant to the specific vehicle inquiry.
`;
