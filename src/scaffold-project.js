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
# Project identity and API configuration used by Afrobase clients.
#
# AFROBASE_PROJECT identifies the Afrobase project/tenant.
# It is project context â€” not an authentication credential.
#
# AFROBASE_API_URL may be overridden for development, preview,
# regional, self-hosted, or future branded Afrobase endpoints.
#
# Never commit real secrets or session tokens.

AFROBASE_PROJECT=
AFROBASE_API_URL=https://impressive-clam-161.convex.site
`;

/* ============================================================
   GENERATED AFROBASE README
============================================================ */

const README_CONTENT = `# Afrobase

This application is prepared to use Afrobase.

## Project configuration

The project's local Afrobase manifest is stored in:

\`\`\`text
../afrobase.json
\`\`\`

It contains non-secret project metadata and identifies this application as an
Afrobase project.

## JavaScript / TypeScript SDK

Afrobase applications can use the official SDK:

\`\`\`bash
npm install @afrobase/sdk
\`\`\`

Create a client with your Afrobase project identity:

\`\`\`ts
import { Afrobase } from "@afrobase/sdk";

const afrobase = new Afrobase({
  project: process.env.AFROBASE_PROJECT!,
  baseUrl: process.env.AFROBASE_API_URL,
});
\`\`\`

The SDK supports JavaScript and TypeScript and uses the Afrobase public HTTP
API.

## Environment

Copy the generated environment template when configuring your application:

\`\`\`text
../.env.example
\`\`\`

The current environment contract is:

\`\`\`text
AFROBASE_PROJECT=
AFROBASE_API_URL=https://impressive-clam-161.convex.site
\`\`\`

\`AFROBASE_PROJECT\` identifies the Afrobase project/tenant. It is routing
context and is not an authentication credential.

\`AFROBASE_API_URL\` controls the public API origin. The SDK also has a default
API origin, so applications may choose whether to configure this explicitly.

The current URL is early-release infrastructure. A future Afrobase SDK release
may use the branded \`https://api.afrobase.dev\` endpoint once that endpoint is
configured and verified.

## Auth

Afrobase Auth V1 currently supports:

- Sign in
- Session lookup
- Sign out

Authentication sessions are managed by the Afrobase SDK after sign-in.

Do not store session tokens, API secrets, access tokens, or other credentials
inside \`afrobase.json\` or the \`afrobase/\` directory.

## This directory

The \`afrobase/\` directory is reserved for project-level Afrobase resources
and configuration as services are enabled.

Afrobase services may include:

- Data
- Auth
- Functions
- Money
- Security

## Cloud linking

A newly created project begins with local Afrobase configuration.

Cloud project creation, developer authentication, and project linking remain
separate Afrobase operations and are not automatically performed by
\`create-afrobase\`.

Once a local project has been linked to an Afrobase project, its project
identity can be supplied through \`AFROBASE_PROJECT\` and used by the SDK.
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
