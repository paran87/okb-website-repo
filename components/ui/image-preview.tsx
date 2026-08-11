"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";

interface ImagePreviewProps {
  open: boolean;
  src: string;
  alt?: string;
  caption?: string;
  onClose: () => void;
}

/** Fullscreen image lightbox. */
export function ImagePreview({
  open,
  src,
  alt = "",
  caption,
  onClose,
}: ImagePreviewProps) {
  useEscapeKey(open, onClose);
  useLockBodyScroll(open);

  return (
    <Portal>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
            onClick={onClose}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="absolute right-4 top-4 rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" aria-hidden />
            </button>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-h-[80vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={src}
                alt={alt}
                width={1600}
                height={1200}
                className="max-h-[80vh] w-auto rounded-lg object-contain"
              />
            </motion.div>
            {caption ? (
              <p className="mt-3 text-caption text-white/80">{caption}</p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
