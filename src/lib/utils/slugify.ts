export function slugify(text: string | undefined | null): string {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // استبدال المسافات بشرطة
    .replace(/[^\w\-]+/g, '')       // إزالة جميع الأحرف غير الكلمات
    .replace(/\-\-+/g, '-')         // استبدال الشرطات المتعددة بشرطة واحدة
    .replace(/^-+/, '')             // إزالة الشرطات من البداية
    .replace(/-+$/, '');            // إزالة الشرطات من النهاية
}
