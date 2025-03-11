import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAllowedSections } from "@/lib/check-employee";

export default async function SettingsPage() {
  const session: { user?: { permissions?: string[] } } | null = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/auth");
  }

  const allowedSections = getAllowedSections(session.user?.permissions);
  
  if (!allowedSections.includes("settings")) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">إعدادات النظام</h1>
      {/* محتوى صفحة الإعدادات */}
    </div>
  );
}
