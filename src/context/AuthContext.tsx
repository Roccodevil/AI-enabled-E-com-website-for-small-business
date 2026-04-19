import { createContext, useContext, useState, ReactNode, useEffect } from "react";

import { loginApi, verifyEmailOtpApi } from "@/lib/api";

type Role = "admin" | "consumer" | "retailer" | "wholesaler" | "transport" | "user" | null;

type AuthCtx = {
  role: Role;
  email: string | null;
  token: string | null;
  login: (email: string, password: string) => Promise<Role>;
  loginWithEmailOtp: (email: string, code: string, password: string, fullName?: string) => Promise<Role>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const r = sessionStorage.getItem("role") as Role;
    const e = sessionStorage.getItem("email");
    const t = sessionStorage.getItem("auth_token");
    if (r) setRole(r);
    if (e) setEmail(e);
    if (t) setToken(t);
  }, []);

  const login = async (em: string, password: string): Promise<Role> => {
    const { token: accessToken, role: apiRole } = await loginApi(em, password);
    const resolvedRole = (apiRole as Role) ?? "consumer";

    setRole(resolvedRole);
    setEmail(em);
    setToken(accessToken);
    sessionStorage.setItem("role", resolvedRole);
    sessionStorage.setItem("email", em);
    sessionStorage.setItem("auth_token", accessToken);
    return resolvedRole;
  };

  const loginWithEmailOtp = async (
    userEmail: string,
    code: string,
    password: string,
    fullName?: string,
  ): Promise<Role> => {
    const { token: accessToken, role: apiRole, email } = await verifyEmailOtpApi(userEmail, code, password, fullName);
    const resolvedRole = (apiRole as Role) ?? "consumer";

    setRole(resolvedRole);
    setEmail(email);
    setToken(accessToken);
    sessionStorage.setItem("role", resolvedRole);
    sessionStorage.setItem("email", email);
    sessionStorage.setItem("auth_token", accessToken);
    return resolvedRole;
  };

  const logout = () => {
    setRole(null);
    setEmail(null);
    setToken(null);
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("auth_token");
  };

  return <Ctx.Provider value={{ role, email, token, login, loginWithEmailOtp, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
