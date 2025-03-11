import mongoose from 'mongoose';
import '@/lib/models';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://saedb0035:BFIccre9K0C0xLWu@b.ezulz.mongodb.net/?retryWrites=true&w=majority&appName=B";

declare global {
  const __mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

if (!(global as any).__mongooseCache) {
  (global as any).__mongooseCache = { conn: null, promise: null };
}

const cached = (global as any).__mongooseCache;

// زيادة الحد الأقصى للمستمعين
mongoose.connection.setMaxListeners(15);

async function connect() {
  try {
    if (cached.conn) {
      console.log('👌 Using cached MongoDB connection');
      return cached.conn;
    }

    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      serverApi: {
        version: '1' as const,
        strict: true,
        deprecationErrors: true,
      }
    };

    const conn = await mongoose.connect(MONGODB_URI, opts);
    console.log('✅ Successfully connected to MongoDB Atlas!');
    cached.conn = conn;
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection error:', error);
    throw error;
  }
}

export async function connectToDatabase(retries = 3) {
  try {
    if (cached.conn) {
      if (mongoose.connection.readyState === 1) {
        console.log('👌 Using existing MongoDB connection');
        return cached.conn;
      }
      console.log('🔄 Connection lost, reconnecting...');
      cached.conn = null;
      cached.promise = null;
    }

    if (!cached.promise) {
      cached.promise = retry(connect, retries);
    }

    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error('Failed to connect to MongoDB:', error);
    throw new Error('فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.');
  }
}

async function retry(fn: () => Promise<any>, retriesLeft: number, interval = 1000): Promise<any> {
  try {
    return await fn();
  } catch (error) {
    if (retriesLeft === 0) {
      throw error;
    }
    console.log(`Retrying connection... (${retriesLeft} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, interval));
    return retry(fn, retriesLeft - 1, interval * 2); // زيادة فترة الانتظار مع كل محاولة
  }
}

export async function connectToDatabaseSimple() {
  try {
    if (cached.conn) {
      console.log('👌 Using existing MongoDB connection');
      return cached.conn;
    }

    if (!cached.promise) {
      const opts = {
        bufferCommands: false,
      };

      console.log('🔄 Connecting to MongoDB...');
      cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
        console.log('🟢 Mongoose connected to MongoDB');
        return mongoose;
      });
    }

    try {
      cached.conn = await cached.promise;
      console.log('✅ Successfully connected to MongoDB!');
      return cached.conn;
    } catch (e) {
      cached.promise = null;
      console.error('❌ Error connecting to MongoDB:', e);
      throw e;
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// إضافة مراقب للاتصال
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
  // إعادة تعيين الاتصال عند حدوث خطأ
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB');
  // إعادة تعيين الاتصال عند الانقطاع
  cached.conn = null;
  cached.promise = null;
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
