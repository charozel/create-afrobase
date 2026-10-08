
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

import {
  listCloudProjects,
} from "./cloud-projects.js";

import {
  CloudLinkError,
  linkCloudProject,
} from "./cloud-link.js";

import {
  CloudStatusError,
  getCloudProjectStatus,
} from "./cloud-status.js";

import {
  CloudUnlinkError,
  unlinkCloudProject,
} from "./cloud-unlink.js";

import {
  CloudSwitchError,
  switchCloudProject,
} from "./cloud-switch.js";

export const COMMAND_NAMES = Object.freeze([
  "login",
  "logout",
  "whoami",
  "projects",
  "link",
  "status",
  "unlink",
  "switch",
]);

const COMMAND_DESCRIPTIONS = Object.freeze({
  login: "Authenticate with Afrobase Cloud",
  logout: "Remove the local CLI credential",
  whoami: "Show the authenticated developer",
  projects: "List accessible Afrobase projects",
  link: "Link a local project to Afrobase Cloud",
  status: "Verify the local Afrobase Cloud project link",
  unlink: "Remove the local Afrobase Cloud project link",
  switch: "Switch to another accessible cloud project",
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
    cause instanceof CloudLinkError ||
    cause instanceof CloudStatusError ||
    cause instanceof CloudUnlinkError ||
    cause instanceof CloudSwitchError ||
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
    projects = listCloudProjects,
    link = linkCloudProject,
    status = getCloudProjectStatus,
    unlink = unlinkCloudProject,
    switchProject = switchCloudProject,
  } = {},
) {
  if (!isCliCommand(command)) {
    error(`Unknown Afrobase command: ${command}`);
    return 1;
  }

  const invalidArguments =
    command === "link"
      ? args.length > 1
      : command === "switch"
        ? args.length !== 1
        : args.length > 0;

  if (invalidArguments) {
    error(
      command === "switch"
        ? 'Usage: create-afrobase switch <projectId>'
        : `Unexpected arguments for "${command}": ${args.join(" ")}`,
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

        if (Number.isSafeInteger(result.expiresAt)) {
          detail(
            `Expires: ${new Date(
              result.expiresAt,
            ).toISOString()}`,
          );
        }

        spacer();
        return 0;
      }

      case "projects": {
        const availableProjects = await projects();

        if (availableProjects.length === 0) {
          info("No accessible cloud projects found.");
          detail(
            "Create a project in an organization you belong to, then try again.",
          );
          spacer();
          return 0;
        }

        info(
          `${availableProjects.length} accessible project(s):`,
        );
        spacer();

        for (const project of availableProjects) {
          success(project.name);
          detail(`Project ID: ${project.projectId}`);
          detail(
            `Organization: ${project.organization.name}`,
          );
          detail(`Slug: ${project.slug}`);
          detail(
            `Environment: ${project.environment ?? "unspecified"}`,
          );
          detail(`Your role: ${project.role}`);
          spacer();
        }

        return 0;
      }

      case "link": {
        const result = await link({
          projectId: args[0],
        });

        if (result.status === "already_linked") {
          info("Local project is already linked.");
        } else {
          success(
            "Local project linked to Afrobase Cloud.",
          );
        }

        detail(`Project: ${result.project.name}`);
        detail(
          `Project ID: ${result.project.projectId}`,
        );
        detail(
          `Organization: ${result.project.organization.name}`,
        );
        detail(`Config: ${result.configPath}`);

        spacer();
        return 0;
      }

      case "status": {
        const result = await status();

        success(
          "Local project configuration valid.",
        );

        detail(`Project: ${result.local.name}`);
        detail(`Config: ${result.local.configPath}`);

        if (result.status === "unlinked") {
          info(
            "Local project is not linked to Afrobase Cloud.",
          );
          detail(
            'Run "create-afrobase projects" and then "create-afrobase link <projectId>".',
          );
          spacer();
          return 0;
        }

        detail(
          `Project ID: ${result.local.projectId}`,
        );
        spacer();

        if (result.status === "inaccessible") {
          error(
            "Linked project is not accessible to the authenticated developer.",
          );
          detail(
            "Check your organization membership and project access.",
          );
          spacer();
          return 1;
        }

        if (result.status !== "verified") {
          throw new CloudStatusError(
            "Unexpected project verification result.",
            "invalid_status",
          );
        }

        success("Cloud project verified.");
        detail(
          `Cloud project: ${result.cloud.name}`,
        );
        detail(
          `Organization: ${result.cloud.organization.name}`,
        );
        detail(
          `Environment: ${result.cloud.environment ?? "unspecified"}`,
        );
        detail(`Your role: ${result.cloud.role}`);

        spacer();
        success(
          "Local project is linked and accessible.",
        );
        spacer();
        return 0;
      }

      case "unlink": {
        const result = await unlink();

        if (result.status === "already_unlinked") {
          info(
            "Local project is already unlinked.",
          );
        } else {
          success(
            "Local project unlinked from Afrobase Cloud.",
          );
        }

        detail(`Project: ${result.projectName}`);
        detail(`Config: ${result.configPath}`);

        info(
          "Cloud project and CLI credentials were not modified.",
        );

        spacer();
        return 0;
      }

      case "switch": {
        const result = await switchProject({
          projectId: args[0],
        });

        if (result.status === "already_selected") {
          info(
            "Local project already targets this cloud project.",
          );
        } else if (result.status === "switched") {
          success(
            "Local cloud project switched successfully.",
          );
        } else {
          throw new CloudSwitchError(
            "Unexpected project switching result.",
            "invalid_switch_result",
          );
        }

        detail(
          `Previous project ID: ${result.previousProjectId}`,
        );
        detail(
          `Current project ID: ${result.project.projectId}`,
        );
        detail(
          `Cloud project: ${result.project.name}`,
        );
        detail(
          `Organization: ${result.project.organization.name}`,
        );
        detail(
          `Environment: ${result.project.environment ?? "unspecified"}`,
        );
        detail(`Config: ${result.configPath}`);

        spacer();
        return 0;
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
