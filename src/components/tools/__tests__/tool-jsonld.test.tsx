import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "../tool-jsonld";

afterEach(cleanup);

/** Parse the JSON-LD payload out of a rendered structured-data component. */
function parseJsonLd(node: HTMLElement) {
  const script = node.querySelector(
    'script[type="application/ld+json"]',
  ) as HTMLScriptElement | null;
  expect(script).not.toBeNull();
  return JSON.parse(script!.innerHTML);
}

describe("toolBreadcrumb", () => {
  it("builds the Home › Tools › <name> trail", () => {
    const items = toolBreadcrumb(
      "NOI Calculator",
      "https://storageads.com/tools/noi-calculator",
    );
    expect(items).toEqual([
      { name: "Home", url: "https://storageads.com" },
      { name: "Tools", url: "https://storageads.com/tools" },
      {
        name: "NOI Calculator",
        url: "https://storageads.com/tools/noi-calculator",
      },
    ]);
  });
});

describe("BreadcrumbJsonLd", () => {
  it("emits a BreadcrumbList with positioned items", () => {
    const { container } = render(
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "DSCR & Loan Sizing",
          "https://storageads.com/tools/dscr-calculator",
        )}
      />,
    );
    const json = parseJsonLd(container);
    expect(json["@type"]).toBe("BreadcrumbList");
    expect(json.itemListElement).toHaveLength(3);
    expect(json.itemListElement[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://storageads.com",
    });
    expect(json.itemListElement[2]).toMatchObject({
      position: 3,
      name: "DSCR & Loan Sizing",
      item: "https://storageads.com/tools/dscr-calculator",
    });
  });
});

describe("FaqJsonLd", () => {
  it("emits a FAQPage with a question/answer per FAQ", () => {
    const { container } = render(
      <FaqJsonLd
        faqs={[
          { q: "What is NOI?", a: "Net operating income." },
          { q: "What is a cap rate?", a: "NOI as a % of price." },
        ]}
      />,
    );
    const json = parseJsonLd(container);
    expect(json["@type"]).toBe("FAQPage");
    expect(json.mainEntity).toHaveLength(2);
    expect(json.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: "What is NOI?",
      acceptedAnswer: { "@type": "Answer", text: "Net operating income." },
    });
  });
});

describe("ToolJsonLd", () => {
  it("emits a free WebApplication with the provider", () => {
    const { container } = render(
      <ToolJsonLd
        name="NOI Calculator"
        description="Triangulate NOI."
        url="https://storageads.com/tools/noi-calculator"
      />,
    );
    const json = parseJsonLd(container);
    expect(json["@type"]).toBe("WebApplication");
    expect(json.name).toBe("NOI Calculator");
    expect(json.url).toBe("https://storageads.com/tools/noi-calculator");
    expect(json.isAccessibleForFree).toBe(true);
    expect(json.offers).toMatchObject({ price: "0", priceCurrency: "USD" });
    expect(json.provider).toMatchObject({ name: "StorageAds" });
  });
});
