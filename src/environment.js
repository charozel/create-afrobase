/**
 * Environment variables understood by Afrobase applications.
 *
 * Keep this contract aligned with the public Afrobase SDK and HTTP API.
 * Secrets should only be added here once their public runtime contract
 * has been formally defined.
 */

export const AFROBASE_ENV = Object.freeze({
  project: "AFROBASE_PROJECT",
  apiUrl: "AFROBASE_API_URL",
});

export function getEnvironmentStatus(
  environment = process.env,
) {
  const project =
    environment[AFROBASE_ENV.project];

  const apiUrl =
    environment[AFROBASE_ENV.apiUrl];

  const hasProject =
    typeof project === "string" &&
    project.trim().length > 0;

  const hasApiUrl =
    typeof apiUrl === "string" &&
    apiUrl.trim().length > 0;

  return {
    hasProject,
    hasApiUrl,
  };
}