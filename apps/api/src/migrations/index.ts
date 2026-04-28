import * as createAuthTables from "./20260105144757_create-auth-tables.ts";
import * as createBookTable from "./20260107113140_create-book-table.ts";
import * as createReadingRunTable from "./20260107144320_create-reading-run-table.ts";
import * as createReadingSessionTable from "./20260107150122_create-reading-session-table.ts";
import * as addReadingRunBookIdIdx from "./20260119202051_add-reading-run-bookid-id-idx.ts";
import * as addReadingRunUserIdBookIdIdx from "./20260215075317_add-reading-run-userid-bookid-idx.ts";
import * as addReadingSessionUserIdStartTimeIdx from "./20260301114402_add-reading-session-userid-starttime-idx.ts";
import * as addBookCover from "./20260326140324_add-book-cover.ts";
import * as changePublishDateToVarchar from "./20260428101858_change-publishdate-to-varchar.ts";

export const migrations = {
  "20260105144757_create-auth-tables": createAuthTables,
  "20260107113140_create-book-table": createBookTable,
  "20260107144320_create-reading-run-table": createReadingRunTable,
  "20260107150122_create-reading-session-table": createReadingSessionTable,
  "20260119202051_add-reading-run-bookid-id-idx": addReadingRunBookIdIdx,
  "20260215075317_add-reading-run-userid-bookid-idx":
    addReadingRunUserIdBookIdIdx,
  "20260301114402_add-reading-session-userid-starttime-idx":
    addReadingSessionUserIdStartTimeIdx,
  "20260326140324_add-book-cover": addBookCover,
  "20260428101858_change-publishdate-to-varchar": changePublishDateToVarchar,
};
