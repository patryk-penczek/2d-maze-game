// /app/lib/getMazeSize.ts

export const getMazeSize = (difficulty: "easy" | "medium" | "hard" | "extreme") => {
    switch (difficulty) {
      case "easy":
        return { rows: 31, cols: 31 };
      case "medium":
        return { rows: 45, cols: 45 };
      case "hard":
        return { rows: 61, cols: 61 };
      case "extreme":
        return { rows: 81, cols: 81 };
      default:
        return { rows: 31, cols: 31 };
    }
  };
  