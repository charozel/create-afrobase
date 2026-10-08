
import assert from "node:assert/strict";
import test from "node:test";

import {
  mkdtemp,
  readFile,
  stat,
  rm,
} from "node:fs/promises";

import os from "node:os";
import path from "node:path";

import {
  clearCliCredential,
  getCredentialStorePath,
  loadCliCredential,
  saveCliCredential,
  validateCliCredential,
} from "../src/credential-store.js";

function makeCredential() {
  const tokenId = "a".repeat(24);

  return {
    token: `af_cli_${tokenId}_${"b".repeat(64)}`,
    tokenId,
    tokenPrefix: `af_cli_${tokenId}`,
    expiresAt: Date.now() + 86400000,
  };
}

async function withTemporaryHome(callback) {
  const homeDirectory = await mkdtemp(
    path.join(os.tmpdir(), "afrobase-store-"),
  );

  try {
    return await callback(homeDirectory);
  } finally {
    await rm(homeDirectory, {
      recursive: true,
      force: true,
    });
  }
}

test(
  "resolves credentials under the developer home directory",
  () => {
    const homeDirectory = path.join(
      os.tmpdir(),
      "afrobase-test-home",
    );

    const result = getCredentialStorePath({
      homeDirectory,
    });

    assert.equal(
      result.file,
      path.join(
        homeDirectory,
        ".afrobase",
        "credentials.json",
      ),
    );
  },
);

test(
  "validates a well-formed CLI credential",
  () => {
    const credential = makeCredential();

    assert.deepEqual(
      validateCliCredential(credential),
      credential,
    );
  },
);

test(
  "rejects malformed and expired credentials",
  () => {
    const credential = makeCredential();

    for (const candidate of [
      null,
      {},
      { ...credential, token: "wrong" },
      { ...credential, tokenId: "wrong" },
      { ...credential, tokenPrefix: "wrong" },
      { ...credential, expiresAt: Date.now() - 1 },
    ]) {
      assert.throws(
        () => validateCliCredential(candidate),
        { code: "invalid_credential" },
      );
    }
  },
);

test(
  "missing credential storage returns null",
  async () => {
    await withTemporaryHome(async (homeDirectory) => {
      assert.equal(
        await loadCliCredential({
          homeDirectory,
        }),
        null,
      );
    });
  },
);

test(
  "saves and loads a CLI credential",
  async () => {
    await withTemporaryHome(async (homeDirectory) => {
      const credential = makeCredential();

      const saved = await saveCliCredential(
        credential,
        { homeDirectory },
      );

      assert.equal(
        saved.tokenId,
        credential.tokenId,
      );

      assert.equal(
        Object.hasOwn(saved, "token"),
        false,
      );

      assert.deepEqual(
        await loadCliCredential({
          homeDirectory,
        }),
        credential,
      );

      const { file } = getCredentialStorePath({
        homeDirectory,
      });

      const content = JSON.parse(
        await readFile(file, "utf8"),
      );

      assert.equal(content.version, 1);
    });
  },
);

test(
  "credential storage uses restrictive POSIX permissions",
  async (t) => {
    if (process.platform === "win32") {
      t.skip(
        "Windows permissions are governed by ACLs.",
      );
      return;
    }

    await withTemporaryHome(async (homeDirectory) => {
      await saveCliCredential(
        makeCredential(),
        { homeDirectory },
      );

      const { directory, file } =
        getCredentialStorePath({ homeDirectory });

      const directoryStats = await stat(directory);
      const fileStats = await stat(file);

      assert.equal(
        directoryStats.mode & 0o777,
        0o700,
      );

      assert.equal(
        fileStats.mode & 0o777,
        0o600,
      );
    });
  },
);

test(
  "clearing credentials removes the local session",
  async () => {
    await withTemporaryHome(async (homeDirectory) => {
      await saveCliCredential(
        makeCredential(),
        { homeDirectory },
      );

      assert.equal(
        await clearCliCredential({
          homeDirectory,
        }),
        true,
      );

      assert.equal(
        await loadCliCredential({
          homeDirectory,
        }),
        null,
      );

      assert.equal(
        await clearCliCredential({
          homeDirectory,
        }),
        false,
      );
    });
  },
);

test(
  "saving a new credential replaces the old credential",
  async () => {
    await withTemporaryHome(async (homeDirectory) => {
      const first = makeCredential();

      const secondId = "c".repeat(24);

      const second = {
        token: `af_cli_${secondId}_${"d".repeat(64)}`,
        tokenId: secondId,
        tokenPrefix: `af_cli_${secondId}`,
        expiresAt: Date.now() + 86400000,
      };

      await saveCliCredential(
        first,
        { homeDirectory },
      );

      await saveCliCredential(
        second,
        { homeDirectory },
      );

      assert.deepEqual(
        await loadCliCredential({
          homeDirectory,
        }),
        second,
      );
    });
  },
);
