import saree1 from "@/assets/saree-1.jpg";
import saree2 from "@/assets/saree-2.jpg";
import saree3 from "@/assets/saree-3.jpg";
import saree4 from "@/assets/saree-4.jpg";
import saree5 from "@/assets/saree-5.jpg";
import saree6 from "@/assets/saree-6.jpg";

export type Saree = {
  id: string;
  title: string;
  fabric: string;
  origin: string;
  shortDescription: string;
  detailedDescription: string;
  basePrice: number; // unit price at qty 1
  cover: string;
  gallery: string[];
  procurementDays: string;
};

export const sarees: Saree[] = [
  {
    id: "ban-001",
    title: "Royal Banarasi Silk",
    fabric: "Pure Banarasi Silk",
    origin: "Varanasi, Uttar Pradesh",
    shortDescription: "Handwoven crimson silk with intricate gold zari brocade — a timeless heirloom piece.",
    detailedDescription:
      "Crafted by master weavers in Varanasi over 18 days, this Banarasi silk saree features traditional Mughal-inspired floral motifs woven in pure gold zari. The lustrous finish and deep crimson body make it perfect for weddings and ceremonial occasions. Comes with an unstitched matching blouse piece.",
    basePrice: 8499,
    cover: saree1,
    gallery: [saree1, saree2, saree3, saree6],
    procurementDays: "5–7 days",
  },
  {
    id: "kan-002",
    title: "Kanjivaram Peacock",
    fabric: "Mulberry Silk",
    origin: "Kanchipuram, Tamil Nadu",
    shortDescription: "Royal blue Kanjivaram with peacock-feather motifs and rich gold border.",
    detailedDescription:
      "A South Indian classic — temple-grade mulberry silk woven on traditional pit looms with contrast pallu and zari border. The peacock motifs symbolize grace and prosperity. Heavy weight (~750g), 6.3m length including blouse piece.",
    basePrice: 12999,
    cover: saree2,
    gallery: [saree2, saree1, saree5, saree3],
    procurementDays: "7–10 days",
  },
  {
    id: "cha-003",
    title: "Chanderi Emerald",
    fabric: "Chanderi Silk-Cotton",
    origin: "Chanderi, Madhya Pradesh",
    shortDescription: "Lightweight emerald chanderi with delicate floral booti work — daywear elegance.",
    detailedDescription:
      "Sheer texture, glossy transparency, and feather-light feel make Chanderi the perfect choice for festive daywear. Hand-block printed booties scattered across the body with a contrasting zari border.",
    basePrice: 4299,
    cover: saree3,
    gallery: [saree3, saree6, saree1, saree4],
    procurementDays: "3–5 days",
  },
  {
    id: "geo-004",
    title: "Blush Pearl Georgette",
    fabric: "Georgette with Embroidery",
    origin: "Surat, Gujarat",
    shortDescription: "Soft pink georgette adorned with hand-stitched pearl and sequin floral work.",
    detailedDescription:
      "Modern bridal favorite — flowy georgette base with thread embroidery, real-cut sequins, and pearl beadwork in floral cascades. Pairs beautifully with pastel blouses and minimal jewellery.",
    basePrice: 6799,
    cover: saree4,
    gallery: [saree4, saree3, saree1, saree2],
    procurementDays: "4–6 days",
  },
  {
    id: "pat-005",
    title: "Patola Magenta",
    fabric: "Double Ikat Silk",
    origin: "Patan, Gujarat",
    shortDescription: "Vivid magenta double-ikat Patola — geometric heritage at its finest.",
    detailedDescription:
      "One of India's most labour-intensive weaves. Each thread is dyed before weaving to form geometric motifs that look identical on both sides. A true collector's piece.",
    basePrice: 15499,
    cover: saree5,
    gallery: [saree5, saree2, saree1, saree6],
    procurementDays: "10–14 days",
  },
  {
    id: "ban-006",
    title: "Bandhani Sunshine",
    fabric: "Bandhani Cotton Silk",
    origin: "Jamnagar, Gujarat",
    shortDescription: "Mustard tie-dye Bandhani with crimson dot patterns — vibrant Rajasthani spirit.",
    detailedDescription:
      "Traditional Bandhani technique with thousands of tiny tied knots forming the dot pattern. Breathable cotton-silk blend, perfect for festive afternoons and haldi ceremonies.",
    basePrice: 3499,
    cover: saree6,
    gallery: [saree6, saree3, saree4, saree1],
    procurementDays: "3–5 days",
  },
];

// Mock ML pricing engine — quantity-based tiered discount
export function calcUnitPrice(basePrice: number, quantity: number): number {
  let discount = 0;
  if (quantity >= 100) discount = 0.42;
  else if (quantity >= 50) discount = 0.34;
  else if (quantity >= 25) discount = 0.26;
  else if (quantity >= 10) discount = 0.16;
  else if (quantity >= 5) discount = 0.08;
  return Math.round(basePrice * (1 - discount));
}

export function pricingTier(quantity: number): { label: string; tone: string } {
  if (quantity >= 100) return { label: "Wholesale Pro", tone: "gradient-gold text-accent-foreground" };
  if (quantity >= 50) return { label: "Bulk Tier III", tone: "bg-primary text-primary-foreground" };
  if (quantity >= 25) return { label: "Bulk Tier II", tone: "bg-primary/80 text-primary-foreground" };
  if (quantity >= 10) return { label: "Bulk Tier I", tone: "bg-accent/30 text-foreground" };
  if (quantity >= 5) return { label: "Small Bulk", tone: "bg-secondary text-foreground" };
  return { label: "Retail", tone: "bg-muted text-muted-foreground" };
}

// Admin mock data
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

// State-wise sales data
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
