
import {
  listCloudProjects,
} from "./cloud-projects.js";

import {
  linkProject,
} from "./project-link.js";

const PROJECT_ID_PATTERN =
  /^proj_[a-f0-9]{32}$/;

export class CloudLinkError extends Error {
  constructor(
    message,
    code = "cloud_link_error",
  ) {
    super(message);
    this.name = "CloudLinkError";
    this.code = code;
  }
}

export async function linkCloudProject({
  projectPath = process.cwd(),
  projectId,
  listProjects = listCloudProjects,
  linkLocalProject = linkProject,
} = {}) {
  if (
    projectId !== undefined &&
    (
      typeof projectId !== "string" ||
      !PROJECT_ID_PATTERN.test(projectId)
    )
  ) {
    throw new CloudLinkError(
      "Invalid cloud project ID. Expected proj_ followed by 32 lowercase hexadecimal characters.",
      "invalid_project_id",
    );
  }

  const projects = await listProjects();

  if (!Array.isArray(projects)) {
    throw new CloudLinkError(
      "Cloud project discovery returned an invalid result.",
      "invalid_projects",
    );
  }

  if (projects.length === 0) {
    throw new CloudLinkError(
      "No accessible cloud projects found. Create a project in Afrobase Cloud first.",
      "no_projects",
    );
  }

  let selectedProject;

  if (projectId) {
    selectedProject = projects.find(
      (project) =>
        project.projectId === projectId,
    );

    if (!selectedProject) {
      throw new CloudLinkError(
        "Project not found among your accessible cloud projects.",
        "project_not_accessible",
      );
    }
  } else if (projects.length === 1) {
    selectedProject = projects[0];
  } else {
    throw new CloudLinkError(
      'Multiple cloud projects found. Run "create-afrobase projects", then "create-afrobase link <projectId>".',
      "project_selection_required",
    );
  }

  if (
    !selectedProject ||
    !PROJECT_ID_PATTERN.test(
      selectedProject.projectId,
    )
  ) {
    throw new CloudLinkError(
      "Selected cloud project has an invalid public ID.",
      "invalid_project_id",
    );
  }

  const result = await linkLocalProject(
    projectPath,
    selectedProject.projectId,
  );

  if (
    !result ||
    result.success !== true
  ) {
    throw new CloudLinkError(
      result?.message ??
        "Unable to link the local Afrobase project.",
      result?.reason ?? "link_failed",
    );
  }

  return {
    status:
      result.reason === "ALREADY_LINKED"
        ? "already_linked"
        : "linked",
    project: {
      projectId: selectedProject.projectId,
      name: selectedProject.name,
      slug: selectedProject.slug,
      organization: {
        name: selectedProject.organization.name,
        slug: selectedProject.organization.slug,
      },
    },
    configPath: result.configPath,
  };
}
