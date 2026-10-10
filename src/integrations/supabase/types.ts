export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assessment_notes: {
        Row: {
          assessment_id: string
          author_id: string
          body: string
          created_at: string
          id: string
          section: string | null
        }
        Insert: {
          assessment_id: string
          author_id?: string
          body: string
          created_at?: string
          id?: string
          section?: string | null
        }
        Update: {
          assessment_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_notes_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_snapshots: {
        Row: {
          answers: Json
          assessment_id: string
          author_id: string
          created_at: string
          id: string
          label: string | null
          result: Json
          rules_version: Json | null
        }
        Insert: {
          answers: Json
          assessment_id: string
          author_id?: string
          created_at?: string
          id?: string
          label?: string | null
          result: Json
          rules_version?: Json | null
        }
        Update: {
          answers?: Json
          assessment_id?: string
          author_id?: string
          created_at?: string
          id?: string
          label?: string | null
          result?: Json
          rules_version?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_snapshots_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          answers: Json
          checklist: Json
          client_id: string
          created_at: string
          created_by: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          checklist?: Json
          client_id: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          checklist?: Json
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          comune: string | null
          created_at: string
          created_by: string
          id: string
          partita_iva: string | null
          ragione_sociale: string
          referente: string | null
          updated_at: string
        }
        Insert: {
          comune?: string | null
          created_at?: string
          created_by?: string
          id?: string
          partita_iva?: string | null
          ragione_sociale: string
          referente?: string | null
          updated_at?: string
        }
        Update: {
          comune?: string | null
          created_at?: string
          created_by?: string
          id?: string
          partita_iva?: string | null
          ragione_sociale?: string
          referente?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_submissions: {
        Row: {
          answers: Json
          assessment_id: string | null
          client_id: string | null
          company: string
          correction_request: string | null
          correction_requested_at: string | null
          created_at: string
          id: string
          owner_id: string
          scheme: string
          sender_email: string
          state: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          assessment_id?: string | null
          client_id?: string | null
          company: string
          correction_request?: string | null
          correction_requested_at?: string | null
          created_at?: string
          id?: string
          owner_id: string
          scheme: string
          sender_email: string
          state?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          assessment_id?: string | null
          client_id?: string | null
          company?: string
          correction_request?: string | null
          correction_requested_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          scheme?: string
          sender_email?: string
          state?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      evidences: {
        Row: {
          amount: number | null
          assessment_id: string
          author_id: string
          created_at: string
          description: string | null
          id: string
          intervention: string | null
          kind: string
          reference: string | null
          title: string
        }
        Insert: {
          amount?: number | null
          assessment_id: string
          author_id?: string
          created_at?: string
          description?: string | null
          id?: string
          intervention?: string | null
          kind?: string
          reference?: string | null
          title: string
        }
        Update: {
          amount?: number | null
          assessment_id?: string
          author_id?: string
          created_at?: string
          description?: string | null
          id?: string
          intervention?: string | null
          kind?: string
          reference?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidences_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      rules: {
        Row: {
          category: string
          key: string
          label: string
          reference: string
          requires_official_check: boolean
          review_notes: string | null
          sort: number
          source: string
          status: string
          unit: string | null
          updated_at: string
          updated_by: string | null
          value: number | null
          value_text: string | null
        }
        Insert: {
          category: string
          key: string
          label: string
          reference?: string
          requires_official_check?: boolean
          review_notes?: string | null
          sort?: number
          source?: string
          status?: string
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: number | null
          value_text?: string | null
        }
        Update: {
          category?: string
          key?: string
          label?: string
          reference?: string
          requires_official_check?: boolean
          review_notes?: string | null
          sort?: number
          source?: string
          status?: string
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_assessment: {
        Args: { _assessment_id: string }
        Returns: boolean
      }
      can_access_client: { Args: { _client_id: string }; Returns: boolean }
      customer_submission_action: {
        Args: { _action: string; _id?: string; _payload?: Json }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "socio"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "socio"],
    },
  },
} as const
