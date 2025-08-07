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

type HandlingBooking = Tables<"handling_bookings">;

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

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [handlingBookings, setHandlingBookings] = useState<HandlingBooking[]>(
    [],
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<
    "dashboard" | "booking" | "saldo"
  >("dashboard");
  const [currentBalance, setCurrentBalance] = useState(5000000);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

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

      setHandlingBookings(data || []);

      // Convert handling bookings to orders format for compatibility
      const convertedOrders: Order[] = (data || []).map((booking) => ({
        id: booking.code_booking || booking.id,
        package_name: `${booking.category} - ${booking.travel_type}`,
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
      }));

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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/signin");
      } else {
        // Fetch handling bookings and user role for the current user
        fetchHandlingBookings(session.user.id);
        fetchUserRole(session.user.id);
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
        // Fetch handling bookings and user role for the current user
        fetchHandlingBookings(session.user.id);
        fetchUserRole(session.user.id);
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
      "Total",
      "Status",
      "Tanggal Dibuat",
      "Tanggal Keberangkatan",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredOrders.map((order) =>
        [
          `"${order.id}"`,
          `"${order.customer_name}"`,
          `"${order.package_name}"`,
          `"${order.participants} orang"`,
          `"${order.payment_method || "N/A"}"`,
          `"${order.status === "completed" ? "Lunas" : order.status === "confirmed" ? "Dibayar" : "Belum Bayar"}"`,
          `"${formatCurrency(order.total_amount)}"`,
          `"${order.status === "pending" ? "Menunggu" : order.status === "confirmed" ? "Dikonfirmasi" : order.status === "cancelled" ? "Dibatalkan" : "Selesai"}"`,
          `"${formatDate(order.created_at)}"`,
          `"${formatDate(order.departure_date)}"`,
        ].join(","),
      ),
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
                <Card>
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

                <Card>
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

                <Card>
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

                <Card>
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
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length > 0 ? (
                          filteredOrders.map((order) => (
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
                              <TableCell>{order.participants} orang</TableCell>
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
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={9}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Wallet className="h-6 w-6 mr-2 text-green-600" />
                      Saldo Saat Ini
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-green-600 mb-4">
                      {formatCurrency(currentBalance)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Saldo tersedia untuk transaksi
                    </p>
                  </CardContent>
                </Card>

                <Card>
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
                        placeholder="Masukkan jumlah"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Metode Pembayaran
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPaymentMethod("bank_transfer")
                          }
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
                          onClick={() => setSelectedPaymentMethod("paylabs")}
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
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={!topUpAmount || !selectedPaymentMethod}
                      onClick={() => {
                        if (topUpAmount && selectedPaymentMethod) {
                          const paymentMethodText =
                            selectedPaymentMethod === "bank_transfer"
                              ? "Bank Transfer manual konfirmasi"
                              : "Paylabs auto konfirmasi";

                          setCurrentBalance(
                            (prev) => prev + parseInt(topUpAmount),
                          );
                          setTopUpAmount("");
                          setSelectedPaymentMethod("");
                          alert(
                            `Top up berhasil melalui ${paymentMethodText}!`,
                          );
                        }
                      }}
                    >
                      Top Up Sekarang
                    </Button>
                  </CardContent>
                </Card>
              </div>

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
                        <TableRow>
                          <TableCell>15 Jan 2024</TableCell>
                          <TableCell>
                            <Badge variant="default">Top Up</Badge>
                          </TableCell>
                          <TableCell>Top up saldo via transfer bank</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            +{formatCurrency(2000000)}
                          </TableCell>
                          <TableCell>{formatCurrency(5000000)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>10 Jan 2024</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Pembayaran</Badge>
                          </TableCell>
                          <TableCell>Pembayaran komisi ORD-001</TableCell>
                          <TableCell className="text-red-600 font-medium">
                            -{formatCurrency(500000)}
                          </TableCell>
                          <TableCell>{formatCurrency(3000000)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>05 Jan 2024</TableCell>
                          <TableCell>
                            <Badge variant="default">Top Up</Badge>
                          </TableCell>
                          <TableCell>Top up saldo via transfer bank</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            +{formatCurrency(3500000)}
                          </TableCell>
                          <TableCell>{formatCurrency(3500000)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
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
