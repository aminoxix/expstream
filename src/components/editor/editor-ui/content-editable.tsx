import { cn } from "@/lib/utils";
import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable";
import { JSX } from "react";

type Props = {
  placeholder: string;
  className?: string;
  placeholderClassName?: string;
};

export function ContentEditable({
  placeholder,
  className,
  placeholderClassName,
}: Props): JSX.Element {
  return (
    <LexicalContentEditable
      className={cn(
        "relative flex-1 p-2 overflow-auto px-8 focus:outline-none",
        className,
      )}
      aria-placeholder={placeholder}
      placeholder={
        <div
          className={
            placeholderClassName ??
            `text-muted-foreground pointer-events-none absolute top-2 left-2 overflow-hidden px-1 py-[18px] text-ellipsis select-none`
          }
        >
          {placeholder}
        </div>
      }
    />
  );
}
