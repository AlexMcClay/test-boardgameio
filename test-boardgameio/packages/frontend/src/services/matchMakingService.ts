type MessageHandler = (data: WebSocketMessage) => void;

import type { WebSocketMessage } from "@project/shared/";

const RECONNECT_DEBOUNCE_MS = 1500;
// 1. Determine the protocol (secure vs insecure)
const isSecure = window.location.protocol === "https:";
const protocol = isSecure ? "wss:" : "ws:";

// 2. Clean up the hostname (remove 'www.')
const cleanHostname = window.location.hostname.replace(/^www\./, "");

// 3. Handle environment-specific logic (Dev vs Production)
const isDev = import.meta.env.DEV;
const subdomain = isDev ? "" : "api.";
const port = isDev ? ":8000" : "";

// 4. Assemble the final URL cleanly
const DEFAULT_WS_URL = `${protocol}//${subdomain}${cleanHostname}${port}/matchmaking-ws`;

class MatchmakingWebSocketService {
  private socket: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private openHandlers = new Set<() => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect() {
    // An explicit connect request always re-arms the connection, even after a
    // disconnect() (e.g. PlayScreen unmounting into the game view).
    this.shouldReconnect = true;
    if (this.socket) return;

    const wsUrl = import.meta.env.VITE_BACKEND_WS_URL?.trim() || DEFAULT_WS_URL;
    this.socket = new WebSocket(wsUrl);
    this.socket.onopen = () => {
      console.log("Connected");
      const playerID = localStorage.getItem("user_id") || "";
      const playerUsername = localStorage.getItem("user_name") || "Guest";
      console.log(
        "Sending connect message with playerID:",
        playerID,
        "and playerUsername:",
        playerUsername,
      );
      this.send({
        type: "connect",
        playerID,
        playerUsername,
      });
      // Notify listeners (e.g. an active game re-sending game_join after a
      // reconnect) that a fresh socket is open.
      this.openHandlers.forEach((handler) => handler());
    };

    this.socket.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);

      this.handlers.forEach((handler) => {
        handler(data);
      });
    };

    this.socket.onclose = () => {
      console.log("Disconnected");

      this.socket = null;

      if (!this.shouldReconnect) return;

      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;

    // Debounce repeated reconnect triggers into a single reconnect attempt.
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DEBOUNCE_MS);
  }

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  reconnect() {
    this.shouldReconnect = true;
    this.scheduleReconnect();
  }

  send(message: WebSocketMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn(
        `WS not open; dropped outgoing "${message.type}" message`,
      );
    }
  }

  isConnected() {
    return !!this.socket;
  }

  /** True only when the socket is fully open and can send. */
  isOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }

  /** Fires whenever a (re)connected socket finishes opening. */
  subscribeOpen(handler: () => void) {
    this.openHandlers.add(handler);

    return () => {
      this.openHandlers.delete(handler);
    };
  }
}

export const matchmakingWebSocketService = new MatchmakingWebSocketService();
