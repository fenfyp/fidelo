import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <main className="w-full max-w-lg space-y-10 text-center">
        <div className="flex flex-col items-center space-y-1">
          <Image
            src="/logo-fidelo.png"
            alt="Fidelo"
            width={200}
            height={80}
            className="object-contain"
            style={{ width: "auto", height: "auto" }}
            priority
          />
          <p className="text-[15px] leading-relaxed text-neutral-600">
            Votre programme de fidélité à portée de main.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/connexion/restaurateur"
            className="rounded-md border border-neutral-200 bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Restaurateur
          </Link>
          <Link
            href="/connexion/consommateur"
            className="rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
          >
            Consommateur
          </Link>
        </div>
      </main>
    </div>
  );
}
