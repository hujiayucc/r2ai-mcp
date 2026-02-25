import type { Config } from "./loadConfig.js"

const JSON_RPC_VERSION = "2.0"
let requestId = 0

function nextId(): number {
  return ++requestId
}

export interface McpTool {
  name: string
  description?: string
  inputSchema?: {
    type?: string
    properties?: Record<string, unknown>
    required?: string[]
  }
}

export interface ListToolsResult {
  tools: McpTool[]
}

export interface CallToolResult {
  content?: Array<{ type: string, text?: string }>
  isError?: boolean
}

async function rpc<T>(
  baseUrl: string,
  method: string,
  params?: Record<string, unknown>,
  timeoutMs: number = 30000
): Promise<T> {
  const url = baseUrl.replace(/\/$/, "") + "/mcp"
  const body = {
    jsonrpc: JSON_RPC_VERSION,
    id: nextId(),
    method,
    ...(params ? { params } : {}),
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let result: T
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  const timeout = config.r2aiBridge.timeoutMs ?? 30000
  const result = await rpc<ListToolsResult>(
    config.r2aiBridge.url,
    "tools/list",
    undefined,
    timeout
  )
  if (!result || !Array.isArray(result.tools)) {
    return { tools: [] }
  }
  return result
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
    { name, arguments: arguments_ },
    timeout
  )
  return result ?? { content: [] }
}
