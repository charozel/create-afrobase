
import {
  unlinkProject,
} from "./project-link.js";

export class CloudUnlinkError extends Error {
  constructor(
    message,
    code = "cloud_unlink_error",
  ) {
    super(message);

    this.name = "CloudUnlinkError";
    this.code = code;
  }
}

/* ============================================================
   LOCAL PROJECT UNLINKING

   - No cloud requests
   - No authentication required
   - No credential changes
   - Preserves unrelated project configuration
============================================================ */

export async function unlinkCloudProject({
  projectPath = process.cwd(),
  unlinkLocalProject = unlinkProject,
} = {}) {
  let result;

  try {
    result = await unlinkLocalProject(
      projectPath,
    );
  } catch {
    throw new CloudUnlinkError(
      "Unable to unlink the local Afrobase project.",
      "unlink_failed",
    );
  }

  if (
    !result ||
    result.success !== true
  ) {
    throw new CloudUnlinkError(
      result?.message ??
        "Unable to unlink the local Afrobase project.",
      result?.reason ?? "unlink_failed",
    );
  }

  if (
    result.reason !== "PROJECT_UNLINKED" &&
    result.reason !== "ALREADY_UNLINKED"
  ) {
    throw new CloudUnlinkError(
      "Local unlink operation returned an unexpected result.",
      "invalid_unlink_result",
    );
  }

  return {
    status:
      result.reason === "ALREADY_UNLINKED"
        ? "already_unlinked"
        : "unlinked",
    configPath: result.configPath,
    projectName: result.config.name,
  };
}
