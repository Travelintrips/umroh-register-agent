import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Alert, AlertDescription } from "./ui/alert";
import { supabase } from "../lib/supabase";
import { AlertCircle, CheckCircle, Loader2, MapPin } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email({ message: "Silakan masukkan alamat email yang valid" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccess(true);
      form.reset();
    } catch (error) {
      console.error("Reset password error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengirim email reset password. Silakan coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <MapPin className="h-12 w-12 text-green-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">
              Handling Airport
            </h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Masukkan email Anda untuk menerima link reset password.
          </p>
        </div>

        <Card className="shadow-lg bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Lupa Password?
            </CardTitle>
            <CardDescription className="text-center">
              Kami akan mengirimkan link reset password ke email Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Link reset password telah dikirim ke email Anda. Silakan
                  periksa inbox dan ikuti instruksi untuk mereset password.
                </AlertDescription>
              </Alert>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alamat Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Masukkan email Anda"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isSubmitting ? "Mengirim..." : "Kirim Link Reset Password"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-gray-600">
              Sudah ingat password?{" "}
              <Link
                to="/signin"
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Kembali ke Sign In
              </Link>
            </div>
            <div className="text-sm text-center">
              <div className="text-gray-700 font-medium mb-2">
                Forgot Password
              </div>
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                ← Kembali ke Home
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
