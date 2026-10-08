
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  COMMAND_NAMES,
  isCliCommand,
  runCliCommand,
} from "../src/commands.js";

const testDirectory = path.dirname(
  fileURLToPath(import.meta.url),
);

const cliEntry = path.resolve(
  testDirectory,
  "../bin/create-afrobase.js",
);

function runCli(args, cwd) {
  return spawnSync(
    process.execPath,
    [cliEntry, ...args],
    {
      cwd,
      encoding: "utf8",
      timeout: 10000,
    },
  );
}

test(
  "recognizes every reserved cloud command",
  () => {
    for (const command of COMMAND_NAMES) {
      assert.equal(
        isCliCommand(command),
        true,
      );
    }

    assert.equal(
      isCliCommand("my-app"),
      false,
    );

    assert.equal(
      isCliCommand(""),
      false,
    );

    assert.equal(
      isCliCommand(null),
      false,
    );
  },
);

test(
  "unknown command execution fails",
  async () => {
    const exitCode = await runCliCommand(
      "not-a-command",
    );

    assert.equal(exitCode, 1);
  },
);

test(
  "reserved commands never create project directories",
  () => {
    const temporaryDirectory =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "afrobase-commands-",
        ),
      );

    try {
      for (const command of COMMAND_NAMES) {
        const result = runCli(
          [command],
          temporaryDirectory,
        );

        assert.equal(
          result.status,
          1,
          `${command} should fail until implemented`,
        );

        assert.match(
          result.stdout,
          /not yet implemented/,
        );

        assert.equal(
          fs.existsSync(
            path.join(
              temporaryDirectory,
              command,
            ),
          ),
          false,
          `${command} must not create a directory`,
        );
      }
    } finally {
      fs.rmSync(
        temporaryDirectory,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "reserved commands reject unexpected arguments",
  () => {
    const temporaryDirectory =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "afrobase-command-args-",
        ),
      );

    try {
      const result = runCli(
        ["login", "unexpected"],
        temporaryDirectory,
      );

      assert.equal(result.status, 1);

      assert.match(
        result.stderr,
        /Unexpected arguments/,
      );

      assert.equal(
        fs.existsSync(
          path.join(
            temporaryDirectory,
            "login",
          ),
        ),
        false,
      );
    } finally {
      fs.rmSync(
        temporaryDirectory,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

test(
  "existing help and version flags remain operational",
  () => {
    const help = runCli(["--help"]);

    assert.equal(help.status, 0);
    assert.match(help.stdout, /Cloud commands:/);
    assert.match(help.stdout, /login/);

    const version = runCli(["--version"]);

    assert.equal(version.status, 0);
    assert.match(version.stdout, /0\.0\.1/);
  },
);
