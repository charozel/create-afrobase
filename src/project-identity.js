export function getProjectIdentity(config) {
  const projectId =
    typeof config?.projectId === "string"
      ? config.projectId
      : null;

  return {
    linked: projectId !== null,
    projectId,
  };
}