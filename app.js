
"use strict";

/**
 * MY AI AGENCY
 * Multi-AI Frontend Controller
 *
 * Supported providers:
 * OpenAI, Gemini, Claude
 */

/**
 * @typedef {"openai" | "gemini" | "claude"} AIProvider
 */

/**
 * @typedef {Object} HealthResponse
 * @property {boolean} success
 * @property {string} service
 * @property {string} backend
 * @property {{
 *   openai: boolean,
 *   gemini: boolean,
 *   claude: boolean
 * }} providers
 */

/**
 * @typedef {Object} ChatResponse
 * @property {boolean} success
 * @property {AIProvider} [provider]
 * @property {string} [answer]
 * @property {string} [error]
 */

// ==========================================
// 1. DOM ELEMENTS
// ==========================================

/** @type {HTMLSelectElement | null} */
const providerSelect =
  document.getElementById("provider");

/** @type {HTMLTextAreaElement | null} */
const messageInput =
  document.getElementById("message");

/** @type {HTMLButtonElement | null} */
const sendButton =
  document.getElementById("sendButton");

/** @type {HTMLElement | null} */
const responseBox =
  document.getElementById("response");

/** @type {HTMLElement | null} */
const backendStatus =
  document.getElementById("backendStatus");

// ==========================================
// 2. PROVIDER STATUS ELEMENTS
// ==========================================

/** @type {Record<AIProvider, HTMLElement | null>} */
const statusElements = {
  openai: document.getElementById("openaiStatus"),
  gemini: document.getElementById("geminiStatus"),
  claude: document.getElementById("claudeStatus")
};

// ==========================================
// 3. CHECK REQUIRED HTML ELEMENTS
// ==========================================

function checkElements() {
  const requiredElements = [
    providerSelect,
    messageInput,
    sendButton,
    responseBox,
    backendStatus
  ];

  const missingElement =
    requiredElements.some(element => element === null);

  if (missingElement) {
    console.error(
      "MY AI AGENCY: Required HTML elements are missing."
    );

    return false;
  }

  return true;
}

// ==========================================
// 4. CHECK BACKEND CONNECTION
// ==========================================

/**
 * @returns {Promise<void>}
 */
async function checkBackend() {
  if (!backendStatus) return;

  backendStatus.textContent = "Checking server...";

  try {
    const response = await fetch("/api/health", {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Backend unavailable.");
    }

    /** @type {HealthResponse} */
    const data = await response.json();

    if (
      !data.success ||
      !data.providers
    ) {
      throw new Error("Invalid server response.");
    }

    backendStatus.textContent = "● Backend Online";

    for (const provider of /** @type {AIProvider[]} */ (
      ["openai", "gemini", "claude"]
    )) {
      const element = statusElements[provider];

      if (element) {
        element.textContent =
          data.providers[provider]
            ? "Configured"
            : "Not configured";
      }
    }

    console.log("MY AI AGENCY backend connected.");

  } catch (error) {
    backendStatus.textContent = "● Backend Offline";

    Object.values(statusElements).forEach(element => {
      if (element) {
        element.textContent = "Unavailable";
      }
    });

    console.error("Backend connection error:", error);
  }
}

// ==========================================
// 5. SEND MESSAGE TO SELECTED AI PROVIDER
// ==========================================

/**
 * @param {AIProvider} provider
 * @param {string} message
 * @returns {Promise<string>}
 */
async function askAI(provider, message) {

  const response = await fetch("/api/chat", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      provider: provider,
      message: message
    })
  });

  /** @type {ChatResponse} */
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "AI request failed."
    );
  }

  if (
    typeof data.answer !== "string" ||
    !data.answer.trim()
  ) {
    throw new Error("AI returned an empty response.");
  }

  return data.answer;
}

// ==========================================
// 6. HANDLE AI MESSAGE SUBMISSION
// ==========================================

/**
 * @returns {Promise<void>}
 */
async function handleAIRequest() {

  if (
    !providerSelect ||
    !messageInput ||
    !sendButton ||
    !responseBox
  ) {
    return;
  }

  /** @type {string} */
  const selectedProvider = providerSelect.value;

  /** @type {string} */
  const message = messageInput.value.trim();

  // Validate provider

  const allowedProviders = [
    "openai",
    "gemini",
    "claude"
  ];

  if (!allowedProviders.includes(selectedProvider)) {
    responseBox.textContent =
      "Please select a valid AI provider.";

    return;
  }

  // Validate message

  if (!message) {
    responseBox.textContent =
      "Please enter a message first.";

    return;
  }

  if (message.length > 4000) {
    responseBox.textContent =
      "Your message exceeds the 4000 character limit.";

    return;
  }

  // Disable button while processing

  sendButton.disabled = true;
  sendButton.textContent = "Connecting...";

  responseBox.textContent =
    "Waiting for AI response...";

  try {

    const answer = await askAI(
      /** @type {AIProvider} */ (selectedProvider),
      message
    );

    responseBox.textContent = answer;

    console.log(
      "AI response received from:",
      selectedProvider
    );

  } catch (error) {

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

    responseBox.textContent =
      "Connection error: " + errorMessage;

    console.error("AI request error:", error);

  } finally {

    sendButton.disabled = false;
    sendButton.textContent = "Send to AI";

  }
}

// ==========================================
// 7. INITIALIZE APPLICATION
// ==========================================

function initializeApp() {

  if (!checkElements()) {
    return;
  }

  if (!sendButton) return;

  // Connect send button

  sendButton.addEventListener(
    "click",
    handleAIRequest
  );

  // Check backend

  checkBackend();

  console.log(
    "MY AI AGENCY initialized successfully."
  );
}

// ==========================================
// 8. START APPLICATION
// ==========================================

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApp,
    { once: true }
  );

} else {

  initializeApp();

}

