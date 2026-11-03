
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "answer_options": {
                  Row: {
                    "arabic_text": string | null,"id": string,"is_correct": boolean,"position": number,"question_id": string,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arabic_text"?: string | null,"id"?: string,"is_correct"?: boolean,"position"?: number,"question_id": string,"text": string
                  }
                  Update: {
                    "arabic_text"?: string | null,"id"?: string,"is_correct"?: boolean,"position"?: number,"question_id"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "answer_options_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"participant_answers": {
                  Row: {
                    "answered_at": string,"id": string,"is_correct": boolean,"is_late": boolean,"participant_id": string,"points_awarded": number,"question_id": string,"quiz_id": string,"selected_option_ids": (string)[],"started_at": string | null,"text_answer": string | null,"time_ms": number,"timed_out": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string,"id"?: string,"is_correct"?: boolean,"is_late"?: boolean,"participant_id": string,"points_awarded"?: number,"question_id": string,"quiz_id": string,"selected_option_ids"?: (string)[],"started_at"?: string | null,"text_answer"?: string | null,"time_ms"?: number,"timed_out"?: boolean
                  }
                  Update: {
                    "answered_at"?: string,"id"?: string,"is_correct"?: boolean,"is_late"?: boolean,"participant_id"?: string,"points_awarded"?: number,"question_id"?: string,"quiz_id"?: string,"selected_option_ids"?: (string)[],"started_at"?: string | null,"text_answer"?: string | null,"time_ms"?: number,"timed_out"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "participant_answers_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "participant_answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "participant_answers_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    }
                  ]
                },"participants": {
                  Row: {
                    "attempt_no": number,"correct_count": number,"current_index": number,"current_question_started_at": string | null,"display_name": string,"finished_at": string | null,"id": string,"question_order": (string)[],"quiz_id": string,"score": number,"session_id": string | null,"started_at": string,"status": Database["public"]['Enums']["participant_status"],"total_time_ms": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_no"?: number,"correct_count"?: number,"current_index"?: number,"current_question_started_at"?: string | null,"display_name": string,"finished_at"?: string | null,"id"?: string,"question_order"?: (string)[],"quiz_id": string,"score"?: number,"session_id"?: string | null,"started_at"?: string,"status"?: Database["public"]['Enums']["participant_status"],"total_time_ms"?: number,"user_id": string
                  }
                  Update: {
                    "attempt_no"?: number,"correct_count"?: number,"current_index"?: number,"current_question_started_at"?: string | null,"display_name"?: string,"finished_at"?: string | null,"id"?: string,"question_order"?: (string)[],"quiz_id"?: string,"score"?: number,"session_id"?: string | null,"started_at"?: string,"status"?: Database["public"]['Enums']["participant_status"],"total_time_ms"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "participants_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "participants_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "quiz_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"questions": {
                  Row: {
                    "accepted_answers": (string)[],"arabic_original": string | null,"arabic_text": string | null,"book_name": string | null,"chapter": string | null,"created_at": string,"explanation": string | null,"extra_explanation": string | null,"id": string,"image_path": string | null,"kazakh_translation": string | null,"points": number,"position": number,"quiz_id": string,"reference_number": string | null,"reference_type": Database["public"]['Enums']["reference_type"] | null,"source_attribution": string | null,"text": string,"time_limit_seconds": number | null,"type": Database["public"]['Enums']["question_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_answers"?: (string)[],"arabic_original"?: string | null,"arabic_text"?: string | null,"book_name"?: string | null,"chapter"?: string | null,"created_at"?: string,"explanation"?: string | null,"extra_explanation"?: string | null,"id"?: string,"image_path"?: string | null,"kazakh_translation"?: string | null,"points"?: number,"position"?: number,"quiz_id": string,"reference_number"?: string | null,"reference_type"?: Database["public"]['Enums']["reference_type"] | null,"source_attribution"?: string | null,"text": string,"time_limit_seconds"?: number | null,"type": Database["public"]['Enums']["question_type"],"updated_at"?: string
                  }
                  Update: {
                    "accepted_answers"?: (string)[],"arabic_original"?: string | null,"arabic_text"?: string | null,"book_name"?: string | null,"chapter"?: string | null,"created_at"?: string,"explanation"?: string | null,"extra_explanation"?: string | null,"id"?: string,"image_path"?: string | null,"kazakh_translation"?: string | null,"points"?: number,"position"?: number,"quiz_id"?: string,"reference_number"?: string | null,"reference_type"?: Database["public"]['Enums']["reference_type"] | null,"source_attribution"?: string | null,"text"?: string,"time_limit_seconds"?: number | null,"type"?: Database["public"]['Enums']["question_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_categories": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_categories_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_results": {
                  Row: {
                    "accuracy": number,"completed_at": string,"correct_count": number,"display_name": string,"id": string,"participant_id": string,"quiz_id": string,"score": number,"session_id": string | null,"total_questions": number,"total_time_ms": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy": number,"completed_at"?: string,"correct_count": number,"display_name": string,"id"?: string,"participant_id": string,"quiz_id": string,"score": number,"session_id"?: string | null,"total_questions": number,"total_time_ms": number,"user_id": string
                  }
                  Update: {
                    "accuracy"?: number,"completed_at"?: string,"correct_count"?: number,"display_name"?: string,"id"?: string,"participant_id"?: string,"quiz_id"?: string,"score"?: number,"session_id"?: string | null,"total_questions"?: number,"total_time_ms"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_results_participant_id_fkey"
      columns: ["participant_id"]
isOneToOne: true
      referencedRelation: "participants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_results_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_results_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "quiz_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_sessions": {
                  Row: {
                    "created_at": string,"current_index": number,"current_question_id": string | null,"ended_at": string | null,"host_id": string,"id": string,"phase": Database["public"]['Enums']["session_phase"],"question_order": (string)[],"question_started_at": string | null,"quiz_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_index"?: number,"current_question_id"?: string | null,"ended_at"?: string | null,"host_id": string,"id"?: string,"phase"?: Database["public"]['Enums']["session_phase"],"question_order"?: (string)[],"question_started_at"?: string | null,"quiz_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"current_index"?: number,"current_question_id"?: string | null,"ended_at"?: string | null,"host_id"?: string,"id"?: string,"phase"?: Database["public"]['Enums']["session_phase"],"question_order"?: (string)[],"question_started_at"?: string | null,"quiz_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_sessions_current_question_id_fkey"
      columns: ["current_question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_sessions_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_sessions_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    }
                  ]
                },"quizzes": {
                  Row: {
                    "allow_multiple_attempts": boolean,"category_id": string | null,"cover_image_path": string | null,"created_at": string,"description": string | null,"duration_seconds": number | null,"ends_at": string | null,"id": string,"is_public": boolean,"max_participants": number | null,"owner_id": string,"pin_hash": string | null,"published_at": string | null,"question_count": number | null,"show_correct_immediately": boolean,"shuffle_options": boolean,"shuffle_questions": boolean,"slug": string,"speed_bonus": boolean,"starts_at": string | null,"status": Database["public"]['Enums']["quiz_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_multiple_attempts"?: boolean,"category_id"?: string | null,"cover_image_path"?: string | null,"created_at"?: string,"description"?: string | null,"duration_seconds"?: number | null,"ends_at"?: string | null,"id"?: string,"is_public"?: boolean,"max_participants"?: number | null,"owner_id": string,"pin_hash"?: string | null,"published_at"?: string | null,"question_count"?: number | null,"show_correct_immediately"?: boolean,"shuffle_options"?: boolean,"shuffle_questions"?: boolean,"slug": string,"speed_bonus"?: boolean,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["quiz_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "allow_multiple_attempts"?: boolean,"category_id"?: string | null,"cover_image_path"?: string | null,"created_at"?: string,"description"?: string | null,"duration_seconds"?: number | null,"ends_at"?: string | null,"id"?: string,"is_public"?: boolean,"max_participants"?: number | null,"owner_id"?: string,"pin_hash"?: string | null,"published_at"?: string | null,"question_count"?: number | null,"show_correct_immediately"?: boolean,"shuffle_options"?: boolean,"shuffle_questions"?: boolean,"slug"?: string,"speed_bonus"?: boolean,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["quiz_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quizzes_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "quiz_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quizzes_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_answer_feedback":
{ Args: { "p_participant_id": string,"p_question_id": string,"p_reveal": boolean }; Returns: Json
                           },
"_finalize_participant":
{ Args: { "p_participant_id": string }; Returns: undefined
                           },
"_participant_rank":
{ Args: { "p_participant_id": string }; Returns: Json
                           },
"_question_public":
{ Args: { "p_question_id": string,"p_shuffle_seed": string }; Returns: Json
                           },
"_record_answer":
{ Args: { "p_deadline": string,"p_option_ids": (string)[],"p_participant": Omit<Database["public"]['Tables']["participants"]['Row'], Database["public"]['Tables']["participants"]['ComputedFields']>,"p_question_id": string,"p_quiz": Omit<Database["public"]['Tables']["quizzes"]['Row'], Database["public"]['Tables']["quizzes"]['ComputedFields']>,"p_started_at": string,"p_text": string,"p_timed_out": boolean }; Returns: boolean
                           },
"admin_dashboard_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_quiz_statistics":
{ Args: { "p_quiz_id": string }; Returns: Json
                           },
"admin_results_overview":
{ Args: Record<PropertyKey, never>; Returns: {
              "average_score": number,"completed": number,"last_activity": string,"participants": number,"quiz_id": string,"slug": string,"status": Database["public"]['Enums']["quiz_status"],"title": string
            }[]
                           },
"advance_participant":
{ Args: { "p_participant_id": string }; Returns: Json
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: undefined
                           },
"current_role_name":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"get_leaderboard":
{ Args: { "p_limit"?: number,"p_session_id"?: string,"p_slug": string }; Returns: {
              "accuracy": number,"correct_count": number,"display_name": string,"is_me": boolean,"rank": number,"score": number,"total_questions": number,"total_time_ms": number
            }[]
                           },
"get_participant_result":
{ Args: { "p_participant_id": string }; Returns: Json
                           },
"get_participant_state":
{ Args: { "p_participant_id": string }; Returns: Json
                           },
"get_public_quiz":
{ Args: { "p_slug": string }; Returns: Json
                           },
"host_control":
{ Args: { "p_action": string,"p_session_id": string }; Returns: undefined
                           },
"host_open_session":
{ Args: { "p_quiz_id": string }; Returns: string
                           },
"host_session_state":
{ Args: { "p_session_id": string }; Returns: Json
                           },
"is_session_participant":
{ Args: { "p_session_id": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_super_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"join_quiz":
{ Args: { "p_name": string,"p_pin"?: string,"p_slug": string }; Returns: string
                           },
"list_public_quizzes":
{ Args: Record<PropertyKey, never>; Returns: {
              "category": string,"description": string,"ends_at": string,"question_total": number,"slug": string,"starts_at": string,"title": string
            }[]
                           },
"normalize_answer":
{ Args: { "p_text": string }; Returns: string
                           },
"owns_quiz":
{ Args: { "p_quiz_id": string }; Returns: boolean
                           },
"promote_super_admin":
{ Args: { "p_email": string }; Returns: undefined
                           },
"set_quiz_pin":
{ Args: { "p_pin": string,"p_quiz_id": string }; Returns: undefined
                           },
"set_user_role":
{ Args: { "p_role": Database["public"]['Enums']["user_role"],"p_user_id": string }; Returns: undefined
                           },
"submit_answer":
{ Args: { "p_option_ids"?: (string)[],"p_participant_id": string,"p_question_id": string,"p_text"?: string }; Returns: Json
                           }
          }
          Enums: {
            "participant_status": "in_progress"|"completed","question_type": "single"|"multiple"|"true_false"|"text","quiz_status": "draft"|"published"|"archived","reference_type": "quran"|"hadith"|"other","session_phase": "lobby"|"question"|"reveal"|"leaderboard"|"ended","user_role": "super_admin"|"creator"|"pending"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "participant_status": ["in_progress", "completed"],"question_type": ["single", "multiple", "true_false", "text"],"quiz_status": ["draft", "published", "archived"],"reference_type": ["quran", "hadith", "other"],"session_phase": ["lobby", "question", "reveal", "leaderboard", "ended"],"user_role": ["super_admin", "creator", "pending"]
          }
        }
} as const
