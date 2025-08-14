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
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import {
  LogIn,
  LogOut,
  UserPlus,
  MapPin,
  Star,
  Users,
  Calendar,
} from "lucide-react";

const UmrohHomePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  const handleSignInClick = () => {
    navigate("/signin");
  };

  const handleBookingClick = () => {
    navigate("/booking");
  };

  const handleDashboardClick = () => {
    navigate("/dashboard");
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-green-600 mr-2" />
              <h1 className="text-sm sm:text-xl md:text-2xl font-bold text-gray-900">
                Layanan Handling Bandara
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Welcome, {user.user_metadata?.full_name || user.email}
                  </span>

                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSignInClick}
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                  <Button
                    onClick={handleRegisterClick}
                    size="sm"
                    className="flex items-center bg-green-600 hover:bg-green-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {user && (
            <div className="flex justify-center gap-6 mt-12">
              <div
                onClick={handleBookingClick}
                className="group relative bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl p-8 w-72 h-40 flex flex-col items-center justify-center cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-white opacity-10 rounded-xl group-hover:opacity-20 transition-opacity"></div>
                <Calendar className="h-8 w-8 text-white mb-3" />
                <span className="text-white text-2xl font-bold mb-1">
                  Booking
                </span>
                <span className="text-green-100 text-sm text-center">
                  Pesan layanan handling bandara Anda
                </span>
              </div>
              <div
                onClick={handleDashboardClick}
                className="group relative bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl p-8 w-72 h-40 flex flex-col items-center justify-center cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <div className="absolute inset-0 bg-white opacity-10 rounded-xl group-hover:opacity-20 transition-opacity"></div>
                <Users className="h-8 w-8 text-white mb-3" />
                <span className="text-white text-2xl font-bold mb-1">
                  Dashboard
                </span>
                <span className="text-blue-100 text-sm text-center">
                  Kelola akun & pesanan
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Mengapa Memilih Handling Layanan Handling Bandara?
            </h3>
            <p className="text-lg text-gray-600">
              Kami berkomitmen memberikan pelayanan terbaik untuk layanan
              handling bandara Anda
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">Pelayanan Premium</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Layanan 24/7 dengan tim berpengalaman yang siap membantu
                  layanan handling bandara Anda dari awal hingga akhir.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Lokasi Strategis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Lokasi strategis di berbagai terminal bandara untuk kemudahan
                  akses dan layanan.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-xl">
                  Pembimbing Berpengalaman
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Tim handling yang berpengalaman dan berlisensi resmi untuk
                  memandu layanan handling bandara Anda.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-green-600">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Siap Memulai Layanan Handling Bandara Anda?
          </h3>
          <p className="text-xl text-green-100 mb-8">
            Bergabunglah dengan kami sebagai agent dan dapatkan komisi menarik
            untuk setiap klien yang Anda bawa.
          </p>
          {!user && (
            <Button
              onClick={handleRegisterClick}
              size="lg"
              variant="secondary"
              className="bg-white text-green-600 hover:bg-gray-100 text-lg px-8 py-3"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Daftar Sebagai Agent
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <MapPin className="h-8 w-8 text-green-400 mr-2" />
                <h4 className="text-2xl font-bold">Layanan Handling Bandara</h4>
              </div>
              <p className="text-gray-400 mb-4">
                Menyediakan layanan handling bandara terpercaya dengan
                pengalaman lebih dari 10 tahun dalam industri layanan bandara.
              </p>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Layanan</h5>
              <ul className="space-y-2 text-gray-400">
                <li>Layanan Handling Regular</li>
                <li>Layanan Handling Plus</li>
                <li>Layanan Handling Keluarga</li>
                <li>Layanan Handling Grup</li>
              </ul>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Kontak</h5>
              <ul className="space-y-2 text-gray-400">
                <li>Email: info@handlingbandara.com</li>
                <li>Telepon: +62 21 1234 5678</li>
                <li>WhatsApp: +62 812 3456 7890</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>
              © {new Date().getFullYear()} Layanan Handling Bandara. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UmrohHomePage;
