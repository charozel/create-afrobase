const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9-_]*$/;

export function validateProjectName(projectName) {
  if (!projectName) {
    return {
      valid: false,
      message: "A project name is required.",
    };
  }

  if (projectName === "." || projectName === "..") {
    return {
      valid: false,
      message: "Project name cannot be '.' or '..'.",
    };
  }

  if (projectName.length > 100) {
    return {
      valid: false,
      message: "Project name must be 100 characters or fewer.",
    };
  }

  if (!PROJECT_NAME_PATTERN.test(projectName)) {
    return {
      valid: false,
      message:
        "Project name may contain lowercase letters, numbers, hyphens, and underscores only.",
    };
  }

  return {
    valid: true,
    message: null,
  };
}