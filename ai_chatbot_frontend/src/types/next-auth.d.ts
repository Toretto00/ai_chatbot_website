import { DefaultSession } from "next-auth";

interface AppUser {
  id: string;
  email: string;
  name: string;
  accessToken?: string;
}

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & AppUser;
  }

  interface User extends AppUser {}
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: AppUser;
  }
}

