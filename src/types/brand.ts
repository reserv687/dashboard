import { Document } from 'mongoose';

export interface IBrand extends Document {
  name: string;
  slug: string;
  description?: string;
  logo?: {
    url: string;
    alt: string;
  };
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}