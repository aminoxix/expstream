import { useCallback, useState } from "react";
import type {
  LocalMessage,
  Message,
  SendMessageOptions,
  Channel as StreamChannel,
} from "stream-chat";

export interface MessageSubmissionParams {
  cid: string;
  localMessage: LocalMessage;
  message: Message;
  sendOptions: SendMessageOptions;
}

export interface UseMessageHandlerConfig {
  channel: StreamChannel | undefined;
  onError?: (error: Error) => void;
  onSuccess?: (message: Message) => void;
}

export interface UseMessageHandlerReturn {
  submitMessage: (params: MessageSubmissionParams) => Promise<void>;
  isSubmitting: boolean;
}

export function useMessageHandler({
  channel,
  onError,
  onSuccess,
}: UseMessageHandlerConfig): UseMessageHandlerReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitMessage = useCallback(
    async (params: MessageSubmissionParams) => {
      setIsSubmitting(true);
      try {
        if (!channel) {
          throw new Error("No active channel selected");
        }

        const sentMessage = await channel.sendMessage(
          {
            text: params.localMessage.text,
            user_id: params.localMessage.user_id,
          },
          params.sendOptions,
        );

        onSuccess?.(sentMessage.message as Message);
      } catch (error: unknown) {
        const errorInstance =
          error instanceof Error ? error : new Error("Unknown error occurred");

        onError?.(errorInstance);
        throw errorInstance;
      } finally {
        setIsSubmitting(false);
      }
    },
    [channel, onError, onSuccess],
  );

  return {
    submitMessage,
    isSubmitting,
  };
}
