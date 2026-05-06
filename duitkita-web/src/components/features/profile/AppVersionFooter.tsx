const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

export function AppVersionFooter() {
  return (
    <p className="text-center text-[11px] text-muted-foreground pt-2">
      DuitKita · v{APP_VERSION}
    </p>
  );
}
