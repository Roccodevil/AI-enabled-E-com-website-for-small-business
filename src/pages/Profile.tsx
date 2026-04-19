import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createOrderApi,
  createFeedbackApi,
  getMyFeedbackApi,
  getMyProfileApi,
  getOrdersApi,
  updateMyProfileApi,
  type FeedbackItem,
  type Order,
  type UserProfile,
} from "@/lib/api";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const statusTone: Record<string, string> = {
  created: "bg-muted text-muted-foreground border-border",
  dispatched: "bg-accent/20 text-foreground border-accent/40",
  in_transit: "bg-primary/10 text-primary border-primary/30",
  out_for_delivery: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  failed_delivery: "bg-destructive/10 text-destructive border-destructive/30",
};

const BULK_ORDER_MIN_UNITS = 10;

function timeLeftLabel(estimatedDeliveryAt: string | null): string {
  if (!estimatedDeliveryAt) return "ETA pending";
  const now = Date.now();
  const eta = new Date(estimatedDeliveryAt).getTime();
  if (Number.isNaN(eta)) return "ETA pending";
  const diffMs = eta - now;
  if (diffMs <= 0) return "Expected any time now";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [repeatingOrderId, setRepeatingOrderId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "bulk">("all");
  const [orderId, setOrderId] = useState("");
  const [category, setCategory] = useState<"feedback" | "complaint">("feedback");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileData, orderData, myFeedback] = await Promise.all([getMyProfileApi(), getOrdersApi(), getMyFeedbackApi()]);
      setProfile(profileData);
      setOrders(orderData);
      setFeedbackItems(myFeedback);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "delivered"), [orders]);
  const unitsByOrderId = useMemo(
    () =>
      orders.reduce<Record<string, number>>((acc, order) => {
        acc[order.id] = order.items.reduce((sum, item) => sum + item.quantity, 0);
        return acc;
      }, {}),
    [orders],
  );
  const bulkOrders = useMemo(
    () => orders.filter((order) => (unitsByOrderId[order.id] ?? 0) >= BULK_ORDER_MIN_UNITS),
    [orders, unitsByOrderId],
  );
  const totalBulkUnits = useMemo(
    () => bulkOrders.reduce((sum, order) => sum + (unitsByOrderId[order.id] ?? 0), 0),
    [bulkOrders, unitsByOrderId],
  );
  const visibleOrders = useMemo(
    () => (orderFilter === "bulk" ? bulkOrders : orders),
    [orderFilter, bulkOrders, orders],
  );

  const saveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const updated = await updateMyProfileApi({
        fullName: profile.fullName,
        phone: profile.phone,
        companyName: profile.companyName,
        state: profile.state,
        city: profile.city,
        address: profile.address,
        orderPreferences: profile.orderPreferences,
      });
      setProfile(updated);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const submitFeedback = async () => {
    if (!message.trim() || message.trim().length < 5) {
      toast.error("Enter at least 5 characters");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createFeedbackApi({
        orderId: orderId || undefined,
        category,
        message: message.trim(),
      });
      setFeedbackItems((prev) => [created, ...prev]);
      setMessage("");
      setOrderId("");
      setCategory("feedback");
      toast.success("Submitted to admin successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const repeatOrder = async (order: Order) => {
    if (!order.items.length) return;
    setRepeatingOrderId(order.id);
    try {
      await createOrderApi(
        order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        { idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` },
      );
      toast.success(`Reordered ORD-${order.id}`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to repeat order");
    } finally {
      setRepeatingOrderId(null);
    }
  };

  return (
    <div className="container py-8 md:py-10 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Account</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-1">Track your orders and send feedback or complaints to admin.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { void loadData(); }}>
          Refresh
        </Button>
      </div>

      <Card className="border-border/60 shadow-card overflow-hidden mb-8">
        <div className="p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Profile Information</h3>
            <p className="text-sm text-muted-foreground">Your details, preferences, and spend metrics are stored for personalization.</p>
          </div>
          <Button size="sm" onClick={() => { void saveProfile(); }} disabled={savingProfile || !profile}>
            {savingProfile ? "Saving..." : "Save profile"}
          </Button>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={profile?.fullName ?? ""} onChange={(e) => setProfile((prev) => prev ? { ...prev, fullName: e.target.value } : prev)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={profile?.phone ?? ""} onChange={(e) => setProfile((prev) => prev ? { ...prev, phone: e.target.value } : prev)} />
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input value={profile?.companyName ?? ""} onChange={(e) => setProfile((prev) => prev ? { ...prev, companyName: e.target.value } : prev)} />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input value={profile?.state ?? ""} onChange={(e) => setProfile((prev) => prev ? { ...prev, state: e.target.value } : prev)} />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={profile?.city ?? ""} onChange={(e) => setProfile((prev) => prev ? { ...prev, city: e.target.value } : prev)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Address</Label>
            <Textarea rows={2} value={profile?.address ?? ""} onChange={(e) => setProfile((prev) => prev ? { ...prev, address: e.target.value } : prev)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Order preferences</Label>
            <Textarea rows={2} value={profile?.orderPreferences ?? ""} onChange={(e) => setProfile((prev) => prev ? { ...prev, orderPreferences: e.target.value } : prev)} placeholder="e.g. Banarasi Silk, Chanderi" />
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-secondary/40 text-sm">
            <div className="text-muted-foreground">Total orders</div>
            <div className="font-semibold tabular-nums">{profile?.totalOrders ?? 0}</div>
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-secondary/40 text-sm">
            <div className="text-muted-foreground">Total spend</div>
            <div className="font-semibold tabular-nums">{inr(profile?.totalSpend ?? 0)}</div>
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-secondary/40 text-sm md:col-span-2">
            <div className="text-muted-foreground">Average spend</div>
            <div className="font-semibold tabular-nums">{inr(profile?.averageSpend ?? 0)}</div>
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-secondary/40 text-sm">
            <div className="text-muted-foreground">Bulk orders</div>
            <div className="font-semibold tabular-nums">{bulkOrders.length}</div>
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-secondary/40 text-sm">
            <div className="text-muted-foreground">Bulk units purchased</div>
            <div className="font-semibold tabular-nums">{totalBulkUnits.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </Card>

      <Card className="border-border/60 shadow-card overflow-hidden mb-8">
        <div className="p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Track Orders</h3>
            <p className="text-sm text-muted-foreground">Status and ETA updated by admin/transport service</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={orderFilter === "all" ? "default" : "outline"}
              onClick={() => setOrderFilter("all")}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={orderFilter === "bulk" ? "default" : "outline"}
              onClick={() => setOrderFilter("bulk")}
            >
              Bulk only
            </Button>
            <Badge variant="outline" className="px-3">{activeOrders.length} active</Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead>Order ID</TableHead>
                <TableHead>Placed on</TableHead>
                <TableHead>Delivery snapshot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Time left</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-secondary/30 transition-smooth">
                  <TableCell className="font-mono text-xs">ORD-{order.id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{order.deliveryFullName || "-"}</div>
                      <div>{order.deliveryPhone || "-"}</div>
                      <div>{[order.deliveryCity, order.deliveryState].filter(Boolean).join(", ") || "-"}</div>
                      <div className="truncate" title={order.deliveryAddress || ""}>{order.deliveryAddress || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${statusTone[order.status] ?? statusTone.created}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(unitsByOrderId[order.id] ?? 0) >= BULK_ORDER_MIN_UNITS ? (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Bulk ({unitsByOrderId[order.id]} units)</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Standard ({unitsByOrderId[order.id]} units)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.estimatedDeliveryAt ? new Date(order.estimatedDeliveryAt).toLocaleString() : "Pending update"}
                  </TableCell>
                  <TableCell className="text-sm">{timeLeftLabel(order.estimatedDeliveryAt)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{inr(order.totalAmount)}</TableCell>
                  <TableCell className="text-right">
                    {(unitsByOrderId[order.id] ?? 0) >= BULK_ORDER_MIN_UNITS ? (
                      <Button size="sm" variant="outline" onClick={() => { void repeatOrder(order); }} disabled={repeatingOrderId === order.id}>
                        {repeatingOrderId === order.id ? "Repeating..." : "Repeat order"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && visibleOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                    {orderFilter === "bulk" ? "No bulk orders yet." : "No orders placed yet."}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 border-border/60 shadow-card">
          <h3 className="font-display text-lg font-semibold">Feedback & Complaints</h3>
          <p className="text-sm text-muted-foreground mb-4">Send your message directly to admin for review.</p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory((e.target.value === "complaint" ? "complaint" : "feedback"))}
                placeholder="feedback or complaint"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Order ID (optional)</Label>
              <Input value={orderId} onChange={(e) => setOrderId(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 12" />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your feedback or complaint" />
            </div>
            <Button onClick={() => { void submitFeedback(); }} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </Card>

        <Card className="border-border/60 shadow-card overflow-hidden">
          <div className="p-6 border-b border-border/60">
            <h3 className="font-display text-lg font-semibold">My Submissions</h3>
            <p className="text-sm text-muted-foreground">Track admin review progress</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Admin note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-secondary/30 transition-smooth">
                    <TableCell className="capitalize">{item.category}</TableCell>
                    <TableCell className="capitalize">{item.status}</TableCell>
                    <TableCell>{item.orderId ? `ORD-${item.orderId}` : "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.adminNote ?? "Pending"}</TableCell>
                  </TableRow>
                ))}
                {!loading && feedbackItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                      No feedback or complaints yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
