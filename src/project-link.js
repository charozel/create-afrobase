import {
  readProjectConfig,
  writeProjectConfig,
} from "./project-config.js";

import { getProjectIdentity } from "./project-identity.js";

export function linkProject(
  projectPath,
  projectId,
) {
  const normalizedProjectId =
    typeof projectId === "string"
      ? projectId.trim()
      : projectId;

  const current = readProjectConfig(projectPath);

  if (!current.success) {
    return current;
  }

  const identity = getProjectIdentity(
    current.config,
  );

  if (identity.linked) {
    if (
      identity.projectId ===
      normalizedProjectId
    ) {
      return {
        success: true,
        reason: "ALREADY_LINKED",
        message: null,
        configPath: current.configPath,
        config: current.config,
      };
    }

    return {
      success: false,
      reason: "PROJECT_ALREADY_LINKED",
      message:
        `Project is already linked to "${identity.projectId}".`,
      configPath: current.configPath,
      config: current.config,
    };
  }

  const nextConfig = {
    ...current.config,
    projectId: normalizedProjectId,
  };

  const result = writeProjectConfig(
    projectPath,
    nextConfig,
  );

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    reason: "PROJECT_LINKED",
    message: null,
    configPath: result.configPath,
    config: result.config,
  };
}

export function unlinkProject(projectPath) {
  const current = readProjectConfig(projectPath);

  if (!current.success) {
    return current;
  }

  const identity = getProjectIdentity(
    current.config,
  );

  if (!identity.linked) {
    return {
      success: true,
      reason: "ALREADY_UNLINKED",
      message: null,
      configPath: current.configPath,
      config: current.config,
    };
  }

  const {
    projectId: _projectId,
    ...nextConfig
  } = current.config;

  const result = writeProjectConfig(
    projectPath,
    nextConfig,
  );

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    reason: "PROJECT_UNLINKED",
    message: null,
    configPath: result.configPath,
    config: result.config,
  };
}