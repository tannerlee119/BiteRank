import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertReviewSchema, type InsertReview } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ThumbsUp, Minus, ThumbsDown } from "lucide-react";

interface AddReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddReviewModal({ open, onOpenChange }: AddReviewModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [numericalScore, setNumericalScore] = useState([7.5]);

  const form = useForm<InsertReview>({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: {
      restaurantName: "",
      restaurantLocation: "",
      rating: "like",
      score: 7.5,
      note: "",
      favoriteDishes: "",
      labels: "",
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: InsertReview) => {
      await apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      form.reset();
      onOpenChange(false);
      toast({
        title: "Review added",
        description: "Your restaurant review has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertReview) => {
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    createReviewMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-neutral-900">
            Add Restaurant Review
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Required Fields */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="restaurantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter restaurant name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="restaurantLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input placeholder="Address, city, or coordinates" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Update numerical score based on rating category
                          let newScore = 7.5;
                          if (value === "like") newScore = 8.5;
                          else if (value === "alright") newScore = 5.0;
                          else if (value === "dislike") newScore = 2.0;
                          
                          setNumericalScore([newScore]);
                          form.setValue("score", newScore);
                        }}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="like" id="like" className="sr-only" />
                          <label
                            htmlFor="like"
                            className={`cursor-pointer border-2 rounded-lg p-4 text-center hover:border-green-500 hover:bg-green-50 transition-colors flex-1 ${
                              field.value === "like"
                                ? "border-green-500 bg-green-50"
                                : "border-gray-300"
                            }`}
                          >
                            <ThumbsUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <div className="font-semibold text-gray-700">I like it</div>
                            <div className="text-xs text-gray-500">Score: 6.7-10</div>
                          </label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="alright" id="alright" className="sr-only" />
                          <label
                            htmlFor="alright"
                            className={`cursor-pointer border-2 rounded-lg p-4 text-center hover:border-orange-500 hover:bg-orange-50 transition-colors flex-1 ${
                              field.value === "alright"
                                ? "border-orange-500 bg-orange-50"
                                : "border-gray-300"
                            }`}
                          >
                            <div className="w-8 h-8 text-orange-500 mx-auto mb-2 flex items-center justify-center border-2 border-orange-500 rounded-full">
                              <Minus className="w-4 h-4" />
                            </div>
                            <div className="font-semibold text-gray-700">It's alright</div>
                            <div className="text-xs text-gray-500">Score: 3.4-6.6</div>
                          </label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dislike" id="dislike" className="sr-only" />
                          <label
                            htmlFor="dislike"
                            className={`cursor-pointer border-2 rounded-lg p-4 text-center hover:border-red-500 hover:bg-red-50 transition-colors flex-1 ${
                              field.value === "dislike"
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300"
                            }`}
                          >
                            <ThumbsDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
                            <div className="font-semibold text-gray-700">I didn't like it</div>
                            <div className="text-xs text-gray-500">Score: 0-3.3</div>
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Numerical Score Slider */}
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precise Score (0-10)</FormLabel>
                    <FormControl>
                      <div className="px-3">
                        <Slider
                          value={[field.value]}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                            setNumericalScore(value);
                          }}
                          max={10}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0</span>
                          <span className="font-semibold text-lg text-gray-800">{(field.value || 7.5).toFixed(1)}</span>
                          <span>10</span>
                        </div>
                      </div>
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Fine-tune your rating - this helps compare restaurants more precisely
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Optional Fields */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Additional Details (Optional)
              </h3>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="favoriteDishes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Favorite Dishes</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Pasta Carbonara, Tiramisu"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500">
                        Separate multiple dishes with commas
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What did you think? Any memorable experiences?"
                          rows={3}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="labels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags/Labels</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., cozy, cheap eats, date night"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500">
                        Separate multiple tags with commas
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReviewMutation.isPending}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {createReviewMutation.isPending ? "Saving..." : "Save Review"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
