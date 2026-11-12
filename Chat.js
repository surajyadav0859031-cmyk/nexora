
"use strict";

/**
 * MY AI AGENCY
 * Central Multi-AI API Router
 *
 * Providers:
 * 1. OpenAI
 * 2. Google Gemini
 * 3. Anthropic Claude
 *
 * Platform: Vercel
 */

/**
 * @typedef {"openai" | "gemini" | "claude"} AIProvider
 */

/**
 * @typedef {Object} ProviderConfig
 * @property {string} key
 * @property {string} model
 * @property {string} [url]
 */

/**
 * @typedef {Object} ProviderResponse
 * @property {Array<{content?: Array<{type?: string, text?: string}>}>} [output]
 * @property {Array<{content?: {parts?: Array<{text?: string}>}}>} [candidates]
 * @property {Array<{type?: string, text?: string}>} [content]
 */

/**
 * @typedef {Object} ChatResult
 * @property {boolean} success
 * @property {string} [provider]
 * @property {string} [answer]
 * @property {string} [error]
 */

// ==========================================
// 1. PROVIDER CONFIGURATION
// ==========================================

/** @type {Record<AIProvider, ProviderConfig>} */
const PROVIDERS = {
  openai: {
    key: "OPENAI_API_KEY",
    model: "OPENAI_MODEL",
    url: "https://api.openai.com/v1/responses"
  },

  gemini: {
    key: "GEMINI_API_KEY",
    model: "GEMINI_MODEL"
  },

  claude: {
    key: "ANTHROPIC_API_KEY",
    model: "CLAUDE_MODEL",
    url: "https://api.anthropic.com/v1/messages"
  }
};

// ==========================================
// 2. JSON RESPONSE HELPER
// ==========================================

/**
 * @param {unknown} data
 * @param {number} status
 * @returns {Response}
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,

    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

// ==========================================
// 3. OBJECT VALIDATION
// ==========================================

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// ==========================================
// 4. PROVIDER VALIDATION
// ==========================================

/**
 * @param {string} value
 * @returns {value is AIProvider}
 */
function isProvider(value) {
  return Object.prototype.hasOwnProperty.call(
    PROVIDERS,
    value
  );
}

// ==========================================
// 5. AI PROVIDER REQUEST
// ==========================================

/**
 * @param {AIProvider} provider
 * @param {string} message
 * @returns {Promise<string>}
 */
async function callAI(provider, message) {

  const config = PROVIDERS[provider];

  // Check API credentials

  const apiKey = process.env[config.key];
  const model = process.env[config.model];

  if (
    typeof apiKey !== "string" ||
    !apiKey.trim() ||
    typeof model !== "string" ||
    !model.trim()
  ) {
    throw new Error(
      "Provider configuration is incomplete."
    );
  }

  // Request timeout

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, 55000);

  try {

    /** @type {string} */
    let url = "";

    /** @type {Record<string, string>} */
    let headers = {};

    /** @type {Record<string, unknown>} */
    let body = {};

    // --------------------------------------
    // OPENAI
    // --------------------------------------

    if (provider === "openai") {

      url = config.url || "";

      headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      };

      body = {
        model: model,
        input: message,
        max_output_tokens: 1000
      };
    }

    // --------------------------------------
    // GOOGLE GEMINI
    // --------------------------------------

    else if (provider === "gemini") {

      url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent";

      headers = {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json"
      };

      body = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: message
              }
            ]
          }
        ],

        generationConfig: {
          maxOutputTokens: 1000
        }
      };
    }

    // --------------------------------------
    // ANTHROPIC CLAUDE
    // --------------------------------------

    else if (provider === "claude") {

      url = config.url || "";

      headers = {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      };

      body = {
        model: model,
        max_tokens: 1000,

        messages: [
          {
            role: "user",
            content: message
          }
        ]
      };
    }

    // --------------------------------------
    // SEND API REQUEST
    // --------------------------------------

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    /** @type {ProviderResponse} */
    const data = await response.json();

    if (!response.ok) {

      console.error(
        "Provider:",
        provider,
        "HTTP status:",
        response.status
      );

      throw new Error(
        "AI provider rejected the request."
      );
    }

    // --------------------------------------
    // EXTRACT AI RESPONSE
    // --------------------------------------

    /** @type {string} */
    let answer = "";

    if (provider === "openai") {

      answer = (data.output || [])
        .flatMap(
          /** @param {{content?: Array<{type?: string, text?: string}>}} item */
          item => item.content || []
        )
        .filter(
          /** @param {{type?: string, text?: string}} item */
          item => item.type === "output_text"
        )
        .map(
          /** @param {{type?: string, text?: string}} item */
          item => item.text || ""
        )
        .join("\n");
    }

    else if (provider === "gemini") {

      answer = (
        data.candidates?.[0]?.content?.parts || []
      )
        .map(
          /** @param {{text?: string}} part */
          part => part.text || ""
        )
        .join("\n");
    }

    else if (provider === "claude") {

      answer = (data.content || [])
        .filter(
          /** @param {{type?: string, text?: string}} item */
          item => item.type === "text"
        )
        .map(
          /** @param {{type?: string, text?: string}} item */
          item => item.text || ""
        )
        .join("\n");
    }

    // Validate response

    if (!answer.trim()) {
      throw new Error(
        "AI provider returned an empty response."
      );
    }

    return answer;

  } finally {

    clearTimeout(timer);

  }
}

// ==========================================
// 6. MAIN API HANDLER
// ==========================================

export default {

  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */

  async fetch(request) {

    // Only allow POST requests

    if (request.method !== "POST") {

      return json({
        success: false,
        error: "Method not allowed."
      }, 405);
    }

    // Validate content type

    const contentType =
      request.headers.get("content-type") || "";

    if (
      !contentType.toLowerCase().includes(
        "application/json"
      )
    ) {

      return json({
        success: false,
        error: "JSON content type required."
      }, 415);
    }

    // Check declared request size

    const contentLength =
      Number(request.headers.get("content-length") || 0);

    if (
      Number.isFinite(contentLength) &&
      contentLength > 12000
    ) {

      return json({
        success: false,
        error: "Request too large."
      }, 413);
    }

    try {

      // Parse incoming request

      /** @type {unknown} */
      const input = await request.json();

      if (!isRecord(input)) {

        return json({
          success: false,
          error: "Invalid request body."
        }, 400);
      }

      // Extract input values

      const providerValue = input.provider;
      const messageValue = input.message;

      // Validate provider

      if (
        typeof providerValue !== "string" ||
        !isProvider(providerValue)
      ) {

        return json({
          success: false,
          error: "Invalid AI provider."
        }, 400);
      }

      // Validate message

      if (
        typeof messageValue !== "string" ||
        !messageValue.trim()
      ) {

        return json({
          success: false,
          error: "Message cannot be empty."
        }, 400);
      }

      if (messageValue.length > 4000) {

        return json({
          success: false,
          error: "Message exceeds 4000 characters."
        }, 400);
      }

      // Call selected AI provider

      const answer = await callAI(
        providerValue,
        messageValue.trim()
      );

      // Return successful response

      return json({
        success: true,
        provider: providerValue,
        answer: answer
      }, 200);

    } catch (error) {

      // Handle errors safely

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown server error.";

      console.error(
        "MY AI AGENCY API Error:",
        errorMessage
      );

      const isTimeout =
        error instanceof Error &&
        error.name === "AbortError";

      return json({
        success: false,

        error: isTimeout
          ? "AI provider request timed out."
          : "AI request failed. Check server configuration."
      }, isTimeout ? 504 : 500);

    }
  }
};
