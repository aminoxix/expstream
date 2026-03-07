import { StreamUser } from "@/types/users";
import { Channel } from "stream-chat";

export const durationOptions = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
  { label: "3 hours", value: 180 },
  { label: "6 hours", value: 360 },
  { label: "8 hours", value: 480 },
];

export function getDurationLabel(
  startISO?: string,
  endISO?: string,
): string | null {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const diffMinutes = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60),
  );
  const match = durationOptions.find((opt) => opt.value === diffMinutes);
  if (match) return match.label;
  if (diffMinutes % 60 === 0) {
    const hours = diffMinutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours > 0)
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minutes`;
  return `${diffMinutes} minutes`;
}

export const getDisplayName = (user?: StreamUser) =>
  user?.display || user?.name || user?.id;

export const getChannelDisplayName = (channel: Channel) => {
  const data = channel?.data as Record<string, unknown> | undefined;
  return (data?.display as string) || channel?.data?.name || channel?.data?.id;
};
