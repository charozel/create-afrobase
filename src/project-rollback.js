import fs from "node:fs";

export function rollbackProject({
  projectPath,
  directoryCreated,
  createdArtifacts = [],
}) {
  const removedArtifacts = [];
  const preservedArtifacts = [];

  for (const artifactPath of [...createdArtifacts].reverse()) {
    if (!fs.existsSync(artifactPath)) {
      continue;
    }

    try {
      const stat = fs.statSync(artifactPath);

     if (stat.isDirectory()) {
  fs.rmdirSync(artifactPath);
} else {
  fs.unlinkSync(artifactPath);
}

      removedArtifacts.push(artifactPath);
    } catch {
      preservedArtifacts.push(artifactPath);
    }
  }

  let directoryRemoved = false;

  if (
    directoryCreated &&
    fs.existsSync(projectPath) &&
    fs.statSync(projectPath).isDirectory()
  ) {
    try {
      const contents = fs.readdirSync(projectPath);

      if (contents.length === 0) {
        fs.rmdirSync(projectPath);
        directoryRemoved = true;
      }
    } catch {
      directoryRemoved = false;
    }
  }

  return {
    success: preservedArtifacts.length === 0,
    removedArtifacts,
    preservedArtifacts,
    directoryRemoved,
  };
}