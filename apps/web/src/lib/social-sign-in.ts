import { authClient } from "./auth-client";
import { getErrorMessage } from "./error";

export type SocialProvider = "google" | "apple";

/**
 * On success the browser leaves for the provider, so `setLoading(false)` only
 * ever runs on the paths that keep the user on this page.
 */
export async function signInWithSocial(
  provider: SocialProvider,
  setErrorMessage: (msg: string) => void,
  setLoading: (loading: boolean) => void,
) {
  setErrorMessage("");
  setLoading(true);
  try {
    const { error } = await authClient.signIn.social({ provider });
    if (error) {
      setErrorMessage(getErrorMessage(error));
    }
  } catch (error) {
    setErrorMessage(getErrorMessage(error));
  } finally {
    setLoading(false);
  }
}
