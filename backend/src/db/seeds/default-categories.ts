import { db } from "../index.js";
import { categories } from "../schema/index.js";

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const defaultCategories = [
  { name: "Food", type: "expense", icon: "food-fork-drink", color: "#FF8A65" },
  { name: "Shopping", type: "expense", icon: "shopping", color: "#BA68C8" },
  { name: "Entertainment", type: "expense", icon: "movie-open", color: "#9575CD" },
  { name: "Education", type: "expense", icon: "school", color: "#7986CB" },
  { name: "Health", type: "expense", icon: "medical-bag", color: "#F06292" },
  { name: "Travel", type: "expense", icon: "airplane", color: "#4FC3F7" },
  { name: "Housing", type: "expense", icon: "home-city", color: "#A1887F" },
  { name: "Transport", type: "expense", icon: "bus", color: "#4DD0E1" },
  { name: "Car", type: "expense", icon: "car", color: "#90A4AE" },
  { name: "Electronics", type: "expense", icon: "laptop", color: "#64B5F6" },
  { name: "Clothing", type: "expense", icon: "tshirt-crew", color: "#CE93D8" },
  { name: "Gifts", type: "expense", icon: "gift", color: "#E57373" },
  { name: "Pets", type: "expense", icon: "paw", color: "#FFB74D" },
  { name: "Repairs", type: "expense", icon: "tools", color: "#78909C" },
  { name: "Sports", type: "expense", icon: "basketball", color: "#81C784" },
  { name: "Donations", type: "expense", icon: "hand-heart", color: "#F48FB1" },
  { name: "Salary", type: "income", icon: "cash-multiple", color: "#54D89A" },
  { name: "Investments", type: "income", icon: "chart-line", color: "#66BB6A" },
  { name: "Bonus", type: "income", icon: "star-circle", color: "#FFD54F" },
  { name: "Return", type: "income", icon: "cash-refund", color: "#26A69A" },
  { name: "Part Time", type: "income", icon: "briefcase-clock", color: "#7E57C2" },
  { name: "Other", type: "income", icon: "dots-horizontal-circle", color: "#8D9AAF" },
] as const satisfies ReadonlyArray<{
  name: string;
  type: "expense" | "income";
  icon: string;
  color: string;
}>;

export async function seedDefaultCategories(
  transaction: DatabaseTransaction,
  userId: string,
) {
  await transaction.insert(categories).values(
    defaultCategories.map((category) => ({
      ...category,
      userId,
      isDefault: true,
    })),
  );
}

