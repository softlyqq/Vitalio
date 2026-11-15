import { describe, expect, it } from "vitest";
import { parseMealDescription } from "@/lib/ai-food-parser";

describe("parseMealDescription", () => {
  it("розпізнає декілька страв із кількостями у штуках та грамах", () => {
    const items = parseMealDescription("2 яйця, 1 тост цільнозернового хліба, 70 г авокадо та латте");
    const ids = items.map((i) => i.food.id);
    expect(ids).toContain("egg-boiled");
    expect(ids).toContain("bread-wholegrain");
    expect(ids).toContain("avocado");
    expect(ids).toContain("latte");

    const eggs = items.find((i) => i.food.id === "egg-boiled");
    expect(eggs?.grams).toBe(100);
  });

  it("повертає порожній масив для порожнього рядка", () => {
    expect(parseMealDescription("   ")).toEqual([]);
  });
});
