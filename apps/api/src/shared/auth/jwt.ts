import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}
