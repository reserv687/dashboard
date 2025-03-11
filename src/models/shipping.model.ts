import { Document, Schema, model, models } from "mongoose";

// تعريف واجهة قواعد الشحن
interface ShippingRule {
  type: "weight" | "price" | "distance";
  minValue?: number;
  maxValue?: number;
  additionalCost: number;
}

// تعريف واجهة طريقة الشحن
export interface IShipping extends Document {
  name: string;
  description?: string;
  baseCost: number;
  minCost: number;
  maxCost: number;
  estimatedDeliveryMin: number;
  estimatedDeliveryMax: number;
  rules: ShippingRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// مخطط قواعد الشحن
const shippingRuleSchema = new Schema<ShippingRule>({
  type: { type: String, enum: ["weight", "price", "distance"], required: true },
  minValue: { type: Number },
  maxValue: { type: Number },
  additionalCost: { type: Number, required: true },
});

// مخطط طريقة الشحن
const shippingSchema = new Schema<IShipping>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    baseCost: { type: Number, required: true, min: 0 },
    minCost: { type: Number, min: 0 },
    maxCost: { type: Number },
    estimatedDeliveryMin: { type: Number, required: true },
    estimatedDeliveryMax: { type: Number, required: true },
    rules: [shippingRuleSchema], // استخدام مخطط القواعد
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true } // ✅ يضيف createdAt و updatedAt تلقائيًا
);

// التحقق من صحة maxCost و minCost قبل الحفظ
shippingSchema.pre("save", function (next) {
  if (this.maxCost && this.minCost && this.maxCost < this.minCost) {
    return next(new Error("يجب أن يكون الحد الأقصى للتكلفة أكبر من الحد الأدنى"));
  }
  next();
});

// إنشاء الموديل
const Shipping = models.Shipping || model<IShipping>("Shipping", shippingSchema);

export default Shipping;
