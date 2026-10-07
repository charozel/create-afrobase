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
      "create-afrobase-scaffold-",
    ),
  );
}

test(
  "scaffoldProject generates the Afrobase project resources",
  () => {
    const projectPath =
      createTemporaryProject();

    try {
      const result =
        scaffoldProject(projectPath);

      assert.equal(result.success, true);
      assert.equal(
        result.reason,
        "PROJECT_SCAFFOLDED",
      );

      assert.equal(
        fs.existsSync(
          path.join(
            projectPath,
            "afrobase",
            "README.md",
          ),
        ),
        true,
      );

      assert.equal(
        fs.existsSync(
          path.join(
            projectPath,
            "afrobase",
            "client.ts",
          ),
        ),
        true,
      );

      assert.equal(
        fs.existsSync(
          path.join(
            projectPath,
            ".env.example",
          ),
        ),
        true,
      );

      assert.equal(
        fs.existsSync(
          path.join(
            projectPath,
            ".gitignore",
          ),
        ),
        true,
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
  "scaffoldProject refuses to overwrite an existing Afrobase directory",
  () => {
    const projectPath =
      createTemporaryProject();

    try {
      fs.mkdirSync(
        path.join(
          projectPath,
          "afrobase",
        ),
      );

      const result =
        scaffoldProject(projectPath);

      assert.equal(result.success, false);
      assert.equal(
        result.reason,
        "AFROBASE_DIRECTORY_EXISTS",
      );
    } finally {
      fs.rmSync(projectPath, {
        recursive: true,
        force: true,
      });
    }
  },
);