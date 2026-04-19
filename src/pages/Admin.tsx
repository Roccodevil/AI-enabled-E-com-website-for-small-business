import { useEffect, useMemo, useState } from "react";
import {
  assignTransportApi,
  createTransportUserApi,
  getBusinessAnalystApi,
  getAdminFeedbackApi,
  getOrdersApi,
  getTransportUsersApi,
  getUserInsightsApi,
  reviewFeedbackApi,
  type AnalystReport,
  type FeedbackItem,
  type Order,
  type UserInsight,
  type UserProfile,
} from "@/lib/api";
import { useSarees } from "@/context/SareesContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Users, Package, IndianRupee } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LineChart, Line } from "recharts";
import ProductManager from "@/components/admin/ProductManager";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const statusTone: Record<string, string> = {
  created: "bg-muted text-muted-foreground border-border",
  processing: "bg-primary/10 text-primary border-primary/30",
  dispatched: "bg-accent/20 text-foreground border-accent/40",
  shipped: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
};

const orderStatusOptions = ["created", "processing", "dispatched", "in_transit", "out_for_delivery", "delivered", "failed_delivery"];
const feedbackStatusOptions: Array<"open" | "reviewed" | "resolved" | "rejected"> = ["open", "reviewed", "resolved", "rejected"];

export default function Admin() {
  const { sarees } = useSarees();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [transportMap, setTransportMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [etaMap, setEtaMap] = useState<Record<string, string>>({});
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackStatusMap, setFeedbackStatusMap] = useState<Record<string, "open" | "reviewed" | "resolved" | "rejected">>({});
  const [adminNoteMap, setAdminNoteMap] = useState<Record<string, string>>({});
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "contact" | "complaint" | "feedback">("all");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [transportUsers, setTransportUsers] = useState<UserProfile[]>([]);
  const [userInsights, setUserInsights] = useState<UserInsight[]>([]);
  const [newTransport, setNewTransport] = useState({ email: "", fullName: "", password: "" });
  const [analystQuery, setAnalystQuery] = useState("How should we improve profit by transport, region, and buyer segment this week?");
  const [analystReport, setAnalystReport] = useState<AnalystReport | null>(null);
  const [analystLoading, setAnalystLoading] = useState(false);

  const loadOrders = async () => {
    setOrderLoading(true);
    try {
      const nextOrders = await getOrdersApi();
      setOrders(nextOrders);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load orders");
    } finally {
      setOrderLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
    void loadFeedback();
    void loadTransportUsers();
    void loadUserInsights();
    void loadAnalystReport();
  }, []);

  const loadAnalystReport = async (nextQuery?: string) => {
    setAnalystLoading(true);
    try {
      const report = await getBusinessAnalystApi(nextQuery ?? analystQuery);
      setAnalystReport(report);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load AI analyst report");
    } finally {
      setAnalystLoading(false);
    }
  };

  const loadFeedback = async () => {
    try {
      const next = await getAdminFeedbackApi();
      setFeedbackItems(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load feedback");
    }
  };

  const loadTransportUsers = async () => {
    try {
      const users = await getTransportUsersApi();
      setTransportUsers(users);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load transport users");
    }
  };

  const loadUserInsights = async () => {
    try {
      const users = await getUserInsightsApi();
      setUserInsights(users);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load user insights");
    }
  };

  const totalInventory = useMemo(() => sarees.reduce((sum, item) => sum + item.inventoryQuantity, 0), [sarees]);
  const inventoryInvestmentCost = useMemo(
    () => sarees.reduce((sum, item) => sum + item.costPrice * item.inventoryQuantity, 0),
    [sarees],
  );
  const inventoryRetailValue = useMemo(
    () => sarees.reduce((sum, item) => sum + item.basePrice * item.inventoryQuantity, 0),
    [sarees],
  );
  const inventoryPotentialGrossProfit = useMemo(
    () => inventoryRetailValue - inventoryInvestmentCost,
    [inventoryRetailValue, inventoryInvestmentCost],
  );
  const inventoryPotentialMargin = useMemo(
    () => (inventoryRetailValue > 0 ? (inventoryPotentialGrossProfit / inventoryRetailValue) * 100 : 0),
    [inventoryPotentialGrossProfit, inventoryRetailValue],
  );

  const totalRevenue = useMemo(() => orders.reduce((sum, order) => sum + order.totalAmount, 0), [orders]);
  const totalCostPrice = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + (item.costPrice ?? 0) * item.quantity, 0),
        0,
      ),
    [orders],
  );
  const grossProfit = useMemo(() => totalRevenue - totalCostPrice, [totalRevenue, totalCostPrice]);
  const profitMargin = useMemo(() => (totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0), [grossProfit, totalRevenue]);
  const totalUnitsOrdered = useMemo(
    () => orders.reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + item.quantity, 0), 0),
    [orders],
  );

  const consumerOrdersTotal = useMemo(
    () => orders.filter((order) => ["consumer", "user"].includes(order.userRole)).length,
    [orders],
  );

  const bulkBuyerStats = useMemo(() => {
    const map = new Map<string, { buyer: string; orderCount: number; units: number; value: number }>();
    for (const order of orders) {
      const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
      if (units < 10) continue;

      const existing = map.get(order.userEmail) ?? { buyer: order.userEmail, orderCount: 0, units: 0, value: 0 };
      existing.orderCount += 1;
      existing.units += units;
      existing.value += order.totalAmount;
      map.set(order.userEmail, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.units - a.units).slice(0, 8);
  }, [orders]);

  const ordersByProduct = useMemo(() => {
    const map = new Map<string, { product: string; orderCount: number; units: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const existing = map.get(item.productTitle) ?? { product: item.productTitle, orderCount: 0, units: 0 };
        existing.orderCount += 1;
        existing.units += item.quantity;
        map.set(item.productTitle, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.units - a.units).slice(0, 10);
  }, [orders]);

  const averageOrderValue = useMemo(() => (orders.length ? totalRevenue / orders.length : 0), [orders.length, totalRevenue]);

  const unassignedOrders = useMemo(
    () => orders.filter((order) => !(order.transportService ?? "").trim()).length,
    [orders],
  );

  const orderStatusMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      const key = order.status.replace(/_/g, " ");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [orders]);

  const transportPerformance = useMemo(() => {
    const map = new Map<string, { service: string; orders: number; revenue: number; profit: number }>();
    for (const order of orders) {
      const key = (order.transportService || "unassigned").trim() || "unassigned";
      const cost = order.items.reduce((sum, item) => sum + (item.costPrice ?? 0) * item.quantity, 0);
      const existing = map.get(key) ?? { service: key, orders: 0, revenue: 0, profit: 0 };
      existing.orders += 1;
      existing.revenue += order.totalAmount;
      existing.profit += order.totalAmount - cost;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.profit - a.profit).slice(0, 10);
  }, [orders]);

  const monthlyRevenueTrend = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; profit: number }>();
    for (const order of orders) {
      const date = new Date(order.createdAt);
      const month = date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const cost = order.items.reduce((sum, item) => sum + (item.costPrice ?? 0) * item.quantity, 0);
      const existing = map.get(month) ?? { month, revenue: 0, profit: 0 };
      existing.revenue += order.totalAmount;
      existing.profit += order.totalAmount - cost;
      map.set(month, existing);
    }
    return Array.from(map.values());
  }, [orders]);

  const filteredFeedbackItems = useMemo(() => {
    let base = feedbackItems;
    if (feedbackFilter === "contact") {
      base = feedbackItems.filter((item) => item.message.includes("[CONTACT_QUERY]"));
    } else if (feedbackFilter === "complaint") {
      base = feedbackItems.filter((item) => item.category === "complaint");
    } else if (feedbackFilter === "feedback") {
      base = feedbackItems.filter((item) => item.category === "feedback" && !item.message.includes("[CONTACT_QUERY]"));
    }

    const query = feedbackSearch.trim().toLowerCase();
    if (!query) return base;

    return base.filter((item) => {
      const haystack = [
        item.userEmail,
        item.orderId ? `ord-${item.orderId}` : "",
        item.message,
        item.adminNote ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [feedbackItems, feedbackFilter, feedbackSearch]);

  const assignTransport = async (order: Order) => {
    const transportService = (transportMap[order.id] ?? "").trim();
    if (!transportService) {
      toast.error("Enter transport service name");
      return;
    }

    try {
      const updated = await assignTransportApi(order.id, {
        transportService,
        status: statusMap[order.id] ?? "dispatched",
        estimatedDeliveryAt: etaMap[order.id] || order.estimatedDeliveryAt,
      });
      setOrders((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      toast.success("Transport assigned and order status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign transport");
    }
  };

  const reviewFeedback = async (item: FeedbackItem) => {
    try {
      const updated = await reviewFeedbackApi(item.id, {
        status: feedbackStatusMap[item.id] ?? (item.status as "open" | "reviewed" | "resolved" | "rejected"),
        adminNote: adminNoteMap[item.id] ?? item.adminNote ?? "",
      });
      setFeedbackItems((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      toast.success("Feedback review updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update feedback");
    }
  };

  const createTransportUser = async () => {
    if (!newTransport.email.trim() || !newTransport.password.trim()) {
      toast.error("Transport email and password are required");
      return;
    }

    try {
      await createTransportUserApi({
        email: newTransport.email.trim(),
        password: newTransport.password,
        fullName: newTransport.fullName.trim() || undefined,
      });
      toast.success("Transport user created");
      setNewTransport({ email: "", fullName: "", password: "" });
      await loadTransportUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create transport user");
    }
  };

  return (
    <div className="container py-8 md:py-10 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Operations · Q2 2025</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage operations, inventory, orders, users and feedback.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1.5">Live · last sync 2m ago</Badge>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-7 mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="advisor">AI Advisor</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Total Order Revenue", value: inr(totalRevenue), icon: IndianRupee, delta: `${orders.length} orders`, accent: true },
              { label: "Sold Cost Price", value: inr(totalCostPrice), icon: Package, delta: "Cost of fulfilled orders" },
              { label: "Gross Profit", value: inr(grossProfit), icon: TrendingUp, delta: `${profitMargin.toFixed(1)}% margin` },
              {
                label: "Consumer Orders",
                value: consumerOrdersTotal.toLocaleString("en-IN"),
                icon: Users,
                delta: `${totalUnitsOrdered} total units`,
              },
              {
                label: "Inventory Investment",
                value: inr(inventoryInvestmentCost),
                icon: Package,
                delta: `${totalInventory} units in stock`,
              },
              {
                label: "Stock Profit Potential",
                value: inr(inventoryPotentialGrossProfit),
                icon: TrendingUp,
                delta: `${inventoryPotentialMargin.toFixed(1)}% stock margin`,
              },
              {
                label: "Average Order Value",
                value: inr(averageOrderValue),
                icon: IndianRupee,
                delta: "Business summary",
              },
              {
                label: "Unassigned Transport",
                value: unassignedOrders.toLocaleString("en-IN"),
                icon: Package,
                delta: "Needs assignment",
              },
            ].map((k) => (
              <Card key={k.label} className={`min-w-0 overflow-hidden p-5 border-border/60 shadow-card ${k.accent ? "gradient-hero text-primary-foreground border-transparent" : ""}`}>
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${k.accent ? "bg-primary-foreground/15" : "bg-secondary"}`}>
                    <k.icon className={`h-4 w-4 ${k.accent ? "text-primary-foreground" : "text-primary"}`} />
                  </div>
                  <span className={`text-xs font-semibold text-right break-words ${k.accent ? "text-accent" : "text-emerald-600"}`}>{k.delta}</span>
                </div>
                <div className="mt-4 font-display text-xl md:text-2xl font-semibold tabular-nums leading-tight break-words">{k.value}</div>
                <div className={`text-xs mt-1 break-words ${k.accent ? "opacity-80" : "text-muted-foreground"}`}>{k.label}</div>
              </Card>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Bulk buyers chart */}
            <Card className="p-6 lg:col-span-2 border-border/60 shadow-card">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-display text-lg font-semibold">Bulk Order Buyers</h3>
                <span className="text-xs text-muted-foreground">Units (Top 8 buyers)</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Buyer-wise bulk demand from live orders</p>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bulkBuyerStats} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="buyer" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number, n: string) => (n === "value" ? inr(v) : `${v} units`)}
                    />
                    <Bar dataKey="units" name="units" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Consumer order total */}
            <Card className="p-6 border-border/60 shadow-card">
              <h3 className="font-display text-lg font-semibold">Consumer Orders Total</h3>
              <p className="text-sm text-muted-foreground mb-2">Each consumer order is counted as 1</p>
              <div className="mt-4 mb-5">
                <div className="font-display text-5xl font-semibold tabular-nums">{consumerOrdersTotal}</div>
                <div className="text-xs text-muted-foreground mt-1">Out of {orders.length} total orders</div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Consumer", value: consumerOrdersTotal, color: "hsl(var(--primary))" },
                        { name: "Other", value: Math.max(orders.length - consumerOrdersTotal, 0), color: "hsl(var(--accent))" },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--accent))" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => `${v} orders`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Orders by product */}
          <Card className="p-6 border-border/60 shadow-card">
            <div className="flex items-baseline justify-between mb-1">
              <div>
                <h3 className="font-display text-lg font-semibold">Orders by Product</h3>
                <p className="text-sm text-muted-foreground">Total ordered units per product</p>
              </div>
            </div>
            <div className="h-[320px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByProduct} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="product" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, n: string) => (n === "orderCount" ? `${v} line orders` : `${v} units`)}
                  />
                  <Bar dataKey="units" name="units" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="p-6 lg:col-span-2 border-border/60 shadow-card">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-display text-lg font-semibold">Transport Profit Performance</h3>
                <span className="text-xs text-muted-foreground">Revenue vs Gross Profit</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Compare transport services by delivered business contribution.</p>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transportPerformance} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="service" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => inr(v)}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="profit" name="Gross Profit" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 border-border/60 shadow-card">
              <h3 className="font-display text-lg font-semibold">Order Status Mix</h3>
              <p className="text-sm text-muted-foreground mb-2">Operational distribution across lifecycle stages</p>
              <div className="h-[280px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusMix}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {orderStatusMix.map((entry, index) => (
                        <Cell key={`${entry.status}-${index}`} fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => `${v} orders`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-6 border-border/60 shadow-card">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-display text-lg font-semibold">Revenue and Profit Trend</h3>
              <span className="text-xs text-muted-foreground">Month-wise performance</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Track business momentum to optimize buying and markdown windows.</p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => inr(v)}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card className="border-border/60 shadow-card overflow-hidden">
            <div className="p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">Orders Management</h3>
                <p className="text-sm text-muted-foreground">Assign transport service and update delivery status</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="px-3">{orders.length} total orders</Badge>
                <Button variant="outline" size="sm" onClick={() => { void loadOrders(); }}>Refresh</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/40">
                    <TableHead className="font-semibold">Order ID</TableHead>
                    <TableHead className="font-semibold">Buyer</TableHead>
                    <TableHead className="font-semibold">Products</TableHead>
                    <TableHead className="font-semibold text-right">Qty</TableHead>
                    <TableHead className="font-semibold text-right">Total Value</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">ETA</TableHead>
                    <TableHead className="font-semibold">Transport Assignment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id} className="hover:bg-secondary/30 transition-smooth">
                      <TableCell className="font-mono text-xs font-semibold text-primary">ORD-{o.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{o.userEmail}</div>
                        <div className="text-xs text-muted-foreground">User #{o.userId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {o.items.map((item) => item.productTitle).join(", ")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{o.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{inr(o.totalAmount)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${statusTone[o.status] ?? statusTone.created}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.estimatedDeliveryAt ? new Date(o.estimatedDeliveryAt).toLocaleString() : "Not set"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[460px]">
                          <Select
                            value={transportMap[o.id] ?? o.transportService ?? ""}
                            onValueChange={(value) => setTransportMap((prev) => ({ ...prev, [o.id]: value }))}
                          >
                            <SelectTrigger className="w-[220px]">
                              <SelectValue placeholder="Select transport user" />
                            </SelectTrigger>
                            <SelectContent>
                              {transportUsers.map((user) => (
                                <SelectItem key={user.id} value={user.email}>
                                  {user.fullName ? `${user.fullName} (${user.email})` : user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={statusMap[o.id] ?? o.status}
                            onValueChange={(value) => setStatusMap((prev) => ({ ...prev, [o.id]: value }))}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {orderStatusOptions.map((status) => (
                                <SelectItem key={status} value={status}>{status.replace(/_/g, " ")}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="datetime-local"
                            value={etaMap[o.id] ?? (o.estimatedDeliveryAt ? new Date(o.estimatedDeliveryAt).toISOString().slice(0, 16) : "")}
                            onChange={(e) => setEtaMap((prev) => ({ ...prev, [o.id]: e.target.value }))}
                          />
                          <Button size="sm" onClick={() => { void assignTransport(o); }}>
                            Assign
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!orderLoading && orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                        No orders yet. Place an order from cart to see it here.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-8">
          <ProductManager />

          {/* Virtual inventory */}
          <Card className="border-border/60 shadow-card overflow-hidden">
            <div className="p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">Virtual Inventory</h3>
                <p className="text-sm text-muted-foreground">Current stock quantity by product</p>
              </div>
              <Badge variant="outline" className="px-3">Total stock: {totalInventory}</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/40">
                    <TableHead className="font-semibold">SKU</TableHead>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sarees.map((product) => (
                    <TableRow key={product.id} className="hover:bg-secondary/30 transition-smooth">
                      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{product.inventoryQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Transport Tab */}
        <TabsContent value="transport">
          <Card className="border-border/60 shadow-card overflow-hidden">
            <div className="p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">Transport Users</h3>
                <p className="text-sm text-muted-foreground">Only admin can create active transport accounts.</p>
              </div>
              <Badge variant="outline" className="px-3">{transportUsers.length} active</Badge>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border/60">
                <h4 className="font-semibold mb-4 text-sm">Create New Transport User</h4>
                <div className="grid md:grid-cols-4 gap-3">
                  <Input
                    placeholder="Transport name"
                    value={newTransport.fullName}
                    onChange={(e) => setNewTransport((prev) => ({ ...prev, fullName: e.target.value }))}
                  />
                  <Input
                    placeholder="transport@company.com"
                    value={newTransport.email}
                    onChange={(e) => setNewTransport((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newTransport.password}
                    onChange={(e) => setNewTransport((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <Button onClick={() => { void createTransportUser(); }}>Create transport user</Button>
                </div>
              </div>

              {transportUsers.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/40">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transportUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-secondary/30 transition-smooth">
                          <TableCell className="font-medium">{user.fullName || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card className="border-border/60 shadow-card overflow-hidden">
            <div className="p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">User Analytics</h3>
                <p className="text-sm text-muted-foreground">Stored profile details, order history metrics, preferences, and spend behavior.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="px-3">{userInsights.length} users</Badge>
                <Button variant="outline" size="sm" onClick={() => { void loadUserInsights(); }}>Refresh</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/40">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total spend</TableHead>
                    <TableHead className="text-right">Avg spend</TableHead>
                    <TableHead>Preferences</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userInsights.map((user) => (
                    <TableRow key={user.id} className="hover:bg-secondary/30 transition-smooth">
                      <TableCell>
                        <div className="font-medium">{user.fullName || user.email}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                      <TableCell className="text-right tabular-nums">{user.totalOrders}</TableCell>
                      <TableCell className="text-right tabular-nums">{inr(user.totalSpend)}</TableCell>
                      <TableCell className="text-right tabular-nums">{inr(user.averageSpend)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px]">{user.orderPreferences || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {userInsights.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                        No user insights available yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="advisor" className="space-y-6">
          <Card className="border-border/60 shadow-card overflow-hidden">
            <div className="p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">AI Business Analyst</h3>
                <p className="text-sm text-muted-foreground">Learns from past orders, catalog data, transport, and demand patterns to guide decisions.</p>
              </div>
              <Badge variant="outline" className="px-3">Insights ready: {analystReport ? "yes" : "loading"}</Badge>
            </div>
            <div className="p-6 space-y-4">
              <Textarea
                rows={3}
                value={analystQuery}
                onChange={(e) => setAnalystQuery(e.target.value)}
                placeholder="Ask for strategy: where to sell, which products to push, transport optimization, inventory planning"
              />
              <div className="flex items-center gap-2">
                <Button onClick={() => { void loadAnalystReport(analystQuery); }} disabled={analystLoading}>
                  {analystLoading ? "Analyzing..." : "Run AI analysis"}
                </Button>
                <Button variant="outline" onClick={() => { void loadAnalystReport(); }} disabled={analystLoading}>
                  Refresh insights
                </Button>
              </div>
              <div className="p-4 rounded-lg border border-border/60 bg-secondary/30 text-sm">
                {analystReport?.summary ?? "Run analysis to generate insights."}
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="p-6 border-border/60 shadow-card lg:col-span-2">
              <h3 className="font-display text-lg font-semibold">AI Recommendations</h3>
              <p className="text-sm text-muted-foreground mb-4">Actionable strategy to improve order flow, margin, and demand capture.</p>
              <div className="space-y-2">
                {(analystReport?.recommendations ?? []).map((item, index) => (
                  <div key={`${item}-${index}`} className="p-3 rounded-md border border-border/60 bg-background text-sm">
                    {index + 1}. {item}
                  </div>
                ))}
                {!analystReport?.recommendations?.length ? (
                  <div className="text-sm text-muted-foreground">No recommendations available yet.</div>
                ) : null}
              </div>
            </Card>

            <Card className="p-6 border-border/60 shadow-card">
              <h3 className="font-display text-lg font-semibold">Insight Context</h3>
              <p className="text-sm text-muted-foreground mb-4">Top memory snippets retrieved for current query.</p>
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {(analystReport?.ragContext ?? []).map((item, index) => (
                  <div key={`${item}-${index}`} className="text-xs p-2 rounded border border-border/60 bg-secondary/30">
                    {item}
                  </div>
                ))}
                {!analystReport?.ragContext?.length ? (
                  <div className="text-sm text-muted-foreground">No retrieval context yet.</div>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6 border-border/60 shadow-card">
              <h3 className="font-display text-lg font-semibold">Transport Service Profit</h3>
              <div className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analystReport?.transportPerformance ?? []} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="transportService" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => inr(v)}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="grossProfit" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 border-border/60 shadow-card">
              <h3 className="font-display text-lg font-semibold">Demand Channel Mix</h3>
              <div className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analystReport?.channelDemand ?? []}
                      dataKey="units"
                      nameKey="segment"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {(analystReport?.channelDemand ?? []).map((entry, index) => (
                        <Cell key={`${entry.segment}-${index}`} fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => `${v} units`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-border/60 shadow-card overflow-hidden">
              <div className="p-6 border-b border-border/60">
                <h3 className="font-display text-lg font-semibold">Regional Demand Priorities</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40">
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(analystReport?.regionalDemand ?? []).map((item) => (
                      <TableRow key={item.segment} className="hover:bg-secondary/30 transition-smooth">
                        <TableCell className="font-medium">{item.segment}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.units}</TableCell>
                        <TableCell className="text-right tabular-nums">{inr(item.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="border-border/60 shadow-card overflow-hidden">
              <div className="p-6 border-b border-border/60">
                <h3 className="font-display text-lg font-semibold">Top Product Opportunities</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Gross Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(analystReport?.productOpportunities ?? []).slice(0, 8).map((item) => (
                      <TableRow key={item.product} className="hover:bg-secondary/30 transition-smooth">
                        <TableCell className="font-medium">{item.product}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.unitsSold}</TableCell>
                        <TableCell className="text-right tabular-nums">{inr(item.revenue)}</TableCell>
                        <TableCell className="text-right tabular-nums">{inr(item.grossProfit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <Card className="border-border/60 shadow-card overflow-hidden">
            <div className="p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">Customer Feedback & Complaints</h3>
                <p className="text-sm text-muted-foreground">Review and resolve user feedback submitted from profile page</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="flex items-center gap-2">
                  <Button variant={feedbackFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setFeedbackFilter("all")}>All</Button>
                  <Button variant={feedbackFilter === "contact" ? "default" : "outline"} size="sm" onClick={() => setFeedbackFilter("contact")}>Contact</Button>
                  <Button variant={feedbackFilter === "complaint" ? "default" : "outline"} size="sm" onClick={() => setFeedbackFilter("complaint")}>Complaints</Button>
                  <Button variant={feedbackFilter === "feedback" ? "default" : "outline"} size="sm" onClick={() => setFeedbackFilter("feedback")}>Feedback</Button>
                </div>
                <Input
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                  placeholder="Search email, order, message"
                  className="w-[240px]"
                />
                <Badge variant="outline" className="px-3">{filteredFeedbackItems.length} shown</Badge>
                <Button variant="outline" size="sm" onClick={() => { void loadFeedback(); }}>Refresh</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/40">
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admin note</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbackItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-secondary/30 transition-smooth">
                      <TableCell>
                        <div className="font-medium text-sm">{item.userEmail}</div>
                      </TableCell>
                      <TableCell className="capitalize">{item.message.includes("[CONTACT_QUERY]") ? "contact" : item.category}</TableCell>
                      <TableCell>{item.orderId ? `ORD-${item.orderId}` : "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px]">{item.message}</TableCell>
                      <TableCell>
                        <Select
                          value={feedbackStatusMap[item.id] ?? (item.status as "open" | "reviewed" | "resolved" | "rejected")}
                          onValueChange={(value: "open" | "reviewed" | "resolved" | "rejected") => setFeedbackStatusMap((prev) => ({
                            ...prev,
                            [item.id]: value,
                          }))}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Feedback status" />
                          </SelectTrigger>
                          <SelectContent>
                            {feedbackStatusOptions.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          rows={2}
                          value={adminNoteMap[item.id] ?? item.adminNote ?? ""}
                          onChange={(e) => setAdminNoteMap((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Resolution note"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => { void reviewFeedback(item); }}>Save</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredFeedbackItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                        No submissions for this filter.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
