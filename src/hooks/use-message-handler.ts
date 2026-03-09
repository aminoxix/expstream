import { useCallback, useState } from "react";
import type {
  LocalMessage,
  Message,
  SendMessageOptions,
  Channel as StreamChannel,
} from "stream-chat";
import { t } from "try";

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

      if (!channel) {
        const err = new Error("No active channel selected");
        onError?.(err);
        setIsSubmitting(false);
        throw err;
      }

      const [ok, error, sentMessage] = await t(() =>
        channel.sendMessage(
          {
            text: params.localMessage.text,
            user_id: params.localMessage.user_id,
          },
          params.sendOptions,
        ),
      );

      setIsSubmitting(false);

      if (!ok) {
        const errorInstance =
          error instanceof Error ? error : new Error("Unknown error occurred");
        onError?.(errorInstance);
        throw errorInstance;
      }

      onSuccess?.(sentMessage.message as Message);
    },
    [channel, onError, onSuccess],
  );

  return {
    submitMessage,
    isSubmitting,
  };
}
