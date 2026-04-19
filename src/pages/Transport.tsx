import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTransportAssignedOrdersApi, updateTransportOrderStatusApi, type Order } from "@/lib/api";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const statusTone: Record<string, string> = {
  dispatched: "bg-accent/20 text-foreground border-accent/40",
  in_transit: "bg-primary/10 text-primary border-primary/30",
  out_for_delivery: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  failed_delivery: "bg-destructive/10 text-destructive border-destructive/30",
};

const transportStatusOptions = ["dispatched", "in_transit", "out_for_delivery", "delivered", "failed_delivery"];

export default function Transport() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [etaMap, setEtaMap] = useState<Record<string, string>>({});

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getTransportAssignedOrdersApi();
      setOrders(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load transport orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const updateStatus = async (order: Order) => {
    const nextStatus = (statusMap[order.id] ?? order.status).trim();
    if (!nextStatus) {
      toast.error("Status is required");
      return;
    }

    try {
      const updated = await updateTransportOrderStatusApi(order.id, {
        status: nextStatus,
        estimatedDeliveryAt: etaMap[order.id] || order.estimatedDeliveryAt,
      });
      setOrders((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      toast.success("Order status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update status");
    }
  };

  return (
    <div className="container py-8 md:py-10 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Transport Ops</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Transport Portal</h1>
          <p className="text-muted-foreground mt-1">Update status for orders assigned to your transport account.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1.5">{orders.length} assigned orders</Badge>
          <Button variant="outline" size="sm" onClick={() => { void loadOrders(); }}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="font-semibold">Order ID</TableHead>
                <TableHead className="font-semibold">Buyer</TableHead>
                <TableHead className="font-semibold">Products</TableHead>
                <TableHead className="font-semibold text-right">Total</TableHead>
                <TableHead className="font-semibold">Current Status</TableHead>
                <TableHead className="font-semibold">ETA</TableHead>
                <TableHead className="font-semibold">Update Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-secondary/30 transition-smooth">
                  <TableCell className="font-mono text-xs font-semibold text-primary">ORD-{order.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.userEmail}</div>
                    <div className="text-xs text-muted-foreground">User #{order.userId}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">{order.items.map((item) => item.productTitle).join(", ")}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{inr(order.totalAmount)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${statusTone[order.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.estimatedDeliveryAt ? new Date(order.estimatedDeliveryAt).toLocaleString() : "Not set"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[420px]">
                      <Select
                        value={statusMap[order.id] ?? order.status}
                        onValueChange={(value) => setStatusMap((prev) => ({ ...prev, [order.id]: value }))}
                      >
                        <SelectTrigger className="w-[190px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {transportStatusOptions.map((status) => (
                            <SelectItem key={status} value={status}>{status.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="datetime-local"
                        value={etaMap[order.id] ?? (order.estimatedDeliveryAt ? new Date(order.estimatedDeliveryAt).toISOString().slice(0, 16) : "")}
                        onChange={(e) => setEtaMap((prev) => ({ ...prev, [order.id]: e.target.value }))}
                      />
                      <Button size="sm" onClick={() => { void updateStatus(order); }}>
                        Update
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    No orders assigned to your transport account.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
