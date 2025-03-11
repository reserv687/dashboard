import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // إنشاء اسم فريد للملف
    const uniqueName = `${Date.now()}-${file.name}`;
    
    // إنشاء المسارات
    const uploadDir = path.join(process.cwd(), 'public', folder);
    const filePath = path.join(uploadDir, uniqueName);

    // التأكد من وجود المجلد
    try {
      await mkdir(uploadDir, { recursive: true });
      console.log(`Created or verified directory: ${uploadDir}`);
    } catch (error) {
      console.error('Error creating directory:', error);
      throw new Error('Failed to create upload directory');
    }

    // كتابة الملف
    try {
      await writeFile(filePath, buffer);
      console.log(`File written successfully to: ${filePath}`);
    } catch (error) {
      console.error('Error writing file:', error);
      throw new Error('Failed to write file');
    }

    // إرجاع المسار النسبي للملف
    return `/${folder}/${uniqueName}`;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw new Error('Failed to upload file');
  }
}

export async function deleteImage(url: string): Promise<void> {
  try {
    const fileName = url.split('/').pop();
    if (!fileName) return;

    const filePath = path.join(process.cwd(), 'public', url);
    await writeFile(filePath, '');
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}

export async function uploadImage(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileName = file.name.replace(/\s+/g, '-');
    const finalFileName = `${uniqueSuffix}-${fileName}`;
    
    // إنشاء المسار الكامل للمجلد
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // التأكد من وجود المجلد
    await mkdir(uploadDir, { recursive: true });
    
    // حفظ الملف
    const filePath = path.join(uploadDir, finalFileName);
    await writeFile(filePath, buffer);
    
    // إرجاع المسار النسبي للملف
    return `/uploads/${finalFileName}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('فشل في رفع الصورة');
  }
}
