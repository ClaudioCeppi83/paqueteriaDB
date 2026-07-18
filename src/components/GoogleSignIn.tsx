import React, { useEffect, useState } from "react";
import { Shield, Key, Eye, EyeOff, AlertCircle, Info, Chrome } from "lucide-react";
import { UserSession } from "../types";

declare global {
  interface Window {
    google?: any;
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

  useEffect(() => {
    // Attempt to render the Google Sign In button if client ID is loaded
    const initGoogle = () => {
      if (window.google && window.google.accounts && clientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
              const token = response.credential;
              // Simple base64 decoding of the JWT payload
              try {
                const base64Url = token.split(".")[1];
                const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split("")
                    .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
                );
                const user = JSON.parse(jsonPayload);

                // Verify the email is the authorized delivery worker email
                if (authorizedEmail && user.email.toLowerCase() !== authorizedEmail.toLowerCase()) {
                  setError(`Acceso restringido. Solo el usuario "${authorizedEmail}" tiene permiso.`);
                  return;
                }

                onLogin({
                  email: user.email,
                  name: user.name,
                  picture: user.picture,
                  loggedIn: true,
                  method: "google",
                });
              } catch (e) {
                setError("No se pudo descifrar la credencial de Google.");
              }
            },
          });

          const buttonParent = document.getElementById("google-signin-button");
          if (buttonParent) {
            window.google.accounts.id.renderButton(buttonParent, {
              theme: "outline",
              size: "large",
              text: "signin_with",
              shape: "pill",
              logo_alignment: "left",
            });
          }
        } catch (err) {
          console.error("Error setting up Google Sign-In widget:", err);
        }
      }
    };

    // Poll for google script loaded
    const interval = setInterval(() => {
      if (window.google) {
        initGoogle();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [clientId, authorizedEmail, onLogin]);

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default master local developer PIN is 1234
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
          Acceso seguro para Claudio. Protege tus reportes y credenciales de Airtable.
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
            <div id="google-signin-button" className="w-full flex justify-center min-h-[44px]"></div>
          </div>
        ) : (
          <div className="w-full bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-slate-600 mb-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-blue-700">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Google OAuth No Configurado</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              No has configurado un <strong>Google Client ID</strong> en los Ajustes todavía. Para usar tu cuenta oficial de Gmail, configúralo luego de entrar.
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
