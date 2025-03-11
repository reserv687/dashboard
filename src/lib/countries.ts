export interface Country {
  value: string;
  label: string;
  code: string;
  flag: string;
}

export const countries: Country[] = [
  {
    value: 'SA',
    label: 'السعودية',
    code: '+966',
    flag: '🇸🇦',
  },
  {
    value: 'AE',
    label: 'الإمارات',
    code: '+971',
    flag: '🇦🇪',
  },
  {
    value: 'KW',
    label: 'الكويت',
    code: '+965',
    flag: '🇰🇼',
  },
  {
    value: 'BH',
    label: 'البحرين',
    code: '+973',
    flag: '🇧🇭',
  },
  {
    value: 'QA',
    label: 'قطر',
    code: '+974',
    flag: '🇶🇦',
  },
  {
    value: 'OM',
    label: 'عمان',
    code: '+968',
    flag: '🇴🇲',
  },
  {
    value: 'EG',
    label: 'مصر',
    code: '+20',
    flag: '🇪🇬',
  },
  {
    value: 'JO',
    label: 'الأردن',
    code: '+962',
    flag: '🇯🇴',
  },
];
