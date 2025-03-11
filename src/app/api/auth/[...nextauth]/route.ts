import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import Employee from '@/models/employee.model';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          await connectToDatabase();

          if (!credentials?.email || !credentials?.password) {
            throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
          }

          const employee = await Employee.findOne({ email: credentials.email }).select('+password');
          
          if (!employee) {
            console.log('No employee found with email:', credentials.email);
            throw new Error('البريد الإلكتروني غير صحيح');
          }

          console.log('Comparing passwords for:', credentials.email);
          const isValid = await bcryptjs.compare(credentials.password, employee.password);

          if (!isValid) {
            console.log('Invalid password for:', credentials.email);
            throw new Error('كلمة المرور غير صحيحة');
          }

          if (!employee.isActive) {
            throw new Error('الحساب غير مفعل');
          }

          // تحديث آخر تسجيل دخول
          await Employee.findByIdAndUpdate(employee._id, {
            lastLoginAt: new Date()
          });

          return {
            id: employee._id.toString(),
            email: employee.email,
            name: employee.name,
            permissions: employee.permissions,
            avatar: employee.avatar
          };
        } catch (error: any) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.permissions = user.permissions;
        token.avatar = user.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
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
  }
});

export { handler as GET, handler as POST };
