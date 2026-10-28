export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      ad_views: {
        Row: {
          created_at: string;
          id: string;
          reward_amount: number;
          user_id: string;
          video_id: string;
          view_date: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reward_amount: number;
          user_id: string;
          video_id: string;
          view_date?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reward_amount?: number;
          user_id?: string;
          video_id?: string;
          view_date?: string;
        };
        Relationships: [];
      };
      agent_applications: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          reviewed_at: string | null;
          status: Database["public"]["Enums"]["agent_status"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["agent_status"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["agent_status"];
          user_id?: string;
        };
        Relationships: [];
      };
      drama_episode_completions: {
        Row: {
          completed_at: string;
          drama_id: string;
          episode_number: number;
          id: string;
          platform: string;
          reward_amount: number;
          user_id: string;
          view_date: string;
          watch_seconds: number;
        };
        Insert: {
          completed_at?: string;
          drama_id: string;
          episode_number: number;
          id?: string;
          platform: string;
          reward_amount?: number;
          user_id: string;
          view_date: string;
          watch_seconds?: number;
        };
        Update: {
          completed_at?: string;
          drama_id?: string;
          episode_number?: number;
          id?: string;
          platform?: string;
          reward_amount?: number;
          user_id?: string;
          view_date?: string;
          watch_seconds?: number;
        };
        Relationships: [];
      };
      drama_renewals: {
        Row: {
          created_at: string;
          days_granted: number;
          ends_at: string;
          id: string;
          period: Database["public"]["Enums"]["drama_renewal_period"];
          price_php: number;
          reference_id: string | null;
          starts_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          days_granted: number;
          ends_at: string;
          id?: string;
          period: Database["public"]["Enums"]["drama_renewal_period"];
          price_php: number;
          reference_id?: string | null;
          starts_at: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          days_granted?: number;
          ends_at?: string;
          id?: string;
          period?: Database["public"]["Enums"]["drama_renewal_period"];
          price_php?: number;
          reference_id?: string | null;
          starts_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_checkins: {
        Row: {
          checkin_date: string;
          created_at: string;
          reward_amount: number;
          user_id: string;
        };
        Insert: {
          checkin_date?: string;
          created_at?: string;
          reward_amount: number;
          user_id: string;
        };
        Update: {
          checkin_date?: string;
          created_at?: string;
          reward_amount?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          ads_points: number;
          agent_status: Database["public"]["Enums"]["agent_status"];
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          drama_access_ends_at: string | null;
          first_paid_plan_at: string | null;
          id: string;
          level: number;
          member_code: string;
          plan_slug: string;
          referral_code: string;
          referred_by: string | null;
          subscription_ends_at: string | null;
          trial_ends_at: string | null;
          updated_at: string;
          xp: number;
        };
        Insert: {
          ads_points?: number;
          agent_status?: Database["public"]["Enums"]["agent_status"];
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          drama_access_ends_at?: string | null;
          first_paid_plan_at?: string | null;
          id: string;
          level?: number;
          member_code: string;
          plan_slug?: string;
          referral_code: string;
          referred_by?: string | null;
          subscription_ends_at?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
          xp?: number;
        };
        Update: {
          ads_points?: number;
          agent_status?: Database["public"]["Enums"]["agent_status"];
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          drama_access_ends_at?: string | null;
          first_paid_plan_at?: string | null;
          id?: string;
          level?: number;
          member_code?: string;
          plan_slug?: string;
          referral_code?: string;
          referred_by?: string | null;
          subscription_ends_at?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
          xp?: number;
        };
        Relationships: [];
      };
      starpago_deposits: {
        Row: {
          amount: number;
          created_at: string;
          credited_at: string | null;
          expires_at: string | null;
          fee_php: number;
          fee_rate: number;
          id: string;
          mer_order_no: string;
          net_php: number;
          order_no: string | null;
          paid_at: string | null;
          pay_method: string;
          payer_email: string | null;
          payer_mobile: string | null;
          payer_name: string | null;
          payment_link: string | null;
          status: Database["public"]["Enums"]["deposit_status"];
          target_bucket: Database["public"]["Enums"]["wallet_bucket"];
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          credited_at?: string | null;
          expires_at?: string | null;
          fee_php?: number;
          fee_rate?: number;
          id?: string;
          mer_order_no: string;
          net_php: number;
          order_no?: string | null;
          paid_at?: string | null;
          pay_method: string;
          payer_email?: string | null;
          payer_mobile?: string | null;
          payer_name?: string | null;
          payment_link?: string | null;
          status?: Database["public"]["Enums"]["deposit_status"];
          target_bucket?: Database["public"]["Enums"]["wallet_bucket"];
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          credited_at?: string | null;
          expires_at?: string | null;
          fee_php?: number;
          fee_rate?: number;
          id?: string;
          mer_order_no?: string;
          net_php?: number;
          order_no?: string | null;
          paid_at?: string | null;
          pay_method?: string;
          payer_email?: string | null;
          payer_mobile?: string | null;
          payer_name?: string | null;
          payment_link?: string | null;
          status?: Database["public"]["Enums"]["deposit_status"];
          target_bucket?: Database["public"]["Enums"]["wallet_bucket"];
          user_id?: string;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          created_at: string;
          duration_label: string | null;
          id: string;
          sort_order: number;
          title: string;
          visibility: string;
          youtube_id: string;
        };
        Insert: {
          created_at?: string;
          duration_label?: string | null;
          id?: string;
          sort_order?: number;
          title: string;
          visibility?: string;
          youtube_id: string;
        };
        Update: {
          created_at?: string;
          duration_label?: string | null;
          id?: string;
          sort_order?: number;
          title?: string;
          visibility?: string;
          youtube_id?: string;
        };
        Relationships: [];
      };
      wallet_ledger: {
        Row: {
          amount: number;
          bucket: Database["public"]["Enums"]["wallet_bucket"];
          created_at: string;
          entry_type: string;
          id: string;
          metadata: Json;
          reference_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          bucket: Database["public"]["Enums"]["wallet_bucket"];
          created_at?: string;
          entry_type: string;
          id?: string;
          metadata?: Json;
          reference_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          bucket?: Database["public"]["Enums"]["wallet_bucket"];
          created_at?: string;
          entry_type?: string;
          id?: string;
          metadata?: Json;
          reference_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          deposit_balance: number;
          spending_balance: number;
          updated_at: string;
          user_id: string;
          withdrawal_balance: number;
        };
        Insert: {
          deposit_balance?: number;
          spending_balance?: number;
          updated_at?: string;
          user_id: string;
          withdrawal_balance?: number;
        };
        Update: {
          deposit_balance?: number;
          spending_balance?: number;
          updated_at?: string;
          user_id?: string;
          withdrawal_balance?: number;
        };
        Relationships: [];
      };
      withdrawals: {
        Row: {
          completed_at: string | null;
          destination_bic: string | null;
          destination_name: string;
          destination_number: string;
          destination_type: string;
          failure_reason: string | null;
          gross_amount: number;
          id: string;
          net_amount: number;
          paymongo_transfer_id: string | null;
          payout_attempt: number;
          refund_status: string;
          requested_at: string;
          starpago_mer_order_no: string | null;
          starpago_order_no: string | null;
          starpago_order_status: number | null;
          status: Database["public"]["Enums"]["withdrawal_status"];
          tax_amount: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          destination_bic?: string | null;
          destination_name: string;
          destination_number: string;
          destination_type: string;
          failure_reason?: string | null;
          gross_amount: number;
          id?: string;
          net_amount: number;
          paymongo_transfer_id?: string | null;
          payout_attempt?: number;
          refund_status?: string;
          requested_at?: string;
          starpago_mer_order_no?: string | null;
          starpago_order_no?: string | null;
          starpago_order_status?: number | null;
          status?: Database["public"]["Enums"]["withdrawal_status"];
          tax_amount: number;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          destination_bic?: string | null;
          destination_name?: string;
          destination_number?: string;
          destination_type?: string;
          failure_reason?: string | null;
          gross_amount?: number;
          id?: string;
          net_amount?: number;
          paymongo_transfer_id?: string | null;
          payout_attempt?: number;
          refund_status?: string;
          requested_at?: string;
          starpago_mer_order_no?: string | null;
          starpago_order_no?: string | null;
          starpago_order_status?: number | null;
          status?: Database["public"]["Enums"]["withdrawal_status"];
          tax_amount?: number;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_member_code: { Args: Record<string, never>; Returns: string };
      wallet_apply: {
        Args: {
          p_bucket: Database["public"]["Enums"]["wallet_bucket"];
          p_delta: number;
          p_entry_type: string;
          p_meta?: Json;
          p_reference_id?: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      agent_status: "none" | "pending" | "approved" | "rejected";
      deposit_status: "pending" | "paid" | "failed" | "expired";
      drama_renewal_period: "week" | "month" | "year";
      wallet_bucket: "deposit" | "spending" | "withdrawal";
      withdrawal_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "rejected"
        | "frozen";
    };
    CompositeTypes: Record<string, never>;
  };
};
