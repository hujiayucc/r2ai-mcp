import {readFileSync} from "node:fs"
import {getRootFileUrl} from "./utils.js"

export const version = () => {
  const npmScriptVersion = process.env.npm_package_version
  if (npmScriptVersion) {
    return npmScriptVersion
  }

  try {
    const raw = readFileSync(getRootFileUrl("package.json"), "utf8")
    const parsed = JSON.parse(raw) as { version?: string }
    if (typeof parsed.version === "string" && parsed.version.length > 0) {
      return parsed.version
    }
  } catch {
  }
  return "0.0.0"
}