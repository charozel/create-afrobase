import { validateProjectName } from "./project-name.js";
import { createProjectDirectory } from "./create-project.js";
import { createProjectMetadata } from "./project-metadata.js";
import { readProjectConfig } from "./project-config.js";
import { scaffoldProject } from "./scaffold-project.js";
import { detail, error, info, success } from "./logger.js";

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

  info(`Usage:
  create-afrobase [project-name] [options]

Options:
  -h, --help       Show CLI help
  -v, --version    Show CLI version

Examples:
  npx create-afrobase@latest
  npx create-afrobase@latest my-app
  npm create afrobase@latest
`);
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
  info("Welcome to Afrobase.");
  info("");
  info("To create a project, provide a project name:");
  info("");
  detail("npx create-afrobase@latest my-app");
  info("");

  process.exit(0);
}

const validation = validateProjectName(projectName);

if (!validation.valid) {
  error(`Invalid project name: "${projectName}"`);
  detail(validation.message);
  info("");
  info("Example:");
  detail("npx create-afrobase@latest my-app");
  info("");

  process.exit(1);
}

info(`Project: ${projectName}`);
info("");
success("Project name is valid.");
info("");

/* ============================================================
   PROJECT DIRECTORY
============================================================ */

const result = createProjectDirectory(projectName);

if (!result.success) {
  error(result.message);
  info("");

  process.exit(1);
}

if (result.created) {
  success(`Created project directory: ${projectName}`);
} else {
  success(`Using existing empty directory: ${projectName}`);
}

detail(result.projectPath);
info("");

/* ============================================================
   PROJECT METADATA
============================================================ */

const metadataResult = createProjectMetadata(
  result.projectPath,
  projectName,
);

success("Created Afrobase project metadata:");
detail(metadataResult.metadataPath);
info("");

/* ============================================================
   PROJECT SCAFFOLD
============================================================ */

const scaffoldResult = scaffoldProject(
  result.projectPath,
);

if (!scaffoldResult.success) {
  error(scaffoldResult.message);
  info("");

  process.exit(1);
}

success("Created Afrobase project scaffold:");
detail(scaffoldResult.afrobaseDirectory);
detail(scaffoldResult.gitignorePath);
detail(scaffoldResult.envExamplePath);
info("");

/* ============================================================
   CONFIGURATION VERIFICATION
============================================================ */

const configResult = readProjectConfig(
  result.projectPath,
);

if (!configResult.success) {
  error(
    "Afrobase project configuration could not be verified.",
  );
  detail(configResult.message);
  info("");

  process.exit(1);
}

success("Verified Afrobase project configuration.");
detail(configResult.configPath);
info("");

/* ============================================================
   COMPLETION
============================================================ */

success("Afrobase project is ready.");
info("");

info("Created:");
detail("afrobase.json");
detail("afrobase/");
detail(".env.example");
detail(".gitignore");
info("");

info("Next steps:");
info("");
detail(`cd ${projectName}`);
info("");
detail(
  "Review afrobase/README.md for project configuration guidance.",
);
detail(
  "Add Afrobase credentials to your application environment when they are issued.",
);
info("");

info(
  "Cloud authentication and project linking are separate Afrobase operations.",
);
info("");