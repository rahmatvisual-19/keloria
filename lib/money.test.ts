import { describe, expect, it } from "vitest";
import {
  addMoney,
  calculateDp50,
  calculateSettlement,
  compareMoney,
  multiplyMoney,
  subtractMoney,
  toDecimalString,
} from "./money";

describe("Utilitas Perhitungan Uang (lib/money.ts)", () => {
  it("menormalisasi angka dan string ke 2 desimal", () => {
    expect(toDecimalString(1250000)).toBe("1250000.00");
    expect(toDecimalString("1250000.5")).toBe("1250000.50");
    expect(toDecimalString("0")).toBe("0.00");
  });

  it("menghitung penjumlahan, pengurangan, dan perkalian tanpa galat floating-point", () => {
    expect(addMoney("0.10", "0.20")).toBe("0.30");
    expect(subtractMoney("1000000.00", "350000.00")).toBe("650000.00");
    expect(multiplyMoney("45000.00", 12)).toBe("540000.00");
  });

  it("menghitung DP 50% dan pelunasan B2B dengan benar", () => {
    const total = "1250001.00";
    const dp = calculateDp50(total);
    expect(dp).toBe("625001.00"); // ROUND(625000.5) = 625001
    expect(calculateSettlement(total, dp, "50000.00")).toBe("675000.00");
  });

  it("membandingkan dua nominal desimal dengan akurat", () => {
    expect(compareMoney("500000.00", "500000")).toBe(0);
    expect(compareMoney("499999.99", "500000.00")).toBe(-1);
    expect(compareMoney("500000.01", "500000.00")).toBe(1);
  });
});
