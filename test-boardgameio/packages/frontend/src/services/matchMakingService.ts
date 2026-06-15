type MessageHandler = (data: WebSocketMessage) => void;

import type { WebSocketMessage } from "@project/shared/";

const RECONNECT_DEBOUNCE_MS = 1500;

class MatchmakingWebSocketService {
  private socket: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect() {
    if (this.socket || !this.shouldReconnect) return;

    this.socket = new WebSocket("ws://localhost:8000/matchmaking-ws");

    this.socket.onopen = () => {
      console.log("Connected");
      this.send({ type: "connect", playerID: localStorage.getItem("user_id") || '' });
    };

    this.socket.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);

      this.handlers.forEach(handler => {
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
    this.socket?.send(JSON.stringify(message));
  }

  isConnected() {
    return !!this.socket;
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const matchmakingWebSocketService = new MatchmakingWebSocketService();