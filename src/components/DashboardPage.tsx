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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
} from "lucide-react";

type HandlingBooking = Tables<"handling_bookings"> & {
  bank_name?: string;
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
    t?.kode_booking &&
    typeof t.kode_booking === "string" &&
    t.kode_booking.trim() &&
    t.kode_booking !== "undefined" &&
    t.kode_booking !== "null"
  ) {
    return `Pembayaran booking ${t.kode_booking.trim()}`;
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
  >("dashboard");
  const [saldo, setSaldo] = useState<number>(0);
  const [loadingSaldo, setLoadingSaldo] = useState<boolean>(true);
  const [currentBalance, setCurrentBalance] = useState(5000000);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
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

  const [bookingCodeFilter, setBookingCodeFilter] = useState("");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const navigate = useNavigate();

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
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching handling bookings:", error);
        return;
      }

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
      setSaldo(0);
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

      // Normalisasi saat mapping
      const normalizeTxn = (t: any) => ({
        ...t,
        keterangan: clean(t?.keterangan),
        kode_booking: clean(t?.kode_booking),
      });
      setTransactionHistory((data ?? []).map(normalizeTxn));
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
        .from("topup_requests")
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

        // Auto-populate sender name with user's full name
        const userFullName =
          session.user.user_metadata?.full_name || session.user.email || "";
        setSenderName(userFullName);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Filter orders based on booking code
  useEffect(() => {
    let filtered = [...orders];

    // Filter by booking code
    if (bookingCodeFilter.trim()) {
      filtered = filtered.filter((order) =>
        order.id.toLowerCase().includes(bookingCodeFilter.toLowerCase().trim()),
      );
    }

    setFilteredOrders(filtered);
  }, [orders, bookingCodeFilter]);

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

  const handleViewOrder = async (order: Order) => {
    // Find the original booking data for more details
    const originalBooking = handlingBookings.find(
      (booking) => (booking.code_booking || booking.id) === order.id,
    );

    // Fetch bank name from payments table if payment method is bank_transfer
    let bankName = "";
    if (originalBooking?.payment_method === "bank_transfer") {
      // First try to get bank name from handling_bookings table
      if (originalBooking?.bank_name) {
        bankName = originalBooking.bank_name;
      }
      // If not found and payment_id exists, try payments table
      else if (originalBooking?.payment_id) {
        try {
          const { data: paymentData, error } = await supabase
            .from("payments")
            .select("bank_name")
            .eq("id", originalBooking.payment_id)
            .single();

          if (!error && paymentData) {
            bankName = paymentData.bank_name || "";
          }
        } catch (error) {
          console.error("Error fetching bank name:", error);
        }
      }
    }

    // Create enhanced order with additional details
    const enhancedOrder = {
      ...order,
      pickup_area: originalBooking?.pickup_area || "N/A",
      dropoff_area: originalBooking?.dropoff_area || "N/A",
      flight_number: originalBooking?.flight_number || "N/A",
      customer_phone: originalBooking?.customer_phone || "N/A",
      customer_email: originalBooking?.customer_email || "N/A",
      bank_name: bankName,
    };

    console.log("Enhanced order with bank name:", enhancedOrder); // Debug log
    setSelectedOrder(enhancedOrder);
    setViewModalOpen(true);
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
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {
                        orders.filter((order) => order.status === "confirmed")
                          .length
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pesanan yang dikonfirmasi
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
                  <CardDescription>
                    5 pesanan terbaru dari jamaah Anda
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
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Aksi</TableHead>
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
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewOrder(order)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
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
                    Filter pesanan berdasarkan kode booking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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

              {/* All Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Semua Pesanan</CardTitle>
                  <CardDescription>
                    Kelola semua pesanan layanan handling bandara dari jamaah
                    Anda ({filteredOrders.length} dari {orders.length} pesanan)
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
                          <TableHead>Basic Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Aksi</TableHead>
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
                            const basicPrice = originalBooking?.price || 0;

                            return (
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
                                  {order.participants} orang
                                </TableCell>
                                <TableCell>
                                  {order.payment_method || "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      order.status === "completed"
                                        ? "default"
                                        : order.status === "confirmed"
                                          ? "secondary"
                                          : "outline"
                                    }
                                  >
                                    {order.status === "completed"
                                      ? "Lunas"
                                      : order.status === "confirmed"
                                        ? "Dibayar"
                                        : "Belum Bayar"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(basicPrice)}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(order.total_amount)}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(order.status)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewOrder(order)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {isAdmin && (
                                      <>
                                        <Button variant="ghost" size="sm">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={10}
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
                          <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-md">
                            <div className="text-sm text-green-700">
                              ✓ File terpilih: {transferProof.name}
                            </div>
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
                      <button
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
                      </button>
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
                          {bankMethods.map((method) => (
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
                          const referenceNo = `TP-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;

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
                              amount: parseInt(topUpAmount),
                              method: selectedPaymentMethod,
                              bank_name: bankName,
                              destination_account: destinationAccount,
                              sender_account: senderAccount,
                              note: requestNote || null,
                              reference_no: referenceNo,
                              proof_url: proofUrl,
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
                    Riwayat top up dan penggunaan saldo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Jenis Transaksi</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Saldo Akhir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingTransactionHistory ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : transactionHistory.length > 0 ? (
                          transactionHistory.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {transaction.trans_date
                                  ? formatDate(transaction.trans_date)
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    transaction.nominal > 0
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {transaction.nominal > 0
                                    ? "Top Up"
                                    : "Pembayaran"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {buildTxnDescription(
                                  transaction,
                                  handlingBookings,
                                )}
                              </TableCell>
                              <TableCell
                                className={
                                  transaction.nominal > 0
                                    ? "text-green-600 font-medium"
                                    : "text-red-600 font-medium"
                                }
                              >
                                {transaction.nominal > 0 ? "+" : ""}
                                {formatCurrency(transaction.nominal)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(transaction.saldo_akhir)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
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
                          <TableHead>ID Booking</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Jumlah Dipotong</TableHead>
                          <TableHead>Saldo Setelah</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingTransactionHistory ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : transactionHistory.length > 0 ? (
                          transactionHistory.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {transaction.trans_date
                                  ? formatDate(transaction.trans_date)
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="font-mono">
                                {transaction.kode_booking || "N/A"}
                              </TableCell>
                              <TableCell>
                                {buildTxnDescription(
                                  transaction,
                                  handlingBookings,
                                )}
                              </TableCell>
                              <TableCell className="text-red-600 font-medium">
                                {formatCurrency(Math.abs(transaction.nominal))}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(transaction.saldo_akhir)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="default">Berhasil</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
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
                          <TableHead>Jumlah Top Up</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingTopUpHistory ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : topUpHistory.length > 0 ? (
                          topUpHistory.map((topup) => (
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
                              <TableCell className="text-green-600 font-medium">
                                +{formatCurrency(topup.amount)}
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
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
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
        </main>
      </div>

      {/* Order Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pesanan</DialogTitle>
            <DialogDescription>
              Informasi lengkap pesanan handling bandara
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    ID Pesanan
                  </label>
                  <p className="text-sm font-mono">{selectedOrder.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Nama Customer
                  </label>
                  <p className="text-sm">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Type Travel
                  </label>
                  <p className="text-sm">{selectedOrder.package_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tanggal Pick Up
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedOrder.departure_date)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Waktu Jemput
                  </label>
                  <p className="text-sm">
                    {selectedOrder.pickup_time || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Area Lokasi Penjemputan
                  </label>
                  <p className="text-sm">
                    {(selectedOrder as any).pickup_area || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Area Lokasi Pengantaran
                  </label>
                  <p className="text-sm">
                    {(selectedOrder as any).dropoff_area || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Passenger
                  </label>
                  <p className="text-sm">{selectedOrder.participants} orang</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Payment Method
                  </label>
                  <div className="text-sm">
                    <p>{selectedOrder.payment_method || "N/A"}</p>
                    {selectedOrder.payment_method === "bank_transfer" &&
                      (selectedOrder as any).bank_name && (
                        <p className="text-gray-600 mt-1">
                          {(selectedOrder as any).bank_name}
                        </p>
                      )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Total
                  </label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(selectedOrder.total_amount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tanggal Dibuat
                  </label>
                  <p className="text-sm">
                    {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
              </div>

              {(selectedOrder as any).customer_phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    No. Telepon Customer
                  </label>
                  <p className="text-sm">
                    {(selectedOrder as any).customer_phone}
                  </p>
                </div>
              )}

              {(selectedOrder as any).customer_email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Email Customer
                  </label>
                  <p className="text-sm">
                    {(selectedOrder as any).customer_email}
                  </p>
                </div>
              )}

              {(selectedOrder as any).flight_number && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Nomor Penerbangan
                  </label>
                  <p className="text-sm">
                    {(selectedOrder as any).flight_number}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
