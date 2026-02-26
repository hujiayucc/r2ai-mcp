import {readFileSync} from "node:fs"
import {CallToolResult, Config, ListToolsResult, McpTool} from "./types.js"


let requestId = 0

function nextId(): number {
  return ++requestId
}

async function rpc<T>(
  baseUrl: string,
  method: string,
  params?: Record<string, unknown>,
  timeoutMs: number = 30000
): Promise<T> {
  const url = baseUrl.replace(/\/$/, "") + "/mcp"
  const body = {
    jsonrpc: "2.0",
    id: nextId(),
    method,
    ...(params ? {params} : {}),
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let result: T
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      return Promise.reject(
        new Error(`R2AIBridge HTTP ${res.status}: ${res.statusText}`)
      )
    }
    const data = (await res.json()) as {
      jsonrpc?: string
      id?: number
      result?: T
      error?: { code: number, message: string }
    }
    if (data.error) {
      return Promise.reject(
        new Error(`R2AIBridge RPC error: ${data.error.message}`)
      )
    }
    if (data.result === undefined) {
      return Promise.reject(new Error("R2AIBridge RPC: missing result"))
    }
    result = data.result as T
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err))
    return Promise.reject(e)
  } finally {
    clearTimeout(timeout)
  }
  return result
}

export async function listTools(config: Config): Promise<ListToolsResult> {
  let result: ListToolsResult | null | undefined = null
  try {
    const json = readFileSync(new URL("../tools.json", import.meta.url), "utf-8")
    result = JSON.parse(json).result
  } catch {
  }
  if (!result || !Array.isArray(result.tools)) {
    result = await rpc<ListToolsResult>(
      config.r2aiBridge.url,
      "tools/list",
      undefined,
      config.r2aiBridge.timeoutMs
    )
  }
  if (!result || !Array.isArray(result.tools)) {
    return {tools: []}
  }
  const tools = result.tools.filter(
    (tool): tool is McpTool => tool != null && (tool as McpTool).name.length > 0
  )
  return {tools}
}

export async function callTool(
  config: Config,
  name: string,
  arguments_: Record<string, unknown>
): Promise<CallToolResult> {
  const timeout = config.r2aiBridge.timeoutMs ?? 30000
  const result = await rpc<CallToolResult>(
    config.r2aiBridge.url,
    "tools/call",
    {name, arguments: arguments_},
    timeout
  )
  return result ?? {content: []}
}
