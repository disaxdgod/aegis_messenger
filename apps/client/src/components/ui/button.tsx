import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-normal outline-none",
    "transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out",
    "motion-reduce:transition-none",
    "focus-visible:ring-2 focus-visible:ring-[color:var(--color-ds-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",
    "active:scale-[0.98] motion-reduce:active:scale-100",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
    "touch-manipulation min-h-11",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "ds-control-radius bg-white text-black outline outline-1 outline-offset-[-1px] outline-black",
          "hover:bg-neutral-200 hover:shadow-md",
          "active:bg-neutral-300",
        ].join(" "),
        outline: [
          "ds-control-radius border border-zinc-800 bg-transparent text-white",
          "hover:border-zinc-600 hover:bg-zinc-800/45 hover:shadow-sm",
          "active:bg-zinc-800/70",
        ].join(" "),
        ghost:
          "ds-control-radius text-neutral-300 hover:bg-zinc-800/40 active:bg-zinc-800/60",
        link: "min-h-0 rounded-md px-1 py-0.5 text-base text-white underline underline-offset-4 hover:bg-white/5 hover:text-neutral-100 active:bg-white/10",
      },
      size: {
        default: "h-12 px-4 py-2.5 text-lg",
        sm: "h-10 rounded-md px-3 text-base",
        lg: "h-12 px-6 text-lg xl:h-11 xl:px-5 xl:text-base 2xl:h-10 2xl:text-[0.9375rem]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button };
