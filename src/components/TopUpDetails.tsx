import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, CheckCircle, Clock, Copy } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Tables } from "../types/supabase";

type TopUpRequest = Tables<"topup_requests">;

const TopUpDetails = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [topUpRequest, setTopUpRequest] = useState<TopUpRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referenceNo = searchParams.get("ref");

  useEffect(() => {
    const fetchTopUpRequest = async () => {
      if (!referenceNo) {
        navigate("/dashboard");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("topup_requests")
          .select("*")
          .eq("reference_no", referenceNo)
          .single();

        if (error) {
          console.error("Error fetching top-up request:", error);
          navigate("/dashboard");
          return;
        }

        setTopUpRequest(data);
      } catch (error) {
        console.error("Error in fetchTopUpRequest:", error);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchTopUpRequest();
  }, [referenceNo, navigate]);

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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat detail top up...</p>
        </div>
      </div>
    );
  }

  if (!topUpRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Request top up tidak ditemukan</p>
          <Button onClick={handleBackToDashboard}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                onClick={handleBackToDashboard}
                variant="ghost"
                size="sm"
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                Detail Request Top Up
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-green-800">
                  Request Top Up Berhasil Dibuat!
                </h2>
                <p className="text-green-700">
                  Request Anda akan diverifikasi oleh admin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Clock className="h-6 w-6 mr-2 text-blue-600" />
              Informasi Request
            </CardTitle>
            <CardDescription>
              Detail lengkap request top up saldo Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reference Number */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Nomor Referensi
                </label>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {topUpRequest.reference_no}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(topUpRequest.reference_no)}
                className="flex items-center"
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied ? "Tersalin!" : "Salin"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Jumlah Top Up
                </label>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(topUpRequest.amount)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <div className="mt-1">
                  <Badge variant="secondary">
                    {topUpRequest.status === "pending"
                      ? "Menunggu Verifikasi"
                      : topUpRequest.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Metode Pembayaran
                </label>
                <p className="text-sm font-medium">
                  {topUpRequest.method === "bank_transfer"
                    ? "Bank Transfer"
                    : "Paylabs"}
                </p>
                {topUpRequest.bank_name && (
                  <p className="text-sm text-gray-600">
                    {topUpRequest.bank_name}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Tanggal Request
                </label>
                <p className="text-sm">{formatDate(topUpRequest.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sender Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Informasi Pengirim</CardTitle>
            <CardDescription>
              Data rekening pengirim yang akan melakukan transfer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Nama Pemilik Rekening
                </label>
                <p className="text-sm font-medium">
                  {topUpRequest.sender_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Bank Pengirim
                </label>
                <p className="text-sm">{topUpRequest.sender_bank}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Nomor Rekening Pengirim
              </label>
              <p className="text-sm font-mono">{topUpRequest.sender_account}</p>
            </div>

            {topUpRequest.note && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Catatan Request
                </label>
                <p className="text-sm bg-gray-50 p-3 rounded-lg">
                  {topUpRequest.note}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Information */}
        {topUpRequest.method === "bank_transfer" &&
          topUpRequest.destination_account && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Informasi Transfer</CardTitle>
                <CardDescription>
                  Silakan transfer ke rekening berikut
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-blue-700">
                        Bank Tujuan
                      </label>
                      <p className="text-lg font-semibold text-blue-900">
                        {topUpRequest.bank_name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-blue-700">
                        Nomor Rekening
                      </label>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-mono font-semibold text-blue-900">
                          {topUpRequest.destination_account}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              topUpRequest.destination_account || "",
                            )
                          }
                          className="ml-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Petunjuk Transfer:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Transfer sesuai dengan jumlah yang tertera</li>
                    <li>Gunakan nomor referensi sebagai berita transfer</li>
                    <li>Simpan bukti transfer untuk verifikasi</li>
                    <li>Admin akan memverifikasi dalam 1x24 jam</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleBackToDashboard}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Dashboard
          </Button>
          <Button
            onClick={() => copyToClipboard(topUpRequest.reference_no)}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Copy className="h-4 w-4 mr-2" />
            Salin Nomor Referensi
          </Button>
        </div>
      </main>
    </div>
  );
};

export default TopUpDetails;
