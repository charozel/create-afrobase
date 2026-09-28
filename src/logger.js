const SYMBOLS = Object.freeze({
  success: "[ok]",
  error: "[x]",
  step: ">",
  brand: "::",
});

export function info(message = "") {
  console.log(message);
}

export function success(message) {
  console.log(`${SYMBOLS.success} ${message}`);
}

export function error(message) {
  console.error(`${SYMBOLS.error} ${message}`);
}

export function detail(message) {
  console.log(`     ${message}`);
}

export function step(message) {
  console.log(`${SYMBOLS.step} ${message}`);
}

export function heading(message) {
  console.log(`${SYMBOLS.brand} ${message}`);
}

export function label(name, value) {
  console.log(`  ${name.padEnd(10)} ${value}`);
}

export function spacer() {
  console.log("");
}
