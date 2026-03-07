"use client";

import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { EditorState, LexicalEditor, SerializedEditorState } from "lexical";
import React, { useEffect } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AttachmentPayload } from "./attachment-node";
import { nodes } from "./nodes";
import { Plugins } from "./plugins";
import { editorTheme } from "./themes/editor-theme";

const editorConfig: InitialConfigType = {
  namespace: "Editor",
  theme: editorTheme,
  nodes,
  onError: (error: Error) => {
    console.error(error);
  },
};

function EditorRefPlugin({
  editorRef,
}: {
  editorRef: React.MutableRefObject<LexicalEditor | null>;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);
  return null;
}

export function Editor({
  className,
  contentClassName,
  placeholderClassName,
  wrapperClassName,
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
  onFileUpload,
  placeholder,
  hideToolbar,
  editorRef,
  children,
}: {
  className?: string;
  contentClassName?: string;
  placeholderClassName?: string;
  wrapperClassName?: string;
  editorState?: EditorState;
  editorSerializedState?: SerializedEditorState;
  onChange?: (editorState: EditorState) => void;
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void;
  onFileUpload?: (file: File) => Promise<AttachmentPayload>;
  placeholder?: string;
  hideToolbar?: boolean;
  editorRef?: React.MutableRefObject<LexicalEditor | null>;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={
        wrapperClassName ??
        "bg-background overflow-hidden rounded-lg border shadow"
      }
    >
      <LexicalComposer
        initialConfig={{
          ...editorConfig,
          ...(editorState ? { editorState } : {}),
          ...(editorSerializedState
            ? { editorState: JSON.stringify(editorSerializedState) }
            : {}),
        }}
      >
        <TooltipProvider>
          <Plugins
            placeholder={placeholder}
            className={className}
            contentClassName={contentClassName}
            placeholderClassName={placeholderClassName}
            onFileUpload={onFileUpload}
            hideToolbar={hideToolbar}
          />

          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(editorState) => {
              onChange?.(editorState);
              onSerializedChange?.(editorState.toJSON());
            }}
          />

          {editorRef && <EditorRefPlugin editorRef={editorRef} />}
          {children}
        </TooltipProvider>
      </LexicalComposer>
    </div>
  );
}
