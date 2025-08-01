import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Separator } from "./ui/separator";
import TermsAndConditionsModal from "./TermsAndConditionsModal";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

const formSchema = z.object({
  // Agency Details
  nama_perusahaan: z
    .string()
    .min(2, { message: "Nama perusahaan harus minimal 2 karakter" }),

  // Personal Information
  full_name: z.string().min(2, { message: "Full name is required" }),
  email: z.string().email({ message: "Please provide a valid email address" }),
  phone_number: z
    .string()
    .min(8, { message: "Please provide a valid phone number" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),

  // Terms and Conditions
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
});

type FormValues = z.infer<typeof formSchema>;

const AgentRegistrationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_perusahaan: "",
      full_name: "",
      email: "",
      phone_number: "",
      password: "",
      termsAccepted: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Simulate API call with timeout
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // For demonstration purposes, log the form data with Agent role
      const registrationData = {
        ...data,
        role_id: 11, // Agent role ID from roles table
        role: "Agent",
      };
      console.log("Form submitted successfully:", registrationData);

      setSubmitSuccess(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmitError(
        "There was an error submitting your registration. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTermsModal = () => {
    setTermsModalOpen(true);
  };

  if (submitSuccess) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-white">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              Registration Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for registering as a Handling Umroh Agent. We will
              review your application and contact you soon.
            </p>
            <Button onClick={() => setSubmitSuccess(false)}>
              Register Another Agent
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Handling Umroh Agent Registration
          </CardTitle>
          <CardDescription className="text-center">
            Register your travel agency as an official Handling Umroh agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {submitError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Agency Details Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Agency Details</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nama_perusahaan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Perusahaan*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Masukkan nama perusahaan"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number*</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Personal Information Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Personal Information
                </h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter email address"
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
                          <FormLabel>Password*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter password"
                              type="password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Terms and Conditions */}
              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I accept the{" "}
                        <button
                          type="button"
                          onClick={openTermsModal}
                          className="text-primary underline hover:text-primary/80 focus:outline-none"
                        >
                          terms and conditions
                        </button>
                        *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <CardFooter className="flex justify-end px-0">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Submitting..." : "Register Agency"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      <TermsAndConditionsModal
        open={termsModalOpen}
        onOpenChange={setTermsModalOpen}
      />
    </div>
  );
};

export default AgentRegistrationForm;
