/**
 * WebSocket client service.
 * Manages connection to the PC server over WiFi hotspot.
 */

import { ClientCommand, ServerResponse } from "./protocol";

type MessageHandler = (response: ServerResponse) => void;
type ConnectionHandler = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = "";
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay: number = 1000;
  private maxReconnectDelay: number = 10000;
  private shouldReconnect: boolean = false;

  /**
   * Connect to the PC server.
   */
  connect(ip: string, port: number = 8765): void {
    this.url = `ws://${ip}:${port}`;
    this.shouldReconnect = true;
    this.reconnectDelay = 1000;
    this._connect();
  }

  private _connect(): void {
    if (this.ws) {
      this.ws.onclose = null; // Prevent onclose from triggering _scheduleReconnect
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try { this.ws.close(); } catch {}
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WS] Connected to", this.url);
      this.reconnectDelay = 1000;
      this.connectionHandlers.forEach((h) => h(true));
    };

    this.ws.onclose = () => {
      console.log("[WS] Disconnected");
      this.connectionHandlers.forEach((h) => h(false));
      if (this.shouldReconnect) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WS] Error:", error);
    };

    this.ws.onmessage = (event) => {
      try {
        const data: ServerResponse = JSON.parse(event.data);
        this.messageHandlers.forEach((handler) => handler(data));
      } catch (e) {
        console.error("[WS] Parse error:", e);
      }
    };
  }

  /** Disconnect from the server. */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
  }

  /** Send a command to the PC server. */
  send(command: ClientCommand): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command));
    } else {
      console.warn("[WS] Not connected, cannot send:", command.type);
    }
  }

  /** Register a handler for incoming server messages. */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /** Register a handler for connection state changes. */
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /** Check if connected. */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /** Auto-reconnect with exponential backoff. */
  private _scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._connect();
      // Exponential backoff, cap at max
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }
}

// Singleton instance
export const wsService = new WebSocketService();
