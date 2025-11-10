import { WS, WebSocketEvent } from "@orderly.network/net";
import { useSettingsStore } from "@/store/settingsStore";

/**
 * WebSocket connection status type
 */
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Callback function type for WebSocket messages
 */
type MessageCallback = (data: any) => void;

/**
 * Unsubscribe function type
 */
type UnsubscribeFn = () => void;

/**
 * WebSocketManager - Singleton class to manage WebSocket connections and topic subscriptions
 * Uses a single WS connection from SettingsStore's webSocketBaseURL
 */
class WebSocketManager {
  private static instance: WebSocketManager | null = null;

  /**
   * Single WS instance (shared across all subscriptions)
   */
  private ws: WS | null = null;

  /**
   * Current connection status
   */
  private connectionStatus: ConnectionStatus = "disconnected";

  /**
   * Map of topic to node subscriptions
   * Structure: Map<topic, Map<nodeId, {callback, unsubscribeFn}>>
   */
  private subscriptions: Map<
    string,
    Map<string, { callback: MessageCallback; unsubscribeFn: UnsubscribeFn }>
  > = new Map();

  /**
   * Map of topic to WS unsubscribe functions (one per topic)
   */
  private wsSubscriptions: Map<string, UnsubscribeFn> = new Map();

  /**
   * Map of nodeId to topic for quick lookup
   */
  private nodeSubscriptions: Map<string, string> = new Map();

  /**
   * Map of nodeId to status change callback for cleanup
   */
  private nodeStatusCallbacks: Map<string, (status: ConnectionStatus) => void> =
    new Map();

  /**
   * Current WebSocket base URL from settings
   */
  private currentBaseUrl: string = "";

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Get or create WS connection using webSocketBaseURL from SettingsStore
   */
  private getOrCreateConnection(): WS {
    const settings = useSettingsStore.getState().settings;
    const baseUrl = settings.webSocketBaseURL;

    // If URL changed or connection doesn't exist, create new connection
    if (!this.ws || this.currentBaseUrl !== baseUrl) {
      // Close existing connection if URL changed
      if (this.ws && this.currentBaseUrl !== baseUrl) {
        this.ws.close();
      }

      // Create WS options
      // Using @orderly.network/net WS implementation
      this.ws = new WS({
        publicUrl: baseUrl,
        privateUrl: baseUrl,
      });
      this.currentBaseUrl = baseUrl;

      // Listen to status changes
      this.ws.on("status:change", (status: any) => {
        this.handleStatusChange(status);
      });

      this.connectionStatus = "disconnected";
    }

    return this.ws;
  }

  /**
   * Handle WebSocket status change events
   */
  private handleStatusChange(statusEvent: any): void {
    let status: ConnectionStatus = "disconnected";

    switch (statusEvent.type) {
      case WebSocketEvent.OPEN:
        status = "connected";
        break;
      case WebSocketEvent.CONNECTING:
      case WebSocketEvent.RECONNECTING:
        status = "connecting";
        break;
      case WebSocketEvent.ERROR:
        status = "error";
        break;
      case WebSocketEvent.CLOSE:
        status = "disconnected";
        break;
    }

    this.connectionStatus = status;

    // Notify all status callbacks
    this.nodeStatusCallbacks.forEach((callback) => callback(status));
  }

  /**
   * Subscribe to a topic for a specific node
   * Uses webSocketBaseURL from SettingsStore automatically
   * @param topic - Topic to subscribe to
   * @param nodeId - Node ID that is subscribing
   * @param onMessage - Callback function when message is received
   * @param onStatusChange - Optional callback for connection status changes
   * @returns Unsubscribe function
   */
  subscribe(
    topic: string,
    nodeId: string,
    onMessage: MessageCallback,
    onStatusChange?: (status: ConnectionStatus) => void
  ): UnsubscribeFn {
    // Store node subscription info
    this.nodeSubscriptions.set(nodeId, topic);

    // Register status callback if provided (store per node for cleanup)
    if (onStatusChange) {
      this.nodeStatusCallbacks.set(nodeId, onStatusChange);
      // Immediately call with current status
      onStatusChange(this.connectionStatus);
    }

    // Get or create WS connection
    const ws = this.getOrCreateConnection();

    // Initialize topic subscriptions if needed
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Map());
    }
    const topicSubscriptions = this.subscriptions.get(topic)!;

    // Check if this node already has a subscription
    const existingSubscription = topicSubscriptions.get(nodeId);
    if (existingSubscription) {
      // Already subscribed, return existing unsubscribe function
      return () => {
        this.unsubscribe(topic, nodeId);
      };
    }

    // Check if this is the first subscription for this topic
    const isFirstSubscription = topicSubscriptions.size === 0;

    // If this is the first subscription, create WS subscription
    if (isFirstSubscription) {
      const wsUnsubscribeFn = ws.subscribe(
        {
          event: "subscribe",
          topic: topic,
        },
        {
          onMessage: (message: any) => {
            // Call all callbacks for this topic
            const currentTopicSubscriptions = this.subscriptions.get(topic);
            if (currentTopicSubscriptions) {
              currentTopicSubscriptions.forEach(({ callback }) => {
                callback(message);
              });
            }
          },
          onError: () => {
            /** Intentionally left blank; upstream layers handle error reporting to avoid noisy console output. */
          },
          onClose: () => {
            /** Intentionally left blank; upstream layers handle lifecycle awareness without console logging. */
          },
          onUnsubscribe: () => ({
            event: "unsubscribe",
            topic: topic,
          }),
        }
      );

      if (!wsUnsubscribeFn) {
        throw new Error(`Failed to subscribe to topic ${topic}`);
      }

      this.wsSubscriptions.set(topic, wsUnsubscribeFn);
    }

    // Store node subscription with callback
    const nodeUnsubscribeFn = () => {
      // Remove node from topic subscriptions
      topicSubscriptions.delete(nodeId);

      // Clean up node subscription info and status callback
      this.nodeSubscriptions.delete(nodeId);
      this.nodeStatusCallbacks.delete(nodeId);

      // If no more subscriptions for this topic, unsubscribe from WS
      if (topicSubscriptions.size === 0) {
        const wsUnsubscribeFn = this.wsSubscriptions.get(topic);
        if (wsUnsubscribeFn) {
          wsUnsubscribeFn();
          this.wsSubscriptions.delete(topic);
        }
        this.subscriptions.delete(topic);
      }
    };

    topicSubscriptions.set(nodeId, {
      callback: onMessage,
      unsubscribeFn: nodeUnsubscribeFn,
    });

    return () => {
      this.unsubscribe(topic, nodeId);
    };
  }

  /**
   * Unsubscribe from a topic for a specific node
   */
  unsubscribe(topic: string, nodeId: string): void {
    const topicSubscriptions = this.subscriptions.get(topic);

    // If topic subscriptions exist, remove the node's subscription
    if (topicSubscriptions) {
      const subscription = topicSubscriptions.get(nodeId);
      if (subscription) {
        subscription.unsubscribeFn();
        // The nodeUnsubscribeFn already handles all cleanup including:
        // - Removing node from topicSubscriptions
        // - Cleaning up nodeSubscriptions and nodeStatusCallbacks
        // - Unsubscribing from WS if this was the last subscription
        return;
      }
    }

    // If we get here, the subscription wasn't found, but we should still clean up
    this.nodeSubscriptions.delete(nodeId);
    this.nodeStatusCallbacks.delete(nodeId);
  }

  /**
   * Remove all subscriptions for a node
   */
  removeNode(nodeId: string): void {
    const topic = this.nodeSubscriptions.get(nodeId);
    if (!topic) {
      return;
    }

    this.unsubscribe(topic, nodeId);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Close connection and clean up (for cleanup)
   */
  closeAll(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionStatus = "disconnected";
    this.subscriptions.clear();
    this.wsSubscriptions.clear();
    this.nodeSubscriptions.clear();
    this.nodeStatusCallbacks.clear();
    this.currentBaseUrl = "";
  }
}

/**
 * Export singleton instance
 */
export const websocketManager = WebSocketManager.getInstance();
