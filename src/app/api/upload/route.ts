import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return new NextResponse('No file provided', { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return new NextResponse('Invalid file type', { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadToCloudinary(buffer, folder);

    if (!imageUrl) {
      return new NextResponse('Failed to upload image', { status: 500 });
    }

    return NextResponse.json({ url: imageUrl });
  } catch (error: any) {
    console.error('[UPLOAD_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}
