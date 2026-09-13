export type Country = {
  code: string;
  name: {
    en: string;
    ar: string;
    tr: string;
  };
};

export const countries: Country[] = [
  { code: 'TR', name: { en: 'Turkey', ar: 'تركيا', tr: 'Türkiye' } },
  { code: 'SA', name: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية', tr: 'Suudi Arabistan' } },
  { code: 'AE', name: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة', tr: 'Birleşik Arap Emirlikleri' } },
  { code: 'QA', name: { en: 'Qatar', ar: 'قطر', tr: 'Katar' } },
  { code: 'KW', name: { en: 'Kuwait', ar: 'الكويت', tr: 'Kuveyt' } },
  { code: 'OM', name: { en: 'Oman', ar: 'عُمان', tr: 'Umman' } },
  { code: 'BH', name: { en: 'Bahrain', ar: 'البحرين', tr: 'Bahreyn' } },
  { code: 'EG', name: { en: 'Egypt', ar: 'مصر', tr: 'Mısır' } },
  { code: 'JO', name: { en: 'Jordan', ar: 'الأردن', tr: 'Ürdün' } },
  { code: 'LB', name: { en: 'Lebanon', ar: 'لبنان', tr: 'Lübnan' } },
  { code: 'IQ', name: { en: 'Iraq', ar: 'العراق', tr: 'Irak' } },
  { code: 'MA', name: { en: 'Morocco', ar: 'المغرب', tr: 'Fas' } },
  { code: 'DZ', name: { en: 'Algeria', ar: 'الجزائر', tr: 'Cezayir' } },
  { code: 'TN', name: { en: 'Tunisia', ar: 'تونس', tr: 'Tunus' } },
  { code: 'GB', name: { en: 'United Kingdom', ar: 'المملكة المتحدة', tr: 'Birleşik Krallık' } },
  { code: 'US', name: { en: 'United States', ar: 'الولايات المتحدة', tr: 'Amerika Birleşik Devletleri' } },
  { code: 'DE', name: { en: 'Germany', ar: 'ألمانيا', tr: 'Almanya' } },
  { code: 'FR', name: { en: 'France', ar: 'فرنسا', tr: 'Fransa' } },
  { code: 'NL', name: { en: 'Netherlands', ar: 'هولندا', tr: 'Hollanda' } },
  { code: 'BE', name: { en: 'Belgium', ar: 'بلجيكا', tr: 'Belçika' } },
  { code: 'CH', name: { en: 'Switzerland', ar: 'سويسرا', tr: 'İsviçre' } },
  { code: 'AT', name: { en: 'Austria', ar: 'النمسا', tr: 'Avusturya' } },
  { code: 'SE', name: { en: 'Sweden', ar: 'السويد', tr: 'İsveç' } },
  { code: 'NO', name: { en: 'Norway', ar: 'النرويج', tr: 'Norveç' } },
  { code: 'CA', name: { en: 'Canada', ar: 'كندا', tr: 'Kanada' } },
  { code: 'AU', name: { en: 'Australia', ar: 'أستراليا', tr: 'Avustralya' } },
  { code: 'OTHER', name: { en: 'Other Country', ar: 'دولة أخرى', tr: 'Diğer Ülke' } },
];
