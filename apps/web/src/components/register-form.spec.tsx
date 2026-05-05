import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
const mockSignUpEmail = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signUp: { email: mockSignUpEmail } },
}));

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" onClick={() => onSuccess("test-token")}>
      Complete captcha
    </button>
  ),
}));

const { RegisterForm } = await import("./register-form");

beforeEach(() => {
  mockNavigate.mockClear();
  mockSignUpEmail.mockClear();
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "Name" }), "Alice Smith");
  await user.type(screen.getByRole("textbox", { name: "Email" }), "alice@example.com");
  await user.type(screen.getByLabelText("Password"), "securepassword");
  await user.click(screen.getByRole("button", { name: /sign up/i }));
}

describe("RegisterForm", () => {
  it("renders name, email, and password fields", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders the Sign up submit button", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  it("renders a link to the login page", () => {
    render(<RegisterForm />);
    const link = screen.getByRole("link", { name: /login/i });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("calls authClient.signUp.email with credentials on submit", async () => {
    mockSignUpEmail.mockImplementation(() => {});
    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user);

    expect(mockSignUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Alice Smith",
        email: "alice@example.com",
        password: "securepassword",
      }),
    );
  });

  it("navigates to / on successful sign up", async () => {
    mockSignUpEmail.mockImplementation(({ fetchOptions }) =>
      fetchOptions.onSuccess(),
    );

    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillAndSubmit(user);

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("shows error message when registration fails", async () => {
    mockSignUpEmail.mockImplementation(({ fetchOptions }) =>
      fetchOptions.onError({ error: { message: "Email already in use" } }),
    );

    const user = userEvent.setup();
    render(<RegisterForm />);
    await fillAndSubmit(user);

    expect(screen.getByText("Email already in use")).toBeInTheDocument();
  });

  it("does not submit with a short password", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Alice");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("does not submit with an empty name", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });
});
