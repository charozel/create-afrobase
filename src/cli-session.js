import os from "node:os";
import { spawn } from "node:child_process";

import {
  createCliAuthorization,
  exchangeCliAuthorization,
} from "./cli-authorization.js";

import {
  cloudRequest,
  CloudHttpError,
  normalizeCloudApiUrl,
} from "./cloud-http.js";

import {
  clearCliCredential,
  loadCliCredential,
  saveCliCredential,
} from "./credential-store.js";

import {
  verifyWindowsCredentialAcl,
} from "./windows-acl.js";
export const DEFAULT_DASHBOARD_URL =
  "http://localhost:3000";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_INTERVAL_MS = 10000;

export class CliSessionError extends Error {
  constructor(message, code = "cli_session_error") {
    super(message);
    this.name = "CliSessionError";
    this.code = code;
  }
}

function validateDashboardUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new CliSessionError(
      "Invalid Afrobase dashboard URL.",
      "invalid_dashboard_url",
    );
  }

  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";

  if (
    !(url.protocol === "https:" ||
      (url.protocol === "http:" && isLocal)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new CliSessionError(
      "Dashboard URL must be an HTTPS origin or a local development origin.",
      "invalid_dashboard_url",
    );
  }

  return url.origin;
}

export function buildApprovalUrl(
  requestId,
  dashboardUrl = DEFAULT_DASHBOARD_URL,
) {
  if (
    typeof requestId !== "string" ||
    !/^cli_req_[a-f0-9]{32}$/.test(requestId)
  ) {
    throw new CliSessionError(
      "Invalid authorization request ID.",
      "invalid_authorization",
    );
  }

  const origin = validateDashboardUrl(dashboardUrl);

  const url = new URL("/cli/authorize", origin);
  url.searchParams.set("request", requestId);

  return url.toString();
}

export async function openApprovalBrowser(url) {
  const parsed = new URL(url);

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new CliSessionError(
      "Invalid browser authorization URL.",
      "invalid_dashboard_url",
    );
  }

  const platform = process.platform;

  const command =
    platform === "win32"
      ? "explorer.exe"
      : platform === "darwin"
        ? "open"
        : "xdg-open";

  return new Promise((resolve, reject) => {
    let settled = false;

    const child = spawn(command, [url], {
      stdio: "ignore",
      windowsHide: true,
    });

    child.once("error", () => {
      if (settled) return;
      settled = true;

      reject(
        new CliSessionError(
          "Could not open the browser. Open the authorization URL manually.",
          "browser_unavailable",
        ),
      );
    });

    child.once("spawn", () => {
      if (settled) return;
      settled = true;
      child.unref();
      resolve();
    });
  });
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new CliSessionError(
          "Authorization cancelled.",
          "authorization_cancelled",
        ),
      );
      return;
    }

    let timer;

    const onAbort = () => {
      clearTimeout(timer);
      reject(
        new CliSessionError(
          "Authorization cancelled.",
          "authorization_cancelled",
        ),
      );
    };

    timer = setTimeout(() => {
      signal?.removeEventListener(
        "abort",
        onAbort,
      );
      resolve();
    }, ms);

    signal?.addEventListener(
      "abort",
      onAbort,
      { once: true },
    );
  });
}

export async function pollCliAuthorization(
  authorization,
  {
    exchange = exchangeCliAuthorization,
    apiOptions = {},
    intervalMs = POLL_INTERVAL_MS,
    now = Date.now,
    sleep = wait,
    signal,
  } = {},
) {
  if (
    !Number.isSafeInteger(authorization?.expiresAt) ||
    !Number.isSafeInteger(intervalMs) ||
    intervalMs < 1 ||
    intervalMs > MAX_POLL_INTERVAL_MS
  ) {
    throw new CliSessionError(
      "Invalid authorization polling configuration.",
      "invalid_authorization",
    );
  }

  while (now() < authorization.expiresAt) {
    if (signal?.aborted) {
      throw new CliSessionError(
        "Authorization cancelled.",
        "authorization_cancelled",
      );
    }

    const result = await exchange(
      authorization,
      apiOptions,
    );

    if (result.status === "approved") {
      return result.credential;
    }

    if (result.status !== "pending") {
      throw new CliSessionError(
        "Unexpected authorization state.",
        "invalid_authorization",
      );
    }

    const remaining =
      authorization.expiresAt - now();

    if (remaining <= 0) break;

    await sleep(
      Math.min(intervalMs, remaining),
      signal,
    );
  }

  throw new CliSessionError(
    "Browser authorization expired. Run login again.",
    "authorization_expired",
  );
}

export async function verifyCredentialStorage(
  options = {},
) {
  return verifyWindowsCredentialAcl(options);
}

export async function loginCli({
  name = `${os.hostname()} Afrobase CLI`,
  apiUrl = process.env.AFROBASE_API_URL,
  dashboardUrl =
    process.env.AFROBASE_DASHBOARD_URL ??
    DEFAULT_DASHBOARD_URL,
  createAuthorization = createCliAuthorization,
  pollAuthorization = pollCliAuthorization,
  openBrowser = openApprovalBrowser,
  saveCredential = saveCliCredential,
  onApprovalUrl = () => {},
  onWaiting = () => {},
verifyStorage = verifyCredentialStorage,
  signal,
} = {}) {
  // A deliberately explicit security gate:
  // do not persist live tokens until local storage
  // privacy has been reviewed for this machine.
  await verifyStorage();

  const apiOptions = {
    baseUrl: normalizeCloudApiUrl(apiUrl),
  };

  const authorization = await createAuthorization(
    name,
    apiOptions,
  );

  const approvalUrl = buildApprovalUrl(
    authorization.requestId,
    dashboardUrl,
  );

  onApprovalUrl(approvalUrl);

  try {
    await openBrowser(approvalUrl);
  } catch (error) {
    if (error?.code !== "browser_unavailable") {
      throw error;
    }

    // Manual browser navigation remains possible.
  }

  onWaiting();

  const credential = await pollAuthorization(
    authorization,
    {
      apiOptions,
      signal,
    },
  );

  const saved = await saveCredential(
    credential,
  );

  return {
    status: "authenticated",
    credential: saved,
  };
}

export async function logoutCli({
  clearCredential = clearCliCredential,
} = {}) {
  const removed = await clearCredential();

  return {
    removed,
  };
}

export async function whoamiCli({
  loadCredential = loadCliCredential,
  request = cloudRequest,
  apiUrl = process.env.AFROBASE_API_URL,
} = {}) {
  const credential = await loadCredential();

  if (!credential) {
    throw new CliSessionError(
      "Not signed in. Run create-afrobase login.",
      "not_authenticated",
    );
  }

  const response = await request(
    "/api/control/v1/me",
    {
      method: "GET",
      bearerToken: credential.token,
      baseUrl: normalizeCloudApiUrl(apiUrl),
    },
  );

  const data = response.data;

  if (
    response.status !== 200 ||
    typeof data?.user?.email !== "string" ||
    typeof data?.credential?.name !== "string"
  ) {
    throw new CloudHttpError(
      "Afrobase returned an invalid developer profile.",
      {
        code: "invalid_response",
      },
    );
  }

  return {
    email: data.user.email,
    credentialName: data.credential.name,
    expiresAt: data.credential.expiresAt,
  };
}
