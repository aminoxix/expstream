import { cn } from "@/lib/utils";
import { TEXT_FORMAT_TRANSFORMERS } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { $insertNodes } from "lexical";
import React, { useCallback, useRef, useState } from "react";
import {
  $createAttachmentNode,
  AttachmentPayload,
  MultiAttachmentPayload,
} from "./attachment-node";
import { ContentEditable } from "./editor-ui/content-editable";
import { ToolbarPlugin } from "./toolbar-plugin";

function DragDropPastePlugin({
  onFileUpload,
}: {
  onFileUpload?: (file: File) => Promise<AttachmentPayload>;
}) {
  const [editor] = useLexicalComposerContext();
  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (!onFileUpload) return;

      const isImage = (filename: string) => {
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
        return imageExtensions.test(filename);
      };

      const imageFiles: File[] = [];
      const nonImageFiles: File[] = [];

      // Separate images from other files
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        if (isImage(file.name)) {
          imageFiles.push(file);
        } else {
          nonImageFiles.push(file);
        }
      }

      // Handle multiple images as a group if more than 1
      if (imageFiles.length > 1) {
        try {
          const imageAttachments = await Promise.all(
            imageFiles.map((file) => onFileUpload(file)),
          );

          editor.update(() => {
            const multiAttachmentData: MultiAttachmentPayload = {
              attachments: imageAttachments,
              isMultiple: true,
            };
            const multiAttachmentNode =
              $createAttachmentNode(multiAttachmentData);
            $insertNodes([multiAttachmentNode]);
          });
        } catch (error: unknown) {
          console.error("Failed to upload images:", error);
        }
      } else if (imageFiles.length === 1) {
        // Handle single image
        try {
          const attachmentData = await onFileUpload(imageFiles[0]!);
          editor.update(() => {
            const attachmentNode = $createAttachmentNode(attachmentData);
            $insertNodes([attachmentNode]);
          });
        } catch (error: unknown) {
          console.error("Failed to upload image:", error);
        }
      }

      // Handle non-image files individually
      for (const file of nonImageFiles) {
        try {
          const attachmentData = await onFileUpload(file);
          editor.update(() => {
            const attachmentNode = $createAttachmentNode(attachmentData);
            $insertNodes([attachmentNode]);
          });
        } catch (error: unknown) {
          console.error("Failed to upload file:", error);
        }
      }
    },
    [editor, onFileUpload],
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer?.items) {
      const hasFiles = Array.from(e.dataTransfer.items).some(
        (item) => item.kind === "file",
      );
      if (hasFiles) {
        setIsDragOver(true);
      }
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await handleFiles(files);
      }
    },
    [handleFiles],
  );

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        await handleFiles(files);
      }
    },
    [handleFiles],
  );

  React.useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    rootElement.addEventListener("dragenter", handleDragEnter);
    rootElement.addEventListener("dragleave", handleDragLeave);
    rootElement.addEventListener("dragover", handleDragOver);
    rootElement.addEventListener("drop", handleDrop);
    rootElement.addEventListener("paste", handlePaste);

    return () => {
      rootElement.removeEventListener("dragenter", handleDragEnter);
      rootElement.removeEventListener("dragleave", handleDragLeave);
      rootElement.removeEventListener("dragover", handleDragOver);
      rootElement.removeEventListener("drop", handleDrop);
      rootElement.removeEventListener("paste", handlePaste);
    };
  }, [
    editor,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handlePaste,
  ]);

  if (!isDragOver) return null;

  return (
    <div className="absolute inset-0 bg-blue-50/80 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center z-10">
      <div className="text-blue-600 font-medium">Drop files here to attach</div>
    </div>
  );
}

export function Plugins({
  className,
  contentClassName,
  placeholderClassName,
  onFileUpload,
  placeholder = "Start Typing...",
  hideToolbar,
}: {
  className?: string;
  contentClassName?: string;
  placeholderClassName?: string;
  onFileUpload?: (file: File) => Promise<AttachmentPayload>;
  placeholder?: string;
  hideToolbar?: boolean;
}) {
  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    // Reference callback for future use
  };

  return (
    <div className="relative">
      {!hideToolbar && <ToolbarPlugin onFileUpload={onFileUpload} />}
      <div
        className={cn(
          "relative flex flex-1 min-h-24 max-h-96 overflow-y-auto",
          contentClassName,
        )}
      >
        <RichTextPlugin
          contentEditable={
            <div ref={onRef} className={cn("flex-1 w-full", className)}>
              <ContentEditable
                className={cn("min-h-24 px-3 py-2", className)}
                placeholder={placeholder}
                placeholderClassName={placeholderClassName}
              />
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <TabIndentationPlugin />
        <MarkdownShortcutPlugin transformers={TEXT_FORMAT_TRANSFORMERS} />
        <DragDropPastePlugin onFileUpload={onFileUpload} />
      </div>
    </div>
  );
}
