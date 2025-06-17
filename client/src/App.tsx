import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import HomePage from "@/pages/home";
import RecommendationsPage from "@/pages/recommendations";
import { AuthProvider } from "@/contexts/auth-context";
import { useState } from "react";
import { AddReviewModal } from "@/components/add-review-modal";

const queryClient = new QueryClient();

function App() {
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar onAddReview={() => setIsAddReviewOpen(true)} />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />
              </Routes>
            </main>
            <Toaster />
            <AddReviewModal
              open={isAddReviewOpen}
              onOpenChange={setIsAddReviewOpen}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
