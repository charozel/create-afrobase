import { readProjectConfig } from "./project-config.js";
import { getProjectIdentity } from "./project-identity.js";
import { getEnvironmentStatus } from "./environment.js";

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

  return {
    success: true,
    reason: "PROJECT_STATE_LOADED",
    message: null,
    configPath: configResult.configPath,
    config: configResult.config,
    identity,
    environment: environmentStatus,
  };
}