"use client";

import { DownloadIcon } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import React, { Fragment, useCallback, useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FileTypeIcon = ({ type }: { type: string }) => {
  const icon = type.startsWith("image/")
    ? "\u{1F5BC}\uFE0F"
    : type.startsWith("video/")
      ? "\u{1F3AC}"
      : "\u{1F4C4}";
  return <span className="text-2xl">{icon}</span>;
};

const COMMON_MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export interface MediaItem {
  src: string;
  alt?: string;
  showOverlay?: boolean;
  remainingCount?: number;
}

export interface FileItem {
  src: string;
  name: string;
  type: string;
}

export interface MediaLayoutProps {
  images: string[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  row?: 1;
  gap?: number;
  aspectRatio?: "square" | "video" | "portrait" | "landscape" | "auto";
  className?: string;
  imageClassName?: string;
  enableLightbox?: boolean;
  quality?: "low" | "medium" | "high";
  onDownload?: (url: string) => void;
}

const getFileExtension = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split(".").pop()?.toLowerCase() || "";
  } catch {
    return url.split(".").pop()?.split("?")[0]?.toLowerCase() || "";
  }
};

const getMimeTypeFromUrl = (url: string): string | null => {
  const extension = `.${getFileExtension(url)}`;
  return COMMON_MIME_TYPES[extension] || null;
};

const isImageFile = (url: string): boolean => {
  const extension = getFileExtension(url);
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
    "tiff",
    "tif",
    "ico",
    "avif",
    "heic",
    "heif",
  ];
  if (imageExtensions.includes(extension)) return true;
  const mimeType = getMimeTypeFromUrl(url);
  return mimeType?.startsWith("image/") || false;
};

const getFileNameFromUrl = (url: string): string => {
  const segments = url.split("/");
  return segments[segments.length - 1] || "Unknown file";
};

export const prepareImagesForGrid = (
  attachments: string[],
  maxVisible = 3,
): MediaItem[] => {
  if (!attachments?.length) return [];
  const imageFiles = attachments.filter(isImageFile);
  if (!imageFiles.length) return [];
  const visible = imageFiles.slice(0, maxVisible).map((src) => ({ src }));
  const remaining = imageFiles.length - maxVisible;
  if (remaining > 0 && imageFiles[maxVisible]) {
    visible.push({
      src: imageFiles[maxVisible],
      showOverlay: true,
      remainingCount: remaining,
    } as MediaItem);
  }
  return visible;
};

export const prepareFilesForDownload = (attachments: string[]): FileItem[] => {
  if (!attachments?.length) return [];
  return attachments
    .filter((url) => !isImageFile(url))
    .map((url) => ({
      src: url,
      name: getFileNameFromUrl(url),
      type: getMimeTypeFromUrl(url) || "application/octet-stream",
    }));
};

const FileDownloadCard: React.FC<{
  file: FileItem;
  onDownload?: (url: string) => void;
}> = ({ file, onDownload }) => {
  const handleDownload = () => {
    if (onDownload) {
      onDownload(file.src);
      return;
    }
    const link = document.createElement("a");
    link.href = file.src;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0">
        <FileTypeIcon type={file.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {getFileExtension(file.src).toUpperCase()}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        className="flex items-center gap-1"
      >
        <DownloadIcon className="w-4 h-4" /> Download
      </Button>
    </div>
  );
};

const MediaItemComponent: React.FC<{
  image: MediaItem;
  index: number;
  aspectRatioClass: string;
  qualityClass: string;
  imageClassName?: string;
  loaded: boolean;
  onLoad: (i: number) => void;
  onClick: (i: number) => void;
  layout: "grid" | "row";
}> = ({
  image,
  index,
  aspectRatioClass,
  qualityClass,
  imageClassName,
  loaded,
  onLoad,
  onClick,
  layout,
}) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md cursor-pointer group bg-muted transition-colors hover:bg-muted/80",
      layout === "row" && "flex-shrink-0 w-[162px] h-[108px]",
    )}
    onClick={() => onClick(index)}
    role="button"
    tabIndex={0}
    aria-label={`View media ${index + 1}`}
  >
    <div className={cn(aspectRatioClass, "relative w-full h-full")}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}
      <img
        src={image.src}
        alt={image.alt || `Media ${index + 1}`}
        className={cn(
          "w-full h-full object-cover transition-all duration-300 group-hover:scale-110",
          qualityClass,
          imageClassName,
          !loaded && "opacity-0",
        )}
        loading="lazy"
        onLoad={() => onLoad(index)}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
    </div>
    {image.showOverlay && image.remainingCount !== undefined && (
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
        <span className="text-white text-3xl md:text-4xl font-bold">
          +{image.remainingCount}
        </span>
      </div>
    )}
  </div>
);

export const MediaLayout: React.FC<MediaLayoutProps> = ({
  images,
  columns = 3,
  row,
  gap = 4,
  aspectRatio = "landscape",
  className,
  imageClassName,
  enableLightbox = true,
  quality = "high",
  onDownload,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const gridImages = useMemo(
    () => prepareImagesForGrid(images, columns),
    [images, columns],
  );
  const downloadableFiles = useMemo(
    () => prepareFilesForDownload(images),
    [images],
  );
  const gridColsClass = useMemo(
    () =>
      ({
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-2 lg:grid-cols-4",
        5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
        6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
      })[columns],
    [columns],
  );
  const aspectRatioClass = useMemo(
    () =>
      ({
        square: "aspect-square",
        video: "aspect-video",
        portrait: "aspect-[3/4]",
        landscape: "aspect-[4/3]",
        auto: "",
      })[aspectRatio] ?? "",
    [aspectRatio],
  );
  const qualityClass = useMemo(
    () =>
      ({
        low: "image-rendering-pixelated",
        medium: "image-rendering-auto",
        high: "image-rendering-high-quality",
      })[quality] ?? "",
    [quality],
  );

  const handleImageClick = useCallback(
    (index: number) => {
      if (enableLightbox) {
        setLightboxIndex(index);
        setLightboxOpen(true);
      }
    },
    [enableLightbox],
  );
  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  }, []);
  const layout = row ? "row" : "grid";
  const imageUrls = useMemo(() => images.filter(isImageFile), [images]);

  return (
    <Fragment>
      {gridImages.length > 0 &&
        (layout === "grid" ? (
          <div className={cn("grid", gridColsClass, className)} style={{ gap }}>
            {gridImages.map((image, index) => (
              <MediaItemComponent
                key={`${image.src}-${index}`}
                image={image}
                index={index}
                aspectRatioClass={aspectRatioClass}
                qualityClass={qualityClass}
                imageClassName={imageClassName}
                loaded={loadedImages.has(index)}
                onLoad={handleImageLoad}
                onClick={handleImageClick}
                layout="grid"
              />
            ))}
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center gap-2 overflow-x-auto mx-4",
              className,
            )}
            style={{ gap }}
          >
            {gridImages.map((image, index) => (
              <MediaItemComponent
                key={`${image.src}-${index}`}
                image={image}
                index={index}
                aspectRatioClass={aspectRatioClass}
                qualityClass={qualityClass}
                imageClassName={imageClassName}
                loaded={loadedImages.has(index)}
                onLoad={handleImageLoad}
                onClick={handleImageClick}
                layout="row"
              />
            ))}
          </div>
        ))}
      {downloadableFiles.length > 0 && (
        <div
          className={cn(
            "flex flex-col gap-3",
            gridImages.length > 0 ? "mt-4" : "",
          )}
        >
          {downloadableFiles.map((file, index) => (
            <FileDownloadCard
              key={`${file.src}-${index}`}
              file={file}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
      {enableLightbox && (
        <Lightbox
          open={lightboxOpen}
          index={lightboxIndex}
          close={() => setLightboxOpen(false)}
          slides={imageUrls.map((src) => ({ src }))}
        />
      )}
    </Fragment>
  );
};
