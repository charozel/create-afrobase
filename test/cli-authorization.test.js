
import assert from "node:assert/strict";
import test from "node:test";

import {
  cloudRequest,
  CloudHttpError,
  normalizeCloudApiUrl,
} from "../src/cloud-http.js";

import {
  createCliAuthorization,
  exchangeCliAuthorization,
} from "../src/cli-authorization.js";

const requestId =
  `cli_req_${"a".repeat(32)}`;

const verificationSecret =
  "b".repeat(64);

const tokenId =
  "c".repeat(24);

const token =
  `af_cli_${tokenId}_${"d".repeat(64)}`;

function jsonResponse(
  status,
  data,
) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() {
      return data;
    },
  };
}

test(
  "normalizes valid Afrobase API origins",
  () => {
    assert.equal(
      normalizeCloudApiUrl(
        "https://api.afrobase.dev",
      ),
      "https://api.afrobase.dev",
    );

    assert.equal(
      normalizeCloudApiUrl(
        "http://localhost:3000",
      ),
      "http://localhost:3000",
    );
  },
);

test(
  "rejects unsafe or malformed API origins",
  () => {
    for (const value of [
      "not-a-url",
      "ftp://example.com",
      "https://user:pass@example.com",
      "https://example.com/path",
      "https://example.com/?key=secret",
    ]) {
      assert.throws(
        () => normalizeCloudApiUrl(value),
        CloudHttpError,
      );
    }
  },
);

test(
  "creates a CLI authorization request",
  async () => {
    let observedUrl;
    let observedOptions;

    const fetchImpl = async (
      url,
      options,
    ) => {
      observedUrl = url;
      observedOptions = options;

      return jsonResponse(201, {
        requestId,
        verificationSecret,
        expiresAt: Date.now() + 600000,
      });
    };

    const result =
      await createCliAuthorization(
        "Sam Windows CLI",
        {
          fetchImpl,
        },
      );

    assert.equal(
      result.requestId,
      requestId,
    );

    assert.equal(
      result.verificationSecret,
      verificationSecret,
    );

    assert.equal(
      observedUrl,
      "https://impressive-clam-161.convex.site/api/control/v1/cli/authorize",
    );

    assert.equal(
      observedOptions.method,
      "POST",
    );

    assert.deepEqual(
      JSON.parse(observedOptions.body),
      {
        name: "Sam Windows CLI",
      },
    );
  },
);

test(
  "pending exchange never returns a credential",
  async () => {
    const result =
      await exchangeCliAuthorization(
        {
          requestId,
          verificationSecret,
        },
        {
          fetchImpl: async () =>
            jsonResponse(202, {
              status: "pending",
            }),
        },
      );

    assert.deepEqual(result, {
      status: "pending",
    });
  },
);

test(
  "approved exchange returns a credential in memory",
  async () => {
    const result =
      await exchangeCliAuthorization(
        {
          requestId,
          verificationSecret,
        },
        {
          fetchImpl: async () =>
            jsonResponse(200, {
              token,
              tokenId,
              tokenPrefix:
                `af_cli_${tokenId}`,
              expiresAt:
                Date.now() + 600000,
            }),
        },
      );

    assert.equal(
      result.status,
      "approved",
    );

    assert.equal(
      result.credential.token,
      token,
    );
  },
);

test(
  "invalid proof is rejected before HTTP",
  async () => {
    let called = false;

    await assert.rejects(
      exchangeCliAuthorization(
        {
          requestId,
          verificationSecret:
            "wrong",
        },
        {
          fetchImpl: async () => {
            called = true;
            return jsonResponse(202, {
              status: "pending",
            });
          },
        },
      ),
      {
        code: "invalid_authorization",
      },
    );

    assert.equal(called, false);
  },
);

test(
  "server authorization errors preserve safe codes",
  async () => {
    await assert.rejects(
      exchangeCliAuthorization(
        {
          requestId,
          verificationSecret,
        },
        {
          fetchImpl: async () =>
            jsonResponse(401, {
              error: {
                code:
                  "invalid_authorization",
                message:
                  "CLI authorization could not be verified.",
              },
            }),
        },
      ),
      {
        code: "invalid_authorization",
        status: 401,
      },
    );
  },
);

test(
  "malformed JSON responses fail safely",
  async () => {
    await assert.rejects(
      cloudRequest(
        "/api/control/v1/me",
        {
          fetchImpl: async () => ({
            status: 200,
            ok: true,
            async json() {
              throw new Error(
                "Invalid JSON",
              );
            },
          }),
        },
      ),
      {
        code: "invalid_response",
      },
    );
  },
);

test(
  "network failures do not expose internal exceptions",
  async () => {
    await assert.rejects(
      cloudRequest(
        "/api/control/v1/me",
        {
          fetchImpl: async () => {
            throw new Error(
              "secret diagnostic",
            );
          },
        },
      ),
      (error) => {
        assert.equal(
          error.code,
          "network_error",
        );

        assert.equal(
          error.message.includes(
            "secret diagnostic",
          ),
          false,
        );

        return true;
      },
    );
  },
);


test(
  "rejects insecure remote HTTP origins",
  () => {
    for (const value of [
      "http://example.com",
      "http://api.afrobase.dev",
      "http://192.168.1.10:3000",
    ]) {
      assert.throws(
        () => normalizeCloudApiUrl(value),
        {
          code: "invalid_api_url",
        },
      );
    }
  },
);

