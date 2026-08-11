"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/utils/cn";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "size-7 text-caption",
  md: "size-9 text-body",
  lg: "size-12 text-subheading",
} as const;

const SIZE_PX = { sm: 28, md: 36, lg: 48 } as const;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** User avatar with graceful fallback to initials. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-semibold text-primary",
        SIZE_CLASSES[size],
        className,
      )}
      aria-label={name}
    >
      {showImage ? (
        <Image
          src={src}
          alt={name}
          width={SIZE_PX[size]}
          height={SIZE_PX[size]}
          className="size-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
