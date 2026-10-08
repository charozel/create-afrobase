
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat } from "node:fs/promises";

import {
  getCredentialStorePath,
} from "./credential-store.js";

const execFileAsync = promisify(execFile);

export class WindowsAclError extends Error {
  constructor(
    message = "Afrobase credential storage permissions could not be verified.",
  ) {
    super(message);
    this.name = "WindowsAclError";
    this.code = "credential_storage_unverified";
  }
}

const INSPECT_ACL_SCRIPT = `
$ErrorActionPreference = 'Stop'

$directory = $env:AFROBASE_ACL_DIRECTORY

if ([string]::IsNullOrWhiteSpace($directory)) {
  throw 'Missing credential directory'
}

$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()

if ($null -eq $identity -or $null -eq $identity.User) {
  throw 'Missing Windows identity'
}

$acl = Get-Acl -LiteralPath $directory

$ownerSid = $acl.GetOwner(
  [System.Security.Principal.SecurityIdentifier]
).Value

$rules = @(
  $acl.GetAccessRules(
    $true,
    $true,
    [System.Security.Principal.SecurityIdentifier]
  ) | ForEach-Object {
    [PSCustomObject]@{
      sid = $_.IdentityReference.Value
      type = $_.AccessControlType.ToString()
      rights = [int]$_.FileSystemRights
      inherited = [bool]$_.IsInherited
      inheritanceFlags = $_.InheritanceFlags.ToString()
      propagationFlags = $_.PropagationFlags.ToString()
    }
  }
)

$result = [PSCustomObject]@{
  currentUserSid = $identity.User.Value
  ownerSid = $ownerSid
  protected = [bool]$acl.AreAccessRulesProtected
  rules = $rules
}

$result | ConvertTo-Json -Depth 6 -Compress
`;

export function validateWindowsAclReport(report) {
  if (
    !report ||
    typeof report !== "object" ||
    Array.isArray(report)
  ) {
    throw new WindowsAclError();
  }

  const {
    currentUserSid,
    ownerSid,
    protected: isProtected,
    rules,
  } = report;

  const sidPattern =
    /^S-\d+(?:-\d+)+$/;

  if (
    typeof currentUserSid !== "string" ||
    !sidPattern.test(currentUserSid) ||
    ownerSid !== currentUserSid ||
    isProtected !== true ||
    !Array.isArray(rules) ||
    rules.length === 0
  ) {
    throw new WindowsAclError();
  }

  let ownerHasFullControl = false;

  for (const rule of rules) {
    if (
      !rule ||
      typeof rule !== "object" ||
      rule.sid !== currentUserSid ||
      rule.type !== "Allow" ||
      rule.inherited !== false ||
      !Number.isInteger(rule.rights) ||
      typeof rule.inheritanceFlags !== "string" ||
      typeof rule.propagationFlags !== "string"
    ) {
      throw new WindowsAclError();
    }

    // Windows FileSystemRights.FullControl = 2032127.
    const FULL_CONTROL = 2032127;

    if (
      (rule.rights & FULL_CONTROL) !==
      FULL_CONTROL
    ) {
      throw new WindowsAclError();
    }

    const flags = rule.inheritanceFlags
      .split(",")
      .map((value) => value.trim());

    if (
      !flags.includes("ContainerInherit") ||
      !flags.includes("ObjectInherit") ||
      rule.propagationFlags !== "None"
    ) {
      throw new WindowsAclError();
    }

    ownerHasFullControl = true;
  }

  if (!ownerHasFullControl) {
    throw new WindowsAclError();
  }

  return true;
}

export async function verifyWindowsCredentialAcl({
  homeDirectory = os.homedir(),
  platform = process.platform,
  inspect,
} = {}) {
  if (platform !== "win32") {
    return true;
  }

  const { directory } = getCredentialStorePath({
    homeDirectory,
  });

  try {
    const stats = await lstat(directory);

    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink()
    ) {
      throw new WindowsAclError();
    }

    let report;

    if (inspect) {
      report = await inspect(directory);
    } else {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-EncodedCommand",
          Buffer.from(
            INSPECT_ACL_SCRIPT,
            "utf16le",
          ).toString("base64"),
        ],
        {
          windowsHide: true,
          timeout: 10000,
          maxBuffer: 65536,
          env: {
            ...process.env,
            AFROBASE_ACL_DIRECTORY: directory,
          },
        },
      );

      report = JSON.parse(stdout.trim());
    }

    return validateWindowsAclReport(report);
  } catch {
    throw new WindowsAclError();
  }
}
