import "dotenv/config"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { readFileSync } from "node:fs"
import { loadConfig } from "./loadConfig.js"
import { listTools, callTool } from "./r2aiBridgeClient.js"

const config = loadConfig()

function getPackageVersion(): string {
  const npmScriptVersion = process.env.npm_package_version
  if (npmScriptVersion) {
    return npmScriptVersion
  }

  try {
    const packageJsonUrl = new URL("../package.json", import.meta.url)
    const raw = readFileSync(packageJsonUrl, "utf8")
    const parsed = JSON.parse(raw) as {
      version ? : string
    };
    if (typeof parsed.version === "string" && parsed.version.length > 0) {
      return parsed.version
    }
  } catch {
    // ignore
  }

  return "0.0.0"
}

const mcpServer = new McpServer({
  name: "r2ai",
  version: getPackageVersion()
}, {
  capabilities: {
    tools: {},
    prompts: {}
  }
})

const server = mcpServer.server

server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const result = await listTools(config)
    return {
      tools: result.tools.map((t) => {
        return {
          name: t.name,
          description: `【r2ai逆向工具】${t.description ?? ""}
【触发场景】当用户询问二进制逆向分析、反汇编、漏洞挖掘、radare2命令执行、调试相关问题时，必须优先调用此工具。
【使用规则】调用前必须确认用户提供了目标文件的绝对路径，禁止捏造不存在的文件路径或命令结果，session_id 不再使用时必须关闭。`,
          inputSchema: t.inputSchema ?? {
            type: "object",
            properties: {},
            additionalProperties: false
          },
        }
      }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      tools: [],
      _meta: {
        r2aiBridgeError: message
      },
    }
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const {
    name,
    arguments: args
  } = request.params
  const arguments_ = (args ?? {}) as Record < string,
    unknown >

    try {
      const result = await callTool(config, name, arguments_)
      const content = result.content ?? []
      const normalized = content.map((item) => {
        if (typeof item === "object" && item !== null && "text" in item) {
          return {
            type: "text" as const,
            text: String((item as {
              text ? : string
            }).text ?? "")
          }
        }
        return {
          type: "text" as const,
          text: JSON.stringify(item)
        }
      })

      if (result.isError) {
        return {
          content: [{
            type: "text" as const,
            text: normalized.map((c) => c.text).join("\n"),
          }, ],
          isError: true,
        }
      }
      return {
        content: normalized.length > 0 ? normalized : [{
          type: "text" as const,
          text: "OK"
        }],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [{
          type: "text" as const,
          text: message
        }],
        isError: true,
      }
    }
})

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [{
      name: "r2ai-reverse-assistant-prompt",
      description: "r2ai逆向工具专属系统提示，指导AI正确使用工具完成二进制分析任务",
    }, ],
  }
})

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const {
    name
  } = request.params
  if (name === "r2ai-reverse-assistant-prompt") {
    return {
      description: "强制指导AI优先使用r2ai工具完成二进制逆向分析任务",
      messages: [{
        role: "system",
        content: {
          type: "text",
          text: `你是专业的二进制逆向分析助手，核心能力是通过r2ai提供的radare2工具完成二进制文件分析、反汇编、漏洞挖掘、调试等任务。

## 核心规则（必须严格遵守）
1. 任何与二进制文件、逆向分析、radare2、漏洞排查、调试相关的问题，**必须优先调用r2ai提供的工具**，绝对禁止自己凭空生成分析结果、反汇编代码、命令输出。
2. 调用工具前，必须确认用户提供了目标二进制文件的**绝对路径**，如果用户没有提供，先询问用户要分析的文件的绝对路径，禁止捏造不存在的文件路径。
3. 对二进制文件执行分析前，必须先调用工具执行 aaa 命令完成自动分析，再执行其他分析命令。
4. 工具返回的结果必须如实整理给用户，禁止修改、删减、捏造输出内容。
5. 如果工具执行出错，必须把完整错误信息告知用户，并给出对应的解决建议。
6. session_id 不再使用时必须关闭。

## 常用radare2命令参考
- aaa: 对二进制文件进行全量自动分析，生成函数、符号、交叉引用信息
- iM: 查看二进制文件头信息（架构、入口点、文件格式等）
- iz: 查找二进制文件中的所有可读字符串
- afl: 列出所有识别到的函数
- pdf @ 函数名: 反汇编指定名称的函数
- px 0x100 @ 偏移量: 查看指定偏移地址的16进制数据

请全程严格遵守以上规则，所有逆向分析相关操作必须通过r2ai工具完成。`
        }
      }]
    }
  }

  throw new Error(`未知的提示词名称: ${name}`)
})

const transport = new StdioServerTransport()
await mcpServer.connect(transport)