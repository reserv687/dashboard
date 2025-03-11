import { createCipheriv, createDecipheriv } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-256-bit-key'.padEnd(32, '0'); // 32 bytes = 256 bits
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || 'your-iv-16-bytes'.padEnd(16, '0'); // 16 bytes = 128 bits
const ALGORITHM = 'aes-256-cbc';

export async function encrypt(data: any): Promise<string> {
  try {
    const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, ENCRYPTION_IV);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data)),
      cipher.final(),
    ]);
    return encrypted.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export async function decrypt(encryptedData: string): Promise<any> {
  try {
    const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, ENCRYPTION_IV);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString());
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}
