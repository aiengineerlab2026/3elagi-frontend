import { describe, expect, it } from "vitest";
import { formatDoctorFee, resolveDoctorFee } from "./fees";

const egyptianDoctor = {
  country: "EG",
  textPriceLocal: 250,
  textPriceUsd: 30,
  videoPriceLocal: 400,
  videoPriceUsd: 50,
};

const jordanianDoctor = {
  country: "JO",
  textPriceLocal: 12,
  textPriceUsd: 40,
  videoPriceLocal: 20,
  videoPriceUsd: 60,
};

describe("doctor fee for the viewing patient", () => {
  it("charges the local price inside the doctor's country", () => {
    expect(resolveDoctorFee(egyptianDoctor, "EG", "text")).toEqual({
      amount: 250,
      currency: "EGP",
    });
    expect(resolveDoctorFee(egyptianDoctor, "EG", "video")).toEqual({
      amount: 400,
      currency: "EGP",
    });
    expect(resolveDoctorFee(jordanianDoctor, "jo", "text")).toEqual({
      amount: 12,
      currency: "JOD",
    });
  });

  it("charges USD everywhere else, including the other market", () => {
    expect(resolveDoctorFee(egyptianDoctor, "JO", "text")).toEqual({
      amount: 30,
      currency: "USD",
    });
    expect(resolveDoctorFee(egyptianDoctor, "SA", "video")).toEqual({
      amount: 50,
      currency: "USD",
    });
    expect(resolveDoctorFee(jordanianDoctor, "EG", "video")).toEqual({
      amount: 60,
      currency: "USD",
    });
  });

  it("treats an unknown viewer country as abroad", () => {
    expect(resolveDoctorFee(egyptianDoctor, null, "text")).toEqual({
      amount: 30,
      currency: "USD",
    });
  });

  it("never quotes local currency outside Egypt or Jordan", () => {
    expect(resolveDoctorFee(egyptianDoctor, "US", "text")).toEqual({
      amount: 30,
      currency: "USD",
    });
    expect(resolveDoctorFee(jordanianDoctor, "DE", "video")).toEqual({
      amount: 60,
      currency: "USD",
    });
  });

  it("returns nothing when the doctor has not set that price", () => {
    expect(resolveDoctorFee({ country: "EG", textPriceUsd: 0 }, "US", "text")).toBeNull();
    expect(formatDoctorFee({ country: "EG" }, "EG", "video")).toBeNull();
    expect(formatDoctorFee(egyptianDoctor, "EG", "text")).toBe("250 EGP");
  });
});
