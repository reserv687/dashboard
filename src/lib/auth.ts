import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from './db';
import Employee from '@/models/employee.model';
import bcryptjs from 'bcryptjs';
import type { AuthOptions } from 'next-auth';

// JWT Secret validation
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set');
}

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function encrypt(payload: any) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1d')
    .sign(secretKey);
  
  return token;
}

export async function decrypt(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    console.error('Error decrypting token:', error);
    return null;
  }
}

export async function getSession() {
  try {
    const cookieStore = cookies();
    // تغيير اسم الكوكي ليتناسب مع لوحة التحكم بدلًا من المتجر
    const token = cookieStore.get('dashboard-auth-token');
    
    if (!token?.value) {
      return null;
    }
    
    const session = await decrypt(token.value);
    
    if (!session || !session.id || !session.email) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Removing the unused CustomSession interface

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
          }

          await connectToDatabase();

          const employee = await Employee.findOne({ email: credentials.email });
          if (!employee) {
            throw new Error('البريد الإلكتروني غير صحيح');
          }

          if (!employee.isActive) {
            throw new Error('الحساب غير مفعل');
          }

          const isPasswordValid = await bcryptjs.compare(
            credentials.password,
            employee.password
          );

          if (!isPasswordValid) {
            throw new Error('كلمة المرور غير صحيحة');
          }

          return {
            id: (employee._id as any).toString(),
            name: employee.name,
            email: employee.email,
            permissions: employee.permissions,
            avatar: employee.avatar,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.permissions = user.permissions;
        token.avatar = user.avatar;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.permissions = token.permissions;
        session.user.avatar = token.avatar;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper function to validate token
export async function validateToken(token: string) {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error('NEXTAUTH_SECRET environment variable is not set');
    }

    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

export async function validateRequest(req: NextRequest) {
  try {
    // تغيير الكوكي إلى next-auth.session-token
    const token = req.cookies.get('next-auth.session-token')?.value;
    
    if (!token) {
      console.log('No token found in cookies:', req.cookies.getAll());
      return null;
    }

    const decoded = await validateToken(token); // استخدام validateToken بدلاً من decrypt
    if (!decoded) {
      console.log('Invalid token');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Error validating request:', error);
    return null;
  }
}
