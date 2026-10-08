
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm,
} from "node:fs/promises";

import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

const TOKEN_PATTERN =
  /^af_cli_([a-f0-9]{24})_([a-f0-9]{64})$/;

const TOKEN_ID_PATTERN = /^[a-f0-9]{24}$/;

const TOKEN_PREFIX_PATTERN =
  /^af_cli_[a-f0-9]{24}$/;

const MAX_CREDENTIAL_BYTES = 8192;

export class CredentialStoreError extends Error {
  constructor(message, code = "credential_store_error") {
    super(message);
    this.name = "CredentialStoreError";
    this.code = code;
  }
}

function fail(message, code) {
  throw new CredentialStoreError(message, code);
}

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function assertPrivateDirectoryName(directory) {
  if (
    typeof directory !== "string" ||
    !path.isAbsolute(directory)
  ) {
    fail(
      "Credential directory must be an absolute path.",
      "invalid_store_path",
    );
  }

  if (path.parse(directory).root === directory) {
    fail(
      "Credential directory cannot be a filesystem root.",
      "invalid_store_path",
    );
  }
}

export function getCredentialStorePath({
  homeDirectory = os.homedir(),
} = {}) {
  if (
    typeof homeDirectory !== "string" ||
    !path.isAbsolute(homeDirectory)
  ) {
    fail(
      "A valid absolute home directory is required.",
      "invalid_store_path",
    );
  }

  const directory = path.join(
    homeDirectory,
    ".afrobase",
  );

  return {
    directory,
    file: path.join(directory, "credentials.json"),
  };
}

export function validateCliCredential(value) {
  if (!isRecord(value)) {
    fail(
      "Invalid Afrobase CLI credential.",
      "invalid_credential",
    );
  }

  const {
    token,
    tokenId,
    tokenPrefix,
    expiresAt,
  } = value;

  const match =
    typeof token === "string"
      ? TOKEN_PATTERN.exec(token)
      : null;

  if (
    !match ||
    typeof tokenId !== "string" ||
    !TOKEN_ID_PATTERN.test(tokenId) ||
    tokenId !== match[1] ||
    typeof tokenPrefix !== "string" ||
    !TOKEN_PREFIX_PATTERN.test(tokenPrefix) ||
    tokenPrefix !== `af_cli_${tokenId}` ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    fail(
      "Invalid or expired Afrobase CLI credential.",
      "invalid_credential",
    );
  }

  return {
    token,
    tokenId,
    tokenPrefix,
    expiresAt,
  };
}

async function ensurePrivateDirectory(directory) {
  assertPrivateDirectoryName(directory);

  try {
    await mkdir(directory, {
      recursive: true,
      mode: 0o700,
    });

    const stats = await lstat(directory);

    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink()
    ) {
      fail(
        "Unsafe Afrobase credential directory.",
        "unsafe_store_path",
      );
    }

    if (process.platform !== "win32") {
      await chmod(directory, 0o700);
    }
  } catch (error) {
    if (error instanceof CredentialStoreError) {
      throw error;
    }

    fail(
      "Could not prepare Afrobase credential storage.",
      "store_unavailable",
    );
  }
}

async function assertSafeFile(file) {
  try {
    const stats = await lstat(file);

    if (
      !stats.isFile() ||
      stats.isSymbolicLink()
    ) {
      fail(
        "Unsafe Afrobase credential file.",
        "unsafe_store_path",
      );
    }

    if (stats.size > MAX_CREDENTIAL_BYTES) {
      fail(
        "Afrobase credential file is too large.",
        "invalid_credential",
      );
    }

    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    if (error instanceof CredentialStoreError) {
      throw error;
    }

    fail(
      "Could not inspect Afrobase credential storage.",
      "store_unavailable",
    );
  }
}

export async function saveCliCredential(
  credential,
  {
    homeDirectory = os.homedir(),
  } = {},
) {
  const validated = validateCliCredential(
    credential,
  );

  const { directory, file } =
    getCredentialStorePath({ homeDirectory });

  await ensurePrivateDirectory(directory);

  // Reject an existing symlink or non-regular file.
  await assertSafeFile(file);

  const temporaryFile = path.join(
    directory,
    `.credentials-${randomBytes(12).toString("hex")}.tmp`,
  );

  let handle;

  try {
    handle = await open(
      temporaryFile,
      "wx",
      0o600,
    );

    await handle.writeFile(
      `${JSON.stringify({
        version: 1,
        credential: validated,
      })}\n`,
      "utf8",
    );

    await handle.sync();
    await handle.close();
    handle = undefined;

    if (process.platform !== "win32") {
      await chmod(temporaryFile, 0o600);
    }

    await rename(temporaryFile, file);
  } catch {
    fail(
      "Could not save Afrobase CLI credential.",
      "store_unavailable",
    );
  } finally {
    if (handle) {
      await handle.close().catch(() => {});
    }

    await rm(temporaryFile, {
      force: true,
    }).catch(() => {});
  }

  return {
    tokenId: validated.tokenId,
    tokenPrefix: validated.tokenPrefix,
    expiresAt: validated.expiresAt,
  };
}

export async function loadCliCredential({
  homeDirectory = os.homedir(),
} = {}) {
  const { directory, file } =
    getCredentialStorePath({ homeDirectory });

  // Do not create a directory just to check login status.
  try {
    const stats = await lstat(directory);

    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink()
    ) {
      fail(
        "Unsafe Afrobase credential directory.",
        "unsafe_store_path",
      );
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    if (error instanceof CredentialStoreError) {
      throw error;
    }

    fail(
      "Could not access Afrobase credential storage.",
      "store_unavailable",
    );
  }

  if (!(await assertSafeFile(file))) {
    return null;
  }

  let content;

  try {
    content = await readFile(file, "utf8");
  } catch {
    fail(
      "Could not read Afrobase CLI credential.",
      "store_unavailable",
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    fail(
      "Afrobase credential storage is malformed.",
      "invalid_credential",
    );
  }

  if (
    !isRecord(parsed) ||
    parsed.version !== 1
  ) {
    fail(
      "Unsupported Afrobase credential storage format.",
      "invalid_credential",
    );
  }

  return validateCliCredential(
    parsed.credential,
  );
}

export async function clearCliCredential({
  homeDirectory = os.homedir(),
} = {}) {
  const { directory, file } =
    getCredentialStorePath({ homeDirectory });

  try {
    const stats = await lstat(directory);

    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink()
    ) {
      fail(
        "Unsafe Afrobase credential directory.",
        "unsafe_store_path",
      );
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    if (error instanceof CredentialStoreError) {
      throw error;
    }

    fail(
      "Could not access Afrobase credential storage.",
      "store_unavailable",
    );
  }

  if (!(await assertSafeFile(file))) {
    return false;
  }

  try {
    await rm(file);
    return true;
  } catch {
    fail(
      "Could not remove Afrobase CLI credential.",
      "store_unavailable",
    );
  }
}
