import { ImageLoader } from 'next/image';

export const customImageLoader: ImageLoader = ({ src, width, quality }) => {
  // Use internal API route for image optimization
  if (src.startsWith('http')) {
    return `/api/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
  }
  return src;
};

export const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return path;
  return `https://res.cloudinary.com/djpgpmk4u/image/upload/${path}`;
};

export default customImageLoader;
