import { API_BASE_URL } from "../env";

/**
 * Typed HTTP client for the FastAPI backend.
 *
 * Application/business data must always go through this client so that
 * the frontend never talks to tenant business data stores directly.
 * Supabase Auth is the deliberate exception and will be wired
 * separately in the authentication phase.
 */

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
  options: RequestInit & { retries?: number } = {}
): Promise<T> {
  const { retries = 0, ...fetchOptions } = options;
  const REQUEST_TIMEOUT_MS = 10_000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
        return (await response.json()) as T;
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
        body
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      lastError = error;

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new NetworkError(lastError);
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: "GET" });
  },
};
