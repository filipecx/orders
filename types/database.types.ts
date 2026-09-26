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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          sale_type: string
          sort_order: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          sale_type?: string
          sort_order?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sale_type?: string
          sort_order?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combos_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_rules: {
        Row: {
          category_id: string
          combo_id: string
          created_at: string
          id: string
          required_quantity: number
        }
        Insert: {
          category_id: string
          combo_id: string
          created_at?: string
          id?: string
          required_quantity: number
        }
        Update: {
          category_id?: string
          combo_id?: string
          created_at?: string
          id?: string
          required_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_rules_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
        ]
      }
      drop_items: {
        Row: {
          allocated_quantity: number
          created_at: string
          custom_price: number | null
          drop_id: string
          id: string
          is_active: boolean | null
          max_per_order: number | null
          product_id: string
          promotional_price: number | null
          sold_quantity: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          allocated_quantity: number
          created_at?: string
          custom_price?: number | null
          drop_id: string
          id?: string
          is_active?: boolean | null
          max_per_order?: number | null
          product_id: string
          promotional_price?: number | null
          sold_quantity?: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          allocated_quantity?: number
          created_at?: string
          custom_price?: number | null
          drop_id?: string
          id?: string
          is_active?: boolean | null
          max_per_order?: number | null
          product_id?: string
          promotional_price?: number | null
          sold_quantity?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drop_items_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      drops: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          max_orders: number | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["drop_status"]
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_orders?: number | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["drop_status"]
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_orders?: number | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["drop_status"]
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          order: number
          question: string
          store_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          order?: number
          question: string
          store_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          order?: number
          question?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          customizations: Json | null
          drop_item_id: string | null
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_image_url: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          customizations?: Json | null
          drop_item_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_image_url?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          customizations?: Json | null
          drop_item_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_image_url?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_drop_item_id_fkey"
            columns: ["drop_item_id"]
            isOneToOne: false
            referencedRelation: "drop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_method: string | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          discount: number | null
          drop_id: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          notes: string | null
          order_number: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          production_status: string | null
          scheduled_date: string | null
          scheduled_time_slot: string | null
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_method?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          discount?: number | null
          drop_id?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          notes?: string | null
          order_number?: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          production_status?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_method?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          discount?: number | null
          drop_id?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          production_status?: string | null
          scheduled_date?: string | null
          scheduled_time_slot?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_order: boolean
          allow_ready_delivery: boolean
          category_id: string | null
          created_at: string
          description: string | null
          different_prices_by_mode: boolean
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean | null
          lead_time_days: number
          name: string
          price: number
          price_order: number | null
          price_ready_delivery: number | null
          promotional_price: number | null
          sale_type: string
          sku: string | null
          sort_order: number | null
          stock_quantity: number | null
          store_id: string
          track_stock: boolean | null
          updated_at: string
        }
        Insert: {
          allow_order?: boolean
          allow_ready_delivery?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          different_prices_by_mode?: boolean
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          lead_time_days?: number
          name: string
          price: number
          price_order?: number | null
          price_ready_delivery?: number | null
          promotional_price?: number | null
          sale_type?: string
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          store_id: string
          track_stock?: boolean | null
          updated_at?: string
        }
        Update: {
          allow_order?: boolean
          allow_ready_delivery?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          different_prices_by_mode?: boolean
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          lead_time_days?: number
          name?: string
          price?: number
          price_order?: number | null
          price_ready_delivery?: number | null
          promotional_price?: number | null
          sale_type?: string
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          store_id?: string
          track_stock?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          banner_url: string | null
          business_hours: Json | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          pix_key: string | null
          pix_key_type: Database["public"]["Enums"]["pix_key_type"] | null
          pix_merchant_city: string | null
          pix_merchant_name: string | null
          primary_color: string | null
          settings: Json | null
          slug: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          banner_url?: string | null
          business_hours?: Json | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: Database["public"]["Enums"]["pix_key_type"] | null
          pix_merchant_city?: string | null
          pix_merchant_name?: string | null
          primary_color?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          banner_url?: string | null
          business_hours?: Json | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: Database["public"]["Enums"]["pix_key_type"] | null
          pix_merchant_city?: string | null
          pix_merchant_name?: string | null
          primary_color?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_order_number: {
        Args: { p_store_id: string }
        Returns: number
      }
      get_order_by_idempotency_key: {
        Args: { p_store_id: string; p_idempotency_key: string }
        Returns: Json
      }
      get_order_by_id_public: {
        Args: { p_order_id: string }
        Returns: Json
      }
      deduct_drop_item_stock: {
        Args: { p_drop_item_id: string; p_quantity: number }
        Returns: boolean
      }
      reorder_categories: {
        Args: { p_store_id: string; p_items: Json }
        Returns: boolean
      }
      reorder_products: {
        Args: { p_store_id: string; p_items: Json }
        Returns: boolean
      }
      reorder_combos: {
        Args: { p_store_id: string; p_items: Json }
        Returns: boolean
      }
      reorder_storefront_sections: {
        Args: { p_store_id: string; p_sections: Json }
        Returns: boolean
      }
    }
    Enums: {
      delivery_type: "delivery" | "pickup" | "dine_in"
      drop_status:
        | "draft"
        | "scheduled"
        | "active"
        | "paused"
        | "ended"
        | "sold_out"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready_for_pickup"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_method:
        | "pix"
        | "credit_card"
        | "debit_card"
        | "cash"
        | "on_delivery"
        | "whatsapp"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random"
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
      delivery_type: ["delivery", "pickup", "dine_in"],
      drop_status: [
        "draft",
        "scheduled",
        "active",
        "paused",
        "ended",
        "sold_out",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_method: [
        "pix",
        "credit_card",
        "debit_card",
        "cash",
        "on_delivery",
        "whatsapp",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
      pix_key_type: ["cpf", "cnpj", "email", "phone", "random"],
    },
  },
} as const
