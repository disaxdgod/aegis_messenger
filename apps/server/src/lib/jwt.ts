import type { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export type AccessTokenClaims = JwtPayload & {
  sub: string;
  username: string;
};

export function signAccessToken(userId: string, username: string): string {
  const options: SignOptions = {
    subject: userId,
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign({ username }, env.jwtSecret as Secret, options);
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const decoded = jwt.verify(token, env.jwtSecret as Secret);
  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Invalid token payload");
  }
  const username =
    typeof (decoded as { username?: unknown }).username === "string"
      ? (decoded as AccessTokenClaims).username
      : "";
  return { ...decoded, sub: decoded.sub, username } as AccessTokenClaims;
}
