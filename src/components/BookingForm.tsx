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
} from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

const formSchema = z.object({
  nama_perusahaan: z.string().min(1, { message: "Nama perusahaan diperlukan" }),
  nama_lengkap: z
    .string()
    .min(2, { message: "Nama lengkap harus minimal 2 karakter" }),
  email: z.string().email({ message: "Masukkan alamat email yang valid" }),
  no_telepon: z
    .string()
    .min(8, { message: "Masukkan nomor telepon yang valid" }),
  nomor_penerbangan: z
    .string()
    .min(2, { message: "Nomor penerbangan diperlukan" }),
  jenis_perjalanan: z
    .array(z.string())
    .min(1, { message: "Pilih minimal satu jenis perjalanan" }),
  area_penjemputan: z
    .string()
    .min(1, { message: "Pilih area lokasi penjemputan" }),
  area_pengantaran: z
    .string()
    .min(1, { message: "Pilih area lokasi pengantaran" }),
  tanggal_pickup: z.string().min(1, { message: "Tanggal pickup diperlukan" }),
  waktu_pickup: z.string().min(1, { message: "Waktu pickup diperlukan" }),
  catatan_tambahan: z.string().optional(),
});

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
  { id: "arrival", label: "Arrival" },
  { id: "departure", label: "Departure" },
  { id: "transit", label: "Transit" },
];

const BookingForm = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSaldo, setUserSaldo] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [showSummary, setShowSummary] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_perusahaan: "",
      nama_lengkap: "",
      email: "",
      no_telepon: "",
      nomor_penerbangan: "",
      jenis_perjalanan: [],
      area_penjemputan: "",
      area_pengantaran: "",
      tanggal_pickup: "",
      waktu_pickup: "",
      catatan_tambahan: "",
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

          // Fetch user profile from users table
          const { data: profile, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Error fetching user profile:", error);
          } else {
            setUserProfile(profile);
            setUserSaldo(profile.saldo || 0);
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

    fetchUserData();
  }, [form]);

  const onSubmit = async (data: FormValues) => {
    setFormData(data);
    setShowSummary(true);
  };

  const handleFinalSubmit = async () => {
    if (!formData || !selectedPaymentMethod) {
      setSubmitError("Silakan pilih metode pembayaran");
      return;
    }

    // Calculate total price (for agent booking, assume a fixed price per service)
    const totalPrice = 25000; // Updated price for agent booking

    if (selectedPaymentMethod === "use_saldo" && userSaldo < totalPrice) {
      setSubmitError(
        `Saldo tidak mencukupi. Saldo Anda: ${formatCurrency(userSaldo)}, Total pembayaran: ${formatCurrency(totalPrice)}`,
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // If using saldo, deduct from user balance
      if (selectedPaymentMethod === "use_saldo") {
        const newSaldo = userSaldo - totalPrice;
        const { error: saldoError } = await supabase
          .from("users")
          .update({ saldo: newSaldo })
          .eq("id", user?.id);

        if (saldoError) {
          throw new Error(`Gagal memotong saldo: ${saldoError.message}`);
        }

        // Create transaction history record
        const bookingCode = `HSA-AGENT-${Date.now()}`;
        const { error: historyError } = await supabase
          .from("histori_transaksi")
          .insert({
            user_id: user?.id,
            kode_booking: bookingCode,
            nominal: -totalPrice,
            saldo_akhir: newSaldo,
            keterangan: `Pembayaran booking agent ${bookingCode}`,
            trans_date: new Date().toISOString(),
          });

        if (historyError) {
          console.error("Error creating transaction history:", historyError);
        }

        setUserSaldo(newSaldo);
      }

      console.log("Booking data:", formData);
      setSubmitSuccess(true);
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
    setSubmitError(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleTravelTypeChange = (travelTypeId: string, checked: boolean) => {
    const currentTypes = form.getValues("jenis_perjalanan");
    if (checked) {
      form.setValue("jenis_perjalanan", [...currentTypes, travelTypeId]);
    } else {
      form.setValue(
        "jenis_perjalanan",
        currentTypes.filter((type) => type !== travelTypeId),
      );
    }
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
                Pesanan Berhasil Dibuat!
              </h2>
              <p className="text-gray-600 mb-6">
                Terima kasih telah membuat pesanan. Kami akan menghubungi Anda
                segera untuk konfirmasi.
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

  // Render Summary and Payment Section
  const renderSummaryAndPayment = () => {
    if (!formData) return null;

    const totalPrice = 25000; // Updated price for agent booking

    return (
      <Card className="shadow-lg bg-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Ringkasan Pesanan Agent
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
            </div>
          </div>

          <Separator />

          {/* Price Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Rincian Harga</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold text-blue-900">
                  <span>Total Pembayaran:</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Method Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Metode Pembayaran*</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
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
              </div>

              <div
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === "bank_transfer"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setSelectedPaymentMethod("bank_transfer")}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Bank Transfer</Label>
                    <p className="text-xs text-gray-500">
                      Transfer ke rekening bank
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === "use_saldo"
                    ? "border-green-500 bg-green-50"
                    : userSaldo < totalPrice
                      ? "border-red-200 bg-red-50 opacity-50 cursor-not-allowed"
                      : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => {
                  if (userSaldo >= totalPrice) {
                    setSelectedPaymentMethod("use_saldo");
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectedPaymentMethod === "use_saldo"}
                    disabled={userSaldo < totalPrice}
                    onChange={() => {
                      if (userSaldo >= totalPrice) {
                        setSelectedPaymentMethod("use_saldo");
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label
                      className={`text-sm font-medium ${
                        userSaldo < totalPrice ? "text-red-500" : ""
                      }`}
                    >
                      Gunakan Saldo
                    </Label>
                    <p
                      className={`text-xs ${
                        userSaldo < totalPrice
                          ? "text-red-400"
                          : "text-gray-500"
                      }`}
                    >
                      Saldo: {formatCurrency(userSaldo)}
                    </p>
                    {userSaldo < totalPrice && (
                      <p className="text-xs text-red-500 mt-1">
                        Saldo tidak mencukupi
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
                (selectedPaymentMethod === "use_saldo" &&
                  userSaldo < totalPrice)
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <MapPin className="h-12 w-12 text-green-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">
              Layanan Handling Bandara
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            {showSummary ? "Ringkasan & Pembayaran" : "Form Booking Agent"}
          </p>
        </div>

        {showSummary ? (
          renderSummaryAndPayment()
        ) : (
          <Card className="shadow-lg bg-white">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Buat Pesanan Baru
              </CardTitle>
              <CardDescription className="text-center">
                Lengkapi form di bawah ini untuk membuat pesanan layanan
                handling bandara
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
                    <h3 className="text-lg font-semibold mb-4">
                      Informasi Perusahaan & Personal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  {/* Flight Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Informasi Penerbangan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <h3 className="text-lg font-semibold mb-4">
                      Jenis Perjalanan*
                    </h3>
                    <FormField
                      control={form.control}
                      name="jenis_perjalanan"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {travelTypes.map((type) => (
                              <FormField
                                key={type.id}
                                control={form.control}
                                name="jenis_perjalanan"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={type.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(
                                            type.id,
                                          )}
                                          onCheckedChange={(checked) => {
                                            handleTravelTypeChange(
                                              type.id,
                                              checked as boolean,
                                            );
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-normal">
                                          {type.label}
                                        </FormLabel>
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

                  {/* Location Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Informasi Lokasi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                  </div>

                  <Separator />

                  {/* Pickup Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Informasi Pickup
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <h3 className="text-lg font-semibold mb-4">
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
                              placeholder="Masukkan catatan tambahan jika ada..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between pt-6">
                    <Link to="/">
                      <Button variant="outline" type="button">
                        ← Kembali ke Beranda
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isSubmitting ? "Memproses..." : "Buat Pesanan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Butuh bantuan? Hubungi tim support kami di
            support@handlingbandara.com
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} Layanan Handling Bandara. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;
