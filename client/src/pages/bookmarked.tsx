import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink, Bookmark as BookmarkIcon, BookmarkCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Bookmark as BookmarkType } from "@shared/schema";

export default function BookmarkedPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookmarks, isLoading } = useQuery<BookmarkType[]>({
    queryKey: ["/api/bookmarks"],
    queryFn: async () => {
      const response = await fetch("/api/bookmarks", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch bookmarks");
      }
      
      return response.json();
    },
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: async (externalId: string) => {
      const response = await fetch(`/api/bookmarks/${externalId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete bookmark");
      }
      
      return response.json();
    },
    onMutate: async (externalId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/bookmarks"] });
      
      // Snapshot the previous value
      const previousBookmarks = queryClient.getQueryData(["/api/bookmarks"]);
      
      // Optimistically update the bookmarks list
      queryClient.setQueryData(
        ["/api/bookmarks"],
        (old: any[]) => old.filter(bookmark => bookmark.externalId !== externalId)
      );
      
      return { previousBookmarks };
    },
    onError: (error, externalId, context) => {
      // Rollback on error
      if (context?.previousBookmarks) {
        queryClient.setQueryData(["/api/bookmarks"], context.previousBookmarks);
      }
      toast({
        title: "Error",
        description: "Failed to remove bookmark. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks/status"] });
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">Bookmarked Restaurants</h1>
            <p className="text-lg text-gray-600 mb-8">Your saved restaurant recommendations</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading bookmarks...</div>
        ) : bookmarks && bookmarks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarks.map((bookmark) => (
              <Card key={bookmark.id} className="overflow-hidden">
                {bookmark.photoUrl && (
                  <div className="aspect-video relative">
                    <img
                      src={bookmark.photoUrl}
                      alt={bookmark.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{bookmark.name}</h3>
                    <a
                      href={bookmark.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{bookmark.location}</p>
                  {bookmark.rating && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="ml-1 text-sm font-medium">{bookmark.rating.toFixed(1)}</span>
                      </div>
                      {bookmark.totalRatings && (
                        <span className="text-sm text-gray-500">
                          ({bookmark.totalRatings.toLocaleString()} reviews)
                        </span>
                      )}
                    </div>
                  )}
                  {bookmark.cuisine && (
                    <p className="text-sm text-gray-500 mb-2">{bookmark.cuisine}</p>
                  )}
                  {bookmark.priceLevel && (
                    <p className="text-sm text-gray-500 mb-4">{bookmark.priceLevel}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      Bookmarked {new Date(bookmark.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBookmarkMutation.mutate(bookmark.externalId)}
                      disabled={deleteBookmarkMutation.isPending}
                    >
                      <BookmarkCheck className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <BookmarkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookmarks yet</h3>
            <p className="text-gray-500 mb-4">
              Start bookmarking restaurants from the recommendations page to see them here.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}