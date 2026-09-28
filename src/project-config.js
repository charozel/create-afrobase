import fs from "node:fs";
import path from "node:path";

import { validateProjectName } from "./project-name.js";

const CONFIG_FILE_NAME = "afrobase.json";
const SUPPORTED_CONFIG_VERSION = 1;
const PROJECT_ID_PATTERN = /^proj_[a-zA-Z0-9_-]+$/;

/* ============================================================
   PROJECT CONFIG VALIDATION
============================================================ */

export function validateProjectConfig(config) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    return {
      valid: false,
      reason: "INVALID_CONFIG",
      message: "Afrobase configuration must be a JSON object.",
    };
  }

  const projectNameValidation = validateProjectName(
    config.name,
  );

  if (!projectNameValidation.valid) {
    return {
      valid: false,
      reason: "INVALID_PROJECT_NAME",
      message: projectNameValidation.message,
    };
  }

  if (config.platform !== "afrobase") {
    return {
      valid: false,
      reason: "INVALID_PLATFORM",
      message:
        'Afrobase configuration requires platform "afrobase".',
    };
  }

  if (config.version !== SUPPORTED_CONFIG_VERSION) {
    return {
      valid: false,
      reason: "UNSUPPORTED_CONFIG_VERSION",
      message:
        `Unsupported Afrobase configuration version: ${config.version}.`,
    };
  }

if (
  config.projectId !== undefined &&
  (
    typeof config.projectId !== "string" ||
    !PROJECT_ID_PATTERN.test(config.projectId)
  )
) {
  return {
    valid: false,
    reason: "INVALID_PROJECT_ID",
    message:
      'Afrobase project ID must begin with "proj_" and contain only letters, numbers, hyphens, or underscores.',
  };
}

  return {
    valid: true,
    reason: "VALID_CONFIG",
    message: null,
  };
}

/* ============================================================
   PROJECT CONFIG READER
============================================================ */

export function readProjectConfig(projectPath) {
  const configPath = path.join(
    projectPath,
    CONFIG_FILE_NAME,
  );

  if (!fs.existsSync(configPath)) {
    return {
      success: false,
      reason: "CONFIG_NOT_FOUND",
      message:
        `No "${CONFIG_FILE_NAME}" configuration file was found.`,
      configPath,
    };
  }

  let contents;

  try {
    contents = fs.readFileSync(
      configPath,
      "utf8",
    );
  } catch {
    return {
      success: false,
      reason: "CONFIG_READ_ERROR",
      message:
        `Unable to read "${CONFIG_FILE_NAME}".`,
      configPath,
    };
  }

  let config;

  try {
    config = JSON.parse(contents);
  } catch {
    return {
      success: false,
      reason: "INVALID_JSON",
      message:
        `"${CONFIG_FILE_NAME}" contains invalid JSON.`,
      configPath,
    };
  }

  const validation = validateProjectConfig(config);

  if (!validation.valid) {
    return {
      success: false,
      reason: validation.reason,
      message: validation.message,
      configPath,
    };
  }

  return {
    success: true,
    reason: "CONFIG_LOADED",
    message: null,
    configPath,
    config,
  };
}

/* ============================================================
   PROJECT CONFIG WRITER
============================================================ */
export function writeProjectConfig(
  projectPath,
  config,
) {
  const validation = validateProjectConfig(config);

  if (!validation.valid) {
    return {
      success: false,
      reason: validation.reason,
      message: validation.message,
    };
  }

  const configPath = path.join(
    projectPath,
    CONFIG_FILE_NAME,
  );

  const tempConfigPath = path.join(
    projectPath,
    `.${CONFIG_FILE_NAME}.${process.pid}.tmp`,
  );

let tempCreated = false;
  try {
    fs.writeFileSync(
      tempConfigPath,
      `${JSON.stringify(config, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
tempCreated = true;
    fs.renameSync(
      tempConfigPath,
      configPath,
    );
  } catch {
    try {
     if (
  tempCreated &&
  fs.existsSync(tempConfigPath)
) {
  fs.unlinkSync(tempConfigPath);
}
    } catch {
      // Preserve the original write failure.
    }

    return {
      success: false,
      reason: "CONFIG_WRITE_ERROR",
      message:
        `Unable to write "${CONFIG_FILE_NAME}".`,
      configPath,
    };
  }

  return {
    success: true,
    reason: "CONFIG_WRITTEN",
    message: null,
    configPath,
    config,
  };
}