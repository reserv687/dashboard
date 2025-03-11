import mongoose from 'mongoose';

const heroSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'عنوان الشريحة مطلوب'],
  },
  subtitle: {
    type: String,
    default: '',
  },
  image: {
    url: {
      type: String,
      required: [true, 'صورة الشريحة مطلوبة'],
    },
    alt: {
      type: String,
      default: '',
    },
  },
  buttonText: {
    type: String,
    default: '',
  },
  buttonLink: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// تصدير النموذج مباشرة
export default mongoose.models.Hero || mongoose.model('Hero', heroSchema);
