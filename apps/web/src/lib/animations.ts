import type { Variants } from "motion/react";

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
    },
  },
};

export function listVariants(staggerChildren = 0.05): Variants {
  return { show: { transition: { staggerChildren } } };
}
