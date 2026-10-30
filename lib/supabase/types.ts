/** Hand-written to match supabase/migrations/0001_init.sql (format of `supabase gen types`). */

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
      rate_limits: {
        Row: { key: string; window_start: string; count: number };
        Insert: { key: string; window_start: string; count?: number };
        Update: { key?: string; window_start?: string; count?: number };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      get_waitlist_count: { Args: Record<PropertyKey, never>; Returns: number };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: { allowed: boolean; retry_after_seconds: number }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
