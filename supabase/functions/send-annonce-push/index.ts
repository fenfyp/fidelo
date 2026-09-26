// Edge Function : envoi des notifications push FCM aux abonnés d'un restaurateur
// après création d'une annonce. Utilise le compte de service Firebase (secret FIREBASE_SERVICE_ACCOUNT_JSON).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Annonce {
  id: string;
  restaurateur_id: string;
  titre: string;
  description: string;
}

interface FcmTokenRow {
  token: string;
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };
  const key = await jose.importPKCS8(privateKey.replace(/\\n/g, "\n"), "RS256");
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth2 failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function sendFcm(
  projectId: string,
  accessToken: string,
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ success: number; failed: number }> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  let success = 0;
  let failed = 0;
  for (const token of tokens) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
          webpush: {
            fcm_options: { link: "/client/annonces" },
          },
        },
      }),
    });
    if (res.ok) success++;
    else failed++;
  }
  return { success, failed };
}

Deno.serve(async (req) => {
  // #region agent log
  console.log('[DEBUG-START] Fonction Edge appelée:', {method:req.method,url:req.url,hasHeaders:!!req.headers});
  // #endregion
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // #region agent log
    console.log('[DEBUG-TRY] Début du try block');
    // #endregion
    
    // Récupérer le token d'authentification depuis les headers
    const authHeader = req.headers.get("Authorization");
    // #region agent log
    console.log('[DEBUG-E] Header Authorization reçu:', {hasAuthHeader:!!authHeader,authHeaderPrefix:authHeader?.substring(0,30)||"none"});
    // #endregion
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // #region agent log
      console.log('[DEBUG-F] Header Authorization manquant ou invalide');
      // #endregion
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");

    // Créer un client Supabase pour vérifier l'authentification
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Vérifier que l'utilisateur est authentifié en passant le token directement à getUser()
    // #region agent log
    console.log('[DEBUG-G] Avant getUser(token):', {hasSupabaseUrl:!!Deno.env.get("SUPABASE_URL"),hasAnonKey:!!Deno.env.get("SUPABASE_ANON_KEY"),tokenLength:token.length});
    // #endregion
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    // #region agent log
    console.log('[DEBUG-H] Après getUser(token):', {hasUser:!!user,userId:user?.id,hasAuthError:!!authError,authErrorCode:authError?.status,authErrorMessage:authError?.message});
    // #endregion
    if (authError || !user) {
      // #region agent log
      console.log('[DEBUG-I] getUser(token) a échoué:', {authError:authError?.message||"none",hasUser:!!user});
      // #endregion
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token", detail: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!saJson) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT_JSON not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const sa = JSON.parse(saJson) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    const projectId = sa.project_id;
    const clientEmail = sa.client_email;
    const privateKey = sa.private_key;

    // #region agent log
    console.log('[DEBUG-J] Avant parsing body');
    // #endregion
    const body = await req.json().catch((e) => {
      // #region agent log
      console.log('[DEBUG-K] Erreur parsing body:', e);
      // #endregion
      return {};
    }) as { annonce_id?: string | number };
    // #region agent log
    console.log('[DEBUG-L] Body parsé:', {body,hasAnnonceId:!!body.annonce_id,annonceIdType:typeof body.annonce_id});
    // #endregion
    const annonceId = body.annonce_id;
    // Accepter string ou number, convertir en string pour l'utilisation
    if (!annonceId || (typeof annonceId !== "string" && typeof annonceId !== "number")) {
      // #region agent log
      console.log('[DEBUG-M] annonce_id manquant ou invalide:', {annonceId,type:typeof annonceId});
      // #endregion
      return new Response(
        JSON.stringify({ error: "annonce_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const annonceIdString = String(annonceId);

    // Créer un client avec service_role pour les opérations admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: annonce, error: annonceError } = await supabase
      .from("annonces")
      .select("id, restaurateur_id, titre, description")
      .eq("id", annonceIdString)
      .single();

    if (annonceError || !annonce) {
      return new Response(
        JSON.stringify({ error: "Annonce not found", detail: annonceError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'utilisateur est bien le propriétaire de l'annonce
    if (annonce.restaurateur_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You don't own this announcement" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: cartes } = await supabase
      .from("cartes")
      .select("consommateur_id")
      .eq("restaurateur_id", (annonce as Annonce).restaurateur_id);
    const consommateurIds = [...new Set((cartes ?? []).map((c: { consommateur_id: string }) => c.consommateur_id))];
    if (consommateurIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, message: "No subscribers" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: tokenRows } = await supabase
      .from("fcm_tokens")
      .select("token")
      .in("consommateur_id", consommateurIds);
    const tokens = (tokenRows ?? []).map((r: FcmTokenRow) => r.token).filter(Boolean);
    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, message: "No FCM tokens" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
    const a = annonce as Annonce;
    const { success, failed } = await sendFcm(
      projectId,
      accessToken,
      tokens,
      a.titre,
      a.description || "",
      { annonceId: a.id, type: "annonce" }
    );

    return new Response(
      JSON.stringify({ ok: true, sent: success, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: "send-annonce-push failed", detail: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
