import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/navbar";
import { AddReviewModal } from "@/components/add-review-modal";
import Dashboard from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { ProfilePage } from "@/pages/profile";
import MyReviewsPage from "@/pages/my-reviews";
import StatsPage from "@/pages/stats";
import RecommendationsPage from "@/pages/recommendations";
import BookmarkedPage from "@/pages/bookmarked";
import { useState } from "react";

function AuthenticatedApp() {
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onAddReview={() => setIsAddReviewOpen(true)} />
      <main>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/my-reviews" component={MyReviewsPage} />
          <Route path="/stats" component={StatsPage} />
          <Route path="/recommendations" component={RecommendationsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <AddReviewModal
        open={isAddReviewOpen}
        onOpenChange={setIsAddReviewOpen}
      />
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
