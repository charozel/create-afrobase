import { readProjectConfig } from "./project-config.js";
import { getProjectIdentity } from "./project-identity.js";
import { getEnvironmentStatus } from "./environment.js";

/* ============================================================
   SDK PROJECT CONTEXT
============================================================ */

/**
 * Resolves the project context that will ultimately be supplied
 * to the Afrobase SDK.
 *
 * Environment configuration takes precedence over the locally
 * linked project identity.
 *
 * The SDK normalizes project context to lowercase, so local CLI
 * state mirrors that behavior.
 */
function resolveSdkProject(
  identity,
  environment,
  environmentStatus,
) {
  if (environmentStatus.hasProject) {
    return environment.AFROBASE_PROJECT
      .trim()
      .toLowerCase();
  }

  if (identity.projectId) {
    return identity.projectId.toLowerCase();
  }

  return null;
}

/* ============================================================
   SDK API URL
============================================================ */

/**
 * Returns an explicit API URL only when one exists in the
 * application environment.
 *
 * A null value means the SDK may use its own default API origin.
 */
function resolveSdkApiUrl(
  environment,
  environmentStatus,
) {
  if (!environmentStatus.hasApiUrl) {
    return null;
  }

  return environment.AFROBASE_API_URL.trim();
}

/* ============================================================
   PROJECT STATE
============================================================ */

export function getProjectState(
  projectPath,
  environment = process.env,
) {
  const configResult = readProjectConfig(
    projectPath,
  );

  if (!configResult.success) {
    return {
      success: false,
      reason: configResult.reason,
      message: configResult.message,
      configPath: configResult.configPath,
    };
  }

  const identity = getProjectIdentity(
    configResult.config,
  );

  const environmentStatus =
    getEnvironmentStatus(environment);

  const sdkProject = resolveSdkProject(
    identity,
    environment,
    environmentStatus,
  );

  const sdkApiUrl = resolveSdkApiUrl(
    environment,
    environmentStatus,
  );

  const sdk = {
    package:
      configResult.config.sdk?.package ??
      null,

    project: sdkProject,

    apiUrl: sdkApiUrl,
  };

  return {
    success: true,
    reason: "PROJECT_STATE_LOADED",
    message: null,
    configPath: configResult.configPath,
    config: configResult.config,
    identity,
    environment: environmentStatus,
    sdk,
  };
}