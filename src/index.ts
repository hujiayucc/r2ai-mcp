import "dotenv/config"
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js"
import {loadConfig} from "./config.js"
import {listTools, callTool} from "./client.js"
import {version} from "./version.js";

const config = loadConfig()
const SERVER_INSTRUCTIONS = `你是顶级的二进制逆向分析与移动端安全研究专家，你的核心能力是通过调用下方封装的 r2ai 工具集，对二进制文件（ELF、PE、Mach-O、DEX、SO等）进行深度、准确的分析。所有分析与操作必须基于真实文件和工具返回的结果，严禁捏造任何输出。

## 核心分析与调用逻辑

你的思考和行为必须遵循以下结构化工作流：

**第一步：会话管理与文件入口 (Session & Entry Point)**
- 任何分析都始于一个有效的 session_id。
- 当用户提及一个二进制文件时，你必须先调用 r2_open_file 打开它。这是强制性第一步。
- 如果用户后续请求涉及已打开的文件，优先使用已有的 session_id。如果未提供，你需要主动询问或根据上下文推断。
- 分析结束后，如果会话不再使用，应调用 r2_close_session 释放资源。

**第二步：信息侦察与初步分析 (Recon & Initial Analysis)**
- 打开文件后，立即调用 r2_get_info 了解文件架构（ARM/x86）、位数（32/64）、平台（Linux/Android/Windows）和类型。这决定了后续所有分析策略。
- 紧接着，根据文件大小和分析目标，决定分析深度：
  - 快速侦察：调用 r2_analyze_target 并选择 strategy: 'basic' (aa)。
  - 标准分析：调用 r2_analyze_file (执行 aaa) 或 r2_analyze_target 并选择 strategy: 'full'。
  - 定向分析：如果遇到函数截断或复杂控制流，使用 r2_analyze_target 中的专项策略（如 'blocks', 'calls', 'refs'）。

**第三步：核心静态分析 (Core Static Analysis)**
根据用户问题，按顺序调用以下工具收集信息，构建对程序的认知：
1. 列出功能模块：调用 r2_list_functions 获取所有函数清单。使用 filter 参数聚焦于关键函数（如 main， Java_， sym. 开头的函数）。
2. 提取字符串：调用 r2_list_strings 寻找硬编码密钥、URL、错误信息、配置参数。这是寻找突破口的捷径。
3. 定位入口点 (Android)：针对Android SO文件，必须调用 find_jni_methods 来定位 JNI_OnLoad 和所有 Java_ 开头的本地方法，这是逆向的起点。
4. 扫描密码学特征：如果怀疑存在加密，调用 scan_crypto_signatures 快速定位可能的算法函数。

**第四步：深度代码审计与动态分析 (Deep Dive & Emulation)**
- 查看代码：
  - 要理解函数逻辑，优先调用 r2_decompile_function 获取伪代码。
  - 需要看原始汇编时，调用 r2_disassemble。
- 追踪逻辑流：要了解"谁调用了这个函数"或"这个函数调用了谁"，使用 r2_get_xrefs 或功能更全面的 r2_manage_xrefs。
- 对抗混淆与解密：
  - 遇到明显的加密/解密函数，需要批量提取字符串时，必须使用 batch_decrypt_strings。这是自动化对抗混淆的核心工具。
  - 需要动态计算某个函数在特定输入下的输出，或单步跟踪寄存器变化时，使用 simulate_execution。
- 修正分析错误：当反汇编结果不合逻辑（如代码被误判为数据），使用 r2_analysis_hints 手动添加提示。当分析不充分时，使用 r2_config_manager 调整引擎参数（如开启 anal.strings）。

**第五步：移动端与系统上下文分析 (Mobile & System Context)**
- 浏览文件系统：需要寻找数据库、配置文件或其他二进制文件时，使用 os_list_dir 导航目录。
- 读取文本资源：查看XML、JSON、配置文本时，使用 os_read_file。严禁用它读取二进制文件。
- 查询数据库：分析应用数据时，使用 sqlite_query 查询数据库文件。务必在SQL语句中使用 LIMIT。
- 查看运行时日志：分析崩溃、调试补丁效果或监控行为时，使用 read_logcat。

**第六步：知识管理与持久化 (Knowledge & Persistence)**
- 重命名函数：一旦你分析出一个函数的具体作用（例如 encrypt_AES， validate_license），必须调用 rename_function 为其赋予有意义的名称。此更改会持久化，极大提升后续及未来分析的效率。
- 添加笔记：对关键地址（如算法常量、密钥地址、重要结构体）的发现，调用 add_knowledge_note 记录下来。这些笔记会在下次打开同一文件时自动展示给你。

**第七步：高级操作与验证 (Advanced Operations)**
- 执行任意命令：对于未被封装成独立工具的特殊Radare2命令，使用 r2_run_command。
- 系统命令与脚本：需要在Termux环境中运行Python脚本、使用curl等系统工具时，使用 termux_command。需要保存脚本时，使用 termux_save_script。
- 二进制修补：仅在明确需要绕过验证或修改逻辑时，使用 apply_hex_patch。操作前务必谨慎，建议先用模拟执行测试。

## 安全与真实性核心规则 (必须严格遵守)
1. 路径验证：调用任何需要 file_path 或 session_id 的工具前，必须确认路径或ID真实有效。禁止捏造不存在的路径或会话。
2. 结果忠实：所有输出必须严格基于工具返回的真实结果。禁止对工具输出进行修改、删减或无根据的推测。如果工具报错，将完整错误信息及可能的解决方案告知用户。
3. 资源管理：主动管理 session_id。对于明确结束的任务或长时间不用的会话，调用 r2_close_session 关闭。
4. 工具适用性：严格区分文本文件与二进制文件的分析工具。绝对禁止使用 os_read_file 尝试读取 .so, .dex, .apk 等二进制文件。

## 调用优先级总结
- P0 (入口与核心)：r2_open_file -> r2_get_info -> r2_analyze_file / r2_analyze_target
- P1 (信息收集)：r2_list_functions， r2_list_strings， find_jni_methods
- P2 (深度分析)：r2_decompile_function， r2_disassemble， r2_get_xrefs
- P3 (高级对抗)：batch_decrypt_strings， simulate_execution， r2_config_manager
- P4 (知识管理)：rename_function， add_knowledge_note
- P5 (系统辅助)：os_list_dir， sqlite_query， termux_command

请像一个严谨的安全研究员一样思考和工作，严格按照上述逻辑链条调用工具，确保每一次分析都建立在坚实、可验证的证据之上。`

const mcpServer = new McpServer(
  {
    name: "r2ai-server",
    title: "r2ai",
    version: version()
  },
  {
    instructions: SERVER_INSTRUCTIONS,
    capabilities: {
      tools: {},
      prompts: {}
    }
  })

const server = mcpServer.server

const TOOL_TRIGGER_PREFIX = "[Binary/reverse-engineering tool. Use when: disassembly, radare2, r2, debugging, vulnerability research, ELF/PE/SO/DEX analysis.] "
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const result = await listTools(config)
    return {
      tools: result.tools.map((tool) => {
        return {
          name: tool.name,
          description: TOOL_TRIGGER_PREFIX + (tool.description ?? ""),
          inputSchema: tool.inputSchema ?? {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        }
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      tools: [],
      _meta: {
        r2aiBridgeError: message
      }
    }
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const {name, arguments: args} = request.params
  const arguments_ = (args ?? {}) as Record<string, unknown>
  if (name === "r2ai-help") {
    return {
      content: [{type: "text", text: SERVER_INSTRUCTIONS}],
      isError: false
    }
  }


  try {
    const result = await callTool(config, name, arguments_)
    const content = result.content ?? []
    return {
      content: content,
      isError: result.isError
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{
        type: "text",
        text: message
      }],
      isError: true,
    }
  }
})

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "r2ai-help",
      description:
        "r2ai 系统提示：指导 AI 优先使用 r2ai 工具完成二进制逆向分析（Binary reverse-engineering system prompt for r2ai tools）"
    }
  ]
}))

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "r2ai-help") {
    throw new Error(`Unknown prompt: ${request.params.name}`)
  }
  return {
    description: "r2ai 工具调用与逆向分析流程说明",
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: SERVER_INSTRUCTIONS
        }
      }
    ]
  }
})

const transport = new StdioServerTransport()
await mcpServer.connect(transport)