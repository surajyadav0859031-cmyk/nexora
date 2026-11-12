
"use strict";

/**
 * MY AI AGENCY
 * Backend Health Check
 *
 * Checks backend availability and AI provider configuration.
 */

const REQUIRED_PROVIDERS = {
  openai: [
    "OPENAI_API_KEY",
    "OPENAI_MODEL"
  ],

  gemini: [
    "GEMINI_API_KEY",
    "GEMINI_MODEL"
  ],

  claude: [
    "ANTHROPIC_API_KEY",
    "CLAUDE_MODEL"
  ]
};

export default {
  /**
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {

    // 1. Allow GET requests only

    if (request.method !== "GET") {
      return Response.json(
        {
          success: false,
          error: "Method not allowed."
        },
        {
          status: 405,
          headers: {
            "Allow": "GET",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    // 2. Check AI provider configuration

    const providers = {};

    for (const [provider, variables] of
      Object.entries(REQUIRED_PROVIDERS)) {

      providers[provider] = variables.every(
        variable => {
          const value = process.env[variable];

          return (
            typeof value === "string" &&
            value.trim().length > 0
          );
        }
      );
    }

    // 3. Count configured providers

    const configuredCount = Object.values(
      providers
    ).filter(Boolean).length;

    // 4. Return backend status

    return Response.json(
      {
        success: true,

        service: "MY AI AGENCY",

        backend: "online",

        timestamp: new Date().toISOString(),

        providers: providers,

        summary: {
          total: Object.keys(providers).length,
          configured: configuredCount,
          unavailable:
            Object.keys(providers).length -
            configuredCount
        }
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      }
    );
  }
};
