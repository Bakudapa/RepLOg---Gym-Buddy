export type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "arms" | "core";

export type Exercise = {
  name: string;
  group: MuscleGroup;
  aliases?: string[];
};

/** Shown when the exercise field is focused while empty (FR6). */
export const POPULAR_EXERCISES = ["Bench Press", "Squat", "Deadlift", "Overhead Press"];

export const EXERCISES: Exercise[] = [
  // Chest
  { name: "Bench Press", group: "chest", aliases: ["bp", "flat bench"] },
  { name: "Incline Bench Press", group: "chest", aliases: ["incline bp"] },
  { name: "Decline Bench Press", group: "chest", aliases: ["decline bp"] },
  { name: "Dumbbell Bench Press", group: "chest", aliases: ["db bench", "db press"] },
  { name: "Incline Dumbbell Press", group: "chest", aliases: ["incline db press"] },
  { name: "Close-Grip Bench Press", group: "chest", aliases: ["cgbp", "close grip"] },
  { name: "Chest Fly", group: "chest", aliases: ["pec fly", "flyes"] },
  { name: "Cable Crossover", group: "chest", aliases: ["cable fly"] },
  { name: "Machine Chest Press", group: "chest" },
  { name: "Push-Up", group: "chest", aliases: ["pushup", "press up"] },
  { name: "Dip", group: "chest", aliases: ["dips", "chest dip"] },
  // Back
  { name: "Deadlift", group: "back", aliases: ["dl", "conventional deadlift"] },
  { name: "Barbell Row", group: "back", aliases: ["bent over row", "bb row"] },
  { name: "Pendlay Row", group: "back" },
  { name: "Dumbbell Row", group: "back", aliases: ["db row", "one arm row"] },
  { name: "T-Bar Row", group: "back", aliases: ["t bar row"] },
  { name: "Seated Cable Row", group: "back", aliases: ["cable row"] },
  { name: "Pull-Up", group: "back", aliases: ["pullup"] },
  { name: "Chin-Up", group: "back", aliases: ["chinup"] },
  { name: "Lat Pulldown", group: "back", aliases: ["pulldown"] },
  { name: "Face Pull", group: "back" },
  { name: "Rack Pull", group: "back" },
  // Legs
  { name: "Squat", group: "legs", aliases: ["back squat", "bs"] },
  { name: "Front Squat", group: "legs", aliases: ["fs"] },
  { name: "Romanian Deadlift", group: "legs", aliases: ["rdl"] },
  { name: "Sumo Deadlift", group: "legs", aliases: ["sumo"] },
  { name: "Leg Press", group: "legs" },
  { name: "Hack Squat", group: "legs" },
  { name: "Goblet Squat", group: "legs" },
  { name: "Bulgarian Split Squat", group: "legs", aliases: ["bss", "split squat"] },
  { name: "Walking Lunge", group: "legs", aliases: ["lunges"] },
  { name: "Hip Thrust", group: "legs", aliases: ["glute bridge"] },
  { name: "Leg Extension", group: "legs" },
  { name: "Leg Curl", group: "legs", aliases: ["hamstring curl"] },
  { name: "Calf Raise", group: "legs" },
  // Shoulders
  { name: "Overhead Press", group: "shoulders", aliases: ["ohp", "military press"] },
  { name: "Push Press", group: "shoulders" },
  { name: "Dumbbell Shoulder Press", group: "shoulders", aliases: ["db shoulder press"] },
  { name: "Arnold Press", group: "shoulders" },
  { name: "Lateral Raise", group: "shoulders", aliases: ["side raise", "lat raise"] },
  { name: "Rear Delt Fly", group: "shoulders", aliases: ["reverse fly"] },
  { name: "Upright Row", group: "shoulders" },
  // Arms
  { name: "Barbell Curl", group: "arms", aliases: ["bb curl"] },
  { name: "Dumbbell Curl", group: "arms", aliases: ["db curl", "bicep curl"] },
  { name: "Hammer Curl", group: "arms" },
  { name: "Preacher Curl", group: "arms" },
  { name: "Triceps Pushdown", group: "arms", aliases: ["pushdown", "tricep pushdown"] },
  { name: "Skull Crusher", group: "arms", aliases: ["lying triceps extension"] },
  { name: "Overhead Triceps Extension", group: "arms" },
  // Core
  { name: "Plank", group: "core" },
  { name: "Hanging Leg Raise", group: "core" },
  { name: "Cable Crunch", group: "core" },
  { name: "Ab Wheel Rollout", group: "core", aliases: ["ab roller"] },
  { name: "Russian Twist", group: "core" },
  { name: "Pallof Press", group: "core" },
];
