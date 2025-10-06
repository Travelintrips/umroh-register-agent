import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";

import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import { Tables } from "../types/supabase";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  LogOut,
  Package,
  Users,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  Wallet,
  Menu,
  X,
  Search,
  Download,
  Printer,
} from "lucide-react";

type HandlingBooking = Tables<"handling_bookings"> & {
  bank_name?: string;
  destination_account?: string;
  sender_account?: string;
  sender_bank?: string;
  member_discount?: number;
  user_discount?: number;
  harga_asli?: number;
};

type PaymentMethod = Tables<"payment_methods">;

interface Order {
  id: string;
  package_name: string;
  customer_name: string;
  departure_date: string;
  pickup_time?: string;
  payment_method?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  total_amount: number;
  participants: number;
  created_at: string;
}

// Util untuk membersihkan data dan mencegah " - undefined"
const isBlank = (v: unknown) => {
  if (v === null || v === undefined) return true;
  const s = String(v).trim().toLowerCase();
  return s === "" || s === "undefined" || s === "null";
};

const clean = (v: unknown, fallback = "") =>
  isBlank(v) ? fallback : String(v).trim();

const joinParts = (parts: Array<unknown>, sep = " - ") =>
  parts
    .map((p) => clean(p))
    .filter(Boolean)
    .join(sep);

// Normalisasi booking data
const normalizeBooking = (b: any) => ({
  ...b,
  code_booking: clean(b?.code_booking),
  category: clean(b?.category, "Booking"),
  travel_type: clean(b?.travel_type, ""),
  travel_type_name: clean(b?.travel_type_name, ""),
  type: clean(b?.type, ""),
  jenis_perjalanan: clean(b?.jenis_perjalanan, ""),
  package_name: undefined, // jangan pakai package_name lama yang sudah salah
});

// Bangun deskripsi transaksi dengan fallback yang rapi
const buildTxnDescription = (t: any, bookings: any[]) => {
  // Jika ada kode booking yang valid, tampilkan hanya "Pembayaran booking [kode]"
  if (
    t?.code_booking &&
    typeof t.code_booking === "string" &&
    t.code_booking.trim() &&
    t.code_booking !== "undefined" &&
    t.code_booking !== "null"
  ) {
    return `Pembayaran booking ${t.code_booking.trim()}`;
  }

  // Cek keterangan jika tidak ada kode booking
  if (
    t?.keterangan &&
    typeof t.keterangan === "string" &&
    t.keterangan.trim() &&
    t.keterangan !== "undefined" &&
    t.keterangan !== "null"
  ) {
    return t.keterangan.trim();
  }

  // Fallback untuk transaksi tanpa kode booking atau keterangan
  return t?.nominal > 0 ? "Top Up Saldo" : "Pembayaran";
};

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [handlingBookings, setHandlingBookings] = useState<HandlingBooking[]>(
    [],
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<
    | "dashboard"
    | "booking"
    | "saldo"
    | "riwayat-transaksi"
    | "riwayat-topup"
    | "total-passenger"
    | "profile"
  >("dashboard");
  const [saldo, setSaldo] = useState<number>(0);
  const [loadingSaldo, setLoadingSaldo] = useState<boolean>(true);
  const [currentBalance, setCurrentBalance] = useState(5000000);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [bankMethods, setBankMethods] = useState<PaymentMethod[]>([]);
  const [selectedBankMethod, setSelectedBankMethod] = useState<string>("");
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [topUpHistory, setTopUpHistory] = useState<any[]>([]);
  const [loadingTransactionHistory, setLoadingTransactionHistory] =
    useState(false);
  const [loadingTopUpHistory, setLoadingTopUpHistory] = useState(false);
  const [agentProfile, setAgentProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [bookingCodeFilter, setBookingCodeFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);

  const navigate = useNavigate();
  const selectedBank = bankMethods.find((m) => m.id === selectedBankMethod);

  // Mock data for demonstration
  const mockOrders: Order[] = [
    {
      id: "ORD-001",
      package_name: "Paket Layanan Handling Bandara Regular 14 Hari",
      customer_name: "Ahmad Wijaya",
      departure_date: "2024-03-15",
      status: "confirmed",
      total_amount: 25000000,
      participants: 2,
      created_at: "2024-01-15",
    },
    {
      id: "ORD-002",
      package_name: "Paket Layanan Handling Bandara Plus 21 Hari",
      customer_name: "Siti Nurhaliza",
      departure_date: "2024-04-20",
      status: "pending",
      total_amount: 35000000,
      participants: 1,
      created_at: "2024-01-20",
    },
    {
      id: "ORD-003",
      package_name: "Paket Layanan Handling Bandara Keluarga",
      customer_name: "Budi Santoso",
      departure_date: "2024-02-10",
      status: "completed",
      total_amount: 45000000,
      participants: 4,
      created_at: "2023-12-10",
    },
    {
      id: "ORD-004",
      package_name: "Paket Layanan Handling Bandara Regular 14 Hari",
      customer_name: "Fatimah Zahra",
      departure_date: "2024-05-05",
      status: "cancelled",
      total_amount: 25000000,
      participants: 1,
      created_at: "2024-01-25",
    },
  ];

  const fetchHandlingBookings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("handling_bookings")
        .select(
          `
          *,
          member_discount,
          user_discount,
          harga_asli
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching handling bookings:", error);
        return;
      }

      console.log("Fetched handling bookings with discounts:", data);
      setHandlingBookings((data || []).map(normalizeBooking));

      // Convert handling bookings to orders format for compatibility
      const convertedOrders: Order[] = (data || []).map((booking) => {
        const normalizedBooking = normalizeBooking(booking);
        const category = clean(normalizedBooking?.category, "Layanan");
        const travelType = clean(normalizedBooking?.travel_type, "");
        const packageName = joinParts([category, travelType], " - ");

        return {
          id: booking.code_booking || booking.id,
          package_name: packageName,
          customer_name: booking.customer_name,
          departure_date: booking.pickup_date,
          pickup_time: booking.pickup_time,
          payment_method: booking.payment_method || "N/A",
          status:
            (booking.status as
              | "pending"
              | "confirmed"
              | "cancelled"
              | "completed") || "pending",
          total_amount: booking.total_price || 0,
          participants: booking.passengers || 1,
          created_at: booking.created_at || new Date().toISOString(),
        };
      });

      setOrders(convertedOrders);
      setFilteredOrders(convertedOrders);
    } catch (error) {
      console.error("Error in fetchHandlingBookings:", error);
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        return;
      }

      setUserRole(data?.role || null);
    } catch (error) {
      console.error("Error in fetchUserRole:", error);
    }
  };

  const fetchUserSaldo = async (userId: string) => {
    try {
      setLoadingSaldo(true);
      const { data, error } = await supabase
        .from("users")
        .select("saldo")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user saldo:", error);
        setSaldo(0);
        return;
      }

      setSaldo(data?.saldo || 0);
    } catch (error) {
      console.error("Error in fetchUserSaldo:", error);
    } finally {
      setLoadingSaldo(false);
    }
  };

  const fetchBankMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("type", "manual")
        .eq("is_active", true)
        .order("bank_name", { ascending: true });

      if (error) {
        console.error("Error fetching bank methods:", error);
        return;
      }

      setBankMethods(data || []);
    } catch (error) {
      console.error("Error in fetchBankMethods:", error);
    }
  };

  // Helper function to get the latest balance from histori_transaksi
  const getLatestBalance = async (userId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from("histori_transaksi")
        .select("saldo_akhir")
        .eq("user_id", userId)
        .order("trans_date", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error fetching latest balance:", error);
        return 0;
      }

      return data?.saldo_akhir || 0;
    } catch (error) {
      console.error("Error in getLatestBalance:", error);
      return 0;
    }
  };

  // Helper function to calculate saldo_akhir based on transaction type
  const calculateSaldoAkhir = (
    saldoAwal: number,
    nominal: number,
    jenisTransaksi: string,
  ): number => {
    // Check if this is a top-up request (not an actual balance change)
    const isTopUpRequest = jenisTransaksi === "Topup Agent Request";

    if (isTopUpRequest) {
      // For top-up requests: saldo doesn't change until approved
      return saldoAwal;
    }

    const isActualTopUp =
      nominal > 0 &&
      jenisTransaksi &&
      jenisTransaksi.toLowerCase().includes("topup") &&
      jenisTransaksi !== "Topup Agent Request";

    if (isActualTopUp) {
      // For actual approved top-up transactions: saldo_akhir = saldo_awal + nominal
      return saldoAwal + Math.abs(nominal);
    } else {
      // For debit/payment transactions: saldo_akhir = saldo_awal - nominal
      return saldoAwal - Math.abs(nominal);
    }
  };

  // Helper function to insert transaction with correct saldo_akhir calculation
  const insertTransactionWithCorrectBalance = async (
    userId: string,
    codeBooking: string,
    nominal: number,
    keterangan: string,
    jenisTransaksi: string,
    status?: string,
  ) => {
    try {
      // Get the latest balance (saldo_awal)
      const saldoAwal = await getLatestBalance(userId);

      // Calculate the correct saldo_akhir
      const saldoAkhir = calculateSaldoAkhir(
        saldoAwal,
        nominal,
        jenisTransaksi,
      );

      // Insert the transaction record with correct saldo_akhir
      const { error } = await supabase.from("histori_transaksi").insert({
        user_id: userId,
        code_booking: codeBooking,
        nominal: nominal,
        keterangan: keterangan,
        jenis_transaksi: jenisTransaksi,
        trans_date: new Date().toISOString(),
        saldo_akhir: saldoAkhir,
        status: status || null,
      });

      if (error) {
        console.error("Error inserting transaction:", error);
        throw error;
      }

      // Only update user's saldo in the users table if it's not a top-up request
      if (jenisTransaksi !== "Topup Agent Request") {
        const { error: updateError } = await supabase
          .from("users")
          .update({ saldo: saldoAkhir })
          .eq("id", userId);

        if (updateError) {
          console.error("Error updating user saldo:", updateError);
          throw updateError;
        }
      }

      return saldoAkhir;
    } catch (error) {
      console.error("Error in insertTransactionWithCorrectBalance:", error);
      throw error;
    }
  };

  const fetchTransactionHistory = async (userId: string) => {
    try {
      setLoadingTransactionHistory(true);
      const { data, error } = await supabase
        .from("histori_transaksi")
        .select("*")
        .eq("user_id", userId)
        .order("trans_date", { ascending: false });

      if (error) {
        console.error("Error fetching transaction history:", error);
        return;
      }

      // Get pending top-up requests to filter out from transaction history
      const { data: pendingTopUps, error: topUpError } = await supabase
        .from("topup_requests")
        .select("reference_no")
        .eq("user_id", userId)
        .eq("status", "pending");

      if (topUpError) {
        console.error("Error fetching pending top-ups:", topUpError);
      }

      const pendingTopUpRefs = new Set(
        (pendingTopUps || []).map((req) => req.reference_no),
      );

      // Normalisasi saat mapping dan filter out pending top-up requests
      const normalizeTxn = (t: any) => ({
        ...t,
        keterangan: clean(t?.keterangan),
        code_booking: clean(t?.code_booking),
      });

      const filteredTransactions = (data ?? [])
        .map(normalizeTxn)
        .filter((transaction) => {
          // Hide transactions that correspond to pending top-up requests
          const codeBooking = transaction.code_booking;
          if (codeBooking && pendingTopUpRefs.has(codeBooking)) {
            return false;
          }
          return true;
        });

      setTransactionHistory(filteredTransactions);
    } catch (error) {
      console.error("Error in fetchTransactionHistory:", error);
    } finally {
      setLoadingTransactionHistory(false);
    }
  };

  const fetchTopUpHistory = async (userId: string) => {
    try {
      setLoadingTopUpHistory(true);
      const { data, error } = await supabase
        .from("v_topup_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching top-up history:", error);
        return;
      }

      setTopUpHistory(data || []);
    } catch (error) {
      console.error("Error in fetchTopUpHistory:", error);
    } finally {
      setLoadingTopUpHistory(false);
    }
  };

  const fetchAgentProfile = async (userId: string) => {
    try {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from("agent_users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching agent profile:", error);
        return;
      }

      setAgentProfile(data);
    } catch (error) {
      console.error("Error in fetchAgentProfile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    // Fetch bank methods on component mount
    fetchBankMethods();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/signin");
      } else {
        // Fetch handling bookings, user role, saldo, and history for the current user
        fetchHandlingBookings(session.user.id);
        fetchUserRole(session.user.id);
        fetchUserSaldo(session.user.id);
        fetchTransactionHistory(session.user.id);
        fetchTopUpHistory(session.user.id);
        fetchAgentProfile(session.user.id);

        // Auto-populate sender name with user's full name
        const userFullName =
          session.user.user_metadata?.full_name || session.user.email || "";
        setSenderName(userFullName);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/signin");
      } else {
        // Fetch handling bookings, user role, saldo, and history for the current user
        fetchHandlingBookings(session.user.id);
        fetchUserRole(session.user.id);
        fetchUserSaldo(session.user.id);
        fetchTransactionHistory(session.user.id);
        fetchTopUpHistory(session.user.id);
        fetchAgentProfile(session.user.id);

        // Auto-populate sender name with user's full name
        const userFullName =
          session.user.user_metadata?.full_name || session.user.email || "";
        setSenderName(userFullName);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Filter orders based on booking code, payment method, and status
  useEffect(() => {
    let filtered = [...orders];

    // Filter by booking code
    if (bookingCodeFilter.trim()) {
      filtered = filtered.filter((order) =>
        order.id.toLowerCase().includes(bookingCodeFilter.toLowerCase().trim()),
      );
    }

    // Filter by payment method
    if (paymentMethodFilter) {
      filtered = filtered.filter((order) => {
        const paymentMethod = order.payment_method?.toLowerCase() || "";
        switch (paymentMethodFilter) {
          case "cash":
            return paymentMethod === "cash";
          case "bank_transfer":
            return paymentMethod === "bank_transfer";
          case "saldo":
            return paymentMethod === "use_saldo";
          default:
            return true;
        }
      });
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((order) => {
        return order.status === statusFilter;
      });
    }

    setFilteredOrders(filtered);
  }, [orders, bookingCodeFilter, paymentMethodFilter, statusFilter]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Menunggu", variant: "secondary" as const },
      confirmed: { label: "Dikonfirmasi", variant: "default" as const },
      cancelled: { label: "Dibatalkan", variant: "destructive" as const },
      completed: { label: "Selesai", variant: "outline" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleToggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const isAdmin = userRole === "Admin" || userRole === "admin";

  const totalRevenue = orders.reduce(
    (sum, order) =>
      order.status === "confirmed" || order.status === "completed"
        ? sum + order.total_amount
        : sum,
    0,
  );

  const totalParticipants = orders.reduce(
    (sum, order) =>
      order.status === "confirmed" || order.status === "completed"
        ? sum + order.participants
        : sum,
    0,
  );

  // Download functionality
  const handlePrintInvoice = (order: Order) => {
    const originalBooking = handlingBookings.find(
      (booking) => (booking.code_booking || booking.id) === order.id,
    );

    if (!originalBooking) {
      alert("Data booking tidak ditemukan");
      return;
    }

    // Calculate discount details
    const memberDiscount = Number(originalBooking.member_discount) || 0;
    const userDiscount = Number(originalBooking.user_discount) || 0;
    const passengers = Number(order.participants) || 1;
    const totalAmount = Number(order.total_amount) || 0;
    const basicPrice = Number(originalBooking.price) || 0;
    const originalTotalAmount =
      Number(originalBooking.harga_asli) || basicPrice * passengers;

    let currentTotal = originalTotalAmount;
    let memberDiscountAmount = 0;
    let userDiscountAmount = 0;

    // Apply membership discount first
    if (memberDiscount > 0) {
      memberDiscountAmount = Math.round(
        (originalTotalAmount * memberDiscount) / 100,
      );
      currentTotal = Math.max(0, currentTotal - memberDiscountAmount);
    }

    // Apply user discount second
    if (userDiscount > 0) {
      const requestedUserDiscount = userDiscount * passengers;
      userDiscountAmount = Math.min(requestedUserDiscount, currentTotal);
      currentTotal = Math.max(0, currentTotal - userDiscountAmount);
    }

    const totalDiscountAmount = memberDiscountAmount + userDiscountAmount;
    const currentDate = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const currentTime = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create professional invoice content matching Screenshot_16
    const invoiceContent = `
      <html>
        <head>
          <title>Receipt - ${order.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 12px;
              line-height: 1.4;
              color: #333;
              background: white;
              padding: 20px;
            }
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #4CAF50;
              padding: 20px;
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              border-bottom: 2px solid #4CAF50;
              padding-bottom: 15px;
            }
            .company-info {
              flex: 1;
            }
            .company-name {
              font-size: 18px;
              font-weight: bold;
              color: #4CAF50;
              margin-bottom: 5px;
            }
            .receipt-title {
              text-align: center;
              flex: 1;
              font-size: 16px;
              font-weight: bold;
              color: #333;
            }
            .receipt-number {
              text-align: right;
              flex: 1;
              font-size: 12px;
            }
            .date-time {
              text-align: left;
              font-size: 10px;
              color: #666;
              margin-bottom: 10px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-weight: bold;
              color: #4CAF50;
              margin-bottom: 10px;
              font-size: 13px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 15px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-weight: bold;
              margin-bottom: 2px;
              font-size: 11px;
            }
            .info-value {
              font-size: 11px;
            }
            .payment-section {
              border: 1px solid #ddd;
              padding: 15px;
              margin-top: 20px;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 3px 0;
            }
            .payment-label {
              font-size: 11px;
            }
            .payment-value {
              font-size: 11px;
              text-align: right;
            }
            .discount-row {
              color: #4CAF50;
              font-weight: bold;
            }
            .total-row {
              border-top: 1px solid #333;
              padding-top: 8px;
              margin-top: 8px;
              font-weight: bold;
              font-size: 12px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body { padding: 0; }
              .receipt-container { border: 2px solid #4CAF50; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="date-time">${currentDate}, ${currentTime}</div>
            
            <div class="header">
              <div class="company-info">
                <div class="company-name">Travelintrips Handling<br>Airport</div>
              </div>
              <div class="receipt-title">
                RECEIPT PESANAN GROUP
              </div>
              <div class="receipt-number">
                Receipt - ${order.id}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Informasi Pelanggan</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Nama Perusahaan:</div>
                  <div class="info-value">PT Cahaya Sejati</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Nama Lengkap:</div>
                  <div class="info-value">${order.customer_name}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email:</div>
                  <div class="info-value">${user?.email || "agent1@gmail.com"}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">No. Telepon:</div>
                  <div class="info-value">087887222222</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Detail Pesanan</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Jumlah Penumpang:</div>
                  <div class="info-value">${order.participants} orang</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Jumlah Bagasi:</div>
                  <div class="info-value">${(() => {
                    // Get the actual additional baggage from booking data
                    if (originalBooking?.bagasi_tambahan) {
                      // Parse the bagasi_tambahan field (format: "quantity x price")
                      const baggageMatch =
                        originalBooking.bagasi_tambahan.match(/^(\d+)/);
                      if (baggageMatch) {
                        return `${baggageMatch[1]} bagasi`;
                      }
                    }
                    return "0 bagasi";
                  })()}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Nomor Penerbangan:</div>
                  <div class="info-value">${originalBooking?.flight_number || "QG"}</div>
                </div>
                <div class="info-item">
  <div class="info-label">Jenis Perjalanan:</div>
  <div class="info-value">${originalBooking.travel_type}</div>
</div>

                <div class="info-item">
                  <div class="info-label">Area Penjemputan:</div>
                  <div class="info-value">${originalBooking?.pickup_area || "Terminal 1C - Domestic Arrival"}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Area Pengantaran:</div>
                  <div class="info-value">${originalBooking?.dropoff_area || "Terminal 2D - Domestic Arrival"}</div>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Tanggal & Waktu Pickup:</div>
                <div class="info-value">${formatDate(order.departure_date)} - ${order.pickup_time || "18:11"}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Detail Pembayaran</div>
              <div class="payment-section">
                <div class="payment-row">
                  <span class="payment-label">Metode Pembayaran:</span>
                  <span class="payment-value">Saldo</span>
                </div>
                <div class="payment-row">
                  <span class="payment-label">Jenis Layanan:</span>
                  <span class="payment-value">${originalBooking.travel_type}</span>
                </div>
                <div class="payment-row">
                  <span class="payment-label">Jumlah Penumpang:</span>
                  <span class="payment-value">${order.participants} orang</span>
                </div>
                
                <div class="payment-row" style="margin-top: 15px; font-weight: bold;">
                  <span class="payment-label">Harga Dasar:</span>
                  <span class="payment-value"></span>
                </div>
                <div class="payment-row" style="padding-left: 10px;">
                  <span class="payment-label">- ${originalBooking.travel_type}:</span>
                  <span class="payment-value">${(() => {
                    // Calculate base price based on travel type logic
                    const travelType =
                      originalBooking.travel_type?.toLowerCase() || "";
                    let basePrice = 0;

                    if (
                      travelType.includes("arrival") &&
                      travelType.includes("departure")
                    ) {
                      basePrice = 40000; // Arrival + Departure
                    } else if (travelType.includes("arrival")) {
                      basePrice = 25000; // Only Arrival
                    } else if (travelType.includes("departure")) {
                      basePrice = 25000; // Only Departure
                    } else if (travelType.includes("transit")) {
                      basePrice = 50000; // Transit
                    } else {
                      // Fallback to original price if pattern doesn't match
                      basePrice = basicPrice;
                    }

                    return formatCurrency(basePrice * passengers);
                  })()}</span>
                </div>
                
                ${(() => {
                  // Check if there's additional baggage
                  if (originalBooking?.bagasi_tambahan) {
                    const baggageMatch =
                      originalBooking.bagasi_tambahan.match(
                        /^(\d+)\s*x\s*(\d+)/,
                      );
                    if (baggageMatch) {
                      const quantity = parseInt(baggageMatch[1]);
                      const pricePerBaggage = parseInt(baggageMatch[2]);
                      const totalBaggagePrice = quantity * pricePerBaggage;

                      if (quantity > 0) {
                        return `
                <div class="payment-row" style="margin-top: 15px; font-weight: bold;">
                  <span class="payment-label">Tambahan:</span>
                  <span class="payment-value"></span>
                </div>
                <div class="payment-row" style="padding-left: 10px;">
                  <span class="payment-label">- ${quantity} Bagasi Tambahan:</span>
                  <span class="payment-value">${formatCurrency(totalBaggagePrice)}</span>
                </div>`;
                      }
                    }
                  }
                  return "";
                })()}
                
                <div class="payment-row" style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
                  <span class="payment-label">Subtotal (harga asli):</span>
                  <span class="payment-value">${formatCurrency(originalTotalAmount)}</span>
                </div>
                
                ${(() => {
                  let discountSection = "";

                  if (memberDiscountAmount > 0) {
                    discountSection += `
                <div class="payment-row discount-row">
                  <span class="payment-label">Diskon Membership ${memberDiscount}%:</span>
                  <span class="payment-value">-${formatCurrency(memberDiscountAmount)}</span>
                </div>`;
                  }

                  if (userDiscountAmount > 0) {
                    discountSection += `
                <div class="payment-row discount-row">
                  <span class="payment-label">Diskon Rp ${formatCurrency(userDiscount).replace("Rp ", "")} per penumpang (${passengers} orang):</span>
                  <span class="payment-value">-${formatCurrency(userDiscountAmount)}</span>
                </div>`;
                  }

                  return discountSection;
                })()}
                
                <div class="payment-row total-row" style="border-top: 2px solid #333; margin-top: 10px; padding-top: 10px;">
                  <span class="payment-label">Total Pembayaran:</span>
                  <span class="payment-value">${formatCurrency(totalAmount)}</span>
                </div>
                
                ${(() => {
                  const totalSavings = originalTotalAmount - totalAmount;
                  if (totalSavings > 0) {
                    return `
                <div class="payment-row" style="text-align: center; color: #4CAF50; font-weight: bold; margin-top: 5px;">
                  <span class="payment-label" style="width: 100%; text-align: center;">(Hemat ${formatCurrency(totalSavings)})</span>
                  <span class="payment-value"></span>
                </div>`;
                  }
                  return "";
                })()}
              </div>
            </div>

            <div class="footer">
              <div>about:blank</div>
              <div style="margin-top: 10px;">1/1</div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(invoiceContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const downloadCSV = () => {
    const headers = [
      "ID Pesanan",
      "Nama Customer",
      "Type Travel",
      "Passenger",
      "Payment Method",
      "Payment Status",
      "Basic Price",
      "Total",
      "Status",
      "Tanggal Dibuat",
      "Tanggal Keberangkatan",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredOrders.map((order) => {
        // Find the original booking data to get the basic price
        const originalBooking = handlingBookings.find(
          (booking) => (booking.code_booking || booking.id) === order.id,
        );
        const basicPrice = originalBooking?.price || 0;

        return [
          `"${order.id}"`,
          `"${order.customer_name}"`,
          `"${order.package_name}"`,
          `"${order.participants} orang"`,
          `"${order.payment_method || "N/A"}"`,
          `"${order.status === "completed" ? "Lunas" : order.status === "confirmed" ? "Dibayar" : "Belum Bayar"}"`,
          `"${formatCurrency(basicPrice)}"`,
          `"${formatCurrency(order.total_amount)}"`,
          `"${order.status === "pending" ? "Menunggu" : order.status === "confirmed" ? "Dikonfirmasi" : order.status === "cancelled" ? "Dibatalkan" : "Selesai"}"`,
          `"${formatDate(order.created_at)}"`,
          `"${formatDate(order.departure_date)}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `booking-data-${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  //menambahkan category di keterangan
  const buildTxnDescription = (transaction: any, handlingBookings: any[]) => {
    const codeBooking = transaction.code_booking || "";

    // Check if this is a top-up request (starts with "TOP-AR-" or "TOP-")
    if (
      codeBooking.startsWith("TOP-AR-") ||
      (codeBooking.startsWith("TOP-") &&
        transaction.jenis_transaksi === "Topup Agent Request")
    ) {
      return `Request top up saldo - ${codeBooking}`;
    }

    // Check if this is a regular top-up (positive nominal)
    if (
      transaction.nominal > 0 &&
      transaction.jenis_transaksi &&
      transaction.jenis_transaksi.toLowerCase().includes("topup")
    ) {
      return `Top up saldo - ${codeBooking || "N/A"}`;
    }

    // For booking payments (negative nominal or regular bookings)
    if (codeBooking && !codeBooking.startsWith("TOP")) {
      // Cari booking terkait
      const relatedBooking = handlingBookings.find(
        (b) => b.code_booking === codeBooking,
      );

      // Ambil category, kalau kosong kasih default
      const category = relatedBooking?.category || "Handling Group";

      return `Pembayaran booking ${codeBooking} - ${category}`;
    }

    // Fallback for other transactions
    if (transaction.nominal > 0) {
      return "Top up saldo";
    } else {
      return "Pembayaran";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-green-600 mr-2" />
            <span className="text-lg font-semibold text-gray-900">
              Dashboard
            </span>
          </div>
          <Button
            onClick={() => setSidebarOpen(false)}
            variant="ghost"
            size="sm"
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-8 px-4">
          <div className="space-y-2">
            <Button
              onClick={() => setActiveMenu("dashboard")}
              variant={activeMenu === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start text-left hover:bg-green-50 hover:text-green-700"
            >
              <Package className="h-5 w-5 mr-3" />
              Dashboard
            </Button>
            <Button
              onClick={() => setActiveMenu("booking")}
              variant={activeMenu === "booking" ? "default" : "ghost"}
              className="w-full justify-start text-left hover:bg-green-50 hover:text-green-700"
            >
              <ShoppingCart className="h-5 w-5 mr-3" />
              Kelola Pesanan
            </Button>
            <Button
              onClick={() => setActiveMenu("saldo")}
              variant={activeMenu === "saldo" ? "default" : "ghost"}
              className="w-full justify-start text-left hover:bg-green-50 hover:text-green-700"
            >
              <Wallet className="h-5 w-5 mr-3" />
              Saldo
            </Button>
            <Button
              onClick={() => setActiveMenu("riwayat-transaksi")}
              variant={activeMenu === "riwayat-transaksi" ? "default" : "ghost"}
              className="w-full justify-start text-left hover:bg-green-50 hover:text-green-700"
            >
              <Package className="h-5 w-5 mr-3" />
              Riwayat Transaksi
            </Button>
            <Button
              onClick={() => setActiveMenu("riwayat-topup")}
              variant={activeMenu === "riwayat-topup" ? "default" : "ghost"}
              className="w-full justify-start text-left hover:bg-green-50 hover:text-green-700"
            >
              <DollarSign className="h-5 w-5 mr-3" />
              Riwayat Top Up
            </Button>
            <Button
              onClick={() => setActiveMenu("total-passenger")}
              variant={activeMenu === "total-passenger" ? "default" : "ghost"}
              className="w-full justify-start text-left hover:bg-green-50 hover:text-green-700"
            >
              <Users className="h-5 w-5 mr-3" />
              Total Passenger
            </Button>
            <Button
              onClick={() => setActiveMenu("profile")}
              variant={activeMenu === "profile" ? "default" : "ghost"}
              className="w-full justify-start text-left hover:bg-green-50 hover:text-green-700"
            >
              <Users className="h-5 w-5 mr-3" />
              Profile
            </Button>
          </div>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            onClick={handleBackToHome}
            variant="outline"
            size="sm"
            className="w-full mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Home
          </Button>
          {user && (
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button
                  onClick={() => setSidebarOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="mr-4 lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeMenu === "dashboard" &&
                    "Dashboard - Layanan Handling Bandara"}
                  {activeMenu === "booking" && "Kelola Pesanan"}
                  {activeMenu === "saldo" && "Kelola Saldo"}
                  {activeMenu === "riwayat-transaksi" && "Riwayat Transaksi"}
                  {activeMenu === "riwayat-topup" && "Riwayat Top Up"}
                  {activeMenu === "total-passenger" && "Total Passenger"}
                  {activeMenu === "profile" && "Profile Agent"}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                {user && (
                  <span className="text-sm text-gray-700 hidden sm:block">
                    Welcome, {user.user_metadata?.full_name || user.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeMenu === "dashboard" && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => setActiveMenu("booking")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pesanan
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{orders.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Semua pesanan yang masuk
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => setActiveMenu("booking")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pesanan Aktif
                    </CardTitle>
                    <Package className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {
                        orders.filter((order) => order.status === "confirmed")
                          .length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Perlu konfirmasi
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => setActiveMenu("total-passenger")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Passenger
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {totalParticipants}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Passenger yang terdaftar
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => setActiveMenu("riwayat-transaksi")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pendapatan
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(totalRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dari pesanan aktif & selesai
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Pesanan Terbaru</CardTitle>
                  <CardDescription>5 pesanan terbaru Anda</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Pesanan</TableHead>
                          <TableHead>Nama Customer</TableHead>
                          <TableHead>Type Travel</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length > 0 ? (
                          filteredOrders.slice(0, 5).map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                {order.id.length > 8
                                  ? `${order.id.slice(0, 8)}...`
                                  : order.id}
                              </TableCell>
                              <TableCell>{order.customer_name}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {order.package_name}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(order.total_amount)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(order.status)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center py-8 text-gray-500"
                            >
                              Belum ada pesanan handling bandara
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeMenu === "booking" && (
            <>
              {/* Search Filters */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Search className="h-5 w-5 mr-2" />
                    Filter Pencarian
                  </CardTitle>
                  <CardDescription>
                    Filter pesanan berdasarkan kode booking, metode pembayaran,
                    dan status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    {/* Booking Code Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Kode Booking
                      </label>
                      <Input
                        placeholder="Masukkan kode booking..."
                        value={bookingCodeFilter}
                        onChange={(e) => setBookingCodeFilter(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Payment Method Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Metode Pembayaran
                      </label>
                      <select
                        value={paymentMethodFilter}
                        onChange={(e) => setPaymentMethodFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        <option value="">Semua Metode</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="saldo">Saldo</option>
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Status Pesanan
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        <option value="">Semua Status</option>

                        <option value="pending">Menunggu</option>
                        <option value="confirmed">Dikonfirmasi</option>
                        <option value="completed">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                      </select>
                    </div>

                    {/* Download Button */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Download Data
                      </label>
                      <Button
                        onClick={downloadCSV}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => {
                        setBookingCodeFilter("");
                        setPaymentMethodFilter("");
                        setStatusFilter("");
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Hapus Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Order Management */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pesanan Menunggu
                    </CardTitle>
                    <Package className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {
                        filteredOrders.filter(
                          (order) => order.status === "pending",
                        ).length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Perlu konfirmasi
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pesanan Dikonfirmasi
                    </CardTitle>
                    <Package className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {
                        filteredOrders.filter(
                          (order) => order.status === "confirmed",
                        ).length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Siap berangkat
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pesanan Selesai
                    </CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {
                        filteredOrders.filter(
                          (order) => order.status === "completed",
                        ).length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sudah kembali
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* All Orders Table with Expandable Rows */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Semua Pesanan</CardTitle>
                  <CardDescription>
                    Kelola semua pesanan layanan handling bandara Anda (
                    {filteredOrders.length} dari {orders.length} pesanan)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Pesanan</TableHead>
                          <TableHead>Nama Customer</TableHead>
                          <TableHead>Type Travel</TableHead>
                          <TableHead>Passenger</TableHead>
                          <TableHead>Payment Method</TableHead>
                          <TableHead>Payment Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length > 0 ? (
                          filteredOrders.map((order) => {
                            // Find the original booking data to get the basic price
                            const originalBooking = handlingBookings.find(
                              (booking) =>
                                (booking.code_booking || booking.id) ===
                                order.id,
                            );

                            const isExpanded = expandedOrderId === order.id;

                            const rows = [
                              <TableRow
                                key={`${order.id}-main`}
                                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                                  isExpanded ? "bg-blue-50" : ""
                                }`}
                                onClick={() =>
                                  handleToggleOrderDetails(order.id)
                                }
                              >
                                <TableCell className="font-xs">
                                  {order.id}
                                </TableCell>
                                <TableCell>{order.customer_name}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {order.package_name}
                                </TableCell>
                                <TableCell>
                                  {order.participants} orang
                                </TableCell>
                                <TableCell>
                                  {order.payment_method === "bank_transfer"
                                    ? "Bank Transfer"
                                    : order.payment_method === "use_saldo"
                                      ? "Saldo"
                                      : order.payment_method || "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      order.status === "completed"
                                        ? "default"
                                        : order.status === "confirmed"
                                          ? "outline"
                                          : "outline"
                                    }
                                  >
                                    {order.status === "completed"
                                      ? "Lunas"
                                      : order.status === "confirmed"
                                        ? "Belum Bayar"
                                        : "Belum Bayar"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(order.total_amount)}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(order.status)}
                                </TableCell>
                              </TableRow>,
                            ];

                            if (isExpanded) {
                              rows.push(
                                <TableRow key={`${order.id}-detail`}>
                                  <TableCell colSpan={8} className="p-0">
                                    <div className="bg-gray-50 border-t border-b border-gray-200 p-6">
                                      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                                          <h3 className="text-lg font-semibold text-gray-900">
                                            Detail Pesanan
                                          </h3>
                                          <Button
                                            onClick={() =>
                                              handlePrintInvoice(order)
                                            }
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                                          >
                                            <Printer className="h-4 w-4" />
                                            Print Receipt
                                          </Button>
                                        </div>

                                        <div className="space-y-3">
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                ID Pesanan
                                              </label>
                                              <p className="text-sm font-mono mt-1">
                                                {order.id}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Status
                                              </label>
                                              <div className="mt-1">
                                                {getStatusBadge(order.status)}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Nama Customer
                                              </label>
                                              <p className="text-sm mt-1">
                                                {order.customer_name}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Type Travel
                                              </label>
                                              <p className="text-sm mt-1">
                                                {order.package_name}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            {originalBooking?.flight_number && (
                                              <div>
                                                <label className="text-sm font-medium text-gray-500">
                                                  Nomor Penerbangan
                                                </label>
                                                <p className="text-sm mt-1">
                                                  {
                                                    originalBooking.flight_number
                                                  }
                                                </p>
                                              </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-sm font-medium text-gray-500">
                                                  Bagasi Tambahan
                                                </label>
                                                <p className="text-sm mt-1">
                                                  {(() => {
                                                    // Get the actual additional baggage from booking data
                                                    if (
                                                      originalBooking?.bagasi_tambahan
                                                    ) {
                                                      // Parse the bagasi_tambahan field (format: "quantity x price")
                                                      const baggageMatch =
                                                        originalBooking.bagasi_tambahan.match(
                                                          /^(\d+)/,
                                                        );
                                                      if (baggageMatch) {
                                                        return `${baggageMatch[1]} bagasi`;
                                                      }
                                                    }
                                                    return "0 bagasi";
                                                  })()}
                                                </p>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Tanggal Pick Up
                                              </label>
                                              <p className="text-sm mt-1">
                                                {formatDate(
                                                  order.departure_date,
                                                )}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Waktu Jemput
                                              </label>
                                              <p className="text-sm mt-1">
                                                {order.pickup_time || "N/A"}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Area Lokasi Penjemputan
                                              </label>
                                              <p className="text-sm mt-1">
                                                {originalBooking?.pickup_area ||
                                                  "N/A"}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Area Lokasi Pengantaran
                                              </label>
                                              <p className="text-sm mt-1">
                                                {originalBooking?.dropoff_area ||
                                                  "N/A"}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Passenger
                                              </label>
                                              <p className="text-sm mt-1">
                                                {order.participants} orang
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Payment Method
                                              </label>
                                              <div className="text-sm mt-1">
                                                <p>
                                                  {order.payment_method ===
                                                  "bank_transfer"
                                                    ? "Bank Transfer"
                                                    : order.payment_method ===
                                                        "use_saldo"
                                                      ? "Saldo"
                                                      : order.payment_method ||
                                                        "N/A"}
                                                </p>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Discount Details Section */}
                                          <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                              Detail Potongan Harga
                                            </h4>
                                            {(() => {
                                              if (!originalBooking) {
                                                return (
                                                  <p className="text-sm text-gray-500">
                                                    Data booking tidak ditemukan
                                                  </p>
                                                );
                                              }

                                              // Get discount values from the booking data
                                              const memberDiscount =
                                                Number(
                                                  originalBooking.member_discount,
                                                ) || 0;
                                              const userDiscount =
                                                Number(
                                                  originalBooking.user_discount,
                                                ) || 0;
                                              const passengers =
                                                Number(order.participants) || 1;
                                              const totalAmount =
                                                Number(order.total_amount) || 0;

                                              // Use harga_asli if available, otherwise calculate from basic price
                                              const basicPrice =
                                                Number(originalBooking.price) ||
                                                0;
                                              const originalTotalAmount =
                                                Number(
                                                  originalBooking.harga_asli,
                                                ) || basicPrice * passengers;

                                              // Calculate discount amounts step by step
                                              let currentTotal =
                                                originalTotalAmount;
                                              let memberDiscountAmount = 0;
                                              let userDiscountAmount = 0;

                                              // Apply membership discount first
                                              if (memberDiscount > 0) {
                                                memberDiscountAmount =
                                                  Math.round(
                                                    (originalTotalAmount *
                                                      memberDiscount) /
                                                      100,
                                                  );
                                                currentTotal = Math.max(
                                                  0,
                                                  currentTotal -
                                                    memberDiscountAmount,
                                                );
                                              }

                                              // Apply user discount second
                                              if (userDiscount > 0) {
                                                const requestedUserDiscount =
                                                  userDiscount * passengers;
                                                userDiscountAmount = Math.min(
                                                  requestedUserDiscount,
                                                  currentTotal,
                                                );
                                                currentTotal = Math.max(
                                                  0,
                                                  currentTotal -
                                                    userDiscountAmount,
                                                );
                                              }

                                              const totalDiscountAmount =
                                                memberDiscountAmount +
                                                userDiscountAmount;
                                              const hasDiscounts =
                                                memberDiscount > 0 ||
                                                userDiscount > 0;

                                              if (!hasDiscounts) {
                                                return (
                                                  <div className="text-center py-4">
                                                    <p className="text-sm text-gray-500">
                                                      Tidak ada diskon yang
                                                      diterapkan
                                                    </p>
                                                  </div>
                                                );
                                              }

                                              return (
                                                <>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                      <label className="text-sm font-medium text-gray-500">
                                                        Diskon Member
                                                      </label>
                                                      <p className="text-sm text-green-600 font-medium mt-1">
                                                        {memberDiscount > 0
                                                          ? `${memberDiscount}%`
                                                          : "Tidak ada"}
                                                      </p>
                                                      {memberDiscount > 0 && (
                                                        <p className="text-sm text-gray-500">
                                                          ={" "}
                                                          {formatCurrency(
                                                            memberDiscountAmount,
                                                          )}
                                                        </p>
                                                      )}
                                                    </div>
                                                    <div>
                                                      <label className="text-sm font-medium text-gray-500">
                                                        Diskon User
                                                      </label>
                                                      <p className="text-sm text-green-600 font-medium mt-1">
                                                        {userDiscount > 0
                                                          ? `${formatCurrency(userDiscount)} per penumpang`
                                                          : "Tidak ada"}
                                                      </p>
                                                      {userDiscount > 0 && (
                                                        <p className="text-sm text-gray-500">
                                                          ={" "}
                                                          {formatCurrency(
                                                            userDiscountAmount,
                                                          )}{" "}
                                                          total
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                      <label className="text-sm font-medium text-gray-500">
                                                        Sub Total
                                                      </label>
                                                      <p className="text-sm text-gray-600 mt-1">
                                                        {formatCurrency(
                                                          originalTotalAmount,
                                                        )}
                                                      </p>
                                                    </div>
                                                    <div>
                                                      <label className="text-sm font-medium text-gray-500">
                                                        Total Potongan
                                                      </label>
                                                      <p className="text-sm text-red-600 font-medium mt-1">
                                                        {totalDiscountAmount > 0
                                                          ? `-${formatCurrency(totalDiscountAmount)}`
                                                          : "Rp 0"}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <div className="pt-2 border-t">
                                                    <div className="flex justify-between items-center">
                                                      <label className="text-sm font-medium text-gray-700">
                                                        Total Setelah Diskon
                                                      </label>
                                                      <p className="text-lg font-bold text-green-600">
                                                        {formatCurrency(
                                                          totalAmount,
                                                        )}
                                                      </p>
                                                    </div>
                                                    {totalDiscountAmount >
                                                      0 && (
                                                      <p className="text-sm text-green-600 text-center mt-1">
                                                        Hemat{" "}
                                                        {formatCurrency(
                                                          totalDiscountAmount,
                                                        )}
                                                        !
                                                      </p>
                                                    )}
                                                  </div>
                                                </>
                                              );
                                            })()}
                                          </div>

                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <label className="text-sm font-medium text-gray-500">
                                                Tanggal Dibuat
                                              </label>
                                              <p className="text-sm mt-1">
                                                {formatDate(order.created_at)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>,
                              );
                            }

                            return rows;
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-8 text-gray-500"
                            >
                              Belum ada pesanan handling bandara
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeMenu === "saldo" && (
            <>
              {/* Balance Overview */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Wallet className="h-6 w-6 mr-2 text-green-600" />
                    Saldo Saat Ini
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-bold text-green-600 mb-4">
                    {loadingSaldo ? (
                      <div className="animate-pulse bg-gray-200 h-10 w-48 rounded"></div>
                    ) : (
                      formatCurrency(saldo)
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Saldo tersedia untuk transaksi
                  </p>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="flex justify-between items-center md:flex-col md:items-start">
                      <span className="text-sm text-gray-600">Status Akun</span>
                      <span className="text-sm font-medium text-green-600">
                        Aktif
                      </span>
                    </div>
                    <div className="flex justify-between items-center md:flex-col md:items-start">
                      <span className="text-sm text-gray-600">
                        Total Top Up
                      </span>
                      <span className="text-sm font-medium">5 kali</span>
                    </div>
                    <div className="flex justify-between items-center md:flex-col md:items-start">
                      <span className="text-sm text-gray-600">
                        Terakhir Top Up
                      </span>
                      <span className="text-sm font-medium">18 Jan 2024</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Up Form */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-xl">Top Up Saldo</CardTitle>
                  <CardDescription>
                    Isi saldo untuk melakukan transaksi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Jumlah Top Up
                    </label>
                    <input
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="Masukkan jumlah (min. 10.000)"
                      min="10000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {topUpAmount && parseInt(topUpAmount) < 10000 && (
                      <p className="text-red-500 text-xs mt-1">
                        Minimum top up adalah Rp 10.000
                      </p>
                    )}
                  </div>

                  {/* Sender Information Section */}
                  <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Informasi Pengirim / Yang Request
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Nama pemilik rekening pengirim *
                        </label>
                        <Input
                          type="text"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Masukkan nama pemilik rekening"
                          className="w-full bg-gray-50"
                          readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Otomatis terisi sesuai nama akun yang login
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Bank pengirim *
                        </label>
                        <Input
                          type="text"
                          value={senderBank}
                          onChange={(e) => setSenderBank(e.target.value)}
                          placeholder="Contoh: BCA, Mandiri, BRI"
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Nomor rekening pengirim *
                      </label>
                      <Input
                        type="text"
                        value={senderAccount}
                        onChange={(e) => setSenderAccount(e.target.value)}
                        placeholder="Masukkan nomor rekening"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Upload Bukti Transfer *
                      </label>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setTransferProof(file);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                        />
                        <p className="text-xs text-gray-500">
                          Format yang didukung: JPG, PNG, PDF (Maksimal 5MB)
                        </p>
                        {transferProof && (
                          <div className="flex items-center space-x-2 p-2 bg-green-50 rounded text-sm text-green-700">
                            ✓ File terpilih: {transferProof.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Catatan Request (Opsional)
                      </label>
                      <textarea
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        placeholder="Tambahkan catatan atau keterangan khusus untuk request ini..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPaymentMethod("bank_transfer");
                          setSelectedBankMethod("");
                        }}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedPaymentMethod === "bank_transfer"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <div className="font-medium mb-1">Bank Transfer</div>
                        <div className="text-sm text-gray-600">
                          Manual konfirmasi
                        </div>
                      </button>
                      {/*   <button
                        type="button"
                        onClick={() => {
                          setSelectedPaymentMethod("paylabs");
                          setSelectedBankMethod("");
                        }}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedPaymentMethod === "paylabs"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                       <div className="font-medium mb-1">Paylabs</div>
                        <div className="text-sm text-gray-600">
                          Auto konfirmasi
                        </div>
                      </button> */}
                    </div>
                  </div>

                  {/* Bank Selection for Bank Transfer */}
                  {selectedPaymentMethod === "bank_transfer" &&
                    bankMethods.length > 0 && (
                      <div className="mt-4">
                        <Separator className="mb-4" />
                        <label className="text-sm font-medium mb-3 block">
                          Pilih Bank Transfer
                        </label>
                        <RadioGroup
                          value={selectedBankMethod}
                          onValueChange={setSelectedBankMethod}
                          className="space-y-3 max-h-48 overflow-y-auto"
                        >
                          {bankMethods
                            .filter((method) => method.bank_name !== "BCA") // ⬅️ hide BCA
                            .map((method) => (
                              <div
                                key={method.id}
                                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                              >
                                <RadioGroupItem
                                  value={method.id}
                                  id={method.id}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <Label
                                    htmlFor={method.id}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {method.bank_name}
                                  </Label>
                                  <div className="text-xs text-gray-600 mt-1">
                                    <div>A/N: {method.account_holder}</div>
                                    <div>No. Rek: {method.account_number}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </RadioGroup>
                        {selectedBankMethod && (
                          <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700">
                            {
                              bankMethods.find(
                                (m) => m.id === selectedBankMethod,
                              )?.bank_name
                            }{" "}
                            dipilih
                          </div>
                        )}
                      </div>
                    )}
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={
                      isSubmittingTopUp ||
                      !topUpAmount ||
                      parseInt(topUpAmount) < 10000 ||
                      !selectedPaymentMethod ||
                      (selectedPaymentMethod === "bank_transfer" &&
                        !selectedBankMethod) ||
                      !senderName.trim() ||
                      !senderBank.trim() ||
                      !senderAccount.trim() ||
                      !transferProof
                    }
                    onClick={async () => {
                      if (topUpAmount && selectedPaymentMethod && user) {
                        try {
                          setIsSubmittingTopUp(true);

                          let destinationAccount = "";
                          let bankName = "";

                          if (selectedPaymentMethod === "bank_transfer") {
                            const selectedBank = bankMethods.find(
                              (method) => method.id === selectedBankMethod,
                            );
                            destinationAccount =
                              selectedBank?.account_number || "";
                            bankName = selectedBank?.bank_name || "";
                          }

                          // Generate reference number: TP-YYYYMMDD-HHMMSS-RANDOM
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(
                            2,
                            "0",
                          );
                          const day = String(now.getDate()).padStart(2, "0");
                          const hours = String(now.getHours()).padStart(2, "0");
                          const minutes = String(now.getMinutes()).padStart(
                            2,
                            "0",
                          );
                          const seconds = String(now.getSeconds()).padStart(
                            2,
                            "0",
                          );
                          const random = Math.floor(Math.random() * 10000)
                            .toString()
                            .padStart(4, "0");
                          const referenceNo = `TOP-AR-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;

                          // Upload transfer proof file to Supabase storage
                          let proofUrl = "";
                          if (transferProof) {
                            const fileExt = transferProof.name.split(".").pop();
                            const fileName = `${user.id}/${referenceNo}.${fileExt}`;

                            const { data: uploadData, error: uploadError } =
                              await supabase.storage
                                .from("transfer-proofs")
                                .upload(fileName, transferProof, {
                                  cacheControl: "3600",
                                  upsert: false,
                                });

                            if (uploadError) {
                              console.error(
                                "Error uploading file:",
                                uploadError,
                              );
                              alert(
                                "Gagal mengupload bukti transfer. Silakan coba lagi.",
                              );
                              setIsSubmittingTopUp(false);
                              return;
                            }

                            // Get public URL for the uploaded file
                            const { data: urlData } = supabase.storage
                              .from("transfer-proofs")
                              .getPublicUrl(fileName);

                            proofUrl = urlData.publicUrl;
                          }

                          // Insert top-up request into database
                          const { data, error } = await supabase
                            .from("topup_requests")
                            .insert({
                              user_id: user.id,
                              sender_name: senderName,
                              sender_bank: senderBank,
                              sender_account: senderAccount,
                              amount: parseInt(topUpAmount),
                              payment_method: selectedPaymentMethod,
                              bank_name: bankName,
                              destination_account: destinationAccount,
                              account_holder_received:
                                selectedBank?.account_holder || null, // ✅ Fix
                              note: requestNote || null,
                              reference_no: referenceNo,
                              proof_url: proofUrl,
                              request_by_role: userRole,
                            })
                            .select()
                            .single();

                          if (error) {
                            console.error(
                              "Error creating top-up request:",
                              error,
                            );
                            alert(
                              "Gagal membuat request top up. Silakan coba lagi.",
                            );
                            setIsSubmittingTopUp(false);
                            return;
                          }

                          // Add entry to histori_transaksi table with correct saldo calculation
                          try {
                            await insertTransactionWithCorrectBalance(
                              user.id,
                              referenceNo,
                              parseInt(topUpAmount),
                              `Request top up saldo - ${referenceNo}`,
                              "Topup Agent Request",
                              "pending",
                            );
                          } catch (historyError) {
                            console.error(
                              "Error creating transaction history:",
                              historyError,
                            );
                            // Don't block the process, just log the error
                          }

                          // Reset form (keep sender name as it's auto-populated)
                          setTopUpAmount("");
                          setSelectedPaymentMethod("");
                          setSelectedBankMethod("");
                          // Don't reset senderName as it's auto-populated from user data
                          setSenderBank("");
                          setSenderAccount("");
                          setRequestNote("");
                          setTransferProof(null);

                          // Navigate to details page with reference number
                          navigate(`/topup-details?ref=${data.reference_no}`);
                        } catch (error) {
                          console.error("Error in top-up request:", error);
                          alert("Terjadi kesalahan. Silakan coba lagi.");
                          setIsSubmittingTopUp(false);
                        }
                      }
                    }}
                  >
                    {isSubmittingTopUp ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Memproses...
                      </>
                    ) : (
                      "Top Up Sekarang"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Riwayat Transaksi</CardTitle>
                  <CardDescription>
                    Riwayat top up dan penggunaan saldo untuk pembayaran booking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>ID Booking</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Saldo Awal</TableHead>
                          <TableHead>Jumlah Dipotong</TableHead>
                          <TableHead>Nominal Topup</TableHead>
                          <TableHead>Saldo Setelah</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingTransactionHistory ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : transactionHistory.length > 0 ? (
                          transactionHistory.map((transaction) => {
                            const isTopUp =
                              transaction.nominal > 0 ||
                              (transaction.jenis_transaksi &&
                                transaction.jenis_transaksi
                                  .toLowerCase()
                                  .includes("topup"));

                            const isTopUpRequest =
                              transaction.code_booking &&
                              (transaction.code_booking.startsWith("TOP-AR-") ||
                                (transaction.code_booking.startsWith("TOP-") &&
                                  transaction.jenis_transaksi ===
                                    "Topup Agent Request"));

                            // Use the saldo_akhir from database as it's now calculated correctly
                            const saldoAkhir = transaction.saldo_akhir;

                            // Calculate saldo_awal based on the transaction type and saldo_akhir
                            let saldoAwal;
                            if (isTopUp && transaction.nominal > 0) {
                              // For actual top-up: saldo_awal = saldo_akhir - nominal
                              saldoAwal = saldoAkhir - transaction.nominal;
                            } else if (isTopUpRequest) {
                              // For top-up requests: saldo_awal = saldo_akhir (no balance change)
                              saldoAwal = saldoAkhir;
                            } else {
                              // For deductions: saldo_awal = saldo_akhir + |nominal|
                              saldoAwal =
                                saldoAkhir + Math.abs(transaction.nominal);
                            }

                            return (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  {transaction.trans_date
                                    ? formatDate(transaction.trans_date)
                                    : "N/A"}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {transaction.code_booking || "N/A"}
                                </TableCell>
                                <TableCell>
                                  {buildTxnDescription(
                                    transaction,
                                    handlingBookings,
                                  )}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(saldoAwal)}
                                </TableCell>
                                <TableCell className="text-red-600 font-medium">
                                  {!isTopUp && !isTopUpRequest
                                    ? formatCurrency(
                                        Math.abs(transaction.nominal),
                                      )
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-green-600 font-medium">
                                  {(isTopUp && transaction.nominal > 0) ||
                                  isTopUpRequest
                                    ? "+" +
                                      formatCurrency(
                                        Math.abs(transaction.nominal),
                                      )
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(saldoAkhir)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      transaction.status === "verified"
                                        ? "default"
                                        : transaction.status === "pending"
                                          ? "secondary"
                                          : "destructive"
                                    }
                                  >
                                    {transaction.status === "verified"
                                      ? "Verified"
                                      : transaction.status === "pending"
                                        ? "Pending"
                                        : "Rejected"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-8 text-gray-500"
                            >
                              Belum ada riwayat transaksi
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeMenu === "riwayat-transaksi" && (
            <>
              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Riwayat Transaksi</CardTitle>
                  <CardDescription>
                    Riwayat booking dan pemotongan saldo untuk pembayaran
                    booking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>ID Booking/Transactions</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Saldo Awal</TableHead>
                          <TableHead>Jumlah Dipotong</TableHead>
                          <TableHead>Penambahan Saldo/Topup</TableHead>
                          <TableHead>Saldo Setelah</TableHead>
                          <TableHead>Status1</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingTransactionHistory ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : transactionHistory.length > 0 ? (
                          transactionHistory.map((transaction) => {
                            const isTopUp =
                              transaction.nominal > 0 ||
                              (transaction.jenis_transaksi &&
                                transaction.jenis_transaksi
                                  .toLowerCase()
                                  .includes("topup"));

                            const isTopUpRequest =
                              transaction.code_booking &&
                              (transaction.code_booking.startsWith("TOP-AR-") ||
                                (transaction.code_booking.startsWith("TOP-") &&
                                  transaction.jenis_transaksi ===
                                    "Topup Agent Request"));

                            // Use the saldo_akhir from database as it's now calculated correctly
                            const saldoAkhir = transaction.saldo_akhir;

                            // Calculate saldo_awal based on the transaction type and saldo_akhir
                            let saldoAwal;
                            if (isTopUp && transaction.nominal > 0) {
                              // For actual top-up: saldo_awal = saldo_akhir - nominal
                              saldoAwal = saldoAkhir - transaction.nominal;
                            } else if (isTopUpRequest) {
                              // For top-up requests: saldo_awal = saldo_akhir (no balance change)
                              saldoAwal = saldoAkhir;
                            } else {
                              // For deductions: saldo_awal = saldo_akhir + |nominal|
                              saldoAwal =
                                saldoAkhir + Math.abs(transaction.nominal);
                            }

                            return (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  {transaction.trans_date
                                    ? formatDate(transaction.trans_date)
                                    : "N/A"}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {transaction.code_booking || "N/A"}
                                </TableCell>
                                <TableCell>
                                  {buildTxnDescription(
                                    transaction,
                                    handlingBookings,
                                  )}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(saldoAwal)}
                                </TableCell>
                                <TableCell className="text-red-600 font-medium">
                                  {!isTopUp && !isTopUpRequest
                                    ? formatCurrency(
                                        Math.abs(transaction.nominal),
                                      )
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-green-600 font-medium">
                                  {(isTopUp && transaction.nominal > 0) ||
                                  isTopUpRequest
                                    ? "+" +
                                      formatCurrency(
                                        Math.abs(transaction.nominal),
                                      )
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(saldoAkhir)}
                                </TableCell>
                                <TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        transaction.status === "confirmed"
                                          ? "default"
                                          : transaction.status === "pending"
                                            ? "secondary"
                                            : transaction.status === "completed"
                                              ? "default"
                                              : transaction.status ===
                                                  "canceled"
                                                ? "destructive"
                                                : transaction.status ===
                                                    "rejected"
                                                  ? "destructive"
                                                  : "secondary"
                                      }
                                    >
                                      {transaction.status === "confirmed"
                                        ? "Confirmed"
                                        : transaction.status === "pending"
                                          ? "Pending"
                                          : transaction.status === "completed"
                                            ? "Completed"
                                            : transaction.status === "canceled"
                                              ? "Canceled"
                                              : transaction.status ===
                                                  "rejected"
                                                ? "Rejected"
                                                : transaction.status ||
                                                  "Pending"}
                                    </Badge>
                                  </TableCell>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-8 text-gray-500"
                            >
                              Belum ada riwayat transaksi
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeMenu === "riwayat-topup" && (
            <>
              {/* Top Up History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Riwayat Top Up</CardTitle>
                  <CardDescription>
                    Riwayat transaksi top up saldo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>ID Transaksi</TableHead>
                          <TableHead>Metode Pembayaran</TableHead>
                          <TableHead>Saldo Awal</TableHead>
                          <TableHead>Jumlah Top Up</TableHead>
                          <TableHead>Saldo Akhir</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingTopUpHistory ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : topUpHistory.length > 0 ? (
                          topUpHistory.map((topup, index) => {
                            return (
                              <TableRow key={topup.id}>
                                <TableCell>
                                  {topup.created_at
                                    ? formatDate(topup.created_at)
                                    : "N/A"}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {topup.reference_no || topup.id.slice(0, 8)}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {topup.method === "bank_transfer"
                                        ? "Bank Transfer"
                                        : topup.method === "paylabs"
                                          ? "Paylabs"
                                          : topup.method}
                                    </div>
                                    {topup.bank_name && (
                                      <div className="text-sm text-gray-600">
                                        {topup.bank_name}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {topup.saldo_awal !== null &&
                                  topup.saldo_awal !== undefined
                                    ? formatCurrency(topup.saldo_awal)
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-green-600 font-medium">
                                  +{formatCurrency(topup.amount)}
                                </TableCell>
                                <TableCell>
                                  {topup.saldo_akhir !== null &&
                                  topup.saldo_akhir !== undefined
                                    ? formatCurrency(topup.saldo_akhir)
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      topup.status === "approved"
                                        ? "default"
                                        : topup.status === "pending"
                                          ? "secondary"
                                          : "destructive"
                                    }
                                  >
                                    {topup.status === "approved"
                                      ? "Berhasil"
                                      : topup.status === "pending"
                                        ? "Menunggu"
                                        : topup.status === "rejected"
                                          ? "Ditolak"
                                          : topup.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-gray-500"
                            >
                              Belum ada riwayat top up
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeMenu === "total-passenger" && (
            <>
              {/* Passenger Analytics Dashboard */}
              <div className="space-y-8">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6">
                  {/* Total Passengers Card */}
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium opacity-90">
                        Total Passenger
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">
                        {orders
                          .filter((order) => order.status === "completed")
                          .reduce((sum, order) => sum + order.participants, 0)}
                      </div>
                      <div className="flex items-center text-sm opacity-90">
                        <Users className="h-4 w-4 mr-1" />
                        Passenger selesai
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                  {/* Monthly Breakdown */}
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Users className="h-5 w-5 mr-2 text-green-600" />
                        Breakdown by Status
                      </CardTitle>
                      <CardDescription>
                        Distribusi passenger berdasarkan status pesanan
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium">Selesai</span>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {orders
                              .filter((order) => order.status === "completed")
                              .reduce(
                                (sum, order) => sum + order.participants,
                                0,
                              )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium">
                              Dikonfirmasi
                            </span>
                          </div>
                          <span className="text-lg font-bold text-blue-600">
                            {orders
                              .filter((order) => order.status === "confirmed")
                              .reduce(
                                (sum, order) => sum + order.participants,
                                0,
                              )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium">Pending</span>
                          </div>
                          <span className="text-lg font-bold text-orange-600">
                            {orders
                              .filter((order) => order.status === "pending")
                              .reduce(
                                (sum, order) => sum + order.participants,
                                0,
                              )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium">
                              Dibatalkan
                            </span>
                          </div>
                          <span className="text-lg font-bold text-red-600">
                            {orders
                              .filter((order) => order.status === "cancelled")
                              .reduce(
                                (sum, order) => sum + order.participants,
                                0,
                              )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}

          {activeMenu === "profile" && (
            <>
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <Users className="h-6 w-6 mr-2 text-green-600" />
                    Informasi Profile Agent
                  </CardTitle>
                  <CardDescription>
                    Data lengkap profil agent yang terdaftar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingProfile ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-3"></div>
                      <span className="text-gray-600">Loading profile...</span>
                    </div>
                  ) : agentProfile ? (
                    <div className="space-y-6">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Informasi Dasar
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Nama Lengkap
                              </label>
                              <p className="text-sm font-medium text-gray-900">
                                {agentProfile.full_name || "N/A"}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Email
                              </label>
                              <p className="text-sm text-gray-900">
                                {agentProfile.email || "N/A"}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Nomor Telepon
                              </label>
                              <p className="text-sm text-gray-900">
                                {agentProfile.phone_number || "N/A"}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Role
                              </label>
                              <div className="text-sm text-gray-900">
                                <Badge variant="default">
                                  {agentProfile.role || "Agent"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                            Informasi Akun
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Status Akun
                              </label>
                              <div className="text-sm text-gray-900">
                                <Badge
                                  variant={
                                    agentProfile.status === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {agentProfile.status === "active"
                                    ? "Aktif"
                                    : agentProfile.status || "N/A"}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Saldo
                              </label>
                              <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(agentProfile.saldo || 0)}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Status Memberships
                              </label>
                              <div className="text-sm text-gray-900">
                                <Badge
                                  variant={
                                    agentProfile.member_is_active === true
                                      ? "default"
                                      : agentProfile.member_is_active === false
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {agentProfile.member_is_active === true
                                    ? "Active"
                                    : agentProfile.member_is_active === false
                                      ? "Inactive"
                                      : "N/A"}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">
                                Tanggal Bergabung
                              </label>
                              <p className="text-sm text-gray-900">
                                {agentProfile.created_at
                                  ? formatDate(agentProfile.created_at)
                                  : "N/A"}
                              </p>
                            </div>
                            {/*      <div>
                              <label className="text-sm font-medium text-gray-500">
                                Role ID
                              </label>
                              <p className="text-sm text-gray-900">
                                {agentProfile.role_id || "N/A"}
                              </p>
                            </div>*/}
                          </div>
                        </div>
                      </div>

                      {/* Additional Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                          Informasi Tambahan
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Nomor KTP
                            </label>
                            <p className="text-sm text-gray-900">
                              {agentProfile.ktp_number || "N/A"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Nomor Lisensi
                            </label>
                            <p className="text-sm text-gray-900">
                              {agentProfile.license_number || "N/A"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Pendidikan
                            </label>
                            <p className="text-sm text-gray-900">
                              {agentProfile.education || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Statistics */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                          Statistik
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="flex items-center">
                              <Package className="h-5 w-5 text-green-600 mr-2" />
                              <span className="text-sm font-medium text-green-800">
                                Total Pesanan
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-green-600 mt-2">
                              {orders.length}
                            </p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center">
                              <Users className="h-5 w-5 text-blue-600 mr-2" />
                              <span className="text-sm font-medium text-blue-800">
                                Total Passenger
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-blue-600 mt-2">
                              {totalParticipants}
                            </p>
                          </div>
                          <div className="bg-yellow-50 p-4 rounded-lg">
                            <div className="flex items-center">
                              <DollarSign className="h-5 w-5 text-yellow-600 mr-2" />
                              <span className="text-sm font-medium text-yellow-800">
                                Total Pendapatan
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-yellow-600 mt-2">
                              {formatCurrency(totalRevenue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Data profil tidak ditemukan
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
