import { Schema, model, models, Model, Document, Types } from 'mongoose';
import bcryptjs from 'bcryptjs';
import { PERMISSIONS, GENDER } from '@/types/employee';

interface IEmployee extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  jobTitle: string;
  gender: string;
  permissions: string[];
  isActive: boolean;
  avatar?: string;
  isFirstAdmin: boolean;
  lastLoginAt?: Date;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
  meta?: {
    createdOrders: number;
    processedOrders: number;
    createdProducts: number;
    resolvedTickets: number;
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasPermission(permission: string): boolean;
  isAdmin(): boolean;
}

const employeeSchema = new Schema<IEmployee>(
  {
    name: {
      type: String,
      required: [true, 'الاسم مطلوب'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'كلمة المرور مطلوبة'],
      minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'رقم الهاتف مطلوب'],
      trim: true,
    },
    jobTitle: {
      type: String,
      required: [true, 'المسمى الوظيفي مطلوب'],
      trim: true,
    },
    gender: {
      type: String,
      required: [true, 'النوع مطلوب'],
      enum: {
        values: Object.values(GENDER),
        message: 'النوع غير صالح',
      },
    },
    role: {
      type: String,
      trim: true,
    },
    permissions: {
      type: [String],
      required: true,
      validate: {
        validator: function(permissions: string[]) {
          return permissions.every(permission => {
            // التحقق من أن الصلاحية موجودة في تعريفات PERMISSIONS
            return Object.values(PERMISSIONS).includes(permission as any) ||
                   // أو أنها تتبع النمط section.action
                   /^[a-z]+\.(view|create|edit|delete|reply)$/.test(permission);
          });
        },
        message: 'الصلاحيات غير صالحة'
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
    },
    meta: {
      createdOrders: {
        type: Number,
        default: 0,
      },
      processedOrders: {
        type: Number,
        default: 0,
      },
      createdProducts: {
        type: Number,
        default: 0,
      },
      resolvedTickets: {
        type: Number,
        default: 0,
      },
    },
    lastLoginAt: {
      type: Date,
    },
    isFirstAdmin: {
      type: Boolean,
      default: false,
      // منع تعديل هذا الحقل بعد الإنشاء
      immutable: true
    },
  },
  {
    timestamps: true,
  }
);

// هوك قبل الحفظ لتشفير كلمة المرور
employeeSchema.pre('save', async function(this: IEmployee, next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    if (!this.get('password').startsWith('$2a$')) {
      this.set('password', await bcryptjs.hash(this.get('password'), 12));
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

// إضافة هوك قبل الحفظ للتحقق من المدير الأول
employeeSchema.pre('save', async function(this: IEmployee, next) {
  try {
    if (this.isNew) {
      const EmployeeModel = this.constructor as Model<IEmployee>;
      const existingFirstAdmin = await EmployeeModel.findOne({ isFirstAdmin: true });
      
      if (!existingFirstAdmin && this.get('permissions').includes('ALL')) {
        this.set('isFirstAdmin', true);
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// دالة للتحقق من صحة كلمة المرور
employeeSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// دالة للتحقق من صلاحيات الموظف
employeeSchema.methods.hasPermission = function (permission: string): boolean {
  return this.permissions.includes('ALL') || this.permissions.includes(permission);
};

// دالة للتحقق من أن الموظف مدير
employeeSchema.methods.isAdmin = function (): boolean {
  return this.permissions.includes('ALL');
};

const Employee = models.Employee || model<IEmployee>('Employee', employeeSchema);
export type EmployeeModel = Model<IEmployee>;
export default Employee as EmployeeModel;
