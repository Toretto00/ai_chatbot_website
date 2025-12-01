"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { cn } from "@/utils/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

type PopoverContentProps = React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
> & {
  matchTriggerWidth?: boolean;
};

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(
  (
    {
      className,
      align = "center",
      sideOffset = 4,
      matchTriggerWidth = false,
      style,
      ...props
    },
    ref
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        style={
          matchTriggerWidth
            ? {
                width: "var(--radix-popover-trigger-width)",
                minWidth: "var(--radix-popover-trigger-width)",
                ...style,
              }
            : style
        }
        className={cn(
          "z-50 rounded-3xl border border-white/10 bg-[#111111] p-4 text-sm text-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          !matchTriggerWidth && "w-72",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverContent, PopoverTrigger };
