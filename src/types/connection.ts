import { StreamChat, User } from "stream-chat";

export interface ConnectionConfig {
  apiKey: string;
  user: User;
  tokenOrProvider: string | (() => Promise<string>);
  options?: {
    timeout?: number;
    baseURL?: string;
    logger?: (
      logLevel: string,
      message: string,
      extraData?: Record<string, unknown>,
    ) => void;
  };
}

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  client: StreamChat | null;
  user: User | null;
  error: Error | null;
  connectionId?: string;
}

export interface TokenProvider {
  (): Promise<string>;
}

export interface ConnectionEventHandlers {
  onConnectionChanged?: (isConnected: boolean) => void;
  onUserUpdated?: (user: User) => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}
