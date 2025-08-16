// src/components/TeamMessageInput.tsx
"use client";

import Picker from "@emoji-mart/react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CodeIcon,
  DotsThreeIcon,
  LightningIcon,
  ListChecksIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  PlusCircleIcon,
  SmileyIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useChannelStateContext,
  useChatContext,
  useMessageComposer,
  useMessageComposerHasSendableData,
  useMessageInputContext,
  useStateStore,
} from "stream-chat-react";
import { z } from "zod";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

// Types
type MessageInputFormattingType = "bold" | "italics" | "strikethrough" | "code";

const formattingTypeToMarkdown: Record<MessageInputFormattingType, string> = {
  bold: "**",
  code: "`",
  italics: "*",
  strikethrough: "~~",
};

// Extend AttachmentManagerState type
interface AttachmentManagerState {
  attachments: Array<{
    type: string;
    image_url?: string;
    file_url?: string;
    title?: string;
    [key: string]: any;
  }>;
}

// Zod schema for message validation
const MessageFormSchema = z.object({
  text: z.string().trim().optional(),
});

type MessageFormValues = z.infer<typeof MessageFormSchema>;

// GiphyBadge inline
const GiphyBadge = () => (
  <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-full">
    <LightningIcon className="w-4 h-4" />
    <span>GIPHY</span>
  </div>
);

// Selector for Giphy state
const customComposerDataSelector = (state: any) => ({
  isComposingGiphyText: state.custom?.command === "giphy",
});

export const TeamMessageInput = () => {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const messageComposer = useMessageComposer();
  const { textareaRef: streamTextareaRef } = useMessageInputContext();
  const hasSendableData = useMessageComposerHasSendableData();
  const { isComposingGiphyText } = useStateStore(
    messageComposer.customDataManager.state,
    customComposerDataSelector
  );
  const [emojiPickerIsOpen, setEmojiPickerIsOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeFormatting, setActiveFormatting] =
    useState<MessageInputFormattingType | null>(null);
  const [manualAttachments, setManualAttachments] = useState<File[]>([]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
    setValue,
    getValues,
  } = useForm<MessageFormValues>({
    resolver: zodResolver(MessageFormSchema),
    defaultValues: { text: "" },
  });

  // Sync local textareaRef with streamTextareaRef
  useEffect(() => {
    if (textareaRef.current && streamTextareaRef) {
      streamTextareaRef.current = textareaRef.current;
    }
  }, [streamTextareaRef]);

  // Placeholder logic
  const placeholder = useMemo(() => {
    let dynamicPart = "the group";
    if (channel.type === "team") {
      dynamicPart = `#${channel?.data?.name || channel?.data?.id || "random"}`;
    }
    const members = Object.values(channel.state.members).filter(
      ({ user }) => user?.id !== client.userID
    );
    if (!members.length || members.length === 1) {
      dynamicPart =
        members[0]?.user?.name || members[0]?.user?.id || "Johnny Blaze";
    }
    return `Message ${dynamicPart}`;
  }, [
    channel.type,
    channel.state.members,
    channel?.data?.id,
    channel?.data?.name,
    client.userID,
  ]);

  // Dropzone for attachments
  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      accept: {
        "image/*": [".png", ".jpg", ".jpeg", ".gif"],
        "application/pdf": [".pdf"],
        "text/plain": [".txt"],
      },
      multiple: true,
      onDrop: async (acceptedFiles) => {
        try {
          if (messageComposer.attachmentManager?.uploadFiles) {
            await messageComposer.attachmentManager.uploadFiles(acceptedFiles);
            setUploadError(null);
            toast.success("Attachments uploaded");
          } else {
            setManualAttachments([...manualAttachments, ...acceptedFiles]);
            setUploadError(null);
            toast.success("Attachments added locally");
          }
        } catch (err) {
          setUploadError("Failed to upload attachments");
          toast.error("Failed to upload attachments");
          console.error("[TeamMessageInput] Attachment upload error:", err);
        }
      },
    });

  // Manual file selection
  const handleManualFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        try {
          if (messageComposer.attachmentManager?.uploadFiles) {
            await messageComposer.attachmentManager.uploadFiles(
              Array.from(files)
            );
            setUploadError(null);
            toast.success("Attachments uploaded");
          } else {
            setManualAttachments([...manualAttachments, ...Array.from(files)]);
            setUploadError(null);
            toast.success("Attachments added locally");
          }
        } catch (err) {
          setUploadError("Failed to upload attachments");
          toast.error("Failed to upload attachments");
          console.error(
            "[TeamMessageInput] Manual attachment upload error:",
            err
          );
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [messageComposer.attachmentManager, manualAttachments]
  );

  // Emoji picker handling
  const handleEmojiSelect = useCallback(
    (e: { native: string }) => {
      const textarea = textareaRef.current;
      if (textarea) {
        const currentText = getValues("text") || "";
        const selectionStart = textarea.selectionStart || 0;
        const selectionEnd = textarea.selectionEnd || 0;
        const newText =
          currentText.slice(0, selectionStart) +
          e.native +
          currentText.slice(selectionEnd);
        setValue("text", newText);
        textarea.selectionStart = selectionStart + e.native.length;
        textarea.selectionEnd = selectionStart + e.native.length;
        console.log("[TeamMessageInput] Emoji inserted:", {
          emoji: e.native,
          newText,
        });
        if (messageComposer.textComposer?.insertText) {
          messageComposer.textComposer.insertText({ text: e.native });
        }
        textarea.focus();
      }
      setEmojiPickerIsOpen(false);
    },
    [messageComposer.textComposer, getValues, setValue]
  );

  // Formatting controls
  const handleFormattingButtonClick = useCallback(
    (format: MessageInputFormattingType) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const currentText = getValues("text") || "";
      const selectionStart = textarea.selectionStart || 0;
      const selectionEnd = textarea.selectionEnd || 0;
      const selectedText = currentText.slice(selectionStart, selectionEnd);
      const wrappingMarkdown = formattingTypeToMarkdown[format];

      console.log("[TeamMessageInput] Formatting:", {
        format,
        selectedText,
        selectionStart,
        selectionEnd,
        currentText,
      });

      if (!activeFormatting || activeFormatting !== format) {
        if (selectedText) {
          // Wrap selected text
          const newText =
            currentText.slice(0, selectionStart) +
            wrappingMarkdown +
            selectedText +
            wrappingMarkdown +
            currentText.slice(selectionEnd);
          setValue("text", newText);
          textarea.selectionStart = selectionStart + wrappingMarkdown.length;
          textarea.selectionEnd = selectionEnd + wrappingMarkdown.length;
        } else {
          // Insert Markdown with cursor in between
          const newText =
            currentText.slice(0, selectionStart) +
            wrappingMarkdown +
            wrappingMarkdown +
            currentText.slice(selectionEnd);
          setValue("text", newText);
          textarea.selectionStart = selectionStart + wrappingMarkdown.length;
          textarea.selectionEnd = selectionStart + wrappingMarkdown.length;
        }
        setActiveFormatting(format);
      } else {
        // Toggle off the same format
        setActiveFormatting(null);
        if (selectedText) {
          // Remove Markdown if present
          const markdownLength = wrappingMarkdown.length;
          const beforeText = currentText.slice(0, selectionStart);
          const afterText = currentText.slice(selectionEnd);
          if (
            beforeText.endsWith(wrappingMarkdown) &&
            afterText.startsWith(wrappingMarkdown)
          ) {
            const newText =
              beforeText.slice(0, -markdownLength) +
              selectedText +
              afterText.slice(markdownLength);
            setValue("text", newText);
            textarea.selectionStart = selectionStart;
            textarea.selectionEnd = selectionEnd;
          }
        }
      }
      textarea.focus();
    },
    [activeFormatting, getValues, setValue]
  );

  const formatter = useMemo(
    () => ({
      bold: () => handleFormattingButtonClick("bold"),
      italics: () => handleFormattingButtonClick("italics"),
      strikethrough: () => handleFormattingButtonClick("strikethrough"),
      code: () => handleFormattingButtonClick("code"),
    }),
    [handleFormattingButtonClick]
  );

  // Form submission
  const onSubmit = useCallback(
    async (data: MessageFormValues) => {
      try {
        const state =
          messageComposer.attachmentManager?.state?.getLatestValue?.() as unknown as
            | AttachmentManagerState
            | undefined;
        const messageData = {
          text: data.text || "",
          attachments:
            state?.attachments ||
            manualAttachments.map((file) => ({
              type: file.type.startsWith("image/") ? "image" : "file",
              title: file.name,
              file_url: URL.createObjectURL(file),
            })),
        };
        console.log("[TeamMessageInput] Sending message:", messageData);
        await channel.sendMessage(messageData);
        reset({ text: "" });
        setManualAttachments([]);
        messageComposer.clear?.();
        setUploadError(null);
        toast.success("Message sent");
      } catch (err) {
        toast.error("Failed to send message");
        console.error("[TeamMessageInput] Send error:", err);
      }
    },
    [channel, reset, messageComposer, manualAttachments]
  );

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerIsOpen &&
        !document.querySelector(".em-emoji-picker")?.contains(e.target as Node)
      ) {
        setEmojiPickerIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [emojiPickerIsOpen]);

  return (
    <div {...getRootProps()} className="relative" aria-live="polite">
      {isDragActive && (
        <div
          className={`
            absolute inset-0 flex items-center justify-center bg-gray-200/80 dark:bg-gray-800/80 rounded-md
            ${
              isDragReject
                ? "border-2 border-red-500"
                : "border-2 border-blue-500"
            }
          `}
        >
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {isDragReject ? "Some files are not accepted" : "Drop files here"}
          </p>
        </div>
      )}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-1 h-full flex-col gap-3 p-3 bg-background"
      >
        {isComposingGiphyText && <GiphyBadge />}
        {uploadError && (
          <span className="text-sm text-red-500">{uploadError}</span>
        )}
        {(() => {
          const state =
            messageComposer.attachmentManager?.state?.getLatestValue?.() as unknown as
              | AttachmentManagerState
              | undefined;
          const attachments =
            state?.attachments ||
            manualAttachments.map((file) => ({
              type: file.type.startsWith("image/") ? "image" : "file",
              title: file.name,
              image_url: file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : undefined,
              file_url: URL.createObjectURL(file),
            }));
          return attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <div key={index} className="text-sm text-gray-500">
                  {attachment.type === "image" && attachment.image_url ? (
                    <img
                      src={attachment.image_url}
                      alt={`Attachment preview ${attachment.title || "image"}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <span>{attachment.title || "File"}</span>
                  )}
                </div>
              ))}
            </div>
          ) : null;
        })()}
        <Controller
          name="text"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              ref={textareaRef}
              placeholder={placeholder}
              rows={3}
              className="resize-none rounded-md p-3 text-sm focus:outline-none dark:bg-gray-700"
              aria-label="Message input"
              data-testid="message-input-textarea"
              onChange={(e) => {
                field.onChange(e);
                if (messageComposer.textComposer?.setText) {
                  messageComposer.textComposer.setText(e.target.value);
                }
              }}
            />
          )}
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add attachment"
            >
              <PlusCircleIcon className="w-4 h-4" />
            </Button>
            <input
              {...getInputProps()}
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleManualFileSelect}
              aria-label="File input"
            />
            <Separator orientation="vertical" className="h-6" />
            <ToggleGroup
              type="single"
              variant="default"
              className="gap-1"
              value={activeFormatting || undefined}
              onValueChange={(value) => {
                const format = value as MessageInputFormattingType | undefined;
                if (format && formatter[format]) {
                  formatter[format]();
                } else {
                  setActiveFormatting(null);
                }
              }}
              aria-label="Text formatting options"
            >
              <ToggleGroupItem value="bold" aria-label="Toggle bold">
                <TextBIcon className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="italics" aria-label="Toggle italics">
                <TextItalicIcon className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="strikethrough"
                aria-label="Toggle strikethrough"
              >
                <TextStrikethroughIcon className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="code" aria-label="Toggle code">
                <CodeIcon className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Separator orientation="vertical" className="h-6" />
            <ToggleGroup type="single" variant="default" className="gap-1">
              <ToggleGroupItem
                value="emoji"
                aria-label="Toggle emoji picker"
                onClick={() => setEmojiPickerIsOpen((open) => !open)}
              >
                <SmileyIcon className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="voice"
                aria-label="Toggle voice input"
                disabled
              >
                <MicrophoneIcon className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Separator orientation="vertical" className="h-6" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" type="button" aria-label="More options">
                  <DotsThreeIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>More Options</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => null}
                  aria-label="Create poll"
                >
                  <ListChecksIcon className="size-4 mr-2" />
                  Poll
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button
            variant="secondary"
            type="submit"
            disabled={!hasSendableData || isSubmitting}
            aria-label="Send message"
            data-testid="send-button"
          >
            <PaperPlaneTiltIcon
              weight="fill"
              className="size-4 fill-gray-600"
            />
          </Button>
        </div>
        {emojiPickerIsOpen && (
          <div className="absolute bottom-16 left-0 z-10">
            <Picker theme="light" onEmojiSelect={handleEmojiSelect} />
          </div>
        )}
      </form>
    </div>
  );
};

// ThreadMessageInput
export const ThreadMessageInput = () => {
  const { channel } = useChannelStateContext();
  const messageComposer = useMessageComposer();
  const hasSendableData = useMessageComposerHasSendableData();
  const { isComposingGiphyText } = useStateStore(
    messageComposer.customDataManager.state,
    customComposerDataSelector
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [manualAttachments, setManualAttachments] = useState<File[]>([]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const state =
          messageComposer.attachmentManager?.state?.getLatestValue?.() as unknown as
            | AttachmentManagerState
            | undefined;
        const messageData = {
          text,
          attachments:
            state?.attachments ||
            manualAttachments.map((file) => ({
              type: file.type.startsWith("image/") ? "image" : "file",
              title: file.name,
              file_url: URL.createObjectURL(file),
            })),
        };
        console.log("[ThreadMessageInput] Sending message:", messageData);
        await channel.sendMessage(messageData);
        setText("");
        setManualAttachments([]);
        messageComposer.clear?.();
        toast.success("Reply sent");
      } catch (err) {
        toast.error("Failed to send reply");
        console.error("[ThreadMessageInput] Send error:", err);
      }
    },
    [channel, messageComposer, text, manualAttachments]
  );

  return (
    <div className="flex flex-col gap-3 p-3 bg-background">
      {isComposingGiphyText && <GiphyBadge />}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Textarea
          placeholder="Reply"
          rows={3}
          className="resize-none rounded-md p-3 text-sm focus:outline-none dark:bg-gray-700"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (messageComposer.textComposer?.setText) {
              messageComposer.textComposer.setText(e.target.value);
            }
          }}
          ref={textareaRef}
          aria-label="Reply input"
        />
        <Button
          variant="secondary"
          type="submit"
          disabled={!hasSendableData}
          aria-label="Send reply"
        >
          <PaperPlaneTiltIcon weight="fill" className="size-4 fill-gray-600" />
        </Button>
      </form>
    </div>
  );
};
