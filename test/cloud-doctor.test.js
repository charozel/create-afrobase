
import test from "node:test";
import assert from "node:assert/strict";

import {
  CloudDoctorError,
  diagnoseCloudProject,
} from "../src/cloud-doctor.js";

const PROJECT_ID = `proj_${"a".repeat(32)}`;
const PROJECT_PATH = "C:\\afrobase-doctor-test";

function validConfig() {
  return {
    success: true,
    configPath: `${PROJECT_PATH}\\afrobase.json`,
    config: {
      name: "my-fintech",
      platform: "afrobase",
      version: 1,
      projectId: PROJECT_ID,
      sdk: {
        package: "@afrobase/sdk",
      },
    },
  };
}

function verifiedStatus() {
  return {
    status: "verified",
    local: {
      name: "my-fintech",
      projectId: PROJECT_ID,
    },
    cloud: {
      projectId: PROJECT_ID,
      name: "Afrobase",
      environment: "production",
      role: "owner",
      organization: {
        name: "Afrobase",
      },
    },
  };
}

function runDoctor(overrides = {}) {
  return diagnoseCloudProject({
    projectPath: PROJECT_PATH,
    readConfig: async () => validConfig(),
    loadCredential: async () => ({
      token: "test-only-token",
    }),
    verifyDeveloper: async () => ({
      email: "developer@example.com",
    }),
    verifyProject: async () => verifiedStatus(),
    ...overrides,
  });
}

function check(result, id) {
  return result.checks.find(
    (item) => item.id === id,
  );
}

test(
  "reports a healthy project when all checks pass",
  async () => {
    const result = await runDoctor();

    assert.equal(result.status, "healthy");
    assert.equal(result.passed, 5);
    assert.equal(result.failed, 0);
    assert.equal(result.checks.length, 5);
    assert.equal(result.cloudReachable, true);

    for (const item of result.checks) {
      assert.equal(item.status, "pass");
    }
  },
);

test(
  "passes the project path to local configuration reader",
  async () => {
    let receivedPath;

    await runDoctor({
      readConfig: async (projectPath) => {
        receivedPath = projectPath;
        return validConfig();
      },
    });

    assert.equal(receivedPath, PROJECT_PATH);
  },
);

test(
  "passes the project path to cloud verification",
  async () => {
    let receivedPath;

    await runDoctor({
      verifyProject: async ({ projectPath }) => {
        receivedPath = projectPath;
        return verifiedStatus();
      },
    });

    assert.equal(receivedPath, PROJECT_PATH);
  },
);

test(
  "reports missing configuration without stopping other checks",
  async () => {
    const result = await runDoctor({
      readConfig: async () => ({
        success: false,
        reason: "CONFIG_NOT_FOUND",
      }),
    });

    assert.equal(result.status, "unhealthy");
    assert.equal(
      check(result, "configuration").status,
      "fail",
    );
    assert.equal(
      check(result, "credential").status,
      "pass",
    );
    assert.equal(
      check(result, "cloud").status,
      "pass",
    );
    assert.equal(
      check(result, "project").status,
      "fail",
    );
    assert.equal(result.checks.length, 5);
  },
);

test(
  "reports unreadable configuration safely",
  async () => {
    const result = await runDoctor({
      readConfig: async () => {
        throw new Error("Private filesystem path");
      },
    });

    assert.equal(
      check(result, "configuration").status,
      "fail",
    );

    assert.equal(
      JSON.stringify(result).includes(
        "Private filesystem path",
      ),
      false,
    );
  },
);

test(
  "reports a missing CLI credential",
  async () => {
    let developerCalls = 0;

    const result = await runDoctor({
      loadCredential: async () => null,
      verifyDeveloper: async () => {
        developerCalls++;
        return {
          email: "developer@example.com",
        };
      },
    });

    assert.equal(developerCalls, 0);
    assert.equal(
      check(result, "credential").status,
      "fail",
    );
    assert.equal(
      check(result, "cloud").status,
      "fail",
    );
    assert.equal(
      check(result, "project").status,
      "fail",
    );
  },
);

test(
  "rejects expired credentials",
  async () => {
    const result = await runDoctor({
      loadCredential: async () => ({
        token: "expired-token",
        expiresAt: Date.now() - 1000,
      }),
    });

    assert.equal(
      check(result, "credential").status,
      "fail",
    );
  },
);

test(
  "reports credential storage failures without leaking errors",
  async () => {
    const result = await runDoctor({
      loadCredential: async () => {
        throw new Error("Secret credential location");
      },
    });

    assert.equal(
      check(result, "credential").status,
      "fail",
    );

    assert.equal(
      JSON.stringify(result).includes(
        "Secret credential location",
      ),
      false,
    );
  },
);

test(
  "reports failed cloud authentication",
  async () => {
    let projectCalls = 0;

    const result = await runDoctor({
      verifyDeveloper: async () => {
        const cause = new Error("Unauthorized");
        cause.code = "not_authenticated";
        throw cause;
      },
      verifyProject: async () => {
        projectCalls++;
        return verifiedStatus();
      },
    });

    assert.equal(projectCalls, 0);
    assert.equal(
      check(result, "cloud").status,
      "fail",
    );
    assert.equal(
      check(result, "project").status,
      "fail",
    );
  },
);

test(
  "reports cloud network or verification failures safely",
  async () => {
    const result = await runDoctor({
      verifyDeveloper: async () => {
        const cause = new Error(
          "Sensitive internal network error",
        );
        cause.code = "network_error";
        throw cause;
      },
    });

    assert.equal(result.cloudReachable, false);
    assert.equal(
      check(result, "cloud").status,
      "fail",
    );

    assert.equal(
      JSON.stringify(result).includes(
        "Sensitive internal network error",
      ),
      false,
    );
  },
);

test(
  "reports an inaccessible cloud project",
  async () => {
    const result = await runDoctor({
      verifyProject: async () => ({
        status: "inaccessible",
        cloud: null,
      }),
    });

    assert.equal(
      check(result, "project").status,
      "fail",
    );
    assert.equal(
      check(result, "environment").status,
      "fail",
    );
    assert.equal(result.cloudReachable, true);
  },
);

test(
  "reports an unlinked project",
  async () => {
    const config = validConfig();
    delete config.config.projectId;

    let projectCalls = 0;

    const result = await runDoctor({
      readConfig: async () => config,
      verifyProject: async () => {
        projectCalls++;
        return verifiedStatus();
      },
    });

    assert.equal(projectCalls, 0);
    assert.equal(
      check(result, "project").status,
      "fail",
    );
  },
);

test(
  "rejects malformed public project IDs",
  async () => {
    const config = validConfig();
    config.config.projectId = "proj_invalid";

    const result = await runDoctor({
      readConfig: async () => config,
    });

    assert.equal(
      check(result, "project").status,
      "fail",
    );
  },
);

test(
  "reports an unknown cloud environment",
  async () => {
    const status = verifiedStatus();
    status.cloud.environment = null;

    const result = await runDoctor({
      verifyProject: async () => status,
    });

    assert.equal(
      check(result, "project").status,
      "pass",
    );
    assert.equal(
      check(result, "environment").status,
      "fail",
    );
  },
);

test(
  "reports unexpected project verification results",
  async () => {
    const result = await runDoctor({
      verifyProject: async () => ({
        status: "unexpected",
      }),
    });

    assert.equal(
      check(result, "project").status,
      "fail",
    );
  },
);

test(
  "rejects an invalid project path",
  async () => {
    await assert.rejects(
      runDoctor({
        projectPath: "",
      }),
      {
        name: "CloudDoctorError",
        code: "invalid_project_path",
      },
    );
  },
);

test(
  "never exposes raw credentials in diagnostic results",
  async () => {
    const secret = "af_cli_private_test_secret";

    const result = await runDoctor({
      loadCredential: async () => ({
        token: secret,
      }),
    });

    const output = JSON.stringify(result);

    assert.equal(output.includes(secret), false);
    assert.equal(
      Object.hasOwn(result, "credential"),
      false,
    );
  },
);

test(
  "does not mutate input configuration or credentials",
  async () => {
    const config = validConfig();
    const credential = {
      token: "test-only-token",
    };

    const beforeConfig = JSON.stringify(config);
    const beforeCredential =
      JSON.stringify(credential);

    await runDoctor({
      readConfig: async () => config,
      loadCredential: async () => credential,
    });

    assert.equal(
      JSON.stringify(config),
      beforeConfig,
    );
    assert.equal(
      JSON.stringify(credential),
      beforeCredential,
    );
  },
);

test(
  "reports exactly five ordered diagnostic checks",
  async () => {
    const result = await runDoctor();

    assert.deepEqual(
      result.checks.map((item) => item.id),
      [
        "configuration",
        "credential",
        "cloud",
        "project",
        "environment",
      ],
    );
  },
);
