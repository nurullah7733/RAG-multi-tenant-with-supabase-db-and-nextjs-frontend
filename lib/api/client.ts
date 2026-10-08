import { API_BASE_URL } from "../env";

export class ApiError extends Error {
  readonly status: number;
  readonly error: unknown;

  constructor(message: string, status: number, error?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.error = error;
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Network request to the API failed", { cause });
    this.name = "NetworkError";
  }
}

export type ApiErrorBody = {
  error: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

function extractErrorPayload(body: unknown): {
  code?: string;
  message?: string;
  details?: unknown;
} {
  if (body && typeof body === "object" && "error" in body) {
    const payload = body as ApiErrorBody;
    if (payload.error && typeof payload.error === "object") {
      return {
        code: payload.error.code,
        message: payload.error.message,
        details: payload.error.details,
      };
    }
  }

  return {};
}

async function request<T>(
  path: string,
  options: RequestInit & { retries?: number; timeoutMs?: number } = {},
): Promise<T> {
  const { retries = 0, timeoutMs = 10_000, ...fetchOptions } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...fetchOptions.headers,
        },
      });

      if (response.ok) {
        if (response.status === 204) return undefined as T;
        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as T;
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = undefined;
      }

      const { message } = extractErrorPayload(body);

      throw new ApiError(
        message ?? `Request to ${path} failed`,
        response.status,
        body,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      lastError = error;

      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 250 * (attempt + 1)),
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new NetworkError(lastError);
}

export const apiClient = {
  post<T>(path: string, body: unknown, options: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
    return request<T>(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
      headers: { ...options.headers, "Content-Type": "application/json" },
    });
  },
  postForm<T>(
    path: string,
    body: FormData,
    options: RequestInit = {},
  ): Promise<T> {
    return request<T>(path, { ...options, method: "POST", body });
  },
  delete<T = void>(path: string, options: RequestInit = {}): Promise<T> {
    return request<T>(path, { ...options, method: "DELETE" });
  },
  get<T>(path: string, options: RequestInit = {}): Promise<T> {
    return request<T>(path, { ...options, method: "GET" });
  },
};
