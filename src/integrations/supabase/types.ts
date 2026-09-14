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
      fee_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          school_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          school_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          school_id?: string | null
        }
        Relationships: []
      }
      fee_discounts: {
        Row: {
          account_id: string
          authorized_by: string | null
          authorized_by_user: string | null
          created_at: string
          discount_amount: number
          id: string
          original_amount: number
          reason: string | null
          school_id: string
          student_id: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          account_id: string
          authorized_by?: string | null
          authorized_by_user?: string | null
          created_at?: string
          discount_amount: number
          id?: string
          original_amount?: number
          reason?: string | null
          school_id: string
          student_id: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          account_id?: string
          authorized_by?: string | null
          authorized_by_user?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          original_amount?: number
          reason?: string | null
          school_id?: string
          student_id?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_discounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "student_fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_discounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_discounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          academic_year: string
          account_id: string
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          id: string
          payment_date: string
          payment_method: string
          received_by: string | null
          received_by_user: string | null
          reference_number: string | null
          remarks: string | null
          school_id: string
          student_id: string
          term: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          academic_year: string
          account_id: string
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          received_by_user?: string | null
          reference_number?: string | null
          remarks?: string | null
          school_id: string
          student_id: string
          term: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          academic_year?: string
          account_id?: string
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          received_by_user?: string | null
          reference_number?: string | null
          remarks?: string | null
          school_id?: string
          student_id?: string
          term?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "student_fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_receipts: {
        Row: {
          academic_year: string
          amount: number
          balance_after: number | null
          balance_before: number | null
          class_level: string | null
          created_at: string
          id: string
          issued_at: string
          payment_id: string
          payment_kind: string
          payment_method: string | null
          receipt_number: string
          received_by: string | null
          reference_number: string | null
          school_id: string
          student_id: string
          term: string
        }
        Insert: {
          academic_year: string
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          class_level?: string | null
          created_at?: string
          id?: string
          issued_at?: string
          payment_id: string
          payment_kind: string
          payment_method?: string | null
          receipt_number: string
          received_by?: string | null
          reference_number?: string | null
          school_id: string
          student_id: string
          term: string
        }
        Update: {
          academic_year?: string
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          class_level?: string | null
          created_at?: string
          id?: string
          issued_at?: string
          payment_id?: string
          payment_kind?: string
          payment_method?: string | null
          receipt_number?: string
          received_by?: string | null
          reference_number?: string | null
          school_id?: string
          student_id?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_receipts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structure_items: {
        Row: {
          amount: number
          created_at: string
          fee_type_id: string | null
          fee_type_name: string
          id: string
          school_id: string
          structure_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          fee_type_id?: string | null
          fee_type_name: string
          id?: string
          school_id: string
          structure_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee_type_id?: string | null
          fee_type_name?: string
          id?: string
          school_id?: string
          structure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structure_items_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structure_items_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structure_items_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: string
          class_level: string
          created_at: string
          id: string
          notes: string | null
          school_id: string
          term: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_level: string
          created_at?: string
          id?: string
          notes?: string | null
          school_id: string
          term: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_level?: string
          created_at?: string
          id?: string
          notes?: string | null
          school_id?: string
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      feeding_fee_payments: {
        Row: {
          academic_year: string
          account_id: string
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string
          id: string
          payment_date: string
          payment_method: string
          received_by: string | null
          received_by_user: string | null
          reference_number: string | null
          remarks: string | null
          school_id: string
          student_id: string
          term: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          academic_year: string
          account_id: string
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          received_by_user?: string | null
          reference_number?: string | null
          remarks?: string | null
          school_id: string
          student_id: string
          term: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          academic_year?: string
          account_id?: string
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          received_by_user?: string | null
          reference_number?: string | null
          remarks?: string | null
          school_id?: string
          student_id?: string
          term?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feeding_fee_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "student_feeding_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feeding_fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feeding_fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      feeding_fee_settings: {
        Row: {
          academic_year: string
          class_level: string
          created_at: string
          daily_rate: number
          feeding_days: number
          id: string
          school_id: string
          term: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_level: string
          created_at?: string
          daily_rate?: number
          feeding_days?: number
          id?: string
          school_id: string
          term: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_level?: string
          created_at?: string
          daily_rate?: number
          feeding_days?: number
          id?: string
          school_id?: string
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feeding_fee_settings_school_id_fkey"
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
      student_fee_accounts: {
        Row: {
          academic_year: string
          amount_due: number | null
          balance: number | null
          class_level: string
          created_at: string
          id: string
          school_id: string
          status: string | null
          structure_id: string | null
          student_id: string
          term: string
          total_charged: number
          total_discount: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          amount_due?: number | null
          balance?: number | null
          class_level: string
          created_at?: string
          id?: string
          school_id: string
          status?: string | null
          structure_id?: string | null
          student_id: string
          term: string
          total_charged?: number
          total_discount?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          amount_due?: number | null
          balance?: number | null
          class_level?: string
          created_at?: string
          id?: string
          school_id?: string
          status?: string | null
          structure_id?: string | null
          student_id?: string
          term?: string
          total_charged?: number
          total_discount?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_accounts_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_charges: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          fee_type_name: string
          id: string
          school_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount?: number
          created_at?: string
          fee_type_name: string
          id?: string
          school_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          fee_type_name?: string
          id?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_charges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "student_fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_charges_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_feeding_accounts: {
        Row: {
          academic_year: string
          balance: number | null
          class_level: string
          created_at: string
          daily_rate: number
          feeding_days: number
          id: string
          is_excluded: boolean
          school_id: string
          status: string | null
          student_id: string
          term: string
          total_charged: number | null
          total_paid: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          balance?: number | null
          class_level: string
          created_at?: string
          daily_rate?: number
          feeding_days?: number
          id?: string
          is_excluded?: boolean
          school_id: string
          status?: string | null
          student_id: string
          term: string
          total_charged?: number | null
          total_paid?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          balance?: number | null
          class_level?: string
          created_at?: string
          daily_rate?: number
          feeding_days?: number
          id?: string
          is_excluded?: boolean
          school_id?: string
          status?: string | null
          student_id?: string
          term?: string
          total_charged?: number | null
          total_paid?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_feeding_accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_feeding_accounts_student_id_fkey"
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
      daily_collection_report: {
        Row: {
          academic_year: string | null
          amount: number | null
          class_level: string | null
          payment_date: string | null
          payment_id: string | null
          payment_method: string | null
          payment_type: string | null
          receipt_number: string | null
          received_by: string | null
          reference_number: string | null
          remarks: string | null
          school_id: string | null
          student_id: string | null
          student_name: string | null
          term: string | null
        }
        Relationships: []
      }
      financial_dashboard: {
        Row: {
          academic_year: string | null
          outstanding_feeding_fees: number | null
          outstanding_school_fees: number | null
          school_id: string | null
          students_with_arrears: number | null
          term: string | null
          today_feeding_fees_collected: number | null
          today_school_fees_collected: number | null
          today_total_collected: number | null
          total_charged: number | null
          total_collected: number | null
          total_feeding_fees_charged: number | null
          total_feeding_fees_collected: number | null
          total_outstanding: number | null
          total_school_fees_charged: number | null
          total_school_fees_collected: number | null
          voided_payment_amount: number | null
          voided_payment_count: number | null
        }
        Relationships: []
      }
      payment_method_report: {
        Row: {
          academic_year: string | null
          payment_count: number | null
          payment_date: string | null
          payment_method: string | null
          payment_type: string | null
          school_id: string | null
          term: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      student_arrears_report: {
        Row: {
          academic_year: string | null
          class_level: string | null
          feeding_excluded: boolean | null
          feeding_fees_balance: number | null
          feeding_fees_charged: number | null
          feeding_fees_paid: number | null
          feeding_fees_status: string | null
          school_fees_balance: number | null
          school_fees_charged: number | null
          school_fees_discount: number | null
          school_fees_due: number | null
          school_fees_paid: number | null
          school_fees_status: string | null
          school_id: string | null
          student_id: string | null
          student_name: string | null
          term: string | null
          total_outstanding: number | null
        }
        Relationships: []
      }
      student_financial_statement: {
        Row: {
          academic_year: string | null
          class_level: string | null
          feeding_excluded: boolean | null
          feeding_fees_balance: number | null
          feeding_fees_charged: number | null
          feeding_fees_paid: number | null
          feeding_fees_status: string | null
          school_fees_balance: number | null
          school_fees_charged: number | null
          school_fees_discount: number | null
          school_fees_due: number | null
          school_fees_paid: number | null
          school_fees_status: string | null
          school_id: string | null
          student_id: string | null
          student_name: string | null
          term: string | null
          total_outstanding: number | null
        }
        Relationships: []
      }
      voided_payments_detailed_report: {
        Row: {
          academic_year: string | null
          amount: number | null
          class_level: string | null
          payment_date: string | null
          payment_id: string | null
          payment_method: string | null
          payment_type: string | null
          receipt_number: string | null
          received_by: string | null
          school_id: string | null
          status: string | null
          student_id: string | null
          student_name: string | null
          term: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_configure_finance: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      has_finance_access: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalc_fee_account: { Args: { _account_id: string }; Returns: undefined }
      record_feeding_fee_payment: {
        Args: {
          _account_id: string
          _amount: number
          _payment_date: string
          _payment_method: string
          _received_by?: string
          _reference_number?: string
          _remarks?: string
        }
        Returns: Json
      }
      record_school_fee_payment: {
        Args: {
          _account_id: string
          _amount: number
          _payment_date: string
          _payment_method: string
          _received_by?: string
          _reference_number?: string
          _remarks?: string
        }
        Returns: Json
      }
      void_feeding_fee_payment: {
        Args: { _payment_id: string; _reason: string; _voided_by?: string }
        Returns: Json
      }
      void_school_fee_payment: {
        Args: { _payment_id: string; _reason: string; _voided_by?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "super_admin" | "accountant"
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
      app_role: ["admin", "teacher", "super_admin", "accountant"],
    },
  },
} as const
