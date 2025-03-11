'use client';

import dynamic from 'next/dynamic';

// Dynamically import the LocationPicker component with ssr disabled
export const ClientLocationPicker = dynamic(
  () => import('./location-picker').then((mod) => mod.LocationPicker),
  { ssr: false }
);