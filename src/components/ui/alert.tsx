import * as React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning";
  title?: string;
}

export function Alert({
  className,
  variant = "default",
  title,
  children,
  ...props
}: AlertProps) {
  const variants = {
    default: "bg-slate-50 text-slate-900 border-slate-200",
    destructive: "bg-red-50 text-red-900 border-red-200",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    warning: "bg-amber-50 text-amber-900 border-amber-200"
  };

  const icons = {
    default: <Info className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />,
    destructive: <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 text-sm flex gap-3",
        variants[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1">
        {title && <h5 className="font-semibold leading-none tracking-tight mb-1">{title}</h5>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  );
}

