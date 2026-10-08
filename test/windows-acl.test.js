
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  mkdtemp,
  mkdir,
  rm,
} from "node:fs/promises";

import {
  validateWindowsAclReport,
  verifyWindowsCredentialAcl,
} from "../src/windows-acl.js";

const USER_SID = "S-1-5-21-100-200-300-1001";

function safeReport() {
  return {
    currentUserSid: USER_SID,
    ownerSid: USER_SID,
    protected: true,
    rules: [
      {
        sid: USER_SID,
        type: "Allow",
        rights: 2032127,
        inherited: false,
        inheritanceFlags:
          "ContainerInherit, ObjectInherit",
        propagationFlags: "None",
      },
    ],
  };
}

async function withStore(callback) {
  const home = await mkdtemp(
    path.join(os.tmpdir(), "afrobase-acl-"),
  );

  try {
    const directory = path.join(
      home,
      ".afrobase",
    );

    await mkdir(directory);

    return await callback({
      home,
      directory,
    });
  } finally {
    await rm(home, {
      recursive: true,
      force: true,
    });
  }
}

test(
  "accepts a private Windows ACL",
  () => {
    assert.equal(
      validateWindowsAclReport(safeReport()),
      true,
    );
  },
);

test(
  "rejects incorrect ownership",
  () => {
    const report = safeReport();
    report.ownerSid = "S-1-5-18";

    assert.throws(
      () => validateWindowsAclReport(report),
      {
        code: "credential_storage_unverified",
      },
    );
  },
);

test(
  "rejects enabled ACL inheritance",
  () => {
    const report = safeReport();
    report.protected = false;

    assert.throws(
      () => validateWindowsAclReport(report),
      {
        code: "credential_storage_unverified",
      },
    );
  },
);

test(
  "rejects access granted to other principals",
  () => {
    const report = safeReport();

    report.rules.push({
      sid: "S-1-1-0",
      type: "Allow",
      rights: 2032127,
      inherited: false,
      inheritanceFlags: "None",
      propagationFlags: "None",
    });

    assert.throws(
      () => validateWindowsAclReport(report),
      {
        code: "credential_storage_unverified",
      },
    );
  },
);

test(
  "rejects inherited access rules",
  () => {
    const report = safeReport();
    report.rules[0].inherited = true;

    assert.throws(
      () => validateWindowsAclReport(report),
      {
        code: "credential_storage_unverified",
      },
    );
  },
);

test(
  "rejects insufficient owner permissions",
  () => {
    const report = safeReport();
    report.rules[0].rights = 131209;

    assert.throws(
      () => validateWindowsAclReport(report),
      {
        code: "credential_storage_unverified",
      },
    );
  },
);

test(
  "rejects rules that do not protect child files",
  () => {
    const report = safeReport();
    report.rules[0].inheritanceFlags =
      "ContainerInherit";

    assert.throws(
      () => validateWindowsAclReport(report),
      {
        code: "credential_storage_unverified",
      },
    );
  },
);

test(
  "rejects missing or malformed reports",
  () => {
    for (const report of [
      null,
      {},
      [],
      { ...safeReport(), rules: [] },
    ]) {
      assert.throws(
        () => validateWindowsAclReport(report),
        {
          code: "credential_storage_unverified",
        },
      );
    }
  },
);

test(
  "accepts a verified credential directory",
  async () => {
    await withStore(async ({ home, directory }) => {
      let inspectedDirectory;

      const result =
        await verifyWindowsCredentialAcl({
          homeDirectory: home,
          platform: "win32",
          inspect: async (value) => {
            inspectedDirectory = value;
            return safeReport();
          },
        });

      assert.equal(result, true);
      assert.equal(
        inspectedDirectory,
        directory,
      );
    });
  },
);

test(
  "rejects an absent credential directory",
  async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "afrobase-acl-"),
    );

    try {
      await assert.rejects(
        verifyWindowsCredentialAcl({
          homeDirectory: home,
          platform: "win32",
          inspect: async () => safeReport(),
        }),
        {
          code: "credential_storage_unverified",
        },
      );
    } finally {
      await rm(home, {
        recursive: true,
        force: true,
      });
    }
  },
);

test(
  "fails closed when ACL inspection throws",
  async () => {
    await withStore(async ({ home }) => {
      await assert.rejects(
        verifyWindowsCredentialAcl({
          homeDirectory: home,
          platform: "win32",
          inspect: async () => {
            throw new Error(
              "Windows inspection unavailable",
            );
          },
        }),
        {
          code: "credential_storage_unverified",
        },
      );
    });
  },
);

test(
  "non-Windows platforms skip Windows ACL inspection",
  async () => {
    assert.equal(
      await verifyWindowsCredentialAcl({
        platform: "linux",
        inspect: async () => {
          throw new Error(
            "Should not inspect",
          );
        },
      }),
      true,
    );
  },
);
