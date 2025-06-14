import { QueryClient, QueryFunction } from "@tanstack/react-query";

export type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const API_BASE_URL = "https://51ab2663-1922-45a4-9cd0-6438c10cad6e-00-1ccr9928hu4r6.janeway.replit.dev";
    const res = await fetch(`${API_BASE_URL}${queryKey[0]}`, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const apiRequest = async (
  method: string,
  url: string,
  body?: any
): Promise<Response> => {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
};

const throwIfResNotOk = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Something went wrong");
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
