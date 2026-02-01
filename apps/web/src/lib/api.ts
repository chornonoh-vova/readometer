export async function fetchApi<T>(
  path: string,
  request: RequestInit = {},
): Promise<T> {
  const response = await fetch(import.meta.env.VITE_API_URL + path, {
    credentials: "include",
    ...request,
  });

  if (!response.ok) {
    const cause = await response.json();
    throw new Error(`Response status: ${response.status}`, { cause });
  }

  return await response.json();
}
