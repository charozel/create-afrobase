import { validateProjectName } from "./project-name.js";
import { createProjectDirectory } from "./create-project.js";
import { createProjectMetadata } from "./project-metadata.js";
import { readProjectConfig } from "./project-config.js";
import { scaffoldProject } from "./scaffold-project.js";
import {
  detail,
  error,
  heading,
  info,
  label,
  spacer,
  step,
  success,
} from "./logger.js";
import { preflightProject } from "./project-preflight.js";
import { rollbackProject } from "./project-rollback.js";

const VERSION = "0.0.1";

const args = process.argv.slice(2);

/* ============================================================
   BRAND
============================================================ */

function printLogo() {
  info(`
    _     __          __
   / \\   / _|_ __ ___| |__   __ _ ___  ___
  / _ \\ | |_| '__/ _ \\ '_ \\ / _\` / __|/ _ \\
 / ___ \\|  _| | | (_) | |_) | (_| \\__ \\  __/
/_/   \\_\\_| |_|  \\___/_.__/ \\__,_|___/\\___|

African digital infrastructure.
`);
}

/* ============================================================
   HELP
============================================================ */

function printHelp() {
  printLogo();

  heading("create-afrobase");
  spacer();

  info("Usage:");
  detail("create-afrobase [project-name] [options]");
  spacer();

  info("Options:");
  detail("-h, --help       Show CLI help");
  detail("-v, --version    Show CLI version");
  spacer();

  info("Examples:");
  detail("npx create-afrobase@latest");
  detail("npx create-afrobase@latest my-app");
  detail("npm create afrobase@latest");
  spacer();
}

/* ============================================================
   ROLLBACK PRESENTATION
============================================================ */

function reportRollback(rollbackResult) {
  if (rollbackResult.removedArtifacts.length > 0) {
    detail("Rolled back created Afrobase artifacts.");
  }

  if (rollbackResult.directoryRemoved) {
    detail("Rolled back the created project directory.");
  }

  if (rollbackResult.preservedArtifacts.length > 0) {
    detail(
      "Preserved files that could not be safely removed.",
    );
  }
}

/* ============================================================
   OPTIONS
============================================================ */

if (args.includes("--version") || args.includes("-v")) {
  info(VERSION);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

/* ============================================================
   PROJECT NAME
============================================================ */

const projectName = args.find(
  (arg) => !arg.startsWith("-"),
);

printLogo();

if (!projectName) {
  heading("create-afrobase");
  spacer();

  info("Create a new project powered by Afrobase.");
  spacer();

  info("Usage:");
  detail("npx create-afrobase@latest my-app");
  spacer();

  info("Need help?");
  detail("create-afrobase --help");
  spacer();

  process.exit(0);
}

heading("create-afrobase");
spacer();

label("Project", projectName);
spacer();

step("Validating project");

const validation = validateProjectName(projectName);

if (!validation.valid) {
  error(`Invalid project name: "${projectName}"`);
  detail(validation.message);
  spacer();

  info("Example:");
  detail("npx create-afrobase@latest my-app");
  spacer();

  process.exit(1);
}

success("Project name validated.");
spacer();

/* ============================================================
   PROJECT DIRECTORY
============================================================ */

step("Preparing workspace");

const result = createProjectDirectory(projectName);

if (!result.success) {
  error(result.message);
  spacer();

  process.exit(1);
}

if (result.created) {
  success("Project directory created.");
} else {
  success("Using existing empty project directory.");
}

detail(result.projectPath);
spacer();

const createdArtifacts = [];

/* ============================================================
   PROJECT PREFLIGHT
============================================================ */

step("Running project preflight");

const preflightResult = preflightProject(
  result.projectPath,
);

if (!preflightResult.success) {
  error("Afrobase project preflight failed.");
  detail(preflightResult.message);
  spacer();

  process.exit(1);
}

success("Project preflight passed.");
spacer();

/* ============================================================
   PROJECT METADATA
============================================================ */

step("Creating project configuration");

const metadataResult = createProjectMetadata(
  result.projectPath,
  projectName,
);

if (!metadataResult.success) {
  error(metadataResult.message);

  const rollbackResult = rollbackProject({
    projectPath: result.projectPath,
    directoryCreated: result.created,
    createdArtifacts,
  });

  reportRollback(rollbackResult);
  spacer();

  process.exit(1);
}

createdArtifacts.push(
  metadataResult.metadataPath,
);

success("Project configuration created.");
detail(metadataResult.metadataPath);
spacer();

/* ============================================================
   PROJECT SCAFFOLD
============================================================ */

step("Initializing Afrobase resources");

const scaffoldResult = scaffoldProject(
  result.projectPath,
);

if (!scaffoldResult.success) {
  error(scaffoldResult.message);

  const rollbackResult = rollbackProject({
    projectPath: result.projectPath,
    directoryCreated: result.created,
    createdArtifacts,
  });

  reportRollback(rollbackResult);
  spacer();

  process.exit(1);
}

createdArtifacts.push(
  scaffoldResult.afrobaseDirectory,
  scaffoldResult.gitignorePath,
  scaffoldResult.envExamplePath,
  scaffoldResult.readmePath,
);

success("Afrobase resources initialized.");
detail(scaffoldResult.afrobaseDirectory);
detail(scaffoldResult.gitignorePath);
detail(scaffoldResult.envExamplePath);
spacer();

/* ============================================================
   CONFIGURATION VERIFICATION
============================================================ */

step("Verifying project");

const configResult = readProjectConfig(
  result.projectPath,
);

if (!configResult.success) {
  error(
    "Afrobase project configuration could not be verified.",
  );
  detail(configResult.message);

  const rollbackResult = rollbackProject({
    projectPath: result.projectPath,
    directoryCreated: result.created,
    createdArtifacts,
  });

  reportRollback(rollbackResult);
  spacer();

  process.exit(1);
}

success("Project configuration verified.");
detail(configResult.configPath);
spacer();

/* ============================================================
   COMPLETION
============================================================ */

heading("Afrobase project ready");
spacer();

label("Project", projectName);
label("Location", result.projectPath);
spacer();

info("Created");
detail("afrobase.json");
detail("afrobase/");
detail(".env.example");
detail(".gitignore");
spacer();

info("Next");
detail(`cd ${projectName}`);
spacer();

info("Continue setup");
detail(
  "Review afrobase/README.md for SDK and project configuration guidance.",
);
detail(
  "Install @afrobase/sdk when you are ready to connect your application.",
);
detail(
  "Configure AFROBASE_PROJECT after this project is linked to Afrobase.",
);
spacer();

info(
  "Cloud authentication and project linking are not performed automatically.",
);
spacer();