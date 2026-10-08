
/* ============================================================
   AFROBASE CLOUD HTTP TRANSPORT

   CLOUD02-A / BATCH 2

   Responsibilities:
   - Validate API origin
   - Send JSON HTTP requests
   - Enforce request timeouts
   - Parse API responses
   - Normalize errors

   No credential persistence.
   No console logging of secrets.
   No direct Convex dependency.
============================================================ */

export const DEFAULT_AFROBASE_API_URL =
  "https://impressive-clam-161.convex.site";

export class CloudHttpError extends Error {
  constructor(
    message,
    {
      status = null,
      code = "cloud_request_failed",
    } = {},
  ) {
    super(message);

    this.name = "CloudHttpError";
    this.status = status;
    this.code = code;
  }
}

export function normalizeCloudApiUrl(value) {
  const candidate =
    value ?? DEFAULT_AFROBASE_API_URL;

  if (
    typeof candidate !== "string" ||
    !candidate.trim()
  ) {
    throw new CloudHttpError(
      "Afrobase API URL must be a non-empty string.",
      { code: "invalid_api_url" },
    );
  }

  let url;

  try {
    url = new URL(candidate);
  } catch {
    throw new CloudHttpError(
      "Afrobase API URL must be an absolute HTTP(S) URL.",
      { code: "invalid_api_url" },
    );
  }


const isLocalHttp =
  url.protocol === "http:" &&
  (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]"
  );

if (
  !(url.protocol === "https:" || isLocalHttp) ||
  url.username ||
  url.password ||
  url.search ||
  url.hash ||
  url.pathname !== "/"
) {
  throw new CloudHttpError(
    "Afrobase API URL must be HTTPS, except for localhost development.",
    { code: "invalid_api_url" },
  );
}

  return url.origin;
}

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export async function cloudRequest(
  pathname,
  {
    method = "GET",
    body,
    bearerToken,
    baseUrl = DEFAULT_AFROBASE_API_URL,
    fetchImpl = globalThis.fetch,
    timeoutMs = 15000,
  } = {},
) {
  const origin = normalizeCloudApiUrl(baseUrl);

  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//")
  ) {
    throw new CloudHttpError(
      "Invalid Afrobase API path.",
      { code: "invalid_api_path" },
    );
  }

  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1
  ) {
    throw new CloudHttpError(
      "HTTP timeout must be a positive integer.",
      { code: "invalid_timeout" },
    );
  }

  if (typeof fetchImpl !== "function") {
    throw new CloudHttpError(
      "HTTP fetch implementation is unavailable.",
      { code: "fetch_unavailable" },
    );
  }

  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] =
      "application/json";
  }

  if (bearerToken !== undefined) {
    if (
      typeof bearerToken !== "string" ||
      !bearerToken.trim()
    ) {
      throw new CloudHttpError(
        "Invalid bearer credential.",
        { code: "invalid_credential" },
      );
    }

    headers.Authorization =
      `Bearer ${bearerToken}`;
  }

  let response;

  try {
    response = await fetchImpl(
      `${origin}${pathname}`,
      {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "error",
      },
    );
  } catch {
    throw new CloudHttpError(
      "Could not reach Afrobase Cloud.",
      { code: "network_error" },
    );
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new CloudHttpError(
      "Afrobase Cloud returned an invalid JSON response.",
      {
        status: response.status,
        code: "invalid_response",
      },
    );
  }

  if (!isRecord(payload)) {
    throw new CloudHttpError(
      "Afrobase Cloud returned an invalid response.",
      {
        status: response.status,
        code: "invalid_response",
      },
    );
  }

  if (!response.ok) {
    const apiError = isRecord(payload.error)
      ? payload.error
      : null;

    throw new CloudHttpError(
      typeof apiError?.message === "string"
        ? apiError.message
        : "Afrobase Cloud request failed.",
      {
        status: response.status,
        code:
          typeof apiError?.code === "string"
            ? apiError.code
            : "cloud_request_failed",
      },
    );
  }

  return {
    status: response.status,
    data: payload,
  };
}
