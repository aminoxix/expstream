"use client";

import type { StreamChat, User as StreamUser } from "stream-chat";
import { analyzeChatError } from "./chat-error-handler";

export interface StreamChatState {
  connectionState: "idle" | "connecting" | "connected" | "error";
  currentUser: StreamUser | null;
  error: string | null;
  isTokenExpired: boolean;
}

export interface StreamChatUser {
  id: string;
  name?: string;
  image?: string;
  email?: string;
}

export type TokenProvider = () => Promise<string>;
export type StateCallback = (state: StreamChatState) => void;
export type UnsubscribeFn = () => void;

export class StreamChatManager {
  private static instance: StreamChatManager | null = null;
  private client: StreamChat | null = null;
  private state: StreamChatState = {
    connectionState: "idle",
    currentUser: null,
    error: null,
    isTokenExpired: false,
  };

  private subscribers = new Set<StateCallback>();
  private connectPromise: Promise<void> | null = null;
  private disconnectPromise: Promise<void> | null = null;
  private pendingUserId: string | null = null;

  private constructor() {}

  static getInstance(): StreamChatManager {
    if (!StreamChatManager.instance) {
      StreamChatManager.instance = new StreamChatManager();
    }
    return StreamChatManager.instance;
  }

  static reset(): void {
    if (StreamChatManager.instance) {
      StreamChatManager.instance.disconnect().catch(console.warn);
      StreamChatManager.instance = null;
    }
  }

  getClient(): StreamChat {
    if (!this.client) {
      const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Stream API key not found. Please set NEXT_PUBLIC_STREAM_API_KEY",
        );
      }

      const { StreamChat } = require("stream-chat");
      this.client = new StreamChat(apiKey);
      this.setupClientListeners();
    }
    return this.client!;
  }

  getState(): StreamChatState {
    return { ...this.state };
  }

  subscribe(callback: StateCallback): UnsubscribeFn {
    this.subscribers.add(callback);
    callback(this.getState());

    return () => {
      this.subscribers.delete(callback);
    };
  }

  async connect(
    user: StreamChatUser,
    tokenProvider: TokenProvider,
  ): Promise<void> {
    if (this.disconnectPromise) {
      await this.disconnectPromise;
    }

    if (
      this.state.connectionState === "connected" &&
      this.state.currentUser?.id === user.id
    ) {
      return;
    }

    if (
      this.connectPromise &&
      (this.state.currentUser?.id === user.id || this.pendingUserId === user.id)
    ) {
      return this.connectPromise;
    }

    if (this.state.currentUser && this.state.currentUser.id !== user.id) {
      await this.disconnect();
    }

    if (
      this.connectPromise &&
      (this.state.currentUser?.id === user.id || this.pendingUserId === user.id)
    ) {
      return this.connectPromise;
    }

    this.pendingUserId = user.id;
    this.connectPromise = this.performConnection(user, tokenProvider);
    return this.connectPromise;
  }

  async disconnect(): Promise<void> {
    const doDisconnect = async () => {
      try {
        if (this.client?.userID) {
          await this.client.disconnectUser();
        }

        this.updateState({
          connectionState: "idle",
          currentUser: null,
          error: null,
          isTokenExpired: false,
        });
      } catch (error: unknown) {
        console.warn("[StreamChatManager] Disconnect error:", error);
      } finally {
        this.connectPromise = null;
        this.pendingUserId = null;
        this.disconnectPromise = null;
      }
    };

    this.disconnectPromise = doDisconnect();
    return this.disconnectPromise;
  }

  async switchUser(
    user: StreamChatUser,
    tokenProvider: TokenProvider,
  ): Promise<void> {
    await this.disconnect();
    await this.connect(user, tokenProvider);
  }

  isConnected(): boolean {
    return this.state.connectionState === "connected";
  }

  isConnecting(): boolean {
    return this.state.connectionState === "connecting";
  }

  getCurrentUser(): StreamUser | null {
    return this.state.currentUser;
  }

  async retry(
    user: StreamChatUser,
    tokenProvider: TokenProvider,
  ): Promise<void> {
    this.updateState({ error: null, isTokenExpired: false });
    await this.connect(user, tokenProvider);
  }

  private async performConnection(
    user: StreamChatUser,
    tokenProvider: TokenProvider,
  ): Promise<void> {
    try {
      this.updateState({
        connectionState: "connecting",
        error: null,
        isTokenExpired: false,
      });

      const client = this.getClient();

      const streamUser: StreamChatUser = {
        id: user.id,
        name: user.name,
        image: user.image,
        email: user.email,
      };

      if (client.userID === user.id) {
        // Already connected as this user on the client level
      } else {
        if (client.userID) {
          await client.disconnectUser();
        }
        await client.connectUser(streamUser, tokenProvider);
      }

      this.updateState({
        connectionState: "connected",
        currentUser: streamUser,
        error: null,
      });
    } catch (error: unknown) {
      console.error("[StreamChatManager] Connection failed:", error);

      const errorInfo = analyzeChatError(error);

      this.updateState({
        connectionState: "error",
        error: errorInfo.message,
        isTokenExpired: errorInfo.requiresLogin,
      });

      throw error;
    } finally {
      this.connectPromise = null;
      this.pendingUserId = null;
    }
  }

  private setupClientListeners(): void {
    if (!this.client) return;

    this.client.on("connection.changed", (event) => {
      if (event.online) {
        this.updateState({ connectionState: "connected", error: null });
      } else {
        this.updateState({
          connectionState: "error",
          error: "Connection lost",
        });
      }
    });

    this.client.on("connection.recovered", () => {
      this.updateState({ connectionState: "connected", error: null });
    });

    this.client.on("token.refresh", () => {
      this.updateState({ isTokenExpired: false });
    });
  }

  private updateState(updates: Partial<StreamChatState>): void {
    this.state = { ...this.state, ...updates };

    this.subscribers.forEach((callback) => {
      try {
        callback(this.getState());
      } catch (error: unknown) {
        console.error("[StreamChatManager] Subscriber error:", error);
      }
    });
  }
}

export const streamChatManager = StreamChatManager.getInstance();
