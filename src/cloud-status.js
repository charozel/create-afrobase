
import {
  readProjectConfig,
} from "./project-config.js";

import {
  getProjectIdentity,
} from "./project-identity.js";

import {
  listCloudProjects,
} from "./cloud-projects.js";

const PUBLIC_PROJECT_ID_PATTERN =
  /^proj_[a-f0-9]{32}$/;

export class CloudStatusError extends Error {
  constructor(
    message,
    code = "cloud_status_error",
  ) {
    super(message);

    this.name = "CloudStatusError";
    this.code = code;
  }
}

function validateLocalConfig(result) {
  if (
    !result ||
    result.success !== true
  ) {
    throw new CloudStatusError(
      result?.message ??
        "Unable to read the local Afrobase configuration.",
      result?.reason ?? "config_error",
    );
  }

  if (
    !result.config ||
    typeof result.config !== "object" ||
    Array.isArray(result.config)
  ) {
    throw new CloudStatusError(
      "Local Afrobase configuration is invalid.",
      "invalid_config",
    );
  }

  return result;
}

function validateCloudProjects(projects) {
  if (!Array.isArray(projects)) {
    throw new CloudStatusError(
      "Cloud project discovery returned an invalid result.",
      "invalid_cloud_response",
    );
  }

  return projects;
}

export async function getCloudProjectStatus({
  projectPath = process.cwd(),
  readConfig = readProjectConfig,
  getIdentity = getProjectIdentity,
  listProjects = listCloudProjects,
} = {}) {
  const local = validateLocalConfig(
    await readConfig(projectPath),
  );

  const identity = getIdentity(
    local.config,
  );

  if (
    !identity ||
    typeof identity.linked !== "boolean"
  ) {
    throw new CloudStatusError(
      "Unable to determine local project identity.",
      "invalid_project_identity",
    );
  }

  const base = {
    local: {
      name: local.config.name,
      configPath: local.configPath,
      projectId: identity.projectId ?? null,
    },
  };

  if (!identity.linked) {
    return {
      ...base,
      status: "unlinked",
      cloud: null,
    };
  }

  if (
    typeof identity.projectId !== "string" ||
    !PUBLIC_PROJECT_ID_PATTERN.test(
      identity.projectId,
    )
  ) {
    throw new CloudStatusError(
      "Linked project ID does not match the Afrobase Cloud public ID format.",
      "invalid_project_id",
    );
  }

  let projects;

  try {
    projects = validateCloudProjects(
      await listProjects(),
    );
  } catch (cause) {
    if (cause instanceof CloudStatusError) {
      throw cause;
    }

    throw new CloudStatusError(
      "Unable to verify the linked project with Afrobase Cloud. Check your CLI session and network connection.",
      "cloud_verification_failed",
    );
  }

  const matchingProject = projects.find(
    (project) =>
      project?.projectId ===
      identity.projectId,
  );

  if (!matchingProject) {
    return {
      ...base,
      status: "inaccessible",
      cloud: null,
    };
  }

  if (
    typeof matchingProject.name !== "string" ||
    !matchingProject.organization ||
    typeof matchingProject.organization.name !==
      "string"
  ) {
    throw new CloudStatusError(
      "Cloud returned incomplete project metadata.",
      "invalid_cloud_response",
    );
  }

  return {
    ...base,
    status: "verified",
    cloud: {
      projectId: matchingProject.projectId,
      name: matchingProject.name,
      slug: matchingProject.slug,
      environment:
        matchingProject.environment ?? null,
      organization: {
        name:
          matchingProject.organization.name,
        slug:
          matchingProject.organization.slug,
      },
      role: matchingProject.role,
    },
  };
}
