export const books = {
  list: ["books"],
  details: (bookId: string) => [books.list, bookId],
};

export const goals = {
  list: ["goals"],
  progress: (date: string, tz: string) => ["goals", "progress", date, tz],
};

export const readingRuns = {
  list: ["reading-runs"],
  byBook: (bookId: string) => [readingRuns.list, bookId],
};

export const readingSessions = {
  list: ["reading-sessions"],
  byRun: (runId: string) => [readingSessions.list, runId],
};

export const readingActivity = {
  byRange: (from: string, to: string, tz: string) => [
    "reading-activity",
    from,
    to,
    tz,
  ],
};
