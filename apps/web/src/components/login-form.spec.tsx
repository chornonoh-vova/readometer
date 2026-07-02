import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
const mockSignInEmail = vi.fn();
const mockSignInSocial = vi.fn();
const mockGetLastUsedLoginMethod = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: mockSignInEmail, social: mockSignInSocial },
    getLastUsedLoginMethod: mockGetLastUsedLoginMethod,
  },
}));

vi.mock("@/assets/icons/google.svg?react", () => ({
  default: () => null,
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" onClick={() => onSuccess("test-token")}>
      Complete captcha
    </button>
  ),
}));

const { LoginForm } = await import("./login-form");

beforeEach(() => {
  mockNavigate.mockClear();
  mockSignInEmail.mockClear();
  mockSignInSocial.mockClear();
  mockGetLastUsedLoginMethod.mockReset();
  mockGetLastUsedLoginMethod.mockReturnValue(null);
});

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { email = "user@example.com", password = "password123" } = {},
) {
  await user.type(screen.getByRole("textbox", { name: "Email" }), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in with email" }));
}

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm redirect="/" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders a Remember me checkbox", () => {
    render(<LoginForm redirect="/" />);
    expect(
      screen.getByRole("checkbox", { name: /remember me/i }),
    ).toBeInTheDocument();
  });

  it("renders the Sign in submit button", () => {
    render(<LoginForm redirect="/" />);
    expect(
      screen.getByRole("button", { name: "Sign in with email" }),
    ).toBeInTheDocument();
  });

  it("renders a link to the register page", () => {
    render(<LoginForm redirect="/" />);
    const link = screen.getByRole("link", { name: /create an account/i });
    expect(link).toHaveAttribute("href", "/register");
  });

  it("calls authClient.signIn.email with credentials on submit", async () => {
    mockSignInEmail.mockImplementation(() => {});
    const user = userEvent.setup();
    render(<LoginForm redirect="/app" />);

    await fillAndSubmit(user);

    expect(mockSignInEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        password: "password123",
      }),
    );
  });

  it("navigates to redirect on successful sign in", async () => {
    mockSignInEmail.mockImplementation(({ fetchOptions }) =>
      fetchOptions.onSuccess(),
    );

    const user = userEvent.setup();
    render(<LoginForm redirect="/dashboard" />);
    await fillAndSubmit(user);

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });

  it("shows error message when auth fails", async () => {
    mockSignInEmail.mockImplementation(({ fetchOptions }) =>
      fetchOptions.onError({ error: { message: "Invalid credentials" } }),
    );

    const user = userEvent.setup();
    render(<LoginForm redirect="/" />);
    await fillAndSubmit(user);

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("does not submit with invalid email", async () => {
    const user = userEvent.setup();
    render(<LoginForm redirect="/" />);

    await user.type(
      screen.getByRole("textbox", { name: "Email" }),
      "not-an-email",
    );
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: "Sign in with email" }),
    );

    expect(mockSignInEmail).not.toHaveBeenCalled();
  });

  it("does not submit with a short password", async () => {
    const user = userEvent.setup();
    render(<LoginForm redirect="/" />);

    await user.type(
      screen.getByRole("textbox", { name: "Email" }),
      "user@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(
      screen.getByRole("button", { name: "Sign in with email" }),
    );

    expect(mockSignInEmail).not.toHaveBeenCalled();
  });

  it("renders a Sign in with Google button", () => {
    render(<LoginForm redirect="/" />);
    expect(
      screen.getByRole("button", { name: /sign in with google/i }),
    ).toBeInTheDocument();
  });

  it("calls authClient.signIn.social with google provider", async () => {
    mockSignInSocial.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<LoginForm redirect="/dashboard" />);

    await user.click(
      screen.getByRole("button", { name: /sign in with google/i }),
    );

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: "google",
    });
  });

  it("does not render a Last used badge when no login method is stored", () => {
    mockGetLastUsedLoginMethod.mockReturnValue(null);
    render(<LoginForm redirect="/" />);

    expect(screen.queryByText("Last used")).not.toBeInTheDocument();
  });

  it.each([
    {
      method: "google",
      lastUsedName: /sign in with google/i,
      otherName: "Sign in with email",
    },
    {
      method: "email",
      lastUsedName: /sign in with email/i,
      otherName: /sign in with google/i,
    },
  ])(
    "renders a Last used badge on the $method button when $method was the last method",
    ({ method, lastUsedName, otherName }) => {
      mockGetLastUsedLoginMethod.mockReturnValue(method);
      render(<LoginForm redirect="/" />);

      const lastUsedButton = screen.getByRole("button", {
        name: lastUsedName,
      });
      expect(within(lastUsedButton).getByText("Last used")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: otherName }),
      ).not.toHaveTextContent("Last used");
    },
  );
});
