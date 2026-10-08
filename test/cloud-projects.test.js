
import assert from "node:assert/strict";
import test from "node:test";

import {
  listCloudProjects,
} from "../src/cloud-projects.js";

const PROJECT_ID =
  `proj_${"a".repeat(32)}`;

const SECOND_PROJECT_ID =
  `proj_${"b".repeat(32)}`;

function project(overrides = {}) {
  return {
    projectId: PROJECT_ID,
    name: "Afrobase",
    slug: "afrobase",
    environment: "production",
    organization: {
      name: "Afrobase Labs",
      slug: "afrobase-labs",
    },
    role: "owner",
    ...overrides,
  };
}

function options({
  credential = { token: "test-credential" },
  status = 200,
  data = { projects: [project()] },
  request,
} = {}) {
  return {
    loadCredential: async () => credential,
    request:
      request ??
      (async () => ({
        status,
        data,
      })),
    apiUrl: "https://example.convex.site",
  };
}

test("lists authorized cloud projects", async () => {
  const result = await listCloudProjects(options());

  assert.equal(result.length, 1);
  assert.equal(result[0].projectId, PROJECT_ID);
  assert.equal(result[0].role, "owner");
});

test("accepts an empty authorized project list", async () => {
  const result = await listCloudProjects(
    options({
      data: { projects: [] },
    }),
  );

  assert.deepEqual(result, []);
});

test("rejects missing CLI credentials", async () => {
  await assert.rejects(
    listCloudProjects(
      options({
        credential: null,
      }),
    ),
    /Not signed in/,
  );
});

test("rejects malformed project IDs", async () => {
  await assert.rejects(
    listCloudProjects(
      options({
        data: {
          projects: [
            project({
              projectId: "invalid-project-id",
            }),
          ],
        },
      }),
    ),
    /invalid projects response/,
  );
});

test("rejects malformed organization details", async () => {
  await assert.rejects(
    listCloudProjects(
      options({
        data: {
          projects: [
            project({
              organization: null,
            }),
          ],
        },
      }),
    ),
    /invalid projects response/,
  );
});

test("rejects invalid membership roles", async () => {
  await assert.rejects(
    listCloudProjects(
      options({
        data: {
          projects: [
            project({
              role: "superuser",
            }),
          ],
        },
      }),
    ),
    /invalid projects response/,
  );
});

test("rejects duplicate public project IDs", async () => {
  await assert.rejects(
    listCloudProjects(
      options({
        data: {
          projects: [
            project(),
            project({
              projectId: PROJECT_ID,
              name: "Duplicate",
            }),
          ],
        },
      }),
    ),
    /invalid projects response/,
  );
});

test("accepts multiple distinct projects", async () => {
  const result = await listCloudProjects(
    options({
      data: {
        projects: [
          project(),
          project({
            projectId: SECOND_PROJECT_ID,
            name: "Another Project",
            slug: "another-project",
            environment: "development",
            role: "developer",
          }),
        ],
      },
    }),
  );

  assert.equal(result.length, 2);
});

test("rejects invalid response envelopes", async () => {
  await assert.rejects(
    listCloudProjects(
      options({
        data: {
          items: [],
        },
      }),
    ),
    /invalid projects response/,
  );
});

test("sends a bearer-authenticated GET request", async () => {
  let capturedPath;
  let capturedOptions;

  await listCloudProjects(
    options({
      request: async (path, requestOptions) => {
        capturedPath = path;
        capturedOptions = requestOptions;

        return {
          status: 200,
          data: { projects: [] },
        };
      },
    }),
  );

  assert.equal(
    capturedPath,
    "/api/control/v1/projects",
  );

  assert.equal(
    capturedOptions.method,
    "GET",
  );

  assert.equal(
    capturedOptions.bearerToken,
    "test-credential",
  );

  assert.equal(
    capturedOptions.baseUrl,
    "https://example.convex.site",
  );
});
