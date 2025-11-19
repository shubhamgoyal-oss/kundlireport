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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          page: string | null
          puja_id: number | null
          puja_name: string | null
          session_id: string
          step: number | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          page?: string | null
          puja_id?: number | null
          puja_name?: string | null
          session_id: string
          step?: number | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          page?: string | null
          puja_id?: number | null
          puja_name?: string | null
          session_id?: string
          step?: number | null
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      dosha_calculations: {
        Row: {
          book_puja_clicked: boolean
          calculation_number: number
          calculation_results: Json | null
          created_at: string
          date_of_birth: string
          gandmool_dosha: boolean
          grahan_dosha: boolean
          guru_chandal_dosha: boolean
          id: string
          kaal_sarp_dosha: boolean
          kalathra_dosha: boolean
          kemadruma_yoga: boolean
          ketu_naga_dosha: boolean
          latitude: number | null
          longitude: number | null
          mangal_dosha: boolean
          name: string
          navagraha_umbrella: boolean
          pitra_dosha: boolean
          place_of_birth: string
          punarphoo_dosha: boolean
          sade_sati: boolean
          session_id: string
          shrapit_dosha: boolean
          time_of_birth: string
          updated_at: string
          user_id: string | null
          vish_daridra_yoga: boolean
          visitor_id: string
        }
        Insert: {
          book_puja_clicked?: boolean
          calculation_number?: number
          calculation_results?: Json | null
          created_at?: string
          date_of_birth: string
          gandmool_dosha?: boolean
          grahan_dosha?: boolean
          guru_chandal_dosha?: boolean
          id?: string
          kaal_sarp_dosha?: boolean
          kalathra_dosha?: boolean
          kemadruma_yoga?: boolean
          ketu_naga_dosha?: boolean
          latitude?: number | null
          longitude?: number | null
          mangal_dosha?: boolean
          name: string
          navagraha_umbrella?: boolean
          pitra_dosha?: boolean
          place_of_birth: string
          punarphoo_dosha?: boolean
          sade_sati?: boolean
          session_id: string
          shrapit_dosha?: boolean
          time_of_birth: string
          updated_at?: string
          user_id?: string | null
          vish_daridra_yoga?: boolean
          visitor_id: string
        }
        Update: {
          book_puja_clicked?: boolean
          calculation_number?: number
          calculation_results?: Json | null
          created_at?: string
          date_of_birth?: string
          gandmool_dosha?: boolean
          grahan_dosha?: boolean
          guru_chandal_dosha?: boolean
          id?: string
          kaal_sarp_dosha?: boolean
          kalathra_dosha?: boolean
          kemadruma_yoga?: boolean
          ketu_naga_dosha?: boolean
          latitude?: number | null
          longitude?: number | null
          mangal_dosha?: boolean
          name?: string
          navagraha_umbrella?: boolean
          pitra_dosha?: boolean
          place_of_birth?: string
          punarphoo_dosha?: boolean
          sade_sati?: boolean
          session_id?: string
          shrapit_dosha?: boolean
          time_of_birth?: string
          updated_at?: string
          user_id?: string | null
          vish_daridra_yoga?: boolean
          visitor_id?: string
        }
        Relationships: []
      }
      dosha_calculator2: {
        Row: {
          book_puja_clicked: boolean
          calculation_number: number
          calculation_results: Json | null
          created_at: string
          date_of_birth: string
          gandmool_dosha: boolean
          grahan_dosha: boolean
          guru_chandal_dosha: boolean
          id: string
          kaal_sarp_dosha: boolean
          kalathra_dosha: boolean
          kemadruma_yoga: boolean
          ketu_naga_dosha: boolean
          latitude: number | null
          longitude: number | null
          mangal_dosha: boolean
          name: string
          navagraha_umbrella: boolean
          pitra_dosha: boolean
          place_of_birth: string
          punarphoo_dosha: boolean
          sade_sati: boolean
          session_id: string
          shrapit_dosha: boolean
          time_of_birth: string
          updated_at: string
          user_id: string | null
          vish_daridra_yoga: boolean
          visitor_id: string
        }
        Insert: {
          book_puja_clicked?: boolean
          calculation_number?: number
          calculation_results?: Json | null
          created_at?: string
          date_of_birth: string
          gandmool_dosha?: boolean
          grahan_dosha?: boolean
          guru_chandal_dosha?: boolean
          id?: string
          kaal_sarp_dosha?: boolean
          kalathra_dosha?: boolean
          kemadruma_yoga?: boolean
          ketu_naga_dosha?: boolean
          latitude?: number | null
          longitude?: number | null
          mangal_dosha?: boolean
          name: string
          navagraha_umbrella?: boolean
          pitra_dosha?: boolean
          place_of_birth: string
          punarphoo_dosha?: boolean
          sade_sati?: boolean
          session_id: string
          shrapit_dosha?: boolean
          time_of_birth: string
          updated_at?: string
          user_id?: string | null
          vish_daridra_yoga?: boolean
          visitor_id: string
        }
        Update: {
          book_puja_clicked?: boolean
          calculation_number?: number
          calculation_results?: Json | null
          created_at?: string
          date_of_birth?: string
          gandmool_dosha?: boolean
          grahan_dosha?: boolean
          guru_chandal_dosha?: boolean
          id?: string
          kaal_sarp_dosha?: boolean
          kalathra_dosha?: boolean
          kemadruma_yoga?: boolean
          ketu_naga_dosha?: boolean
          latitude?: number | null
          longitude?: number | null
          mangal_dosha?: boolean
          name?: string
          navagraha_umbrella?: boolean
          pitra_dosha?: boolean
          place_of_birth?: string
          punarphoo_dosha?: boolean
          sade_sati?: boolean
          session_id?: string
          shrapit_dosha?: boolean
          time_of_birth?: string
          updated_at?: string
          user_id?: string | null
          vish_daridra_yoga?: boolean
          visitor_id?: string
        }
        Relationships: []
      }
      seer_api_logs: {
        Row: {
          adaptation_warnings: Json | null
          adapted_planets: Json | null
          birth_date: string
          birth_place: string
          birth_time: string
          calculation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          kaal_sarp_dosha: boolean | null
          latitude: number
          longitude: number
          mangal_dosha: boolean | null
          pitra_dosha: boolean | null
          request_payload: Json
          response_data: Json | null
          response_status: number
          response_time_ms: number
          session_id: string
          shani_dosha: boolean | null
          timezone: number
          visitor_id: string
        }
        Insert: {
          adaptation_warnings?: Json | null
          adapted_planets?: Json | null
          birth_date: string
          birth_place: string
          birth_time: string
          calculation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kaal_sarp_dosha?: boolean | null
          latitude: number
          longitude: number
          mangal_dosha?: boolean | null
          pitra_dosha?: boolean | null
          request_payload: Json
          response_data?: Json | null
          response_status: number
          response_time_ms: number
          session_id: string
          shani_dosha?: boolean | null
          timezone: number
          visitor_id: string
        }
        Update: {
          adaptation_warnings?: Json | null
          adapted_planets?: Json | null
          birth_date?: string
          birth_place?: string
          birth_time?: string
          calculation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kaal_sarp_dosha?: boolean | null
          latitude?: number
          longitude?: number
          mangal_dosha?: boolean | null
          pitra_dosha?: boolean | null
          request_payload?: Json
          response_data?: Json | null
          response_status?: number
          response_time_ms?: number
          session_id?: string
          shani_dosha?: boolean | null
          timezone?: number
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seer_api_logs_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "dosha_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
