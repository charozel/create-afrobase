
import assert from "node:assert/strict";
import test from "node:test";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CloudLinkError,
  linkCloudProject,
} from "../src/cloud-link.js";

const PROJECT_ID =
  `proj_${"a".repeat(32)}`;

const OTHER_PROJECT_ID =
  `proj_${"b".repeat(32)}`;

function project(
  projectId = PROJECT_ID,
  name = "Afrobase",
) {
  return {
    projectId,
    name,
    slug: name.toLowerCase(),
    environment: "production",
    organization: {
      name: "Afrobase",
      slug: "afrobase",
    },
    role: "owner",
  };
}

function createLocalProject() {
  const directory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "afrobase-cloud-link-",
    ),
  );

  fs.writeFileSync(
    path.join(directory, "afrobase.json"),
    JSON.stringify(
      {
        name: "local-app",
        platform: "afrobase",
        version: 1,
        customSetting: "preserve-me",
      },
      null,
      2,
    ),
  );

  return directory;
}

function readConfig(directory) {
  return JSON.parse(
    fs.readFileSync(
      path.join(directory, "afrobase.json"),
      "utf8",
    ),
  );
}

test(
  "links an authorized cloud project",
  async (t) => {
    const directory = createLocalProject();

    t.after(() => {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    });

    const result = await linkCloudProject({
      projectPath: directory,
      projectId: PROJECT_ID,
      listProjects: async () => [
        project(),
      ],
    });

    assert.equal(result.status, "linked");

    const config = readConfig(directory);

    assert.equal(
      config.projectId,
      PROJECT_ID,
    );

    assert.equal(
      config.customSetting,
      "preserve-me",
    );
  },
);

test(
  "automatically selects the only accessible project",
  async (t) => {
    const directory = createLocalProject();

    t.after(() => {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    });

    const result = await linkCloudProject({
      projectPath: directory,
      listProjects: async () => [
        project(),
      ],
    });

    assert.equal(result.status, "linked");
    assert.equal(
      readConfig(directory).projectId,
      PROJECT_ID,
    );
  },
);

test(
  "requires explicit selection when multiple projects exist",
  async (t) => {
    const directory = createLocalProject();

    t.after(() => {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    });

    await assert.rejects(
      linkCloudProject({
        projectPath: directory,
        listProjects: async () => [
          project(),
          project(
            OTHER_PROJECT_ID,
            "Other",
          ),
        ],
      }),
      {
        name: "CloudLinkError",
        code: "project_selection_required",
      },
    );

    assert.equal(
      readConfig(directory).projectId,
      undefined,
    );
  },
);

test(
  "rejects projects absent from accessible cloud results",
  async (t) => {
    const directory = createLocalProject();

    t.after(() => {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    });

    await assert.rejects(
      linkCloudProject({
        projectPath: directory,
        projectId: OTHER_PROJECT_ID,
        listProjects: async () => [
          project(),
        ],
      }),
      {
        name: "CloudLinkError",
        code: "project_not_accessible",
      },
    );

    assert.equal(
      readConfig(directory).projectId,
      undefined,
    );
  },
);

test(
  "rejects malformed public project IDs before cloud discovery",
  async () => {
    let discoveryCalled = false;

    await assert.rejects(
      linkCloudProject({
        projectId: "proj_invalid",
        listProjects: async () => {
          discoveryCalled = true;
          return [];
        },
      }),
      {
        name: "CloudLinkError",
        code: "invalid_project_id",
      },
    );

    assert.equal(discoveryCalled, false);
  },
);

test(
  "refuses to overwrite a different existing project link",
  async (t) => {
    const directory = createLocalProject();

    t.after(() => {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    });

    fs.writeFileSync(
      path.join(directory, "afrobase.json"),
      JSON.stringify({
        name: "local-app",
        platform: "afrobase",
        version: 1,
        projectId: OTHER_PROJECT_ID,
      }),
    );

    await assert.rejects(
      linkCloudProject({
        projectPath: directory,
        projectId: PROJECT_ID,
        listProjects: async () => [
          project(),
        ],
      }),
      {
        name: "CloudLinkError",
        code: "PROJECT_ALREADY_LINKED",
      },
    );

    assert.equal(
      readConfig(directory).projectId,
      OTHER_PROJECT_ID,
    );
  },
);

test(
  "linking the same project twice is idempotent",
  async (t) => {
    const directory = createLocalProject();

    t.after(() => {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    });

    const options = {
      projectPath: directory,
      projectId: PROJECT_ID,
      listProjects: async () => [
        project(),
      ],
    };

    const first = await linkCloudProject(options);
    const second = await linkCloudProject(options);

    assert.equal(first.status, "linked");
    assert.equal(
      second.status,
      "already_linked",
    );
  },
);

test(
  "does not write credentials into local configuration",
  async (t) => {
    const directory = createLocalProject();

    t.after(() => {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    });

    await linkCloudProject({
      projectPath: directory,
      projectId: PROJECT_ID,
      listProjects: async () => [
        project(),
      ],
    });

    const contents = fs.readFileSync(
      path.join(directory, "afrobase.json"),
      "utf8",
    );

    assert.equal(
      contents.includes("af_cli_"),
      false,
    );

    assert.equal(
      contents.includes("token"),
      false,
    );
  },
);

test(
  "rejects missing local Afrobase configuration",
  async (t) => {
    const directory = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "afrobase-missing-config-",
      ),
    );

    t.after(() => {
      fs.rmSync(directory, {
        recursive: true,
        force: true,
      });
    });

    await assert.rejects(
      linkCloudProject({
        projectPath: directory,
        projectId: PROJECT_ID,
        listProjects: async () => [
          project(),
        ],
      }),
      CloudLinkError,
    );
  },
);
