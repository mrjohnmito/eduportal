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
      admin_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          school_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          school_id: string
          subject: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          school_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_teacher_reports: {
        Row: {
          academic_year: string
          attendance: number | null
          class_teacher_remark: string | null
          conduct: string | null
          created_at: string
          id: string
          interest: string | null
          promoted_to: string | null
          school_id: string | null
          student_id: string
          teacher_id: string
          term: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          attendance?: number | null
          class_teacher_remark?: string | null
          conduct?: string | null
          created_at?: string
          id?: string
          interest?: string | null
          promoted_to?: string | null
          school_id?: string | null
          student_id: string
          teacher_id: string
          term: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          attendance?: number | null
          class_teacher_remark?: string | null
          conduct?: string | null
          created_at?: string
          id?: string
          interest?: string | null
          promoted_to?: string | null
          school_id?: string | null
          student_id?: string
          teacher_id?: string
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teacher_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teacher_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teacher_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      level_subjects: {
        Row: {
          created_at: string
          id: string
          level: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          name?: string
        }
        Relationships: []
      }
      school_credentials: {
        Row: {
          admin_email: string | null
          admin_password_hash: string | null
          created_at: string
          id: string
          school_id: string
          updated_at: string
        }
        Insert: {
          admin_email?: string | null
          admin_password_hash?: string | null
          created_at?: string
          id?: string
          school_id: string
          updated_at?: string
        }
        Update: {
          admin_email?: string | null
          admin_password_hash?: string | null
          created_at?: string
          id?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_credentials_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          academic_year: string | null
          conduct_options: string[] | null
          created_at: string
          email: string | null
          final_class: string | null
          id: string
          interest_options: string[] | null
          logo_url: string | null
          motto: string | null
          next_term_begins: string | null
          phone1: string | null
          phone2: string | null
          school_id: string | null
          school_name: string
          term: string | null
          total_school_days: number | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          conduct_options?: string[] | null
          created_at?: string
          email?: string | null
          final_class?: string | null
          id?: string
          interest_options?: string[] | null
          logo_url?: string | null
          motto?: string | null
          next_term_begins?: string | null
          phone1?: string | null
          phone2?: string | null
          school_id?: string | null
          school_name?: string
          term?: string | null
          total_school_days?: number | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          conduct_options?: string[] | null
          created_at?: string
          email?: string | null
          final_class?: string | null
          id?: string
          interest_options?: string[] | null
          logo_url?: string | null
          motto?: string | null
          next_term_begins?: string | null
          phone1?: string | null
          phone2?: string | null
          school_id?: string | null
          school_name?: string
          term?: string | null
          total_school_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          activated_at: string | null
          created_at: string
          id: string
          is_locked: boolean
          logo_url: string | null
          name: string
          school_code: string
          school_level: string
          subscription_expiry: string | null
          subscription_status: boolean
          theme_color: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          logo_url?: string | null
          name: string
          school_code: string
          school_level?: string
          subscription_expiry?: string | null
          subscription_status?: boolean
          theme_color?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          id?: string
          is_locked?: boolean
          logo_url?: string | null
          name?: string
          school_code?: string
          school_level?: string
          subscription_expiry?: string | null
          subscription_status?: boolean
          theme_color?: string | null
        }
        Relationships: []
      }
      scores: {
        Row: {
          class_level: string
          created_at: string
          exam: number | null
          group_work: number | null
          id: string
          project: number | null
          school_id: string | null
          student_id: string
          subject: string
          test1: number | null
          test2: number | null
          updated_at: string
        }
        Insert: {
          class_level: string
          created_at?: string
          exam?: number | null
          group_work?: number | null
          id?: string
          project?: number | null
          school_id?: string | null
          student_id: string
          subject: string
          test1?: number | null
          test2?: number | null
          updated_at?: string
        }
        Update: {
          class_level?: string
          created_at?: string
          exam?: number | null
          group_work?: number | null
          id?: string
          project?: number | null
          school_id?: string | null
          student_id?: string
          subject?: string
          test1?: number | null
          test2?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          academic_year: string
          class_level: string
          created_at: string
          id: string
          school_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_level: string
          created_at?: string
          id?: string
          school_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_level?: string
          created_at?: string
          id?: string
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_promotions: {
        Row: {
          action: string
          created_at: string
          from_academic_year: string
          from_class: string
          id: string
          performed_at: string
          performed_by: string | null
          school_id: string
          student_id: string
          student_name: string
          to_academic_year: string | null
          to_class: string | null
        }
        Insert: {
          action: string
          created_at?: string
          from_academic_year: string
          from_class: string
          id?: string
          performed_at?: string
          performed_by?: string | null
          school_id: string
          student_id: string
          student_name: string
          to_academic_year?: string | null
          to_class?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          from_academic_year?: string
          from_class?: string
          id?: string
          performed_at?: string
          performed_by?: string | null
          school_id?: string
          student_id?: string
          student_name?: string
          to_academic_year?: string | null
          to_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_promotions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          attendance_days: number | null
          class_level: string
          created_at: string
          id: string
          name: string
          photo_url: string | null
          school_id: string | null
          updated_at: string
        }
        Insert: {
          attendance_days?: number | null
          class_level: string
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          attendance_days?: number | null
          class_level?: string
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_contact: {
        Row: {
          email: string | null
          id: string
          name: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      teacher_class_assignments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string | null
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id?: string | null
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          access_code: string
          created_at: string
          id: string
          name: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          access_code: string
          created_at?: string
          id?: string
          name: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          access_code?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "super_admin"
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
      app_role: ["admin", "teacher", "super_admin"],
    },
  },
} as const
