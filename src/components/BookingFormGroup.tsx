import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import * as z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { supabase } from "../lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";

// Generate UUID v4
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const formSchema = z
  .object({
    nama_perusahaan: z
      .string()
      .min(1, { message: "Nama perusahaan diperlukan" }),
    nama_lengkap: z
      .string()
      .min(2, { message: "Nama lengkap harus minimal 2 karakter" }),
    email: z.string().email({ message: "Masukkan alamat email yang valid" }),
    no_telepon: z
      .string()
      .min(8, { message: "Masukkan nomor telepon yang valid" }),
    jumlah_penumpang: z
      .number()
      .min(1, {
        message: "Jumlah penumpang minimal 6 orang untuk booking grup",
      })
      .max(200, { message: "Jumlah penumpang maksimal 200 orang" }),
    nomor_penerbangan: z
      .string()
      .min(2, { message: "Nomor penerbangan diperlukan" }),
    jenis_perjalanan: z
      .array(z.string())
      .min(1, { message: "Pilih minimal satu jenis perjalanan" }),
    additional_baggage: z
      .number()
      .min(0, { message: "Jumlah bagasi tambahan tidak boleh negatif" })
      .optional(),
    area_penjemputan: z.string().optional(),
    area_pengantaran: z.string().optional(),
    tanggal_pickup: z.string().min(1, { message: "Tanggal pickup diperlukan" }),
    waktu_pickup: z.string().min(1, { message: "Waktu pickup diperlukan" }),
    catatan_tambahan: z.string().optional(),
    discount_amount: z.number().optional(),
    total_after_discount: z.number().optional(),
  })
  .refine(
    (data) => {
      const needsPickup =
        data.jenis_perjalanan.includes("arrival") ||
        data.jenis_perjalanan.includes("transit");
      const needsDropoff =
        data.jenis_perjalanan.includes("departure") ||
        data.jenis_perjalanan.includes("transit");

      if (
        needsPickup &&
        (!data.area_penjemputan || data.area_penjemputan.trim() === "")
      ) {
        return false;
      }

      if (
        needsDropoff &&
        (!data.area_pengantaran || data.area_pengantaran.trim() === "")
      ) {
        return false;
      }

      return true;
    },
    {
      message: "Pilih lokasi yang sesuai dengan jenis perjalanan yang dipilih",
      path: ["jenis_perjalanan"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

const locationOptions = [
  "Terminal 2F – International Arrival Hall",
  "Terminal 3 – International Arrival (Gate G6 / Area Umum)",
  "Terminal 2F – International Departure Check-in",
  "Terminal 3 – International Departure (Check-in & Imigrasi)",
  "Terminal 2F – International Transfer Desk",
  "Terminal 3 – International Transfer Area",
];

const travelTypes = [
  { id: "arrival", label: "Arrival", dbId: 40, tripType: "arrival" },
  { id: "departure", label: "Departure", dbId: 41, tripType: "departure" },
  { id: "transit", label: "Transit", dbId: 46, tripType: "transit" },
];

const BookingFormGroup = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSaldo, setUserSaldo] = useState<number>(0);
  const [userDiscount, setUserDiscount] = useState<{
    kind: string | null;
    value: number | null;
    cap: number | null;
    active: boolean;
  }>({ kind: null, value: null, cap: null, active: false });
  const [servicePrices, setServicePrices] = useState<{ [key: string]: number }>(
    {},
  );
  const [additionalPrices, setAdditionalPrices] = useState<{
    [key: string]: number;
  }>({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [selectedBankMethod, setSelectedBankMethod] = useState<string>("");
  const [bankTransferMethods, setBankTransferMethods] = useState<any[]>([]);
  const [bankTransferLoading, setBankTransferLoading] = useState(true);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [bookingCode, setBookingCode] = useState<string>("");
  const [discountKind, setDiscountKind] = useState<string>("");
  const [discountValue, setDiscountValue] = useState<number>(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_perusahaan: "",
      nama_lengkap: "",
      email: "",
      no_telepon: "",
      jumlah_penumpang: 1,
      nomor_penerbangan: "",
      jenis_perjalanan: [],
      additional_baggage: 0,
      area_penjemputan: "",
      area_pengantaran: "",
      tanggal_pickup: "",
      waktu_pickup: "",
      catatan_tambahan: "",
      discount_amount: 0,
      total_after_discount: 0,
    },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);

          // Fetch user profile from users table including discount columns
          const { data: profile, error } = await supabase
            .from("users")
            .select(
              "*, handling_discount_kind, handling_discount_value, handling_discount_cap, handling_discount_active",
            )
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Error fetching user profile:", error);
          } else {
            setUserProfile(profile);
            setUserSaldo(profile.saldo || 0);
            // Set discount information
            setUserDiscount({
              kind: profile.handling_discount_kind,
              value: profile.handling_discount_value,
              cap: profile.handling_discount_cap,
              active: profile.handling_discount_active || false,
            });
            // Set discount form values
            setDiscountKind(profile.handling_discount_kind || "");
            setDiscountValue(profile.handling_discount_value || 0);
            // Auto-fill form with user data
            form.setValue("nama_perusahaan", profile.nama_perusahaan || "");
            form.setValue("nama_lengkap", profile.full_name || "");
            form.setValue("email", profile.email || "");
            form.setValue("no_telepon", profile.phone_number || "");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchServicePrices = async () => {
      try {
        setPricesLoading(true);

        // Fetch prices from airport_handling_services table
        const { data: servicesData, error } = await supabase
          .from("airport_handling_services")
          .select(
            "id, service_type, category, trip_type, sell_price, additional",
          )
          .eq("service_type", "Handling Passenger")
          .eq("category", "Agent Group")
          .in("id", [40, 41, 42, 46]);

        if (error) {
          console.error("Error fetching service prices:", error);
          // Fallback to default prices if database query fails
          const pricesMap: { [key: string]: number } = {
            arrival: 25000,
            departure: 25000,
            transit: 50000,
          };
          const additionalMap: { [key: string]: number } = {
            arrival: 0,
            departure: 0,
            transit: 0,
          };
          setServicePrices(pricesMap);
          setAdditionalPrices(additionalMap);
          return;
        }

        // Map the database results to our price structure
        const pricesMap: { [key: string]: number } = {};
        const additionalMap: { [key: string]: number } = {};

        servicesData?.forEach((service) => {
          if (service.id === 40 && service.trip_type === "arrival") {
            pricesMap.arrival = service.sell_price;
            additionalMap.arrival = service.additional || 0;
          } else if (service.id === 41 && service.trip_type === "departure") {
            pricesMap.departure = service.sell_price;
            additionalMap.departure = service.additional || 0;
          } else if (service.id === 46 && service.trip_type === "transit") {
            pricesMap.transit = service.sell_price;
            additionalMap.transit = service.additional || 0;
          } else if (
            service.id === 42 &&
            service.trip_type === "arrival_departure"
          ) {
            pricesMap.arrival_departure = service.sell_price;
            additionalMap.arrival_departure = service.additional || 0;
          }
        });

        console.log("Fetched prices from database:", pricesMap);
        console.log("Fetched additional prices from database:", additionalMap);
        console.log("Services data:", servicesData);
        setServicePrices(pricesMap);
        setAdditionalPrices(additionalMap);
      } catch (error) {
        console.error("Error fetching service prices:", error);
        // Fallback to default prices
        const pricesMap: { [key: string]: number } = {
          arrival: 25000,
          departure: 25000,
          transit: 50000,
        };
        setServicePrices(pricesMap);
      } finally {
        setPricesLoading(false);
      }
    };

    const fetchBankTransferMethods = async () => {
      try {
        setBankTransferLoading(true);
        const { data, error } = await supabase
          .from("payment_methods")
          .select("id, name, account_holder, account_number")
          .eq("type", "manual")
          .eq("is_active", true);

        if (error) {
          console.error("Error fetching bank transfer methods:", error);
        } else {
          console.log("Fetched bank transfer methods:", data);
          setBankTransferMethods(data || []);
        }
      } catch (error) {
        console.error("Error fetching bank transfer methods:", error);
      } finally {
        setBankTransferLoading(false);
      }
    };

    fetchUserData();
    fetchServicePrices();
    fetchBankTransferMethods();
  }, []);

  const onSubmit = async (data: FormValues) => {
    setFormData(data);
    setShowSummary(true);
  };

  const generateBookingCode = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    return `HSA-${year}${month}${day}-${hours}${minutes}${seconds}-${randomNum}`;
  };

  const handleFinalSubmit = async () => {
    if (!formData || !selectedPaymentMethod) {
      setSubmitError("Silakan pilih metode pembayaran");
      return;
    }

    if (selectedPaymentMethod === "bank_transfer" && !selectedBankMethod) {
      setSubmitError("Silakan pilih bank untuk transfer");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Generate booking code and booking ID (UUID)
      const generatedBookingCode = generateBookingCode();
      const bookingId = generateUUID(); // Generate UUID for booking_id
      setBookingCode(generatedBookingCode);

      // Calculate total amounts with discount
      const totalServicePrice = calculateTotalPrice();
      const additionalBaggagePrice = calculateAdditionalBaggagePrice();
      const originalTotalAmount =
        totalServicePrice * formData.jumlah_penumpang + additionalBaggagePrice;
      // Use form values for total_payment_amount
      const totalAmount =
        form.watch("total_after_discount") ||
        calculateDiscountedPrice(originalTotalAmount);

      // Check if using saldo and validate sufficient balance
      if (selectedPaymentMethod === "use_saldo") {
        if (userSaldo < totalAmount) {
          setSubmitError(
            `Saldo tidak mencukupi. Saldo Anda: ${formatCurrency(userSaldo)}, Total pembayaran: ${formatCurrency(totalAmount)}`,
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Determine payment status based on payment method
      const paymentStatus =
        selectedPaymentMethod === "cash" ||
        selectedPaymentMethod === "use_saldo"
          ? "Paid"
          : "tunggu konfirmasi Admin";

      // Determine booking status based on payment method
      const bookingStatus =
        selectedPaymentMethod === "use_saldo" ? "completed" : "pending";

      // Get selected bank name if bank transfer is selected
      const selectedBank = bankTransferMethods.find(
        (bank) => bank.id.toString() === selectedBankMethod,
      );
      const bankName =
        selectedPaymentMethod === "bank_transfer" && selectedBank
          ? selectedBank.name
          : null;

      // Prepare data for handling_bookings table
      const bookingData = {
        user_id: user?.id,
        booking_id: bookingId, // Add booking_id UUID
        customer_name: formData.nama_lengkap,
        customer_email: formData.email,
        customer_phone: formData.no_telepon,
        category: "Handling Group",
        pickup_area: formData.area_penjemputan,
        dropoff_area: formData.area_pengantaran,
        flight_number: formData.nomor_penerbangan,
        travel_type: formData.jenis_perjalanan.join(", "),
        pickup_date: formData.tanggal_pickup,
        pickup_time: formData.waktu_pickup,
        passengers: formData.jumlah_penumpang,
        additional_notes: formData.catatan_tambahan,
        price: totalServicePrice, // Basic price (subtotal per penumpang)
        total_amount: totalAmount, // Discounted total amount
        status: bookingStatus,
        code_booking: generatedBookingCode,
        created_at: new Date().toISOString(),
        payment_id:
          selectedPaymentMethod === "bank_transfer" ? selectedBankMethod : null,
        payment_method: selectedPaymentMethod,
        company_name: formData.nama_perusahaan,
        payment_status: paymentStatus,
        passenger_area: formData.area_penjemputan, // Required field based on schema
        total_price: totalAmount, // Discounted total amount
        bank_name: bankName, // Add selected bank name
      };

      // Insert data into handling_bookings table
      const { data: bookingResult, error: bookingError } = await supabase
        .from("handling_bookings")
        .insert([bookingData])
        .select();

      if (bookingError) {
        console.error("Error inserting booking data:", bookingError);
        throw new Error(`Database error: ${bookingError.message}`);
      }

      console.log("Booking data successfully inserted:", bookingResult);

      // If using saldo, deduct from user balance and create transaction history
      if (selectedPaymentMethod === "use_saldo") {
        // Update user saldo
        const newSaldo = userSaldo - totalAmount;
        const { error: saldoError } = await supabase
          .from("users")
          .update({ saldo: newSaldo })
          .eq("id", user.id);

        if (saldoError) {
          console.error("Error updating user saldo:", saldoError);
          throw new Error(`Gagal memotong saldo: ${saldoError.message}`);
        }

        //helper undefined category
        const buildTxnDescription = (
          transaction: any,
          handlingBookings: any[],
        ) => {
          // Cari booking terkait
          const relatedBooking = handlingBookings.find(
            (b) => b.code_booking === transaction.kode_booking,
          );

          // Ambil category, kalau kosong kasih default
          const category = relatedBooking?.category || "Handling Group";

          return `Pembayaran booking ${transaction.kode_booking || "N/A"} - ${category}`;
        };

        // Create transaction history record
        const { error: historyError } = await supabase
          .from("histori_transaksi")
          .insert({
            user_id: user.id,
            kode_booking: generatedBookingCode,
            nominal: -totalAmount, // Negative for deduction
            saldo_akhir: newSaldo,
            keterangan: `Pembayaran booking ${generatedBookingCode} - ${bookingData?.category ?? "Handling"}`,

            trans_date: new Date().toISOString(),
          });

        if (historyError) {
          console.error("Error creating transaction history:", historyError);
          // Don't throw error here as the booking is already created
        }

        // Update local saldo state
        setUserSaldo(newSaldo);
      }

      // Prepare data for payments table
      const paymentsData = {
        user_id: user?.id,
        booking_id: bookingId, // Add booking_id UUID
        payment_method: selectedPaymentMethod,
        paid_amount: totalAmount, // Discounted total amount
        code_booking: generatedBookingCode,
        status:
          selectedPaymentMethod === "cash" ||
          selectedPaymentMethod === "use_saldo"
            ? "auto paid"
            : "pending",
        amount: totalServicePrice, // basic price
        payment_status:
          selectedPaymentMethod === "cash" ||
          selectedPaymentMethod === "use_saldo"
            ? "completed"
            : "pending",
        created_at: new Date().toISOString(),
        bank_name: bankName, // Add selected bank name
      };

      // Insert data into payments table
      const { data: paymentsResult, error: paymentsError } = await supabase
        .from("payments")
        .insert([paymentsData])
        .select();

      if (paymentsError) {
        console.error("Error inserting payments data:", paymentsError);
        throw new Error(`Payments database error: ${paymentsError.message}`);
      }

      console.log("Payments data successfully inserted:", paymentsResult);

      // Prepare data for payment_bookings table
      const paymentBookingsData = {
        id: generateUUID(), // auto generate v4 for primary key
        booking_id: bookingId, // Use the same booking_id UUID
        code_booking: generatedBookingCode,
        booking_type: "handling",
        created_at: new Date().toISOString(),
      };

      // Insert data into payment_bookings table
      const { data: paymentBookingsResult, error: paymentBookingsError } =
        await supabase
          .from("payment_bookings")
          .insert([paymentBookingsData])
          .select();

      if (paymentBookingsError) {
        console.error(
          "Error inserting payment_bookings data:",
          paymentBookingsError,
        );
        throw new Error(
          `Payment bookings database error: ${paymentBookingsError.message}`,
        );
      }

      console.log(
        "Payment bookings data successfully inserted:",
        paymentBookingsResult,
      );

      // Show order details instead of success message
      setShowOrderDetails(true);
    } catch (error) {
      console.error("Error submitting booking:", error);
      setSubmitError(
        error instanceof Error
          ? `Gagal membuat pesanan: ${error.message}`
          : "Terjadi kesalahan saat membuat pesanan. Silakan coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToForm = () => {
    setShowSummary(false);
    setFormData(null);
    setSelectedPaymentMethod("");
    setSelectedBankMethod("");
    setSubmitError(null);
    // Reset form discount values to prevent re-render loops
    form.setValue("discount_amount", 0);
    form.setValue("total_after_discount", 0);
  };

  const handleBackToSummary = () => {
    setShowOrderDetails(false);
    setBookingCode("");
  };

  const handleTravelTypeChange = (travelTypeId: string, checked: boolean) => {
    const currentTypes = form.getValues("jenis_perjalanan");

    if (checked) {
      // If selecting Transit, clear all other selections
      if (travelTypeId === "transit") {
        form.setValue("jenis_perjalanan", ["transit"]);
        // Clear location fields when switching to transit
        form.setValue("area_penjemputan", "");
        form.setValue("area_pengantaran", "");
      } else {
        // If selecting Arrival or Departure, remove Transit if it exists
        const filteredTypes = currentTypes.filter((type) => type !== "transit");
        form.setValue("jenis_perjalanan", [...filteredTypes, travelTypeId]);
      }
    } else {
      form.setValue(
        "jenis_perjalanan",
        currentTypes.filter((type) => type !== travelTypeId),
      );

      // Clear location fields if they're no longer needed
      const remainingTypes = currentTypes.filter(
        (type) => type !== travelTypeId,
      );
      const needsPickup =
        remainingTypes.includes("arrival") ||
        remainingTypes.includes("transit");
      const needsDropoff =
        remainingTypes.includes("departure") ||
        remainingTypes.includes("transit");

      if (!needsPickup) {
        form.setValue("area_penjemputan", "");
      }
      if (!needsDropoff) {
        form.setValue("area_pengantaran", "");
      }
    }
  };

  const calculateTotalPrice = () => {
    const selectedTypes = form.watch("jenis_perjalanan") || [];

    let serviceTotal = 0;

    // Check if both arrival and departure are selected
    if (
      selectedTypes.includes("arrival") &&
      selectedTypes.includes("departure")
    ) {
      // Use arrival_departure price from ID 42
      serviceTotal = servicePrices.arrival_departure || 0;
    } else {
      // Otherwise, sum individual prices
      selectedTypes.forEach((type: string) => {
        if (servicePrices[type]) {
          serviceTotal += servicePrices[type];
        }
      });
    }

    return serviceTotal;
  };

  const calculateAdditionalBaggagePrice = () => {
    const selectedTypes = form.watch("jenis_perjalanan") || [];
    const additionalBaggage = form.watch("additional_baggage") || 0;

    if (additionalBaggage === 0) return 0;

    let additionalTotal = 0;

    // Check if both arrival and departure are selected
    if (
      selectedTypes.includes("arrival") &&
      selectedTypes.includes("departure")
    ) {
      additionalTotal =
        (additionalPrices.arrival_departure || 0) * additionalBaggage;
    } else {
      // Otherwise, sum individual additional prices
      selectedTypes.forEach((type: string) => {
        if (additionalPrices[type]) {
          additionalTotal += additionalPrices[type] * additionalBaggage;
        }
      });
    }

    return additionalTotal;
  };

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!userDiscount.active || !userDiscount.value) {
      return originalPrice;
    }

    // Calculate discount per passenger
    const jumlahPenumpang = form.watch("jumlah_penumpang") || 1;
    const discountPerPassenger = Math.floor(userDiscount.value);
    const totalDiscount = discountPerPassenger * jumlahPenumpang;

    // Ensure discount doesn't exceed original price
    const finalDiscount = Math.min(totalDiscount, originalPrice);

    const finalTotal = Math.max(0, originalPrice - finalDiscount);
    return finalTotal;
  };

  const handleDiscountSave = async () => {
    if (!user || !discountKind || discountValue < 0) {
      return;
    }

    try {
      // Calculate discount amounts for current form data
      const basePrice = calculateTotalPrice();
      const totalHarga = basePrice * (form.watch("jumlah_penumpang") || 1);
      const jumlahPenumpang = form.watch("jumlah_penumpang") || 1;

      // Use discountValue as discount per passenger
      const discountPerPassenger = Math.floor(discountValue);
      const totalDiscount = discountPerPassenger * jumlahPenumpang;

      // Ensure discount doesn't exceed total price
      const finalDiscount = Math.min(totalDiscount, totalHarga);

      // Calculate total after discount
      const totalAfterDiscount = Math.max(0, totalHarga - finalDiscount);

      // Only set form values if they're different to prevent re-renders
      const currentDiscountAmount = form.getValues("discount_amount");
      const currentTotalAfterDiscount = form.getValues("total_after_discount");

      if (currentDiscountAmount !== finalDiscount) {
        form.setValue("discount_amount", finalDiscount);
      }
      if (currentTotalAfterDiscount !== totalAfterDiscount) {
        form.setValue("total_after_discount", totalAfterDiscount);
      }

      // Update user discount information in database
      const { error } = await supabase
        .from("users")
        .update({
          handling_discount_kind: "AMOUNT",
          handling_discount_value: discountPerPassenger,
          handling_discount_amount: finalDiscount,
          total_after_discount: totalAfterDiscount,
          handling_discount_active: true,
          handling_discount_is_percentage: false,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating discount:", error);
        setSubmitError("Gagal menyimpan diskon");
        return;
      }

      // Update local state
      setUserDiscount({
        kind: "AMOUNT",
        value: discountPerPassenger,
        cap: userDiscount.cap,
        active: true,
      });

      setSubmitError(null);
    } catch (error) {
      console.error("Error saving discount:", error);
      setSubmitError("Terjadi kesalahan saat menyimpan diskon");
    }
  };

  const getDiscountLabel = () => {
    if (!userDiscount.active || !userDiscount.value) {
      return null;
    }

    const jumlahPenumpang = form.watch("jumlah_penumpang") || 1;
    return `Diskon ${formatCurrency(userDiscount.value)} per penumpang (${jumlahPenumpang} penumpang)`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto bg-white shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Akses Ditolak</h2>
              <p className="text-gray-600 mb-6">
                Anda harus masuk sebagai agent untuk mengakses form booking.
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/signin">
                  <Button>Masuk</Button>
                </Link>
                <Link to="/">
                  <Button variant="outline">Kembali ke Beranda</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                Pesanan Group Berhasil Dibuat!
              </h2>
              <p className="text-gray-600 mb-6">
                Terima kasih telah membuat pesanan group. Kami akan menghubungi
                Anda segera untuk konfirmasi dan koordinasi lebih lanjut.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => setSubmitSuccess(false)}>
                  Buat Pesanan Baru
                </Button>
                <Link to="/">
                  <Button variant="outline">Kembali ke Beranda</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Order Details Page
  const renderOrderDetails = () => {
    if (!formData || !bookingCode) return null;

    const totalServicePrice = calculateTotalPrice();
    const additionalBaggagePrice = calculateAdditionalBaggagePrice();
    const originalTotalAmount =
      totalServicePrice * formData.jumlah_penumpang + additionalBaggagePrice;
    // Use form.watch('total_after_discount') as the payment amount
    const totalAmount =
      form.watch("total_after_discount") ||
      calculateDiscountedPrice(originalTotalAmount);
    const selectedBank = bankTransferMethods.find(
      (bank) => bank.id.toString() === selectedBankMethod,
    );

    return (
      <Card className="shadow-lg bg-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-green-600">
            Details Pesanan
          </CardTitle>
          <CardDescription className="text-center">
            Pesanan Anda telah berhasil dibuat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Code */}
          <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Code Booking
            </h3>
            <div className="text-2xl font-bold text-green-900 font-mono">
              {bookingCode}
            </div>
            <p className="text-sm text-green-600 mt-2">
              Simpan kode booking ini untuk referensi Anda
            </p>
          </div>

          <Separator />

          {/* Order Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Ringkasan Pesanan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Nama Perusahaan
                </Label>
                <p className="text-sm font-semibold">
                  {formData.nama_perusahaan}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Nama Lengkap
                </Label>
                <p className="text-sm font-semibold">{formData.nama_lengkap}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Email
                </Label>
                <p className="text-sm font-semibold">{formData.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  No. Telepon
                </Label>
                <p className="text-sm font-semibold">{formData.no_telepon}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Jumlah Penumpang
                </Label>
                <p className="text-sm font-semibold text-blue-600">
                  {formData.jumlah_penumpang} orang
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Nomor Penerbangan
                </Label>
                <p className="text-sm font-semibold">
                  {formData.nomor_penerbangan}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Jenis Perjalanan
                </Label>
                <p className="text-sm font-semibold">
                  {formData.jenis_perjalanan
                    .map((type) => {
                      const travelType = travelTypes.find((t) => t.id === type);
                      return travelType?.label;
                    })
                    .join(", ")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Area Penjemputan
                </Label>
                <p className="text-sm font-semibold">
                  {formData.area_penjemputan}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Area Pengantaran
                </Label>
                <p className="text-sm font-semibold">
                  {formData.area_pengantaran}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Tanggal & Waktu Pickup
                </Label>
                <p className="text-sm font-semibold">
                  {formData.tanggal_pickup} - {formData.waktu_pickup}
                </p>
              </div>
              {formData.catatan_tambahan && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Catatan Tambahan
                  </Label>
                  <p className="text-sm font-semibold">
                    {formData.catatan_tambahan}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Detail Pembayaran</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Metode Pembayaran:</span>
                  <span className="font-semibold">
                    {selectedPaymentMethod === "cash"
                      ? "Cash"
                      : selectedPaymentMethod === "use_saldo"
                        ? "Gunakan Saldo"
                        : "Bank Transfer"}
                  </span>
                </div>
                {selectedPaymentMethod === "bank_transfer" && selectedBank && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Bank:</span>
                      <span className="font-semibold">{selectedBank.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">A/N:</span>
                      <span className="font-semibold">
                        {selectedBank.account_holder}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">No. Rekening:</span>
                      <span className="font-semibold font-mono">
                        {selectedBank.account_number}
                      </span>
                    </div>
                  </div>
                )}
                <Separator />
                {formData.jenis_perjalanan.map((type) => {
                  const travelType = travelTypes.find((t) => t.id === type);
                  const price = servicePrices[type];
                  return (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{travelType?.label}</span>
                      <span>{formatCurrency(price || 0)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-sm font-medium">
                  <span>Subtotal per penumpang:</span>
                  <span>{formatCurrency(totalServicePrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Jumlah penumpang:</span>
                  <span>{formData.jumlah_penumpang} orang</span>
                </div>
                {(() => {
                  const hasDiscount =
                    userDiscount.active && totalAmount < originalTotalAmount;
                  return hasDiscount ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 line-through">
                          Subtotal:
                        </span>
                        <span className="text-gray-600 line-through">
                          {formatCurrency(originalTotalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>{getDiscountLabel()}:</span>
                        <span>
                          -{formatCurrency(originalTotalAmount - totalAmount)}
                        </span>
                      </div>
                    </>
                  ) : null;
                })()}
                <Separator />
                <div
                  className={`flex justify-between text-xl font-bold ${userDiscount.active && totalAmount < originalTotalAmount ? "text-green-900" : "text-blue-900"}`}
                >
                  <span>Total Pembayaran:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                {userDiscount.active && totalAmount < originalTotalAmount && (
                  <div className="text-sm text-green-600 font-medium text-center mt-2">
                    Hemat {formatCurrency(originalTotalAmount - totalAmount)}!
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Discount Information - Only show if discount is active */}
          {userDiscount.active && totalAmount < originalTotalAmount && (
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <span className="font-semibold text-green-800">
                  🎉 Selamat! Anda mendapat {getDiscountLabel()}
                </span>
              </div>
              <p className="text-sm text-green-700">
                Anda menghemat{" "}
                {formatCurrency(originalTotalAmount - totalAmount)} dari pesanan
                ini!
              </p>
            </div>
          )}

          <Separator />

          {/* Status - Only show for bank_transfer */}
          {selectedPaymentMethod === "bank_transfer" && (
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="font-semibold text-yellow-800">
                  Status: Menunggu Konfirmasi
                </span>
              </div>
              <p className="text-sm text-yellow-700">
                Tim kami akan menghubungi Anda dalam 1x24 jam untuk konfirmasi
                pesanan
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              type="button"
              onClick={handleBackToSummary}
            >
              ← Kembali
            </Button>
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setShowOrderDetails(false);
                  setShowSummary(false);
                  setFormData(null);
                  setSelectedPaymentMethod("");
                  setSelectedBankMethod("");
                  setBookingCode("");
                  setSubmitError(null);
                }}
              >
                Buat Pesanan Baru
              </Button>
              <Link to="/">
                <Button variant="outline">Kembali ke Beranda</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render Summary and Payment Section
  const renderSummaryAndPayment = () => {
    if (!formData) return null;

    const totalServicePrice = calculateTotalPrice();
    const additionalBaggagePrice = calculateAdditionalBaggagePrice();
    const originalTotalAmount =
      totalServicePrice * formData.jumlah_penumpang + additionalBaggagePrice;
    // Use form.watch('total_after_discount') as the payment amount
    const totalAmount =
      form.watch("total_after_discount") ||
      calculateDiscountedPrice(originalTotalAmount);

    return (
      <Card className="shadow-lg bg-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Ringkasan Pesanan Group
          </CardTitle>
          <CardDescription className="text-center">
            Periksa kembali detail pesanan Anda dan pilih metode pembayaran
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {submitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Booking Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Detail Pesanan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Nama Perusahaan
                </Label>
                <p className="text-sm">{formData.nama_perusahaan}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Nama Lengkap
                </Label>
                <p className="text-sm">{formData.nama_lengkap}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Email
                </Label>
                <p className="text-sm">{formData.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  No. Telepon
                </Label>
                <p className="text-sm">{formData.no_telepon}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Jumlah Penumpang
                </Label>
                <p className="text-sm font-semibold">
                  {formData.jumlah_penumpang} orang
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Nomor Penerbangan
                </Label>
                <p className="text-sm">{formData.nomor_penerbangan}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Jenis Perjalanan
                </Label>
                <p className="text-sm">
                  {formData.jenis_perjalanan
                    .map((type) => {
                      const travelType = travelTypes.find((t) => t.id === type);
                      return travelType?.label;
                    })
                    .join(", ")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Area Penjemputan
                </Label>
                <p className="text-sm">{formData.area_penjemputan}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Area Pengantaran
                </Label>
                <p className="text-sm">{formData.area_pengantaran}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Tanggal & Waktu Pickup
                </Label>
                <p className="text-sm">
                  {formData.tanggal_pickup} - {formData.waktu_pickup}
                </p>
              </div>
              {formData.catatan_tambahan && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Catatan Tambahan
                  </Label>
                  <p className="text-sm">{formData.catatan_tambahan}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Price Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Rincian Harga</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-2">
                {formData.jenis_perjalanan.map((type) => {
                  const travelType = travelTypes.find((t) => t.id === type);
                  const price = servicePrices[type];
                  return (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{travelType?.label}</span>
                      <span>{formatCurrency(price || 0)}</span>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Subtotal per penumpang:</span>
                  <span>{formatCurrency(totalServicePrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Jumlah penumpang:</span>
                  <span>{formData.jumlah_penumpang} orang</span>
                </div>
                {(() => {
                  const hasDiscount =
                    userDiscount.active && totalAmount < originalTotalAmount;
                  return hasDiscount ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 line-through">
                          Subtotal:
                        </span>
                        <span className="text-gray-600 line-through">
                          {formatCurrency(originalTotalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>{getDiscountLabel()}:</span>
                        <span>
                          -{formatCurrency(originalTotalAmount - totalAmount)}
                        </span>
                      </div>
                    </>
                  ) : null;
                })()}
                <Separator />
                <div
                  className={`flex justify-between text-lg font-bold ${userDiscount.active && totalAmount < originalTotalAmount ? "text-green-900" : "text-blue-900"}`}
                >
                  <span>Total Pembayaran:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                {userDiscount.active && totalAmount < originalTotalAmount && (
                  <div className="text-sm text-green-600 font-medium text-center">
                    Hemat {formatCurrency(originalTotalAmount - totalAmount)}!
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Method Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Metode Pembayaran*</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/*  <div
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === "cash"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setSelectedPaymentMethod("cash")}
              >
                  <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedPaymentMethod === "cash"}
                    onChange={() => setSelectedPaymentMethod("cash")}
                  />
                  <div>
                    <Label className="text-sm font-medium">Cash</Label>
                    <p className="text-xs text-gray-500">
                      Pembayaran tunai langsung
                    </p>
                  </div> 
                </div> 
              </div>*/}

              {/*      <div
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === "bank_transfer"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => {
                  setSelectedPaymentMethod("bank_transfer");
                  if (selectedPaymentMethod !== "bank_transfer") {
                    setSelectedBankMethod("");
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Bank Transfer</Label>
                    <p className="text-xs text-gray-500">
                      Transfer ke rekening bank
                    </p>
                  </div>
                </div>
              </div> */}

              <div
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === "use_saldo"
                    ? "border-green-500 bg-green-50"
                    : userSaldo < totalAmount
                      ? "border-red-200 bg-red-50 opacity-50 cursor-not-allowed"
                      : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => {
                  if (userSaldo >= totalAmount) {
                    setSelectedPaymentMethod("use_saldo");
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedPaymentMethod === "use_saldo"}
                    disabled={userSaldo < totalAmount}
                    onChange={() => {
                      if (userSaldo >= totalAmount) {
                        setSelectedPaymentMethod("use_saldo");
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label
                      className={`text-sm font-medium ${
                        userSaldo < totalAmount ? "text-red-500" : ""
                      }`}
                    >
                      Gunakan Saldo
                    </Label>
                    <p
                      className={`text-xs ${
                        userSaldo < totalAmount
                          ? "text-red-400"
                          : "text-gray-500"
                      }`}
                    >
                      Saldo: {formatCurrency(userSaldo)}
                    </p>
                    {userSaldo < totalAmount && (
                      <p className="text-xs text-red-500 mt-1">
                        Saldo tidak mencukupi
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Selection - Only show when Bank Transfer is selected */}
            {selectedPaymentMethod === "bank_transfer" && (
              <div className="mt-4">
                <h4 className="text-md font-semibold mb-3">
                  Pilih Bank untuk Transfer:
                </h4>
                {bankTransferLoading ? (
                  <div className="flex items-center text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading bank options...
                  </div>
                ) : bankTransferMethods.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {bankTransferMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedBankMethod === method.id.toString()
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setSelectedBankMethod(method.id.toString())
                        }
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={
                              selectedBankMethod === method.id.toString()
                            }
                            onChange={() =>
                              setSelectedBankMethod(method.id.toString())
                            }
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">
                              {method.name}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              <div>A/N: {method.account_holder}</div>
                              <div>No. Rek: {method.account_number}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-red-500">
                    No bank transfer methods available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" type="button" onClick={handleBackToForm}>
              ← Kembali ke Form
            </Button>
            <Button
              onClick={handleFinalSubmit}
              disabled={
                isSubmitting ||
                !selectedPaymentMethod ||
                (selectedPaymentMethod === "bank_transfer" &&
                  !selectedBankMethod) ||
                (selectedPaymentMethod === "use_saldo" &&
                  userSaldo < totalAmount)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Memproses..." : "Konfirmasi Pesanan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4">
            <Users className="h-8 w-8 sm:h-12 sm:w-12 text-green-600 mb-2 sm:mb-0 sm:mr-2" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Handling Group
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-gray-600">
            {showSummary ? "Ringkasan & Pembayaran" : "Form Booking Group"}
          </p>
        </div>

        {showOrderDetails ? (
          renderOrderDetails()
        ) : showSummary ? (
          renderSummaryAndPayment()
        ) : (
          <Card className="shadow-lg bg-white">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Buat Pesanan Group
              </CardTitle>
              <CardDescription className="text-center">
                Lengkapi form di bawah ini untuk membuat pesanan handling umroh
                group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {submitError && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Company and Personal Information */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">
                      Informasi Perusahaan & Personal
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nama_perusahaan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Perusahaan*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nama perusahaan"
                                {...field}
                                disabled
                                className="bg-gray-50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nama_lengkap"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Lengkap*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Masukkan nama lengkap"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Masukkan email"
                                type="email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="no_telepon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>No. Telepon*</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Masukkan nomor telepon"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Group Information */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">
                      Informasi Group
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="jumlah_penumpang"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Jumlah Penumpang*</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Masukkan jumlah penumpang"
                                min={1}
                                max={200}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <p className="text-sm text-gray-500 mt-1">
                              Minimal 1 orang, maksimal 200 orang
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Flight Information */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">
                      Informasi Penerbangan
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="nomor_penerbangan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nomor Penerbangan*</FormLabel>
                            <FormControl>
                              <Input placeholder="Contoh: GA123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Travel Type */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">
                      Jenis Layanan*
                    </h3>
                    <FormField
                      control={form.control}
                      name="jenis_perjalanan"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {travelTypes.map((type) => (
                              <FormField
                                key={type.id}
                                control={form.control}
                                name="jenis_perjalanan"
                                render={({ field }) => {
                                  const price = servicePrices[type.id];
                                  return (
                                    <FormItem
                                      key={type.id}
                                      className="flex flex-col space-y-2 p-4 border rounded-lg hover:bg-gray-50"
                                    >
                                      <div className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(
                                              type.id,
                                            )}
                                            disabled={
                                              // Disable Arrival/Departure if Transit is selected
                                              (type.id !== "transit" &&
                                                field.value?.includes(
                                                  "transit",
                                                )) ||
                                              // Disable Transit if Arrival or Departure is selected
                                              (type.id === "transit" &&
                                                field.value?.some(
                                                  (t: string) =>
                                                    t === "arrival" ||
                                                    t === "departure",
                                                ))
                                            }
                                            onCheckedChange={(checked) => {
                                              handleTravelTypeChange(
                                                type.id,
                                                checked as boolean,
                                              );
                                            }}
                                          />
                                        </FormControl>
                                        <div className="space-y-1 leading-none flex-1">
                                          <FormLabel className="text-sm font-normal">
                                            {type.label}
                                          </FormLabel>
                                          {pricesLoading ? (
                                            <div className="flex items-center text-xs text-gray-500">
                                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                              Loading price...
                                            </div>
                                          ) : price ? (
                                            <div className="flex items-center text-sm font-semibold text-green-600">
                                              {formatCurrency(price)}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-red-500">
                                              Price not available
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Additional Baggage Section */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">
                      Additional Baggage
                    </h3>
                    <FormField
                      control={form.control}
                      name="additional_baggage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jumlah Bagasi Tambahan</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Masukkan jumlah bagasi tambahan"
                              min={0}
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <p className="text-sm text-gray-500 mt-1">
                            Kosongkan atau isi 0 jika tidak ada bagasi tambahan
                          </p>
                          {/* Show total price when travel type is selected */}
                          {form.watch("jenis_perjalanan")?.length > 0 &&
                            !pricesLoading && (
                              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                {(() => {
                                  const baseServicePrice =
                                    calculateTotalPrice();
                                  const jumlahPenumpang =
                                    form.watch("jumlah_penumpang") || 1;
                                  const additionalBaggage =
                                    form.watch("additional_baggage") || 0;
                                  const additionalBaggagePrice =
                                    calculateAdditionalBaggagePrice();

                                  const baseTotal =
                                    baseServicePrice * jumlahPenumpang;
                                  const totalWithBaggage =
                                    baseTotal + additionalBaggagePrice;
                                  const discountedTotal =
                                    calculateDiscountedPrice(totalWithBaggage);
                                  const hasDiscount =
                                    userDiscount.active &&
                                    discountedTotal < totalWithBaggage;

                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-blue-800">
                                          Harga per penumpang ×{" "}
                                          {jumlahPenumpang} penumpang
                                        </span>
                                        <span className="text-blue-800">
                                          {formatCurrency(baseTotal)}
                                        </span>
                                      </div>
                                      {additionalBaggage > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-blue-800">
                                            {additionalBaggage} bagasi tambahan
                                          </span>
                                          <span className="text-blue-800">
                                            {formatCurrency(
                                              additionalBaggagePrice,
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      {hasDiscount && (
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-green-600 font-medium">
                                            {getDiscountLabel()}:
                                          </span>
                                          <span className="text-green-600 font-medium">
                                            -
                                            {formatCurrency(
                                              totalWithBaggage -
                                                discountedTotal,
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between border-t pt-2">
                                        <span className="text-sm font-medium text-blue-800">
                                          Total Harga:
                                        </span>
                                        <span
                                          className={`text-lg font-bold ${hasDiscount ? "text-green-900" : "text-blue-900"}`}
                                        >
                                          {formatCurrency(
                                            hasDiscount
                                              ? discountedTotal
                                              : totalWithBaggage,
                                          )}
                                        </span>
                                      </div>
                                      {hasDiscount && (
                                        <div className="text-xs text-green-600 font-semibold text-center">
                                          Hemat{" "}
                                          {formatCurrency(
                                            totalWithBaggage - discountedTotal,
                                          )}
                                          !
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Discount Section - Only show if user has active discount */}
                  {userDiscount.active && (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold mb-4">
                        Diskon Agent
                      </h3>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">
                              Jenis Diskon
                            </Label>
                            <div className="p-2 bg-white border rounded text-sm">
                              Nominal per penumpang (Rp)
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 block">
                              Nilai Diskon
                            </Label>
                            <div className="p-2 bg-white border rounded text-sm">
                              {formatCurrency(userDiscount.value || 0)} per
                              penumpang
                            </div>
                          </div>
                        </div>

                        {/* Current Discount Display */}
                        {(() => {
                          const basePrice = calculateTotalPrice();
                          const totalHarga =
                            basePrice * (form.watch("jumlah_penumpang") || 1);
                          const jumlahPenumpang =
                            form.watch("jumlah_penumpang") || 1;

                          if (totalHarga > 0 && userDiscount.value) {
                            // Calculate discount per passenger
                            const discountPerPassenger = Math.floor(
                              userDiscount.value,
                            );
                            const totalDiscount =
                              discountPerPassenger * jumlahPenumpang;

                            // Ensure discount doesn't exceed total price
                            const finalDiscount = Math.min(
                              totalDiscount,
                              totalHarga,
                            );

                            // Calculate total after discount
                            const totalAfterDiscount = Math.max(
                              0,
                              totalHarga - finalDiscount,
                            );

                            return (
                              <div className="text-sm space-y-2">
                                <div className="flex justify-between font-bold text-green-800 border-t pt-2">
                                  <span>Total Setelah Diskon:</span>
                                  <span>
                                    {formatCurrency(totalAfterDiscount)}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}

                  {userDiscount.active && <Separator />}

                  {/* Location Information */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">
                      Informasi Lokasi
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {/* Show Pickup Location only if Arrival or Transit is selected */}
                      {(form.watch("jenis_perjalanan")?.includes("arrival") ||
                        form
                          .watch("jenis_perjalanan")
                          ?.includes("transit")) && (
                        <FormField
                          control={form.control}
                          name="area_penjemputan"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Area Lokasi Penjemputan*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih lokasi penjemputan" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {locationOptions.map((location) => (
                                    <SelectItem key={location} value={location}>
                                      {location}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Show Dropoff Location only if Departure or Transit is selected */}
                      {(form.watch("jenis_perjalanan")?.includes("departure") ||
                        form
                          .watch("jenis_perjalanan")
                          ?.includes("transit")) && (
                        <FormField
                          control={form.control}
                          name="area_pengantaran"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Area Lokasi Pengantaran*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih lokasi pengantaran" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {locationOptions.map((location) => (
                                    <SelectItem key={location} value={location}>
                                      {location}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Pickup Information */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">
                      Informasi Pickup
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tanggal_pickup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tanggal Pickup*</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="date"
                                  {...field}
                                  className="pl-10"
                                />
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="waktu_pickup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Waktu Pickup*</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="time"
                                  {...field}
                                  className="pl-10"
                                />
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Additional Notes */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">
                      Catatan Tambahan
                    </h3>
                    <FormField
                      control={form.control}
                      name="catatan_tambahan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catatan Tambahan</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Masukkan catatan tambahan untuk grup, kebutuhan khusus, dll..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
                    <Link to="/" replace className="w-full sm:w-auto">
                      <Button
                        variant="outline"
                        type="button"
                        className="w-full sm:w-auto text-sm sm:text-base"
                      >
                        ← Kembali ke Beranda
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm sm:text-base"
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isSubmitting ? "Memproses..." : "Buat Pesanan Group"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500 px-4">
          <p className="break-words">
            Butuh bantuan? Hubungi tim support kami di support@handlingumroh.com
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} Handling Umroh. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingFormGroup;
