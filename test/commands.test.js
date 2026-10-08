import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { COMMAND_NAMES, isCliCommand, runCliCommand } from "../src/commands.js";

import {
  buildApprovalUrl,
  loginCli,
  logoutCli,
  pollCliAuthorization,
  whoamiCli,
} from "../src/cli-session.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

const cliEntry = path.resolve(testDirectory, "../bin/create-afrobase.js");

const requestId = `cli_req_${"a".repeat(32)}`;

const tokenId = "b".repeat(24);

const credential = {
  token: `af_cli_${tokenId}_${"c".repeat(64)}`,
  tokenId,
  tokenPrefix: `af_cli_${tokenId}`,
  expiresAt: Date.now() + 86400000,
};

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 10000,
    env: {
      ...process.env,
      HOME: cwd ?? os.tmpdir(),
      USERPROFILE: cwd ?? os.tmpdir(),
    },
  });
}

test("recognizes every reserved cloud command", () => {
  for (const command of COMMAND_NAMES) {
    assert.equal(isCliCommand(command), true);
  }

  for (const value of ["my-app", "", null]) {
    assert.equal(isCliCommand(value), false);
  }
});

test("unknown command execution fails", async () => {
  assert.equal(await runCliCommand("not-a-command"), 1);
});

test("cloud commands never create project directories", () => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "afrobase-commands-"),
  );

  try {
    for (const command of COMMAND_NAMES) {
      if (command === "logout") {
        continue;
      }

      const result = runCli([command], temporaryDirectory);

      assert.equal(
        result.status,
        1,
        `${command} should not succeed without configuration`,
      );

      assert.equal(
        fs.existsSync(path.join(temporaryDirectory, command)),
        false,
        `${command} must not create a directory`,
      );
    }
  } finally {
    fs.rmSync(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
});

test("reserved commands reject unexpected arguments", () => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "afrobase-command-args-"),
  );

  try {
    const result = runCli(["login", "unexpected"], temporaryDirectory);

    assert.equal(result.status, 1);

    assert.match(result.stderr, /Unexpected arguments/);

    assert.equal(fs.existsSync(path.join(temporaryDirectory, "login")), false);
  } finally {
    fs.rmSync(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
});

test("existing help and version flags remain operational", () => {
  const help = runCli(["--help"]);

  assert.equal(help.status, 0);
  assert.match(help.stdout, /Cloud commands:/);
  assert.match(help.stdout, /login/);

  const version = runCli(["--version"]);

  assert.equal(version.status, 0);
  assert.match(version.stdout, /0\.0\.1/);
});

test("builds an approval URL without exposing the secret", () => {
  const url = buildApprovalUrl(requestId, "http://localhost:3000");

  assert.equal(url, `http://localhost:3000/cli/authorize?request=${requestId}`);

  assert.equal(url.includes("verificationSecret"), false);
});

test("rejects remote HTTP dashboard origins", () => {
  assert.throws(() => buildApprovalUrl(requestId, "http://example.com"), {
    code: "invalid_dashboard_url",
  });
});

test("polls pending authorization until approved", async () => {
  let calls = 0;

  const result = await pollCliAuthorization(
    {
      requestId,
      verificationSecret: "d".repeat(64),
      expiresAt: Date.now() + 600000,
    },
    {
      exchange: async () => {
        calls++;

        return calls === 1
          ? { status: "pending" }
          : {
              status: "approved",
              credential,
            };
      },
      sleep: async () => {},
    },
  );

  assert.equal(calls, 2);
  assert.deepEqual(result, credential);
});

test("authorization polling expires safely", async () => {
  await assert.rejects(
    pollCliAuthorization(
      {
        requestId,
        verificationSecret: "d".repeat(64),
        expiresAt: 100,
      },
      {
        now: () => 101,
        exchange: async () => {
          throw new Error("Should not exchange");
        },
      },
    ),
    {
      code: "authorization_expired",
    },
  );
});

test(
  "login refuses credential persistence when security verification fails",
  async () => {
    let contactedCloud = false;

    await assert.rejects(
      loginCli({
        verifyStorage: async () => {
          throw new Error("Unsafe storage");
        },
        createAuthorization: async () => {
          contactedCloud = true;
        },
      }),
      /Unsafe storage/,
    );

    assert.equal(contactedCloud, false);
  },
);

test("mocked login completes without exposing the token in metadata", async () => {
  let openedUrl;
  let savedCredential;
  let approvalUrl;

  const result = await loginCli({
verifyStorage: async () => true,
    createAuthorization: async () => ({
      requestId,
      verificationSecret: "d".repeat(64),
      expiresAt: Date.now() + 600000,
    }),
    openBrowser: async (url) => {
      openedUrl = url;
    },
    pollAuthorization: async () => credential,
    saveCredential: async (value) => {
      savedCredential = value;

      return {
        tokenId: value.tokenId,
        tokenPrefix: value.tokenPrefix,
        expiresAt: value.expiresAt,
      };
    },
    onApprovalUrl: (url) => {
      approvalUrl = url;
    },
  });

  assert.equal(result.status, "authenticated");

  assert.deepEqual(savedCredential, credential);

  assert.equal(openedUrl, approvalUrl);

  assert.equal(openedUrl.includes(credential.token), false);

  assert.equal(Object.hasOwn(result.credential, "token"), false);
});

test("logout delegates to local credential removal", async () => {
  let called = false;

  const result = await logoutCli({
    clearCredential: async () => {
      called = true;
      return true;
    },
  });

  assert.equal(called, true);
  assert.deepEqual(result, {
    removed: true,
  });
});

test("whoami refuses an absent local credential", async () => {
  await assert.rejects(
    whoamiCli({
      loadCredential: async () => null,
    }),
    {
      code: "not_authenticated",
    },
  );
});

test("whoami sends bearer credential to the control plane", async () => {
  let observedPath;
  let observedOptions;

  const result = await whoamiCli({
    loadCredential: async () => credential,
    request: async (pathname, options) => {
      observedPath = pathname;
      observedOptions = options;

      return {
        status: 200,
        data: {
          user: {
            email: "developer@example.com",
          },
          credential: {
            name: "Developer CLI",
            tokenId,
            expiresAt: credential.expiresAt,
          },
        },
      };
    },
  });

  assert.equal(observedPath, "/api/control/v1/me");

  assert.equal(observedOptions.bearerToken, credential.token);

  assert.equal(result.email, "developer@example.com");

  assert.equal(Object.hasOwn(result, "token"), false);
});

test("command dispatcher runs mocked login successfully", async () => {
  const code = await runCliCommand("login", [], {
    login: async () => ({
      status: "authenticated",
    }),
  });

  assert.equal(code, 0);
});

test("command dispatcher runs mocked logout successfully", async () => {
  const code = await runCliCommand("logout", [], {
    logout: async () => ({
      removed: true,
    }),
  });

  assert.equal(code, 0);
});

test("command dispatcher runs mocked whoami successfully", async () => {
  const code = await runCliCommand("whoami", [], {
    whoami: async () => ({
      email: "developer@example.com",
      credentialName: "Developer CLI",
      expiresAt: Date.now() + 86400000,
    }),
  });

  assert.equal(code, 0);
});


test("projects lists authorized cloud projects", async () => {
  const exitCode = await runCliCommand(
    "projects",
    [],
    {
      projects: async () => [
        {
          projectId: `proj_${"a".repeat(32)}`,
          name: "Afrobase",
          slug: "afrobase",
          environment: "production",
          organization: {
            name: "Afrobase",
            slug: "afrobase",
          },
          role: "owner",
        },
      ],
    },
  );

  assert.equal(exitCode, 0);
});

test("link remains reserved", async () => {
  const exitCode = await runCliCommand("link");

  assert.equal(exitCode, 1);
});
