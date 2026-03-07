import { LocalMessage as BaseLocalMessage } from "stream-chat";

// Create an extended type that includes our custom properties
export type ExtendedLocalMessage = BaseLocalMessage & {
  event_type?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  poll_id?: string;
  title?: string;
  description?: string;
  event_id?: string;
};

// Export both the base and extended types
export type { LocalMessage as BaseLocalMessage } from "stream-chat";
export type LocalMessage = ExtendedLocalMessage;
