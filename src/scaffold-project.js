import fs from "node:fs";
import path from "node:path";

const AFROBASE_DIRECTORY = "afrobase";

/* ============================================================
   GENERATED .gitignore
============================================================ */

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

/* ============================================================
   GENERATED ENVIRONMENT TEMPLATE
============================================================ */

const ENV_EXAMPLE_CONTENT = `# Afrobase
#
# Credentials are issued when a project is connected to Afrobase Cloud.
# Do not commit real secret keys.

AFROBASE_PUBLISHABLE_KEY=
AFROBASE_SECRET_KEY=
`;

/* ============================================================
   GENERATED AFROBASE README
============================================================ */

const README_CONTENT = `# Afrobase

This application is configured to use Afrobase.

## Project configuration

The project's Afrobase configuration is stored in:

\`\`\`text
../afrobase.json
\`\`\`

The configuration identifies the local Afrobase project and may later include
its Afrobase Cloud project identity after the project is linked.

## This directory

The \`afrobase/\` directory is reserved for project-level Afrobase resources
and configuration as services are enabled.

Afrobase services may include:

- Data
- Auth
- Functions
- Money
- Security

## Secrets

Do not store API keys, secret keys, access tokens, or other credentials in this
directory or in \`afrobase.json\`.

Credentials should be supplied through the application's environment.

## Connecting to Afrobase

A newly created project starts as a local Afrobase project.

Applications connect to Afrobase using two separate pieces of information:

1. Project identity is stored in \`../afrobase.json\`.
2. Runtime credentials are supplied through the application's environment.

This keeps project configuration separate from secrets and allows Afrobase to
work across different application frameworks and runtimes.

Cloud project creation, authentication, and linking are separate operations and
are not performed automatically by \`create-afrobase\`.

Once Afrobase Cloud tooling and client libraries are installed, they can use
this project configuration and environment contract to establish the connection.
`;

/* ============================================================
   PROJECT SCAFFOLD
============================================================ */

export function scaffoldProject(projectPath) {
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

  const afrobaseDirectory = path.join(
    projectPath,
    AFROBASE_DIRECTORY,
  );

  const gitignorePath = path.join(
    projectPath,
    ".gitignore",
  );

  const envExamplePath = path.join(
    projectPath,
    ".env.example",
  );

  const readmePath = path.join(
    afrobaseDirectory,
    "README.md",
  );

  /* ============================================================
     COLLISION GUARDS
  ============================================================ */

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

  if (fs.existsSync(envExamplePath)) {
    return {
      success: false,
      reason: "ENV_EXAMPLE_EXISTS",
      message: 'A ".env.example" file already exists.',
    };
  }

  /* ============================================================
     CREATE SCAFFOLD
  ============================================================ */

  const createdArtifacts = [];

  try {
    fs.mkdirSync(afrobaseDirectory, {
      recursive: false,
    });

    createdArtifacts.push(
      afrobaseDirectory,
    );

    fs.writeFileSync(
      gitignorePath,
      GITIGNORE_CONTENT,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );

    createdArtifacts.push(
      gitignorePath,
    );


    fs.writeFileSync(
      envExamplePath,
      ENV_EXAMPLE_CONTENT,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );

    createdArtifacts.push(
      envExamplePath,
    );

    fs.writeFileSync(
      readmePath,
      README_CONTENT,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );

    createdArtifacts.push(
      readmePath,
    );
  } catch (cause) {
    for (
      const artifactPath of [...createdArtifacts].reverse()
    ) {
      try {
        if (!fs.existsSync(artifactPath)) {
          continue;
        }

        const stat = fs.statSync(artifactPath);

       if (stat.isDirectory()) {
  fs.rmdirSync(artifactPath);
} else {
  fs.unlinkSync(artifactPath);
}
      } catch {
        // Preserve anything that cannot be safely removed.
      }
    }

    return {
      success: false,
      reason: "SCAFFOLD_WRITE_ERROR",
      message:
        "Afrobase project scaffold could not be created.",
      cause,
    };
  }

  return {
    success: true,
    reason: "PROJECT_SCAFFOLDED",
    afrobaseDirectory,
    gitignorePath,
    envExamplePath,
    readmePath,
  };
}