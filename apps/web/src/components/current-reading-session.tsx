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

export function CurrentReadingSession() {
  const { open, isMobile } = useSidebar();
  const session = useReadingSessionStore((state) => state.session);
  const pause = useReadingSessionStore((state) => state.pause);
  const play = useReadingSessionStore((state) => state.play);
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
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ y: "100%", opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className={cn(
            "fixed bottom-0 left-0 right-0 p-2 md:transition-[padding] md:duration-200 md:ease-linear",
            !isMobile && open && "pl-64",
          )}
        >
          <div className="border rounded-lg px-3 py-4 shadow-md flex items-center justify-between bg-primary">
            <div className="grid text-sm font-medium leading-tight text-primary-foreground">
              <p className="font-semibold">{session.book.title}</p>
              <ReadingTimer time={readingTime} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon-lg"
                title={session.paused ? "Continue" : "Pause"}
                onClick={() => (session.paused ? play() : pause())}
              >
                {session.paused ? <PlayIcon /> : <PauseIcon />}
              </Button>
              <FinishReadingSession />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
