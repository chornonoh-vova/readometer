import { describe, it, expect } from "vitest";
import { handlers } from "./index.ts";
import { handleVerificationEmailRequested } from "./verification-email.ts";
import { handlePasswordResetRequested } from "./password-reset.ts";

describe("handlers", () => {
  it("maps every notification event type to its handler", () => {
    expect(Object.keys(handlers).sort()).toEqual(
      ["password-reset-requested", "verification-email-requested"].sort(),
    );
    expect(handlers["verification-email-requested"]).toBe(
      handleVerificationEmailRequested,
    );
    expect(handlers["password-reset-requested"]).toBe(
      handlePasswordResetRequested,
    );
  });
});
