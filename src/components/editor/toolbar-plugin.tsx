"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  PaperclipIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { $createAttachmentNode, AttachmentPayload } from "./attachment-node";

export function ToolbarPlugin({
  onFileUpload,
}: {
  onFileUpload?: (file: File) => Promise<AttachmentPayload>;
}) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
    }
  }, []);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, _newEditor) => {
        updateToolbar();
        return false;
      },
      1,
    );
  }, [editor, updateToolbar]);

  const formatText = (
    format: "bold" | "italic" | "underline" | "strikethrough",
  ) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.formatText(format);
      }
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !onFileUpload) return;

    try {
      const attachmentData = await onFileUpload(file);
      editor.update(() => {
        const attachmentNode = $createAttachmentNode(attachmentData);
        $insertNodes([attachmentNode]);
      });
    } catch (error) {
      console.error("Failed to upload file:", error);
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="sm"
        className={cn("p-2", isBold && "bg-gray-200")}
        onClick={() => formatText("bold")}
        type="button"
      >
        <TextBIcon className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn("p-2", isItalic && "bg-gray-200")}
        onClick={() => formatText("italic")}
        type="button"
      >
        <TextItalicIcon className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn("p-2", isUnderline && "bg-gray-200")}
        onClick={() => formatText("underline")}
        type="button"
      >
        <TextUnderlineIcon className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn("p-2", isStrikethrough && "bg-gray-200")}
        onClick={() => formatText("strikethrough")}
        type="button"
      >
        <TextStrikethroughIcon className="size-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Attachments */}
      <Button
        variant="ghost"
        size="sm"
        className="p-2"
        onClick={openFileDialog}
        type="button"
        disabled={!onFileUpload}
      >
        <PaperclipIcon className="size-4" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        accept="*/*"
      />
    </div>
  );
}
