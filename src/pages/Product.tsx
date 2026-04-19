import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";

import { quotePriceApi } from "@/lib/api";
import { pricingTier } from "@/types/saree";
import { useSarees } from "@/context/SareesContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Sparkles, TrendingDown, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function Product() {
  const { id } = useParams();
  const nav = useNavigate();
  const { sarees } = useSarees();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);

  const product = sarees.find((s) => s.id === id);

  useEffect(() => {
    let cancelled = false;

    const getQuote = async () => {
      if (!product) return;
      try {
        const price = await quotePriceApi(product.id, quantity);
        if (!cancelled) setUnitPrice(price);
      } catch {
        if (!cancelled) setUnitPrice(product.basePrice);
      }
    };

    void getQuote();
    return () => {
      cancelled = true;
    };
  }, [product, quantity]);

  if (!product) return <Navigate to="/catalog" replace />;

  const totalPrice = unitPrice * quantity;
  const savedPerUnit = product.basePrice - unitPrice;
  const savingsPct = product.basePrice > 0 ? Math.max(0, Math.round((savedPerUnit / product.basePrice) * 100)) : 0;
  const tier = pricingTier(quantity);

  return (
    <div className="container py-8 md:py-12 animate-fade-in">
      <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-smooth">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Link>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-muted shadow-card">
            <img
              src={product.gallery[activeImg]}
              alt={product.title}
              width={800}
              height={1024}
              className="h-full w-full object-cover transition-opacity duration-300"
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {product.gallery.map((g, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-smooth ${
                  i === activeImg ? "border-primary shadow-elegant" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={g} alt={`view ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{product.fabric} · {product.origin}</div>
          <h1 className="font-display text-3xl md:text-5xl font-semibold leading-tight tracking-tight">{product.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{product.shortDescription}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-accent/50 bg-accent/10 text-foreground">
              <Clock className="h-3 w-3" /> Procurement: {product.procurementDays}
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              <Sparkles className="h-3 w-3 text-accent" /> Handloom certified
            </Badge>
          </div>

          {/* ML pricing widget */}
          <div className="mt-8 p-6 rounded-2xl border border-border/60 bg-card shadow-card">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                ML Dynamic Pricing
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${tier.tone}`}>
                {tier.label}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3 flex-wrap">
              <div className="font-display text-5xl font-semibold text-primary tabular-nums transition-smooth">
                {inr(unitPrice)}
              </div>
              <div className="text-sm text-muted-foreground">per piece</div>
              {savingsPct > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary-glow">
                  <TrendingDown className="h-4 w-4" /> {savingsPct}% off
                </span>
              )}
            </div>
            {savingsPct > 0 && (
              <div className="mt-1 text-sm text-muted-foreground">
                <span className="line-through">{inr(product.basePrice)}</span>
                <span className="ml-2">· you save {inr(savedPerUnit)}/piece</span>
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className="w-24 h-9 text-right font-semibold"
                />
              </div>
              <Slider
                value={[quantity]}
                min={1}
                max={200}
                step={1}
                onValueChange={(v) => setQuantity(v[0])}
                className="my-4"
              />
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>1</span><span>5</span><span>25</span><span>50</span><span>100</span><span>200+</span>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              {[1, 10, 50, 100].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md border transition-smooth ${
                    quantity === q ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Estimated total</div>
                <div className="font-display text-2xl font-semibold tabular-nums">{inr(totalPrice)}</div>
              </div>
              <Button
                size="lg"
                className="gradient-hero text-primary-foreground shadow-elegant hover:opacity-95"
                onClick={() => {
                  if (quantity >= 10) {
                    toast.success(`Bulk quote requested for ${quantity} × ${product.title}`);
                    return;
                  }
                  addItem(product.id, quantity);
                  toast.success(`Added ${quantity} × ${product.title} to cart`, {
                    action: { label: "View cart", onClick: () => nav("/cart") },
                  });
                }}
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                {quantity >= 10 ? "Request bulk quote" : "Add to cart"}
              </Button>
            </div>
          </div>

          {/* Detailed description */}
          <div className="mt-10">
            <h3 className="font-display text-xl font-semibold mb-3">About this saree</h3>
            <p className="text-muted-foreground leading-relaxed">{product.detailedDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
