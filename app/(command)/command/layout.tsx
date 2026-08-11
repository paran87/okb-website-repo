import { CommandShell } from "@/components/layout/command-shell";

/** Authenticated route group layout — delegates to the design-system AppShell. */
export default function CommandLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <CommandShell>{children}</CommandShell>;
}
