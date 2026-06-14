import { describe, it, expect } from "vitest";
import { matchMove } from "../matcher";

describe("matchMove — Live-Feedback-Kern", () => {
  it("erkennt mehrwortige Einwände im rollenden Transkript", () => {
    // „keine zeit" wird über das rollende Transkript zusammenhängend.
    const m = matchMove("ja also ich habe gerade keine zeit dafür ehrlich gesagt");
    expect(m?.id).toBe("no_time");
  });

  it("erkennt kein-Interesse", () => {
    expect(matchMove("nee kein interesse danke")?.id).toBe("no_interest");
  });

  it("echter Einwand schlägt Signal-Floskel im selben Satz", () => {
    // „klingt gut" (Signal-ähnlich) + „keine zeit" (Einwand) → Einwand gewinnt.
    const m = matchMove("ja das klingt erstmal gut, aber ich hab gerade keine zeit");
    expect(m?.kind).toBe("objection");
    expect(m?.id).toBe("no_time");
  });

  it("verneinter Abschluss wird NICHT als Abschluss gewertet", () => {
    const m = matchMove("nee das machen wir nicht");
    expect(m?.kind).not.toBe("closing");
  });

  it("echte Terminzusage wird als Abschluss erkannt", () => {
    expect(matchMove("ok dann machen wir einen termin")?.kind).toBe("closing");
  });

  it("leeres Transkript → null", () => {
    expect(matchMove("")).toBeNull();
    expect(matchMove("   ")).toBeNull();
  });
});
