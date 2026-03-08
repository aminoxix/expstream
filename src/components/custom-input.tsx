"use client";

import { Editor } from "@/components/editor/editor";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useVoiceRecorder,
  type VoiceRecording,
} from "@/hooks/use-voice-recorder";
import { StreamUser } from "@/types";
import { analyzeChatError } from "@/utils/chat-error-handler";
import { getChannelDisplayName, getDisplayName } from "@/utils/helpers";
import { uploadChatFile } from "@/utils/upload-file";
import Picker from "@emoji-mart/react";
import {
  $convertToMarkdownString,
  TEXT_FORMAT_TRANSFORMERS,
} from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  CircleNotchIcon,
  CodeIcon,
  LightningIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  PlusCircleIcon,
  SmileyIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  KEY_ENTER_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type LexicalEditor,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import type { CustomDataManagerState } from "stream-chat";
import {
  useChannelStateContext,
  useChatContext,
  useMessageComposer,
  useMessageComposerHasSendableData,
  useStateStore,
} from "stream-chat-react";
import { CustomPollCreationDialog } from "./poll/dialog";
import { VoiceRecordingInput } from "./voice-recording-ui";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type FormatType = "bold" | "italic" | "strikethrough" | "code";

type FormattingState = Record<FormatType, boolean>;

const DEFAULT_FORMATTING: FormattingState = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
};

interface AttachmentEntry {
  type: string;
  image_url?: string;
  file_url?: string;
  asset_url?: string;
  title?: string;
  mime_type?: string;
  file_size?: number;
  duration?: number;
  waveform_data?: number[];
  [key: string]: string | number | boolean | number[] | undefined;
}

interface UploadedAttachment {
  file: File;
  key: string | null;
  previewUrl: string;
}

const customComposerDataSelector = (state: CustomDataManagerState) => ({
  isComposingGiphyText: state.custom?.command === "giphy",
});

/** Clean markdown output from Lexical editor */
function cleanMarkdownOutput(markdown: string): string {
  return markdown.trim();
}

// ---------------------------------------------------------------------------
// Lexical plugins
// ---------------------------------------------------------------------------

function FormattingTrackerPlugin({
  onFormattingChange,
}: {
  onFormattingChange: (f: FormattingState) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregisterSelection = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          onFormattingChange({
            bold: selection.hasFormat("bold"),
            italic: selection.hasFormat("italic"),
            strikethrough: selection.hasFormat("strikethrough"),
            code: selection.hasFormat("code"),
          });
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    const unregisterUpdate = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => {
          if (!$getRoot().getTextContent().trim()) {
            onFormattingChange(DEFAULT_FORMATTING);
          }
        });
      },
    );

    return () => {
      unregisterSelection();
      unregisterUpdate();
    };
  }, [editor, onFormattingChange]);

  return null;
}

function EnterKeyPlugin({ onSubmit }: { onSubmit: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event && !event.shiftKey) {
          event.preventDefault();
          onSubmit();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onSubmit]);

  return null;
}

function StreamSyncPlugin({
  messageComposer,
}: {
  messageComposer: ReturnType<typeof useMessageComposer>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const markdown = cleanMarkdownOutput(
          $convertToMarkdownString(TEXT_FORMAT_TRANSFORMERS),
        );
        messageComposer.textComposer?.setText?.(markdown);
      });
    });
  }, [editor, messageComposer.textComposer]);

  return null;
}

// ---------------------------------------------------------------------------
// Shared editor helpers
// ---------------------------------------------------------------------------

function useEditorActions(editorRef: React.RefObject<LexicalEditor | null>) {
  const getMarkdown = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return "";
    let text = "";
    editor.getEditorState().read(() => {
      text = cleanMarkdownOutput(
        $convertToMarkdownString(TEXT_FORMAT_TRANSFORMERS),
      );
    });
    return text;
  }, [editorRef]);

  const clear = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createParagraphNode());
    });
  }, [editorRef]);

  const insertText = useCallback(
    (text: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) selection.insertText(text);
      });
      editor.focus();
    },
    [editorRef],
  );

  const dispatchFormat = useCallback(
    (format: FormatType) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
      editor.focus();
    },
    [editorRef],
  );

  return { getMarkdown, clear, insertText, dispatchFormat };
}

// ---------------------------------------------------------------------------
// Attachment helpers
// ---------------------------------------------------------------------------

function getAttachmentType(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function getPreviewAttachments(
  uploaded: UploadedAttachment[],
): AttachmentEntry[] {
  return uploaded.map(({ file, key, previewUrl }) => ({
    type: getAttachmentType(file.type),
    title: file.name,
    image_url: file.type.startsWith("image/") ? previewUrl : undefined,
    _uploading: key === null,
  }));
}

function getSendAttachments(uploaded: UploadedAttachment[]): AttachmentEntry[] {
  return uploaded
    .filter((a) => a.key !== null)
    .map(({ file, key }) => ({
      type: getAttachmentType(file.type),
      title: file.name,
      image_url: file.type.startsWith("image/") ? key! : undefined,
      asset_url: key!,
      mime_type: file.type,
      file_size: file.size,
    }));
}

function AttachmentPreviews({
  attachments,
  onRemove,
}: {
  attachments: AttachmentEntry[];
  onRemove: (index: number) => void;
}) {
  if (!attachments.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment, index) => {
        const att = attachment as AttachmentEntry & {
          localMetadata?: {
            uploadState?: string;
            previewUri?: string;
            file?: File;
          };
          _uploading?: boolean;
        };
        const isAttUploading =
          att.localMetadata?.uploadState === "uploading" || att._uploading;
        const previewUrl =
          attachment.image_url ||
          att.localMetadata?.previewUri ||
          (att.localMetadata?.file?.type?.startsWith("image/")
            ? URL.createObjectURL(att.localMetadata.file)
            : undefined);
        const isImage =
          attachment.type === "image" ||
          att.localMetadata?.file?.type?.startsWith("image/");

        return (
          <div key={index} className="relative group">
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center size-5 bg-gray-800 hover:bg-gray-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove ${attachment.title || "attachment"}`}
            >
              <XIcon className="size-3" weight="bold" />
            </button>
            {isAttUploading && (
              <div className="absolute inset-0 z-[5] flex items-center justify-center rounded bg-white/60">
                <CircleNotchIcon className="size-5 text-gray-500 animate-spin" />
              </div>
            )}
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt={attachment.title || "image"}
                className="w-16 h-16 object-cover rounded border"
              />
            ) : isImage ? (
              <div className="flex items-center justify-center w-16 h-16 rounded border bg-gray-50">
                <CircleNotchIcon className="size-5 text-gray-400 animate-spin" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded border text-sm text-gray-700">
                <span className="truncate">{attachment.title || "File"}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational bits
// ---------------------------------------------------------------------------

const GiphyBadge = () => (
  <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-full">
    <LightningIcon className="w-4 h-4" />
    <span>GIPHY</span>
  </div>
);

// ---------------------------------------------------------------------------
// TeamMessageInput
// ---------------------------------------------------------------------------

export const TeamMessageInput = () => {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const messageComposer = useMessageComposer();
  const hasSendableData = useMessageComposerHasSendableData();
  const { isComposingGiphyText } = useStateStore(
    messageComposer.customDataManager.state,
    customComposerDataSelector,
  );

  const editorRef = useRef<LexicalEditor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [emojiPickerIsOpen, setEmojiPickerIsOpen] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<
    UploadedAttachment[]
  >([]);
  const uploadedAttachmentsRef = useRef(uploadedAttachments);
  uploadedAttachmentsRef.current = uploadedAttachments;

  useEffect(() => {
    return () => {
      uploadedAttachmentsRef.current.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    };
  }, []);

  const [formatting, setFormatting] =
    useState<FormattingState>(DEFAULT_FORMATTING);

  const voiceRecorder = useVoiceRecorder();
  const isVoiceActive = voiceRecorder.state !== "idle";
  const [pendingVoiceRecording, setPendingVoiceRecording] =
    useState<VoiceRecording | null>(null);

  useEffect(() => {
    if (voiceRecorder.state === "stopped" && voiceRecorder.recording) {
      setPendingVoiceRecording(voiceRecorder.recording);
    }
  }, [voiceRecorder.state, voiceRecorder.recording]);

  const { getMarkdown, clear, insertText, dispatchFormat } =
    useEditorActions(editorRef);

  // -- Placeholder ----------------------------------------------------------

  const placeholder = useMemo(() => {
    if (channel.type === "team") {
      return `Message #${getChannelDisplayName(channel) || "random"}`;
    }
    const others = Object.values(channel.state.members).filter(
      ({ user }) => user?.id !== client.user?.id,
    );
    if (!others.length || others.length === 1) {
      const user = others[0]?.user as StreamUser | undefined;
      return `Message ${getDisplayName(user) || "User"}`;
    }
    return "Message the group";
  }, [
    channel.type,
    channel.state.members,
    channel?.data?.id,
    channel?.data?.name,
    client.user?.id,
  ]);

  // -- File uploads ---------------------------------------------------------

  const uploadFiles = useCallback(async (files: File[]) => {
    try {
      setIsUploading(true);
      const newEntries: UploadedAttachment[] = files.map((file) => ({
        file,
        key: null,
        previewUrl: URL.createObjectURL(file),
      }));
      setUploadedAttachments((prev) => [...prev, ...newEntries]);

      const results = await Promise.all(
        files.map((file) => uploadChatFile(file)),
      );

      setUploadedAttachments((prev) =>
        prev.map((entry) => {
          if (entry.key !== null) return entry;
          const idx = files.indexOf(entry.file);
          if (idx === -1 || !results[idx]) return entry;
          return { ...entry, key: results[idx].key };
        }),
      );
      setUploadError(null);
    } catch (err) {
      setUploadedAttachments((prev) => prev.filter((a) => a.key !== null));
      const errorInfo = analyzeChatError(err);
      setUploadError(errorInfo.message);
      toast.error(errorInfo.message);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      accept: {
        "image/*": [],
        "video/*": [],
        "audio/*": [],
        "application/pdf": [".pdf"],
        "application/msword": [".doc"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          [".docx"],
        "application/vnd.ms-excel": [".xls"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "text/*": [],
      },
      multiple: true,
      onDrop: uploadFiles,
    });

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        await uploadFiles(Array.from(e.target.files));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadFiles],
  );

  const handleRemoveAttachment = useCallback((index: number) => {
    setUploadedAttachments((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // -- Emoji ----------------------------------------------------------------

  const handleEmojiSelect = useCallback(
    (e: { native: string }) => {
      insertText(e.native);
      setEmojiPickerIsOpen(false);
    },
    [insertText],
  );

  useEffect(() => {
    if (!emojiPickerIsOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !document.querySelector(".em-emoji-picker")?.contains(e.target as Node)
      ) {
        setEmojiPickerIsOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [emojiPickerIsOpen]);

  // -- Formatting -----------------------------------------------------------

  const activeFormattingValue = useMemo(() => {
    const active = (Object.keys(formatting) as FormatType[]).find(
      (k) => formatting[k],
    );
    return active ?? undefined;
  }, [formatting]);

  // -- Send -----------------------------------------------------------------

  const handleSend = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const text = getMarkdown();
      const attachments: AttachmentEntry[] =
        getSendAttachments(uploadedAttachments);

      if (pendingVoiceRecording) {
        const file = new File(
          [pendingVoiceRecording.blob],
          pendingVoiceRecording.title,
          { type: pendingVoiceRecording.mimeType },
        );
        const { key } = await uploadChatFile(file);
        attachments.push({
          type: "voiceRecording",
          asset_url: key,
          duration: pendingVoiceRecording.durationMs,
          waveform_data: pendingVoiceRecording.waveformData,
          mime_type: pendingVoiceRecording.mimeType,
          file_size: pendingVoiceRecording.blob.size,
          title: pendingVoiceRecording.title,
        });
      }

      if (!text.trim() && !attachments.length) return;

      await channel.sendMessage({ text, attachments });
      clear();
      uploadedAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      setUploadedAttachments([]);
      setPendingVoiceRecording(null);
      voiceRecorder.cancelRecording();
      messageComposer.clear?.();
      setUploadError(null);
    } catch (err) {
      const errorInfo = analyzeChatError(err);
      toast.error(errorInfo.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    channel,
    messageComposer,
    uploadedAttachments,
    pendingVoiceRecording,
    getMarkdown,
    clear,
    isSubmitting,
  ]);

  // -- Poll -----------------------------------------------------------------

  const handleOpenPollDialog = useCallback(
    (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      setPollDialogOpen(true);
      messageComposer.textComposer?.setText?.("");
      clear();
    },
    [messageComposer.textComposer, clear],
  );

  useEffect(() => {
    if (voiceRecorder.error) {
      toast.error(voiceRecorder.error);
    }
  }, [voiceRecorder.error]);

  // -- Render ---------------------------------------------------------------

  const showVoiceUI = isVoiceActive || !!pendingVoiceRecording;
  const hasUploadedFiles = uploadedAttachments.some((a) => a.key !== null);

  const currentAttachments = getPreviewAttachments(uploadedAttachments);

  return (
    <div
      {...getRootProps()}
      className="relative -mt-3 border-t"
      aria-live="polite"
    >
      {isDragActive && (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gray-200/80 dark:bg-gray-800/80 rounded-md ${
            isDragReject
              ? "border-2 border-red-500"
              : "border-2 border-blue-500"
          }`}
        >
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {isDragReject ? "Some files are not accepted" : "Drop files here"}
          </p>
        </div>
      )}

      <div className="flex flex-1 h-full flex-col gap-3 p-3 bg-background">
        {isComposingGiphyText && <GiphyBadge />}
        {uploadError && (
          <span className="text-sm text-red-500">{uploadError}</span>
        )}

        <AttachmentPreviews
          attachments={currentAttachments}
          onRemove={handleRemoveAttachment}
        />

        {showVoiceUI ? (
          <VoiceRecordingInput
            recorder={voiceRecorder}
            onSend={(rec) => {
              setPendingVoiceRecording(rec);
            }}
            onCancel={() => {
              setPendingVoiceRecording(null);
            }}
          />
        ) : (
          <Editor
            hideToolbar
            editorRef={editorRef}
            wrapperClassName="overflow-hidden rounded-md border border-input"
            className="bg-white text-sm"
            contentClassName="min-h-[4.5rem] max-h-40"
            placeholderClassName="text-muted-foreground pointer-events-none absolute top-0 left-0 overflow-hidden px-3 py-2 text-sm text-ellipsis select-none"
            placeholder={placeholder}
          >
            <FormattingTrackerPlugin onFormattingChange={setFormatting} />
            <EnterKeyPlugin onSubmit={handleSend} />
            <StreamSyncPlugin messageComposer={messageComposer} />
          </Editor>
        )}

        {/* Toolbar */}
        <div className="flex justify-between items-center">
          {showVoiceUI ? (
            <div />
          ) : (
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
                onChange={handleFileInputChange}
                aria-label="File input"
              />

              <Separator orientation="vertical" className="h-6" />

              <ToggleGroup
                type="single"
                variant="default"
                className="gap-1"
                value={activeFormattingValue}
                onValueChange={(v) => {
                  if (v) dispatchFormat(v as FormatType);
                }}
                aria-label="Text formatting options"
              >
                <ToggleGroupItem value="bold" aria-label="Toggle bold">
                  <TextBIcon className="size-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="italic" aria-label="Toggle italics">
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
                  onClick={() => setEmojiPickerIsOpen((o) => !o)}
                >
                  <SmileyIcon className="size-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  hidden
                  value="voice"
                  aria-label="Start voice recording"
                  onClick={() => voiceRecorder.startRecording()}
                >
                  <MicrophoneIcon className="size-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          <Button
            variant="secondary"
            type="button"
            onClick={handleSend}
            disabled={
              (!hasSendableData &&
                !pendingVoiceRecording &&
                !hasUploadedFiles) ||
              isSubmitting
            }
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

        <CustomPollCreationDialog
          isOpen={pollDialogOpen}
          onClose={() => setPollDialogOpen(false)}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ThreadMessageInput
// ---------------------------------------------------------------------------

export const ThreadMessageInput = () => {
  const { channel } = useChannelStateContext();
  const messageComposer = useMessageComposer();
  const hasSendableData = useMessageComposerHasSendableData();
  const { isComposingGiphyText } = useStateStore(
    messageComposer.customDataManager.state,
    customComposerDataSelector,
  );

  const editorRef = useRef<LexicalEditor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getMarkdown, clear } = useEditorActions(editorRef);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const text = getMarkdown();

      if (!text.trim()) return;

      await channel.sendMessage({ text });
      clear();
      messageComposer.clear?.();
    } catch (err) {
      const errorInfo = analyzeChatError(err);
      toast.error(errorInfo.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [channel, messageComposer, getMarkdown, clear, isSubmitting]);

  return (
    <div className="flex flex-col gap-3 p-3 bg-background">
      {isComposingGiphyText && <GiphyBadge />}
      <div className="flex items-center gap-2">
        <Editor
          hideToolbar
          editorRef={editorRef}
          wrapperClassName="flex-1 overflow-hidden rounded-md border border-input"
          className="px-3 py-2 text-sm"
          contentClassName="min-h-[4.5rem] max-h-40"
          placeholderClassName="text-muted-foreground pointer-events-none absolute top-0 left-0 overflow-hidden px-3 py-2 text-sm text-ellipsis select-none"
          placeholder="Reply"
        >
          <EnterKeyPlugin onSubmit={handleSubmit} />
          <StreamSyncPlugin messageComposer={messageComposer} />
        </Editor>
        <Button
          variant="secondary"
          type="button"
          onClick={handleSubmit}
          disabled={!hasSendableData || isSubmitting}
          aria-label="Send reply"
        >
          <PaperPlaneTiltIcon weight="fill" className="size-4 fill-gray-600" />
        </Button>
      </div>
    </div>
  );
};
