export type Saree = {
  id: string;
  sku: string;
  title: string;
  fabric: string;
  origin: string;
  shortDescription: string;
  detailedDescription: string;
  basePrice: number;
  costPrice: number;
  cover: string;
  gallery: string[];
  procurementDays: string;
  inventoryQuantity: number;
};

export function pricingTier(quantity: number): { label: string; tone: string } {
  if (quantity >= 100) return { label: "Wholesale Pro", tone: "gradient-gold text-accent-foreground" };
  if (quantity >= 50) return { label: "Bulk Tier III", tone: "bg-primary text-primary-foreground" };
  if (quantity >= 25) return { label: "Bulk Tier II", tone: "bg-primary/80 text-primary-foreground" };
  if (quantity >= 10) return { label: "Bulk Tier I", tone: "bg-accent/30 text-foreground" };
  if (quantity >= 5) return { label: "Small Bulk", tone: "bg-secondary text-foreground" };
  return { label: "Retail", tone: "bg-muted text-muted-foreground" };
}
