export const getRatingColor = (rating: string) => {
  switch (rating) {
    case "like":
      return "bg-green-500";
    case "alright":
      return "bg-orange-500";
    case "dislike":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

export const getRatingLabel = (rating: string) => {
  switch (rating) {
    case "like":
      return "Loved";
    case "alright":
      return "Alright";
    case "dislike":
      return "Not For Me";
    default:
      return "Unknown";
  }
};

export const getRatingIcon = (rating: string) => {
  switch (rating) {
    case "like":
      return "fas fa-thumbs-up";
    case "alright":
      return "fas fa-meh";
    case "dislike":
      return "fas fa-thumbs-down";
    default:
      return "fas fa-question";
  }
};
