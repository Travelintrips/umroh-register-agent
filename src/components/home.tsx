import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AgentRegistrationForm from "./AgentRegistrationForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Handling Umroh
          </h1>
          <p className="mt-3 text-xl text-gray-500">Agent Registration</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Register as an Agent</CardTitle>
            <CardDescription>
              Please fill out the form below to register your agency with our
              Handling Umroh service. All fields marked with an asterisk (*) are
              required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentRegistrationForm />
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Need help? Contact our support team at support@handlingumroh.com
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} Handling Umroh. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
