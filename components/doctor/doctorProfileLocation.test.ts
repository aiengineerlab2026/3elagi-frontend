import {
  isGoogleMapsUrl,
  parseGoogleMapsInput,
  resolveDoctorLocation,
  googleMapsEmbedHtml,
} from "@/components/doctor/doctorProfileLocation";

const TERRACE_MALL =
  "https://www.google.com/maps/place/Terrace+Mall/@30.1509932,31.6243886,849m/data=!3m3!1e3!4b1!5s0x14581d623fd6fad1:0x5b63faa712f60d7d!4m6!3m5!1s0x14581d626a26013b:0x143b9625471eff7a!8m2!3d30.1509886!4d31.6269635!16s%2Fg%2F11g6b30x65?hl=gl&entry=ttu";

describe("parseGoogleMapsInput", () => {
  it("extracts place name and precise coordinates from a Google Maps place URL", () => {
    const parsed = parseGoogleMapsInput(TERRACE_MALL);
    expect(parsed.isMapsLink).toBe(true);
    expect(parsed.placeName).toBe("Terrace Mall");
    expect(parsed.latitude).toBeCloseTo(30.1509886, 5);
    expect(parsed.longitude).toBeCloseTo(31.6269635, 5);
    expect(parsed.embedQuery).toBe("30.1509886,31.6269635");
    expect(parsed.openUrl).toBe(TERRACE_MALL);
  });

  it("treats plain addresses as searchable text", () => {
    const parsed = parseGoogleMapsInput("Nasr City, Cairo");
    expect(parsed.isMapsLink).toBe(false);
    expect(parsed.embedQuery).toBe("Nasr City, Cairo");
    expect(parsed.displayText).toBe("Nasr City, Cairo");
  });
});

describe("resolveDoctorLocation", () => {
  it("prefers profile Google Maps link over clinic text when clinic location is empty", () => {
    const resolved = resolveDoctorLocation(null, TERRACE_MALL);
    expect(resolved?.address).toBe("Terrace Mall");
    expect(resolved?.mapQuery).toBe("30.1509886,31.6269635");
    expect(resolved?.openUrl).toBe(TERRACE_MALL);
  });

  it("prefers linked clinic location over profile location", () => {
    const resolved = resolveDoctorLocation(
      { id: "1", name: "Dr Clinic", location: TERRACE_MALL },
      "Old profile address",
    );
    expect(resolved?.clinicName).toBe("Dr Clinic");
    expect(resolved?.address).toBe("Terrace Mall");
    expect(resolved?.mapQuery).toBe("30.1509886,31.6269635");
  });
});

describe("isGoogleMapsUrl", () => {
  it("detects google maps hosts", () => {
    expect(isGoogleMapsUrl(TERRACE_MALL)).toBe(true);
    expect(isGoogleMapsUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isGoogleMapsUrl("Nasr City")).toBe(false);
  });
});

describe("googleMapsEmbedHtml", () => {
  it("wraps the embed URL in an iframe for native WebView", () => {
    const html = googleMapsEmbedHtml("30.1509886,31.6269635");
    expect(html).toContain("<iframe");
    expect(html).toContain("output=embed");
    expect(html).toContain("30.1509886%2C31.6269635");
  });
});
