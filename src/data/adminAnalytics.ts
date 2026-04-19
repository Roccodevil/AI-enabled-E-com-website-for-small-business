export const kpis = {
  totalRetailRevenue: 4823500,
  activeConsumers: 12847,
  bulkOrdersThisMonth: 184,
  avgOrderValue: 7820,
  retailGrowth: 12.4,
  bulkGrowth: 28.7,
};

export type BulkOrder = {
  id: string;
  buyer: string;
  company: string;
  email: string;
  phone: string;
  state: string;
  product: string;
  quantity: number;
  totalValue: number;
  status: "Confirmed" | "Processing" | "Shipped" | "Pending";
  date: string;
};

export const bulkOrders: BulkOrder[] = [
  { id: "BLK-2401", buyer: "Rajesh Mehta", company: "Mehta Textiles", email: "rajesh@mehtatextiles.in", phone: "+91 98201 22345", state: "Maharashtra", product: "Banarasi Silk", quantity: 120, totalValue: 591840, status: "Shipped", date: "2025-04-02" },
  { id: "BLK-2402", buyer: "Anita Sharma", company: "Sharma Sarees Co.", email: "anita@sharmasarees.com", phone: "+91 99100 87623", state: "Delhi", product: "Kanjivaram Peacock", quantity: 75, totalValue: 643005, status: "Processing", date: "2025-04-05" },
  { id: "BLK-2403", buyer: "Vikram Patel", company: "Patel Wholesale", email: "vikram@patelwholesale.in", phone: "+91 98250 11234", state: "Gujarat", product: "Patola Magenta", quantity: 60, totalValue: 613440, status: "Confirmed", date: "2025-04-08" },
  { id: "BLK-2404", buyer: "Priya Iyer", company: "South Silk House", email: "priya@southsilk.in", phone: "+91 90030 45678", state: "Tamil Nadu", product: "Chanderi Emerald", quantity: 200, totalValue: 498484, status: "Shipped", date: "2025-04-10" },
  { id: "BLK-2405", buyer: "Suresh Kumar", company: "Kumar Bros", email: "suresh@kumarbros.in", phone: "+91 94120 99887", state: "Uttar Pradesh", product: "Bandhani Sunshine", quantity: 150, totalValue: 304413, status: "Processing", date: "2025-04-12" },
  { id: "BLK-2406", buyer: "Meena Reddy", company: "Reddy Boutiques", email: "meena@reddyboutiques.in", phone: "+91 96760 33421", state: "Telangana", product: "Blush Pearl Georgette", quantity: 45, totalValue: 254925, status: "Pending", date: "2025-04-14" },
  { id: "BLK-2407", buyer: "Arjun Singh", company: "Royal Drapes", email: "arjun@royaldrapes.in", phone: "+91 98711 56432", state: "Rajasthan", product: "Banarasi Silk", quantity: 90, totalValue: 458946, status: "Confirmed", date: "2025-04-15" },
  { id: "BLK-2408", buyer: "Lakshmi Nair", company: "Kerala Looms", email: "lakshmi@keralalooms.in", phone: "+91 94470 22113", state: "Kerala", product: "Kanjivaram Peacock", quantity: 30, totalValue: 285978, status: "Shipped", date: "2025-04-16" },
];

export const stateSales = [
  { state: "UP", fullName: "Uttar Pradesh", retail: 412000, bulk: 680000, customers: 2840 },
  { state: "MH", fullName: "Maharashtra", retail: 538000, bulk: 591000, customers: 3120 },
  { state: "DL", fullName: "Delhi", retail: 489000, bulk: 643000, customers: 2210 },
  { state: "GJ", fullName: "Gujarat", retail: 367000, bulk: 613000, customers: 1980 },
  { state: "TN", fullName: "Tamil Nadu", retail: 421000, bulk: 498000, customers: 2340 },
  { state: "KA", fullName: "Karnataka", retail: 298000, bulk: 312000, customers: 1670 },
  { state: "RJ", fullName: "Rajasthan", retail: 245000, bulk: 459000, customers: 1430 },
  { state: "WB", fullName: "West Bengal", retail: 312000, bulk: 287000, customers: 1820 },
  { state: "TS", fullName: "Telangana", retail: 198000, bulk: 254000, customers: 1240 },
  { state: "KL", fullName: "Kerala", retail: 187000, bulk: 285000, customers: 1080 },
];

export const demographics = [
  { name: "Maharashtra", value: 24, color: "hsl(350 65% 28%)" },
  { name: "Delhi NCR", value: 18, color: "hsl(38 55% 52%)" },
  { name: "Tamil Nadu", value: 16, color: "hsl(350 70% 42%)" },
  { name: "Gujarat", value: 14, color: "hsl(42 70% 65%)" },
  { name: "Uttar Pradesh", value: 12, color: "hsl(350 50% 55%)" },
  { name: "Others", value: 16, color: "hsl(20 8% 42%)" },
];
