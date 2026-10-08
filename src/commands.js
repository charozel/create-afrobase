
import {
  detail,
  error,
  heading,
  info,
  spacer,
} from "./logger.js";

/* ============================================================
   AFROBASE CLI COMMAND REGISTRY

   Explicit command names are reserved so they cannot be
   interpreted as project names.

   CLOUD02-A establishes dispatch only.
   Authentication and cloud operations are implemented later.
============================================================ */

export const COMMAND_NAMES = Object.freeze([
  "login",
  "logout",
  "whoami",
  "projects",
  "link",
]);

const COMMAND_DESCRIPTIONS = Object.freeze({
  login: "Authenticate with Afrobase Cloud",
  logout: "Remove the local CLI credential",
  whoami: "Show the authenticated developer",
  projects: "List accessible Afrobase projects",
  link: "Link a local project to Afrobase Cloud",
});

export function isCliCommand(value) {
  return (
    typeof value === "string" &&
    COMMAND_NAMES.includes(value)
  );
}

export function printCommandsHelp() {
  info("Cloud commands:");

  for (const name of COMMAND_NAMES) {
    detail(
      `${name.padEnd(12)} ${COMMAND_DESCRIPTIONS[name]}`,
    );
  }

  spacer();
}

export async function runCliCommand(
  command,
  args = [],
) {
  if (!isCliCommand(command)) {
    error(`Unknown Afrobase command: ${command}`);
    return 1;
  }

  if (args.length > 0) {
    error(
      `Unexpected arguments for "${command}": ${args.join(" ")}`,
    );
    return 1;
  }

  heading(`Afrobase ${command}`);
  spacer();

  info(
    `The "${command}" command is reserved but not yet implemented.`,
  );

  detail(
    "Cloud command implementation begins in CLOUD02.",
  );

  spacer();

  return 1;
}
