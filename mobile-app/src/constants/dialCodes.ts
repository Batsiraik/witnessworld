export type DialCountry = {
  name: string;
  dial: string;
  flag: string;
};

/** Curated list for dial picker; extend when wiring full intl support */
export const DIAL_COUNTRIES: DialCountry[] = [
  { name: 'United States', dial: '+1', flag: '🇺🇸' },
  { name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { name: 'France', dial: '+33', flag: '🇫🇷' },
  { name: 'India', dial: '+91', flag: '🇮🇳' },
  { name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { name: 'China', dial: '+86', flag: '🇨🇳' },
  { name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
];

export const DEFAULT_DIAL: DialCountry = DIAL_COUNTRIES[0];
