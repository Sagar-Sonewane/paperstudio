import * as React from "react";
import { cn } from "../../lib/utils.ts";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-slate-900 text-white",
    secondary: "border-transparent bg-slate-100 text-slate-900",
    destructive: "border-transparent bg-red-600 text-white",
    outline: "text-slate-950 border border-slate-300",
    success: "border-transparent bg-emerald-100 text-emerald-800",
    warning: "border-transparent bg-amber-100 text-amber-800"
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

