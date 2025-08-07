import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { MapPin, User, Users } from "lucide-react";

const BookingSelection = () => {
  const navigate = useNavigate();

  const handlePersonalBooking = () => {
    navigate("/booking/personal");
  };

  const handleGroupBooking = () => {
    navigate("/booking/group");
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
          <p className="text-xl text-gray-600">Pilih Jenis Booking</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-8 max-w-2xl mx-auto">
          {/* Group Booking Card */}
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer bg-white"
            onClick={handleGroupBooking}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Layanan Handling Bandara Group
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Booking untuk rombongan atau grup besar
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-gray-600 mb-6 space-y-2">
                <li>• Cocok untuk 6+ orang</li>
                <li>• Harga grup lebih ekonomis</li>
                <li>• Koordinasi terpusat</li>
                <li>• Fasilitas grup khusus</li>
              </ul>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleGroupBooking}
              >
                Pilih Group Booking
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Link to="/">
            <Button variant="outline">← Kembali ke Beranda</Button>
          </Link>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Butuh bantuan? Hubungi tim support kami di support@handlinglayanan
            handling bandara.com
          </p>
          <p>
            © {new Date().getFullYear()} Layanan Handling Bandara. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingSelection;
