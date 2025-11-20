"use server";
import { signIn } from "@/auth";
import { InvalidEmailOrPasswordError } from "./errors";

export async function authenticate(email: string, password: string) {
  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return {
      status: 200,
      code: "SUCCESS",
      message: "Login successful",
    };
  } catch (error) {
    if ((error as any).type === "INVALID_EMAIL_OR_PASSWORD") {
      return {
        status: 401,
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      };
    } else if ((error as any).type === "ACCOUNT_NOT_ACTIVE") {
      return {
        status: 400,
        code: "ACCOUNT_NOT_ACTIVE",
        message: "Account not active",
      };
    } else {
      return {
        status: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      };
    }
  }
}
