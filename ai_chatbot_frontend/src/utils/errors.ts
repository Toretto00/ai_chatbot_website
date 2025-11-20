import { AuthError } from "next-auth";

export class CustomAuthError extends AuthError {
  static type: string;

  constructor(message?: any) {
    super();

    this.type = message;
  }
}

export class InvalidEmailOrPasswordError extends AuthError {
  static type = "INVALID_EMAIL_OR_PASSWORD";
}

export class AccountNotActiveError extends AuthError {
  static type = "ACCOUNT_NOT_ACTIVE";
}
