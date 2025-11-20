import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { sendRequest } from "./utils/apis";
import {
  AccountNotActiveError,
  InvalidEmailOrPasswordError,
} from "./utils/errors";
import { redirect } from "next/navigation";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        try {
          const res = await sendRequest({
            method: "POST",
            url: "auth/login",
            body: {
              email: credentials.email,
              password: credentials.password,
            },
          });

          switch (res.statusCode) {
            case 201:
              return res.data.user;
            case 401:
              throw new InvalidEmailOrPasswordError();
            case 400:
              throw new AccountNotActiveError();
            default:
              throw new Error("An unexpected error occurred");
          }
        } catch (error) {
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // User is available during sign-in
        token.user = user as any;
      }
      return token;
    },
    session({ session, token }) {
      if (token.user) {
        session.user = token.user as any;
      }
      return session;
    },
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    },
  },
});
