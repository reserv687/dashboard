import { customAlphabet } from 'nanoid';

// إنشاء مولد نانو آيدي مخصص يستخدم أحرف وأرقام محددة
const generateNanoId = customAlphabet('123456789ABCDEFGHIJKLMNPQRSTUVWXYZ', 8);

interface SKUOptions {
  prefix?: string;
  categoryCode?: string;
  separator?: string;
}

export class SKUGenerator {
  private static cleanString(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 3);
  }

  static async generateProductSKU(name: string, options: SKUOptions = {}): Promise<string> {
    const {
      prefix = this.cleanString(name),
      categoryCode = 'XX',
      separator = '-'
    } = options;

    const uniqueId = generateNanoId();
    return `${prefix}${separator}${categoryCode}${separator}${uniqueId}`;
  }

  static async generateVariantSKU(
    productSKU: string,
    combination: Record<string, string>,
    variantIndex: number
  ): Promise<string> {
    // إنشاء رمز فريد للمتغير من خلال دمج قيم التوليفة
    const variantCode = Object.values(combination)
      .map(value => this.cleanString(value).substring(0, 2))
      .join('')
      .substring(0, 6);

    const variantNumber = (variantIndex + 1).toString().padStart(3, '0');
    const uniqueId = generateNanoId().substring(0, 4);

    return `${productSKU}-${variantCode}-${variantNumber}-${uniqueId}`;
  }

  static async validateSKU(sku: string): Promise<boolean> {
    // يمكن إضافة منطق للتحقق من صحة SKU هنا
    const skuPattern = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+(-[A-Z0-9]+)*$/;
    return skuPattern.test(sku);
  }
}
