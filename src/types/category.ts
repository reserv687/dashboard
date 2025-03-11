import { Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: {
    url: string;
    alt: string;
  };
  parentId?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}