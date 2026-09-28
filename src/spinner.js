import {
  error,
  success,
} from "./logger.js";

const DEFAULT_FRAMES = [
  "|",
  "/",
  "-",
  "\\",
];

const DEFAULT_INTERVAL = 80;

function canAnimate() {
  return Boolean(
    process.stdout.isTTY &&
    !process.env.CI &&
    process.env.TERM !== "dumb",
  );
}

export function createSpinner(
  message,
  options = {},
) {
  const frames =
    options.frames ?? DEFAULT_FRAMES;

  const interval =
    options.interval ?? DEFAULT_INTERVAL;

  let timer = null;
  let frameIndex = 0;
  let active = false;

  function render(frame) {
    process.stdout.write(
      `\r${frame}  ${message}`,
    );
  }

  function clear() {
    if (!canAnimate()) {
      return;
    }

    process.stdout.write(
      `\r${" ".repeat(message.length + 4)}\r`,
    );
  }

  function start() {
    if (active) {
      return;
    }

    active = true;

    if (!canAnimate()) {
      console.log(`> ${message}`);
      return;
    }

    render(frames[frameIndex]);

    timer = setInterval(() => {
      frameIndex =
        (frameIndex + 1) % frames.length;

      render(frames[frameIndex]);
    }, interval);

    timer.unref?.();
  }

  function stop() {
    if (!active) {
      return;
    }

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    clear();
    active = false;
  }

  function succeed(
    successMessage = message,
  ) {
    stop();
    success(successMessage);
  }

  function fail(
    failureMessage = message,
  ) {
    stop();
    error(failureMessage);
  }

  return {
    start,
    stop,
    succeed,
    fail,

    get active() {
      return active;
    },
  };
}