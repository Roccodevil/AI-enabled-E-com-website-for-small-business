import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createOrderApi, getMyProfileApi, updateMyProfileApi } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useSarees } from "@/context/SareesContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, subtotal, unitPriceFor, lineTotal } = useCart();
  const { sarees, resetSarees } = useSarees();
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const checkoutInFlight = useRef(false);
  const checkoutKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const profile = await getMyProfileApi();
        if (cancelled) return;
        setFullName(profile.fullName ?? "");
        setPhone(profile.phone ?? "");
        setStateName(profile.state ?? "");
        setCity(profile.city ?? "");
        setAddress(profile.address ?? "");
      } catch {
        // noop
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const validateCheckoutDetails = () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    if (!phone.trim()) {
      toast.error("Please enter your contact number");
      return false;
    }
    if (!stateName.trim()) {
      toast.error("Please enter your state");
      return false;
    }
    if (!city.trim()) {
      toast.error("Please enter your city");
      return false;
    }
    if (!address.trim()) {
      toast.error("Please enter your delivery address");
      return false;
    }
    return true;
  };

  const checkout = async () => {
    if (checkoutInFlight.current || isCheckingOut) {
      return;
    }
    if (!validateCheckoutDetails()) {
      return;
    }

    checkoutInFlight.current = true;
    setIsCheckingOut(true);
    checkoutKeyRef.current = checkoutKeyRef.current ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    try {
      await updateMyProfileApi({
        fullName: fullName.trim(),
        phone: phone.trim(),
        state: stateName.trim(),
        city: city.trim(),
        address: address.trim(),
      });

      await createOrderApi(items.map((item) => ({ productId: item.id, quantity: item.quantity })), {
        idempotencyKey: checkoutKeyRef.current,
      });
      clearCart();
      await resetSarees();
      toast.success("Order placed successfully");
      nav("/catalog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      checkoutInFlight.current = false;
      setIsCheckingOut(false);
      checkoutKeyRef.current = null;
    }
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center animate-fade-in">
        <div className="mx-auto h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <ShoppingBag className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="font-display text-3xl font-semibold">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">Discover heritage weaves from our catalog.</p>
        <Button className="mt-6" onClick={() => nav("/catalog")}>Browse catalog</Button>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 animate-fade-in">
      <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-smooth">
        <ArrowLeft className="h-4 w-4" /> Continue shopping
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Your cart</h1>
        <Button variant="ghost" size="sm" onClick={() => { clearCart(); toast.success("Cart cleared"); }}>
          Clear cart
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const s = sarees.find((x) => x.id === item.id);
            if (!s) return null;
            const unit = unitPriceFor(item.id);
            return (
              <Card key={item.id} className="p-4 flex gap-4 border-border/60 shadow-card">
                <Link to={`/product/${s.id}`} className="shrink-0">
                  <img src={s.cover} alt={s.title} className="h-28 w-24 sm:h-32 sm:w-28 object-cover rounded-lg" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/product/${s.id}`} className="font-display text-lg font-semibold hover:text-primary transition-smooth truncate block">
                        {s.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">{s.fabric} · {s.origin}</div>
                    </div>
                    <button
                      onClick={() => { removeItem(item.id); toast.success("Removed from cart"); }}
                      className="shrink-0 h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-smooth"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
                    <div className="inline-flex items-center rounded-md border border-border">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-9 w-9 flex items-center justify-center hover:bg-secondary transition-smooth">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                        className="w-14 h-9 border-0 text-center font-semibold focus-visible:ring-0"
                      />
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-9 w-9 flex items-center justify-center hover:bg-secondary transition-smooth">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">{inr(unit)} / piece</div>
                      <div className="font-display text-lg font-semibold tabular-nums">{inr(lineTotal(item.id))}</div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div>
          <Card className="p-6 border-border/60 shadow-card sticky top-24">
            <h3 className="font-display text-xl font-semibold mb-4">Order summary</h3>
            <div className="space-y-3 mb-5">
              <div className="space-y-2">
                <label htmlFor="checkout-full-name" className="text-xs font-medium text-muted-foreground">Full name</label>
                <Input
                  id="checkout-full-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="checkout-phone" className="text-xs font-medium text-muted-foreground">Contact number</label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="checkout-state" className="text-xs font-medium text-muted-foreground">State</label>
                  <Input
                    id="checkout-state"
                    type="text"
                    placeholder="State"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="checkout-city" className="text-xs font-medium text-muted-foreground">City</label>
                  <Input
                    id="checkout-city"
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="checkout-address" className="text-xs font-medium text-muted-foreground">Delivery address</label>
                <Input
                  id="checkout-address"
                  type="text"
                  placeholder="House no, street, area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{inr(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="text-muted-foreground">Calculated at checkout</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-baseline">
              <span className="text-sm font-medium">Estimated total</span>
              <span className="font-display text-2xl font-semibold tabular-nums">{inr(subtotal)}</span>
            </div>
            <Button
              className="w-full mt-5 gradient-hero text-primary-foreground shadow-elegant hover:opacity-95"
              size="lg"
              onClick={() => {
                void checkout();
              }}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? "Placing order..." : "Confirm and place order"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-3">Delivery details are required and the checkout button is protected from double-click duplicate orders.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
