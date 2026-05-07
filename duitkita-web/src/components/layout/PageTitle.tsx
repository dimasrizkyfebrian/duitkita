import type { ReactNode } from "react";

interface PageTitleProps {
  title: string;
  action?: ReactNode;
}

export function PageTitle({ title, action }: PageTitleProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      {action}
    </div>
  );
}
