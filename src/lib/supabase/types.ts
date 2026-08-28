export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          profile_name: string;
          theme: 'paper' | 'dark' | 'light';
          reduce_motion: boolean;
          notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_name?: string;
          theme?: 'paper' | 'dark' | 'light';
          reduce_motion?: boolean;
          notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_name?: string;
          theme?: 'paper' | 'dark' | 'light';
          reduce_motion?: boolean;
          notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          subject: string;
          due: string;
          time: string;
          priority: 'high' | 'medium' | 'low';
          completed: boolean;
          custom: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          subject: string;
          due: string;
          time: string;
          priority: 'high' | 'medium' | 'low';
          completed?: boolean;
          custom?: boolean;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          subject?: string;
          due?: string;
          time?: string;
          priority?: 'high' | 'medium' | 'low';
          completed?: boolean;
          custom?: boolean;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          teacher: string;
          room: string;
          day: string;
          start: string;
          end: string;
          color: 'lilac' | 'blue' | 'green' | 'yellow' | 'red';
          checked: boolean;
          imported: boolean;
          google_calendar_id: string | null;
          all_day: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          teacher: string;
          room: string;
          day: string;
          start: string;
          end: string;
          color: 'lilac' | 'blue' | 'green' | 'yellow' | 'red';
          checked?: boolean;
          imported?: boolean;
          google_calendar_id?: string | null;
          all_day?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject?: string;
          teacher?: string;
          room?: string;
          day?: string;
          start?: string;
          end?: string;
          color?: 'lilac' | 'blue' | 'green' | 'yellow' | 'red';
          checked?: boolean;
          imported?: boolean;
          google_calendar_id?: string | null;
          all_day?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          teacher: string;
          room: string;
          symbol: string;
          color: 'blue' | 'lilac' | 'green' | 'yellow';
          preparedness: number;
          tasks_due: number;
          tag: string | null;
          urgent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          teacher: string;
          room: string;
          symbol: string;
          color: 'blue' | 'lilac' | 'green' | 'yellow';
          preparedness?: number;
          tasks_due?: number;
          tag?: string | null;
          urgent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          teacher?: string;
          room?: string;
          symbol?: string;
          color?: 'blue' | 'lilac' | 'green' | 'yellow';
          preparedness?: number;
          tasks_due?: number;
          tag?: string | null;
          urgent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          ago: string;
          title: string;
          preview: string;
          color: 'yellow' | 'blue' | 'lilac' | 'green' | 'red';
          pinned: boolean;
          has_ai_summary: boolean;
          body: string | null;
          footer: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          ago: string;
          title: string;
          preview: string;
          color: 'yellow' | 'blue' | 'lilac' | 'green' | 'red';
          pinned?: boolean;
          has_ai_summary?: boolean;
          body?: string | null;
          footer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject?: string;
          ago?: string;
          title?: string;
          preview?: string;
          color?: 'yellow' | 'blue' | 'lilac' | 'green' | 'red';
          pinned?: boolean;
          has_ai_summary?: boolean;
          body?: string | null;
          footer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      files: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'pdf' | 'doc' | 'img';
          subject: string;
          updated: string;
          size: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'pdf' | 'doc' | 'img';
          subject: string;
          updated: string;
          size: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'pdf' | 'doc' | 'img';
          subject?: string;
          updated?: string;
          size?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          chat_id: string;
          text: string;
          user: boolean;
          timestamp: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chat_id: string;
          text: string;
          user: boolean;
          timestamp?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chat_id?: string;
          text?: string;
          user?: boolean;
          timestamp?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      saved_chats: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          messages: Json;
          created_at: number;
          updated_at: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          messages: Json;
          created_at?: number;
          updated_at?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          messages?: Json;
          created_at?: number;
          updated_at?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          tone: 'red' | 'blue' | 'yellow' | 'green';
          icon: string;
          title: string;
          detail: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tone: 'red' | 'blue' | 'yellow' | 'green';
          icon: string;
          title: string;
          detail: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tone?: 'red' | 'blue' | 'yellow' | 'green';
          icon?: string;
          title?: string;
          detail?: string;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_config: {
        Row: {
          id: string;
          user_id: string;
          api_key: string;
          model: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          api_key?: string;
          model?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          api_key?: string;
          model?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'])
    ? Database['public']['Tables'][PublicTableNameOrOptions]['Row']
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'])
    ? Database['public']['Tables'][PublicTableNameOrOptions]['Insert']
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'])
    ? Database['public']['Tables'][PublicTableNameOrOptions]['Update']
    : never;