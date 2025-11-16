import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { sendRequest } from "./lib/apis";
import {
  AccountNotActiveError,
  InvalidEmailOrPasswordError,
} from "./lib/errors";

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

          if (!res.user) {
            if (res.status === 401) {
              throw new InvalidEmailOrPasswordError();
            } else if (res.status === 400) {
              throw new AccountNotActiveError();
            } else {
              throw new Error("An unexpected error occurred");
            }
          }

          return res.user;
        } catch (error) {
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
});
