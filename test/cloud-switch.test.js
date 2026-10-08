
import assert from "node:assert/strict";
import test from "node:test";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CloudSwitchError,
  switchCloudProject,
} from "../src/cloud-switch.js";

const FIRST_ID = `proj_${"a".repeat(32)}`;
const SECOND_ID = `proj_${"b".repeat(32)}`;
const UNKNOWN_ID = `proj_${"c".repeat(32)}`;

const projects = [
  {
    projectId: FIRST_ID,
    name: "Afrobase Development",
    slug: "afrobase-dev",
    environment: "development",
    organization: {
      name: "Afrobase",
      slug: "afrobase",
    },
    role: "owner",
  },
  {
    projectId: SECOND_ID,
    name: "Afrobase Production",
    slug: "afrobase-production",
    environment: "production",
    organization: {
      name: "Afrobase",
      slug: "afrobase",
    },
    role: "owner",
  },
];

function createProject(t, {
  linked = true,
} = {}) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "afrobase-switch-"),
  );

  t.after(() => {
    fs.rmSync(directory, {
      recursive: true,
      force: true,
    });
  });

  const config = {
    name: "local-app",
    platform: "afrobase",
    version: 1,
    sdk: {
      package: "@afrobase/sdk",
    },
  };

  if (linked) {
    config.projectId = FIRST_ID;
  }

  fs.writeFileSync(
    path.join(directory, "afrobase.json"),
    `${JSON.stringify(config, null, 2)}\n`,
  );

  return directory;
}

function configPath(directory) {
  return path.join(directory, "afrobase.json");
}

function readConfig(directory) {
  return JSON.parse(
    fs.readFileSync(configPath(directory), "utf8"),
  );
}

function discover() {
  return projects;
}

test(
  "switches between accessible cloud projects",
  async (t) => {
    const directory = createProject(t);

    const result = await switchCloudProject({
      projectPath: directory,
      projectId: SECOND_ID,
      listProjects: discover,
    });

    assert.equal(result.status, "switched");
    assert.equal(result.previousProjectId, FIRST_ID);
    assert.equal(result.project.projectId, SECOND_ID);
    assert.equal(readConfig(directory).projectId, SECOND_ID);
  },
);

test(
  "preserves SDK and unrelated configuration",
  async (t) => {
    const directory = createProject(t);

    const before = readConfig(directory);

    await switchCloudProject({
      projectPath: directory,
      projectId: SECOND_ID,
      listProjects: discover,
    });

    const after = readConfig(directory);

    assert.deepEqual(
      after,
      {
        ...before,
        projectId: SECOND_ID,
      },
    );
  },
);

test(
  "switching to the current project is idempotent",
  async (t) => {
    const directory = createProject(t);

    const before = fs.readFileSync(
      configPath(directory),
      "utf8",
    );

    const result = await switchCloudProject({
      projectPath: directory,
      projectId: FIRST_ID,
      listProjects: discover,
    });

    const after = fs.readFileSync(
      configPath(directory),
      "utf8",
    );

    assert.equal(
      result.status,
      "already_selected",
    );

    assert.equal(after, before);
  },
);

test(
  "rejects inaccessible target without writing",
  async (t) => {
    const directory = createProject(t);

    const before = readConfig(directory);

    await assert.rejects(
      switchCloudProject({
        projectPath: directory,
        projectId: UNKNOWN_ID,
        listProjects: discover,
      }),
      {
        name: "CloudSwitchError",
        code: "project_not_accessible",
      },
    );

    assert.deepEqual(
      readConfig(directory),
      before,
    );
  },
);

test(
  "rejects malformed target IDs before cloud discovery",
  async (t) => {
    const directory = createProject(t);

    let called = false;

    await assert.rejects(
      switchCloudProject({
        projectPath: directory,
        projectId: "proj_invalid",
        listProjects: () => {
          called = true;
          return projects;
        },
      }),
      {
        code: "invalid_project_id",
      },
    );

    assert.equal(called, false);
  },
);

test(
  "requires an existing local project link",
  async (t) => {
    const directory = createProject(t, {
      linked: false,
    });

    await assert.rejects(
      switchCloudProject({
        projectPath: directory,
        projectId: SECOND_ID,
        listProjects: discover,
      }),
      {
        code: "project_not_linked",
      },
    );
  },
);

test(
  "rejects missing configuration",
  async (t) => {
    const directory = createProject(t);

    fs.rmSync(configPath(directory));

    await assert.rejects(
      switchCloudProject({
        projectPath: directory,
        projectId: SECOND_ID,
        listProjects: discover,
      }),
      {
        name: "CloudSwitchError",
      },
    );
  },
);

test(
  "rejects invalid cloud discovery responses",
  async (t) => {
    const directory = createProject(t);

    await assert.rejects(
      switchCloudProject({
        projectPath: directory,
        projectId: SECOND_ID,
        listProjects: () => null,
      }),
      {
        code: "invalid_projects",
      },
    );
  },
);

test(
  "rejects incomplete selected cloud metadata",
  async (t) => {
    const directory = createProject(t);

    await assert.rejects(
      switchCloudProject({
        projectPath: directory,
        projectId: SECOND_ID,
        listProjects: () => [
          {
            projectId: SECOND_ID,
            name: "Incomplete",
          },
        ],
      }),
      {
        code: "invalid_cloud_project",
      },
    );
  },
);

test(
  "does not modify local config if writing fails",
  async (t) => {
    const directory = createProject(t);

    const before = readConfig(directory);

    await assert.rejects(
      switchCloudProject({
        projectPath: directory,
        projectId: SECOND_ID,
        listProjects: discover,
        writeConfig: () => ({
          success: false,
          reason: "WRITE_FAILED",
          message: "Unable to save config.",
        }),
      }),
      {
        code: "WRITE_FAILED",
      },
    );

    assert.deepEqual(
      readConfig(directory),
      before,
    );
  },
);

test(
  "rejects malformed existing project IDs",
  async (t) => {
    const directory = createProject(t);

    const config = readConfig(directory);
    config.projectId = "proj_invalid";

    fs.writeFileSync(
      configPath(directory),
      JSON.stringify(config),
    );

    await assert.rejects(
      switchCloudProject({
        projectPath: directory,
        projectId: SECOND_ID,
        listProjects: discover,
      }),
      {
        code: "invalid_existing_project_id",
      },
    );
  },
);

test(
  "does not write credentials into project config",
  async (t) => {
    const directory = createProject(t);

    await switchCloudProject({
      projectPath: directory,
      projectId: SECOND_ID,
      listProjects: discover,
    });

    const serialized = fs.readFileSync(
      configPath(directory),
      "utf8",
    );

    assert.equal(
      serialized.includes("af_cli_"),
      false,
    );

    assert.equal(
      Object.hasOwn(readConfig(directory), "token"),
      false,
    );
  },
);
