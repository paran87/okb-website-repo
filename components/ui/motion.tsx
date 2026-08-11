"use client";

import type { ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import {
  fadeVariants,
  pageVariants,
  scaleVariants,
  slideRightVariants,
  slideUpVariants,
  staggerContainer,
} from "@/lib/motion/variants";
import { cn } from "@/utils/cn";

type Direction = "up" | "right";

interface MotionProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
}

function useSafeVariants(variants: Variants): Variants {
  const reduce = useReducedMotion();
  if (!reduce) return variants;
  // Collapse motion to a plain opacity fade when reduced motion is requested.
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.01 } },
    exit: { opacity: 0, transition: { duration: 0.01 } },
  };
}

/** Fade content in on mount. */
export function FadeIn({ children, className, delay, ...props }: MotionProps) {
  const variants = useSafeVariants(fadeVariants);
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      transition={delay ? { delay } : undefined}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Slide + fade content in on mount. */
export function SlideIn({
  children,
  className,
  direction = "up",
  ...props
}: MotionProps & { direction?: Direction }) {
  const source = direction === "right" ? slideRightVariants : slideUpVariants;
  const variants = useSafeVariants(source);
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Scale + fade content in on mount. */
export function ScaleIn({ children, className, ...props }: MotionProps) {
  const variants = useSafeVariants(scaleVariants);
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Stagger a list of children. Pair with <StaggerItem>. */
export function Stagger({ children, className, ...props }: MotionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...props }: MotionProps) {
  const variants = useSafeVariants(slideUpVariants);
  return (
    <motion.div variants={variants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

/** Wrap page content for enter/exit transitions. */
export function PageTransition({ children, className }: MotionProps) {
  const variants = useSafeVariants(pageVariants);
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Subtle hover lift for interactive cards. */
export function HoverLift({ children, className, ...props }: MotionProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
