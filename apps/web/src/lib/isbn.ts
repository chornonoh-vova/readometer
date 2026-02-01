import z from "zod";

export function stripIsbn(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidIsbn10(isbn10: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn10)) return false;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = isbn10[i]!;
    const value = char === "X" ? 10 : Number(char);
    sum += value * (10 - i);
  }

  return sum % 11 === 0;
}

export function isValidIsbn13(isbn13: string): boolean {
  if (!/^\d{13}$/.test(isbn13)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(isbn13[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(isbn13[12]);
}

export function isbn10ToIsbn13(isbn10: string): string {
  const core = "978" + isbn10.slice(0, 9);

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(core[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return core + checkDigit;
}

export const isbnSchema = z
  .string()
  .optional()
  .refine((value) => {
    if (!value) return true;

    const isbn = stripIsbn(value);

    if (isbn.length === 10) {
      return isValidIsbn10(isbn);
    }

    if (isbn.length === 13) {
      return isValidIsbn13(isbn);
    }

    return false;
  }, "Invalid ISBN");
