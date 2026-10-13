import { CommandWordmark } from "@/components/brand/command-wordmark";

interface AppLogoProps {
  showText?: boolean;
  className?: string;
}

/**
 * DPWH / OKB brand mark using the official Oplan Kontra Baha emblem.
 */
export function AppLogo({ showText = true, className }: AppLogoProps) {
  return (
    <CommandWordmark variant="full" showText={showText} className={className} />
  );
}
