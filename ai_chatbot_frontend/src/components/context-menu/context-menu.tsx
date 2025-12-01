"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/utils";
import type { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

type Tone = "default" | "danger" | "success" | "warning";

export type ContextMenuActionItem = {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  endIcon?: LucideIcon;
  endContent?: ReactNode;
  tone?: Tone;
  onSelect?: () => void;
  disabled?: boolean;
};

export type ContextMenuDivider = {
  id: string;
  type: "divider";
};

const isActionItem = (
  entry: ContextMenuEntry
): entry is ContextMenuActionItem => !("type" in entry);

export type ContextMenuEntry = ContextMenuActionItem | ContextMenuDivider;

export type ContextMenuProps = {
  trigger: ReactNode;
  items: ContextMenuEntry[];
  title?: string;
  subtitle?: string;
  avatar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const toneClasses: Record<Tone, string> = {
  default: "text-white/90 hover:bg-white/5",
  danger: "text-red-200 hover:bg-red-500/10",
  success: "text-emerald-200 hover:bg-emerald-500/10",
  warning: "text-amber-200 hover:bg-amber-500/10",
};

export const ContextMenu = ({
  trigger,
  items,
  title,
  subtitle,
  avatar,
  footer,
  className,
  align = "center",
  open,
  onOpenChange,
}: ContextMenuProps) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
    <PopoverContent
      align={align}
      matchTriggerWidth
      className={cn("space-y-3", className)}
    >
      {(avatar || title || subtitle) && (
        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
          {avatar}
          <div className="min-w-0">
            {title && (
              <p className="truncate text-sm font-semibold text-white">
                {title}
              </p>
            )}
            {subtitle && (
              <p className="truncate text-xs text-white/50">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1">
        {items.map((entry) => {
          if (!isActionItem(entry)) {
            return <Separator key={entry.id} className="bg-white/10" />;
          }

          const Icon = entry.icon;
          const EndIcon = entry.endIcon;
          const contentTone = entry.tone ?? "default";

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                if (entry.disabled) return;
                entry.onSelect?.();
              }}
              disabled={entry.disabled}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                toneClasses[contentTone],
                entry.disabled && "cursor-not-allowed opacity-40"
              )}
            >
              {Icon && (
                <Icon
                  className={cn("size-4 text-white/80", entry.iconClassName)}
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{entry.label}</p>
                {entry.description && (
                  <p className="text-xs text-white/50">{entry.description}</p>
                )}
              </div>
              {entry.endContent}
              {EndIcon && <EndIcon className="size-4 shrink-0 text-white/40" />}
            </button>
          );
        })}
      </div>

      {footer}
    </PopoverContent>
  </Popover>
);
