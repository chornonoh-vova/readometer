import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { call } from "../../test/helpers/request";
import { makeBook, makeUser } from "../../test/helpers/factories";
import { db } from "../lib/database";

async function makeImage(color = { r: 200, g: 100, b: 50 }): Promise<File> {
  const buf = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(buf)], "cover.png", { type: "image/png" });
}

function coversDir(): string {
  return join(process.env.STORAGE_PATH!, "covers");
}

describe("/api/books/:bookId/cover", () => {
  describe("authorization", () => {
    it("POST returns 401 without auth", async () => {
      const form = new FormData();
      form.append("cover", await makeImage());
      const response = await call(
        "POST",
        "/api/books/01999999-9999-7999-8999-999999999999/cover",
        { formData: form },
      );
      expect(response.status).toBe(401);
    });

    it("DELETE returns 401 without auth", async () => {
      const response = await call(
        "DELETE",
        "/api/books/01999999-9999-7999-8999-999999999999/cover",
      );
      expect(response.status).toBe(401);
    });
  });

  describe("POST", () => {
    it("stores two webp variants and updates the book row", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });

      const form = new FormData();
      form.append("cover", await makeImage());

      const response = await call("POST", `/api/books/${book.id}/cover`, {
        as: user,
        formData: form,
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as {
        coverId: string;
        coverColor: string;
      };
      expect(body.coverColor).toMatch(/^#[0-9a-f]{6}$/);

      const sm = join(coversDir(), `${body.coverId}-sm.webp`);
      const md = join(coversDir(), `${body.coverId}-md.webp`);
      expect(existsSync(sm)).toBe(true);
      expect(existsSync(md)).toBe(true);

      const row = await db
        .selectFrom("book")
        .selectAll()
        .where("id", "=", book.id)
        .executeTakeFirstOrThrow();
      expect(row.coverId).toBe(body.coverId);
      expect(row.coverColor).toBe(body.coverColor);
    });

    it("removes the previous files when a cover is replaced", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });

      const firstForm = new FormData();
      firstForm.append("cover", await makeImage({ r: 10, g: 20, b: 30 }));
      const firstResp = await call("POST", `/api/books/${book.id}/cover`, {
        as: user,
        formData: firstForm,
      });
      const first = (await firstResp.json()) as { coverId: string };

      const secondForm = new FormData();
      secondForm.append("cover", await makeImage({ r: 220, g: 30, b: 40 }));
      const secondResp = await call("POST", `/api/books/${book.id}/cover`, {
        as: user,
        formData: secondForm,
      });
      const second = (await secondResp.json()) as { coverId: string };

      expect(second.coverId).not.toBe(first.coverId);
      expect(existsSync(join(coversDir(), `${first.coverId}-sm.webp`))).toBe(
        false,
      );
      expect(existsSync(join(coversDir(), `${first.coverId}-md.webp`))).toBe(
        false,
      );
      expect(existsSync(join(coversDir(), `${second.coverId}-sm.webp`))).toBe(
        true,
      );
    });

    it("returns 400 when the cover field is missing", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });

      const form = new FormData();
      const response = await call("POST", `/api/books/${book.id}/cover`, {
        as: user,
        formData: form,
      });

      expect(response.status).toBe(400);
    });

    it("returns 404 when the book belongs to another user", async () => {
      const user = await makeUser();
      const other = await makeUser();
      const book = await makeBook({ userId: other.id });

      const form = new FormData();
      form.append("cover", await makeImage());
      const response = await call("POST", `/api/books/${book.id}/cover`, {
        as: user,
        formData: form,
      });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE", () => {
    it("removes the cover files and clears the book columns", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });

      const form = new FormData();
      form.append("cover", await makeImage());
      const uploadResp = await call("POST", `/api/books/${book.id}/cover`, {
        as: user,
        formData: form,
      });
      const uploaded = (await uploadResp.json()) as { coverId: string };

      const deleteResp = await call("DELETE", `/api/books/${book.id}/cover`, {
        as: user,
      });
      expect(deleteResp.status).toBe(204);

      expect(
        existsSync(join(coversDir(), `${uploaded.coverId}-sm.webp`)),
      ).toBe(false);
      expect(
        existsSync(join(coversDir(), `${uploaded.coverId}-md.webp`)),
      ).toBe(false);

      const row = await db
        .selectFrom("book")
        .selectAll()
        .where("id", "=", book.id)
        .executeTakeFirstOrThrow();
      expect(row.coverId).toBeNull();
      expect(row.coverColor).toBeNull();
    });

    it("returns 400 when no cover is set", async () => {
      const user = await makeUser();
      const book = await makeBook({ userId: user.id });

      const response = await call("DELETE", `/api/books/${book.id}/cover`, {
        as: user,
      });

      expect(response.status).toBe(400);
    });
  });
});
