import {Config} from "./types.js";

const defaultConfig: Config = {
  r2aiBridge: {
    url: "http://127.0.0.1:5050",
    timeoutMs: 30000
  }
}

export function loadConfig(baseUrl?: string, timeoutMs?: number): Config {
  const url =
    baseUrl ??
    process.env.R2AI_BASEURL ??
    defaultConfig.r2aiBridge.url
  const rawTime =
    timeoutMs ??
    Number(process.env.R2AI_TIMEOUT) ??
    defaultConfig.r2aiBridge.timeoutMs
  const time =
    Number.isFinite(rawTime) && rawTime > 0
      ? rawTime
      : (defaultConfig.r2aiBridge.timeoutMs ?? 30000)
  try {
    const parsed: Partial<Config> = {
      r2aiBridge: {
        url: url,
        timeoutMs: time
      }
    }
    return {
      r2aiBridge: {
        ...defaultConfig.r2aiBridge,
        ...parsed.r2aiBridge,
      }
    }
  } catch (e) {
    console.error("Failed to load config.", e)
    return defaultConfig
  }
}
