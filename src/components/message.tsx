// src/components/TeamMessage.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceController } from "@/context/workspace-controller";
import {
  ArrowBendDoubleUpLeftIcon,
  ArrowBendUpLeftIcon,
  CheckIcon,
  ChecksIcon,
  ClockIcon,
  DotsThreeOutlineVerticalIcon,
  SmileyIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import React, { ComponentRef, useMemo, useRef } from "react";
import type { LocalMessage, Attachment as StreamAttachment } from "stream-chat";
import {
  renderText as defaultRenderText,
  DialogAnchor,
  EditMessageForm,
  isOnlyEmojis,
  MESSAGE_ACTIONS,
  MessageActions,
  MessageDeleted,
  MessageErrorIcon,
  MessageInput,
  MessageRepliesCountButton,
  MessageStatusProps,
  MessageTimestamp,
  PinIcon,
  Poll,
  QuotedMessage,
  ReactionSelector,
  ReactionsList,
  useChannelStateContext,
  useChatContext,
  useDialog,
  useDialogIsOpen,
  useMessageContext,
  useTranslationContext,
} from "stream-chat-react";
import { Card, CardContent } from "./ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const CustomAttachment = ({
  attachments,
  actionHandler,
}: {
  attachments: StreamAttachment[];
  actionHandler?: (
    name: string,
    value: string,
    event: React.BaseSyntheticEvent
  ) => void | Promise<void>;
}) => {
  console.log("[TeamMessage] Rendering attachments:", attachments);
  return (
    <div className="flex flex-col gap-2">
      {attachments.map((attachment, index) => {
        if (attachment.og_scrape_url) {
          return (
            <div key={index} className="max-w-[300px]">
              <Card>
                <CardContent>
                  <Link
                    href={attachment.title_link || ""}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline block truncate"
                    style={{ maxWidth: "300px" }}
                    aria-label={`Link: ${
                      attachment.title || attachment.og_scrape_url
                    }`}
                  >
                    {attachment.image_url && (
                      <img
                        src={attachment.image_url}
                        alt={attachment.title || "Link preview"}
                        className="object-cover w-full h-[100px] rounded-lg mt-1"
                        aria-label={`Link preview image: ${
                          attachment.title || "Link"
                        }`}
                      />
                    )}
                    <p>{attachment.author_name}</p>
                    <p className="font-semibold">{attachment.title}</p>
                    <p className="truncate">{attachment.text}</p>
                  </Link>
                </CardContent>
              </Card>
            </div>
          );
        } else if (attachment.type === "image") {
          return (
            <div
              key={index}
              className="relative w-full max-w-[300px] h-[200px]"
            >
              <img
                src={attachment.image_url || attachment.thumb_url}
                alt={attachment.title || "Attachment"}
                className="object-contain w-full h-full rounded-lg"
                style={{ maxWidth: "300px", maxHeight: "200px" }}
                aria-label={`Image attachment: ${attachment.title || "Image"}`}
              />
            </div>
          );
        } else if (attachment.type === "file") {
          return (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg max-w-[300px]"
            >
              <a
                href={attachment.asset_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline truncate"
                style={{ maxWidth: "250px" }}
                aria-label={`File attachment: ${attachment.title || "File"}`}
              >
                {attachment.title || "File"}
              </a>
              {actionHandler && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) =>
                    actionHandler("download", attachment.asset_url ?? "", e)
                  }
                  aria-label={`Download ${attachment.title || "file"}`}
                >
                  Download
                </Button>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

export const TeamMessage = () => {
  const {
    clearEditingState,
    editing,
    getMessageActions,
    groupStyles,
    handleAction,
    handleOpenThread: handleOpenThreadContext,
    handleRetry,
    initialMessage,
    message,
    onMentionsClickMessage,
    onMentionsHoverMessage,
    onUserClick,
    threadList,
  } = useMessageContext("MessageTeam");
  const { t, userLanguage } = useTranslationContext("MessageTeam");
  const { client } = useChatContext();
  const { closePinnedMessageListOpen } = useWorkspaceController();
  const buttonRef = useRef<ComponentRef<"button">>(null);
  const poll = message.poll_id && client.polls.fromState(message.poll_id);
  const reactionSelectorDialogId = `reaction-selector--${message.id}`;
  const reactionSelectorDialog = useDialog({ id: reactionSelectorDialogId });
  const reactionSelectorDialogIsOpen = useDialogIsOpen(
    reactionSelectorDialogId
  );
  const messageActionsDialogIsOpen = useDialogIsOpen(
    `message-actions--${message.id}`
  );

  const messageActions = getMessageActions();
  const shouldShowReplies =
    messageActions.indexOf(MESSAGE_ACTIONS.reply) > -1 && !threadList;
  const canReact = messageActions.indexOf(MESSAGE_ACTIONS.react) > -1;
  const isOwnMessage = message.user?.id === client.userID;
  const messageTextToRender =
    message.i18n?.[`${userLanguage}_text` as `${string}_text`] || message.text;
  const messageMentionedUsersItem = message.mentioned_users;
  const messageText = useMemo(
    () => defaultRenderText(messageTextToRender, messageMentionedUsersItem),
    [messageMentionedUsersItem, messageTextToRender]
  );
  const rootClasses = useMemo(
    () =>
      [
        "relative flex gap-2 p-2 rounded-lg group",
        isOwnMessage ? "flex-row-reverse" : "flex-row",
        message.pinned ? "bg-blue-50 dark:bg-blue-900" : "",
        message.status ? `message-team--${message.status}` : "",
        message.type ? `message-team--${message.type}` : "",
        message.attachments?.length ? "has-attachment" : "",
        threadList ? "thread-list" : "",
        (groupStyles && groupStyles[0] === "top") ||
        (groupStyles && groupStyles[0] === "single")
          ? "items-start"
          : "items-end",
      ]
        .filter(Boolean)
        .join(" "),
    [message, groupStyles, threadList, isOwnMessage]
  );

  // Early return for deleted message
  if (message.deleted_at) {
    return <MessageDeleted message={message} />;
  }

  // Early return for editing mode
  if (editing) {
    return (
      <div
        className={`flex gap-2 p-2 rounded-lg ${
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        } ${
          groupStyles &&
          (groupStyles[0] === "top" || groupStyles[0] === "single")
            ? "items-start"
            : "items-end"
        }`}
        data-testid="message-team-edit"
      >
        {groupStyles &&
          (groupStyles[0] === "top" || groupStyles[0] === "single") && (
            <Avatar className="w-8 h-8 rounded-md">
              <AvatarImage src={message.user?.image} alt={message.user?.name} />
              <AvatarFallback className="rounded-md">
                {message.user?.name?.[0] || message.user?.id?.[0]}
              </AvatarFallback>
            </Avatar>
          )}
        <div className="flex-1">
          <MessageInput
            Input={EditMessageForm}
            clearEditingState={clearEditingState}
          />
        </div>
      </div>
    );
  }

  const handleOpenThread = (event: React.BaseSyntheticEvent) => {
    closePinnedMessageListOpen();
    handleOpenThreadContext(event);
  };

  return (
    <div className={message.pinned ? "border-l-4 border-blue-500 pl-2" : ""}>
      {message.pinned && <PinIndicator message={message} />}
      <div className={rootClasses} data-testid="message-team">
        <div className="w-8 flex-shrink-0">
          {(groupStyles &&
            (groupStyles[0] === "top" || groupStyles[0] === "single")) ||
          initialMessage ? (
            <Avatar className="w-8 h-8 cursor-pointer rounded-md">
              <AvatarImage src={message.user?.image} alt={message.user?.name} />
              <AvatarFallback className="rounded-md">
                {message.user?.name?.[0] || message.user?.id?.[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8" data-testid="team-meta-spacer" />
          )}
        </div>
        <div
          className={`flex-1 flex flex-col gap-1 ${
            isOwnMessage ? "items-end" : "items-start"
          }`}
        >
          {((groupStyles &&
            (groupStyles[0] === "top" || groupStyles[0] === "single")) ||
            initialMessage) && (
            <div className="flex items-center gap-2 text-sm">
              <div
                onClick={onUserClick}
                className="font-semibold hover:underline"
                data-testid="message-team-author"
              >
                {message.user?.name || message.user?.id}
              </div>
              {message.type === "error" && (
                <span className="text-xs text-red-500">
                  {t("Only visible to you")}
                </span>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                • <MessageTimestamp />
              </div>
            </div>
          )}
          <div
            className={`p-2 rounded-lg ${
              isOnlyEmojis(message.text) ? "text-2xl" : "text-sm"
            }`}
            data-testid="message-team-content"
            onClick={onMentionsClickMessage}
            onMouseOver={onMentionsHoverMessage}
          >
            {message.quoted_message && <QuotedMessage />}
            <div
              className={`flex flex-col gap-2 ${
                isOwnMessage ? "items-end" : "items-start"
              }`}
            >
              {/* Attachments at the top */}
              {message.attachments?.length ? (
                <CustomAttachment
                  actionHandler={handleAction}
                  attachments={message.attachments}
                />
              ) : null}
              {/* Message text below attachments */}
              {message.text && (
                <div
                  className="break-words markdown-content"
                  data-testid="message-team-message"
                >
                  {messageText}
                </div>
              )}
              {/* Reactions below status for text-only messages */}
              {message.latest_reactions?.length &&
              message.text !== "" &&
              canReact ? (
                <ReactionsList />
              ) : null}
              {poll ? <Poll poll={poll} /> : null}
              {/* Status below text */}
              <div className="flex text-xs text-blue-500 dark:text-blue-400">
                <CustomMessageStatus messageType="team" />
              </div>
              {/* Failed message button */}
              {message.status === "failed" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={
                    message.error?.status !== 403
                      ? () => handleRetry(message)
                      : undefined
                  }
                  data-testid="message-team-failed"
                >
                  <MessageErrorIcon />
                  {message.error?.status !== 403
                    ? t("Message Failed · Click to try again")
                    : t("Message Failed · Unauthorized")}
                </Button>
              )}
              {/* Reactions for attachment-only messages */}
              {message.latest_reactions &&
              message.latest_reactions.length !== 0 &&
              message.text === "" &&
              canReact ? (
                <ReactionsList />
              ) : null}
            </div>
          </div>
          {/* Thread replies count */}
          {!threadList && (
            <div className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
              {message.reply_count ? <ArrowBendUpLeftIcon /> : null}
              <MessageRepliesCountButton
                onClick={handleOpenThread}
                reply_count={message.reply_count}
              />
            </div>
          )}
          {/* Message actions (reactions, thread, etc.) */}
          {!initialMessage &&
            message.status !== "sending" &&
            message.status !== "failed" &&
            message.type !== "system" &&
            message.type !== "ephemeral" &&
            message.type !== "error" && (
              <div
                className={`absolute top-1 text-gray-400 ${
                  isOwnMessage ? "left-0" : "right-0"
                } flex group-hover:opacity-100 transition-opacity ${
                  reactionSelectorDialogIsOpen || messageActionsDialogIsOpen
                    ? "opacity-100"
                    : "opacity-0"
                }`}
                data-testid="message-team-actions"
              >
                {canReact && (
                  <>
                    <DialogAnchor
                      trapFocus
                      id={reactionSelectorDialogId}
                      referenceElement={buttonRef.current}
                    >
                      <ReactionSelector />
                    </DialogAnchor>
                    <Button
                      size="sm"
                      variant="ghost"
                      ref={buttonRef}
                      data-testid="message-reaction-action"
                      aria-expanded={reactionSelectorDialogIsOpen}
                      aria-label={t("aria/Open Reaction Selector")}
                      onClick={() => reactionSelectorDialog?.toggle()}
                    >
                      <SmileyIcon className="size-5" />
                    </Button>
                  </>
                )}
                {shouldShowReplies && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Start a thread"
                    onClick={handleOpenThread}
                    data-testid="message-team-thread-icon"
                  >
                    <ArrowBendDoubleUpLeftIcon className="size-5 text-gray-400" />
                  </Button>
                )}
                <div className="size-9 flex items-center justify-center">
                  <MessageActions ActionsIcon={DotsThreeOutlineVerticalIcon} />
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export type PinIndicatorProps = {
  message?: LocalMessage;
};

export const PinIndicator = ({ message }: PinIndicatorProps) => {
  if (!message) return null;

  const pinnedText = useMemo(
    () =>
      message.pinned_by
        ? `Pinned by ${message.pinned_by?.name || message.pinned_by?.id}`
        : "Message pinned",
    [message.pinned_by]
  );

  return (
    <Badge
      variant="secondary"
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-full"
      aria-label={pinnedText}
      data-testid="pin-indicator"
    >
      <PinIcon aria-hidden="true" />
      <span>{pinnedText}</span>
    </Badge>
  );
};

export const CustomMessageStatus = ({
  Avatar: CustomAvatar,
  messageType = "team",
  tooltipUserNameMapper,
}: MessageStatusProps) => {
  const { message } = useMessageContext("CustomMessageStatus");
  const { channel } = useChannelStateContext("CustomMessageStatus");

  const readUsers = useMemo(() => {
    const readStates = channel.state.read || {};
    return Object.values(readStates)
      .filter(({ user, last_read }) => {
        if (!user || !last_read || !message.created_at) return false;
        return (
          new Date(last_read).getTime() >=
            new Date(message.created_at).getTime() &&
          user.id !== message.user?.id
        );
      })
      .map(({ user }) => user);
  }, [channel.state.read, message.created_at, message.user?.id]);

  const readUserNames = useMemo(
    () =>
      readUsers.map((u) =>
        tooltipUserNameMapper ? tooltipUserNameMapper(u) : u.name || u.id
      ),
    [readUsers, tooltipUserNameMapper]
  );

  const statusConfig = {
    sending: {
      icon: (
        <ClockIcon className="size-4 text-yellow-500" aria-label="Sending" />
      ),
      label: "Sending...",
    },
    sent: {
      icon: <CheckIcon className="size-4 text-blue-500" aria-label="Sent" />,
      label: "Sent",
    },
    received: {
      icon: (
        <ChecksIcon className="size-4 text-blue-500" aria-label="Delivered" />
      ),
      label: "Delivered",
    },
  };

  const { status } = message;
  const isRead = readUsers.length > 0;
  const isDeliveredButNotRead = status === "received" && !isRead;

  const renderAvatars = () => (
    <div className="flex -space-x-2 hover:space-x-0 transition-all">
      {readUsers.slice(0, 3).map((user) => (
        <Avatar key={user.id} className="w-5 h-5 rounded-full">
          <AvatarImage src={user.image} alt={user.name || user.id} />
          <AvatarFallback className="rounded-md text-xs">
            {user.name?.[0] || user.id?.[0]}
          </AvatarFallback>
        </Avatar>
      ))}
      {readUsers.length > 3 && (
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 text-xs">
          +{readUsers.length - 3}
        </div>
      )}
    </div>
  );

  const renderTooltip = (
    trigger: React.ReactNode,
    content: React.ReactNode
  ) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {status === "sending" &&
        renderTooltip(statusConfig.sending.icon, statusConfig.sending.label)}

      {status === "sent" &&
        renderTooltip(statusConfig.sent.icon, statusConfig.sent.label)}

      {isDeliveredButNotRead &&
        renderTooltip(statusConfig.received.icon, statusConfig.received.label)}

      {isRead &&
        renderTooltip(
          renderAvatars(),
          <div>
            <p>Read by:</p>
            <ul className="list-disc pl-4">
              {readUserNames.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
};
