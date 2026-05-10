import { SignJWT, jwtVerify } from "jose";

export interface JwtPayload {
  sub: string;  // userId
  org: string;  // orgId
  role: string;
  jti: string;
}

export async function signJwt(payload: Omit<JwtPayload, "jti">, secret: string, expiresIn = "30d"): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ org: payload.org, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setJti(crypto.randomUUID())
    .sign(key);
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return {
    sub: payload.sub as string,
    org: payload["org"] as string,
    role: payload["role"] as string,
    jti: payload.jti as string,
  };
}
