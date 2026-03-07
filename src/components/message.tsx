// src/components/TeamMessage.tsx
"use client";

import { Editor } from "@/components/editor/editor";
import { AvatarSimple } from "@/components/ui/avatar-simple";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MediaLayout } from "@/components/ui/media-layout";
import { Separator } from "@/components/ui/separator";
import { ShareMenu } from "@/components/ui/share-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkspaceController } from "@/context/workspace-controller";
import {
  createURL,
  formatDateTime,
  getFileUrl,
  getInitials,
} from "@/lib/utils";
import { type LocalMessage } from "@/types/messages";
import { getDisplayName, getDurationLabel } from "@/utils/helpers";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TEXT_FORMAT_TRANSFORMERS,
} from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  ArrowBendDoubleUpLeftIcon,
  ArrowBendUpLeftIcon,
  CaretRightIcon,
  CheckIcon,
  ChecksIcon,
  ClockIcon,
  DotsThreeOutlineVerticalIcon,
  DownloadIcon,
  EnvelopeSimpleIcon,
  MegaphoneIcon,
  PencilSimpleLineIcon,
  PushPinIcon,
  SmileyIcon,
  TrashIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import {
  $getRoot,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
} from "lexical";
import Link from "next/link";
import React, {
  ComponentRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Attachment as StreamAttachment } from "stream-chat";
import {
  renderText as defaultRenderText,
  DialogAnchor,
  isOnlyEmojis,
  MESSAGE_ACTIONS,
  MessageActions,
  MessageDeleted,
  MessageErrorIcon,
  MessageRepliesCountButton,
  MessageStatusProps,
  MessageTimestamp,
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
  type MessageContextValue,
} from "stream-chat-react";
import { CustomPollCreationDialog } from "./poll/dialog";
import { VoiceRecordingPlayer } from "./voice-recording-ui";

/** Clean markdown output */
function cleanMarkdownOutput(markdown: string): string {
  return markdown.trim();
}

const isValidUrl = (url?: string) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ["http:", "https:", "blob:"].includes(u.protocol);
  } catch {
    return false;
  }
};

const CustomAttachment = ({
  attachments,
  actionHandler,
}: {
  attachments: StreamAttachment[];
  actionHandler?: (
    name: string,
    value: string,
    event: React.BaseSyntheticEvent,
  ) => void | Promise<void>;
}) => {
  const isImageMime = (mime?: string) => !!mime && mime.startsWith("image/");

  const voiceRecordings = attachments.filter(
    (att) => att.type === "voiceRecording" && att.asset_url,
  );

  const allImages = React.useMemo(() => {
    const images: string[] = [];

    attachments.forEach((att) => {
      if (att.type === "voiceRecording") return;

      if (att.type === "image" && (att.image_url || att.thumb_url)) {
        const rawUrl = att.image_url || att.thumb_url;
        if (rawUrl) {
          const imageUrl = isValidUrl(rawUrl) ? rawUrl : getFileUrl(rawUrl);
          images.push(imageUrl);
        }
        return;
      }

      if (att.type === "file" && att.asset_url && isImageMime(att.mime_type)) {
        const src = isValidUrl(att.asset_url)
          ? att.asset_url
          : getFileUrl(att.asset_url);
        images.push(src);
      }
    });

    return images.filter(Boolean);
  }, [attachments]);

  const linkAttachments = attachments.filter((att) => att.og_scrape_url);

  const downloadableFiles = attachments.filter(
    (att) =>
      att.type === "file" && att.asset_url && !isImageMime(att.mime_type),
  );

  return (
    <div className="flex flex-col gap-3">
      {allImages.length > 0 && (
        <MediaLayout
          images={allImages}
          columns={allImages.length === 1 ? 1 : allImages.length === 2 ? 2 : 3}
          aspectRatio={allImages.length === 1 ? "auto" : "landscape"}
          className="max-w-2xl"
          enableLightbox={true}
          quality="high"
          gap={4}
        />
      )}

      {voiceRecordings.length > 0 && (
        <div className="flex flex-col gap-2">
          {voiceRecordings.map((att, i) => (
            <VoiceRecordingPlayer key={`voice-${i}`} attachment={att} />
          ))}
        </div>
      )}

      {linkAttachments.length > 0 && (
        <div className="flex flex-col gap-2">
          {linkAttachments.map((attachment, index) => (
            <Card key={`link-${index}`} className="max-w-md overflow-hidden">
              <CardContent className="p-0">
                <Link
                  href={attachment.title_link || attachment.og_scrape_url || ""}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 hover:bg-muted/50 transition-colors"
                  aria-label={`Link: ${
                    attachment.title || attachment.og_scrape_url
                  }`}
                >
                  {attachment.author_name && (
                    <p className="text-xs text-muted-foreground mb-1 font-medium">
                      {attachment.author_name}
                    </p>
                  )}
                  {attachment.title && (
                    <h4 className="font-semibold text-sm leading-tight line-clamp-2 mb-1">
                      {attachment.title}
                    </h4>
                  )}
                  {attachment.text && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {attachment.text}
                    </p>
                  )}
                  {attachment.og_scrape_url && (
                    <p className="text-xs text-blue-500 mt-2 truncate">
                      {new URL(attachment.og_scrape_url).hostname}
                    </p>
                  )}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {downloadableFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          {downloadableFiles.map((attachment, index) => {
            const fileUrl = isValidUrl(attachment.asset_url ?? "")
              ? attachment.asset_url!
              : getFileUrl(attachment.asset_url ?? "");

            return (
              <Card key={`file-${index}`} className="max-w-md">
                <CardContent className="px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {attachment.title ||
                          attachment.fallback ||
                          "Download File"}
                      </p>
                      {attachment.file_size &&
                        typeof attachment.file_size === "number" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {attachment.file_size >= 1048576
                              ? `${(attachment.file_size / 1048576).toFixed(1)} MB`
                              : `${(attachment.file_size / 1024).toFixed(1)} KB`}
                          </p>
                        )}
                    </div>

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0"
                      aria-label={`Download ${attachment.title || "file"}`}
                    >
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <DownloadIcon className="size-4" />
                        Download
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const UserInfoHoverCard = ({
  user,
  children,
}: {
  user: LocalMessage["user"];
  children: React.ReactNode;
}) => {
  if (!user) return <>{children}</>;

  const customUser = user as typeof user & {
    email?: string;
    user_type?: string;
    display?: string;
  };

  const displayName = getDisplayName(user) || user.name || user.id;
  const email = customUser.email;
  const userType = customUser.user_type;

  const userTypeLabel: Record<string, string> = {
    pmc: "PMC Staff",
    admin: "Administrator",
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="w-64 p-0 rounded-xl shadow-lg"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-3 p-3">
              <AvatarSimple
                src={getFileUrl(user.image || "")}
                className="size-10 rounded-lg"
                fallback={getInitials(displayName)}
                avatarFallbackClassName="rounded-lg text-sm font-semibold bg-gray-100 text-gray-700"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {displayName}
                </p>
                {userType && (
                  <p className="text-xs text-gray-500">
                    {userTypeLabel[userType] ?? userType}
                  </p>
                )}
              </div>
            </div>

            {email && (
              <>
                <Separator />
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <EnvelopeSimpleIcon className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

function InitializeMarkdownPlugin({ markdown }: { markdown: string }) {
  const [editor] = useLexicalComposerContext();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !markdown) return;
    initialized.current = true;

    editor.update(() => {
      $getRoot().clear();
      $convertFromMarkdownString(markdown, TEXT_FORMAT_TRANSFORMERS);
    });
  }, [editor, markdown]);

  return null;
}

function EditKeyPlugin({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event && !event.shiftKey) {
          event.preventDefault();
          onSave();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    const unregisterEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        onCancel();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      unregisterEnter();
      unregisterEscape();
    };
  }, [editor, onSave, onCancel]);

  return null;
}

const EditMessageEditor = ({
  message,
  clearEditingState,
}: {
  message: LocalMessage;
  clearEditingState: () => void;
}) => {
  const { client } = useChatContext();
  const editorRef = useRef<LexicalEditor | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || isSaving) return;

    setIsSaving(true);
    try {
      let text = "";
      editor.getEditorState().read(() => {
        text = cleanMarkdownOutput(
          $convertToMarkdownString(TEXT_FORMAT_TRANSFORMERS),
        );
      });

      if (!text.trim()) {
        clearEditingState();
        return;
      }

      await client.updateMessage({
        id: message.id,
        text,
      });
      clearEditingState();
    } catch (err) {
      console.error("[EditMessageEditor] Save error:", err);
    } finally {
      setIsSaving(false);
    }
  }, [client, message.id, clearEditingState, isSaving]);

  const handleCancel = useCallback(() => {
    clearEditingState();
  }, [clearEditingState]);

  return (
    <div className="flex flex-col gap-2">
      <Editor
        hideToolbar
        editorRef={editorRef}
        wrapperClassName="overflow-hidden rounded-md border border-input"
        className="bg-white text-sm"
        contentClassName="min-h-[3rem] max-h-40"
        placeholderClassName="text-muted-foreground pointer-events-none absolute top-0 left-0 overflow-hidden px-3 py-2 text-sm text-ellipsis select-none"
        placeholder="Edit message..."
      >
        <InitializeMarkdownPlugin markdown={message.text || ""} />
        <EditKeyPlugin onSave={handleSave} onCancel={handleCancel} />
      </Editor>
      <div className="flex items-center gap-2 justify-end">
        <Button variant="secondary" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isSaving}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

interface TeamMessageProps {
  showMessageActions?: boolean;
  onPollEdit?: (message: LocalMessage) => void;
  showPollEditButton?: boolean;
  onPollDelete?: (message: LocalMessage) => void;
  showPollDeleteButton?: boolean;
}

export const TeamMessage = (
  props?: TeamMessageProps & Partial<MessageContextValue>,
) => {
  const {
    clearEditingState,
    editing,
    getMessageActions,
    groupStyles,
    handleAction,
    handleOpenThread: handleOpenThreadContext,
    handleRetry,
    initialMessage,
    message: baseMessage,
    onMentionsClickMessage,
    onMentionsHoverMessage,
    onUserClick,
    threadList,
  } = useMessageContext("MessageTeam");
  const message = baseMessage as LocalMessage;
  const { t, userLanguage } = useTranslationContext("MessageTeam");
  const { client } = useChatContext();
  const { closePinnedMessageListOpen } = useWorkspaceController();
  const buttonRef = useRef<ComponentRef<"button">>(null);
  const poll = message.poll_id && client.polls.fromState(message.poll_id);
  const reactionSelectorDialogId = `reaction-selector--${message.id}`;
  const reactionSelectorDialog = useDialog({ id: reactionSelectorDialogId });
  const reactionSelectorDialogIsOpen = useDialogIsOpen(
    reactionSelectorDialogId,
  );
  const messageActionsDialogIsOpen = useDialogIsOpen(
    `message-actions--${message.id}`,
  );
  const [pollDialogOpen, setPollDialogOpen] = useState(false);

  const messageActions = getMessageActions();
  const isOwnMessage = message.user?.id === client.user?.id;
  const filteredMessageActions = isOwnMessage
    ? messageActions
    : messageActions.filter(
        (action) =>
          action !== MESSAGE_ACTIONS.edit && action !== MESSAGE_ACTIONS.delete,
      );
  const shouldShowReplies =
    filteredMessageActions.indexOf(MESSAGE_ACTIONS.reply) > -1 && !threadList;
  const canReact = filteredMessageActions.indexOf(MESSAGE_ACTIONS.react) > -1;
  const messageTextToRender =
    message.i18n?.[`${userLanguage}_text` as `${string}_text`] || message.text;
  const messageMentionedUsersItem = message.mentioned_users;
  const messageText = useMemo(
    () => defaultRenderText(messageTextToRender, messageMentionedUsersItem),
    [messageMentionedUsersItem, messageTextToRender],
  );
  const rootClasses = useMemo(
    () =>
      [
        "relative flex gap-2 rounded-lg group",
        message.pinned ? "p-4 mb-4 bg-blue-50 dark:bg-blue-900" : "",
        message.status ? `message-team--${message.status}` : "",
        message.type ? `message-team--${message.type}` : "",
        message.attachments?.length ? "has-attachment" : "",
        threadList ? "thread-list" : "",
        threadList ||
        (groupStyles && groupStyles[0] === "top") ||
        (groupStyles && groupStyles[0] === "single")
          ? "items-start"
          : "items-end",
      ]
        .filter(Boolean)
        .join(" "),
    [message, groupStyles, threadList],
  );

  if (message.deleted_at) {
    return <MessageDeleted message={message} />;
  }

  if (editing) {
    if (!client?.userID) {
      clearEditingState();
      return (
        <div className="flex gap-2 p-2 rounded-lg text-red-500">
          <span>
            Connection lost. Please refresh the page to edit messages.
          </span>
        </div>
      );
    }

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
            <AvatarSimple
              className="w-8 h-8 rounded-md"
              fallback={getInitials(message.user?.name || "")}
              src={getFileUrl(message.user?.image || "")}
            />
          )}
        <div className="flex-1">
          <EditMessageEditor
            message={message}
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

  const handleEditPoll = () => {
    if (poll && props?.onPollEdit) {
      props.onPollEdit(message);
    } else if (poll) {
      setPollDialogOpen(true);
    }
  };

  const handleDeletePoll = () => {
    if (props?.onPollDelete) {
      props.onPollDelete(message);
    }
  };

  return (
    <div className={message.pinned ? "border-l-4 border-blue-500 pl-2" : ""}>
      {message.pinned && <PinIndicator message={message} />}
      <div
        className={rootClasses}
        data-testid="message-team"
        style={{
          flexDirection: isOwnMessage ? "row-reverse" : "row",
        }}
      >
        <div className="w-8 flex-shrink-0">
          {(groupStyles &&
            (groupStyles[0] === "top" || groupStyles[0] === "single")) ||
          initialMessage ? (
            <UserInfoHoverCard user={message.user}>
              <AvatarSimple
                src={getFileUrl(message.user?.image || "")}
                fallback={getInitials(message.user?.name || "")}
                className="size-8 cursor-pointer rounded-md"
              />
            </UserInfoHoverCard>
          ) : (
            <div className="w-10" data-testid="team-meta-spacer" />
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
                {isOwnMessage
                  ? "You"
                  : getDisplayName(message.user!) ||
                    message.user?.name ||
                    message.user?.id}
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
              {message.attachments?.length ? (
                <CustomAttachment
                  actionHandler={handleAction}
                  attachments={message.attachments}
                />
              ) : null}
              {message.text && (
                <div
                  className="break-words markdown-content"
                  data-testid="message-team-message"
                >
                  {messageText}
                </div>
              )}
              {message.latest_reactions?.length &&
              message.text !== "" &&
              canReact ? (
                <ReactionsList />
              ) : null}
              <div>
                {poll ? <Poll poll={poll} /> : null}

                {message.poll_id &&
                  isOwnMessage &&
                  (props?.showPollEditButton ||
                    props?.showPollDeleteButton) && (
                    <div className="mt-3 flex justify-end gap-2">
                      {props?.showPollEditButton && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditPoll}
                          className="flex items-center gap-2"
                        >
                          <PencilSimpleLineIcon className="w-4 h-4" />
                          Edit Survey
                        </Button>
                      )}
                      {props?.showPollDeleteButton && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeletePoll}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  )}

                <CustomPollCreationDialog
                  key={JSON.stringify(message)}
                  isOpen={pollDialogOpen}
                  onClose={() => setPollDialogOpen(false)}
                  pollId={message.poll_id}
                  initialData={
                    message.poll
                      ? {
                          name: message.poll.name || "",
                          description: message.poll.description || "",
                          options: message.poll.options?.map((opt) => ({
                            text: opt.text,
                          })) || [{ text: "" }, { text: "" }],
                          allow_answers: message.poll.allow_answers ?? true,
                          allow_user_suggested_options:
                            message.poll.allow_user_suggested_options ?? false,
                          enforce_unique_vote:
                            message.poll.enforce_unique_vote ?? false,
                          voting_visibility: (message.poll.voting_visibility ===
                          "anonymous"
                            ? "anonymous"
                            : "public") as "anonymous" | "public",
                        }
                      : undefined
                  }
                />
              </div>
              <div className="flex text-xs text-blue-500 dark:text-blue-400">
                <CustomMessageStatus messageType="team" />
              </div>
              {message.status === "failed" && (
                <Button
                  variant="outline"
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
              {message.latest_reactions &&
              message.latest_reactions.length !== 0 &&
              message.text === "" &&
              canReact ? (
                <ReactionsList />
              ) : null}
            </div>
          </div>
          {!threadList && (
            <div className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
              {message.reply_count ? <ArrowBendUpLeftIcon /> : null}
              <MessageRepliesCountButton
                onClick={handleOpenThread}
                reply_count={message.reply_count}
              />
            </div>
          )}
          {!initialMessage &&
            message.status !== "sending" &&
            message.status !== "failed" &&
            message.type !== "system" &&
            message.type !== "ephemeral" &&
            message.type !== "error" && (
              <div
                className={`absolute top-0 text-gray-400 ${
                  isOwnMessage ? "left-0" : "right-0"
                } flex flex-row justify-center transition-opacity ${
                  reactionSelectorDialogIsOpen || messageActionsDialogIsOpen
                    ? "opacity-100"
                    : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
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
                {props?.showMessageActions !== false && (
                  <div className="-mb-1 size-10 px-2 py-1 flex items-center">
                    <MessageActions
                      ActionsIcon={DotsThreeOutlineVerticalIcon}
                      getMessageActions={() => filteredMessageActions}
                    />
                  </div>
                )}
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
    [message.pinned_by],
  );

  return (
    <Badge
      variant="outline"
      aria-label={pinnedText}
      data-testid="pin-indicator"
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-full"
    >
      <PushPinIcon aria-hidden="true" />
      <span>{pinnedText}</span>
    </Badge>
  );
};

export const CustomMessageStatus = ({
  tooltipUserNameMapper,
}: MessageStatusProps) => {
  const { message: baseMessage } = useMessageContext("CustomMessageStatus");
  const message = baseMessage as LocalMessage;
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
        tooltipUserNameMapper
          ? tooltipUserNameMapper(u)
          : getDisplayName(u) || u.name || u.id,
      ),
    [readUsers, tooltipUserNameMapper],
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
        <AvatarSimple
          key={user.id}
          className="w-5 h-5 rounded-full"
          src={getFileUrl(user.image || "")}
          fallback={getInitials(user.name || user.id)}
        />
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
    content: React.ReactNode,
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
          </div>,
        )}
    </div>
  );
};

export const AnnouncementMessage = (props: {
  announcementEventHref?: string;
  onEdit?: (message: LocalMessage) => void;
  showEditButton?: boolean;
  showShareButton?: boolean;
}) => {
  const {
    message: baseMessage,
    groupStyles,
    getMessageActions,
  } = useMessageContext("AnnouncementMessage");
  const message = baseMessage as LocalMessage;
  const { t, userLanguage } = useTranslationContext("AnnouncementMessage");
  const { client } = useChatContext();
  const buttonRef = useRef<ComponentRef<"button">>(null);
  const isEventAnnouncement = message.event_type?.includes("event");

  const reactionSelectorDialogId = `reaction-selector--${message.id}`;
  const reactionSelectorDialog = useDialog({ id: reactionSelectorDialogId });
  const reactionSelectorDialogIsOpen = useDialogIsOpen(
    reactionSelectorDialogId,
  );

  const messageActions = getMessageActions();
  const canReact = messageActions.indexOf(MESSAGE_ACTIONS.react) > -1;

  if (message.deleted_at) {
    return <MessageDeleted message={message} />;
  }

  const messageTextToRender =
    message.i18n?.[`${userLanguage}_text` as `${string}_text`] || message.text;

  const messageText = useMemo(
    () => defaultRenderText(messageTextToRender, message.mentioned_users),
    [messageTextToRender, message.mentioned_users],
  );

  return (
    <Card
      className={[
        "relative flex flex-col w-1/3 gap-x-4 p-4 rounded-xl group",
        message.pinned ? "border-l-4 border-blue-500" : "",
        (groupStyles && groupStyles[0] === "top") ||
        (groupStyles && groupStyles[0] === "single")
          ? "my-4"
          : "mt-4",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="announcement-message"
    >
      <CardHeader className="flex flex-wrap items-center gap-3 w-full p-1">
        <div className="flex items-center justify-center size-12 bg-orange-100 rounded-lg shadow-sm">
          <MegaphoneIcon weight="fill" color="orange" size={28} />
        </div>

        <div className="flex flex-col gap-1">
          <div
            className="font-semibold text-xl text-gray-900 dark:text-gray-100"
            data-testid="announcement-author"
          >
            Announcement
          </div>

          <div className="flex items-center justify-start gap-2 text-xs text-gray-500 dark:text-gray-400">
            <MessageTimestamp />{" "}
            <span className="font-medium">
              {message.event_type === "event_update" && "(Updated)"}
            </span>
            {message.pinned && (
              <>
                <span className="text-gray-400">•</span>
                <Badge
                  variant="outline"
                  className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300"
                >
                  {t("Pinned")}
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex gap-x-2 items-center">
          {props.showEditButton !== false && (
            <>
              {!isEventAnnouncement && props.onEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => props.onEdit?.(message)}
                  className="flex items-center gap-1.5"
                >
                  <PencilSimpleLineIcon className="w-4 h-4" />
                  Edit
                </Button>
              ) : isEventAnnouncement ? (
                <Link
                  href={createURL(
                    `events/${props.announcementEventHref || ""}`,
                    {
                      modal: `event:${message.event_id}` || "",
                    },
                  )}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5"
                    title="View event details"
                  >
                    <CaretRightIcon className="w-4 h-4" />
                    View
                  </Button>
                </Link>
              ) : null}
            </>
          )}

          <ShareMenu text={message.text || ""} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 w-full p-1">
        <div
          className={`text-gray-800 dark:text-gray-100 leading-relaxed ${
            isOnlyEmojis(message.text)
              ? "text-3xl text-center w-full"
              : "text-sm sm:text-base"
          }`}
          data-testid="announcement-content"
        >
          {message.quoted_message && (
            <div className="mb-2 w-full">
              <QuotedMessage />
            </div>
          )}

          <div className="flex flex-col gap-3 items-start">
            {isEventAnnouncement ? (
              <div>
                <h3 className="font-semibold">{message.title}</h3>
                <p>{message.description}</p>
              </div>
            ) : (
              <div className="break-words markdown-content">{messageText}</div>
            )}
            {isEventAnnouncement && (
              <Link
                className="w-full"
                href={createURL(`events/${props.announcementEventHref || ""}`, {
                  modal: `event:${message.event_id}` || "",
                })}
              >
                <Card className="py-2 border border-primary/40 bg-primary/4">
                  <CardContent className="px-3 text-primary/40">
                    <p className="flex items-center gap-x-2 text-gray-700 font-semibold">
                      Single-Day Meeting <CaretRightIcon />
                    </p>
                    <p className="flex items-center gap-x-2 text-gray-700">
                      <ClockIcon />{" "}
                      {message.all_day
                        ? "Daylong event"
                        : getDurationLabel(
                            message.start_time,
                            message.end_time,
                          )}{" "}
                      | {formatDateTime(new Date(message.start_time!))}{" "}
                      {!message.all_day
                        ? `-${" "}
                      ${formatDateTime(new Date(message.end_time!))}`
                        : ""}
                    </p>
                    <p className="flex items-center gap-x-2 text-gray-700">
                      <UsersThreeIcon /> Community Event
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}
            {message.attachments?.length ? (
              <CustomAttachment attachments={message.attachments} />
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex-1">
            {message.latest_reactions?.length && canReact ? (
              <ReactionsList />
            ) : null}
          </div>

          {canReact && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                data-testid="announcement-reaction-action"
                aria-expanded={reactionSelectorDialogIsOpen}
                aria-label={t("aria/Open Reaction Selector")}
                onClick={() => reactionSelectorDialog?.toggle()}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <SmileyIcon className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
