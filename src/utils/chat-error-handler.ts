/**
 * Chat error handling utilities
 * Stream Chat focused, data-first, zero guesswork
 */

export interface ChatErrorHandlerConfig {
  onRefresh: () => void;
  onLoginRedirect: () => void;
  transformErrorMessage?: (error: string) => string;
}

export interface ChatErrorInfo {
  isRecoverable: boolean;
  requiresLogin: boolean;
  message: string;
  originalError: string;
  action: "refresh" | "login" | "retry" | "contact_support";
}

function get(obj: unknown, ...keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function normalizeError(error: unknown) {
  const message =
    typeof error === "string"
      ? error
      : (get(error, "message") as string) ||
        (get(error, "error", "message") as string) ||
        (get(error, "data", "message") as string) ||
        (get(error, "response", "data", "message") as string) ||
        String(error);

  return {
    message,
    lower: message.toLowerCase(),
    statusCode:
      (get(error, "StatusCode") as number) ??
      (get(error, "status") as number) ??
      (get(error, "response", "status") as number) ??
      null,
    code:
      (get(error, "code") as number) ??
      (get(error, "response", "data", "code") as number) ??
      null,
    raw: error,
  };
}

export function analyzeChatError(error: unknown): ChatErrorInfo {
  const { message, lower, statusCode, code } = normalizeError(error);

  if (process.env.NODE_ENV === "development") {
    console.debug("[analyzeChatError]", { statusCode, code, message });
  }

  if (
    lower.includes("api_key not valid") ||
    lower.includes("api key not valid") ||
    (statusCode === 401 && lower.includes("api")) ||
    (code === 2 && lower.includes("api_key"))
  ) {
    return {
      isRecoverable: false,
      requiresLogin: false,
      message: "Chat service configuration error. Please contact support.",
      originalError: message,
      action: "contact_support",
    };
  }

  if (statusCode === 403 || code === 17) {
    return {
      isRecoverable: false,
      requiresLogin: false,
      message: "You do not have permission to access this channel.",
      originalError: message,
      action: "contact_support",
    };
  }

  if (
    lower.includes("token") &&
    (lower.includes("expired") || lower.includes("invalid"))
  ) {
    return {
      isRecoverable: false,
      requiresLogin: true,
      message: "Your session has expired. Please sign in again.",
      originalError: message,
      action: "login",
    };
  }

  if (lower.includes("jwt") && lower.includes("signature")) {
    return {
      isRecoverable: true,
      requiresLogin: false,
      message: "Chat authentication failed. Please refresh the page.",
      originalError: message,
      action: "refresh",
    };
  }

  if (statusCode === 401 || lower.includes("unauthorized")) {
    return {
      isRecoverable: false,
      requiresLogin: true,
      message: "Authentication required. Please sign in again.",
      originalError: message,
      action: "login",
    };
  }

  if (
    lower.includes("user not found") ||
    (lower.includes("don't exist") && lower.includes("user"))
  ) {
    return {
      isRecoverable: false,
      requiresLogin: false,
      message:
        "Chat user setup is incomplete. Please contact your administrator.",
      originalError: message,
      action: "contact_support",
    };
  }

  if (
    code === 4 &&
    (lower.includes("specify at least 2 members") ||
      lower.includes("member based ids") ||
      lower.includes("getorcreatechannel failed"))
  ) {
    return {
      isRecoverable: true,
      requiresLogin: false,
      message: "At least 2 members are required to create a channel.",
      originalError: message,
      action: "retry",
    };
  }

  if (code === 4) {
    return {
      isRecoverable: false,
      requiresLogin: false,
      message:
        "Chat user or channel setup is incomplete. Please contact support.",
      originalError: message,
      action: "contact_support",
    };
  }

  if (
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("connection") ||
    lower.includes("websocket")
  ) {
    return {
      isRecoverable: true,
      requiresLogin: false,
      message: "Connection issue. Please try again.",
      originalError: message,
      action: "retry",
    };
  }

  if (statusCode === 429 || lower.includes("rate limit")) {
    return {
      isRecoverable: false,
      requiresLogin: false,
      message: "Too many requests. Please wait and try again.",
      originalError: message,
      action: "contact_support",
    };
  }

  if (lower.includes("stream chat") || lower.includes("stream-chat")) {
    return {
      isRecoverable: false,
      requiresLogin: false,
      message: "Chat service error. Please contact support.",
      originalError: message,
      action: "contact_support",
    };
  }

  return {
    isRecoverable: true,
    requiresLogin: false,
    message: "Chat connection failed. Please try again.",
    originalError: message,
    action: "retry",
  };
}

export function createChatErrorHandler(config: ChatErrorHandlerConfig) {
  return {
    handleError: (error: unknown) => {
      const info = analyzeChatError(error);
      if (config.transformErrorMessage) {
        info.message = config.transformErrorMessage(info.message);
      }
      console.error("[ChatErrorHandler]", info);
      return info;
    },
    executeAction: (info: ChatErrorInfo) => {
      switch (info.action) {
        case "login":
          config.onLoginRedirect();
          break;
        case "refresh":
          config.onRefresh();
          break;
        case "retry":
          break;
        case "contact_support":
          console.warn(
            "[ChatErrorHandler] Support required:",
            info.originalError,
          );
          break;
      }
    },
    analyzeError: analyzeChatError,
  };
}
