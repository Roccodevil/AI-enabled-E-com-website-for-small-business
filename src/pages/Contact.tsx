import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactQueryApi } from "@/lib/api";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", inquiryType: "retail" });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please complete the required fields");
      return;
    }
    setSending(true);
    try {
      await submitContactQueryApi({
        name: form.name,
        email: form.email,
        phone: form.phone,
        inquiryType: form.inquiryType as "retail" | "bulk",
        message: form.message,
      });
      toast.success("Thank you! Our team will respond within 24 hours.");
      setForm({ name: "", email: "", phone: "", message: "", inquiryType: "retail" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send query");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container py-10 md:py-16 animate-fade-in">
      <div className="grid lg:grid-cols-5 gap-10 lg:gap-16">
        {/* Left info */}
        <div className="lg:col-span-2">
          <div className="inline-flex items-center px-3 py-1 mb-4 text-[11px] font-medium uppercase tracking-[0.18em] rounded-full bg-secondary text-muted-foreground">
            Get in touch
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">Let's talk weave.</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you're sourcing for a boutique, planning a wedding, or simply curious — our team is here to help.
          </p>

          <div className="mt-10 space-y-6">
            {[
              { icon: Mail, label: "Email", value: "concierge@silkroute.in", sub: "Response within 24h" },
              { icon: Phone, label: "Phone", value: "+91 80 4567 8900", sub: "Mon–Sat · 10am–7pm IST" },
              { icon: MapPin, label: "Studio", value: "12 Brigade Road, Bengaluru 560001", sub: "By appointment only" },
            ].map((c) => (
              <div key={c.label} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
                  <div className="font-medium">{c.value}</div>
                  <div className="text-sm text-muted-foreground">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <form onSubmit={submit} className="p-6 md:p-10 rounded-2xl bg-card shadow-card border border-border/60 space-y-5">
            <div className="grid sm:grid-cols-2 gap-2 p-1 rounded-lg bg-secondary">
              {[
                { v: "retail", l: "Retail enquiry" },
                { v: "bulk", l: "Bulk / Wholesale" },
              ].map((t) => (
                <button
                  type="button"
                  key={t.v}
                  onClick={() => setForm({ ...form, inquiryType: t.v })}
                  className={`py-2 text-sm font-semibold rounded-md transition-smooth ${
                    form.inquiryType === t.v ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="+91 ..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">How can we help? *</Label>
              <Textarea id="message" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={form.inquiryType === "bulk" ? "Tell us about your order — fabric preference, quantity, target delivery..." : "Share what you're looking for..."} />
            </div>

            <Button type="submit" disabled={sending} size="lg" className="w-full gradient-hero text-primary-foreground shadow-elegant hover:opacity-95">
              {sending ? "Sending..." : <>Send message <Send className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
