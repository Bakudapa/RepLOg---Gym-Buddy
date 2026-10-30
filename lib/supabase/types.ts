/**
 * Hand-written to match supabase/migrations/0001_init.sql and 0002_app.sql
 * (format of `supabase gen types`). numeric columns arrive as numbers via PostgREST.
 */

export type FeedbackCategory = "feature" | "critique" | "bug";

export type Database = {
  public: {
    Tables: {
      waitlist: {
        Row: { id: string; email: string; created_at: string };
        Insert: { id?: string; email: string; created_at?: string };
        Update: { id?: string; email?: string; created_at?: string };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          category: FeedbackCategory;
          message: string;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: FeedbackCategory;
          message: string;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: FeedbackCategory;
          message?: string;
          email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admins: {
        Row: { user_id: string; role: "admin"; created_at: string };
        Insert: { user_id: string; role?: "admin"; created_at?: string };
        Update: { user_id?: string; role?: "admin"; created_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: { id: string; display_name: string; is_demo: boolean; created_at: string };
        Insert: never;
        Update: { display_name?: string };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          notes: string | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
        };
        Insert: { name: string; notes?: string | null };
        Update: { name?: string; notes?: string | null; ended_at?: string | null };
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          exercise_name: string;
          exercise_key: string;
          weight_kg: number;
          reps: number;
          performed_at: string;
          created_at: string;
        };
        Insert: {
          session_id: string;
          exercise_name: string;
          weight_kg: number;
          reps: number;
        };
        Update: { exercise_name?: string; weight_kg?: number; reps?: number };
        Relationships: [];
      };
      rate_limits: {
        Row: { key: string; window_start: string; count: number };
        Insert: { key: string; window_start: string; count?: number };
        Update: { key?: string; window_start?: string; count?: number };
        Relationships: [];
      };
    };
    Views: {
      workout_set_records: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          exercise_name: string;
          exercise_key: string;
          weight_kg: number;
          reps: number;
          performed_at: string;
          created_at: string;
          e1rm: number;
          is_e1rm_pr: boolean;
          is_weight_pr: boolean;
        };
        Relationships: [];
      };
      workout_session_summaries: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          notes: string | null;
          started_at: string;
          ended_at: string | null;
          set_count: number;
          exercise_count: number;
          volume_kg: number;
          pr_count: number;
        };
        Relationships: [];
      };
      exercise_summaries: {
        Row: {
          user_id: string;
          exercise_key: string;
          exercise_name: string;
          last_performed_at: string;
          best_e1rm: number;
          best_weight_kg: number;
          set_count: number;
        };
        Relationships: [];
      };
      exercise_session_bests: {
        Row: {
          user_id: string;
          exercise_key: string;
          session_id: string;
          started_at: string;
          best_e1rm: number;
          has_e1rm_pr: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      get_waitlist_count: { Args: Record<PropertyKey, never>; Returns: number };
      is_demo: { Args: Record<PropertyKey, never>; Returns: boolean };
      get_total_sets_logged: { Args: Record<PropertyKey, never>; Returns: number };
      get_admin_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_users: number;
          new_users_7d: number;
          total_sessions: number;
          total_sets: number;
          feedback_feature: number;
          feedback_critique: number;
          feedback_bug: number;
        }[];
      };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: { allowed: boolean; retry_after_seconds: number }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
