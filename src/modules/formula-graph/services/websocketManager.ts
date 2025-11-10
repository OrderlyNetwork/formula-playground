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
    console.log(`[WebSocketManager] subscribe() called - topic: ${topic}, nodeId: ${nodeId}`);
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
          onError: (error: any) => {
            console.error(`WebSocket error for topic ${topic}:`, error);
          },
          onClose: (event: any) => {
            console.log(`WebSocket closed for topic ${topic}:`, event);
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
      console.log(`[WebSocketManager] nodeUnsubscribeFn() called - topic: ${topic}, nodeId: ${nodeId}`);
      console.log(`[WebSocketManager] Before cleanup - topicSubscriptions.size: ${topicSubscriptions.size}`);
      console.log(`[WebSocketManager] Before cleanup - wsSubscriptions.size: ${this.wsSubscriptions.size}`);
      console.log(`[WebSocketManager] Before cleanup - nodeSubscriptions.size: ${this.nodeSubscriptions.size}`);
      console.log(`[WebSocketManager] Before cleanup - nodeStatusCallbacks.size: ${this.nodeStatusCallbacks.size}`);

      // Remove node from topic subscriptions
      topicSubscriptions.delete(nodeId);

      // Clean up node subscription info and status callback
      this.nodeSubscriptions.delete(nodeId);
      this.nodeStatusCallbacks.delete(nodeId);

      // If no more subscriptions for this topic, unsubscribe from WS
      if (topicSubscriptions.size === 0) {
        console.log(`[WebSocketManager] No more subscriptions for topic: ${topic}, unsubscribing from WS`);
        const wsUnsubscribeFn = this.wsSubscriptions.get(topic);
        if (wsUnsubscribeFn) {
          console.log(`[WebSocketManager] Calling wsUnsubscribeFn for topic: ${topic}`);
          wsUnsubscribeFn();
          this.wsSubscriptions.delete(topic);
          console.log(`[WebSocketManager] WS unsubscribed and removed from wsSubscriptions`);
        }
        this.subscriptions.delete(topic);
        console.log(`[WebSocketManager] Topic removed from subscriptions`);
      }

      console.log(`[WebSocketManager] After cleanup - topicSubscriptions.size: ${topicSubscriptions.size}`);
      console.log(`[WebSocketManager] After cleanup - wsSubscriptions.size: ${this.wsSubscriptions.size}`);
      console.log(`[WebSocketManager] After cleanup - nodeSubscriptions.size: ${this.nodeSubscriptions.size}`);
      console.log(`[WebSocketManager] After cleanup - nodeStatusCallbacks.size: ${this.nodeStatusCallbacks.size}`);
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
    console.log(`[WebSocketManager] unsubscribe() called - topic: ${topic}, nodeId: ${nodeId}`);
    console.log(`[WebSocketManager] Current subscriptions:`, Array.from(this.subscriptions.keys()));
    console.log(`[WebSocketManager] Current nodeSubscriptions:`, Array.from(this.nodeSubscriptions.entries()));

    const topicSubscriptions = this.subscriptions.get(topic);

    // If topic subscriptions exist, remove the node's subscription
    if (topicSubscriptions) {
      console.log(`[WebSocketManager] Found topicSubscriptions for topic: ${topic}, size: ${topicSubscriptions.size}`);
      console.log(`[WebSocketManager] Nodes in topic:`, Array.from(topicSubscriptions.keys()));

      const subscription = topicSubscriptions.get(nodeId);
      if (subscription) {
        console.log(`[WebSocketManager] Found subscription for nodeId: ${nodeId}, calling unsubscribeFn`);
        subscription.unsubscribeFn();
        // The nodeUnsubscribeFn already handles all cleanup including:
        // - Removing node from topicSubscriptions
        // - Cleaning up nodeSubscriptions and nodeStatusCallbacks
        // - Unsubscribing from WS if this was the last subscription
        console.log(`[WebSocketManager] unsubscribeFn completed`);
        return;
      } else {
        console.log(`[WebSocketManager] No subscription found for nodeId: ${nodeId} in topic: ${topic}`);
      }
    } else {
      console.log(`[WebSocketManager] No topicSubscriptions found for topic: ${topic}`);
    }

    // If we get here, the subscription wasn't found, but we should still clean up
    console.log(`[WebSocketManager] Performing fallback cleanup for nodeId: ${nodeId}`);
    this.nodeSubscriptions.delete(nodeId);
    this.nodeStatusCallbacks.delete(nodeId);
    console.log(`[WebSocketManager] Fallback cleanup completed`);
  }

  /**
   * Remove all subscriptions for a node
   */
  removeNode(nodeId: string): void {
    console.log(`[WebSocketManager] removeNode() called - nodeId: ${nodeId}`);
    console.log(`[WebSocketManager] Current nodeSubscriptions before remove:`, Array.from(this.nodeSubscriptions.entries()));

    const topic = this.nodeSubscriptions.get(nodeId);
    if (!topic) {
      console.log(`[WebSocketManager] No topic found for nodeId: ${nodeId}, nothing to remove`);
      return;
    }

    console.log(`[WebSocketManager] Found topic: ${topic} for nodeId: ${nodeId}, calling unsubscribe`);
    this.unsubscribe(topic, nodeId);
    console.log(`[WebSocketManager] removeNode completed for nodeId: ${nodeId}`);
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
