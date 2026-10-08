
import {
  cloudRequest,
  CloudHttpError,
} from "./cloud-http.js";

/* ============================================================
   AFROBASE CLI AUTHORIZATION

   CLOUD02-A / BATCH 2

   Server contract:
   POST /api/control/v1/cli/authorize
   POST /api/control/v1/cli/exchange

   The browser receives requestId only.
   The terminal retains verificationSecret.
============================================================ */

const REQUEST_ID_PATTERN =
  /^cli_req_[a-f0-9]{32}$/;

const VERIFICATION_SECRET_PATTERN =
  /^[a-f0-9]{64}$/;

const CLI_TOKEN_PATTERN =
  /^af_cli_[a-f0-9]{24}_[a-f0-9]{64}$/;

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function invalidResponse(message) {
  return new CloudHttpError(message, {
    code: "invalid_response",
  });
}

export async function createCliAuthorization(
  name,
  options = {},
) {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100
  ) {
    throw new CloudHttpError(
      "CLI authorization name must contain 1–100 characters.",
      { code: "invalid_request" },
    );
  }

  const response = await cloudRequest(
    "/api/control/v1/cli/authorize",
    {
      ...options,
      method: "POST",
      body: {
        name: name.trim(),
      },
    },
  );

  const data = response.data;

  if (
    response.status !== 201 ||
    !REQUEST_ID_PATTERN.test(data.requestId) ||
    !VERIFICATION_SECRET_PATTERN.test(
      data.verificationSecret,
    ) ||
    !Number.isSafeInteger(data.expiresAt)
  ) {
    throw invalidResponse(
      "Afrobase returned an invalid authorization request.",
    );
  }

  return {
    requestId: data.requestId,
    verificationSecret: data.verificationSecret,
    expiresAt: data.expiresAt,
  };
}

export async function exchangeCliAuthorization(
  authorization,
  options = {},
) {
  if (
    !isRecord(authorization) ||
    !REQUEST_ID_PATTERN.test(
      authorization.requestId,
    ) ||
    !VERIFICATION_SECRET_PATTERN.test(
      authorization.verificationSecret,
    )
  ) {
    throw new CloudHttpError(
      "Invalid CLI authorization proof.",
      { code: "invalid_authorization" },
    );
  }

  const response = await cloudRequest(
    "/api/control/v1/cli/exchange",
    {
      ...options,
      method: "POST",
      body: {
        requestId: authorization.requestId,
        verificationSecret:
          authorization.verificationSecret,
      },
    },
  );

  const data = response.data;

  if (response.status === 202) {
    if (data.status !== "pending") {
      throw invalidResponse(
        "Afrobase returned an invalid pending authorization.",
      );
    }

    return {
      status: "pending",
    };
  }

  if (
    response.status !== 200 ||
    !CLI_TOKEN_PATTERN.test(data.token) ||
    typeof data.tokenId !== "string" ||
    typeof data.tokenPrefix !== "string" ||
    !Number.isSafeInteger(data.expiresAt)
  ) {
    throw invalidResponse(
      "Afrobase returned an invalid CLI credential.",
    );
  }

  return {
    status: "approved",
    credential: {
      token: data.token,
      tokenId: data.tokenId,
      tokenPrefix: data.tokenPrefix,
      expiresAt: data.expiresAt,
    },
  };
}
