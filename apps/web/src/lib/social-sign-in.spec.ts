import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSignInSocial = vi.fn();

vi.mock("./auth-client", () => ({
  authClient: { signIn: { social: mockSignInSocial } },
}));

const { signInWithSocial } = await import("./social-sign-in");
type SocialProvider = Parameters<typeof signInWithSocial>[0];

const PROVIDERS: SocialProvider[] = ["google", "apple"];

function spies() {
  return { setErrorMessage: vi.fn(), setLoading: vi.fn() };
}

beforeEach(() => {
  mockSignInSocial.mockReset();
});

describe.each(PROVIDERS)("signInWithSocial(%s)", (provider) => {
  it("starts the social flow for that provider alone", async () => {
    mockSignInSocial.mockResolvedValue({ error: null });
    const { setErrorMessage, setLoading } = spies();

    await signInWithSocial(provider, setErrorMessage, setLoading);

    expect(mockSignInSocial).toHaveBeenCalledTimes(1);
    expect(mockSignInSocial).toHaveBeenCalledWith({ provider });
  });

  it("clears a stale error and raises the loading flag first", async () => {
    mockSignInSocial.mockResolvedValue({ error: null });
    const { setErrorMessage, setLoading } = spies();

    await signInWithSocial(provider, setErrorMessage, setLoading);

    expect(setErrorMessage).toHaveBeenCalledWith("");
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
  });

  it("lowers the loading flag once the call settles", async () => {
    mockSignInSocial.mockResolvedValue({ error: null });
    const { setErrorMessage, setLoading } = spies();

    await signInWithSocial(provider, setErrorMessage, setLoading);

    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it("surfaces the message from a returned error", async () => {
    mockSignInSocial.mockResolvedValue({
      error: new Error(`${provider} rejected the request`),
    });
    const { setErrorMessage, setLoading } = spies();

    await signInWithSocial(provider, setErrorMessage, setLoading);

    expect(setErrorMessage).toHaveBeenLastCalledWith(
      `${provider} rejected the request`,
    );
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it("surfaces a thrown error and still lowers the loading flag", async () => {
    mockSignInSocial.mockRejectedValue(new Error("Network down"));
    const { setErrorMessage, setLoading } = spies();

    await signInWithSocial(provider, setErrorMessage, setLoading);

    expect(setErrorMessage).toHaveBeenLastCalledWith("Network down");
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it("prefers the cause message the api puts the real reason in", async () => {
    const error = new Error("Request failed", {
      cause: { message: "This email provider is not supported" },
    });
    mockSignInSocial.mockResolvedValue({ error });
    const { setErrorMessage, setLoading } = spies();

    await signInWithSocial(provider, setErrorMessage, setLoading);

    expect(setErrorMessage).toHaveBeenLastCalledWith(
      "This email provider is not supported",
    );
  });
});
