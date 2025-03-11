import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      permissions?: string[];
      avatar?: string;
    } & DefaultSession['user']
  }

  interface User {
    id: string;
    permissions?: string[];
    avatar?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    permissions?: string[];
    avatar?: string;
  }
}
