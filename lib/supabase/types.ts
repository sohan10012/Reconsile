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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          created_at: string
          data: Json | null
          duration_ms: number | null
          id: number
          invoice_id: number | null
          message: string | null
          status: string
          step: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          duration_ms?: number | null
          id?: never
          invoice_id?: number | null
          message?: string | null
          status: string
          step: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          duration_ms?: number | null
          id?: never
          invoice_id?: number | null
          message?: string | null
          status?: string
          step?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: number
          invoice_id: number
          line_total: number
          match_score: number | null
          matched_po_item_id: number | null
          quantity: number
          sku: string | null
          unit_price: number
          user_id: string
        }
        Insert: {
          description: string
          id?: never
          invoice_id: number
          line_total?: number
          match_score?: number | null
          matched_po_item_id?: number | null
          quantity?: number
          sku?: string | null
          unit_price?: number
          user_id: string
        }
        Update: {
          description?: string
          id?: never
          invoice_id?: number
          line_total?: number
          match_score?: number | null
          matched_po_item_id?: number | null
          quantity?: number
          sku?: string | null
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_matched_po_item_id_fkey"
            columns: ["matched_po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reviews: {
        Row: {
          action: string
          comment: string | null
          created_at: string
          id: number
          invoice_id: number
          user_id: string
        }
        Insert: {
          action: string
          comment?: string | null
          created_at?: string
          id?: never
          invoice_id: number
          user_id: string
        }
        Update: {
          action?: string
          comment?: string | null
          created_at?: string
          id?: never
          invoice_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reviews_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          currency: string | null
          decision: string | null
          error_message: string | null
          extracted: Json | null
          file_name: string
          file_pathname: string | null
          file_type: string | null
          file_url: string
          id: number
          invoice_date: string | null
          invoice_number: string | null
          match_confidence: number | null
          matched_po_id: number | null
          matched_vendor_id: number | null
          ocr_text: string | null
          po_number_raw: string | null
          status: string
          subtotal: number | null
          tax: number | null
          total_amount: number | null
          updated_at: string
          user_id: string
          validation_score: number | null
          vendor_name: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          decision?: string | null
          error_message?: string | null
          extracted?: Json | null
          file_name: string
          file_pathname?: string | null
          file_type?: string | null
          file_url: string
          id?: never
          invoice_date?: string | null
          invoice_number?: string | null
          match_confidence?: number | null
          matched_po_id?: number | null
          matched_vendor_id?: number | null
          ocr_text?: string | null
          po_number_raw?: string | null
          status?: string
          subtotal?: number | null
          tax?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
          validation_score?: number | null
          vendor_name?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          decision?: string | null
          error_message?: string | null
          extracted?: Json | null
          file_name?: string
          file_pathname?: string | null
          file_type?: string | null
          file_url?: string
          id?: never
          invoice_date?: string | null
          invoice_number?: string | null
          match_confidence?: number | null
          matched_po_id?: number | null
          matched_vendor_id?: number | null
          ocr_text?: string | null
          po_number_raw?: string | null
          status?: string
          subtotal?: number | null
          tax?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
          validation_score?: number | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_matched_po_id_fkey"
            columns: ["matched_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_matched_vendor_id_fkey"
            columns: ["matched_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          description: string
          id: number
          line_total: number
          po_id: number
          quantity: number
          sku: string | null
          unit_price: number
          user_id: string
        }
        Insert: {
          description: string
          id?: never
          line_total?: number
          po_id: number
          quantity?: number
          sku?: string | null
          unit_price?: number
          user_id: string
        }
        Update: {
          description?: string
          id?: never
          line_total?: number
          po_id?: number
          quantity?: number
          sku?: string | null
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          currency: string
          id: number
          order_date: string
          po_number: string
          status: string
          subtotal: number
          tax: number
          total_amount: number
          user_id: string
          vendor_id: number | null
          vendor_name: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: never
          order_date?: string
          po_number: string
          status?: string
          subtotal?: number
          tax?: number
          total_amount?: number
          user_id: string
          vendor_id?: number | null
          vendor_name: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: never
          order_date?: string
          po_number?: string
          status?: string
          subtotal?: number
          tax?: number
          total_amount?: number
          user_id?: string
          vendor_id?: number | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          amount_tolerance_pct: number
          auto_approve_threshold: number
          created_at: string
          id: number
          notifications_enabled: boolean
          price_tolerance_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_tolerance_pct?: number
          auto_approve_threshold?: number
          created_at?: string
          id?: never
          notifications_enabled?: boolean
          price_tolerance_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_tolerance_pct?: number
          auto_approve_threshold?: number
          created_at?: string
          id?: never
          notifications_enabled?: boolean
          price_tolerance_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_reports: {
        Row: {
          checks: Json
          created_at: string
          decision: string
          id: number
          invoice_id: number
          score: number
          user_id: string
        }
        Insert: {
          checks: Json
          created_at?: string
          decision: string
          id?: never
          invoice_id: number
          score?: number
          user_id: string
        }
        Update: {
          checks?: Json
          created_at?: string
          decision?: string
          id?: never
          invoice_id?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_reports_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: number
          name: string
          payment_terms: string | null
          phone: string | null
          tax_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: never
          name: string
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: never
          name?: string
          payment_terms?: string | null
          phone?: string | null
          tax_id?: string | null
          user_id?: string
        }
        Relationships: []
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
