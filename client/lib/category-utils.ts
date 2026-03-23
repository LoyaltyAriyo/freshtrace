export type CategorySeed = {
  name: string
  shelfLifeDays: number
}

export type CategoryOption = {
  id: string
  name: string
  shelfLifeDays?: number
}

type CategoryModel = {
  findMany: (args: {
    select: { id: true; name: true; shelfLifeDays: true }
    orderBy: { name: "asc" }
  }) => Promise<CategoryOption[]>
  createMany?: (args: {
    data: CategorySeed[]
  }) => Promise<unknown>
}

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  { name: "Produce", shelfLifeDays: 7 },
  { name: "Dairy", shelfLifeDays: 10 },
  { name: "Meat", shelfLifeDays: 5 },
  { name: "Seafood", shelfLifeDays: 3 },
  { name: "Bakery", shelfLifeDays: 5 },
  { name: "Frozen", shelfLifeDays: 90 },
  { name: "Pantry", shelfLifeDays: 60 },
  { name: "Beverage", shelfLifeDays: 30 },
  { name: "Snacks", shelfLifeDays: 45 },
  { name: "Other", shelfLifeDays: 14 },
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: [
    "apple",
    "avocado",
    "banana",
    "berries",
    "broccoli",
    "carrot",
    "fruit",
    "grape",
    "lettuce",
    "onion",
    "orange",
    "pepper",
    "potato",
    "produce",
    "salad",
    "spinach",
    "tomato",
    "vegetable",
  ],
  dairy: [
    "butter",
    "cheese",
    "cream",
    "dairy",
    "egg",
    "milk",
    "yogurt",
  ],
  meat: [
    "bacon",
    "beef",
    "chicken",
    "ham",
    "meat",
    "pork",
    "sausage",
    "steak",
    "turkey",
  ],
  seafood: [
    "cod",
    "fish",
    "salmon",
    "seafood",
    "shrimp",
    "tilapia",
    "tuna",
  ],
  bakery: [
    "bagel",
    "bakery",
    "bread",
    "bun",
    "cake",
    "croissant",
    "donut",
    "muffin",
    "pastry",
    "roll",
    "tortilla",
  ],
  frozen: [
    "frozen",
    "ice cream",
    "nugget",
    "popsicle",
    "waffle",
  ],
  pantry: [
    "beans",
    "broth",
    "canned",
    "cereal",
    "flour",
    "oil",
    "pasta",
    "pantry",
    "peanut butter",
    "rice",
    "sauce",
    "soup",
    "sugar",
  ],
  beverage: [
    "coffee",
    "drink",
    "juice",
    "soda",
    "tea",
    "water",
  ],
  snacks: [
    "bar",
    "chip",
    "cookie",
    "cracker",
    "granola",
    "nuts",
    "popcorn",
    "pretzel",
    "snack",
  ],
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export async function ensureCategories(categoryModel: CategoryModel) {
  const query: Parameters<CategoryModel["findMany"]>[0] = {
    select: {
      id: true,
      name: true,
      shelfLifeDays: true,
    },
    orderBy: { name: "asc" },
  }

  const existing = await categoryModel.findMany(query)
  if ((existing?.length ?? 0) > 0 || !categoryModel.createMany) {
    return existing ?? []
  }

  await categoryModel.createMany({
    data: DEFAULT_CATEGORIES,
  })

  return (await categoryModel.findMany(query)) ?? []
}

export function findCategoryIdForItemName(
  itemName: string,
  categories: CategoryOption[],
) {
  const normalizedName = normalize(itemName)
  if (!normalizedName) return null

  let bestMatch: { id: string; score: number } | null = null

  for (const category of categories) {
    const normalizedCategoryName = normalize(category.name)
    const keywords = CATEGORY_KEYWORDS[normalizedCategoryName] ?? []

    let score = 0

    if (normalizedName.includes(normalizedCategoryName)) {
      score = Math.max(score, 100 + normalizedCategoryName.length)
    }

    for (const keyword of keywords) {
      if (normalizedName.includes(keyword)) {
        score = Math.max(score, keyword.length)
      }
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = score > 0 ? { id: category.id, score } : bestMatch
    }
  }

  return bestMatch?.id ?? null
}
