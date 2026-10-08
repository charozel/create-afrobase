
import test from "node:test";
import assert from "node:assert/strict";

import {
  CloudEnvironmentError,
  inspectCloudEnvironment,
} from "../src/cloud-environment.js";

/* ============================================================
   CLOUD02-H — ENVIRONMENT INSPECTION TESTS
============================================================ */

const PROJECT_ID =
  `proj_${"a".repeat(32)}`;

const PROJECT_PATH = "C:\\afrobase-test";

function verifiedStatus(overrides = {}) {
  return {
    status: "verified",
    local: {
      name: "my-fintech",
      configPath: "C:\\afrobase-test\\afrobase.json",
      projectId: PROJECT_ID,
    },
    cloud: {
      projectId: PROJECT_ID,
      name: "Afrobase",
      environment: "production",
      role: "owner",
      organization: {
        name: "Afrobase",
        slug: "afrobase",
      },
    },
    ...overrides,
  };
}

function inspect(result, options = {}) {
  return inspectCloudEnvironment({
    projectPath: PROJECT_PATH,
    getStatus: async () => result,
    ...options,
  });
}

test(
  "inspects a verified production environment",
  async () => {
    const result = await inspect(
      verifiedStatus(),
    );

    assert.equal(result.status, "inspected");
    assert.equal(result.projectId, PROJECT_ID);
    assert.equal(
      result.localProjectName,
      "my-fintech",
    );
    assert.equal(result.projectName, "Afrobase");
    assert.equal(
      result.organizationName,
      "Afrobase",
    );
    assert.equal(
      result.environment,
      "production",
    );
    assert.equal(result.role, "owner");
  },
);

test(
  "passes the local project path to verification",
  async () => {
    let receivedPath;

    await inspectCloudEnvironment({
      projectPath: PROJECT_PATH,
      getStatus: async ({ projectPath }) => {
        receivedPath = projectPath;
        return verifiedStatus();
      },
    });

    assert.equal(receivedPath, PROJECT_PATH);
  },
);

test(
  "refuses an unlinked local project",
  async () => {
    await assert.rejects(
      inspect({
        status: "unlinked",
        local: {
          name: "my-fintech",
          configPath: "afrobase.json",
        },
      }),
      (cause) => {
        assert.ok(
          cause instanceof CloudEnvironmentError,
        );

        assert.equal(
          cause.code,
          "project_unlinked",
        );

        return true;
      },
    );
  },
);

test(
  "refuses an inaccessible cloud project",
  async () => {
    await assert.rejects(
      inspect({
        status: "inaccessible",
        local: {
          name: "my-fintech",
          projectId: PROJECT_ID,
        },
      }),
      (cause) => {
        assert.equal(
          cause.code,
          "project_inaccessible",
        );

        return true;
      },
    );
  },
);

test(
  "rejects an unexpected verification status",
  async () => {
    await assert.rejects(
      inspect({
        status: "pending",
      }),
      {
        code: "verification_failed",
      },
    );
  },
);

test(
  "rejects malformed verification responses",
  async () => {
    for (const result of [
      null,
      undefined,
      [],
      "verified",
    ]) {
      await assert.rejects(
        inspect(result),
        {
          code: "invalid_status_result",
        },
      );
    }
  },
);

test(
  "rejects incomplete cloud project metadata",
  async () => {
    await assert.rejects(
      inspect(
        verifiedStatus({
          cloud: {
            name: "Afrobase",
            role: "owner",
          },
        }),
      ),
      {
        code: "invalid_project_metadata",
      },
    );
  },
);

test(
  "rejects malformed local public project IDs",
  async () => {
    const result = verifiedStatus();

    result.local.projectId =
      "proj_invalid";

    await assert.rejects(
      inspect(result),
      {
        code: "invalid_project_metadata",
      },
    );
  },
);

test(
  "rejects mismatched cloud project identities",
  async () => {
    const result = verifiedStatus();

    result.cloud.projectId =
      `proj_${"b".repeat(32)}`;

    await assert.rejects(
      inspect(result),
      {
        code: "project_identity_mismatch",
      },
    );
  },
);

test(
  "supports an unspecified cloud environment",
  async () => {
    const result = verifiedStatus();

    delete result.cloud.environment;

    const inspected = await inspect(result);

    assert.equal(
      inspected.environment,
      "unspecified",
    );
  },
);

test(
  "rejects invalid environment metadata",
  async () => {
    const result = verifiedStatus();

    result.cloud.environment = "";

    await assert.rejects(
      inspect(result),
      {
        code: "invalid_environment",
      },
    );
  },
);

test(
  "never exposes credentials or secret variables",
  async () => {
    const result = verifiedStatus();

    result.cloud.apiKey =
      "secret-api-key";

    result.cloud.variables = {
      DATABASE_URL: "private-database-url",
    };

    result.local.token =
      "private-cli-token";

    const inspected = await inspect(result);

    const serialized =
      JSON.stringify(inspected);

    assert.equal(
      serialized.includes("secret-api-key"),
      false,
    );

    assert.equal(
      serialized.includes("private-database-url"),
      false,
    );

    assert.equal(
      serialized.includes("private-cli-token"),
      false,
    );

    assert.equal(
      Object.hasOwn(inspected, "variables"),
      false,
    );
  },
);

test(
  "rejects invalid project paths",
  async () => {
    await assert.rejects(
      inspectCloudEnvironment({
        projectPath: "",
        getStatus: async () =>
          verifiedStatus(),
      }),
      {
        code: "invalid_project_path",
      },
    );
  },
);

test(
  "rejects invalid status providers",
  async () => {
    await assert.rejects(
      inspectCloudEnvironment({
        projectPath: PROJECT_PATH,
        getStatus: null,
      }),
      {
        code: "invalid_status_provider",
      },
    );
  },
);

test(
  "does not mutate the verification response",
  async () => {
    const result = verifiedStatus();

    const before = JSON.stringify(result);

    await inspect(result);

    assert.equal(
      JSON.stringify(result),
      before,
    );
  },
);
