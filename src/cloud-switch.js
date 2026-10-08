
import {
  listCloudProjects,
} from "./cloud-projects.js";

import {
  readProjectConfig,
  writeProjectConfig,
} from "./project-config.js";

import {
  getProjectIdentity,
} from "./project-identity.js";

const PROJECT_ID_PATTERN =
  /^proj_[a-f0-9]{32}$/;

export class CloudSwitchError extends Error {
  constructor(
    message,
    code = "cloud_switch_error",
  ) {
    super(message);
    this.name = "CloudSwitchError";
    this.code = code;
  }
}

function validateProjectId(projectId) {
  if (
    typeof projectId !== "string" ||
    !PROJECT_ID_PATTERN.test(projectId)
  ) {
    throw new CloudSwitchError(
      "Invalid cloud project ID. Expected proj_ followed by 32 lowercase hexadecimal characters.",
      "invalid_project_id",
    );
  }
}

function validateLocalResult(result) {
  if (!result || result.success !== true) {
    throw new CloudSwitchError(
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
    throw new CloudSwitchError(
      "Local Afrobase configuration is invalid.",
      "invalid_config",
    );
  }

  return result;
}

function validateSelectedProject(project) {
  if (
    !project ||
    !PROJECT_ID_PATTERN.test(project.projectId) ||
    typeof project.name !== "string" ||
    typeof project.slug !== "string" ||
    !project.organization ||
    typeof project.organization.name !== "string" ||
    typeof project.organization.slug !== "string"
  ) {
    throw new CloudSwitchError(
      "Cloud returned incomplete project metadata.",
      "invalid_cloud_project",
    );
  }

  return project;
}

/* ============================================================
   CLOUD02-G — AUTHENTICATED PROJECT SWITCHING

   Security invariants:
   - Explicit project ID required
   - Target must be accessible to authenticated developer
   - Local configuration validated before writing
   - Only projectId changes
   - No credentials written into project files
   - No cloud resources modified
============================================================ */

export async function switchCloudProject({
  projectPath = process.cwd(),
  projectId,
  listProjects = listCloudProjects,
  readConfig = readProjectConfig,
  writeConfig = writeProjectConfig,
  getIdentity = getProjectIdentity,
} = {}) {
  validateProjectId(projectId);

  const local = validateLocalResult(
    await readConfig(projectPath),
  );

  const identity = getIdentity(local.config);

  if (
    !identity ||
    typeof identity.linked !== "boolean"
  ) {
    throw new CloudSwitchError(
      "Unable to determine local project identity.",
      "invalid_project_identity",
    );
  }

  if (!identity.linked) {
    throw new CloudSwitchError(
      'Local project is not linked. Run "create-afrobase link <projectId>" first.',
      "project_not_linked",
    );
  }

  if (
    typeof identity.projectId !== "string" ||
    !PROJECT_ID_PATTERN.test(identity.projectId)
  ) {
    throw new CloudSwitchError(
      "Existing linked project ID is invalid.",
      "invalid_existing_project_id",
    );
  }

  const projects = await listProjects();

  if (!Array.isArray(projects)) {
    throw new CloudSwitchError(
      "Cloud project discovery returned an invalid result.",
      "invalid_projects",
    );
  }

  const selectedProject = projects.find(
    (project) =>
      project?.projectId === projectId,
  );

  if (!selectedProject) {
    throw new CloudSwitchError(
      "Target project is not among your accessible cloud projects.",
      "project_not_accessible",
    );
  }

  validateSelectedProject(selectedProject);

  const project = {
    projectId: selectedProject.projectId,
    name: selectedProject.name,
    slug: selectedProject.slug,
    environment:
      selectedProject.environment ?? null,
    organization: {
      name: selectedProject.organization.name,
      slug: selectedProject.organization.slug,
    },
    role: selectedProject.role,
  };

  if (identity.projectId === projectId) {
    return {
      status: "already_selected",
      previousProjectId: identity.projectId,
      project,
      configPath: local.configPath,
    };
  }

  const nextConfig = {
    ...local.config,
    projectId,
  };

  const written = await writeConfig(
    projectPath,
    nextConfig,
  );

  if (!written || written.success !== true) {
    throw new CloudSwitchError(
      written?.message ??
        "Unable to update the local Afrobase project.",
      written?.reason ?? "switch_failed",
    );
  }

  return {
    status: "switched",
    previousProjectId: identity.projectId,
    project,
    configPath: written.configPath,
  };
}
