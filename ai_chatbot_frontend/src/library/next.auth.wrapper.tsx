"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

export default function NextAuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      {children}
      <Toaster />
    </SessionProvider>
  );
}
