import fs from "node:fs";
import path from "node:path";

const AFROBASE_DIRECTORY = "afrobase";

const GITIGNORE_CONTENT = `# Dependencies
node_modules/

# Environment variables
.env
.env.*
!.env.example

# Build output
.next/
dist/
build/

# Logs
*.log

# Operating system files
.DS_Store
Thumbs.db
`;

const README_CONTENT = `# Afrobase

This directory contains project-level Afrobase configuration and resources.

It is managed as part of your application and may evolve as Afrobase services
such as Data, Auth, Functions, Money, and Security are configured.

Do not store secrets in this directory.
`;

export function scaffoldProject(projectPath) {
  const afrobaseDirectory = path.join(
    projectPath,
    AFROBASE_DIRECTORY,
  );

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

  const gitignorePath = path.join(
    projectPath,
    ".gitignore",
  );

  const readmePath = path.join(
    afrobaseDirectory,
    "README.md",
  );


  if (fs.existsSync(afrobaseDirectory)) {
    return {
      success: false,
      reason: "AFROBASE_DIRECTORY_EXISTS",
      message: 'An "afrobase" directory already exists.',
    };
  }

  if (fs.existsSync(gitignorePath)) {
    return {
      success: false,
      reason: "GITIGNORE_EXISTS",
      message: 'A ".gitignore" file already exists.',
    };
  }


  fs.mkdirSync(afrobaseDirectory, {
    recursive: false,
  });

  fs.writeFileSync(
    gitignorePath,
    GITIGNORE_CONTENT,
    "utf8",
  );

  fs.writeFileSync(
    readmePath,
    README_CONTENT,
    "utf8",
  );

   return {
    success: true,
    reason: "PROJECT_SCAFFOLDED",
    afrobaseDirectory,
    gitignorePath,
    readmePath,
  };
}