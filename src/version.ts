import {readFileSync} from "node:fs";

export const version = () => {
  const npmScriptVersion = process.env.npm_package_version
  if (npmScriptVersion) {
    return npmScriptVersion
  }

  try {
    const packageJsonUrl = new URL("../package.json", import.meta.url)
    const raw = readFileSync(packageJsonUrl, "utf8")
    const parsed = JSON.parse(raw) as { version?: string };
    if (typeof parsed.version === "string" && parsed.version.length > 0) {
      return parsed.version
    }
  } catch {
  }
  return "0.0.0"
}