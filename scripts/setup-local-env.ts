import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const root = process.cwd();
const envExamplePath = join(root, ".env.example");
const envPath = join(root, ".env");
const force = process.argv.includes("--force");

function randomHex(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

function randomAlphaNumeric(length: number) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  while (value.length < length) {
    const next = alphabet[randomBytes(1)[0] % alphabet.length];
    value += next;
  }
  return value;
}

if (!existsSync(envExamplePath)) {
  throw new Error(".env.example not found");
}

if (existsSync(envPath) && !force) {
  console.log(".env already exists. Use `pnpm env:setup --force` to regenerate it.");
  process.exit(0);
}

const template = readFileSync(envExamplePath, "utf8");

const replacements = new Map<string, string>([
  ["AUTH_SECRET", randomHex(32)],
  ["NEXTAUTH_SECRET", randomHex(32)],
  ["MINIO_ACCESS_KEY", `identity${randomAlphaNumeric(8)}`],
  ["MINIO_SECRET_KEY", randomHex(24)],
]);

const output = template
  .split(/\r?\n/)
  .map((line) => {
    if (!line || line.startsWith("#")) return line;
    const idx = line.indexOf("=");
    if (idx === -1) return line;

    const key = line.slice(0, idx).trim();
    if (!replacements.has(key)) return line;

    return `${key}=${replacements.get(key)}`;
  })
  .join("\n");

writeFileSync(envPath, `${output}\n`, "utf8");

console.log("Created .env with randomized local secrets.");
console.log("Next step: docker compose up --build");
