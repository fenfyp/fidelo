import AdminGuard from "./AdminGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <AdminGuard>{children}</AdminGuard>
      </div>
    </div>
  );
}
