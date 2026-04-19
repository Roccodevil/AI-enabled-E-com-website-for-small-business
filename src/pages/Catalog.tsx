import { Link } from "react-router-dom";
import { useSarees } from "@/context/SareesContext";
import { useCart } from "@/context/CartContext";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function Catalog() {
  const { sarees } = useSarees();
  const { addItem } = useCart();
  return (
    <div className="container py-10 md:py-16 animate-fade-in">
      <div className="max-w-3xl mb-12">
        <div className="inline-flex items-center px-3 py-1 mb-4 text-[11px] font-medium uppercase tracking-[0.18em] rounded-full bg-secondary text-muted-foreground">
          Spring / Summer Collection
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-balance">
          Sarees, sourced from <em className="not-italic text-primary">India's master looms</em>.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl">
          Each piece is handpicked from heritage weaving clusters. Shop one, or scale to wholesale — pricing adapts in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {sarees.map((s, i) => (
          <Link
            key={s.id}
            to={`/product/${s.id}`}
            className="group relative bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elegant transition-smooth"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="aspect-[4/5] overflow-hidden bg-muted">
              <img
                src={s.cover}
                alt={s.title}
                loading="lazy"
                width={800}
                height={1024}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur text-[10px] font-medium uppercase tracking-wider text-foreground">
              {s.fabric.split(" ")[0]}
            </div>

            <div className="p-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold leading-tight truncate">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{s.origin}</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">From</span>
                  <span className="font-display text-xl font-semibold text-primary">{inr(s.basePrice)}</span>
                </div>
              </div>
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary group-hover:bg-primary group-hover:text-primary-foreground transition-smooth">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); addItem(s.id, 1); toast.success(`Added "${s.title}" to cart`); }}
              className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-smooth shadow-elegant"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Add
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}
