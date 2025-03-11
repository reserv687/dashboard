'use client';

import { IconPhoto, IconPencil, IconPlus, IconX, IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface ImageUploadProps {
  image: string | null;
  onImageChange: (file: File | null) => void;
  onImageRemove: () => Promise<void>;
  className?: string;
  width?: string;
  height?: string;
  isDisabled?: boolean;
}

export function ImageUpload({ 
  image, 
  onImageChange, 
  onImageRemove, 
  className = '',
  width = 'w-16',
  height = 'h-16',
  isDisabled = false
}: ImageUploadProps) {
  return (
    <div className={`relative ${width} ${height} rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border transition-all duration-200 group ${className}`}>
      {image ? (
        <Image
          src={typeof image === 'string' ? image : URL.createObjectURL(image as any)}
          alt="الصورة"
          layout="responsive"
          width={96}
          height={96}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <IconPhoto className="w-6 h-6" />
        </div>
      )}
      
      {/* Loading overlay */}
      {isDisabled && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-10">
          <IconLoader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}
      <div className={`absolute inset-0 flex items-center justify-center opacity-0 ${!isDisabled && 'group-hover:opacity-100'} transition-all duration-200 ${isDisabled ? 'pointer-events-none' : ''}`}>
        <div className="flex gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-md">
          {image ? (
            <>
              <label className="cursor-pointer w-8 h-8 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isDisabled}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImageChange(file);
                  }}
                />
                <IconPencil className="w-4 h-4" />
              </label>
              {onImageRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDisabled}
                  className="w-8 h-8 rounded-md bg-destructive/10 hover:bg-destructive/20"
                  onClick={() => onImageRemove()}
                >
                  <IconX className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </>
          ) : (
            <label className="cursor-pointer w-8 h-8 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isDisabled}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImageChange(file);
                }}
              />
              <IconPlus className="w-4 h-4" />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
