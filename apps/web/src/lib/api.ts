export async function fetchApi(
  path: string,
  request: RequestInit = {},
): Promise<Response> {
  return fetch(import.meta.env.VITE_API_URL + path, {
    credentials: "include",
    ...request,
  });
}
