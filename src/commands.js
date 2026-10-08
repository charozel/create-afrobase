
import {
  detail,
  error,
  heading,
  info,
  spacer,
  success,
} from "./logger.js";

import {
  CliSessionError,
  loginCli,
  logoutCli,
  whoamiCli,
} from "./cli-session.js";

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

function safeErrorMessage(cause) {
  if (
    cause instanceof CliSessionError ||
    cause?.name === "CloudHttpError" ||
    cause?.name === "CredentialStoreError"
  ) {
    return cause.message;
  }

  return "Afrobase Cloud command failed.";
}

export async function runCliCommand(
  command,
  args = [],
  {
    login = loginCli,
    logout = logoutCli,
    whoami = whoamiCli,
  } = {},
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

  try {
    switch (command) {
      case "login": {
        const result = await login({
          onApprovalUrl: (url) => {
            info("Open this authorization page:");
            detail(url);
            spacer();
          },
          onWaiting: () => {
            info("Waiting for browser approval...");
          },
        });

        if (result.status !== "authenticated") {
          throw new CliSessionError(
            "Login did not complete.",
            "login_failed",
          );
        }

        success("Signed in to Afrobase Cloud.");
        spacer();
        return 0;
      }

      case "logout": {
        const result = await logout();

        if (result.removed) {
          success("Local CLI credential removed.");
        } else {
          info("No local CLI credential was found.");
        }

        spacer();
        return 0;
      }

      case "whoami": {
        const result = await whoami();

        info(`Developer: ${result.email}`);
        detail(
          `Credential: ${result.credentialName}`,
        );

        if (
          Number.isSafeInteger(result.expiresAt)
        ) {
          detail(
            `Expires: ${new Date(
              result.expiresAt,
            ).toISOString()}`,
          );
        }

        spacer();
        return 0;
      }

      case "projects":
      case "link": {
        info(
          `The "${command}" command is reserved but not yet implemented.`,
        );

        detail(
          "Cloud project discovery and linking will follow authentication.",
        );

        spacer();
        return 1;
      }

      default:
        return 1;
    }
  } catch (cause) {
    error(safeErrorMessage(cause));
    spacer();
    return 1;
  }
}
