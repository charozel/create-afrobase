# create-afrobase

The official CLI for creating applications powered by **Afrobase**.

Afrobase is African digital infrastructure for modern applications — designed to provide developers with a unified foundation for data, authentication, realtime applications, content, payments, security, and African digital infrastructure.

## Getting Started

The recommended way to start a new Afrobase project is:

```bash
npx create-afrobase@latest
```

This runs the latest version of the `create-afrobase` CLI.

## Create a Named Project

You can provide your project name directly:

```bash
npx create-afrobase@latest my-app
```

For example:

```bash
npx create-afrobase@latest my-fintech
```

The project name is passed directly to the Afrobase CLI.

## Using npm create

Afrobase can also be started using npm's initializer syntax:

```bash
npm create afrobase@latest
```

This is an alternative to:

```bash
npx create-afrobase@latest
```

Both commands run the `create-afrobase` initializer package.

## CLI Usage

Once installed or linked locally, the CLI command is:

```bash
create-afrobase [project-name] [options]
```

Examples:

```bash
create-afrobase my-app
create-afrobase --help
create-afrobase --version
```

## Options

```text
-h, --help       Show CLI help
-v, --version    Show CLI version
```

## Current Status

`create-afrobase` is currently under active development.

Version `0.0.1` establishes the initial Afrobase CLI and developer experience.

The current CLI supports:

- CLI execution
- Project-name arguments
- Help output
- Version output

Full project scaffolding and Afrobase Cloud provisioning are planned for future releases.

## Planned Afrobase Capabilities

Afrobase is being designed around integrated platform capabilities including:

- Data
- Authentication & Identity
- Realtime
- Content
- Storage
- Functions
- Events
- Money
- African payment rails
- Security & Fraud Intelligence

Future versions of `create-afrobase` will help developers configure and connect the Afrobase capabilities required by their applications.

## Requirements

- Node.js 20 or later
- npm

## Local Development

Run the CLI locally:

```bash
npm start
```

Check the version:

```bash
node ./bin/create-afrobase.js --version
```

Display help:

```bash
node ./bin/create-afrobase.js --help
```

After running `npm link`, the CLI can also be tested with:

```bash
create-afrobase --version
```

## Package

**Package:** `create-afrobase`

**Current version:** `0.0.1`

**CLI command:** `create-afrobase`

## License

MIT

---

Built for the next generation of African software.