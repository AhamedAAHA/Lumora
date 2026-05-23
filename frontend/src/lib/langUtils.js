export const LANG_LABELS = { en: 'English', ta: 'Tamil', si: 'Sinhala' };

export function langFontClass(language) {
  if (language === 'ta') return 'font-tamil';
  if (language === 'si') return 'font-sinhala';
  return '';
}

export function langSelectOptions() {
  return [
    ['en', 'English'],
    ['ta', 'Tamil (தமிழ்)'],
    ['si', 'Sinhala (සිංහල)'],
  ];
}
