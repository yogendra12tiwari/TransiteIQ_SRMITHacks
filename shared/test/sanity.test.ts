import { describe, it, expect } from "vitest";
import { PACKAGE_NAME } from "../src/index.js";
import { z } from "zod";

describe("shared package sanity", () => {
  it("exports package name", () => {
    expect(PACKAGE_NAME).toBe("@transitiq/shared");
  });

  it("zod validates basic schema", () => {
    const schema = z.object({ ok: z.boolean() });
    expect(schema.parse({ ok: true })).toEqual({ ok: true });
  });
});
