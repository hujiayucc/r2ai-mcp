# R2AI MCP 插件

基于 [R2AIBridge](https://github.com/muort521/R2AIBridge) 的 MCP（Model Context Protocol）插件，通过 R2AIBridge 的 HTTP API **动态获取工具列表**并将工具调用转发到 Android 端。

## 功能

- **动态工具列表**：启动时或客户端请求时从 R2AIBridge 的 `tools/list` 获取当前可用工具，无需在代码中写死
- **透明转发**：客户端调用 `tools/call` 时，本服务将请求转发到 R2AIBridge 的 `/mcp` 端点
- **配置驱动**：R2AIBridge 的 base URL、超时等均在 `config.json` 中配置

## 配置

在项目根目录修改 `.env`，也可通过环境变量指定配置：

```bash
R2AI_BASEURL=http://127.0.0.1:5050
R2AI_TIMEOUT=30000
```

## 安装与运行

```bash
npm install r2ai-mcp
```

## 在 客户端 中配置

在客户端的 MCP 配置（例如 `mcp.json`）中添加：

```json
{
  "mcpServers": {
    "r2ai": {
      "command": "npm",
      "args": ["-y", "@hujiayucc/r2ai-mcp"],
      "env": {
        "R2AI_BASEURL": "http://127.0.0.1:5050",
        "R2AI_TIMEOUT": 30000
      }
    }
  }
}
```


## 依赖

- Node.js >= 18
- 已启动的 R2AIBridge 服务（Android 设备上运行 R2AIBridge 应用并点击「启动服务」）

## 协议说明

- 本服务实现 MCP 的 **stdio** 传输，与 R2AIBridge 的 **HTTP JSON-RPC 2.0** 接口对接
- 工具列表来自 R2AIBridge `POST {url}/mcp`、`method: "tools/list"`
- 工具调用为 `method: "tools/call"`，`params: { name, arguments }`

## License

```
MIT License

Copyright (C) 2026 hujiayucc

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
