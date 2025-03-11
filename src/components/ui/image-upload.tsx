'use client';

import { ImageIcon, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface ImageUploadProps {
  image: string | null;
  onImageChange: (file: File | null) => void;
  onImageRemove?: () => void;
  className?: string;
  width?: string;
  height?: string;
}

export function ImageUpload({ 
  image, 
  onImageChange, 
  onImageRemove, 
  className = '',
  width = 'w-full max-w-[4rem]',
  height = 'h-full max-h-[4rem]'
}: ImageUploadProps) {
  return (
    <div className={`relative ${width} ${height} rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border transition-all duration-200 group ${className}`}>
      {image ? (
        <Image
          src={typeof image === 'string' ? image : URL.createObjectURL(image as any)}
          alt="الصورة"
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <ImageIcon className="w-6 h-6" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
        <div className="flex gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-md">
          {image ? (
            <>
              <label className="cursor-pointer w-8 h-8 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImageChange(file);
                  }}
                />
                <Pencil className="w-4 h-4" />
              </label>
              {onImageRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-md bg-destructive/10 hover:bg-destructive/20"
                  onClick={() => onImageRemove()}
                >
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </>
          ) : (
            <label className="cursor-pointer w-8 h-8 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImageChange(file);
                }}
              />
              <Plus className="w-4 h-4" />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
