import fs from "node:fs";
import path from "node:path";

const METADATA_FILE = "afrobase.json";
const METADATA_VERSION = 1;

/**
 * Creates the local Afrobase project manifest.
 *
 * afrobase.json contains non-secret project metadata only.
 * Runtime credentials must never be written here.
 */
export function createProjectMetadata(
  projectPath,
  projectName,
) {
  const metadataPath = path.join(
    projectPath,
    METADATA_FILE,
  );

  const metadata = {
    name: projectName,
    platform: "afrobase",
    version: METADATA_VERSION,
    sdk: {
      package: "@afrobase/sdk",
    },
  };

  try {
    fs.writeFileSync(
      metadataPath,
      `${JSON.stringify(metadata, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
  } catch (cause) {
    return {
      success: false,
      reason: "METADATA_WRITE_ERROR",
      message:
        "Afrobase project metadata could not be created.",
      metadataPath,
      cause,
    };
  }

  return {
    success: true,
    reason: "METADATA_CREATED",
    metadataPath,
    metadata,
  };
}