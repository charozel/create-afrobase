
import assert from "node:assert/strict";
import test from "node:test";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CloudStatusError,
  getCloudProjectStatus,
} from "../src/cloud-status.js";

const PROJECT_ID =
  `proj_${"a".repeat(32)}`;

const OTHER_PROJECT_ID =
  `proj_${"b".repeat(32)}`;

function cloudProject(
  projectId = PROJECT_ID,
) {
  return {
    projectId,
    name: "Afrobase",
    slug: "afrobase",
    environment: "production",
    organization: {
      name: "Afrobase",
      slug: "afrobase",
    },
    role: "owner",
  };
}

function createLocalProject(
  projectId,
) {
  const directory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "afrobase-status-",
    ),
  );

  const config = {
    name: "local-app",
    platform: "afrobase",
    version: 1,
    sdk: {
      package: "@afrobase/sdk",
    },
  };

  if (projectId !== undefined) {
    config.projectId = projectId;
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

test(
  "verifies an accessible linked project",
  async (t) => {
    const directory = createLocalProject(
      PROJECT_ID,
    );

    cleanup(t, directory);

    const result = await getCloudProjectStatus({
      projectPath: directory,
      listProjects: async () => [
        cloudProject(),
      ],
    });

    assert.equal(
      result.status,
      "verified",
    );

    assert.equal(
      result.local.projectId,
      PROJECT_ID,
    );

    assert.equal(
      result.cloud.name,
      "Afrobase",
    );

    assert.equal(
      result.cloud.organization.name,
      "Afrobase",
    );

    assert.equal(
      result.cloud.role,
      "owner",
    );
  },
);

test(
  "reports an unlinked project without calling cloud",
  async (t) => {
    const directory = createLocalProject();

    cleanup(t, directory);

    let cloudCalled = false;

    const result = await getCloudProjectStatus({
      projectPath: directory,
      listProjects: async () => {
        cloudCalled = true;
        return [];
      },
    });

    assert.equal(
      result.status,
      "unlinked",
    );

    assert.equal(
      result.local.projectId,
      null,
    );

    assert.equal(
      result.cloud,
      null,
    );

    assert.equal(
      cloudCalled,
      false,
    );
  },
);

test(
  "reports an inaccessible linked project",
  async (t) => {
    const directory = createLocalProject(
      PROJECT_ID,
    );

    cleanup(t, directory);

    const result = await getCloudProjectStatus({
      projectPath: directory,
      listProjects: async () => [
        cloudProject(
          OTHER_PROJECT_ID,
        ),
      ],
    });

    assert.equal(
      result.status,
      "inaccessible",
    );

    assert.equal(
      result.cloud,
      null,
    );
  },
);

test(
  "rejects missing local configuration",
  async (t) => {
    const directory = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "afrobase-status-missing-",
      ),
    );

    cleanup(t, directory);

    await assert.rejects(
      getCloudProjectStatus({
        projectPath: directory,
        listProjects: async () => [],
      }),
      {
        name: "CloudStatusError",
        code: "CONFIG_NOT_FOUND",
      },
    );
  },
);

test(
  "rejects invalid local configuration",
  async (t) => {
    const directory = createLocalProject(
      PROJECT_ID,
    );

    cleanup(t, directory);

    fs.writeFileSync(
      path.join(
        directory,
        "afrobase.json",
      ),
      "{ invalid json",
    );

    await assert.rejects(
      getCloudProjectStatus({
        projectPath: directory,
        listProjects: async () => [],
      }),
      {
        name: "CloudStatusError",
        code: "INVALID_JSON",
      },
    );
  },
);

test(
  "rejects malformed linked public IDs",
  async (t) => {
    const directory = createLocalProject(
      "proj_invalid",
    );

    cleanup(t, directory);

    let cloudCalled = false;

    await assert.rejects(
      getCloudProjectStatus({
        projectPath: directory,
        listProjects: async () => {
          cloudCalled = true;
          return [];
        },
      }),
      {
        name: "CloudStatusError",
        code: "invalid_project_id",
      },
    );

    assert.equal(
      cloudCalled,
      false,
    );
  },
);

test(
  "does not confuse network failures with inaccessible projects",
  async (t) => {
    const directory = createLocalProject(
      PROJECT_ID,
    );

    cleanup(t, directory);

    await assert.rejects(
      getCloudProjectStatus({
        projectPath: directory,
        listProjects: async () => {
          throw new Error(
            "Network unavailable",
          );
        },
      }),
      {
        name: "CloudStatusError",
        code: "cloud_verification_failed",
      },
    );
  },
);

test(
  "rejects invalid cloud response envelopes",
  async (t) => {
    const directory = createLocalProject(
      PROJECT_ID,
    );

    cleanup(t, directory);

    await assert.rejects(
      getCloudProjectStatus({
        projectPath: directory,
        listProjects: async () => null,
      }),
      {
        name: "CloudStatusError",
        code: "invalid_cloud_response",
      },
    );
  },
);

test(
  "status does not modify local configuration",
  async (t) => {
    const directory = createLocalProject(
      PROJECT_ID,
    );

    cleanup(t, directory);

    const configPath = path.join(
      directory,
      "afrobase.json",
    );

    const before = fs.readFileSync(
      configPath,
      "utf8",
    );

    await getCloudProjectStatus({
      projectPath: directory,
      listProjects: async () => [
        cloudProject(),
      ],
    });

    const after = fs.readFileSync(
      configPath,
      "utf8",
    );

    assert.equal(
      after,
      before,
    );
  },
);

test(
  "status does not call cloud when local config is missing",
  async (t) => {
    const directory = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "afrobase-status-no-config-",
      ),
    );

    cleanup(t, directory);

    let cloudCalled = false;

    await assert.rejects(
      getCloudProjectStatus({
        projectPath: directory,
        listProjects: async () => {
          cloudCalled = true;
          return [];
        },
      }),
      CloudStatusError,
    );

    assert.equal(
      cloudCalled,
      false,
    );
  },
);
