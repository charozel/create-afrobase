const VERSION = "0.0.1";

const args = process.argv.slice(2);

function printLogo() {
  console.log(`
    _     __          __
   / \\   / _|_ __ ___| |__   __ _ ___  ___
  / _ \\ | |_| '__/ _ \\ '_ \\ / _\` / __|/ _ \\
 / ___ \\|  _| | | (_) | |_) | (_| \\__ \\  __/
/_/   \\_\\_| |_|  \\___/_.__/ \\__,_|___/\\___|

African digital infrastructure.
`);
}

function printHelp() {
  printLogo();

  console.log(`Usage:
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

if (args.includes("--version") || args.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const projectName = args.find((arg) => !arg.startsWith("-"));

printLogo();

if (projectName) {
  console.log(`Project: ${projectName}\n`);
}

console.log("Welcome to Afrobase.");
console.log("");
console.log("The create-afrobase CLI is currently under active development.");
console.log("Project scaffolding will be available in an upcoming release.");
console.log("");