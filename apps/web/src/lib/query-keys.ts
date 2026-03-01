export const books = {
  list: ["books"],
  details: (bookId: string) => [books.list, bookId],
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
  byYear: (year: number) => ["reading-activity", year],
};
