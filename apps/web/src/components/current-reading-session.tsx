import { PauseIcon, PlayIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useReadingSessionStore } from "@/store/reading-session";
import { useEffect, useState } from "react";
import { useSidebar } from "./ui/sidebar";
import { cn } from "@/lib/utils";
import { getReadingTime } from "@/lib/reading-session";
import { FinishReadingSession } from "./finish-reading-session";
import { AnimatePresence, motion } from "motion/react";
import { ReadingTimer } from "./reading-timer";
import { AbandonReadingSession } from "./abandon-reading-session";

function PauseReadingSession() {
  const pause = useReadingSessionStore((state) => state.pause);

  return (
    <Button onClick={pause}>
      <PauseIcon /> Pause
    </Button>
  );
}

function ContinueReadingSession() {
  const play = useReadingSessionStore((state) => state.play);

  return (
    <Button onClick={play}>
      <PlayIcon /> Continue
    </Button>
  );
}

export function CurrentReadingSession() {
  const { open, isMobile } = useSidebar();
  const session = useReadingSessionStore((state) => state.session);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!session || session.paused) return;

    const intervalId = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [session]);

  const readingTime = getReadingTime(session);

  return (
    <div
      className={cn(
        "fixed bottom-safe left-safe right-safe p-2 md:transition-[padding] duration-200 ease-linear",
        !isMobile && open && "pl-64",
      )}
    >
      <AnimatePresence>
        {session && (
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            className="border border-primary rounded-lg px-3 py-4 shadow-md grid grid-cols-1 gap-2.5 bg-background"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5 items-start">
                <p className="text-sm text-foreground leading-tight">
                  {session.book.title}
                </p>
                <ReadingTimer time={readingTime} />
              </div>
              {!session.paused && <PauseReadingSession />}
            </div>
            {session.paused && (
              <div className="flex items-center justify-between gap-2">
                <ContinueReadingSession />
                <FinishReadingSession />
                <AbandonReadingSession />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
