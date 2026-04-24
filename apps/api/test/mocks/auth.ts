import { vi } from "vitest";
import { auth } from "../../src/lib/auth";

type TestUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

let currentUser: TestUser | null = null;

export function setAuthenticatedUser(user: TestUser | null) {
  currentUser = user;
}

export function installAuthMock() {
  (
    auth.api as unknown as { getSession: typeof auth.api.getSession }
  ).getSession = vi.fn(async () => {
    if (!currentUser) return null;
    return {
      user: currentUser,
      session: {
        id: "test-session-id",
        userId: currentUser.id,
        token: "test-token",
        expiresAt: new Date(Date.now() + 3_600_000),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
    };
  }) as unknown as typeof auth.api.getSession;
}
