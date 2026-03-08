"use client";

import { Button } from "@/components/ui/button";
import { MediaLayout } from "@/components/ui/media-layout";
import { getFileUrl } from "@/lib/utils";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { DownloadSimpleIcon, XIcon } from "@phosphor-icons/react";
import {
  DecoratorNode,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { ReactNode } from "react";

const FileTypeIcon = ({ type, path }: { type: string; path?: string }) => {
  const ext = path?.split(".").pop()?.toLowerCase() ?? "";
  const icon = type.startsWith("image/")
    ? "\u{1F5BC}\uFE0F"
    : type.startsWith("video/")
      ? "\u{1F3AC}"
      : type === "application/pdf" || ext === "pdf"
        ? "\u{1F4D1}"
        : type.includes("spreadsheet") ||
            ext === "xlsx" ||
            ext === "xls" ||
            ext === "csv"
          ? "\u{1F4CA}"
          : type.includes("word") || ext === "doc" || ext === "docx"
            ? "\u{1F4DD}"
            : "\u{1F4C4}";
  return <span className="text-2xl">{icon}</span>;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (mb >= 1) return `${mb.toFixed(1)}MB`;
  return `${kb.toFixed(1)}KB`;
};

const isImage = (filename: string): boolean => {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
  return imageExtensions.test(filename);
};

export interface AttachmentPayload {
  key: string;
  name: string;
  type: string;
  size?: number;
}

export interface MultiAttachmentPayload {
  attachments: AttachmentPayload[];
  isMultiple: true;
}

export type SerializedAttachmentNode = Spread<
  {
    attachmentData: AttachmentPayload | MultiAttachmentPayload;
  },
  SerializedLexicalNode
>;

export class AttachmentNode extends DecoratorNode<ReactNode> {
  __attachment: AttachmentPayload | MultiAttachmentPayload;

  static getType(): string {
    return "attachment";
  }

  static clone(node: AttachmentNode): AttachmentNode {
    return new AttachmentNode(node.__attachment, node.__key);
  }

  constructor(
    attachmentData: AttachmentPayload | MultiAttachmentPayload,
    key?: NodeKey,
  ) {
    super(key);
    this.__attachment = attachmentData;
  }

  createDOM(): HTMLElement {
    const elem = document.createElement("div");
    elem.className = "attachment-node";
    return elem;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedAttachmentNode): AttachmentNode {
    const { attachmentData } = serializedNode;
    const node = $createAttachmentNode(attachmentData);
    return node;
  }

  exportJSON(): SerializedAttachmentNode {
    return {
      attachmentData: this.__attachment,
      type: "attachment",
      version: 1,
    };
  }

  getAttachmentData(): AttachmentPayload | MultiAttachmentPayload {
    return this.__attachment;
  }

  setAttachmentData(
    attachmentData: AttachmentPayload | MultiAttachmentPayload,
  ): void {
    const writable = this.getWritable();
    writable.__attachment = attachmentData;
  }

  decorate(): ReactNode {
    return <AttachmentComponent node={this} />;
  }
}

function AttachmentComponent({ node }: { node: AttachmentNode }): ReactNode {
  const [editor] = useLexicalComposerContext();
  const attachmentData = node.getAttachmentData();

  const handleRemove = () => {
    editor.update(() => {
      node.remove();
    });
  };

  const handleIndividualRemove = (indexToRemove: number) => {
    editor.update(() => {
      if ("isMultiple" in attachmentData && attachmentData.isMultiple) {
        const updatedAttachments = attachmentData.attachments.filter(
          (_, index) => index !== indexToRemove,
        );

        if (updatedAttachments.length === 0) {
          node.remove();
        } else if (updatedAttachments.length === 1) {
          node.setAttachmentData(updatedAttachments[0]!);
        } else {
          node.setAttachmentData({
            attachments: updatedAttachments,
            isMultiple: true,
          });
        }
      }
    });
  };

  const isReadOnly = !editor.isEditable();
  const FileCard = ({
    attachment,
    onRemove,
  }: {
    attachment: AttachmentPayload;
    onRemove: () => void;
  }) => (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg bg-white shadow-sm my-2 w-full hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 size-6 sm:size-8">
        <FileTypeIcon type={attachment.type} path={attachment.key} />
      </div>
      <div className="flex-1 min-w-0 mr-1">
        <p
          className="text-xs sm:text-sm font-medium truncate"
          title={attachment.name}
        >
          {attachment.name}
        </p>
        {attachment.size && (
          <p className="text-xs text-gray-500">
            {formatFileSize(attachment.size)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href={getFileUrl(attachment.key)}
          target="_blank"
          rel="noopener noreferrer"
          download={attachment.name}
          aria-label={`Download ${attachment.name}`}
        >
          <Button
            variant="ghost"
            size="sm"
            className="p-1 sm:p-1.5 h-auto w-auto hover:bg-gray-200"
            type="button"
          >
            <DownloadSimpleIcon className="size-3 sm:size-4" />
          </Button>
        </a>
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="p-1 sm:p-1.5 h-auto w-auto hover:bg-gray-200 text-red-500 hover:text-red-700"
            onClick={onRemove}
            type="button"
            aria-label={`Remove ${attachment.name}`}
          >
            <XIcon className="size-3 sm:size-4" />
          </Button>
        )}
      </div>
    </div>
  );

  if ("isMultiple" in attachmentData && attachmentData.isMultiple) {
    const imageAttachments = attachmentData.attachments.filter((att) =>
      isImage(att.name),
    );
    const nonImageAttachments = attachmentData.attachments.filter(
      (att) => !isImage(att.name),
    );

    if (imageAttachments.length > 0) {
      if (isReadOnly) {
        const imageUrls = imageAttachments.map((att) => getFileUrl(att.key));
        return (
          <div className="my-2">
            <MediaLayout
              images={imageUrls}
              columns={imageAttachments.length > 4 ? 3 : 2}
              aspectRatio="square"
              className="w-32"
              imageClassName="rounded-lg"
              enableLightbox={true}
            />
          </div>
        );
      } else {
        return (
          <div className="my-2">
            {imageAttachments.map((att) => (
              <FileCard
                key={att.key}
                attachment={att}
                onRemove={() =>
                  handleIndividualRemove(
                    imageAttachments.findIndex((img) => img.key === att.key),
                  )
                }
              />
            ))}
            {nonImageAttachments.map((att) => (
              <FileCard
                key={att.key}
                attachment={att}
                onRemove={() =>
                  handleIndividualRemove(
                    nonImageAttachments.findIndex(
                      (file) => file.key === att.key,
                    ) + imageAttachments.length,
                  )
                }
              />
            ))}
          </div>
        );
      }
    }
  }
  const attachment = attachmentData as AttachmentPayload;
  const fileUrl = getFileUrl(attachment.key);
  const showAsImage = isImage(attachment.name);

  if (showAsImage) {
    if (isReadOnly) {
      return (
        <div className="my-2">
          <MediaLayout
            images={[fileUrl]}
            columns={2}
            aspectRatio="square"
            className="w-32 h-32"
            imageClassName="rounded-lg"
            enableLightbox={true}
          />
        </div>
      );
    } else {
      return <FileCard attachment={attachment} onRemove={handleRemove} />;
    }
  }

  return <FileCard attachment={attachment} onRemove={handleRemove} />;
}

export function $createAttachmentNode(
  attachmentData: AttachmentPayload | MultiAttachmentPayload,
): AttachmentNode {
  return new AttachmentNode(attachmentData);
}

export function $isAttachmentNode(
  node: LexicalNode | null | undefined,
): node is AttachmentNode {
  return node instanceof AttachmentNode;
}
