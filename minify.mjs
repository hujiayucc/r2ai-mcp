import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { minify } from "terser"

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, "dist")

const files = readdirSync(distDir).filter((f) => f.endsWith(".js"))
for (const file of files) {
  const path = join(distDir, file)
  const code = readFileSync(path, "utf8")
  const result = await minify(code, {
    parse: { ecma: 2022, module: true },
    compress: { ecma: 2022 },
    mangle: true,
    format: { ecma: 2022, comments: false },
  })
  if (result.code) {
    writeFileSync(path, result.code)
    console.log("Minified:", file)
  }
}
