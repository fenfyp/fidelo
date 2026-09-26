"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";

function getAuthErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message: string }).message;
    if (msg.includes("Email not confirmed")) return "Veuillez confirmer votre email.";
    if (msg.includes("Invalid login")) return "Email ou mot de passe incorrect.";
    if (msg.includes("signup_disabled")) return "Les inscriptions sont désactivées.";
    return msg;
  }
  return "Une erreur est survenue.";
}

function ConnexionConsommateurContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/client/cartes";

  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = isSignUp ? (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.value : undefined;

    if (!email || !password) return;
    if (isSignUp && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (isSignUp && password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoadingEmail(true);
    try {
      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        setError(null);
        router.push(redirectTo.startsWith("/") ? redirectTo : "/client/cartes");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.push(redirectTo.startsWith("/") ? redirectTo : "/client/cartes");
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoadingEmail(false);
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    setLoadingGoogle(true);
    try {
      const next = redirectTo.startsWith("/") ? redirectTo : "/client/cartes";
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (authError) {
        setError(getAuthErrorMessage(authError));
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoadingGoogle(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <main className="w-full max-w-sm space-y-8">
        <Link
          href="/"
          className="inline-flex items-center justify-center self-center"
        >
          <Image
            src="/logo-fidelo.png"
            alt="Fidelo"
            width={160}
            height={64}
            className="object-contain"
            style={{ width: "auto", height: "auto" }}
          />
        </Link>
        <div className="space-y-6">
          <h1 className="text-center text-xl font-semibold text-black">
            Connexion consommateur
          </h1>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@exemple.com"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder={isSignUp ? "Au moins 6 caractères" : "••••••••"}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            {isSignUp && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loadingEmail}
              className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              {loadingEmail
                ? isSignUp
                  ? "Création..."
                  : "Connexion..."
                : isSignUp
                  ? "Créer un compte"
                  : "Se connecter"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => { setIsSignUp((v) => !v); setError(null); }}
            className="w-full text-center text-sm text-neutral-600 underline hover:no-underline"
          >
            {isSignUp ? "Déjà un compte ? Se connecter" : "Créer un compte avec email et mot de passe"}
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-neutral-500">
                ou continuer avec
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loadingGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loadingGoogle ? "Connexion..." : "Google"}
          </button>
          <p className="border-t border-neutral-200 pt-6 text-center text-sm text-neutral-600">
            Vous êtes un restaurateur ?{" "}
            <Link
              href="/connexion/restaurateur"
              className="font-medium text-black underline hover:no-underline"
            >
              Connexion restaurateur
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function ConnexionConsommateurPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="text-sm text-neutral-500">Chargement...</div>
      </div>
    }>
      <ConnexionConsommateurContent />
    </Suspense>
  );
}
