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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      certificate_requests: {
        Row: {
          approved_at: string | null
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          class_label: string
          coordinator_notified_at: string | null
          created_at: string
          decision_notes: string | null
          duplicate_of_request_id: string | null
          hours_approved: number | null
          hours_requested: number | null
          id: string
          pdf_generated_at: string | null
          pdf_storage_path: string | null
          rejected_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by_coordinator_id: string | null
          school_emailed_at: string | null
          school_id: string
          school_name_snapshot: string
          school_year_id: string
          send_to_school: boolean
          send_to_teacher: boolean
          service_address_snapshot: string
          service_id: string
          service_name_snapshot: string
          service_schedule_snapshot: string
          status: Database["public"]["Enums"]["request_status"]
          student_email: string
          student_emailed_at: string | null
          student_first_name: string
          student_last_name: string
          student_notes: string | null
          submission_ip_hash: string | null
          submitted_at: string
          teacher_email_snapshot: string | null
          teacher_emailed_at: string | null
          teacher_name_snapshot: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          class_label: string
          coordinator_notified_at?: string | null
          created_at?: string
          decision_notes?: string | null
          duplicate_of_request_id?: string | null
          hours_approved?: number | null
          hours_requested?: number | null
          id?: string
          pdf_generated_at?: string | null
          pdf_storage_path?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by_coordinator_id?: string | null
          school_emailed_at?: string | null
          school_id: string
          school_name_snapshot: string
          school_year_id: string
          send_to_school?: boolean
          send_to_teacher?: boolean
          service_address_snapshot: string
          service_id: string
          service_name_snapshot: string
          service_schedule_snapshot: string
          status?: Database["public"]["Enums"]["request_status"]
          student_email: string
          student_emailed_at?: string | null
          student_first_name: string
          student_last_name: string
          student_notes?: string | null
          submission_ip_hash?: string | null
          submitted_at?: string
          teacher_email_snapshot?: string | null
          teacher_emailed_at?: string | null
          teacher_name_snapshot?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          class_label?: string
          coordinator_notified_at?: string | null
          created_at?: string
          decision_notes?: string | null
          duplicate_of_request_id?: string | null
          hours_approved?: number | null
          hours_requested?: number | null
          id?: string
          pdf_generated_at?: string | null
          pdf_storage_path?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by_coordinator_id?: string | null
          school_emailed_at?: string | null
          school_id?: string
          school_name_snapshot?: string
          school_year_id?: string
          send_to_school?: boolean
          send_to_teacher?: boolean
          service_address_snapshot?: string
          service_id?: string
          service_name_snapshot?: string
          service_schedule_snapshot?: string
          status?: Database["public"]["Enums"]["request_status"]
          student_email?: string
          student_emailed_at?: string | null
          student_first_name?: string
          student_last_name?: string
          student_notes?: string | null
          submission_ip_hash?: string | null
          submitted_at?: string
          teacher_email_snapshot?: string | null
          teacher_emailed_at?: string | null
          teacher_name_snapshot?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_requests_duplicate_of_request_id_fkey"
            columns: ["duplicate_of_request_id"]
            isOneToOne: false
            referencedRelation: "certificate_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_reviewed_by_coordinator_id_fkey"
            columns: ["reviewed_by_coordinator_id"]
            isOneToOne: false
            referencedRelation: "coordinators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinators: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          provider_message_id: string | null
          recipient_email: string
          recipient_type: Database["public"]["Enums"]["email_recipient_type"]
          request_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_delivery_status"]
          template_key: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          provider_message_id?: string | null
          recipient_email: string
          recipient_type: Database["public"]["Enums"]["email_recipient_type"]
          request_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_delivery_status"]
          template_key: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          recipient_type?: Database["public"]["Enums"]["email_recipient_type"]
          request_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_delivery_status"]
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_deliveries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "certificate_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_events: {
        Row: {
          actor_type: Database["public"]["Enums"]["request_actor_type"]
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          request_id: string
        }
        Insert: {
          actor_type: Database["public"]["Enums"]["request_actor_type"]
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          request_id: string
        }
        Update: {
          actor_type?: Database["public"]["Enums"]["request_actor_type"]
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "certificate_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      school_years: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          is_active: boolean
          label: string
          starts_on: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          is_active?: boolean
          label: string
          starts_on: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          is_active?: boolean
          label?: string
          starts_on?: string
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          school_email: string | null
          send_certificate_to_school_by_default: boolean
          send_certificate_to_teacher_by_default: boolean
          short_name: string
          teacher_email: string | null
          teacher_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          school_email?: string | null
          send_certificate_to_school_by_default?: boolean
          send_certificate_to_teacher_by_default?: boolean
          short_name: string
          teacher_email?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          school_email?: string | null
          send_certificate_to_school_by_default?: boolean
          send_certificate_to_teacher_by_default?: boolean
          short_name?: string
          teacher_email?: string | null
          teacher_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_coordinators: {
        Row: {
          coordinator_id: string
          created_at: string
          is_primary: boolean
          receives_new_request_notifications: boolean
          service_id: string
        }
        Insert: {
          coordinator_id: string
          created_at?: string
          is_primary?: boolean
          receives_new_request_notifications?: boolean
          service_id: string
        }
        Update: {
          coordinator_id?: string
          created_at?: string
          is_primary?: boolean
          receives_new_request_notifications?: boolean
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_coordinators_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "coordinators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_coordinators_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          address: string
          certificate_label: string | null
          city: string
          created_at: string
          end_time: string | null
          id: string
          is_active: boolean
          name: string
          schedule_label: string
          start_time: string | null
          updated_at: string
          weekday: string
        }
        Insert: {
          address: string
          certificate_label?: string | null
          city?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          name: string
          schedule_label: string
          start_time?: string | null
          updated_at?: string
          weekday: string
        }
        Update: {
          address?: string
          certificate_label?: string | null
          city?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          name?: string
          schedule_label?: string
          start_time?: string | null
          updated_at?: string
          weekday?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_access_request: {
        Args: { target_request_id: string }
        Returns: boolean
      }
      can_access_service: {
        Args: { target_service_id: string }
        Returns: boolean
      }
      current_coordinator_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin"
      certificate_type: "pcto" | "volontariato"
      email_delivery_status: "pending" | "sent" | "failed"
      email_recipient_type: "coordinator" | "student" | "school" | "teacher"
      request_actor_type: "system" | "coordinator" | "admin"
      request_status:
        | "submitted"
        | "approved"
        | "rejected"
        | "completed"
        | "delivery_failed"
        | "cancelled"
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
    Enums: {
      app_role: ["admin"],
      certificate_type: ["pcto", "volontariato"],
      email_delivery_status: ["pending", "sent", "failed"],
      email_recipient_type: ["coordinator", "student", "school", "teacher"],
      request_actor_type: ["system", "coordinator", "admin"],
      request_status: [
        "submitted",
        "approved",
        "rejected",
        "completed",
        "delivery_failed",
        "cancelled",
      ],
    },
  },
} as const
