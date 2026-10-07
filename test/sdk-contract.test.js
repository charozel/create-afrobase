import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  scaffoldProject,
} from "../src/scaffold-project.js";

function createTemporaryProject() {
  return fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "create-afrobase-sdk-",
    ),
  );
}

test(
  "generated client implements the Afrobase SDK contract",
  () => {
    const projectPath =
      createTemporaryProject();

    try {
      const result =
        scaffoldProject(projectPath);

      assert.equal(result.success, true);

      const client = fs.readFileSync(
        result.clientPath,
        "utf8",
      );

      assert.match(
        client,
        /from "@afrobase\/sdk"/,
      );

      assert.match(
        client,
        /process\.env\.AFROBASE_PROJECT/,
      );

      assert.match(
        client,
        /new Afrobase\(\{/,
      );

      assert.match(
        client,
        /process\.env\.AFROBASE_API_URL/,
      );
    } finally {
      fs.rmSync(projectPath, {
        recursive: true,
        force: true,
      });
    }
  },
);

test(
  "generated environment preserves the public SDK configuration contract",
  () => {
    const projectPath =
      createTemporaryProject();

    try {
      const result =
        scaffoldProject(projectPath);

      assert.equal(result.success, true);

      const environment =
        fs.readFileSync(
          result.envExamplePath,
          "utf8",
        );

      assert.match(
        environment,
        /^AFROBASE_PROJECT=$/m,
      );

      assert.match(
        environment,
        /^AFROBASE_API_URL=https:\/\/impressive-clam-161\.convex\.site$/m,
      );

      assert.doesNotMatch(
        environment,
        /SECRET|TOKEN|PASSWORD/,
      );
    } finally {
      fs.rmSync(projectPath, {
        recursive: true,
        force: true,
      });
    }
  },
);