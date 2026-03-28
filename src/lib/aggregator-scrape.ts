import * as cheerio from "cheerio";

export interface AggregatorUnit {
  size: string;
  price: string | null;
  type: string | null;
}

export interface AggregatorResult {
  name: string;
  address: string | null;
  units: AggregatorUnit[];
  source: string;
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const sizeRe = /(\d{1,2}\s*[x×X]\s*\d{1,3})/;
const priceRe = /\$\s?(\d{1,4}(?:\.\d{2})?)/;

/**
 * Scrape SpareFoot city listing page for competitor pricing data.
 * URL pattern: https://www.sparefoot.com/self-storage/{city}-{state}/
 * Returns empty array on any failure — this is supplementary data.
 */
export async function scrapeSparefoot(
  city: string,
  state: string,
): Promise<AggregatorResult[]> {
  const results: AggregatorResult[] = [];

  try {
    const url = `https://www.sparefoot.com/self-storage/${city}-${state}/`;
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return results;

    const html = await res.text();
    const $ = cheerio.load(html);

    // SpareFoot facility listing cards
    $(
      '[class*="facility"], [class*="listing"], [data-facility], .search-result',
    ).each((_, el) => {
      try {
        const name =
          $(el)
            .find(
              'h2, h3, [class*="name"], [class*="title"], [data-qa*="name"]',
            )
            .first()
            .text()
            .trim() || "";
        if (!name) return;

        const address =
          $(el)
            .find('[class*="address"], [data-qa*="address"], address')
            .first()
            .text()
            .trim() || null;

        const units: AggregatorUnit[] = [];
        const unitSeen = new Set<string>();

        // Look for unit/pricing elements within the facility card
        $(el)
          .find(
            '[class*="unit"], [class*="price"], [class*="size"], [class*="rate"]',
          )
          .each((__, unitEl) => {
            const text = $(unitEl).text();
            const sizeMatch = text.match(sizeRe);
            const priceMatch = text.match(priceRe);
            if (sizeMatch) {
              const key = `${sizeMatch[1]}|${priceMatch?.[1] || ""}`;
              if (!unitSeen.has(key)) {
                unitSeen.add(key);
                units.push({
                  size: sizeMatch[1],
                  price: priceMatch ? `$${priceMatch[1]}` : null,
                  type: null,
                });
              }
            }
          });

        // Also check the full card text for price patterns
        if (units.length === 0) {
          const cardText = $(el).text();
          const priceMatch = cardText.match(priceRe);
          if (priceMatch) {
            units.push({
              size: "unknown",
              price: `$${priceMatch[1]}`,
              type: null,
            });
          }
        }

        results.push({ name, address, units, source: "sparefoot" });
      } catch {
        /* skip malformed card */
      }
    });
  } catch {
    /* SpareFoot scrape failed entirely */
  }

  return results;
}

/**
 * Scrape SelfStorage.com city listing page for competitor pricing data.
 * URL pattern: https://www.selfstorage.com/{state}/{city}/
 * Returns empty array on any failure — this is supplementary data.
 */
export async function scrapeSelfStorage(
  city: string,
  state: string,
): Promise<AggregatorResult[]> {
  const results: AggregatorResult[] = [];

  try {
    const url = `https://www.selfstorage.com/${state}/${city}/`;
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return results;

    const html = await res.text();
    const $ = cheerio.load(html);

    // SelfStorage.com facility listing cards
    $(
      '[class*="facility"], [class*="listing"], [class*="result"], [class*="property"]',
    ).each((_, el) => {
      try {
        const name =
          $(el)
            .find('h2, h3, [class*="name"], [class*="title"]')
            .first()
            .text()
            .trim() || "";
        if (!name) return;

        const address =
          $(el)
            .find('[class*="address"], address')
            .first()
            .text()
            .trim() || null;

        const units: AggregatorUnit[] = [];
        const unitSeen = new Set<string>();

        $(el)
          .find(
            '[class*="unit"], [class*="price"], [class*="size"], [class*="rate"]',
          )
          .each((__, unitEl) => {
            const text = $(unitEl).text();
            const sizeMatch = text.match(sizeRe);
            const priceMatch = text.match(priceRe);
            if (sizeMatch) {
              const key = `${sizeMatch[1]}|${priceMatch?.[1] || ""}`;
              if (!unitSeen.has(key)) {
                unitSeen.add(key);
                units.push({
                  size: sizeMatch[1],
                  price: priceMatch ? `$${priceMatch[1]}` : null,
                  type: null,
                });
              }
            }
          });

        if (units.length === 0) {
          const cardText = $(el).text();
          const priceMatch = cardText.match(priceRe);
          if (priceMatch) {
            units.push({
              size: "unknown",
              price: `$${priceMatch[1]}`,
              type: null,
            });
          }
        }

        results.push({ name, address, units, source: "selfstorage.com" });
      } catch {
        /* skip malformed card */
      }
    });
  } catch {
    /* SelfStorage.com scrape failed entirely */
  }

  return results;
}
