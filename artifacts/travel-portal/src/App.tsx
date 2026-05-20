import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
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

const DEFAULT_USER = {
  id: 1,
  username: "admin",
  role: "admin",
  displayName: "المدير",
};

function AppRoutes() {
  return (
    <Switch>
      <Route path="/change-password" component={() => <ChangePasswordPage user={DEFAULT_USER} />} />
      <Route path="/" component={() => <DashboardShell user={DEFAULT_USER} onLogout={() => {}} />} />
      <Route path="/:page" component={({ params }) => <DashboardShell user={DEFAULT_USER} activePage={params.page} onLogout={() => {}} />} />
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
