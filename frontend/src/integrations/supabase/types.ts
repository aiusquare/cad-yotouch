export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      badge_events: {
        Row: {
          created_at: string;
          event: string;
          id: string;
          metadata: Json | null;
          points: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event: string;
          id?: string;
          metadata?: Json | null;
          points?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event?: string;
          id?: string;
          metadata?: Json | null;
          points?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "badge_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      field_agent_profiles: {
        Row: {
          active: boolean;
          agent_id: string;
          coverage_area: string | null;
          created_at: string;
          id: string;
          last_assignment_at: string | null;
          max_primary_validators: number;
          notes: string | null;
          tier: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          agent_id: string;
          coverage_area?: string | null;
          created_at?: string;
          id?: string;
          last_assignment_at?: string | null;
          max_primary_validators?: number;
          notes?: string | null;
          tier?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          agent_id?: string;
          coverage_area?: string | null;
          created_at?: string;
          id?: string;
          last_assignment_at?: string | null;
          max_primary_validators?: number;
          notes?: string | null;
          tier?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "field_agent_profiles_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      primary_validator_applications: {
        Row: {
          admin_notes: string | null;
          bvn: string | null;
          candidate_contact: string | null;
          candidate_email: string | null;
          candidate_name: string;
          community: string | null;
          created_at: string;
          field_agent_id: string | null;
          id: string;
          nin: string | null;
          primary_validator_profile_id: string | null;
          region: string | null;
          risk_level: string;
          status: string;
          supporting_documents: Json | null;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          bvn?: string | null;
          candidate_contact?: string | null;
          candidate_email?: string | null;
          candidate_name: string;
          community?: string | null;
          created_at?: string;
          field_agent_id?: string | null;
          id?: string;
          nin?: string | null;
          primary_validator_profile_id?: string | null;
          region?: string | null;
          risk_level?: string;
          status?: string;
          supporting_documents?: Json | null;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          bvn?: string | null;
          candidate_contact?: string | null;
          candidate_email?: string | null;
          candidate_name?: string;
          community?: string | null;
          created_at?: string;
          field_agent_id?: string | null;
          id?: string;
          nin?: string | null;
          primary_validator_profile_id?: string | null;
          region?: string | null;
          risk_level?: string;
          status?: string;
          supporting_documents?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "primary_validator_applications_field_agent_id_fkey";
            columns: ["field_agent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "primary_validator_applications_primary_validator_profile_id_fkey";
            columns: ["primary_validator_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          badge_last_updated_at: string | null;
          badge_level: number;
          badge_points: number;
          blockchain_proof_hash: string | null;
          bvn: string | null;
          created_at: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          nin: string | null;
          phone_number: string | null;
          residential_address: string | null;
          address_clarity: string | null;
          address_landmarks: string | null;
          address_directions: string | null;
          nin_address_snapshot: string | null;
          bvn_address_snapshot: string | null;
          updated_at: string;
          verification_score: number | null;
          verification_status: string | null;
        };
        Insert: {
          badge_last_updated_at?: string | null;
          badge_level?: number;
          badge_points?: number;
          blockchain_proof_hash?: string | null;
          bvn?: string | null;
          created_at?: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          nin?: string | null;
          phone_number?: string | null;
          residential_address?: string | null;
          address_clarity?: string | null;
          address_landmarks?: string | null;
          address_directions?: string | null;
          nin_address_snapshot?: string | null;
          bvn_address_snapshot?: string | null;
          updated_at?: string;
          verification_score?: number | null;
          verification_status?: string | null;
        };
        Update: {
          badge_last_updated_at?: string | null;
          badge_level?: number;
          badge_points?: number;
          blockchain_proof_hash?: string | null;
          bvn?: string | null;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          nin?: string | null;
          phone_number?: string | null;
          residential_address?: string | null;
          address_clarity?: string | null;
          address_landmarks?: string | null;
          address_directions?: string | null;
          nin_address_snapshot?: string | null;
          bvn_address_snapshot?: string | null;
          updated_at?: string;
          verification_score?: number | null;
          verification_status?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      verification_requests: {
        Row: {
          address_rating: string | null;
          address_match_score: number | null;
          character_level: string | null;
          created_at: string;
          face_match_score: number | null;
          final_score: number | null;
          id: string;
          liveness_score: number | null;
          nin_bvn: string | null;
          primary_validated_at: string | null;
          primary_validator_id: string | null;
          primary_validator_notes: string | null;
          residential_claim: string | null;
          reputation_score: number | null;
          secondary_validated_at: string | null;
          secondary_validator_id: string | null;
          secondary_validator_notes: string | null;
          selfie_url: string | null;
          social_proof_score: number | null;
          status: string | null;
          updated_at: string;
          user_id: string;
          video_url: string | null;
        };
        Insert: {
          address_rating?: string | null;
          address_match_score?: number | null;
          character_level?: string | null;
          created_at?: string;
          face_match_score?: number | null;
          final_score?: number | null;
          id?: string;
          liveness_score?: number | null;
          nin_bvn?: string | null;
          primary_validated_at?: string | null;
          primary_validator_id?: string | null;
          primary_validator_notes?: string | null;
          residential_claim?: string | null;
          reputation_score?: number | null;
          secondary_validated_at?: string | null;
          secondary_validator_id?: string | null;
          secondary_validator_notes?: string | null;
          selfie_url?: string | null;
          social_proof_score?: number | null;
          status?: string | null;
          updated_at?: string;
          user_id: string;
          video_url?: string | null;
        };
        Update: {
          address_rating?: string | null;
          address_match_score?: number | null;
          character_level?: string | null;
          created_at?: string;
          face_match_score?: number | null;
          final_score?: number | null;
          id?: string;
          liveness_score?: number | null;
          nin_bvn?: string | null;
          primary_validated_at?: string | null;
          primary_validator_id?: string | null;
          primary_validator_notes?: string | null;
          residential_claim?: string | null;
          reputation_score?: number | null;
          secondary_validated_at?: string | null;
          secondary_validator_id?: string | null;
          secondary_validator_notes?: string | null;
          selfie_url?: string | null;
          social_proof_score?: number | null;
          status?: string | null;
          updated_at?: string;
          user_id?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verification_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role:
        | "user"
        | "primary_validator"
        | "secondary_validator"
        | "admin"
        | "field_agent";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "user",
        "primary_validator",
        "secondary_validator",
        "admin",
        "field_agent",
      ],
    },
  },
} as const;
