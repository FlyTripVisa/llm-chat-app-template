(() => {
  "use strict";

  const messagesEl = document.getElementById("messages");
  const presenceEl = document.getElementById("presence");
  const formEl = document.getElementById("chatForm");
  const inputEl = document.getElementById("input");
  const sendBtn = document.getElementById("sendBtn");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  /** @type {WebSocket | null} */
  let ws = null;
  let reconnectDelay = 1000;
  const MAX_RECONNECT_DELAY = 15000;

  function setStatus(state, text) {
    statusDot.className = "dot " + state;
    statusText.textContent = text;
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function appendMessage(msg) {
    const wrap = document.createElement("div");

    if (msg.type === "system") {
      wrap.className = "msg system";
      wrap.textContent = msg.text;
    } else {
      const isSelf = msg.username === currentUsername();
      wrap.className = "msg" + (isSelf ? " self" : "");

      const meta = document.createElement("div");
      meta.className = "meta";

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = isSelf ? "You" : msg.username;

      const time = document.createElement("span");
      time.textContent = formatTime(msg.timestamp);

      meta.appendChild(name);
      meta.appendChild(time);

      const body = document.createElement("div");
      body.textContent = msg.text;

      wrap.appendChild(meta);
      wrap.appendChild(body);
    }

    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderPresence(users) {
    presenceEl.innerHTML = "";
    if (!users || users.length === 0) return;

    const label = document.createElement("span");
    label.textContent = `Online (${users.length}):`;
    presenceEl.appendChild(label);

    for (const u of users) {
      const chip = document.createElement("span");
      chip.className = "user";
      chip.textContent = u;
      presenceEl.appendChild(chip);
    }
  }

  function clearMessages() {
    messagesEl.innerHTML = "";
  }

  function currentUsername() {
    return sessionStorage.getItem("chat.username") || "";
  }

  function promptForUsername() {
    let name = prompt("Enter your username:", currentUsername() || "");
    if (!name) name = "Guest" + Math.floor(Math.random() * 1000);
    name = name.trim().slice(0, 32) || "Guest";
    sessionStorage.setItem("chat.username", name);
    return name;
  }

  function connect() {
    setStatus("connecting", "Connecting…");
    inputEl.disabled = true;
    sendBtn.disabled = true;
    inputEl.placeholder = "Connecting…";

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${protocol}//${location.host}/api/chat`);

    ws.addEventListener("open", () => {
      reconnectDelay = 1000;
      setStatus("online", "Online");
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.placeholder = "Type a message…";
      inputEl.focus();

      const username = promptForUsername();
      ws.send(JSON.stringify({ type: "join", username }));
    });

    ws.addEventListener("message", (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "history":
          clearMessages();
          for (const m of msg.messages) appendMessage(m);
          break;
        case "message":
        case "system":
          appendMessage(msg);
          break;
        case "presence":
          renderPresence(msg.users);
          break;
      }
    });

    ws.addEventListener("close", () => {
      setStatus("", "Disconnected");
      inputEl.disabled = true;
      sendBtn.disabled = true;
      inputEl.placeholder = "Reconnecting…";
      scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      try { ws && ws.close(); } catch {}
    });
  }

  function scheduleReconnect() {
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    setStatus("connecting", `Reconnecting in ${Math.round(delay / 1000)}s…`);
    setTimeout(connect, delay);
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({ type: "message", text }));
    inputEl.value = "";
    inputEl.focus();
  });

  // Kick things off
  connect();
})();