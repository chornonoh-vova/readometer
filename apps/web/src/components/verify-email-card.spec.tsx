import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
const mockSendVerificationEmail = vi.fn();
const mockSignOut = vi.fn();
const mockUseSession = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    sendVerificationEmail: mockSendVerificationEmail,
    signOut: mockSignOut,
    useSession: mockUseSession,
  },
}));

const { VerifyEmailCard } = await import("./verify-email-card");

beforeEach(() => {
  mockNavigate.mockClear();
  mockSignOut.mockClear();
  mockSendVerificationEmail.mockReset();
  mockSendVerificationEmail.mockResolvedValue({ data: { status: true } });
  mockUseSession.mockReset();
  mockUseSession.mockReturnValue({ data: null });
});

const clickResend = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: /resend/i }));

describe("VerifyEmailCard", () => {
  it("shows the address from the search param when there is no session", () => {
    render(<VerifyEmailCard email="me@example.com" />);

    expect(screen.getByText("me@example.com")).toBeInTheDocument();
  });

  it("prefers the session address over the search param", () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "session@example.com", emailVerified: false } },
    });

    render(<VerifyEmailCard email="stale@example.com" />);

    expect(screen.getByText("session@example.com")).toBeInTheDocument();
    expect(screen.queryByText("stale@example.com")).not.toBeInTheDocument();
  });

  it("resends the verification email for the resolved address", async () => {
    const user = userEvent.setup();
    render(<VerifyEmailCard email="me@example.com" />);

    await clickResend(user);

    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      email: "me@example.com",
      callbackURL: "/verify-email",
    });
    // Hedged copy: an already-verified address gets a success response with no
    // email actually sent, so this must not promise delivery.
    expect(
      await screen.findByText(/if that address still needs verifying/i),
    ).toBeInTheDocument();
  });

  it("surfaces a resend failure", async () => {
    const user = userEvent.setup();
    mockSendVerificationEmail.mockResolvedValue({
      error: { message: "Something broke", status: 500 },
    });
    render(<VerifyEmailCard email="me@example.com" />);

    await clickResend(user);

    expect(await screen.findByText("Something broke")).toBeInTheDocument();
  });

  it("explains a rate-limited resend instead of leaking the raw error", async () => {
    const user = userEvent.setup();
    mockSendVerificationEmail.mockResolvedValue({
      error: { message: "Too many requests", status: 429 },
    });
    render(<VerifyEmailCard email="me@example.com" />);

    await clickResend(user);

    expect(await screen.findByText(/wait a minute/i)).toBeInTheDocument();
  });

  it("threads a deep link through the callbackURL", async () => {
    const user = userEvent.setup();
    render(<VerifyEmailCard email="me@example.com" redirect="/books/abc" />);

    await clickResend(user);

    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      email: "me@example.com",
      callbackURL: "/verify-email?redirect=%2Fbooks%2Fabc",
    });
  });

  it("refuses an off-site redirect in the callbackURL", async () => {
    const user = userEvent.setup();
    render(
      <VerifyEmailCard email="me@example.com" redirect="//evil.example/x" />,
    );

    await clickResend(user);

    expect(mockSendVerificationEmail).toHaveBeenCalledWith({
      email: "me@example.com",
      callbackURL: "/verify-email",
    });
  });

  it("explains an expired verification link", () => {
    render(<VerifyEmailCard email="me@example.com" error="TOKEN_EXPIRED" />);

    expect(screen.getByText(/link has expired/i)).toBeInTheDocument();
  });

  it("falls back to a generic message for an unknown link error", () => {
    render(<VerifyEmailCard email="me@example.com" error="WAT" />);

    expect(screen.getByText(/could not be used/i)).toBeInTheDocument();
  });

  it("still shows feedback when a thrown error carries a blank message", async () => {
    const user = userEvent.setup();
    mockSendVerificationEmail.mockRejectedValue(new Error(""));
    render(<VerifyEmailCard email="me@example.com" />);

    await clickResend(user);

    expect(
      await screen.findByText(/something went wrong/i),
    ).toBeInTheDocument();
  });

  it("offers no resend when no address is known", () => {
    render(<VerifyEmailCard />);

    expect(
      screen.queryByRole("button", { name: /resend/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("signs out and returns to login when a session exists", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      data: { user: { email: "me@example.com", emailVerified: false } },
    });
    mockSignOut.mockResolvedValue({});
    render(<VerifyEmailCard />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
  });
});
