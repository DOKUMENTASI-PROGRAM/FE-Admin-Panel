import { supabase } from "../lib/supabase";

class AuthService {
  private static instance: AuthService;
  private initialized = false;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize() {
    if (this.initialized) return;

    // Setup auth state listener
    supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthChange(event, session);
    });

    // Check existing session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      this.updateLocalStorage(session);
    }

    this.initialized = true;
  }

  private handleAuthChange(event: string, session: any) {
    console.log(`[AuthService] Event: ${event}`);

    if (session) {
      this.updateLocalStorage(session);
    } else if (event === "SIGNED_OUT") {
      this.clearLocalStorage();
    }
  }

  private updateLocalStorage(session: any) {
    localStorage.setItem("token", session.access_token);
    localStorage.setItem("refreshToken", session.refresh_token);
    localStorage.setItem("user", JSON.stringify(session.user));
  }

  private clearLocalStorage() {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  }

  async logout() {
    await supabase.auth.signOut();
    this.clearLocalStorage();
  }
}

export const authService = AuthService.getInstance();
