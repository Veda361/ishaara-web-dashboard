import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
}

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  const variantStyles = {
    info: "bg-sky-50/80 border-sky-200 text-sky-900",
    success: "bg-emerald-50/80 border-emerald-200 text-emerald-900",
    warning: "bg-amber-50/80 border-amber-200 text-amber-900",
    danger: "bg-rose-50/80 border-rose-200 text-rose-900",
  };

  const icons = {
    info: <Info className="h-4 w-4 text-sky-600 shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
    danger: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 p-4 rounded-xl border text-sm transition-all shadow-xs",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="space-y-1">
        {title && <h5 className="font-semibold leading-tight">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}
