export async function fetchApi(
  path: string,
  request: RequestInit & { noContent: true },
): Promise<void>;

export async function fetchApi<T>(
  path: string,
  request?: RequestInit,
): Promise<T>;

export async function fetchApi<T>(
  path: string,
  request: RequestInit = {},
): Promise<T | void> {
  const response = await fetch("/api" + path, {
    credentials: "include",
    ...request,
  });

  if (!response.ok) {
    const cause = await response.json();
    throw new Error(`Response status: ${response.status}`, { cause });
  }

  if (response.status === 204) {
    return;
  }

  return await response.json();
}
