import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { supabase } from "../lib/supabase";
import { AlertCircle, Loader2, MapPin } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email({ message: "Please provide a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

type SignInFormValues = z.infer<typeof signInSchema>;

const SignInPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [showInactiveDialog, setShowInactiveDialog] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInFormValues) => {
    setIsSubmitting(true);
    setSignInError(null);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (authData.user) {
        // Check user role from metadata or users table
        let userRole = null;

        // First try to get role from user metadata
        if (authData.user.user_metadata?.role) {
          userRole = authData.user.user_metadata.role;
        } else {
          // If not in metadata, try to get from users table
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("role")
            .eq("id", authData.user.id)
            .single();

          if (!userError && userData) {
            userRole = userData.role;
          }
        }

        console.log("User role:", userRole);

        // Check if user role is allowed (only Admin and Agent)
        const allowedRoles = ["Admin", "Agent"];

        if (!userRole || !allowedRoles.includes(userRole)) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          throw new Error(
            `Access denied. Only Admin and Agent roles are allowed to sign in. Your role: ${userRole || "Unknown"}`,
          );
        }

        // Check user account status in both users and agent_users tables
        const { data: userStatusData, error: statusError } = await supabase
          .from("users")
          .select("status")
          .eq("id", authData.user.id)
          .single();

        const { data: agentStatusData, error: agentStatusError } =
          await supabase
            .from("agent_users")
            .select("status")
            .eq("id", authData.user.id)
            .single();

        // Check if account is suspended in either table
        const isUserSuspended =
          userStatusData && userStatusData.status === "suspended";
        const isAgentSuspended =
          agentStatusData && agentStatusData.status === "suspended";
        const isUserInactive =
          userStatusData && userStatusData.status === "inactive";

        if (statusError && agentStatusError) {
          console.error(
            "Error checking user status:",
            statusError,
            agentStatusError,
          );
          // Continue with sign-in if we can't check status in either table
        } else if (isUserSuspended || isAgentSuspended) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          // Show suspended account dialog
          setShowInactiveDialog(true);
          return;
        } else if (isUserInactive) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          // Show inactive account dialog
          setShowInactiveDialog(true);
          return;
        }

        // If role is valid and account is active, redirect to home page
        navigate("/");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setSignInError(
        error instanceof Error
          ? error.message
          : "An error occurred during sign in. Please try again.",
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
          <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back! Please sign in to your account.
          </p>
        </div>

        <Card className="shadow-lg bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Sign In to Your Account
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {signInError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{signInError}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your password"
                          type="password"
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
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Register here
              </Link>
            </div>
            <div className="text-sm text-center">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                ← Back to Home
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Inactive Account Dialog */}
        <Dialog open={showInactiveDialog} onOpenChange={setShowInactiveDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-red-600">
                Akun Tidak Aktif
              </DialogTitle>
              <DialogDescription className="text-center pt-4">
                Akun di Non Aktifkan, Silahkan hubungi team Travelintrips
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setShowInactiveDialog(false)}
                className="bg-green-600 hover:bg-green-700"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SignInPage;
