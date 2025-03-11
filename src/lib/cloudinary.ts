import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'djpgpmk4u',
  api_key: '639374485939661',
  api_secret: 'YSuAgPSr6ucjNGVcIyubUF1O2GQ'
});

export async function uploadToCloudinary(file: Buffer, folder: string = 'uploads'): Promise<string | null> {
  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(file);
    });

    return (result as any)?.secure_url || null;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
}