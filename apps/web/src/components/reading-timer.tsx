import { formatReadingTime } from "@/lib/format";
import { AnimatePresence, motion } from "motion/react";

function AnimatedDigit({ value }: { value: string }) {
  return (
    <span className="relative inline-block w-[1ch] h-[1em] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function ReadingTimer({ time }: { time: number }) {
  const readingTime = formatReadingTime(time);
  return (
    <p className="inline-flex items-center tabular-nums">
      {readingTime.split("").map((char, i) => {
        const key = `${char}-${i}`;
        return char === ":" ? (
          <span key={key}>{char}</span>
        ) : (
          <AnimatedDigit key={key} value={char} />
        );
      })}
    </p>
  );
}
