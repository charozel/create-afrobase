
import assert from "node:assert/strict";
import test from "node:test";

import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";

import os from "node:os";
import path from "node:path";

import {
  clearCliCredential,
  getCredentialStorePath,
  loadCliCredential,
  saveCliCredential,
} from "../src/credential-store.js";

function credential() {
  const tokenId = "e".repeat(24);

  return {
    token: `af_cli_${tokenId}_${"f".repeat(64)}`,
    tokenId,
    tokenPrefix: `af_cli_${tokenId}`,
    expiresAt: Date.now() + 86400000,
  };
}

async function withHome(callback) {
  const homeDirectory = await mkdtemp(
    path.join(os.tmpdir(), "afrobase-security-"),
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
  "rejects relative home directories",
  () => {
    assert.throws(
      () => getCredentialStorePath({
        homeDirectory: "./relative-home",
      }),
      { code: "invalid_store_path" },
    );
  },
);

test(
  "rejects a symlinked credential directory",
  async (t) => {
    if (process.platform === "win32") {
      t.skip(
        "Creating directory symlinks may require Windows privileges.",
      );
      return;
    }

    await withHome(async (homeDirectory) => {
      const outside = path.join(
        homeDirectory,
        "outside",
      );

      await mkdir(outside);

      await symlink(
        outside,
        path.join(homeDirectory, ".afrobase"),
      );

      await assert.rejects(
        saveCliCredential(
          credential(),
          { homeDirectory },
        ),
        { code: "unsafe_store_path" },
      );
    });
  },
);

test(
  "rejects a symlinked credential file",
  async (t) => {
    if (process.platform === "win32") {
      t.skip(
        "Creating symlinks may require Windows privileges.",
      );
      return;
    }

    await withHome(async (homeDirectory) => {
      const { directory, file } =
        getCredentialStorePath({ homeDirectory });

      await mkdir(directory);

      const target = path.join(
        homeDirectory,
        "outside.json",
      );

      await writeFile(target, "untouched");

      await symlink(target, file);

      await assert.rejects(
        saveCliCredential(
          credential(),
          { homeDirectory },
        ),
        { code: "unsafe_store_path" },
      );

      assert.equal(
        await readFile(target, "utf8"),
        "untouched",
      );
    });
  },
);

test(
  "rejects malformed credential JSON",
  async () => {
    await withHome(async (homeDirectory) => {
      const { directory, file } =
        getCredentialStorePath({ homeDirectory });

      await mkdir(directory);

      await writeFile(
        file,
        "{invalid json",
      );

      await assert.rejects(
        loadCliCredential({
          homeDirectory,
        }),
        { code: "invalid_credential" },
      );
    });
  },
);

test(
  "rejects oversized credential storage",
  async () => {
    await withHome(async (homeDirectory) => {
      const { directory, file } =
        getCredentialStorePath({ homeDirectory });

      await mkdir(directory);

      await writeFile(
        file,
        "x".repeat(8193),
      );

      await assert.rejects(
        loadCliCredential({
          homeDirectory,
        }),
        { code: "invalid_credential" },
      );
    });
  },
);

test(
  "does not expose raw tokens through save metadata",
  async () => {
    await withHome(async (homeDirectory) => {
      const result = await saveCliCredential(
        credential(),
        { homeDirectory },
      );

      assert.equal(
        Object.hasOwn(result, "token"),
        false,
      );

      assert.equal(
        JSON.stringify(result).includes(
          credential().token,
        ),
        false,
      );
    });
  },
);

test(
  "does not leave temporary files after saving",
  async () => {
    await withHome(async (homeDirectory) => {
      await saveCliCredential(
        credential(),
        { homeDirectory },
      );

      const { directory } =
        getCredentialStorePath({ homeDirectory });

      assert.deepEqual(
        await readdir(directory),
        ["credentials.json"],
      );
    });
  },
);

test(
  "logout refuses a symlinked credential directory",
  async (t) => {
    if (process.platform === "win32") {
      t.skip(
        "Creating directory symlinks may require Windows privileges.",
      );
      return;
    }

    await withHome(async (homeDirectory) => {
      const outside = path.join(
        homeDirectory,
        "outside",
      );

      await mkdir(outside);

      await symlink(
        outside,
        path.join(homeDirectory, ".afrobase"),
      );

      await assert.rejects(
        clearCliCredential({
          homeDirectory,
        }),
        { code: "unsafe_store_path" },
      );
    });
  },
);
