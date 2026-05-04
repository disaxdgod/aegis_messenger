import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
  invalid?: boolean;
};

function Input({ className, type, invalid, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-invalid={invalid ? "true" : undefined}
      aria-invalid={invalid || undefined}
      className={cn(
        "ds-text-input flex h-11 w-full min-h-11 ds-control-radius border bg-stone-900 px-3.5 py-2.5 text-white outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-neutral-400",
        "border-zinc-800 hover:border-zinc-600 hover:bg-stone-900/90",
        "focus-visible:border-violet-500/50 focus-visible:ring-2 focus-visible:ring-[color:var(--color-ds-focus)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[invalid=true]:border-red-500/75 data-[invalid=true]:bg-red-950/20 data-[invalid=true]:ring-2 data-[invalid=true]:ring-[color:var(--color-ds-danger-soft)]",
        "data-[invalid=true]:hover:border-red-500/90",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
