import { useState } from "react";
import { uploadProductImagesApi } from "@/lib/api";
import { useSarees } from "@/context/SareesContext";
import type { Saree } from "@/types/saree";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

type FormState = Omit<Saree, "id" | "gallery"> & { id?: string; galleryStr: string };

const empty: FormState = {
  sku: "",
  title: "",
  fabric: "",
  origin: "",
  shortDescription: "",
  detailedDescription: "",
  basePrice: 1000,
  costPrice: 600,
  cover: "",
  galleryStr: "",
  procurementDays: "5–7 days",
  inventoryQuantity: 0,
};

export default function ProductManager() {
  const { sarees, createSaree, updateSaree, deleteSaree, resetSarees } = useSarees();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(empty);
    setSelectedImages([]);
    setOpen(true);
  };

  const openEdit = (s: Saree) => {
    setEditingId(s.id);
    setForm({
      sku: s.sku,
      title: s.title,
      fabric: s.fabric,
      origin: s.origin,
      shortDescription: s.shortDescription,
      detailedDescription: s.detailedDescription,
      basePrice: s.basePrice,
      costPrice: s.costPrice,
      cover: s.cover,
      galleryStr: s.gallery.join("\n"),
      procurementDays: s.procurementDays,
      inventoryQuantity: s.inventoryQuantity,
    });
    setSelectedImages([]);
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title || form.basePrice <= 0) {
      toast.error("Title and base price are required");
      return;
    }

    const payload = {
      sku: form.sku?.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
      title: form.title,
      fabric: form.fabric,
      origin: form.origin,
      shortDescription: form.shortDescription,
      detailedDescription: form.detailedDescription,
      basePrice: Number(form.basePrice),
      costPrice: Number(form.costPrice),
      cover: form.cover,
      gallery: form.galleryStr.split("\n").map((g) => g.trim()).filter(Boolean),
      procurementDays: form.procurementDays,
      inventoryQuantity: Number(form.inventoryQuantity),
    };

    try {
      let uploadedUrls: string[] = [];
      if (selectedImages.length) {
        setUploading(true);
        uploadedUrls = await uploadProductImagesApi(selectedImages);
        setUploading(false);
      }

      if (!editingId && uploadedUrls.length === 0 && !form.cover) {
        toast.error("Upload at least one product image");
        return;
      }

      const finalCover = uploadedUrls[0] ?? payload.cover;
      const finalGallery = uploadedUrls.length ? uploadedUrls : payload.gallery.length ? payload.gallery : (finalCover ? [finalCover] : []);

      if (editingId) {
        await updateSaree(editingId, { ...payload, cover: finalCover, gallery: finalGallery });
        toast.success("Product updated");
      } else {
        await createSaree({ ...payload, cover: finalCover, gallery: finalGallery });
        toast.success("Product created");
      }
      setOpen(false);
    } catch (error) {
      setUploading(false);
      toast.error(error instanceof Error ? error.message : "Unable to save product");
    }
  };

  return (
    <Card className="border-border/60 shadow-card overflow-hidden mb-8">
      <div className="p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Product Catalog</h3>
          <p className="text-sm text-muted-foreground">Create, edit, or remove sarees from the catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={async () => { await resetSarees(); toast.success("Catalog refreshed from database"); }}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate} className="gradient-hero text-primary-foreground">
                <Plus className="h-4 w-4 mr-1.5" /> Add product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit product" : "New product"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>SKU</Label>
                    <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="BAN-001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Base price (₹)</Label>
                    <Input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fabric</Label>
                    <Input value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cost price (₹)</Label>
                    <Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Origin</Label>
                    <Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Inventory qty</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.inventoryQuantity}
                      onChange={(e) => setForm({ ...form, inventoryQuantity: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Procurement days</Label>
                    <Input value={form.procurementDays} onChange={(e) => setForm({ ...form, procurementDays: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Product images (multiple)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setSelectedImages(Array.from(e.target.files ?? []))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Select one or more images. First image becomes cover. {selectedImages.length} selected.
                    </p>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Short description</Label>
                    <Textarea rows={2} value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Detailed description</Label>
                    <Textarea rows={4} value={form.detailedDescription} onChange={(e) => setForm({ ...form, detailedDescription: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} className="gradient-hero text-primary-foreground" disabled={uploading}>
                  {uploading ? "Uploading..." : editingId ? "Save changes" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead>Product</TableHead>
              <TableHead>Fabric</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead className="text-right">Inventory</TableHead>
              <TableHead className="text-right">Cost price</TableHead>
              <TableHead className="text-right">Base price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sarees.map((s) => (
              <TableRow key={s.id} className="hover:bg-secondary/30 transition-smooth">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={s.cover} alt={s.title} className="h-10 w-10 rounded object-cover" />
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">{s.id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{s.fabric}</TableCell>
                <TableCell className="text-sm">{s.origin}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{s.inventoryQuantity}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{inr(s.costPrice)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{inr(s.basePrice)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{s.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>This will remove the product from the catalog database.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => { await deleteSaree(s.id); toast.success("Product deleted"); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
