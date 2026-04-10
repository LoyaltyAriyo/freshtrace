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
  { name: "Leftover", shelfLifeDays: 3 },
  { name: "Other", shelfLifeDays: 14 },
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: [
    "apple",
    "avocado",
    "banana",
    "berries",
    "blueberry",
    "broccoli",
    "carrot",
    "celery",
    "cherry",
    "corn",
    "cucumber",
    "fruit",
    "garlic",
    "grape",
    "kale",
    "lemon",
    "lettuce",
    "lime",
    "mango",
    "mushroom",
    "onion",
    "orange",
    "peach",
    "pear",
    "peas",
    "pepper",
    "pineapple",
    "potato",
    "produce",
    "raspberry",
    "salad",
    "spinach",
    "strawberry",
    "tomato",
    "vegetable",
    "zucchini",
    "zuchinni",
    "brussel",
    "brussels",
    "sprout",
    "snow pea",
    "cavendish",
    "iceberg",
    "sweet potato",
    "yam",
    "cabbage",
    "cauliflower",
    "asparagus",
    "beet",
    "radish",
    "artichoke",
    "eggplant",
    "bok choy",
    "leek",
    "squash",
    "watermelon",
    "cantaloupe",
    "plum",
    "apricot",
    "nectarine",
    "fig",
    "pomegranate",
    "kiwi",
  ],
  dairy: [
    "butter",
    "cheddar",
    "cheese",
    "cottage cheese",
    "cream",
    "dairy",
    "egg",
    "half and half",
    "milk",
    "mozzarella",
    "parmesan",
    "sour cream",
    "whipping cream",
    "yogurt",
    "kefir",
    "brie",
    "feta",
    "ricotta",
    "gouda",
    "provolone",
  ],
  meat: [
    "bacon",
    "beef",
    "chicken",
    "chorizo",
    "ground beef",
    "ham",
    "hot dog",
    "lamb",
    "meat",
    "pepperoni",
    "pork",
    "salami",
    "sausage",
    "steak",
    "turkey",
    "veal",
    "rib",
    "sirloin",
    "brisket",
    "chuck",
    "wings",
    "drumstick",
    "tenderloin",
    "mince",
  ],
  seafood: [
    "clam",
    "cod",
    "crab",
    "fish",
    "halibut",
    "lobster",
    "mahi",
    "oyster",
    "salmon",
    "scallop",
    "seafood",
    "shrimp",
    "tilapia",
    "tuna",
    "sardine",
    "anchovy",
    "mackerel",
    "snapper",
    "bass",
    "trout",
  ],
  bakery: [
    "bagel",
    "baguette",
    "bakery",
    "bread",
    "brownie",
    "bun",
    "cake",
    "croissant",
    "donut",
    "flatbread",
    "muffin",
    "naan",
    "pastry",
    "pita",
    "roll",
    "sourdough",
    "tortilla",
    "loaf",
    "wrap",
    "english muffin",
    "scone",
  ],
  frozen: [
    "burrito",
    "edamame",
    "frozen",
    "fries",
    "ice cream",
    "nugget",
    "pizza",
    "popsicle",
    "veggie burger",
    "waffle",
  ],
  pantry: [
    "beans",
    "broth",
    "canned",
    "cereal",
    "flour",
    "herb",
    "honey",
    "jam",
    "jelly",
    "ketchup",
    "mayo",
    "mayonnaise",
    "mustard",
    "oil",
    "pasta",
    "pantry",
    "peanut butter",
    "pickle",
    "relish",
    "rice",
    "salt",
    "sauce",
    "soup",
    "soy sauce",
    "spice",
    "sugar",
    "vinegar",
  ],
  beverage: [
    "beer",
    "coffee",
    "drink",
    "juice",
    "lemonade",
    "pop",
    "smoothie",
    "soda",
    "sparkling",
    "tea",
    "water",
    "wine",
    "kombucha",
    "energy drink",
    "protein shake",
    "almond milk",
    "oat milk",
  ],
  snacks: [
    "bar",
    "candy",
    "chip",
    "chocolate",
    "cookie",
    "cracker",
    "dried fruit",
    "granola",
    "gummy",
    "jerky",
    "nuts",
    "popcorn",
    "pretzel",
    "snack",
    "trail mix",
  ],
  leftover: [
    "cooked",
    "homemade",
    "leftover",
    "meal prep",
    "prepared",
    "reheated",
    "remaining",
    "takeout",
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

function matchesWordBoundary(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`)
  return pattern.test(text)
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
      if (matchesWordBoundary(normalizedName, keyword)) {
        score = Math.max(score, keyword.length * 2)
      } else if (normalizedName.includes(keyword)) {
        score = Math.max(score, keyword.length)
      }
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = score > 0 ? { id: category.id, score } : bestMatch
    }
  }

  return bestMatch?.id ?? null
}
