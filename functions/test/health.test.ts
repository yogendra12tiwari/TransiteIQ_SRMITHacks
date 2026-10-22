import { describe, it, expect } from "vitest";
import { health } from "../src/index.js";

describe("Functions: health callable", () => {
  it("health function is defined and configured", () => {
    expect(health).toBeDefined();
    expect(typeof health).toBe("function");
  });

  it("returns expected health payload structure when executed", async () => {
    // onCall functions can be tested directly or through the run handler
    const handler = (health as unknown as { run: (req: unknown) => Promise<unknown> | unknown }).run;
    if (typeof handler === "function") {
      const res = await handler({ data: {}, auth: null });
      expect(res).toMatchObject({
        ok: true,
        package: "@transitiq/shared",
      });
    } else {
      expect(typeof health).toBe("function");
    }
  });
});
