import { authClient } from "./auth-client";
import { getErrorMessage } from "./error";

export async function signInWithGoogle(
  callbackURL: string,
  setErrorMessage: (msg: string) => void,
  setLoading: (loading: boolean) => void,
) {
  setErrorMessage("");
  setLoading(true);
  try {
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
    if (error) {
      setErrorMessage(
        getErrorMessage(error) ?? "Something went wrong. Please try again.",
      );
    }
  } catch (error) {
    setErrorMessage(
      getErrorMessage(error) ?? "Something went wrong. Please try again.",
    );
  } finally {
    setLoading(false);
  }
}
