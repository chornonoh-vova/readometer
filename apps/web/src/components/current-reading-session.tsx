import { PauseIcon, PlayIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  useReadingSessionStore,
  type ReadingSessionState,
} from "@/store/reading-session";
import { useEffect, useState } from "react";
import { useSidebar } from "./ui/sidebar";
import { cn } from "@/lib/utils";
import { FinishReadingSession } from "./finish-reading-session";
import { AnimatePresence, motion } from "motion/react";
import { ReadingTimer } from "./reading-timer";
import { AbandonReadingSession } from "./abandon-reading-session";

function getReadingTime(session: ReadingSessionState["session"]) {
  if (!session) return 0;

  if (session.paused) return session.readTime;

  const lastContinuedAt = session.lastContinuedAt
    ? new Date(session.lastContinuedAt)
    : new Date(session.startedAt);

  const current = new Date();

  return (
    session.readTime +
    (current.getTime() / 1000 - lastContinuedAt.getTime() / 1000)
  );
}

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
  const [readingTime, setReadingTime] = useState(() => getReadingTime(session));

  useEffect(() => {
    const intervalId = setInterval(() => {
      setReadingTime(getReadingTime(session));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [session]);

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
              <div className="grid grid-cols-1 gap-0.5">
                <p className="text-foreground leading-tight">
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
