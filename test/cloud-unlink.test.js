
import assert from "node:assert/strict";
import test from "node:test";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CloudUnlinkError,
  unlinkCloudProject,
} from "../src/cloud-unlink.js";

const PROJECT_ID =
  `proj_${"a".repeat(32)}`;

function createLocalProject({
  linked = true,
} = {}) {
  const directory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "afrobase-unlink-",
    ),
  );

  const config = {
    name: "local-app",
    platform: "afrobase",
    version: 1,
    sdk: {
      package: "@afrobase/sdk",
    },
    customSetting: "preserve-me",
  };

  if (linked) {
    config.projectId = PROJECT_ID;
  }

  fs.writeFileSync(
    path.join(
      directory,
      "afrobase.json",
    ),
    `${JSON.stringify(config, null, 2)}\n`,
  );

  return directory;
}

function cleanup(t, directory) {
  t.after(() => {
    fs.rmSync(directory, {
      recursive: true,
      force: true,
    });
  });
}

function readConfig(directory) {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        directory,
        "afrobase.json",
      ),
      "utf8",
    ),
  );
}

test(
  "unlinks a local cloud project",
  async (t) => {
    const directory = createLocalProject();
    cleanup(t, directory);

    const result = await unlinkCloudProject({
      projectPath: directory,
    });

    assert.equal(
      result.status,
      "unlinked",
    );

    assert.equal(
      result.projectName,
      "local-app",
    );

    assert.equal(
      readConfig(directory).projectId,
      undefined,
    );
  },
);

test(
  "preserves SDK and unrelated configuration",
  async (t) => {
    const directory = createLocalProject();
    cleanup(t, directory);

    await unlinkCloudProject({
      projectPath: directory,
    });

    const config = readConfig(directory);

    assert.equal(
      config.name,
      "local-app",
    );

    assert.equal(
      config.platform,
      "afrobase",
    );

    assert.equal(
      config.version,
      1,
    );

    assert.deepEqual(
      config.sdk,
      {
        package: "@afrobase/sdk",
      },
    );

    assert.equal(
      config.customSetting,
      "preserve-me",
    );
  },
);

test(
  "unlinking twice is idempotent",
  async (t) => {
    const directory = createLocalProject();
    cleanup(t, directory);

    const first = await unlinkCloudProject({
      projectPath: directory,
    });

    const second = await unlinkCloudProject({
      projectPath: directory,
    });

    assert.equal(
      first.status,
      "unlinked",
    );

    assert.equal(
      second.status,
      "already_unlinked",
    );
  },
);

test(
  "already-unlinked configuration remains unchanged",
  async (t) => {
    const directory = createLocalProject({
      linked: false,
    });

    cleanup(t, directory);

    const configPath = path.join(
      directory,
      "afrobase.json",
    );

    const before = fs.readFileSync(
      configPath,
      "utf8",
    );

    const result = await unlinkCloudProject({
      projectPath: directory,
    });

    const after = fs.readFileSync(
      configPath,
      "utf8",
    );

    assert.equal(
      result.status,
      "already_unlinked",
    );

    assert.equal(
      after,
      before,
    );
  },
);

test(
  "rejects missing local configuration",
  async (t) => {
    const directory = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "afrobase-unlink-missing-",
      ),
    );

    cleanup(t, directory);

    await assert.rejects(
      unlinkCloudProject({
        projectPath: directory,
      }),
      {
        name: "CloudUnlinkError",
        code: "CONFIG_NOT_FOUND",
      },
    );
  },
);

test(
  "rejects invalid local JSON without modifying it",
  async (t) => {
    const directory = createLocalProject();
    cleanup(t, directory);

    const configPath = path.join(
      directory,
      "afrobase.json",
    );

    const invalidContents =
      "{ invalid json";

    fs.writeFileSync(
      configPath,
      invalidContents,
    );

    await assert.rejects(
      unlinkCloudProject({
        projectPath: directory,
      }),
      {
        name: "CloudUnlinkError",
        code: "INVALID_JSON",
      },
    );

    assert.equal(
      fs.readFileSync(
        configPath,
        "utf8",
      ),
      invalidContents,
    );
  },
);

test(
  "does not invoke cloud discovery",
  async (t) => {
    const directory = createLocalProject();
    cleanup(t, directory);

    const result = await unlinkCloudProject({
      projectPath: directory,
    });

    assert.equal(
      result.status,
      "unlinked",
    );
  },
);

test(
  "converts unexpected unlink exceptions into safe errors",
  async () => {
    await assert.rejects(
      unlinkCloudProject({
        unlinkLocalProject: () => {
          throw new Error(
            "Sensitive internal error",
          );
        },
      }),
      {
        name: "CloudUnlinkError",
        code: "unlink_failed",
      },
    );
  },
);

test(
  "rejects unexpected unlink result codes",
  async () => {
    await assert.rejects(
      unlinkCloudProject({
        unlinkLocalProject: () => ({
          success: true,
          reason: "UNKNOWN_RESULT",
          configPath: "afrobase.json",
          config: {
            name: "local-app",
          },
        }),
      }),
      {
        name: "CloudUnlinkError",
        code: "invalid_unlink_result",
      },
    );
  },
);
