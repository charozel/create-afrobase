import fs from "node:fs";
import path from "node:path";

const PROJECT_ARTIFACTS = Object.freeze([
  {
    name: "afrobase.json",
    reason: "CONFIG_EXISTS",
  },
  {
    name: "afrobase",
    reason: "AFROBASE_DIRECTORY_EXISTS",
  },
  {
    name: ".gitignore",
    reason: "GITIGNORE_EXISTS",
  },
  {
    name: ".env.example",
    reason: "ENV_EXAMPLE_EXISTS",
  },
]);

export function preflightProject(projectPath) {
  if (!fs.existsSync(projectPath)) {
    return {
      success: false,
      reason: "PROJECT_DIRECTORY_MISSING",
      message: "Project directory does not exist.",
    };
  }

  if (!fs.statSync(projectPath).isDirectory()) {
    return {
      success: false,
      reason: "PROJECT_PATH_NOT_DIRECTORY",
      message: "Project path is not a directory.",
    };
  }

  for (const artifact of PROJECT_ARTIFACTS) {
    const artifactPath = path.join(
      projectPath,
      artifact.name,
    );

    if (fs.existsSync(artifactPath)) {
      return {
        success: false,
        reason: artifact.reason,
        message:
          `Project artifact "${artifact.name}" already exists.`,
        artifactPath,
      };
    }
  }

  return {
    success: true,
    reason: "PROJECT_READY",
    message: null,
  };
}