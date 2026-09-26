"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M3.958 3.958a9.962 9.962 0 012.167-2.167m12.75 12.75a9.962 9.962 0 01-2.167 2.167" />
    </svg>
  );
}

function getAuthErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message: string }).message;
    if (msg.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
    if (msg.includes("User already registered") || msg.includes("already been registered")) return "Un compte existe déjà avec cet email.";
    if (msg.includes("Password should be at least 6 characters")) return "Le mot de passe doit faire au moins 6 caractères.";
    if (msg.includes("Email not confirmed")) return "Veuillez confirmer votre email.";
    if (msg.includes("invalid") && msg.includes("email")) return "Email invalide.";
    return msg;
  }
  return "Une erreur est survenue.";
}

export default function ConnexionRestaurateurPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.push("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "restaurateur" } },
      });
      if (authError) throw authError;
      if (data.user && !data.session) {
        setError("Consultez votre boîte mail pour confirmer votre compte avant de vous connecter.");
        setMode("login");
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
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
            {mode === "login"
              ? "Connexion restaurateur"
              : "Créer un compte restaurateur"}
          </h1>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          {mode === "login" ? (
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                      aria-label={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      <EyeIcon open={!showLoginPassword} />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </button>
              </form>
              <p className="text-center text-sm text-neutral-600">
                Pas encore de compte ?{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMode("signup");
                    setError(null);
                  }}
                  className="font-medium text-black underline hover:no-underline"
                >
                  Créer un compte
                </button>
              </p>
            </>
          ) : (
            <>
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="signup-email"
                    className="mb-1 block text-sm font-medium text-neutral-700"
                  >
                    Email
                  </label>
                  <input
                    id="signup-email"
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
                    htmlFor="signup-password"
                    className="mb-1 block text-sm font-medium text-neutral-700"
                  >
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      name="password"
                      type={showSignupPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                      aria-label={showSignupPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      <EyeIcon open={!showSignupPassword} />
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1 block text-sm font-medium text-neutral-700"
                  >
                    Confirmer mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showSignupConfirm ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirm((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                      aria-label={showSignupConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      <EyeIcon open={!showSignupConfirm} />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading ? "Création..." : "Créer mon compte"}
                </button>
              </form>
              <p className="text-center text-sm text-neutral-600">
                Déjà un compte ?{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMode("login");
                    setError(null);
                  }}
                  className="font-medium text-black underline hover:no-underline"
                >
                  Se connecter
                </button>
              </p>
            </>
          )}
          <p className="border-t border-neutral-200 pt-6 text-center text-sm text-neutral-600">
            Vous êtes un consommateur ?{" "}
            <Link
              href="/connexion/consommateur"
              className="font-medium text-black underline hover:no-underline"
            >
              Connexion consommateur
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
