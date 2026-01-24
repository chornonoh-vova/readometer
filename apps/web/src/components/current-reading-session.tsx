import { FlagIcon, PauseIcon, PlayIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useReadingSessionStore } from "@/store/reading-session";
import { useEffect, useState } from "react";
import { useSidebar } from "./ui/sidebar";
import { cn } from "@/lib/utils";

export function CurrentReadingSession() {
  const { open, isMobile } = useSidebar();
  const [readingTime, setReadingTime] = useState(0);
  const session = useReadingSessionStore((state) => state.session);
  const pause = useReadingSessionStore((state) => state.pause);
  const play = useReadingSessionStore((state) => state.play);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!session) return;

      if (session.paused) {
        setReadingTime(session.readTime);
        return;
      }

      const lastContinuedAt = session.lastContinuedAt
        ? new Date(session.lastContinuedAt)
        : new Date(session.startedAt);

      const current = new Date();

      setReadingTime(
        session.readTime +
          (current.getTime() / 1000 - lastContinuedAt.getTime() / 1000),
      );
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [session]);

  if (!session) {
    return null;
  }

  const hours = Math.floor(readingTime / (60 * 60));
  const minutes = Math.floor(readingTime / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(readingTime % 60)
    .toString()
    .padStart(2, "0");

  const formattedReadingTime = `${hours ? hours + ":" : ""}${minutes}:${seconds}`;

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
            title="Pause"
            onClick={() => (session.paused ? play() : pause())}
          >
            {session.paused ? <PlayIcon /> : <PauseIcon />}
          </Button>
          <Button variant="ghost" size="icon" title="Finish">
            <FlagIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
