import type { Saree } from "@/types/saree";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8000";

type BackendProduct = {
  id: number;
  sku: string;
  title: string;
  fabric: string | null;
  origin: string | null;
  short_description: string | null;
  detailed_description: string | null;
  base_price: number;
  cost_price: number | null;
  cover_image: string | null;
  gallery_images: string[];
  procurement_days: string | null;
  inventory_quantity: number;
};

type BackendOrderItem = {
  product_id: number;
  product_title: string;
  quantity: number;
  unit_price: number;
  cost_price: number | null;
};

type BackendOrder = {
  id: number;
  user_id: number;
  user_email: string;
  user_role: string;
  delivery_full_name: string | null;
  delivery_phone: string | null;
  delivery_company_name: string | null;
  delivery_state: string | null;
  delivery_city: string | null;
  delivery_address: string | null;
  status: string;
  transport_service: string | null;
  estimated_delivery_at: string | null;
  total_amount: number;
  created_at: string;
  items: BackendOrderItem[];
};

type BackendUserProfile = {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  order_preferences: string | null;
  total_orders: number;
  total_spend: number;
  average_spend: number;
  role: string;
  is_active: boolean;
};

type BackendUserInsight = {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  total_orders: number;
  total_spend: number;
  average_spend: number;
  order_preferences: string | null;
  is_active: boolean;
};

type BackendFeedback = {
  id: number;
  user_id: number;
  user_email: string;
  order_id: number | null;
  category: string;
  message: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

export type OrderItem = {
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  costPrice: number | null;
};

export type Order = {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  deliveryFullName: string;
  deliveryPhone: string;
  deliveryCompanyName: string;
  deliveryState: string;
  deliveryCity: string;
  deliveryAddress: string;
  status: string;
  transportService: string | null;
  estimatedDeliveryAt: string | null;
  createdAt: string;
  totalAmount: number;
  items: OrderItem[];
};

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  companyName: string;
  state: string;
  city: string;
  address: string;
  orderPreferences: string;
  totalOrders: number;
  totalSpend: number;
  averageSpend: number;
  role: string;
  isActive: boolean;
};

export type UserInsight = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  totalOrders: number;
  totalSpend: number;
  averageSpend: number;
  orderPreferences: string;
  isActive: boolean;
};

export type FeedbackItem = {
  id: string;
  userId: string;
  userEmail: string;
  orderId: string | null;
  category: "feedback" | "complaint";
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
  role: string;
};

type EmailOtpRequestResponse = {
  message: string;
  dev_code: string | null;
};

type EmailOtpVerifyResponse = {
  access_token: string;
  token_type: string;
  role: string;
  email: string;
};

type ProductImageUploadResponse = {
  urls: string[];
};

type BackendAnalystInsight = {
  segment: string;
  units: number;
  revenue: number;
};

type BackendTransportInsight = {
  transport_service: string;
  order_count: number;
  revenue: number;
  gross_profit: number;
  delivered_count: number;
  pending_count: number;
};

type BackendProductOpportunity = {
  product: string;
  units_sold: number;
  revenue: number;
  gross_profit: number;
};

type BackendAnalystResponse = {
  summary: string;
  business_kpis: Record<string, number>;
  transport_performance: BackendTransportInsight[];
  product_opportunities: BackendProductOpportunity[];
  regional_demand: BackendAnalystInsight[];
  channel_demand: BackendAnalystInsight[];
  recommendations: string[];
  rag_context: string[];
  memory_backend: string;
};

export type AnalystInsight = {
  segment: string;
  units: number;
  revenue: number;
};

export type TransportInsight = {
  transportService: string;
  orderCount: number;
  revenue: number;
  grossProfit: number;
  deliveredCount: number;
  pendingCount: number;
};

export type ProductOpportunity = {
  product: string;
  unitsSold: number;
  revenue: number;
  grossProfit: number;
};

export type AnalystReport = {
  summary: string;
  businessKpis: Record<string, number>;
  transportPerformance: TransportInsight[];
  productOpportunities: ProductOpportunity[];
  regionalDemand: AnalystInsight[];
  channelDemand: AnalystInsight[];
  recommendations: string[];
  ragContext: string[];
  memoryBackend: string;
};

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem("auth_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      // noop
    }
    throw new Error(detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

function toSaree(product: BackendProduct): Saree {
  const resolvedCover = resolveMediaUrl(product.cover_image);
  const cover = resolvedCover || "https://images.unsplash.com/photo-1610189020382-668f65f0f95f?auto=format&fit=crop&w=1200&q=80";
  const resolvedGallery = product.gallery_images?.map((image) => resolveMediaUrl(image)).filter(Boolean) ?? [];
  const gallery = resolvedGallery.length ? resolvedGallery : [cover];

  return {
    id: String(product.id),
    sku: product.sku,
    title: product.title,
    fabric: product.fabric ?? "Silk",
    origin: product.origin ?? "India",
    shortDescription: product.short_description ?? "",
    detailedDescription: product.detailed_description ?? product.short_description ?? "",
    basePrice: Number(product.base_price),
    costPrice: product.cost_price !== null ? Number(product.cost_price) : 0,
    cover,
    gallery,
    procurementDays: product.procurement_days ?? "5–7 days",
    inventoryQuantity: Number(product.inventory_quantity ?? 0),
  };
}

function toBackendPayload(payload: Omit<Saree, "id">) {
  return {
    sku: payload.sku,
    title: payload.title,
    fabric: payload.fabric,
    origin: payload.origin,
    short_description: payload.shortDescription,
    detailed_description: payload.detailedDescription,
    base_price: payload.basePrice,
    cost_price: payload.costPrice,
    cover_image: payload.cover,
    gallery_images: payload.gallery,
    procurement_days: payload.procurementDays,
    inventory_quantity: payload.inventoryQuantity,
  };
}

function toOrder(order: BackendOrder): Order {
  return {
    id: String(order.id),
    userId: String(order.user_id),
    userEmail: order.user_email,
    userRole: order.user_role,
    deliveryFullName: order.delivery_full_name ?? "",
    deliveryPhone: order.delivery_phone ?? "",
    deliveryCompanyName: order.delivery_company_name ?? "",
    deliveryState: order.delivery_state ?? "",
    deliveryCity: order.delivery_city ?? "",
    deliveryAddress: order.delivery_address ?? "",
    status: order.status,
    transportService: order.transport_service,
    estimatedDeliveryAt: order.estimated_delivery_at,
    createdAt: order.created_at,
    totalAmount: Number(order.total_amount),
    items: order.items.map((item) => ({
      productId: String(item.product_id),
      productTitle: item.product_title,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      costPrice: item.cost_price !== null ? Number(item.cost_price) : 0,
    })),
  };
}

function toUserProfile(item: BackendUserProfile): UserProfile {
  return {
    id: String(item.id),
    email: item.email,
    fullName: item.full_name ?? "",
    phone: item.phone ?? "",
    companyName: item.company_name ?? "",
    state: item.state ?? "",
    city: item.city ?? "",
    address: item.address ?? "",
    orderPreferences: item.order_preferences ?? "",
    totalOrders: Number(item.total_orders),
    totalSpend: Number(item.total_spend),
    averageSpend: Number(item.average_spend),
    role: item.role,
    isActive: item.is_active,
  };
}

function toUserInsight(item: BackendUserInsight): UserInsight {
  return {
    id: String(item.id),
    email: item.email,
    fullName: item.full_name ?? "",
    role: item.role,
    totalOrders: Number(item.total_orders),
    totalSpend: Number(item.total_spend),
    averageSpend: Number(item.average_spend),
    orderPreferences: item.order_preferences ?? "",
    isActive: item.is_active,
  };
}

function toFeedback(item: BackendFeedback): FeedbackItem {
  return {
    id: String(item.id),
    userId: String(item.user_id),
    userEmail: item.user_email,
    orderId: item.order_id !== null ? String(item.order_id) : null,
    category: item.category as "feedback" | "complaint",
    message: item.message,
    status: item.status,
    adminNote: item.admin_note,
    createdAt: item.created_at,
  };
}

export async function loginApi(email: string, password: string): Promise<{ token: string; role: string }> {
  const data = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return { token: data.access_token, role: data.role };
}

export async function registerApi(
  email: string,
  password: string,
  role: string = "consumer",
  fullName?: string,
): Promise<{ token: string; role: string }> {
  const data = await request<LoginResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, role, full_name: fullName }),
  });
  return { token: data.access_token, role: data.role };
}

export async function requestEmailOtpApi(email: string): Promise<{ message: string; devCode: string | null }> {
  const data = await request<EmailOtpRequestResponse>("/api/auth/email-otp/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return { message: data.message, devCode: data.dev_code };
}

export async function verifyEmailOtpApi(
  email: string,
  code: string,
  password: string,
  fullName?: string,
): Promise<{ token: string; role: string; email: string }> {
  const data = await request<EmailOtpVerifyResponse>("/api/auth/email-otp/verify", {
    method: "POST",
    body: JSON.stringify({ email, code, password, full_name: fullName }),
  });
  return { token: data.access_token, role: data.role, email: data.email };
}

export async function getMyProfileApi(): Promise<UserProfile> {
  const profile = await request<BackendUserProfile>("/api/auth/me", {
    method: "GET",
    headers: { ...authHeaders() },
  });
  return toUserProfile(profile);
}

export async function updateMyProfileApi(payload: {
  fullName?: string;
  phone?: string;
  companyName?: string;
  state?: string;
  city?: string;
  address?: string;
  orderPreferences?: string;
}): Promise<UserProfile> {
  const profile = await request<BackendUserProfile>("/api/auth/me", {
    method: "PATCH",
    headers: { ...authHeaders() },
    body: JSON.stringify({
      full_name: payload.fullName,
      phone: payload.phone,
      company_name: payload.companyName,
      state: payload.state,
      city: payload.city,
      address: payload.address,
      order_preferences: payload.orderPreferences,
    }),
  });
  return toUserProfile(profile);
}

export async function getTransportUsersApi(): Promise<UserProfile[]> {
  const users = await request<BackendUserProfile[]>("/api/auth/transports", {
    method: "GET",
    headers: { ...authHeaders() },
  });
  return users.map(toUserProfile);
}

export async function createTransportUserApi(payload: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<UserProfile> {
  const user = await request<BackendUserProfile>("/api/auth/transports", {
    method: "POST",
    headers: { ...authHeaders() },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      full_name: payload.fullName,
    }),
  });
  return toUserProfile(user);
}

export async function getUserInsightsApi(): Promise<UserInsight[]> {
  const users = await request<BackendUserInsight[]>("/api/auth/users/insights", {
    method: "GET",
    headers: { ...authHeaders() },
  });
  return users.map(toUserInsight);
}

export async function getProductsApi(): Promise<Saree[]> {
  const products = await request<BackendProduct[]>("/api/products", {
    method: "GET",
    headers: { ...authHeaders() },
  });
  return products.map(toSaree);
}

export async function createProductApi(payload: Omit<Saree, "id">): Promise<Saree> {
  const product = await request<BackendProduct>("/api/products", {
    method: "POST",
    headers: { ...authHeaders() },
    body: JSON.stringify(toBackendPayload(payload)),
  });
  return toSaree(product);
}

export async function updateProductApi(id: string, payload: Partial<Omit<Saree, "id">>): Promise<Saree> {
  const backendPatch: Record<string, unknown> = {};
  if (payload.sku !== undefined) backendPatch.sku = payload.sku;
  if (payload.title !== undefined) backendPatch.title = payload.title;
  if (payload.fabric !== undefined) backendPatch.fabric = payload.fabric;
  if (payload.origin !== undefined) backendPatch.origin = payload.origin;
  if (payload.shortDescription !== undefined) backendPatch.short_description = payload.shortDescription;
  if (payload.detailedDescription !== undefined) backendPatch.detailed_description = payload.detailedDescription;
  if (payload.basePrice !== undefined) backendPatch.base_price = payload.basePrice;
  if (payload.costPrice !== undefined) backendPatch.cost_price = payload.costPrice;
  if (payload.cover !== undefined) backendPatch.cover_image = payload.cover;
  if (payload.gallery !== undefined) backendPatch.gallery_images = payload.gallery;
  if (payload.procurementDays !== undefined) backendPatch.procurement_days = payload.procurementDays;

  const product = await request<BackendProduct>(`/api/products/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders() },
    body: JSON.stringify(backendPatch),
  });
  return toSaree(product);
}

export async function deleteProductApi(id: string): Promise<void> {
  await request<void>(`/api/products/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
}

export async function quotePriceApi(productId: string, quantity: number): Promise<number> {
  const data = await request<{ recommended_price: number }>("/api/products/quote", {
    method: "POST",
    headers: { ...authHeaders() },
    body: JSON.stringify({
      product_id: Number(productId),
      order_quantity: quantity,
      historical_purchase_frequency: 0,
      current_season: "regular",
    }),
  });
  return Number(data.recommended_price);
}

export async function uploadProductImagesApi(files: File[]): Promise<string[]> {
  if (!files.length) return [];

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_BASE_URL}/api/products/upload-images`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });

  if (!response.ok) {
    let detail = "Image upload failed";
    try {
      const data = await response.json();
      detail = data.detail ?? detail;
    } catch {
      // noop
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as ProductImageUploadResponse;
  return data.urls;
}

export async function createOrderApi(
  items: Array<{ productId: string; quantity: number }>,
  options?: { idempotencyKey?: string },
): Promise<Order> {
  const order = await request<BackendOrder>("/api/orders", {
    method: "POST",
    headers: {
      ...authHeaders(),
      ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      items: items.map((item) => ({
        product_id: Number(item.productId),
        quantity: item.quantity,
      })),
    }),
  });
  return toOrder(order);
}

export async function getOrdersApi(): Promise<Order[]> {
  const orders = await request<BackendOrder[]>("/api/orders", {
    method: "GET",
    headers: { ...authHeaders() },
  });
  return orders.map(toOrder);
}

export async function assignTransportApi(
  orderId: string,
  payload: { transportService: string; status: string; estimatedDeliveryAt?: string | null },
): Promise<Order> {
  const order = await request<BackendOrder>(`/api/orders/${orderId}/assign-transport`, {
    method: "PATCH",
    headers: { ...authHeaders() },
    body: JSON.stringify({
      transport_service: payload.transportService,
      status: payload.status,
      estimated_delivery_at: payload.estimatedDeliveryAt ?? null,
    }),
  });
  return toOrder(order);
}

export async function getTransportAssignedOrdersApi(): Promise<Order[]> {
  const orders = await request<BackendOrder[]>("/api/orders/transport/assigned", {
    method: "GET",
    headers: { ...authHeaders() },
  });
  return orders.map(toOrder);
}

export async function updateTransportOrderStatusApi(
  orderId: string,
  payload: { status: string; estimatedDeliveryAt?: string | null },
): Promise<Order> {
  const order = await request<BackendOrder>(`/api/orders/${orderId}/transport-status`, {
    method: "PATCH",
    headers: { ...authHeaders() },
    body: JSON.stringify({
      status: payload.status,
      estimated_delivery_at: payload.estimatedDeliveryAt ?? null,
    }),
  });
  return toOrder(order);
}

export async function createFeedbackApi(payload: {
  orderId?: string;
  category: "feedback" | "complaint";
  message: string;
}): Promise<FeedbackItem> {
  const item = await request<BackendFeedback>("/api/feedback", {
    method: "POST",
    headers: { ...authHeaders() },
    body: JSON.stringify({
      order_id: payload.orderId ? Number(payload.orderId) : null,
      category: payload.category,
      message: payload.message,
    }),
  });
  return toFeedback(item);
}

export async function getMyFeedbackApi(): Promise<FeedbackItem[]> {
  const items = await request<BackendFeedback[]>("/api/feedback/me", {
    method: "GET",
    headers: { ...authHeaders() },
  });
  return items.map(toFeedback);
}

export async function getAdminFeedbackApi(): Promise<FeedbackItem[]> {
  const items = await request<BackendFeedback[]>("/api/feedback", {
    method: "GET",
    headers: { ...authHeaders() },
  });
  return items.map(toFeedback);
}

export async function reviewFeedbackApi(
  feedbackId: string,
  payload: { status: "open" | "reviewed" | "resolved" | "rejected"; adminNote?: string },
): Promise<FeedbackItem> {
  const item = await request<BackendFeedback>(`/api/feedback/${feedbackId}`, {
    method: "PATCH",
    headers: { ...authHeaders() },
    body: JSON.stringify({
      status: payload.status,
      admin_note: payload.adminNote ?? null,
    }),
  });
  return toFeedback(item);
}

export async function getBusinessAnalystApi(query: string): Promise<AnalystReport> {
  const data = await request<BackendAnalystResponse>("/api/analyst/recommendations", {
    method: "POST",
    headers: { ...authHeaders() },
    body: JSON.stringify({ query }),
  });

  return {
    summary: data.summary,
    businessKpis: data.business_kpis,
    transportPerformance: data.transport_performance.map((item) => ({
      transportService: item.transport_service,
      orderCount: Number(item.order_count),
      revenue: Number(item.revenue),
      grossProfit: Number(item.gross_profit),
      deliveredCount: Number(item.delivered_count),
      pendingCount: Number(item.pending_count),
    })),
    productOpportunities: data.product_opportunities.map((item) => ({
      product: item.product,
      unitsSold: Number(item.units_sold),
      revenue: Number(item.revenue),
      grossProfit: Number(item.gross_profit),
    })),
    regionalDemand: data.regional_demand.map((item) => ({
      segment: item.segment,
      units: Number(item.units),
      revenue: Number(item.revenue),
    })),
    channelDemand: data.channel_demand.map((item) => ({
      segment: item.segment,
      units: Number(item.units),
      revenue: Number(item.revenue),
    })),
    recommendations: data.recommendations,
    ragContext: data.rag_context,
    memoryBackend: data.memory_backend,
  };
}

export async function submitContactQueryApi(payload: {
  name: string;
  email: string;
  phone?: string;
  inquiryType: "retail" | "bulk";
  message: string;
}): Promise<FeedbackItem> {
  const composedMessage = [
    `[CONTACT_QUERY]`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone?.trim() || "-"}`,
    `Inquiry Type: ${payload.inquiryType}`,
    `Message: ${payload.message}`,
  ].join(" | ");

  return createFeedbackApi({
    category: "feedback",
    message: composedMessage,
  });
}
