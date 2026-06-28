import { describe, it, expect } from "vitest";
import { pickAccountManager, DEFAULT_ACCOUNT_MANAGER } from "../route";

describe("pickAccountManager", () => {
  it("falls back to the StorageAds default when there is no org", () => {
    expect(pickAccountManager(null)).toEqual({ ...DEFAULT_ACCOUNT_MANAGER });
    expect(pickAccountManager(undefined)).toEqual({ ...DEFAULT_ACCOUNT_MANAGER });
  });

  it("falls back to the default for a non-white-label org", () => {
    expect(
      pickAccountManager({
        name: "Direct Co",
        white_label: false,
        contact_email: "ops@direct.co",
        contact_phone: "555",
      })
    ).toEqual({ ...DEFAULT_ACCOUNT_MANAGER });
  });

  it("falls back when a white-label org is missing a contact email", () => {
    expect(
      pickAccountManager({
        name: "Whitelabel Mgmt",
        white_label: true,
        contact_email: null,
        contact_phone: "555-1212",
      })
    ).toEqual({ ...DEFAULT_ACCOUNT_MANAGER });
  });

  it("uses the white-label org's contact when complete", () => {
    expect(
      pickAccountManager({
        name: "Acme Storage Mgmt",
        white_label: true,
        contact_email: "support@acme.com",
        contact_phone: "(800) 555-0100",
      })
    ).toEqual({
      name: "Acme Storage Mgmt",
      email: "support@acme.com",
      phone: "(800) 555-0100",
      initial: "A",
    });
  });

  it("tolerates a white-label org with no phone (phone is optional)", () => {
    expect(
      pickAccountManager({
        name: "nordic self storage",
        white_label: true,
        contact_email: "hi@nordic.io",
        contact_phone: null,
      })
    ).toEqual({
      name: "nordic self storage",
      email: "hi@nordic.io",
      phone: null,
      initial: "N", // upper-cased from a lower-case org name
    });
  });
});
