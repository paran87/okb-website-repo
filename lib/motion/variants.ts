import type { Transition, Variants } from "framer-motion";

/**
 * Centralized Framer Motion presets. Subtle, professional, and consistent across
 * the app. Components honor `prefers-reduced-motion` via the wrappers in
 * `components/ui/motion.tsx`.
 */

export const transitions = {
  fast: { duration: 0.15, ease: "easeOut" },
  base: { duration: 0.22, ease: "easeOut" },
  slow: { duration: 0.35, ease: "easeInOut" },
  spring: { type: "spring", stiffness: 320, damping: 30 },
} satisfies Record<string, Transition>;

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
  exit: { opacity: 0, transition: transitions.fast },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, y: 12, transition: transitions.fast },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, y: -12, transition: transitions.fast },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: transitions.base },
  exit: { opacity: 0, x: -16, transition: transitions.fast },
};

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitions.base },
  exit: { opacity: 0, scale: 0.96, transition: transitions.fast },
};

export const notificationVariants: Variants = {
  hidden: { opacity: 0, x: 40, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1, transition: transitions.spring },
  exit: { opacity: 0, x: 40, scale: 0.95, transition: transitions.fast },
};

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, y: -8, transition: transitions.fast },
};

/** Container that staggers its children. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

export const hoverLift = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.98 },
  transition: transitions.fast,
};
