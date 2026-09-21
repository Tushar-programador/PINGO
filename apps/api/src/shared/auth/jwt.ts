import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
}

const secret = process.env.JWT_ACCESS_SECRET;
if (!secret) {
  throw new Error('JWT_ACCESS_SECRET is not set');
}
const ACCESS_SECRET = secret;
const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}
