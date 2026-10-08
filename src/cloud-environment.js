
/* ============================================================
   AFROBASE CLOUD
   CLOUD02-H — PROJECT ENVIRONMENT INSPECTION

   Read-only inspection of the currently linked cloud project.

   This module:
   - Reuses authenticated cloud status verification
   - Refuses unlinked or inaccessible projects
   - Validates the returned project metadata
   - Never reads or exposes environment variable secrets
   - Never modifies local project configuration
============================================================ */

import {
  getCloudProjectStatus,
} from "./cloud-status.js";

/* ============================================================
   PUBLIC PROJECT ID
============================================================ */

const PROJECT_ID_PATTERN =
  /^proj_[a-f0-9]{32}$/;

/* ============================================================
   ERROR
============================================================ */

export class CloudEnvironmentError extends Error {
  constructor(
    message,
    code = "cloud_environment_error",
  ) {
    super(message);

    this.name = "CloudEnvironmentError";
    this.code = code;
  }
}

/* ============================================================
   VALIDATION
============================================================ */

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function requireString(value) {
  return isNonEmptyString(value)
    ? value.trim()
    : null;
}

function validateEnvironmentResult(result) {
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    throw new CloudEnvironmentError(
      "Cloud project verification returned an invalid result.",
      "invalid_status_result",
    );
  }

  if (result.status === "unlinked") {
    throw new CloudEnvironmentError(
      'Local project is not linked. Run "create-afrobase projects" and then "create-afrobase link <projectId>".',
      "project_unlinked",
    );
  }

  if (result.status === "inaccessible") {
    throw new CloudEnvironmentError(
      "Linked cloud project is not accessible to the authenticated developer.",
      "project_inaccessible",
    );
  }

  if (result.status !== "verified") {
    throw new CloudEnvironmentError(
      "Cloud project verification did not complete successfully.",
      "verification_failed",
    );
  }

  const local = result.local;
  const cloud = result.cloud;

  if (
    !local ||
    typeof local !== "object" ||
    Array.isArray(local) ||
    !cloud ||
    typeof cloud !== "object" ||
    Array.isArray(cloud)
  ) {
    throw new CloudEnvironmentError(
      "Verified cloud project metadata is incomplete.",
      "invalid_project_metadata",
    );
  }

  const projectId = requireString(local.projectId);

  if (
    !projectId ||
    !PROJECT_ID_PATTERN.test(projectId) ||
    !isNonEmptyString(local.name) ||
    !isNonEmptyString(local.configPath) ||
    !isNonEmptyString(cloud.name) ||
    !cloud.organization ||
    typeof cloud.organization !== "object" ||
    Array.isArray(cloud.organization) ||
    !isNonEmptyString(cloud.organization.name) ||
    !isNonEmptyString(cloud.role)
  ) {
    throw new CloudEnvironmentError(
      "Verified cloud project metadata is incomplete.",
      "invalid_project_metadata",
    );
  }

  if (
    cloud.projectId !== undefined &&
    cloud.projectId !== projectId
  ) {
    throw new CloudEnvironmentError(
      "Cloud project identity does not match the local project link.",
      "project_identity_mismatch",
    );
  }

  if (
    cloud.environment !== undefined &&
    cloud.environment !== null &&
    !isNonEmptyString(cloud.environment)
  ) {
    throw new CloudEnvironmentError(
      "Cloud project environment metadata is invalid.",
      "invalid_environment",
    );
  }

  return {
    projectId,
    localProjectName: local.name.trim(),
    configPath: local.configPath.trim(),
    projectName: cloud.name.trim(),
    organizationName:
      cloud.organization.name.trim(),
    environment:
      requireString(cloud.environment) ??
      "unspecified",
    role: cloud.role.trim(),
  };
}

/* ============================================================
   INSPECT CURRENT CLOUD ENVIRONMENT
============================================================ */

export async function inspectCloudEnvironment({
  projectPath = process.cwd(),
  getStatus = getCloudProjectStatus,
} = {}) {
  if (
    typeof projectPath !== "string" ||
    projectPath.trim().length === 0
  ) {
    throw new CloudEnvironmentError(
      "A valid local project path is required.",
      "invalid_project_path",
    );
  }

  if (typeof getStatus !== "function") {
    throw new CloudEnvironmentError(
      "Cloud project verification is unavailable.",
      "invalid_status_provider",
    );
  }

  const result = await getStatus({
    projectPath,
  });

  const verified = validateEnvironmentResult(result);

  return {
    status: "inspected",
    ...verified,
  };
}
