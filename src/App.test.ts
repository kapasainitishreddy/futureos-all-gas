import { describe, expect, it } from "vitest";
import { progressFor } from "./App";

describe("progressFor", () => {
  it("weights partial days as half evidence", () => {
    expect(progressFor({ days: 10 }, { done: 2, partial: 2 })).toBe(30);
  });

  it("never exceeds one hundred percent", () => {
    expect(progressFor({ days: 2 }, { done: 9, partial: 0 })).toBe(100);
  });
});
