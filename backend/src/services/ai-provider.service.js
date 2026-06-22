// AI Provider Agnostic Interface
// Supports: openai | anthropic | mistral | ollama | rule (no AI)
const { env } = require("../config/env");

const DEFAULT_MODEL = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  mistral: "mistral-small-latest",
  ollama: "llama3",
};

function getProvider() {
  return (env.aiProvider || env.llmMode || "mock").toLowerCase();
}

function getModel(provider) {
  return env.aiModel || DEFAULT_MODEL[provider] || DEFAULT_MODEL.openai;
}

async function callOpenAI(messages, options = {}) {
  const res = await fetch(`${env.openaiBaseUrl || "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: options.model || getModel("openai"),
      messages,
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature ?? 0.1,
      response_format: options.jsonMode ? { type: "json_object" } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

async function callAnthropic(messages, options = {}) {
  const system = messages.find((m) => m.role === "system")?.content || "";
  const userMsgs = messages.filter((m) => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.anthropicApiKey || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: options.model || getModel("anthropic"),
      max_tokens: options.maxTokens || 800,
      system: system || undefined,
      messages: userMsgs,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function callMistral(messages, options = {}) {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.mistralApiKey || ""}`,
    },
    body: JSON.stringify({
      model: options.model || getModel("mistral"),
      messages,
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature ?? 0.1,
    }),
  });
  if (!res.ok) throw new Error(`Mistral error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

async function callOllama(messages, options = {}) {
  const baseUrl = env.ollamaBaseUrl || "http://localhost:11434";
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model || getModel("ollama"),
      messages,
      stream: false,
      options: { temperature: options.temperature ?? 0.1 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message?.content || "";
}

// Mock response for dev/test
function callMock(messages, options = {}) {
  const lastMsg = messages[messages.length - 1]?.content || "";
  if (options.jsonMode) {
    return JSON.stringify({
      backlog_group: "N1",
      priority: "medium",
      confidence: 75,
      resolution_type: "dispatch",
      justification: "[MOCK] Ticket classifié automatiquement",
      suggested_response: null,
      clarification_question: null,
    });
  }
  return `[MOCK] Réponse simulée pour: ${lastMsg.slice(0, 50)}`;
}

async function complete(messages, options = {}) {
  const provider = options.provider || getProvider();
  const start = Date.now();
  let result;

  try {
    switch (provider) {
      case "openai":
        result = await callOpenAI(messages, options);
        break;
      case "anthropic":
        result = await callAnthropic(messages, options);
        break;
      case "mistral":
        result = await callMistral(messages, options);
        break;
      case "ollama":
        result = await callOllama(messages, options);
        break;
      default:
        result = callMock(messages, options);
    }
  } catch (err) {
    // Fallback to mock on provider error in dev
    if (env.nodeEnv !== "production") {
      result = callMock(messages, options);
    } else {
      throw err;
    }
  }

  return { text: result, provider, ms: Date.now() - start };
}

async function completeJSON(messages, options = {}) {
  const { text, provider, ms } = await complete(messages, { ...options, jsonMode: true });
  try {
    // Strip markdown code blocks if present
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return { data: JSON.parse(clean), provider, ms };
  } catch {
    return { data: null, provider, ms, parseError: true };
  }
}

module.exports = { complete, completeJSON, getProvider };
