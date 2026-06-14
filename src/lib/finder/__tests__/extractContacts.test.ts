import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  classifyPhoneType,
  extractPhone,
  extractEmail,
  extractWebsite,
  extractContacts,
} from "../extractContacts";

describe("normalizePhone", () => {
  it.each([
    ["0171 1234567", "+491711234567"],
    ["0171/1234567", "+491711234567"],
    ["0171-1234567", "+491711234567"],
    ["+49 171 1234567", "+491711234567"],
    ["+49 (0)171 1234567", "+491711234567"],
    ["0049 171 1234567", "+491711234567"],
    ["+49.171.1234567", "+491711234567"],
    ["0511 660216", "+49511660216"],
    ["0511 / 660216", "+49511660216"],
    ["(0671) 123456", "+4967112 3456".replace(/\s/g, "")],
    ["030 1234567", "+49301234567"],
    ["+49 (0)30 1234567", "+49301234567"],
    ["Tel. 0211 1234567", "+492111234567"],
  ])("normalisiert %s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("verwirft zu kurze/leere/unplausible Eingaben", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("12345")).toBeNull(); // zu kurz
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("0")).toBeNull();
  });
});

describe("classifyPhoneType", () => {
  it.each([
    ["+491711234567", "mobile"],
    ["0171 1234567", "mobile"],
    ["0151 12345678", "mobile"],
    ["0160 1234567", "mobile"],
    ["+49 176 11111111", "mobile"],
    ["+49511660216", "landline"],
    ["030 1234567", "landline"],
    ["0211 1234567", "landline"],
    ["+49 (0)30 1234567", "landline"],
  ] as const)("%s → %s", (input, expected) => {
    expect(classifyPhoneType(input)).toBe(expected);
  });

  it("null bei leer", () => {
    expect(classifyPhoneType(null)).toBeNull();
  });
});

describe("extractPhone (Freitext)", () => {
  it("findet Nummer mit Tel.-Präfix", () => {
    expect(
      extractPhone("Bei Fragen Herr Müller, Tel. 0511 / 660216 anrufen."),
    ).toBe("+49511660216");
  });

  it("bevorzugt tel:-Links", () => {
    expect(extractPhone('<a href="tel:+49 171 1234567">anrufen</a>')).toBe(
      "+491711234567",
    );
  });

  it("findet Mobilnummer im Fließtext", () => {
    expect(
      extractPhone("Rückruf erwünscht unter 0171-2345678, danke!"),
    ).toBe("+491712345678");
  });

  it("ignoriert Datumsangaben", () => {
    expect(extractPhone("Bewerbungsschluss ist der 01.07.2024.")).toBeNull();
    expect(extractPhone("Start 15/03/24 möglich")).toBeNull();
  });

  it("matcht keine Postleitzahl", () => {
    expect(extractPhone("Standort: 30159 Hannover")).toBeNull();
  });

  it("null wenn keine Nummer da ist", () => {
    expect(extractPhone("Wir suchen einen Dachdecker (m/w/d).")).toBeNull();
  });
});

describe("extractEmail", () => {
  it("findet Klartext-E-Mail", () => {
    expect(extractEmail("Bewerbung an info@dach-daris.de senden")).toBe(
      "info@dach-daris.de",
    );
  });

  it("liest mailto: und lowercased", () => {
    expect(extractEmail('href="mailto:Bewerbung@Elektro-Schmidt.DE"')).toBe(
      "bewerbung@elektro-schmidt.de",
    );
  });

  it("ignoriert Asset-/Platzhalter-Adressen", () => {
    expect(extractEmail("logo@2x.png im Header")).toBeNull();
    expect(extractEmail("kontakt@example.com")).toBeNull();
  });

  it("null ohne E-Mail", () => {
    expect(extractEmail("kein kontakt hier")).toBeNull();
  });
});

describe("extractWebsite", () => {
  it("findet http(s)-URL und trimmt Satzzeichen", () => {
    expect(
      extractWebsite("Mehr unter https://www.firma.de/karriere."),
    ).toBe("https://www.firma.de/karriere");
  });

  it("ergänzt https:// bei www.-Form", () => {
    expect(extractWebsite("siehe www.dach-daris.de")).toBe(
      "https://www.dach-daris.de",
    );
  });

  it("leitet Domain aus Firmen-E-Mail ab", () => {
    expect(
      extractWebsite("Schreiben Sie an info@dach-daris.de", "info@dach-daris.de"),
    ).toBe("https://dach-daris.de");
  });

  it("leitet KEINE Website aus Freemail ab", () => {
    expect(extractWebsite("bewerbung@gmail.com", "bewerbung@gmail.com")).toBeNull();
    expect(extractWebsite("max@web.de", "max@web.de")).toBeNull();
  });

  it("URL schlägt E-Mail-Ableitung", () => {
    expect(
      extractWebsite(
        "https://echte-firma.de und info@andere-firma.de",
        "info@andere-firma.de",
      ),
    ).toBe("https://echte-firma.de");
  });
});

describe("extractContacts (realistische BA-Stellenbeschreibungen)", () => {
  it("zieht Telefon+E-Mail+Website aus einem Block", () => {
    const text =
      "Wir suchen einen Dachdecker (m/w/d). Bewerbungen an Herrn Daris, " +
      "Tel. 0171/2345678, per Mail info@dach-daris.de. Mehr unter www.dach-daris.de";
    expect(extractContacts(text)).toEqual({
      phone: "+491712345678",
      phoneType: "mobile",
      email: "info@dach-daris.de",
      website: "https://www.dach-daris.de",
    });
  });

  it("leitet Website aus E-Mail ab, wenn keine URL im Text steht", () => {
    const text =
      "Kontakt: bewerbung@elektro-schmidt.de, Festnetz 0211 1234567";
    expect(extractContacts(text)).toEqual({
      phone: "+492111234567",
      phoneType: "landline",
      email: "bewerbung@elektro-schmidt.de",
      website: "https://elektro-schmidt.de",
    });
  });

  it("keine Website aus Freemail, Mobil erkannt", () => {
    const text = "Bewerbung an max.mustermann@web.de, mobil 0151 12345678";
    expect(extractContacts(text)).toEqual({
      phone: "+4915112345678",
      phoneType: "mobile",
      email: "max.mustermann@web.de",
      website: null,
    });
  });

  it("leerer/contactloser Text → alles null", () => {
    expect(extractContacts("Vollzeit, unbefristet, ab sofort.")).toEqual({
      phone: null,
      phoneType: null,
      email: null,
      website: null,
    });
  });
});
