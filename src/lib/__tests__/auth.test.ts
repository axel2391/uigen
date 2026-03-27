// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock server-only so it doesn't throw in test environment
vi.mock("server-only", () => ({}));

// Mock next/headers
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an httpOnly cookie with a JWT token", async () => {
    await createSession("user-123", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [cookieName, token, options] = mockCookieStore.set.mock.calls[0];

    expect(cookieName).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // valid JWT format
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expires in approximately 7 days", async () => {
    const before = Date.now();
    await createSession("user-123", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiresAt: Date = options.expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("token contains userId and email", async () => {
    await createSession("user-abc", "test@test.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-abc");
    expect(payload.email).toBe("test@test.com");
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const payload = {
      userId: "user-123",
      email: "user@example.com",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const token = await makeToken(payload);
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("user@example.com");
  });

  test("returns null for an expired token", async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 10; // 10 seconds in the past
    const token = await makeToken({ userId: "user-123", email: "a@b.com" }, expiredAt);
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for a tampered/invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid.token.value" });

    const session = await getSession();

    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledOnce();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  test("returns null when request has no auth cookie", async () => {
    const request = new NextRequest("http://localhost/");

    const session = await verifySession(request);

    expect(session).toBeNull();
  });

  test("returns session payload for a valid token in request cookie", async () => {
    const payload = {
      userId: "user-456",
      email: "req@example.com",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const token = await makeToken(payload);

    const request = new NextRequest("http://localhost/", {
      headers: { cookie: `auth-token=${token}` },
    });

    const session = await verifySession(request);

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-456");
    expect(session?.email).toBe("req@example.com");
  });

  test("returns null for an expired token in request", async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 10;
    const token = await makeToken({ userId: "u", email: "e@e.com" }, expiredAt);

    const request = new NextRequest("http://localhost/", {
      headers: { cookie: `auth-token=${token}` },
    });

    const session = await verifySession(request);

    expect(session).toBeNull();
  });

  test("returns null for an invalid token in request", async () => {
    const request = new NextRequest("http://localhost/", {
      headers: { cookie: "auth-token=bad.token.here" },
    });

    const session = await verifySession(request);

    expect(session).toBeNull();
  });
});
