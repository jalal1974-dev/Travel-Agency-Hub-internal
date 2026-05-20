import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import DashboardShell from "@/pages/DashboardShell";
import ChangePasswordPage from "@/pages/ChangePasswordPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const [, navigate] = useLocation();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json() as Promise<{
        id: number;
        username: string;
        role: string;
        displayName: string | null;
      }>;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-5xl mb-4">✈️</div>
          <p className="text-white/70 text-lg font-arabic">الجود للسياحة والسفر</p>
          <p className="text-white/40 text-sm mt-2">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={() => <LoginPage onLogin={() => { queryClient.invalidateQueries({ queryKey: ["me"] }); navigate("/"); }} />} />
        <Route component={() => <LoginPage onLogin={() => { queryClient.invalidateQueries({ queryKey: ["me"] }); navigate("/"); }} />} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/change-password" component={() => <ChangePasswordPage user={user} />} />
      <Route path="/" component={() => <DashboardShell user={user} onLogout={() => { queryClient.invalidateQueries({ queryKey: ["me"] }); }} />} />
      <Route path="/:page" component={({ params }) => <DashboardShell user={user} activePage={params.page} onLogout={() => { queryClient.invalidateQueries({ queryKey: ["me"] }); }} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
