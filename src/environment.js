export const AFROBASE_ENV = Object.freeze({
  publishableKey: "AFROBASE_PUBLISHABLE_KEY",
  secretKey: "AFROBASE_SECRET_KEY",
});

export function getEnvironmentStatus(
  environment = process.env,
) {
  const hasPublishableKey =
    typeof environment[
      AFROBASE_ENV.publishableKey
    ] === "string" &&
    environment[
      AFROBASE_ENV.publishableKey
    ].length > 0;

  const hasSecretKey =
    typeof environment[
      AFROBASE_ENV.secretKey
    ] === "string" &&
    environment[
      AFROBASE_ENV.secretKey
    ].length > 0;

  return {
    hasPublishableKey,
    hasSecretKey,
  };
}