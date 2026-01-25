import { FlagIcon, PauseIcon, PlayIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  useReadingSessionStore,
  type ReadingSessionState,
} from "@/store/reading-session";
import { useEffect, useState } from "react";
import { useSidebar } from "./ui/sidebar";
import { cn, formatReadingTime } from "@/lib/utils";
import { FinishReadingSession } from "./finish-reading-session";

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

  if (!session) {
    return null;
  }

  const formattedReadingTime = formatReadingTime(readingTime);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 p-2 md:transition-[padding] md:duration-200 md:ease-linear",
        !isMobile && open && "pl-64",
      )}
    >
      <div className="border rounded-md px-3 py-4 shadow-md flex items-center justify-between bg-background">
        <div className="grid text-sm leading-tight">
          <p className="font-semibold">{session.book.title}</p>
          <p className="text-muted-foreground">{formattedReadingTime}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={session.paused ? "Continue" : "Pause"}
            onClick={() => (session.paused ? play() : pause())}
          >
            {session.paused ? <PlayIcon /> : <PauseIcon />}
          </Button>
          <FinishReadingSession />
        </div>
      </div>
    </div>
  );
}
