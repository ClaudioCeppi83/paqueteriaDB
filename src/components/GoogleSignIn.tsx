import React, { useEffect, useState } from "react";
import { Shield, Key, Eye, EyeOff, AlertCircle, Info } from "lucide-react";
import { UserSession } from "../types";

declare global {
  interface Window {
    google?: any;
    googleTokenClient?: any;
  }
}

interface GoogleSignInProps {
  onLogin: (session: UserSession) => void;
  clientId: string;
  authorizedEmail: string;
}

export default function GoogleSignIn({ onLogin, clientId, authorizedEmail }: GoogleSignInProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  useEffect(() => {
    // Attempt to render the Google Sign In Token Client if client ID is loaded
    const initGoogleTokenClient = () => {
      if (window.google && window.google.accounts && clientId) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/generative-language https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/keep",
            callback: async (response: any) => {
              setLoadingGoogle(false);
              if (response.error) {
                setError(`Error de autenticación Google: ${response.error_description || response.error}`);
                return;
              }

              const accessToken = response.access_token;
              if (!accessToken) {
                setError("No se recibió un token de acceso de Google.");
                return;
              }

              setLoadingGoogle(true);
              // Fetch user profile info from Google UserInfo endpoint
              try {
                const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                });

                if (!profileRes.ok) {
                  throw new Error("No se pudo obtener el perfil de usuario de Google.");
                }

                const user = await profileRes.json();

                // Verify the email is the authorized delivery worker email
                if (authorizedEmail && user.email.toLowerCase() !== authorizedEmail.toLowerCase()) {
                  setError(`Acceso restringido. Solo el usuario "${authorizedEmail}" tiene permiso.`);
                  setLoadingGoogle(false);
                  return;
                }

                onLogin({
                  email: user.email,
                  name: user.name || user.given_name || "Claudio",
                  picture: user.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                  loggedIn: true,
                  method: "google",
                  accessToken: accessToken,
                });
              } catch (e: any) {
                setError(`Error al descifrar perfil: ${e.message || e}`);
              } finally {
                setLoadingGoogle(false);
              }
            },
          });

          window.googleTokenClient = client;
        } catch (err) {
          console.error("Error setting up Google Token Client:", err);
        }
      }
    };

    // Poll for google script loaded
    const interval = setInterval(() => {
      if (window.google && window.google.accounts) {
        initGoogleTokenClient();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [clientId, authorizedEmail, onLogin]);

  const handleGoogleLogin = () => {
    setError(null);
    if (window.googleTokenClient) {
      setLoadingGoogle(true);
      window.googleTokenClient.requestAccessToken();
    } else {
      setError("El servicio de Google no está listo todavía. Revisa el Client ID en Ajustes.");
    }
  };

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default master local developer PIN is 1234 or 08918
    if (pin === "1234" || pin === "08918") {
      onLogin({
        email: authorizedEmail || "erceppi@gmail.com",
        name: "Claudio (Acceso Local)",
        picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        loggedIn: true,
        method: "local",
      });
    } else {
      setError("PIN incorrecto. Intenta con '1234' o el código postal '08918' en modo desarrollo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 p-6 font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
      
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center">
        {/* App Branding */}
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/10 mb-6">
          <Shield className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2 text-center">
          Delivery Rport Software
        </h1>
        <p className="text-sm text-slate-500 mb-8 text-center max-w-xs">
          Acceso seguro para Claudio. Protege tus reportes y conéctalos con Google Sheets.
        </p>

        {error && (
          <div className="w-full flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs mb-6">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Authentication Option */}
        {clientId ? (
          <div className="w-full mb-6">
            <div className="text-center text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">
              Entrar con cuenta de Google
            </div>
            <button
              onClick={handleGoogleLogin}
              disabled={loadingGoogle}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 disabled:bg-slate-50 text-slate-700 font-semibold rounded-xl py-3 px-4 flex items-center justify-center gap-3 transition shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
              id="google-signin-btn-custom"
            >
              {loadingGoogle ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span>{loadingGoogle ? "Conectando..." : "Iniciar sesión con Google"}</span>
            </button>
          </div>
        ) : (
          <div className="w-full bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-slate-600 mb-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-blue-700">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Google OAuth No Configurado</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              No has configurado un <strong>Google Client ID</strong> en los Ajustes todavía. Para usar tu cuenta oficial de Gmail y Google Sheets, configúralo luego de entrar.
            </p>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-blue-600 hover:underline text-left mt-1 font-medium"
            >
              {showInstructions ? "Ocultar instrucciones" : "Ver instrucciones paso a paso"}
            </button>
            
            {showInstructions && (
              <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200 pt-2 flex flex-col gap-1.5 leading-relaxed">
                <p>1. Ve a <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google Cloud Console</a> y crea un proyecto.</p>
                <p>2. Crea una Credencial de ID de Cliente OAuth (tipo Aplicación Web).</p>
                <p>3. Agrega como URI de redirección autorizada: <span className="font-mono text-blue-700 bg-blue-100 px-1 py-0.5 rounded select-all">{window.location.origin}</span></p>
                <p>4. Copia el Client ID e ingrésalo en los Ajustes de esta app.</p>
              </div>
            )}
          </div>
        )}

        <div className="w-full flex items-center gap-3 my-2 text-slate-400 text-xs">
          <div className="h-[1px] bg-slate-200 grow"></div>
          <span>O</span>
          <div className="h-[1px] bg-slate-200 grow"></div>
        </div>

        {/* Bypass Local PIN Option */}
        <form onSubmit={handleLocalLogin} className="w-full mt-4 flex flex-col gap-4">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider text-center">
            Acceso Local Rápido
          </div>
          
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Escribe el PIN de seguridad (ej. 1234)"
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 pl-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition"
              id="pin-input"
            />
            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              id="toggle-pin-visibility"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 text-sm transition shadow-lg shadow-blue-600/15 active:scale-[0.98] cursor-pointer"
            id="local-login-submit"
          >
            Entrar con PIN
          </button>
        </form>

        <div className="text-[11px] text-slate-400 mt-8 text-center">
          Procesado localmente con seguridad total • Badalona, España
        </div>
      </div>
    </div>
  );
}
