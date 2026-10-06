/**
 * chat.js — Fly Trip Chat client
 * Talks to /api/chat (Cloudflare Workers AI).
 *
 * Expected response JSON from the worker:
 *   { "reply": "AI text..." }
 *
 * You may also return { response: "..." } or { message: "..." }
 * — the client will pick whichever exists.
 */

(function () {
  "use strict";

  const chatMessages   = document.getElementById("chat-messages");
  const userInput      = document.getElementById("user-input");
  const sendButton     = document.getElementById("send-button");
  const typingIndicator = document.getElementById("typing-indicator");

  let isWaiting = false;

  /* ---------- helpers ---------- */

  function scrollToBottom() {
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: "smooth",
    });
  }

  function appendMessage(text, role) {
    const div = document.createElement("div");
    div.className = `message ${role}-message`;

    const p = document.createElement("p");
    p.textContent = text;
    div.appendChild(p);

    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
  }

  function setTyping(visible) {
    typingIndicator.classList.toggle("visible", visible);
    typingIndicator.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function setLoading(loading) {
    isWaiting = loading;
    userInput.disabled = loading;
    sendButton.disabled = loading;
    if (!loading) userInput.focus();
  }

  function autoResizeTextarea() {
    userInput.style.height = "auto";
    const max = 140;
    userInput.style.height = Math.min(userInput.scrollHeight, max) + "px";
  }

  /* ---------- core send ---------- */

  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || isWaiting) return;

    // 1. show the user's message
    appendMessage(text, "user");

    // 2. reset the input
    userInput.value = "";
    autoResizeTextarea();

    // 3. show loading / typing
    setLoading(true);
    setTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const reply =
        data.reply ?? data.response ?? data.message ?? "…";

      setTyping(false);
      appendMessage(reply, "assistant");
    } catch (err) {
      console.error("[chat.js] AI request failed:", err);
      setTyping(false);
      appendMessage(
        "⚠️ Sorry, I couldn't reach the AI service. Please try again.",
        "assistant"
      );
    } finally {
      setLoading(false);
      setTyping(false);
      scrollToBottom();
    }
  }

  /* ---------- events ---------- */

  sendButton.addEventListener("click", sendMessage);

  userInput.addEventListener("keydown", (e) => {
    // Enter alone = send, Shift+Enter = newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  userInput.addEventListener("input", autoResizeTextarea);

  window.addEventListener("load", () => {
    userInput.focus();
    scrollToBottom();
  });

  setTyping(false);
})();