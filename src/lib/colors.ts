export const colorNamesArabic: { [key: string]: string } = {
  '#FF0000': 'أحمر',
  '#00FF00': 'أخضر',
  '#0000FF': 'أزرق',
  '#FFFF00': 'أصفر',
  '#FF00FF': 'وردي',
  '#00FFFF': 'سماوي',
  '#000000': 'أسود',
  '#FFFFFF': 'أبيض',
  '#808080': 'رمادي',
  '#800000': 'خمري',
  '#808000': 'زيتوني',
  '#008000': 'أخضر غامق',
  '#800080': 'بنفسجي',
  '#008080': 'تركواز',
  '#000080': 'كحلي',
  '#FFA500': 'برتقالي',
  '#A52A2A': 'بني',
  '#DEB887': 'بيج',
  '#FFE4C4': 'بيج فاتح',
  '#F5F5DC': 'كريمي'
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// حساب المسافة بين لونين
function colorDistance(color1: string, color2: string): number {
  // تحويل الألوان إلى أرقام
  const hex1 = color1.substring(1);
  const hex2 = color2.substring(1);
  
  // تحويل كل لون إلى RGB
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  // حساب المسافة باستخدام معادلة المسافة الإقليدية
  return Math.sqrt(
    Math.pow(r2 - r1, 2) +
    Math.pow(g2 - g1, 2) +
    Math.pow(b2 - b1, 2)
  );
}

export function findNearestColorName(hexColor: string): string {
  // تنظيف كود اللون
  let cleanHex = hexColor.toUpperCase();
  if (!cleanHex.startsWith('#')) {
    cleanHex = '#' + cleanHex;
  }
  
  // التحقق من صحة تنسيق اللون
  if (!/^#[0-9A-F]{6}$/i.test(cleanHex)) {
    return colorNamesArabic['#000000'];
  }
  
  // البحث عن اللون المطابق تماماً
  if (colorNamesArabic[cleanHex]) {
    return colorNamesArabic[cleanHex];
  }
  
  // إذا لم يتم العثور على مطابقة دقيقة، نبحث عن أقرب لون
  let minDistance = Number.MAX_VALUE;
  let nearestColor = '#000000';
  
  Object.keys(colorNamesArabic).forEach(color => {
    const distance = colorDistance(cleanHex, color);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = color;
    }
  });
  
  return colorNamesArabic[nearestColor];
}
