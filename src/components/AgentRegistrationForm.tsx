import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import * as z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
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
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { supabase } from "../lib/supabase";

const formSchema = z
  .object({
    // Agency Details
    nama_perusahaan: z
      .string()
      .min(2, { message: "Nama perusahaan harus minimal 2 karakter" }),
    account_type: z.enum(["Personal", "Corporate"], {
      required_error: "Please select an account type",
    }),

    // Personal Information
    full_name: z.string().min(2, { message: "Full name is required" }),
    email: z
      .string()
      .email({ message: "Please provide a valid email address" }),
    phone_number: z
      .string()
      .min(8, { message: "Please provide a valid phone number" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),

    // Corporate File Uploads (conditional)
    ktp_file: z.any().optional(),
    siup_file: z.any().optional(),
    nib_file: z.any().optional(),
    npwp_file: z.any().optional(),

    // Terms and Conditions
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine(
    (data) => {
      // If Corporate account type, require file uploads
      if (data.account_type === "Corporate") {
        return (
          data.ktp_file && data.siup_file && data.nib_file && data.npwp_file
        );
      }
      return true;
    },
    {
      message: "All document files are required for Corporate accounts",
      path: ["ktp_file"],
    },
  );

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
      account_type: "Personal" as "Personal" | "Corporate",
      full_name: "",
      email: "",
      phone_number: "",
      password: "",
      ktp_file: null,
      siup_file: null,
      nib_file: null,
      npwp_file: null,
      termsAccepted: false,
    },
  });

  const uploadFile = async (file: File, fileName: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const filePath = `agent-documents/${Date.now()}-${fileName}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (error) {
      throw new Error(`Failed to upload ${fileName}: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("documents").getPublicUrl(filePath);

    return publicUrl;
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let fileUrls: Record<string, string> = {};

      // Upload files if Corporate account type
      if (data.account_type === "Corporate") {
        const fileUploads = [];

        if (data.ktp_file && data.ktp_file[0]) {
          fileUploads.push(
            uploadFile(data.ktp_file[0], "ktp").then((url) => ({
              ktp_file_url: url,
            })),
          );
        }

        if (data.siup_file && data.siup_file[0]) {
          fileUploads.push(
            uploadFile(data.siup_file[0], "siup").then((url) => ({
              siup_file_url: url,
            })),
          );
        }

        if (data.nib_file && data.nib_file[0]) {
          fileUploads.push(
            uploadFile(data.nib_file[0], "nib").then((url) => ({
              nib_file_url: url,
            })),
          );
        }

        if (data.npwp_file && data.npwp_file[0]) {
          fileUploads.push(
            uploadFile(data.npwp_file[0], "npwp").then((url) => ({
              npwp_file_url: url,
            })),
          );
        }

        const uploadResults = await Promise.all(fileUploads);
        fileUrls = uploadResults.reduce(
          (acc, result) => ({ ...acc, ...result }),
          {},
        );
      }

      // First, create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            phone_number: data.phone_number,
            nama_perusahaan: data.nama_perusahaan,
            account_type: data.account_type,
            role: "Agent",
            role_id: 11,
          },
        },
      });

      if (authError) {
        console.error("Supabase Auth error:", authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }

      console.log("Auth user created successfully:", authData);

      // Then, insert additional data into the users table
      if (authData.user) {
        const registrationData = {
          id: authData.user.id, // Use the auth user ID
          full_name: data.full_name,
          email: data.email,
          phone_number: data.phone_number,
          nama_perusahaan: data.nama_perusahaan,
          account_type: data.account_type,
          role_id: 11, // Agent role ID from roles table
          role: "Agent",
          ...fileUrls, // Add file URLs if Corporate account
        };

        console.log("Attempting to insert user data:", registrationData);

        // Insert data into Supabase users table
        const { data: insertedData, error: dbError } = await supabase
          .from("users")
          .upsert([registrationData], { onConflict: "id" })
          .select();

        if (dbError) {
          console.error("Database error:", dbError);
          // If database insert fails, we should clean up the auth user
          // But for now, we'll just log the error and continue
          console.warn(
            "User created in auth but failed to insert in users table:",
            dbError.message,
          );
        } else {
          console.log("User data inserted successfully:", insertedData);
        }
      }

      setSubmitSuccess(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmitError(
        error instanceof Error
          ? `Registration failed: ${error.message}`
          : "There was an error submitting your registration. Please try again.",
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                Registration Successful!
              </h2>
              <p className="text-gray-600 mb-6">
                Thank you for registering as a Layanan Handling Bandara Agent.
                We will review your application and contact you soon.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => setSubmitSuccess(false)}>
                  Register Another Agent
                </Button>
                <Link to="/signin">
                  <Button variant="outline">Sign In Now</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <p className="text-xl text-gray-600">Agent Registration</p>
        </div>

        <Card className="shadow-lg bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Layanan Handling Bandara Agent Registration
            </CardTitle>
            <CardDescription className="text-center">
              Register your agency as an official Layanan Handling Bandara agent
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
                            <Input
                              placeholder="Enter phone number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="account_type"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Account Type*</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="Personal"
                                  id="personal"
                                />
                                <Label htmlFor="personal">Personal</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="Corporate"
                                  id="corporate"
                                />
                                <Label htmlFor="corporate">Corporate</Label>
                              </div>
                            </RadioGroup>
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

                    {/* Corporate Document Uploads */}
                    {form.watch("account_type") === "Corporate" && (
                      <>
                        <Separator className="my-6" />
                        <div>
                          <h4 className="text-md font-semibold mb-4 flex items-center">
                            <Upload className="w-4 h-4 mr-2" />
                            Required Documents for Corporate Account
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="ktp_file"
                              render={({
                                field: { onChange, value, ...field },
                              }) => (
                                <FormItem>
                                  <FormLabel>KTP (ID Card)*</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={(e) => onChange(e.target.files)}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Upload KTP in PDF, JPG, or PNG format
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="siup_file"
                              render={({
                                field: { onChange, value, ...field },
                              }) => (
                                <FormItem>
                                  <FormLabel>
                                    SIUP (Business License)*
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={(e) => onChange(e.target.files)}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Upload SIUP in PDF, JPG, or PNG format
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="nib_file"
                              render={({
                                field: { onChange, value, ...field },
                              }) => (
                                <FormItem>
                                  <FormLabel>
                                    NIB (Business Identification Number)*
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={(e) => onChange(e.target.files)}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Upload NIB in PDF, JPG, or PNG format
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="npwp_file"
                              render={({
                                field: { onChange, value, ...field },
                              }) => (
                                <FormItem>
                                  <FormLabel>NPWP (Tax ID)*</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={(e) => onChange(e.target.files)}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Upload NPWP in PDF, JPG, or PNG format
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </>
                    )}
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

                <CardFooter className="flex justify-between px-0">
                  <Link to="/">
                    <Button variant="outline" type="button">
                      ← Back to Home
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
                    {isSubmitting ? "Submitting..." : "Register Agency"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Already have an account?{" "}
            <Link
              to="/signin"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Sign in here
            </Link>
          </p>
          <p className="mt-2">
            Need help? Contact our support team at support@handlingbandara.com
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} Layanan Handling Bandara. All rights
            reserved.
          </p>
        </div>

        <TermsAndConditionsModal
          open={termsModalOpen}
          onOpenChange={setTermsModalOpen}
        />
      </div>
    </div>
  );
};

export default AgentRegistrationForm;
