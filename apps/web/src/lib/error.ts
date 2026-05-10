export function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  if (
    error.cause &&
    typeof error.cause === "object" &&
    "message" in error.cause &&
    typeof error.cause.message === "string"
  ) {
    return error.cause.message;
  }

  return error.message;
}
