# create-afrobase

The official CLI for creating projects powered by **Afrobase**.

Afrobase is African digital infrastructure for modern applications, designed to
provide a unified foundation for data, identity, realtime applications, content,
functions, money, security, and other application infrastructure.

## Getting started

Create a new Afrobase project:

```bash
npx create-afrobase@latest my-app
```

You can also use npm's initializer syntax:

```bash
npm create afrobase@latest my-app
```

The CLI creates a framework-neutral Afrobase project foundation. It does not
generate a Next.js, React, Node.js, or other application framework.

## Generated project

Running:

```bash
npx create-afrobase@latest my-app
```

creates:

```text
my-app/
├── afrobase/
│   └── README.md
├── .env.example
├── .gitignore
└── afrobase.json
```

### `afrobase.json`

`afrobase.json` is the project's Afrobase configuration file.

A newly created local project starts with:

```json
{
  "name": "my-app",
  "platform": "afrobase",
  "version": 1
}
```

The configuration may later include an Afrobase Cloud project identity after
the project is linked.

Project identity belongs in `afrobase.json`. Secret credentials do not.

### `.env.example`

The generated environment template defines the runtime credential contract:

```dotenv
AFROBASE_PUBLISHABLE_KEY=
AFROBASE_SECRET_KEY=
```

Real credentials should be supplied through the application's environment and
must not be stored in `afrobase.json` or the `afrobase/` directory.

### `afrobase/`

The `afrobase/` directory is reserved for project-level Afrobase resources and
configuration as platform capabilities are enabled.

The generated `afrobase/README.md` contains project configuration and connection
guidance.

## Project model

Afrobase separates project identity from runtime credentials:

```text
Application
    |
    +-- afrobase.json
    |      Project identity and configuration
    |
    +-- environment
           Runtime credentials
```

This separation keeps the project model framework-neutral and prevents secrets
from becoming part of committed project configuration.

## Afrobase Cloud

A project created by `create-afrobase` begins as a local Afrobase project.

Cloud authentication, Cloud project creation, and project linking are separate
Afrobase operations. They are not performed automatically by
`create-afrobase`.

The current initializer does not generate Cloud project IDs, API keys, secret
keys, or access tokens.

## CLI usage

```bash
create-afrobase [project-name] [options]
```

Examples:

```bash
create-afrobase my-app
create-afrobase --help
create-afrobase --version
```

### Options

```text
-h, --help       Show CLI help
-v, --version    Show CLI version
```

If no project name is supplied, the CLI displays guidance instead of creating a
project.

## Safety

The initializer is intentionally conservative.

It:

- validates project names before creating files
- refuses non-empty destination directories
- refuses conflicting scaffold files
- validates the generated Afrobase project configuration
- does not generate fake Cloud identities
- does not generate or store secret credentials
- does not expose Afrobase's private infrastructure
- does not assume an application framework

## Current status

`create-afrobase` is under active development.

Version `0.0.1` currently establishes:

- project-name validation
- safe project-directory creation
- Afrobase project metadata
- framework-neutral project scaffolding
- validated `afrobase.json` configuration
- local and Cloud project identity semantics
- guarded project link and unlink primitives
- environment credential contracts
- project-state inspection
- generated project guidance
- developer-facing completion output

Cloud authentication, Cloud project provisioning, operational project linking,
and client-library installation are not performed by the initializer today.

## Afrobase platform direction

Afrobase is being designed around integrated infrastructure capabilities
including:

- Data
- Authentication and Identity
- Realtime
- Content
- Storage
- Functions
- Events
- Money
- African payment rails
- Security and Fraud Intelligence

`create-afrobase` is the project bootstrapper. Operational Cloud workflows and
client libraries are separate parts of the Afrobase developer platform.

## Requirements

- Node.js 20 or later
- npm

## Local development

Install dependencies:

```bash
npm install
```

Run the CLI locally:

```bash
npm start
```

Create a test project:

```bash
node ./bin/create-afrobase.js my-test-app
```

Display help:

```bash
node ./bin/create-afrobase.js --help
```

Check the version:

```bash
node ./bin/create-afrobase.js --version
```

Run the package test:

```bash
npm test
```

Inspect the package before publishing:

```bash
npm pack --dry-run
```

## Package

**Package:** `create-afrobase`

**Current version:** `0.0.1`

**CLI command:** `create-afrobase`

## License

MIT

---

Built for the next generation of African software.