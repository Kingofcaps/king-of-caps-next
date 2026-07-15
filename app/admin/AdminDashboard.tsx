"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { formatPrice, parsePrice, type Order, type OrderStatus } from "@/app/lib/orders";
import type { Product } from "@/app/lib/products";
import { exportOrdersPdf, exportOrdersXlsx, filterOrdersForExport, totalExportRevenue, type ExportDateFilter } from "./orderExports";

type ProductForm = Omit<Product, "id" | "image" | "images" | "inStock">;
type AdminView = "dashboard" | "products" | "orders";
type ProductFilter = "all" | "in_stock" | "low_stock" | "out_of_stock" | "featured" | "new_arrival";
type ProductSort = "newest" | "name_asc" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc";
type OrdersFilter = "all" | OrderStatus | "payment_pending" | "paid";
type OrdersDateFilter = "all" | "today" | "last_7_days" | "last_30_days";
type OrdersSort = "newest" | "oldest" | "amount_asc" | "amount_desc";

const emptyProduct: ProductForm = {
  name: "",
  price: "5 000 FCFA",
  description: "",
  brand: "King Of Caps",
  category: "Casquette",
  color: "",
  stockQuantity: 1,
  featured: false,
  newArrival: false,
  available: true,
};

const fieldClassName = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]";
const fileInputClassName = "block w-full cursor-pointer rounded-xl border border-dashed border-gray-300 bg-white p-2.5 text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:font-bold file:text-black focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]";

function setTextField<T extends ProductForm | Product>(form: T, name: string, value: string) {
  return {
    ...form,
    [name]: name === "stockQuantity" ? Math.max(0, Number(value) || 0) : value,
  } as T;
}

function stockColorClassName(quantity: number) {
  if (quantity === 0) return "bg-red-100 text-red-700";
  if (quantity <= 10) return "bg-orange-100 text-orange-800";
  return "bg-green-100 text-green-800";
}

function stockTextClassName(quantity: number) {
  if (quantity === 0) return "text-red-700";
  if (quantity <= 10) return "text-orange-700";
  return "text-green-700";
}

const paymentStatusLabels = { pending: "En attente", paid: "Payé", failed: "Échec" } as const;
const orderStatusLabels: Record<OrderStatus, string> = { new: "Nouvelle", confirmed: "Confirmée", preparing: "En préparation", delivered: "Livrée", cancelled: "Annulée" };
const paymentStatusClassNames: Record<Order["payment_status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};
const orderStatusClassNames: Record<OrderStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  confirmed: "bg-purple-100 text-purple-800",
  preparing: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function paymentMethodLabel(method: Order["payment_method"]) {
  return method === "cash_on_delivery" ? "Paiement à la livraison" : method === "mobile_money" ? "Mobile Money" : "Carte bancaire";
}

function orderWhatsAppUrl(order: Order) {
  const number = order.customer_phone.replace(/\D/g, "");
  if (!number) return null;
  const phone = number.startsWith("229") ? number : `229${number}`;
  const message = `Bonjour ${order.customer_first_name} ${order.customer_last_name}, nous vous contactons concernant votre commande ${order.order_number} de ${order.product_name}, quantité ${order.quantity}, total ${formatPrice(order.total_amount)}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function dayKey(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayLabel(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(value);
}

export default function AdminDashboard({ initialProducts, view }: { initialProducts: Product[]; view: AdminView }) {
  const [products, setProducts] = useState(initialProducts);
  const [newProduct, setNewProduct] = useState<ProductForm>(emptyProduct);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editedImage, setEditedImage] = useState<File | null>(null);
  const [editedImages, setEditedImages] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [updatingStockIds, setUpdatingStockIds] = useState<Set<string>>(new Set());
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockError, setRestockError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState("");
  const [ordersMessage, setOrdersMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderPendingDeletion, setOrderPendingDeletion] = useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [productSort, setProductSort] = useState<ProductSort>("newest");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [ordersFilter, setOrdersFilter] = useState<OrdersFilter>("all");
  const [ordersDateFilter, setOrdersDateFilter] = useState<OrdersDateFilter>("all");
  const [ordersSort, setOrdersSort] = useState<OrdersSort>("newest");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportDateFilter, setExportDateFilter] = useState<ExportDateFilter>("all");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState<"xlsx" | "pdf" | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [newOrderToast, setNewOrderToast] = useState("");
  const knownOrderIdsRef = useRef<Set<string> | null>(null);
  const hasLoadedInitialOrdersRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const updatingStockIdsRef = useRef<Set<string>>(new Set());
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchesSearch = !query || [product.name, product.brand, product.category, product.color].some((value) => value.toLowerCase().includes(query));
      const matchesFilter = productFilter === "all" || (productFilter === "in_stock" && product.stockQuantity > 0) || (productFilter === "low_stock" && product.stockQuantity >= 1 && product.stockQuantity <= 3) || (productFilter === "out_of_stock" && product.stockQuantity === 0) || (productFilter === "featured" && product.featured) || (productFilter === "new_arrival" && product.newArrival);
      return matchesSearch && matchesFilter;
    });
    return [...result].sort((first, second) => {
      if (productSort === "name_asc") return first.name.localeCompare(second.name, "fr");
      if (productSort === "price_asc") return parsePrice(first.price) - parsePrice(second.price);
      if (productSort === "price_desc") return parsePrice(second.price) - parsePrice(first.price);
      if (productSort === "stock_asc") return first.stockQuantity - second.stockQuantity;
      if (productSort === "stock_desc") return second.stockQuantity - first.stockQuantity;
      return Number(second.id) - Number(first.id);
    });
  }, [products, productFilter, productSearch, productSort]);
  const filteredOrders = useMemo(() => {
    const query = ordersSearch.trim().toLowerCase();
    const today = dayKey(new Date());
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (ordersDateFilter === "last_7_days" ? 6 : 29));
    const result = orders.filter((order) => {
      const matchesSearch = !query || [order.order_number, order.customer_first_name, order.customer_last_name, order.customer_phone, order.product_name].some((value) => value.toLowerCase().includes(query));
      const matchesFilter = ordersFilter === "all" || (ordersFilter === "payment_pending" && order.payment_status === "pending") || (ordersFilter === "paid" && order.payment_status === "paid") || (ordersFilter in orderStatusLabels && order.order_status === ordersFilter);
      const orderDate = new Date(order.created_at);
      const matchesDate = ordersDateFilter === "all" || (ordersDateFilter === "today" && dayKey(order.created_at) === today) || (ordersDateFilter !== "today" && orderDate >= fromDate);
      return matchesSearch && matchesFilter && matchesDate;
    });
    return [...result].sort((first, second) => {
      if (ordersSort === "oldest") return new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
      if (ordersSort === "amount_asc") return first.total_amount - second.total_amount;
      if (ordersSort === "amount_desc") return second.total_amount - first.total_amount;
      return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
    });
  }, [orders, ordersDateFilter, ordersFilter, ordersSearch, ordersSort]);
  const ordersForExport = useMemo(() => filterOrdersForExport(orders, exportDateFilter, exportStartDate, exportEndDate), [exportDateFilter, exportEndDate, exportStartDate, orders]);
  const dashboard = useMemo(() => {
    const today = dayKey(new Date());
    const revenueOrders = orders.filter((order) => order.order_status !== "cancelled" && (order.payment_status === "paid" || (order.payment_method === "cash_on_delivery" && order.order_status === "delivered")));
    const recentOrders = [...orders].sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime()).slice(0, 10);
    const days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (29 - index));
      return { key: dayKey(date), label: dayLabel(date), revenue: 0, orders: 0 };
    });
    const dayIndex = new Map(days.map((day, index) => [day.key, index]));
    const sales = new Map<string, { name: string; image: string; quantity: number; revenue: number }>();

    orders.forEach((order) => {
      const index = dayIndex.get(dayKey(order.created_at));
      if (index !== undefined) {
        days[index].orders += 1;
        if (order.order_status !== "cancelled" && (order.payment_status === "paid" || (order.payment_method === "cash_on_delivery" && order.order_status === "delivered"))) days[index].revenue += order.total_amount;
      }
      if (order.order_status !== "cancelled") {
        const sale = sales.get(order.product_id) ?? { name: order.product_name, image: order.product_image, quantity: 0, revenue: 0 };
        sale.quantity += order.quantity;
        sale.revenue += order.total_amount;
        sales.set(order.product_id, sale);
      }
    });

    return {
      totalRevenue: revenueOrders.reduce((total, order) => total + order.total_amount, 0),
      revenueToday: revenueOrders.filter((order) => dayKey(order.created_at) === today).reduce((total, order) => total + order.total_amount, 0),
      ordersToday: orders.filter((order) => dayKey(order.created_at) === today).length,
      pendingOrders: orders.filter((order) => order.order_status === "new").length,
      deliveredOrders: orders.filter((order) => order.order_status === "delivered").length,
      cancelledOrders: orders.filter((order) => order.order_status === "cancelled").length,
      days,
      bestSelling: [...sales.values()].sort((first, second) => second.quantity - first.quantity).slice(0, 5),
      recentOrders,
      lowStock: products.filter((product) => product.stockQuantity >= 1 && product.stockQuantity <= 3),
      outOfStock: products.filter((product) => product.stockQuantity === 0),
    };
  }, [orders, products]);

  const playNewOrderSound = useCallback(async (force = false) => {
    if ((!isSoundEnabled && !force) || typeof window === "undefined") return;

    try {
      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;
      if (context.state === "suspended") await context.resume();
      console.log("Playing order sound");
      const startAt = context.currentTime;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.045, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.28);
      gain.connect(context.destination);

      [784, 1047].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startAt + index * 0.11);
        oscillator.connect(gain);
        oscillator.start(startAt + index * 0.11);
        oscillator.stop(startAt + 0.29);
      });
    } catch (error) {
      console.error("Order sound playback failed:", error);
    }
  }, [isSoundEnabled]);

  const showNewOrderToast = useCallback((orderNumber: string) => {
    setNewOrderToast(`Nouvelle commande reçue — ${orderNumber}`);
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setNewOrderToast(""), 6000);
  }, []);

  const announceNewOrder = useCallback((id: string, orderNumber: string) => {
    const knownOrderIds = knownOrderIdsRef.current ?? new Set<string>();
    knownOrderIdsRef.current = knownOrderIds;
    if (knownOrderIds.has(id)) return;

    knownOrderIds.add(id);
    console.log("New order detected", orderNumber);
    showNewOrderToast(orderNumber);
    void playNewOrderSound();
  }, [playNewOrderSound, showNewOrderToast]);

  const refreshOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = (await response.json()) as Order[] & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Impossible de charger les commandes.");

      if (!hasLoadedInitialOrdersRef.current) {
        knownOrderIdsRef.current = new Set(data.map((order) => order.id));
        hasLoadedInitialOrdersRef.current = true;
      } else {
        data.forEach((order) => announceNewOrder(order.id, order.order_number));
      }
      setOrders(data);
      setOrdersError("");
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Impossible de charger les commandes.");
    }
  }, [announceNewOrder]);

  useEffect(() => {
    const preferenceTimeout = window.setTimeout(() => {
      setIsSoundEnabled(window.localStorage.getItem("king-of-caps-admin-order-sound") === "enabled");
    }, 0);
    return () => {
      window.clearTimeout(preferenceTimeout);
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => { void refreshOrders(); }, 0);
    if (view !== "orders") return () => window.clearTimeout(initialRefresh);
    const interval = window.setInterval(() => { void refreshOrders(); }, 20_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refreshOrders, view]);

  useEffect(() => {
    if (view !== "orders") return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase Realtime is unavailable: public Supabase environment variables are missing.");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const channel = supabase
      .channel("king-of-caps-admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = payload.new as Pick<Order, "id" | "order_number">;
        if (!order.id || !order.order_number) return;
        announceNewOrder(order.id, order.order_number);
        void refreshOrders();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("Realtime subscription connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.error("Supabase Realtime subscription failed; polling remains active.");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [announceNewOrder, refreshOrders, view]);

  async function toggleOrderSound() {
    if (isSoundEnabled) {
      window.localStorage.removeItem("king-of-caps-admin-order-sound");
      setIsSoundEnabled(false);
      return;
    }

    try {
      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;
      await context.resume();
      window.localStorage.setItem("king-of-caps-admin-order-sound", "enabled");
      setIsSoundEnabled(true);
      console.log("Order sound enabled");
      await playNewOrderSound(true);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Le son ne peut pas être activé dans ce navigateur.");
    }
  }

  async function readResponse<T = Product>(response: Response) {
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Une erreur est survenue.");
    return data;
  }

  function appendFormData(formData: FormData, product: ProductForm | Product, image: File | null, images: File[]) {
    formData.set("name", product.name);
    formData.set("price", product.price);
    formData.set("description", product.description);
    formData.set("brand", product.brand);
    formData.set("category", product.category);
    formData.set("color", product.color);
    formData.set("stockQuantity", String(product.stockQuantity));
    formData.set("featured", String(product.featured));
    formData.set("newArrival", String(product.newArrival));
    formData.set("available", String(product.available));
    if (image) formData.set("image", image);
    images.forEach((file) => formData.append("images", file));
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      const formData = new FormData();
      appendFormData(formData, newProduct, newImage, newImages);
      const product = await readResponse(
        await fetch("/api/admin/products", { method: "POST", body: formData }),
      );
      setProducts((current) => [...current, product]);
      setNewProduct(emptyProduct);
      setNewImage(null);
      setNewImages([]);
      setMessage("Produit ajouté.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’ajouter le produit.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setMessage("");
    setIsSaving(true);

    try {
      let product = await readResponse(
        await fetch(`/api/admin/products/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editing.name,
            price: editing.price,
            description: editing.description,
            brand: editing.brand,
            category: editing.category,
            color: editing.color,
            stockQuantity: editing.stockQuantity,
            featured: editing.featured,
            newArrival: editing.newArrival,
            available: editing.available,
          }),
        }),
      );

      if (editedImage || editedImages.length > 0) {
        const formData = new FormData();
        appendFormData(formData, editing, editedImage, editedImages);
        product = await readResponse(
          await fetch(`/api/admin/products/${editing.id}/image`, { method: "POST", body: formData }),
        );
      }

      setProducts((current) => current.map((item) => (item.id === product.id ? product : item)));
      setEditing(null);
      setEditedImage(null);
      setEditedImages([]);
      setMessage("Produit mis à jour.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de modifier le produit.");
    } finally {
      setIsSaving(false);
    }
  }

  function setStockUpdatePending(id: string, isPending: boolean) {
    if (isPending) updatingStockIdsRef.current.add(id);
    else updatingStockIdsRef.current.delete(id);
    setUpdatingStockIds(new Set(updatingStockIdsRef.current));
  }

  async function updateStock(product: Product, quantity: number, successMessage: string) {
    if (updatingStockIdsRef.current.has(product.id)) return false;

    const stockQuantity = Math.max(0, Math.floor(quantity));
    const optimisticProduct = {
      ...product,
      stockQuantity,
      available: stockQuantity > 0,
      inStock: stockQuantity > 0,
    };

    setMessage("");
    setStockUpdatePending(product.id, true);
    setProducts((current) => current.map((item) => item.id === product.id ? optimisticProduct : item));

    try {
      const updatedProduct = await readResponse<Product>(
        await fetch(`/api/admin/products/${product.id}/stock`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockQuantity }),
        }),
      );
      setProducts((current) => current.map((item) => item.id === product.id ? updatedProduct : item));
      setEditing((current) => current?.id === product.id ? updatedProduct : current);
      setMessage(successMessage);
      return true;
    } catch (error) {
      setProducts((current) => current.map((item) => item.id === product.id ? product : item));
      setMessage(error instanceof Error ? error.message : "Impossible de mettre à jour le stock.");
      return false;
    } finally {
      setStockUpdatePending(product.id, false);
    }
  }

  async function changeStock(product: Product, change: -1 | 1) {
    const stockQuantity = Math.max(0, product.stockQuantity + change);
    if (stockQuantity === product.stockQuantity) return;
    await updateStock(product, stockQuantity, `Stock de ${product.name} mis à jour.`);
  }

  function openRestockPopup(product: Product) {
    setRestockingProduct(product);
    setRestockQuantity(String(product.stockQuantity));
    setRestockError("");
    setMessage("");
  }

  async function restockProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restockingProduct) return;

    const quantity = Number(restockQuantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setRestockError("Saisissez une quantité entière supérieure ou égale à 0.");
      return;
    }

    setRestockError("");
    const didUpdate = await updateStock(
      restockingProduct,
      quantity,
      `${restockingProduct.name} réapprovisionné à ${quantity} unité${quantity > 1 ? "s" : ""}.`,
    );
    if (didUpdate) setRestockingProduct(null);
    else setRestockError("La mise à jour a échoué. Réessayez.");
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Supprimer définitivement ce produit ?")) return;
    setMessage("");

    try {
      await readResponse(await fetch(`/api/admin/products/${id}`, { method: "DELETE" }));
      setProducts((current) => current.filter((product) => product.id !== id));
      setMessage("Produit supprimé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de supprimer le produit.");
    }
  }

  async function updateOrderStatus(id: string, orderStatus: OrderStatus) {
    setUpdatingOrderId(id);
    setOrdersError("");
    setOrdersMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus }),
      });
      const order = await readResponse<Order>(response);
      setOrders((current) => current.map((item) => item.id === order.id ? order : item));
      setOrdersMessage(`Commande ${order.order_number} mise à jour.`);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Impossible de modifier la commande.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function deleteOrderPermanently() {
    if (!orderPendingDeletion || deletingOrderId) return;
    const orderId = orderPendingDeletion.id;
    setDeletingOrderId(orderId);
    setOrdersError("");

    try {
      await readResponse<{ success: boolean; id: string }>(await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" }));
      setOrders((current) => current.filter((order) => order.id !== orderId));
      setExpandedOrderId((current) => current === orderId ? null : current);
      setOrderPendingDeletion(null);
      setOrdersMessage("Commande supprimée avec succès.");
      setNewOrderToast("Commande supprimée avec succès.");
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(() => setNewOrderToast(""), 6000);
    } catch {
      setOrdersError("Impossible de supprimer la commande.");
    } finally {
      setDeletingOrderId(null);
    }
  }

  function resetProductControls() {
    setProductSearch("");
    setProductFilter("all");
    setProductSort("newest");
  }

  function resetOrderControls() {
    setOrdersSearch("");
    setOrdersFilter("all");
    setOrdersDateFilter("all");
    setOrdersSort("newest");
  }

  async function exportOrders(format: "xlsx" | "pdf") {
    if (exportDateFilter === "custom" && exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
      setExportError("La date de début doit précéder la date de fin.");
      return;
    }
    setExportError("");
    setIsExporting(format);
    try {
      if (format === "xlsx") await exportOrdersXlsx(ordersForExport);
      else await exportOrdersPdf(ordersForExport);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Impossible de générer cet export.");
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      {newOrderToast && <div role="status" className="fixed right-4 top-4 z-[60] max-w-[calc(100vw-2rem)] rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-xl">{newOrderToast}</div>}
      {view === "dashboard" && <div className="space-y-10">
          <section className="rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div><p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">VUE D’ENSEMBLE</p><h2 className="mt-2 text-3xl font-black">Performance de la boutique</h2><p className="mt-2 text-sm text-zinc-500">Suivez vos produits, commandes et revenus en temps réel.</p></div>
              <div className="flex flex-wrap gap-3"><Link href="/admin/products" className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c9a227]">Ajouter un produit</Link><Link href="/admin/orders" className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:border-[#c9a227]">Voir les commandes</Link><Link href="/" className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:border-[#c9a227]">Voir la boutique</Link><Link href="https://vercel.com/king-of-caps/king-of-caps-next-njpq/analytics" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:border-[#c9a227]">Voir les statistiques du site</Link></div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <DashboardStat label="Total produits" value={products.length} />
              <DashboardStat label="Produits en stock" value={products.filter((product) => product.stockQuantity > 0).length} tone="green" />
              <DashboardStat label="Produits en rupture" value={dashboard.outOfStock.length} tone="red" />
              <DashboardStat label="Total commandes" value={orders.length} />
              <DashboardStat label="Commandes aujourd’hui" value={dashboard.ordersToday} tone="gold" />
              <DashboardStat label="Chiffre d’affaires aujourd’hui" value={formatPrice(dashboard.revenueToday)} tone="gold" />
              <DashboardStat label="Chiffre d’affaires total" value={formatPrice(dashboard.totalRevenue)} tone="gold" />
              <DashboardStat label="Commandes en attente" value={dashboard.pendingOrders} tone="blue" />
              <DashboardStat label="Commandes livrées" value={dashboard.deliveredOrders} tone="green" />
              <DashboardStat label="Commandes annulées" value={dashboard.cancelledOrders} tone="red" />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <DashboardChart title="Revenus — 30 derniers jours" values={dashboard.days.map((day) => day.revenue)} labels={dashboard.days.map((day) => day.label)} valueFormatter={formatPrice} />
            <DashboardChart title="Commandes — 30 derniers jours" values={dashboard.days.map((day) => day.orders)} labels={dashboard.days.map((day) => day.label)} valueFormatter={(value) => `${value} commande${value > 1 ? "s" : ""}`} />
            <section className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm"><h3 className="font-black">Produits les plus vendus</h3><div className="mt-5 space-y-3">{dashboard.bestSelling.length > 0 ? dashboard.bestSelling.map((product, index) => <div key={`${product.name}-${index}`} className="flex items-center gap-3 rounded-xl bg-[#fafafa] p-3"><div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100"><Image src={product.image} alt="" fill sizes="40px" className="object-cover" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-zinc-800">{index + 1}. {product.name}</p><p className="mt-0.5 text-xs font-semibold text-zinc-500">{product.quantity} vendue{product.quantity > 1 ? "s" : ""}</p></div><span className="shrink-0 text-sm font-black text-[#c9a227]">{formatPrice(product.revenue)}</span></div>) : <p className="text-sm text-zinc-500">Aucune vente enregistrée.</p>}</div><div className="mt-5 border-t border-[#e5e5e5] pt-4"><p className="text-sm font-bold text-zinc-800">Produits les plus vus</p><p className="mt-1 text-sm text-zinc-500">Données de vues indisponibles.</p></div></section>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <StockAlert title="Stock faible" description="Entre 1 et 3 unités restantes." products={dashboard.lowStock} tone="amber" />
            <StockAlert title="Rupture de stock" description="Ces produits ne peuvent plus être commandés en ligne." products={dashboard.outOfStock} tone="red" />
          </section>

          <section className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">COMMANDES RÉCENTES</p><h3 className="mt-2 text-2xl font-black">Les 10 dernières commandes</h3></div><Link href="/admin/orders" className="text-sm font-bold text-[#a8861e] hover:text-black">Voir toutes →</Link></div><div className="mt-5 overflow-x-auto"><table className="min-w-[860px] w-full text-left text-sm"><thead className="border-b border-[#e5e5e5] text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-3 py-3">Commande</th><th className="px-3 py-3">Client</th><th className="px-3 py-3">Produit</th><th className="px-3 py-3">Qté</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Paiement</th><th className="px-3 py-3">Statut</th><th className="px-3 py-3">Date</th></tr></thead><tbody>{dashboard.recentOrders.map((order) => <tr key={order.id} className="border-b border-[#f0f0f0] last:border-0"><td className="px-3 py-3 font-bold text-[#a8861e]">{order.order_number}</td><td className="px-3 py-3 text-zinc-700">{order.customer_first_name} {order.customer_last_name}</td><td className="max-w-48 truncate px-3 py-3 font-semibold text-zinc-800">{order.product_name}</td><td className="px-3 py-3 text-zinc-700">{order.quantity}</td><td className="px-3 py-3 font-bold text-[#a8861e]">{formatPrice(order.total_amount)}</td><td className="px-3 py-3 text-zinc-700">{paymentMethodLabel(order.payment_method)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${orderStatusClassNames[order.order_status]}`}>{orderStatusLabels[order.order_status]}</span></td><td className="px-3 py-3 text-zinc-500">{new Date(order.created_at).toLocaleDateString("fr-FR")}</td></tr>)}{dashboard.recentOrders.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-zinc-500">Aucune commande récente.</td></tr>}</tbody></table></div></section>
      </div>}

      {view === "products" && <div className="space-y-10">
          <section className="rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">GESTION PRODUIT</p>
            <h2 className="mt-2 text-2xl font-black">Ajouter une casquette</h2>
            <ProductEditor
              form={newProduct}
              onTextChange={(name, value) => setNewProduct((current) => setTextField(current, name, value))}
              onToggle={(name, value) => setNewProduct((current) => ({ ...current, [name]: value }))}
              onImageChange={setNewImage}
              onImagesChange={setNewImages}
              onSubmit={createProduct}
              submitLabel={isSaving ? "Enregistrement…" : "Ajouter le produit"}
            />
          </section>

          <section>
            <div className="mb-6 rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><label className="relative"><span className="sr-only">Rechercher un produit</span><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Rechercher par nom, marque, catégorie ou couleur..." className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-gray-400 focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]" /></label><div className="flex flex-wrap items-center gap-3"><select value={productSort} onChange={(event) => setProductSort(event.target.value as ProductSort)} className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]"><option value="newest">Plus récents</option><option value="name_asc">Nom A–Z</option><option value="price_asc">Prix croissant</option><option value="price_desc">Prix décroissant</option><option value="stock_asc">Stock croissant</option><option value="stock_desc">Stock décroissant</option></select><button type="button" onClick={resetProductControls} className="rounded-xl border border-[#e5e5e5] px-3 py-3 text-sm font-bold text-zinc-700 transition hover:border-[#c9a227] hover:text-black">Réinitialiser</button></div></div>
              <div className="mt-4 flex flex-wrap gap-2">{([ ["all", "Tous"], ["in_stock", "En stock"], ["low_stock", "Stock faible"], ["out_of_stock", "Rupture de stock"], ["featured", "À la une"], ["new_arrival", "Nouveauté"] ] as Array<[ProductFilter, string]>).map(([filter, label]) => <button key={filter} type="button" onClick={() => setProductFilter(filter)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${productFilter === filter ? "border-[#c9a227] bg-[#c9a227]/15 text-[#a8861e]" : "border-[#e5e5e5] text-zinc-600 hover:border-[#c9a227]"}`}>{label}</button>)}</div>
              <p className="mt-4 text-sm font-semibold text-zinc-500">{filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""} trouvé{filteredProducts.length > 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">CATALOGUE</p>
                <h2 className="mt-2 text-3xl font-black">{filteredProducts.length} produits</h2>
              </div>
              {message && <p className="text-sm font-semibold text-[#a8861e]">{message}</p>}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-sm">
                  <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl">
                    <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover" />
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{product.name}</h3>
                        <p className="mt-1 font-black text-[#c9a227]">{product.price}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${stockColorClassName(product.stockQuantity)}`}>
                        {product.stockQuantity === 0 ? "Rupture de stock" : product.stockQuantity <= 10 ? "Stock faible" : "En stock"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{product.brand || "Sans marque"} · {product.category || "Sans catégorie"}</p>
                    <p className={`mt-2 text-sm font-black ${stockTextClassName(product.stockQuantity)}`}>Stock : {product.stockQuantity} unité{product.stockQuantity > 1 ? "s" : ""}</p>
                    <p className="mt-1 text-xs text-zinc-500">{product.images.length} image(s)</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                      {product.featured && <span className="rounded-full bg-amber-100 px-2 py-1 text-[#a8861e]">À la une</span>}
                      {product.newArrival && <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700">Nouveau</span>}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" disabled={updatingStockIds.has(product.id) || product.stockQuantity === 0} onClick={() => changeStock(product, -1)} aria-label={`Diminuer le stock de ${product.name} de 1`} className="rounded-xl border border-[#e5e5e5] bg-white px-2 py-2 text-xs font-black text-zinc-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40">➖ −1</button>
                      <button type="button" disabled={updatingStockIds.has(product.id)} onClick={() => changeStock(product, 1)} aria-label={`Augmenter le stock de ${product.name} de 1`} className="rounded-xl border border-[#e5e5e5] bg-white px-2 py-2 text-xs font-black text-zinc-700 transition hover:border-green-300 hover:bg-green-50 disabled:cursor-wait disabled:opacity-40">➕ +1</button>
                      <button type="button" disabled={updatingStockIds.has(product.id)} onClick={() => openRestockPopup(product)} className="col-span-2 rounded-xl border border-[#c9a227]/40 bg-amber-50 px-3 py-2 text-xs font-black text-[#a8861e] transition hover:border-[#c9a227] disabled:cursor-wait disabled:opacity-40">Réapprovisionner</button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => { setEditing({ ...product }); setEditedImage(null); setEditedImages([]); }} className="flex-1 rounded-xl bg-black py-2 text-xs font-black text-white transition hover:bg-[#c9a227]">Modifier</button>
                      <button onClick={() => deleteProduct(product.id)} className="rounded-xl border border-red-200 px-2.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50">Supprimer</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {filteredProducts.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[#e5e5e5] bg-white px-5 py-12 text-center text-sm font-semibold text-zinc-500">Aucun produit ne correspond à votre recherche ou à vos filtres.</div>}
          </section>
      </div>}

      {view === "orders" && <section className="rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">COMMANDES</p><h2 className="mt-2 text-3xl font-black">Gestion des commandes</h2></div><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1 text-sm font-bold ${isSoundEnabled ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>{isSoundEnabled ? "Son activé" : "Son désactivé"}</span><button type="button" onClick={toggleOrderSound} className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:border-[#c9a227]">{isSoundEnabled ? "Désactiver le son" : "Activer le son"}</button><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-[#a8861e]">{filteredOrders.length}</span><button type="button" onClick={() => { setIsExportOpen((current) => !current); setExportError(""); }} className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c9a227]">Exporter</button></div></div>
          {ordersError && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ordersError}</p>}
          <div className="mt-6 space-y-4">
            {ordersMessage && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ordersMessage}</p>}
            {isExportOpen && <section className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-black">Exporter les commandes</h3><p className="mt-1 text-sm text-zinc-500">Choisissez la période puis le format du fichier.</p></div><button type="button" onClick={() => setIsExportOpen(false)} className="text-sm font-bold text-zinc-500 hover:text-black">Fermer</button></div><div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><label className="text-sm font-bold text-zinc-700"><span className="mb-2 block">Période</span><select value={exportDateFilter} onChange={(event) => setExportDateFilter(event.target.value as ExportDateFilter)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-black outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]"><option value="all">Toutes les commandes</option><option value="today">Aujourd&apos;hui</option><option value="week">Cette semaine</option><option value="month">Ce mois</option><option value="custom">Intervalle personnalisé</option></select></label>{exportDateFilter === "custom" && <><label className="text-sm font-bold text-zinc-700"><span className="mb-2 block">Du</span><input type="date" value={exportStartDate} onChange={(event) => setExportStartDate(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-black outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]" /></label><label className="text-sm font-bold text-zinc-700"><span className="mb-2 block">Au</span><input type="date" value={exportEndDate} onChange={(event) => setExportEndDate(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-black outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]" /></label></>}</div><div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" disabled={isExporting !== null} onClick={() => exportOrders("xlsx")} className="rounded-xl bg-[#1d6f42] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#165a35] disabled:opacity-60">{isExporting === "xlsx" ? "Export Excel…" : "Exporter en Excel (.xlsx)"}</button><button type="button" disabled={isExporting !== null} onClick={() => exportOrders("pdf")} className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c9a227] disabled:opacity-60">{isExporting === "pdf" ? "Export PDF…" : "Exporter en PDF"}</button><span className="text-sm font-semibold text-zinc-500">{ordersForExport.length} commande{ordersForExport.length > 1 ? "s" : ""} · Revenu : {formatPrice(totalExportRevenue(ordersForExport))}</span></div>{exportError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{exportError}</p>}</section>}
            <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center"><label><span className="sr-only">Rechercher une commande</span><input value={ordersSearch} onChange={(event) => setOrdersSearch(event.target.value)} placeholder="Rechercher par numéro, client, téléphone ou produit..." className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-gray-400 focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]" /></label><select value={ordersDateFilter} onChange={(event) => setOrdersDateFilter(event.target.value as OrdersDateFilter)} className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]"><option value="all">Toutes les dates</option><option value="today">Aujourd’hui</option><option value="last_7_days">7 derniers jours</option><option value="last_30_days">30 derniers jours</option></select><div className="flex flex-wrap gap-3"><select value={ordersSort} onChange={(event) => setOrdersSort(event.target.value as OrdersSort)} className="rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-[#c9a227] focus:ring-1 focus:ring-[#c9a227]"><option value="newest">Plus récentes</option><option value="oldest">Plus anciennes</option><option value="amount_asc">Montant croissant</option><option value="amount_desc">Montant décroissant</option></select><button type="button" onClick={resetOrderControls} className="rounded-xl border border-[#e5e5e5] bg-white px-3 py-3 text-sm font-bold text-zinc-700 transition hover:border-[#c9a227] hover:text-black">Réinitialiser</button></div></div><div className="mt-4 flex flex-wrap gap-2">{([ ["all", "Toutes"], ["new", "Nouvelles"], ["confirmed", "Confirmées"], ["preparing", "En préparation"], ["delivered", "Livrées"], ["cancelled", "Annulées"], ["payment_pending", "Paiement en attente"], ["paid", "Payées"] ] as Array<[OrdersFilter, string]>).map(([filter, label]) => <button key={filter} type="button" onClick={() => setOrdersFilter(filter)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${ordersFilter === filter ? "border-[#c9a227] bg-[#c9a227]/15 text-[#a8861e]" : "border-[#e5e5e5] bg-white text-zinc-600 hover:border-[#c9a227]"}`}>{label}</button>)}</div><p className="mt-4 text-sm font-semibold text-zinc-500">{filteredOrders.length} commande{filteredOrders.length > 1 ? "s" : ""} trouvée{filteredOrders.length > 1 ? "s" : ""}</p></div>
            {filteredOrders.map((order) => <OrderCard key={order.id} order={order} isUpdating={updatingOrderId === order.id} isExpanded={expandedOrderId === order.id} onStatusChange={updateOrderStatus} onToggleDetails={() => setExpandedOrderId((current) => current === order.id ? null : order.id)} onDelete={() => setOrderPendingDeletion(order)} />)}
            {!ordersError && filteredOrders.length === 0 && <p className="rounded-xl border border-dashed border-[#e5e5e5] px-4 py-8 text-center text-zinc-500">Aucune commande dans ce filtre.</p>}
          </div>
      </section>}

      {view === "products" && editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-5 backdrop-blur-sm">
          <div className="mx-auto my-8 w-full max-w-5xl rounded-3xl border border-[#e5e5e5] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">MODIFIER</p>
                <h2 className="mt-1 text-2xl font-black">{editing.name}</h2>
              </div>
              <button onClick={() => setEditing(null)} aria-label="Fermer" className="text-2xl text-zinc-500 transition hover:text-black">×</button>
            </div>
            <ProductEditor
              form={editing}
              onTextChange={(name, value) => setEditing((current) => current ? setTextField(current, name, value) : current)}
              onToggle={(name, value) => setEditing((current) => current ? { ...current, [name]: value } : current)}
              onImageChange={setEditedImage}
              onImagesChange={setEditedImages}
              onSubmit={saveProduct}
              submitLabel={isSaving ? "Enregistrement…" : "Enregistrer les modifications"}
            />
          </div>
        </div>
      )}
      {view === "products" && restockingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="restock-product-title">
          <form onSubmit={restockProduct} className="w-full max-w-sm rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-2xl">
            <p className="text-sm font-bold tracking-[0.2em] text-[#c9a227]">STOCK RAPIDE</p>
            <h2 id="restock-product-title" className="mt-2 text-xl font-black">Réapprovisionner</h2>
            <p className="mt-1 text-sm text-zinc-500">{restockingProduct.name}</p>
            <label className="mt-5 block text-sm font-bold text-zinc-700" htmlFor="restock-quantity">Nouvelle quantité</label>
            <input id="restock-quantity" type="number" min="0" step="1" required autoFocus value={restockQuantity} onChange={(event) => setRestockQuantity(event.target.value)} className={`${fieldClassName} mt-2`} />
            {restockError && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{restockError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={updatingStockIds.has(restockingProduct.id)} onClick={() => setRestockingProduct(null)} className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-zinc-400 disabled:opacity-50">Annuler</button>
              <button type="submit" disabled={updatingStockIds.has(restockingProduct.id)} className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c9a227] disabled:cursor-wait disabled:opacity-60">{updatingStockIds.has(restockingProduct.id) ? "Mise à jour…" : "Enregistrer"}</button>
            </div>
          </form>
        </div>
      )}
      {orderPendingDeletion && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-order-title"><div className="w-full max-w-md rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-2xl"><h2 id="delete-order-title" className="text-xl font-black">Supprimer cette commande ?</h2><p className="mt-2 text-sm text-zinc-600">Cette action est irréversible.</p><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={deletingOrderId !== null} onClick={() => setOrderPendingDeletion(null)} className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:border-zinc-400 disabled:opacity-60">Annuler</button><button type="button" disabled={deletingOrderId !== null} onClick={deleteOrderPermanently} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">{deletingOrderId ? "Suppression..." : "Oui, supprimer"}</button></div></div></div>}
    </div>
  );
}

function OrderCard({ order, isUpdating, isExpanded, onStatusChange, onToggleDetails, onDelete }: { order: Order; isUpdating: boolean; isExpanded: boolean; onStatusChange: (id: string, status: OrderStatus) => void; onToggleDetails: () => void; onDelete: () => void }) {
  const whatsappUrl = orderWhatsAppUrl(order);

  return (
    <article className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
      <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto]">
        <div className="relative h-[72px] w-[72px] overflow-hidden rounded-xl bg-zinc-100"><Image src={order.product_image} alt={order.product_name} fill sizes="72px" className="object-cover" /></div>
        <div>
          <p className="text-xs font-bold tracking-wide text-[#c9a227]">{order.order_number}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="font-black">{order.product_name}</h3><span className="text-sm font-bold text-[#c9a227]">{formatPrice(order.total_amount)}</span></div>
          <p className="mt-1 text-sm text-zinc-700">{order.customer_first_name} {order.customer_last_name} · {order.customer_phone}</p>
          <p className="mt-1 text-sm text-zinc-500">{order.quantity} unité(s) · {paymentMethodLabel(order.payment_method)} · {new Date(order.created_at).toLocaleDateString("fr-FR")}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold"><span className={`rounded-full px-2.5 py-1 ${paymentStatusClassNames[order.payment_status]}`}>Paiement : {paymentStatusLabels[order.payment_status]}</span><span className={`rounded-full px-2.5 py-1 ${orderStatusClassNames[order.order_status]}`}>Statut : {orderStatusLabels[order.order_status]}</span></div>
        </div>
        <label className="text-sm font-bold text-zinc-700"><span className="mb-2 block">Statut commande</span><select disabled={isUpdating} value={order.order_status} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)} className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm font-bold text-[#a8861e] outline-none disabled:cursor-wait disabled:opacity-60"><option value="new">Nouvelle</option><option value="confirmed">Confirmée</option><option value="preparing">En préparation</option><option value="delivered">Livrée</option><option value="cancelled">Annulée</option></select>{isUpdating && <span className="mt-2 block text-xs text-[#a8861e]">Mise à jour...</span>}</label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#25D366] px-5 py-2 font-semibold text-white shadow hover:bg-[#1EBE5D] transition">WhatsApp</a> : <button type="button" disabled className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-200 px-5 py-2 font-semibold text-zinc-500">Téléphone indisponible</button>}
        <button type="button" onClick={onToggleDetails} className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-black text-black transition hover:border-[#c9a227] hover:text-[#a8861e]">{isExpanded ? "Masquer les détails" : "Voir les détails"}</button>
        <button type="button" onClick={onDelete} className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v5M14 11v5" /></svg>Supprimer</button>
      </div>
      {isExpanded && <dl className="mt-4 grid gap-3 rounded-xl border border-[#e5e5e5] bg-white p-4 text-sm sm:grid-cols-2"><OrderDetail label="Client" value={`${order.customer_first_name} ${order.customer_last_name}`} /><OrderDetail label="Téléphone" value={order.customer_phone} /><OrderDetail label="E-mail" value={order.customer_email || "Non renseigné"} /><OrderDetail label="Adresse" value={order.customer_address} /><OrderDetail label="Ville ou quartier" value={order.customer_city} /><OrderDetail label="Informations complémentaires" value={order.customer_note || "Aucune"} /><OrderDetail label="Produit" value={order.product_name} /><OrderDetail label="Quantité" value={String(order.quantity)} /><OrderDetail label="Total" value={formatPrice(order.total_amount)} /><OrderDetail label="Paiement" value={paymentMethodLabel(order.payment_method)} /><OrderDetail label="Statut du paiement" value={paymentStatusLabels[order.payment_status]} /><OrderDetail label="Statut de la commande" value={orderStatusLabels[order.order_status]} /><OrderDetail label="Date" value={new Date(order.created_at).toLocaleString("fr-FR")} /></dl>}
    </article>
  );
}

function OrderDetail({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-bold text-zinc-500">{label}</dt><dd className="mt-1 text-zinc-800">{value}</dd></div>;
}

function DashboardStat({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "gold" | "green" | "red" | "blue" }) {
  const tones = {
    default: "bg-[#fafafa] text-zinc-900",
    gold: "bg-amber-50 text-[#a8861e]",
    green: "bg-green-50 text-green-800",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-800",
  };
  return <article className={`rounded-2xl border border-[#e5e5e5] p-4 ${tones[tone]}`}><p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 truncate text-xl font-black">{value}</p></article>;
}

function DashboardChart({ title, values, labels, valueFormatter }: { title: string; values: number[]; labels: string[]; valueFormatter: (value: number) => string }) {
  const maximum = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  return <section className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><h3 className="font-black">{title}</h3><span className="shrink-0 text-sm font-black text-[#c9a227]">{valueFormatter(total)}</span></div><div className="mt-6 flex h-40 items-end gap-1" aria-label={title}>{values.map((value, index) => <div key={`${labels[index]}-${index}`} className="group relative flex h-full flex-1 items-end"><div title={`${labels[index]} : ${valueFormatter(value)}`} style={{ height: `${Math.max(value > 0 ? 6 : 0, (value / maximum) * 100)}%` }} className="w-full rounded-t bg-[#c9a227] transition group-hover:bg-black" /></div>)}</div><div className="mt-3 flex justify-between text-xs text-zinc-500"><span>{labels[0]}</span><span>{labels[labels.length - 1]}</span></div></section>;
}

function StockAlert({ title, description, products, tone }: { title: string; description: string; products: Product[]; tone: "amber" | "red" }) {
  const toneClassName = tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-800";
  return <section className={`rounded-2xl border p-5 shadow-sm ${toneClassName}`}><h3 className="font-black">{title}</h3><p className="mt-1 text-sm opacity-80">{description}</p><div className="mt-4 space-y-2">{products.length > 0 ? products.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-xl bg-white/75 p-3"><div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white"><Image src={product.image} alt="" fill sizes="40px" className="object-cover" /></div><span className="min-w-0 flex-1 truncate text-sm font-bold">{product.name}</span><span className="shrink-0 text-sm font-black">{product.stockQuantity} unité{product.stockQuantity > 1 ? "s" : ""}</span><Link href="/admin/products" className="shrink-0 rounded-lg border border-current/20 bg-white px-2.5 py-1.5 text-xs font-bold">Gérer</Link></div>) : <p className="rounded-xl bg-white/75 px-3 py-4 text-sm">Aucun produit concerné.</p>}</div></section>;
}

function ProductEditor({
  form,
  onTextChange,
  onToggle,
  onImageChange,
  onImagesChange,
  onSubmit,
  submitLabel,
}: {
  form: ProductForm | Product;
  onTextChange: (name: string, value: string) => void;
  onToggle: (name: "featured" | "newArrival" | "available", value: boolean) => void;
  onImageChange: (file: File | null) => void;
  onImagesChange: (files: File[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);

  useEffect(() => () => {
    if (mainPreview) URL.revokeObjectURL(mainPreview);
  }, [mainPreview]);

  useEffect(() => () => {
    additionalPreviews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [additionalPreviews]);

  function handleMainImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setMainPreview(file ? URL.createObjectURL(file) : null);
    onImageChange(file);
  }

  function handleAdditionalImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 5);
    setAdditionalPreviews(files.map((file) => URL.createObjectURL(file)));
    onImagesChange(files);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-5 xl:grid-cols-12">
      <FormSection className="xl:col-span-12" title="Informations générales" description="Les détails essentiels de votre produit.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nom du produit *"><input name="name" value={form.name} onChange={(event) => onTextChange("name", event.target.value)} required className={fieldClassName} /></Field>
          <Field label="Marque"><input name="brand" value={form.brand} onChange={(event) => onTextChange("brand", event.target.value)} className={fieldClassName} /></Field>
          <Field label="Catégorie"><input name="category" value={form.category} onChange={(event) => onTextChange("category", event.target.value)} className={fieldClassName} /></Field>
          <Field label="Couleur"><input name="color" value={form.color} onChange={(event) => onTextChange("color", event.target.value)} className={fieldClassName} /></Field>
          <Field label="Prix *"><input name="price" value={form.price} onChange={(event) => onTextChange("price", event.target.value)} required className={fieldClassName} /></Field>
          <Field label="Quantité en stock"><input type="number" min="0" name="stockQuantity" value={form.stockQuantity} onChange={(event) => onTextChange("stockQuantity", event.target.value)} className={fieldClassName} /></Field>
        </div>
      </FormSection>

      <FormSection className="xl:col-span-12" title="Description" description="Présentez la casquette avec des détails qui donnent envie.">
        <Field label="Description du produit"><textarea name="description" value={form.description} onChange={(event) => onTextChange("description", event.target.value)} rows={4} className={`${fieldClassName} min-h-[110px] max-h-[140px] resize-y py-2`} /></Field>
      </FormSection>

      <FormSection className="xl:col-span-8" title="Images" description="Choisissez une image principale et jusqu’à cinq images supplémentaires.">
        <div className="grid gap-5 lg:grid-cols-2">
          <UploadCard
            title="Image principale"
            helper="Cette image est utilisée comme visuel principal de la casquette."
          >
            <input type="file" accept="image/*" onChange={handleMainImage} className={fileInputClassName} />
            {mainPreview && <ImagePreview src={mainPreview} label="Aperçu de l’image principale" large />}
          </UploadCard>
          <UploadCard
            title="Images supplémentaires"
            helper="Ajoutez jusqu’à cinq vues complémentaires pour présenter le produit."
          >
            <input type="file" accept="image/*" multiple onChange={handleAdditionalImages} className={fileInputClassName} />
            {additionalPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {additionalPreviews.map((preview, index) => <ImagePreview key={preview} src={preview} label={`Image supplémentaire ${index + 1}`} />)}
              </div>
            )}
          </UploadCard>
        </div>
      </FormSection>

      <FormSection className="xl:col-span-4" title="Options" description="Contrôlez la visibilité et la mise en avant du produit.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Checkbox label="À la une" checked={form.featured} onChange={(value) => onToggle("featured", value)} />
          <Checkbox label="Nouveauté" checked={form.newArrival} onChange={(value) => onToggle("newArrival", value)} />
          <Checkbox label="Disponible" checked={form.available} onChange={(value) => onToggle("available", value)} />
        </div>
      </FormSection>

      <button type="submit" className="w-full rounded-xl bg-black py-3.5 font-black text-white shadow-sm transition hover:bg-[#c9a227] xl:col-span-12">{submitLabel}</button>
    </form>
  );
}

function FormSection({ className = "", title, description, children }: { className?: string; title: string; description: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl border border-[#e5e5e5] bg-white p-4 sm:p-5 ${className}`}><div className="mb-4 border-b border-[#e5e5e5] pb-3"><h3 className="font-black text-zinc-900">{title}</h3><p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p></div>{children}</section>;
}

function ImagePreview({ src, label, large = false }: { src: string; label: string; large?: boolean }) {
  return <div role="img" aria-label={label} className={`${large ? "aspect-[4/3] min-h-40 w-full" : "aspect-square"} overflow-hidden rounded-xl border border-[#e5e5e5] bg-zinc-100 bg-cover bg-center`} style={{ backgroundImage: `url(${src})` }} />;
}

function UploadCard({ title, helper, children }: { title: string; helper: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-dashed border-[#d4d4d4] bg-white p-4"><h4 className="font-bold text-zinc-900">{title}</h4><p className="mt-1 text-sm leading-5 text-zinc-500">{helper}</p><div className="mt-3 space-y-3">{children}</div></section>;
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm font-bold text-zinc-800 transition hover:border-[#c9a227]"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#c9a227]" />{label}</label>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-zinc-700"><span className="mb-2 block">{label}</span>{children}</label>;
}
