import { OTPForm } from "@/components/otp/otp-form";

export default async function OTPPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-xs">
        <OTPForm id={id} />
      </div>
    </div>
  );
}
