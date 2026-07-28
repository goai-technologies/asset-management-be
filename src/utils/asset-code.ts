const ASSET_ID_PREFIX = "AI-";

const CATEGORY_ABBREVIATIONS: Record<string, string> = {
  laptop: "LAP",
  laptops: "LAP",
  keyboard: "KEY",
  keyboards: "KEY",
  mouse: "MOU",
  mice: "MOU",
  monitor: "MON",
  monitors: "MON",
  desktop: "DES",
  desktops: "DES",
  printer: "PRI",
  printers: "PRI",
  mobile: "MOB",
  mobiles: "MOB",
  phone: "MOB",
  phones: "MOB",
  server: "SER",
  servers: "SER",
  router: "ROU",
  routers: "ROU",
  tablet: "TAB",
  tablets: "TAB",
  peripheral: "PER",
  peripherals: "PER",
  "docking station": "DOC",
  furniture: "FUR",
  other: "OTH",
};

export function categoryToAbbreviation(categoryName: string): string {
  const normalized = categoryName.trim().toLowerCase();
  if (!normalized) return "AST";

  if (CATEGORY_ABBREVIATIONS[normalized]) {
    return CATEGORY_ABBREVIATIONS[normalized];
  }

  const firstWord = normalized.split(/\s+/)[0]?.replace(/[^a-z]/g, "") ?? "";
  if (firstWord.length >= 3) {
    return firstWord.slice(0, 3).toUpperCase();
  }
  if (firstWord.length > 0) {
    return firstWord.toUpperCase().padEnd(3, "X");
  }

  const letters = normalized.replace(/[^a-z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "AST").padEnd(3, "X");
}

type AssetCodeSource = {
  asset_code: string;
  category_id: string | null;
};

export function generateCategoryAssetCode(
  _categoryId: string | null,
  categoryName: string,
  existingAssets: AssetCodeSource[],
): string {
  const abbrev = categoryToAbbreviation(categoryName);
  const codePrefix = `${ASSET_ID_PREFIX}${abbrev}`;
  const pattern = new RegExp(`^AI-${abbrev}(\\d{3})$`, "i");

  let maxSequence = 0;
  for (const asset of existingAssets) {
    const match = asset.asset_code.match(pattern);
    if (match) {
      maxSequence = Math.max(maxSequence, Number.parseInt(match[1], 10));
    }
  }

  const nextSequence = maxSequence + 1;
  if (nextSequence > 999) {
    throw new Error(`Asset ID limit reached for category "${categoryName}"`);
  }

  return `${codePrefix}${String(nextSequence).padStart(3, "0")}`;
}
