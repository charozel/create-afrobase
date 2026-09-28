# create-afrobase

The official CLI for bootstrapping projects powered by **Afrobase**.

Afrobase is African digital infrastructure for modern applications — a unified foundation for data, identity, realtime applications, content, storage, functions, events, money, payments, and security.

`create-afrobase` establishes the local Afrobase project contract without coupling your application to a specific framework.

## Quick start

Create a new Afrobase project:

```bash
npx create-afrobase@latest my-app
```

Or use npm's initializer syntax:

```bash
npm create afrobase@latest my-app
```

Then enter the project:

```bash
cd my-app
```

Your Afrobase project foundation is ready.

## What it creates

Running:

```bash
npx create-afrobase@latest my-app
```

creates a small, framework-neutral project foundation:

```text
my-app/
|-- afrobase/
|   `-- README.md
|-- .env.example
|-- .gitignore
`-- afrobase.json
```

The initializer does **not** generate a Next.js, React, Node.js, or other application framework.

Your application remains yours. Afrobase provides the infrastructure contract around it.

## Project configuration

### `afrobase.json`

`afrobase.json` is the canonical Afrobase configuration file for the project.

A newly initialized project starts with:

```json
{
  "name": "my-app",
  "platform": "afrobase",
  "version": 1
}
```

This file establishes the project's local Afrobase identity and configuration.

When Cloud linking becomes part of the project's lifecycle, its Afrobase Cloud project identity can also live here.

Project identity belongs in `afrobase.json`.

Secret credentials do not.

## Environment credentials

The generated `.env.example` defines the runtime credential contract:

```dotenv
AFROBASE_PUBLISHABLE_KEY=
AFROBASE_SECRET_KEY=
```

These values are intentionally empty.

`create-afrobase` does not invent credentials, generate fake keys, or embed secrets into project configuration.

Real credentials should be supplied through the application's environment and must not be committed to `afrobase.json` or stored inside the `afrobase/` directory.

## The `afrobase/` directory

The generated:

```text
afrobase/
```

directory is reserved for project-level Afrobase resources and configuration as platform capabilities are enabled.

The initial:

```text
afrobase/README.md
```

contains guidance for configuring and connecting the project to Afrobase.

The directory is deliberately minimal in `0.0.1`.

## Project model

Afrobase separates project identity from runtime credentials:

```text
Application
    |
    +-- afrobase.json
    |      Project identity
    |      Platform configuration
    |
    +-- environment
           Publishable credentials
           Secret credentials
```

This separation keeps the project model portable and framework-neutral while preventing secrets from becoming part of committed project configuration.

## Afrobase Cloud

A project created by `create-afrobase` begins as a **local Afrobase project**.

Cloud authentication, Cloud project provisioning, project linking, and credential issuance are separate platform operations.

They are not silently performed by the initializer.

`create-afrobase@0.0.1` does not generate:

- Cloud project IDs
- publishable keys
- secret keys
- API access tokens
- authentication sessions

This is intentional.

The initializer establishes a trustworthy local project foundation first. Cloud operations can then build on that foundation explicitly.

## CLI usage

```bash
create-afrobase [project-name] [options]
```

### Create a project

```bash
create-afrobase my-app
```

### Show help

```bash
create-afrobase --help
```

### Show the version

```bash
create-afrobase --version
```

### Options

```text
-h, --help       Show CLI help
-v, --version    Show CLI version
```

If no project name is supplied, the CLI displays usage guidance instead of creating a project.

## Project naming

Project names are validated before anything is created.

Names may contain:

- lowercase letters
- numbers
- hyphens
- underscores

For example:

```text
my-app
payments_api
afrobase-demo
project2026
```

The CLI rejects invalid or unsafe project names before modifying the filesystem.

## Safety by default

`create-afrobase` is intentionally conservative.

The initializer:

- validates project names before creating files
- refuses non-empty destination directories
- refuses conflicting Afrobase scaffold files
- validates generated Afrobase project configuration
- uses guarded project creation
- tracks artifacts created during initialization
- rolls back its own artifacts when initialization fails
- preserves developer-owned files during rollback
- does not recursively delete unknown project content
- does not generate fake Cloud identities
- does not generate or store secret credentials
- does not expose Afrobase's private infrastructure
- does not assume an application framework

The guiding rule is simple:

> Afrobase may undo what Afrobase created. Afrobase must not delete what the developer already owned.

## Current status

`create-afrobase` is under active development.

Version `0.0.1` establishes the first Afrobase project bootstrap contract.

It currently provides:

- project-name validation
- safe project-directory creation
- project preflight checks
- Afrobase project metadata
- framework-neutral project scaffolding
- validated `afrobase.json` configuration
- atomic configuration writes
- local and Cloud project identity semantics
- guarded project link and unlink primitives
- environment credential contracts
- project-state inspection
- initialization rollback safety
- developer-owned file preservation
- generated project guidance
- developer-facing completion output

Cloud authentication, Cloud project provisioning, operational project linking, credential issuance, and client-library installation are not performed by the initializer today.

Those capabilities belong to the wider Afrobase developer platform and will build on the project contract established here.

## Afrobase platform

Afrobase is being designed as integrated application infrastructure for African developers, organizations, startups, and digital products.

The wider platform is being built around capabilities including:

```text
Afrobase
|
+-- Data
+-- Authentication & Identity
+-- Realtime
+-- Content
+-- Storage
+-- Functions
+-- Events
+-- Money
|   +-- Payments
|   +-- Accounts
|   +-- Ledger
|   `-- African payment rails
|
`-- Security
    +-- Identity signals
    +-- Fraud detection
    +-- Risk
    +-- Rules
    +-- Intelligence
    `-- Audit
```

`create-afrobase` is the bootstrap layer.

Operational Cloud workflows, APIs, SDKs, and infrastructure services are separate parts of the Afrobase developer platform.

## Framework-neutral by design

Afrobase should be usable from different application stacks.

For that reason, `create-afrobase` does not assume that your application uses:

- Next.js
- React
- Vue
- Svelte
- Node.js application frameworks
- a specific hosting provider

The initializer establishes the Afrobase project contract and leaves application architecture to the developer.

## Requirements

- Node.js 20 or later
- npm

Check your Node.js version:

```bash
node --version
```

Check your npm version:

```bash
npm --version
```

## Local development

Clone the repository and install dependencies:

```bash
npm install
```

Run the CLI locally:

```bash
npm start
```

Create a local test project:

```bash
node ./bin/create-afrobase.js my-test-app
```

Display help:

```bash
node ./bin/create-afrobase.js --help
```

Check the CLI version:

```bash
node ./bin/create-afrobase.js --version
```

Run the package test:

```bash
npm test
```

Inspect the npm package contents:

```bash
npm pack --dry-run
```

## Testing the packed package

Before a release, the CLI can also be tested from the actual npm tarball rather than directly from the repository.

Create the package:

```bash
npm pack
```

Then install the generated tarball inside a clean test project and invoke:

```bash
npx create-afrobase my-app
```

This verifies the same package structure that npm consumers receive.

## Package

```text
Package:  create-afrobase
Version:  0.0.1
Command:  create-afrobase
Runtime:  Node.js >= 20
License:  MIT
```

Once published, the intended developer entry points are:

```bash
npx create-afrobase@latest my-app
```

and:

```bash
npm create afrobase@latest my-app
```

## Development philosophy

Afrobase infrastructure should be explicit, inspectable, and safe.

The CLI therefore favors:

- explicit configuration over hidden state
- real identities over fabricated placeholders
- environment credentials over committed secrets
- conservative filesystem operations over destructive convenience
- framework neutrality over unnecessary coupling
- small project contracts that can evolve without taking ownership away from the developer

## License

MIT

---

**Built for the next generation of African software.**