import { describe, expect, it } from "vitest";
import { BadRequestError } from "@/lib/errors";
import { MAX_PROOF_FILE_BYTES, validateProofFileMeta } from "@/lib/storage";
import { calculateMonthlyFinancialSummary, evaluatePaymentVerification } from "./rules";

describe("Aturan Bisnis Modul Finance & Validasi Upload (modules/finance)", () => {
  it("memvalidasi bukti bayar: menerima jpg/jpeg/png/pdf <= 2 MB dan menolak format/ukuran ilegal", () => {
    expect(
      validateProofFileMeta({ name: "bukti.jpg", type: "image/jpeg", size: 500_000 }),
    ).toBe(".jpg");
    expect(
      validateProofFileMeta({ name: "transfer.pdf", type: "application/pdf", size: 1_500_000 }),
    ).toBe(".pdf");

    // Tolak > 2 MB
    expect(() =>
      validateProofFileMeta({
        name: "besar.png",
        type: "image/png",
        size: MAX_PROOF_FILE_BYTES + 1,
      }),
    ).toThrow(BadRequestError);

    // Tolak ekstensi/MIME bukan gambar/pdf
    expect(() =>
      validateProofFileMeta({
        name: "malware.exe",
        type: "application/octet-stream",
        size: 1024,
      }),
    ).toThrow(BadRequestError);

    // Tolak MIME spoofing (ekstensi .jpg tapi MIME text/html)
    expect(() =>
      validateProofFileMeta({
        name: "palsu.jpg",
        type: "text/html",
        size: 1024,
      }),
    ).toThrow(BadRequestError);
  });

  it("mengevaluasi verifikasi pembayaran DP 50% dan Pelunasan serta menolak overpayment", () => {
    const dpRes = evaluatePaymentVerification({
      invoiceType: "DP_50",
      totalBilled: "2500000.00",
      alreadyPaid: "0.00",
      incomingAmount: "2500000.00",
    });
    expect(dpRes.nextPaymentStatus).toBe("DP_Terbayar");
    expect(dpRes.remainingAfter).toBe("0.00");

    const lunasRes = evaluatePaymentVerification({
      invoiceType: "PELUNASAN",
      totalBilled: "2680000.00",
      alreadyPaid: "0.00",
      incomingAmount: "2680000.00",
    });
    expect(lunasRes.nextPaymentStatus).toBe("Lunas");

    // Nominal melebihi sisa tagihan ditolak
    expect(() =>
      evaluatePaymentVerification({
        invoiceType: "PELUNASAN",
        totalBilled: "1000000.00",
        alreadyPaid: "500000.00",
        incomingAmount: "600000.00",
      }),
    ).toThrow(BadRequestError);
  });

  it("menghitung laporan keuangan bulanan (kas_masuk, kas_keluar, piutang, laba_rugi_bersih)", () => {
    const summary = calculateMonthlyFinancialSummary({
      paymentAmounts: ["4125000.00", "4375000.00", "250000.00"],
      expenseAmounts: ["2080000.00", "250000.00", "640000.00"],
      payrollNetAmounts: ["4800000.00", "650000.00"],
      unpaidInvoices: [
        { total_billed: "2655000.00", paid: "0.00" },
        { total_billed: "1000000.00", paid: "400000.00" },
      ],
    });

    expect(summary.kas_masuk).toBe("8750000.00");
    expect(summary.total_expenses).toBe("2970000.00");
    expect(summary.total_payrolls).toBe("5450000.00");
    expect(summary.kas_keluar).toBe("8420000.00");
    expect(summary.piutang).toBe("3255000.00");
    expect(summary.laba_rugi_bersih).toBe("330000.00");
  });
});
