import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
const mockSignInEmail = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { email: mockSignInEmail } },
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
});

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { email = "user@example.com", password = "password123" } = {},
) {
  await user.type(screen.getByRole("textbox", { name: "Email" }), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm redirect="/" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders a Remember me checkbox", () => {
    render(<LoginForm redirect="/" />);
    expect(screen.getByRole("checkbox", { name: /remember me/i })).toBeInTheDocument();
  });

  it("renders the Sign in submit button", () => {
    render(<LoginForm redirect="/" />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders a link to the register page", () => {
    render(<LoginForm redirect="/" />);
    const link = screen.getByRole("link", { name: /register/i });
    expect(link).toHaveAttribute("href", "/register");
  });

  it("calls authClient.signIn.email with credentials on submit", async () => {
    mockSignInEmail.mockImplementation(() => {});
    const user = userEvent.setup();
    render(<LoginForm redirect="/app" />);

    await fillAndSubmit(user);

    expect(mockSignInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.com", password: "password123" }),
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

    await user.type(screen.getByRole("textbox", { name: "Email" }), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockSignInEmail).not.toHaveBeenCalled();
  });

  it("does not submit with a short password", async () => {
    const user = userEvent.setup();
    render(<LoginForm redirect="/" />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockSignInEmail).not.toHaveBeenCalled();
  });
});
