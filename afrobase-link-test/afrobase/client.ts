import { Afrobase } from "@afrobase/sdk";

const project = process.env.AFROBASE_PROJECT;

if (!project) {
  throw new Error(
    "AFROBASE_PROJECT is required to initialize Afrobase.",
  );
}

export const afrobase = new Afrobase({
  project,
  baseUrl:
    process.env.AFROBASE_API_URL || undefined,
});
