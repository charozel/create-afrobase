# Afrobase

This application is prepared to use Afrobase.

## Project configuration

The project's local Afrobase manifest is stored in:

```text
../afrobase.json
```

It contains non-secret project metadata and identifies this application as an
Afrobase project.

## JavaScript / TypeScript SDK

Install the official Afrobase SDK:

```bash
npm install @afrobase/sdk
```

A ready-to-use SDK client is generated at:

```text
./client.ts
```

Import it from your application using the path appropriate for your project:

```ts
import { afrobase } from "./afrobase/client";
```

The generated client reads `AFROBASE_PROJECT` and
`AFROBASE_API_URL` from the application environment and initializes the
official Afrobase SDK.

The SDK supports JavaScript and TypeScript and communicates with the Afrobase
public HTTP API.

## Environment

Copy the generated environment template when configuring your application:

```text
../.env.example
```

The current environment contract is:

```text
AFROBASE_PROJECT=
AFROBASE_API_URL=https://impressive-clam-161.convex.site
```

`AFROBASE_PROJECT` identifies the Afrobase project/tenant. It is routing
context and is not an authentication credential.

`AFROBASE_API_URL` controls the public API origin. The SDK also has a default
API origin, so applications may choose whether to configure this explicitly.

The current URL is early-release infrastructure. A future Afrobase SDK release
may use the branded `https://api.afrobase.dev` endpoint once that endpoint is
configured and verified.

## Auth

Afrobase Auth V1 currently supports:

- Sign in
- Session lookup
- Sign out

Authentication sessions are managed by the Afrobase SDK after sign-in.

Do not store session tokens, API secrets, access tokens, or other credentials
inside `afrobase.json` or the `afrobase/` directory.

## This directory

The `afrobase/` directory contains project-level Afrobase resources generated
for this application.

Current generated resources:

- `README.md` - Afrobase project and SDK guidance
- `client.ts` - ready-to-use Afrobase SDK client

Additional Afrobase resources may be added here as services are enabled.

Afrobase services may include:

- Data
- Auth
- Functions
- Money
- Security

## Cloud linking

A newly created project begins with local Afrobase configuration.

Cloud project creation, developer authentication, and project linking remain
separate Afrobase operations and are not automatically performed by
`create-afrobase`.

Once a local project has been linked to an Afrobase project, its project
identity can be supplied through `AFROBASE_PROJECT` and used by the SDK.
