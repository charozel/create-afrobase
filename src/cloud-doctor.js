
/* ============================================================
   AFROBASE CLOUD
   CLOUD02-I — READ-ONLY PROJECT DIAGNOSTICS
============================================================ */

import {
  readProjectConfig,
} from "./project-config.js";

import {
  loadCliCredential,
} from "./credential-store.js";

import {
  whoamiCli,
} from "./cli-session.js";

import {
  getCloudProjectStatus,
} from "./cloud-status.js";

const PUBLIC_PROJECT_ID_PATTERN =
  /^proj_[a-f0-9]{32}$/;

export class CloudDoctorError extends Error {
  constructor(
    message,
    code = "cloud_doctor_error",
  ) {
    super(message);
    this.name = "CloudDoctorError";
    this.code = code;
  }
}

function diagnostic(
  id,
  label,
  passed,
  message,
  advice = null,
) {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    message,
    advice: passed ? null : advice,
  };
}

function failureCode(cause) {
  return typeof cause?.code === "string"
    ? cause.code
    : "unknown_error";
}

function safeCloudFailure(cause) {
  const code = failureCode(cause);

  if (
    code === "not_authenticated" ||
    code === "missing_credential" ||
    code === "credential_expired"
  ) {
    return {
      message: "CLI authentication is unavailable.",
      advice: 'Run "create-afrobase login".',
    };
  }

  if (
    code === "invalid_response" ||
    code === "invalid_cloud_response"
  ) {
    return {
      message: "Cloud returned an invalid response.",
      advice: "Check the Afrobase Cloud service and retry.",
    };
  }

  if (code === "cloud_verification_failed") {
    return {
      message: "Cloud project verification failed.",
      advice:
        "Check CLI authentication and network connectivity, then retry.",
    };
  }

  return {
    message: "Unable to contact or verify Afrobase Cloud.",
    advice:
      "Check your connection and Afrobase Cloud availability.",
  };
}

function hasUsableCredential(credential) {
  if (
    !credential ||
    typeof credential !== "object" ||
    Array.isArray(credential) ||
    typeof credential.token !== "string" ||
    credential.token.length === 0
  ) {
    return false;
  }

  if (
    credential.expiresAt !== undefined &&
    credential.expiresAt !== null &&
    (
      !Number.isSafeInteger(credential.expiresAt) ||
      credential.expiresAt <= Date.now()
    )
  ) {
    return false;
  }

  return true;
}

/* ============================================================
   DIAGNOSTIC ENGINE

   No write operations are invoked.
   Checks run in dependency order but failures are collected.
============================================================ */

export async function diagnoseCloudProject({
  projectPath = process.cwd(),
  readConfig = readProjectConfig,
  loadCredential = loadCliCredential,
  verifyDeveloper = whoamiCli,
  verifyProject = getCloudProjectStatus,
} = {}) {
  if (
    typeof projectPath !== "string" ||
    projectPath.trim().length === 0
  ) {
    throw new CloudDoctorError(
      "A valid project path is required.",
      "invalid_project_path",
    );
  }

  const checks = [];

  let local = null;
  let credential = null;
  let authenticated = false;
  let cloudReachable = false;
  let cloudStatus = null;

  /* ==========================================================
     CHECK 1 — LOCAL CONFIGURATION
  ========================================================== */

  try {
    const result = await readConfig(projectPath);

    if (
      result?.success !== true ||
      !result.config ||
      typeof result.config !== "object" ||
      Array.isArray(result.config)
    ) {
      checks.push(
        diagnostic(
          "configuration",
          "Local configuration",
          false,
          "Afrobase project configuration is missing or invalid.",
          'Check "afrobase.json" in the project directory.',
        ),
      );
    } else {
      local = result;

      checks.push(
        diagnostic(
          "configuration",
          "Local configuration",
          true,
          "afrobase.json is valid.",
        ),
      );
    }
  } catch {
    checks.push(
      diagnostic(
        "configuration",
        "Local configuration",
        false,
        "Unable to inspect local project configuration.",
        'Check that "afrobase.json" is readable.',
      ),
    );
  }

  /* ==========================================================
     CHECK 2 — LOCAL CLI CREDENTIAL
  ========================================================== */

  try {
    const result = await loadCredential();

    if (hasUsableCredential(result)) {
      credential = result;

      checks.push(
        diagnostic(
          "credential",
          "CLI credential",
          true,
          "A usable local CLI credential was found.",
        ),
      );
    } else {
      checks.push(
        diagnostic(
          "credential",
          "CLI credential",
          false,
          "No usable CLI credential was found.",
          'Run "create-afrobase login".',
        ),
      );
    }
  } catch {
    checks.push(
      diagnostic(
        "credential",
        "CLI credential",
        false,
        "Unable to load the CLI credential securely.",
        'Check credential storage or run "create-afrobase login".',
      ),
    );
  }

  /* ==========================================================
     CHECK 3 — CLOUD AUTHENTICATION / CONNECTIVITY
  ========================================================== */

  if (credential) {
    try {
      const developer = await verifyDeveloper();

      if (
        typeof developer?.email !== "string" ||
        developer.email.length === 0
      ) {
        throw new CloudDoctorError(
          "Invalid developer verification result.",
          "invalid_response",
        );
      }

      authenticated = true;
      cloudReachable = true;

      checks.push(
        diagnostic(
          "cloud",
          "Cloud authentication",
          true,
          "Afrobase Cloud authenticated the developer.",
        ),
      );
    } catch (cause) {
      const failure = safeCloudFailure(cause);

      checks.push(
        diagnostic(
          "cloud",
          "Cloud authentication",
          false,
          failure.message,
          failure.advice,
        ),
      );
    }
  } else {
    checks.push(
      diagnostic(
        "cloud",
        "Cloud authentication",
        false,
        "Cloud authentication was not attempted.",
        'Restore CLI authentication with "create-afrobase login".',
      ),
    );
  }

  /* ==========================================================
     CHECK 4 — PROJECT LINK AND AUTHORIZATION
  ========================================================== */

  if (!local) {
    checks.push(
      diagnostic(
        "project",
        "Project authorization",
        false,
        "Project verification requires valid local configuration.",
        'Repair "afrobase.json" and retry.',
      ),
    );
  } else if (
    !PUBLIC_PROJECT_ID_PATTERN.test(
      local.config.projectId ?? "",
    )
  ) {
    checks.push(
      diagnostic(
        "project",
        "Project authorization",
        false,
        "No valid Afrobase Cloud project link was found.",
        'Run "create-afrobase projects" and then "create-afrobase link <projectId>".',
      ),
    );
  } else if (!authenticated) {
    checks.push(
      diagnostic(
        "project",
        "Project authorization",
        false,
        "Project authorization could not be verified.",
        'Restore cloud authentication and retry "create-afrobase doctor".',
      ),
    );
  } else {
    try {
      cloudStatus = await verifyProject({
        projectPath,
      });

      if (cloudStatus?.status === "verified") {
        checks.push(
          diagnostic(
            "project",
            "Project authorization",
            true,
            "Linked cloud project is accessible.",
          ),
        );
      } else if (
        cloudStatus?.status === "inaccessible"
      ) {
        checks.push(
          diagnostic(
            "project",
            "Project authorization",
            false,
            "Linked project is not accessible to this developer.",
            "Check project permissions and organization membership.",
          ),
        );
      } else if (
        cloudStatus?.status === "unlinked"
      ) {
        checks.push(
          diagnostic(
            "project",
            "Project authorization",
            false,
            "Local project is not linked to Afrobase Cloud.",
            'Run "create-afrobase link <projectId>".',
          ),
        );
      } else {
        checks.push(
          diagnostic(
            "project",
            "Project authorization",
            false,
            "Project verification returned an unexpected result.",
            "Check the linked project and retry.",
          ),
        );
      }
    } catch (cause) {
      const failure = safeCloudFailure(cause);

      checks.push(
        diagnostic(
          "project",
          "Project authorization",
          false,
          failure.message,
          failure.advice,
        ),
      );
    }
  }

  /* ==========================================================
     CHECK 5 — ENVIRONMENT
  ========================================================== */

  if (
    cloudStatus?.status === "verified" &&
    typeof cloudStatus.cloud?.environment === "string" &&
    cloudStatus.cloud.environment.trim().length > 0
  ) {
    checks.push(
      diagnostic(
        "environment",
        "Cloud environment",
        true,
        cloudStatus.cloud.environment.trim(),
      ),
    );
  } else {
    checks.push(
      diagnostic(
        "environment",
        "Cloud environment",
        false,
        "Cloud environment could not be confirmed.",
        "Verify the project link and cloud access.",
      ),
    );
  }

  const passed = checks.filter(
    (check) => check.status === "pass",
  ).length;

  const failed = checks.length - passed;

  return {
    status: failed === 0 ? "healthy" : "unhealthy",
    passed,
    failed,
    checks,
    cloudReachable,
  };
}
