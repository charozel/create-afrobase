
import {
  cloudRequest,
  CloudHttpError,
  normalizeCloudApiUrl,
} from "./cloud-http.js";

import {
  loadCliCredential,
} from "./credential-store.js";

import {
  CliSessionError,
} from "./cli-session.js";

/* ============================================================
   CLOUD02-C — CLOUD PROJECT DISCOVERY

   GET /api/control/v1/projects

   Trust boundaries:
   - CLI credential comes from secure local storage.
   - The server authorizes organization membership.
   - Project identity uses public proj_ IDs.
   - No raw tokens or internal Convex IDs are displayed.
============================================================ */

const PROJECT_ID_PATTERN = /^proj_[a-f0-9]{32}$/;

const ROLES = new Set([
  "owner",
  "admin",
  "developer",
  "finance",
  "viewer",
]);

const ENVIRONMENTS = new Set([
  "development",
  "staging",
  "production",
]);

function invalidResponse() {
  return new CloudHttpError(
    "Afrobase returned an invalid projects response.",
    {
      code: "invalid_response",
    },
  );
}

function validateProject(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.projectId !== "string" ||
    !PROJECT_ID_PATTERN.test(value.projectId) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    typeof value.slug !== "string" ||
    !value.slug.trim() ||
    !value.organization ||
    typeof value.organization !== "object" ||
    Array.isArray(value.organization) ||
    typeof value.organization.name !== "string" ||
    !value.organization.name.trim() ||
    typeof value.organization.slug !== "string" ||
    !value.organization.slug.trim() ||
    !ROLES.has(value.role) ||
    !(
      value.environment === null ||
      ENVIRONMENTS.has(value.environment)
    )
  ) {
    throw invalidResponse();
  }

  return {
    projectId: value.projectId,
    name: value.name,
    slug: value.slug,
    environment: value.environment,
    organization: {
      name: value.organization.name,
      slug: value.organization.slug,
    },
    role: value.role,
  };
}

export async function listCloudProjects({
  loadCredential = loadCliCredential,
  request = cloudRequest,
  apiUrl = process.env.AFROBASE_API_URL,
} = {}) {
  const credential = await loadCredential();

  if (
    !credential ||
    typeof credential.token !== "string" ||
    !credential.token
  ) {
    throw new CliSessionError(
      "Not signed in. Run create-afrobase login.",
      "not_authenticated",
    );
  }

  const response = await request(
    "/api/control/v1/projects",
    {
      method: "GET",
      bearerToken: credential.token,
      baseUrl: normalizeCloudApiUrl(apiUrl),
    },
  );

  if (
    response.status !== 200 ||
    !response.data ||
    !Array.isArray(response.data.projects)
  ) {
    throw invalidResponse();
  }

  const projects = response.data.projects.map(
    validateProject,
  );

  const seen = new Set();

  for (const project of projects) {
    if (seen.has(project.projectId)) {
      throw invalidResponse();
    }

    seen.add(project.projectId);
  }

  return projects;
}
