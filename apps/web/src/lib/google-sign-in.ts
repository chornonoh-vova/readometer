import { authClient } from "./auth-client";
import { getErrorMessage } from "./error";

export async function signInWithGoogle(
  setErrorMessage: (msg: string) => void,
  setLoading: (loading: boolean) => void,
) {
  setErrorMessage("");
  setLoading(true);
  try {
    const { error } = await authClient.signIn.social({
      provider: "google",
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
