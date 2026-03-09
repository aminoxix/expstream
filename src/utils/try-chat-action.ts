import { toast } from "sonner";
import { t } from "try";
import { analyzeChatError, type ChatErrorInfo } from "./chat-error-handler";

export async function tryChatAction<T>(
  fn: () => Promise<T>,
  options?: {
    silent?: boolean;
    onError?: (info: ChatErrorInfo) => void;
  },
): Promise<[true, null, T] | [false, ChatErrorInfo, null]> {
  const [ok, error, value] = await t(fn);

  if (!ok) {
    const errorInfo = analyzeChatError(error);
    if (!options?.silent) toast.error(errorInfo.message);
    options?.onError?.(errorInfo);
    return [false, errorInfo, null];
  }

  return [true, null, value];
}
