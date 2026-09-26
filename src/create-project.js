import fs from "node:fs";
import path from "node:path";

export function createProjectDirectory(projectName) {
  const projectPath = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    const stat = fs.statSync(projectPath);

    if (!stat.isDirectory()) {
      return {
        success: false,
        reason: "FILE_EXISTS",
        projectPath,
        message: `A file named "${projectName}" already exists.`,
      };
    }

    const contents = fs.readdirSync(projectPath);

    if (contents.length > 0) {
      return {
        success: false,
        reason: "DIRECTORY_NOT_EMPTY",
        projectPath,
        message: `Directory "${projectName}" already exists and is not empty.`,
      };
    }

    return {
      success: true,
      reason: "DIRECTORY_EMPTY",
      projectPath,
      created: false,
    };
  }

  fs.mkdirSync(projectPath, {
    recursive: false,
  });

  return {
    success: true,
    reason: "DIRECTORY_CREATED",
    projectPath,
    created: true,
  };
}