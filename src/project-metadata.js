import fs from "node:fs";
import path from "node:path";

const METADATA_FILE = "afrobase.json";

export function createProjectMetadata(projectPath, projectName) {
  const metadataPath = path.join(projectPath, METADATA_FILE);

  const metadata = {
    name: projectName,
    platform: "afrobase",
    version: 1,
  };

  fs.writeFileSync(
    metadataPath,
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );

  return {
    metadataPath,
    metadata,
  };
}