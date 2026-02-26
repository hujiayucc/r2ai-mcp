export interface Property {
  type: string,
  description: string
}

export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties?: Record<string, Property>
    required: string[]
  }
}

export interface ListToolsResult {
  tools: McpTool[]
}

export interface CallToolResult {
  content?: Array<{ type: string, text?: string }>
  isError: boolean
}


export interface R2AIBridgeConfig {
  url: string
  timeoutMs?: number
}

export interface Config {
  r2aiBridge: R2AIBridgeConfig
}
