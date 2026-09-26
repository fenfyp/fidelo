import Image from "next/image";
import Link from "next/link";

export default function PourRestaurateursPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="inline-block text-sm font-medium text-zinc-500 hover:text-black"
        >
          ← Retour à l&apos;accueil
        </Link>

        <header className="mt-8 text-center">
          <Image
            src="/logo-fidelo.png"
            alt="Fidelo"
            width={200}
            height={80}
            className="mx-auto object-contain"
            style={{ width: "auto", height: "auto" }}
            priority
          />
          <h1 className="mt-4 text-2xl font-bold text-black sm:text-3xl">
            Fidelo pour les restaurateurs
          </h1>
          <p className="mt-2 text-base text-zinc-600">
            Rejoignez une solution simple et gratuite pour fidéliser vos clients et augmenter vos ventes.
          </p>
        </header>

        <section className="mt-12 space-y-8">
          <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-black">
              Promotion organique
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Soyez listé sur la page Explorer de l&apos;application. Les consommateurs découvrent votre restaurant et peuvent rejoindre votre programme en un clic.
            </p>
          </article>

          <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-black">
              Programme de fidélité rapide et simple
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Créez votre programme en quelques minutes. Les études montrent une augmentation des ventes mensuelles de 15 à 20 % et une rétention client de 60 à 70 % avec un programme de fidélité bien conçu.
            </p>
          </article>

          <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-black">
              Annonces et notifications
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Envoyez des annonces et des notifications push à vos abonnés pour augmenter la visibilité de vos offres promotionnelles et actualités.
            </p>
          </article>

          <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-black">
              Totalement gratuit
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Aucun frais, aucun abonnement. Fidelo vous accompagne sans engagement.
            </p>
          </article>
        </section>

        <section className="mt-12 rounded-xl border-2 border-black bg-black p-6 text-center">
          <p className="text-lg font-semibold text-white">
            Prêt à rejoindre Fidelo ?
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            Créez votre compte restaurateur en quelques clics.
          </p>
          <Link
            href="/connexion/restaurateur"
            className="mt-4 inline-block rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-100"
          >
            Créer mon compte restaurateur
          </Link>
        </section>
      </div>
    </div>
  );
}
