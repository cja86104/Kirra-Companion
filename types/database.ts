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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          category: string
          created_at: string
          creativity_value: number
          description: string | null
          duration_minutes: number
          energy_cost: number
          fun_value: number
          icon: string | null
          id: string
          intellectual_value: number
          is_active: boolean
          is_multiplayer: boolean
          min_tier: Database["public"]["Enums"]["subscription_tier"]
          name: string
          social_value: number
        }
        Insert: {
          category: string
          created_at?: string
          creativity_value?: number
          description?: string | null
          duration_minutes?: number
          energy_cost?: number
          fun_value?: number
          icon?: string | null
          id?: string
          intellectual_value?: number
          is_active?: boolean
          is_multiplayer?: boolean
          min_tier?: Database["public"]["Enums"]["subscription_tier"]
          name: string
          social_value?: number
        }
        Update: {
          category?: string
          created_at?: string
          creativity_value?: number
          description?: string | null
          duration_minutes?: number
          energy_cost?: number
          fun_value?: number
          icon?: string | null
          id?: string
          intellectual_value?: number
          is_active?: boolean
          is_multiplayer?: boolean
          min_tier?: Database["public"]["Enums"]["subscription_tier"]
          name?: string
          social_value?: number
        }
        Relationships: []
      }
      activity_sessions: {
        Row: {
          activity_id: string
          companion_id: string
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          outcome: Json | null
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          companion_id: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          outcome?: Json | null
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          companion_id?: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          outcome?: Json | null
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_sessions_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          count: number
          created_at: string
          id: string
          route_key: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          route_key: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          route_key?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_detection_logs: {
        Row: {
          categories: string[]
          confidence: number
          created_at: string
          detected_age: number | null
          id: string
          message_excerpt: string
          resulted_in_flag: boolean
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          triggers: string[]
          user_id: string
        }
        Insert: {
          categories?: string[]
          confidence: number
          created_at?: string
          detected_age?: number | null
          id?: string
          message_excerpt: string
          resulted_in_flag?: boolean
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          triggers?: string[]
          user_id: string
        }
        Update: {
          categories?: string[]
          confidence?: number
          created_at?: string
          detected_age?: number | null
          id?: string
          message_excerpt?: string
          resulted_in_flag?: boolean
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          triggers?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_detection_logs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavioral_detection_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_activities: {
        Row: {
          activity_category: string
          activity_name: string
          companion_id: string
          created_at: string
          description: string
          duration_minutes: number
          ended_at: string | null
          id: string
          mood_effects_applied: Json | null
          narrative: string
          outcome: string | null
          related_interest_id: string | null
          started_at: string
          template_id: string
          thinking_of_user: boolean
          user_mention_context: string | null
        }
        Insert: {
          activity_category: string
          activity_name: string
          companion_id: string
          created_at?: string
          description?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          mood_effects_applied?: Json | null
          narrative?: string
          outcome?: string | null
          related_interest_id?: string | null
          started_at?: string
          template_id: string
          thinking_of_user?: boolean
          user_mention_context?: string | null
        }
        Update: {
          activity_category?: string
          activity_name?: string
          companion_id?: string
          created_at?: string
          description?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          mood_effects_applied?: Json | null
          narrative?: string
          outcome?: string | null
          related_interest_id?: string | null
          started_at?: string
          template_id?: string
          thinking_of_user?: boolean
          user_mention_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companion_activities_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_activities_related_interest_id_fkey"
            columns: ["related_interest_id"]
            isOneToOne: false
            referencedRelation: "companion_interests"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_creation_audit: {
        Row: {
          companion_id: string | null
          created_at: string | null
          id: string
          is_minor_flagged: boolean | null
          relationship_type: string | null
          user_age_tier: string | null
          user_id: string | null
          was_blocked: boolean | null
        }
        Insert: {
          companion_id?: string | null
          created_at?: string | null
          id?: string
          is_minor_flagged?: boolean | null
          relationship_type?: string | null
          user_age_tier?: string | null
          user_id?: string | null
          was_blocked?: boolean | null
        }
        Update: {
          companion_id?: string | null
          created_at?: string | null
          id?: string
          is_minor_flagged?: boolean | null
          relationship_type?: string | null
          user_age_tier?: string | null
          user_id?: string | null
          was_blocked?: boolean | null
        }
        Relationships: []
      }
      companion_dna: {
        Row: {
          communication_dialect: Json | null
          companion_id: string
          core_traits: Json | null
          created_at: string
          emotional_patterns: Json | null
          emotional_resonance_map: Json | null
          growth_areas: string[] | null
          humor_genome: Json | null
          id: string
          interest_evolution_tree: Json | null
          last_evolution: string | null
          learning_style_matrix: Json | null
          memory_weighting_algorithm: Json | null
          personality_version: number
          updated_at: string
        }
        Insert: {
          communication_dialect?: Json | null
          companion_id: string
          core_traits?: Json | null
          created_at?: string
          emotional_patterns?: Json | null
          emotional_resonance_map?: Json | null
          growth_areas?: string[] | null
          humor_genome?: Json | null
          id?: string
          interest_evolution_tree?: Json | null
          last_evolution?: string | null
          learning_style_matrix?: Json | null
          memory_weighting_algorithm?: Json | null
          personality_version?: number
          updated_at?: string
        }
        Update: {
          communication_dialect?: Json | null
          companion_id?: string
          core_traits?: Json | null
          created_at?: string
          emotional_patterns?: Json | null
          emotional_resonance_map?: Json | null
          growth_areas?: string[] | null
          humor_genome?: Json | null
          id?: string
          interest_evolution_tree?: Json | null
          last_evolution?: string | null
          learning_style_matrix?: Json | null
          memory_weighting_algorithm?: Json | null
          personality_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_dna_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: true
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_interests: {
        Row: {
          companion_id: string
          conversation_mentions: number
          developed_at: string
          experience_points: number
          favorite_aspects: string[] | null
          growth_rate: number | null
          id: string
          interest_category: string
          interest_level: number | null
          interest_name: string
          is_active: boolean
          last_engaged: string | null
          origin: string
          related_interests: string[] | null
          shared_with_user: boolean
          source: string | null
          source_details: string | null
          stage: string
          strength: number
          times_discussed: number | null
          times_practiced: number
          updated_at: string
          user_interest_level: number | null
        }
        Insert: {
          companion_id: string
          conversation_mentions?: number
          developed_at?: string
          experience_points?: number
          favorite_aspects?: string[] | null
          growth_rate?: number | null
          id?: string
          interest_category: string
          interest_level?: number | null
          interest_name: string
          is_active?: boolean
          last_engaged?: string | null
          origin?: string
          related_interests?: string[] | null
          shared_with_user?: boolean
          source?: string | null
          source_details?: string | null
          stage?: string
          strength?: number
          times_discussed?: number | null
          times_practiced?: number
          updated_at?: string
          user_interest_level?: number | null
        }
        Update: {
          companion_id?: string
          conversation_mentions?: number
          developed_at?: string
          experience_points?: number
          favorite_aspects?: string[] | null
          growth_rate?: number | null
          id?: string
          interest_category?: string
          interest_level?: number | null
          interest_name?: string
          is_active?: boolean
          last_engaged?: string | null
          origin?: string
          related_interests?: string[] | null
          shared_with_user?: boolean
          source?: string | null
          source_details?: string | null
          stage?: string
          strength?: number
          times_discussed?: number | null
          times_practiced?: number
          updated_at?: string
          user_interest_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "companion_interests_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_journal_entries: {
        Row: {
          companion_id: string
          content: string
          created_at: string
          entry_type: string
          id: string
          is_private: boolean
          mentions_user: boolean
          mood_at_time: Json
          related_event_id: string | null
          related_interest_id: string | null
          title: string | null
          written_at: string
        }
        Insert: {
          companion_id: string
          content: string
          created_at?: string
          entry_type: string
          id?: string
          is_private?: boolean
          mentions_user?: boolean
          mood_at_time: Json
          related_event_id?: string | null
          related_interest_id?: string | null
          title?: string | null
          written_at?: string
        }
        Update: {
          companion_id?: string
          content?: string
          created_at?: string
          entry_type?: string
          id?: string
          is_private?: boolean
          mentions_user?: boolean
          mood_at_time?: Json
          related_event_id?: string | null
          related_interest_id?: string | null
          title?: string | null
          written_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_journal_entries_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_journal_entries_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "life_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_journal_entries_related_interest_id_fkey"
            columns: ["related_interest_id"]
            isOneToOne: false
            referencedRelation: "companion_interests"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_skills: {
        Row: {
          companion_id: string
          confidence_score: number
          created_at: string
          failed_uses: number
          id: string
          is_active: boolean
          is_favorite: boolean
          last_used: string | null
          last_used_at: string | null
          learned_from: string | null
          metadata: Json | null
          proficiency: Database["public"]["Enums"]["skill_proficiency"]
          proficiency_level: number | null
          skill_category: Database["public"]["Enums"]["skill_category"]
          skill_content: string
          skill_description: string | null
          skill_name: string
          skill_summary: string | null
          structured_data: Json | null
          successful_uses: number
          tags: string[] | null
          taught_at: string
          taught_via: string
          teaching_context: string | null
          times_reinforced: number
          times_used: number
          updated_at: string
        }
        Insert: {
          companion_id: string
          confidence_score?: number
          created_at?: string
          failed_uses?: number
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          last_used?: string | null
          last_used_at?: string | null
          learned_from?: string | null
          metadata?: Json | null
          proficiency?: Database["public"]["Enums"]["skill_proficiency"]
          proficiency_level?: number | null
          skill_category?: Database["public"]["Enums"]["skill_category"]
          skill_content: string
          skill_description?: string | null
          skill_name: string
          skill_summary?: string | null
          structured_data?: Json | null
          successful_uses?: number
          tags?: string[] | null
          taught_at?: string
          taught_via?: string
          teaching_context?: string | null
          times_reinforced?: number
          times_used?: number
          updated_at?: string
        }
        Update: {
          companion_id?: string
          confidence_score?: number
          created_at?: string
          failed_uses?: number
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          last_used?: string | null
          last_used_at?: string | null
          learned_from?: string | null
          metadata?: Json | null
          proficiency?: Database["public"]["Enums"]["skill_proficiency"]
          proficiency_level?: number | null
          skill_category?: Database["public"]["Enums"]["skill_category"]
          skill_content?: string
          skill_description?: string | null
          skill_name?: string
          skill_summary?: string | null
          structured_data?: Json | null
          successful_uses?: number
          tags?: string[] | null
          taught_at?: string
          taught_via?: string
          teaching_context?: string | null
          times_reinforced?: number
          times_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_skills_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companions: {
        Row: {
          affection_level: number
          avatar_3d_config: Json | null
          avatar_url: string | null
          backstory: string | null
          backstory_normalized: string | null
          backstory_normalized_hash: string | null
          created_at: string
          current_mood: Json | null
          id: string
          interests: string[] | null
          is_active: boolean
          last_interaction: string | null
          name: string
          needs: Json | null
          personality_base: Json | null
          quirks: string[] | null
          relationship_label: string | null
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          total_activities: number
          total_messages: number
          total_voice_minutes: number
          trust_level: number
          updated_at: string
          user_id: string
          voice_config: Json | null
        }
        Insert: {
          affection_level?: number
          avatar_3d_config?: Json | null
          avatar_url?: string | null
          backstory?: string | null
          backstory_normalized?: string | null
          backstory_normalized_hash?: string | null
          created_at?: string
          current_mood?: Json | null
          id?: string
          interests?: string[] | null
          is_active?: boolean
          last_interaction?: string | null
          name: string
          needs?: Json | null
          personality_base?: Json | null
          quirks?: string[] | null
          relationship_label?: string | null
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          total_activities?: number
          total_messages?: number
          total_voice_minutes?: number
          trust_level?: number
          updated_at?: string
          user_id: string
          voice_config?: Json | null
        }
        Update: {
          affection_level?: number
          avatar_3d_config?: Json | null
          avatar_url?: string | null
          backstory?: string | null
          backstory_normalized?: string | null
          backstory_normalized_hash?: string | null
          created_at?: string
          current_mood?: Json | null
          id?: string
          interests?: string[] | null
          is_active?: boolean
          last_interaction?: string | null
          name?: string
          needs?: Json | null
          personality_base?: Json | null
          quirks?: string[] | null
          relationship_label?: string | null
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          total_activities?: number
          total_messages?: number
          total_voice_minutes?: number
          trust_level?: number
          updated_at?: string
          user_id?: string
          voice_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "companions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          companion_id: string
          created_at: string
          id: string
          is_archived: boolean
          last_message_at: string | null
          message_count: number
          mood_summary: Json | null
          summary: string | null
          title: string | null
          topics: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          message_count?: number
          mood_summary?: Json | null
          summary?: string | null
          title?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          message_count?: number
          mood_summary?: Json | null
          summary?: string | null
          title?: string | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_logs: {
        Row: {
          companion_id: string | null
          conversation_id: string | null
          created_at: string
          crisis_type: Database["public"]["Enums"]["crisis_type"]
          id: string
          keywords_matched: string[]
          message_excerpt: string
          notes: string | null
          response_provided: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          severity: Database["public"]["Enums"]["crisis_severity"]
          user_id: string
        }
        Insert: {
          companion_id?: string | null
          conversation_id?: string | null
          created_at?: string
          crisis_type: Database["public"]["Enums"]["crisis_type"]
          id?: string
          keywords_matched?: string[]
          message_excerpt: string
          notes?: string | null
          response_provided: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity: Database["public"]["Enums"]["crisis_severity"]
          user_id: string
        }
        Update: {
          companion_id?: string | null
          conversation_id?: string | null
          created_at?: string
          crisis_type?: Database["public"]["Enums"]["crisis_type"]
          id?: string
          keywords_matched?: string[]
          message_excerpt?: string
          notes?: string | null
          response_provided?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["crisis_severity"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crisis_logs_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crisis_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crisis_logs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crisis_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_routines: {
        Row: {
          companion_id: string
          created_at: string
          energy_pattern: string
          id: string
          is_default: boolean
          name: string
          sleep_time: string
          slots: Json
          social_windows: Json
          updated_at: string
          wake_time: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          energy_pattern?: string
          id?: string
          is_default?: boolean
          name?: string
          sleep_time?: string
          slots?: Json
          social_windows?: Json
          updated_at?: string
          wake_time?: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          energy_pattern?: string
          id?: string
          is_default?: boolean
          name?: string
          sleep_time?: string
          slots?: Json
          social_windows?: Json
          updated_at?: string
          wake_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_routines_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          completed_at: string | null
          error_message: string | null
          expires_at: string | null
          export_type: string
          file_size: number | null
          file_url: string | null
          id: string
          requested_at: string
          status: Database["public"]["Enums"]["export_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["export_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          requested_at?: string
          status?: Database["public"]["Enums"]["export_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_scenes: {
        Row: {
          animation_type: string | null
          audio_track: string | null
          companion_id: string
          conversation_id: string | null
          created_at: string | null
          entities: Json | null
          expires_at: string | null
          generation_time_ms: number | null
          id: string
          image_url: string
          model_used: string | null
          prompt: string
          scene_description: string | null
          theme: string | null
          user_id: string
        }
        Insert: {
          animation_type?: string | null
          audio_track?: string | null
          companion_id: string
          conversation_id?: string | null
          created_at?: string | null
          entities?: Json | null
          expires_at?: string | null
          generation_time_ms?: number | null
          id?: string
          image_url: string
          model_used?: string | null
          prompt: string
          scene_description?: string | null
          theme?: string | null
          user_id: string
        }
        Update: {
          animation_type?: string | null
          audio_track?: string | null
          companion_id?: string
          conversation_id?: string | null
          created_at?: string | null
          entities?: Json | null
          expires_at?: string | null
          generation_time_ms?: number | null
          id?: string
          image_url?: string
          model_used?: string | null
          prompt?: string
          scene_description?: string | null
          theme?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_scenes_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_scenes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_connections: {
        Row: {
          connection_type: string
          discovered_at: string
          id: string
          interest_id: string
          related_interest_id: string
          strength: number
        }
        Insert: {
          connection_type: string
          discovered_at?: string
          id?: string
          interest_id: string
          related_interest_id: string
          strength?: number
        }
        Update: {
          connection_type?: string
          discovered_at?: string
          id?: string
          interest_id?: string
          related_interest_id?: string
          strength?: number
        }
        Relationships: [
          {
            foreignKeyName: "interest_connections_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "companion_interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_connections_related_interest_id_fkey"
            columns: ["related_interest_id"]
            isOneToOne: false
            referencedRelation: "companion_interests"
            referencedColumns: ["id"]
          },
        ]
      }
      life_events: {
        Row: {
          companion_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          emoji: string | null
          emotional_impact: Json | null
          event_type: string
          id: string
          involves_user: boolean
          metadata: Json | null
          mood_after: Json | null
          mood_before: Json | null
          narrative: string | null
          notification_message: string | null
          notified_at: string | null
          occurred_at: string
          related_activity_id: string | null
          related_interest_id: string | null
          scheduled_at: string | null
          shareable: boolean
          shared_with_user: boolean
          should_notify_user: boolean
          significance: Database["public"]["Enums"]["event_significance"]
          title: string
          user_context: string | null
        }
        Insert: {
          companion_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          emoji?: string | null
          emotional_impact?: Json | null
          event_type: string
          id?: string
          involves_user?: boolean
          metadata?: Json | null
          mood_after?: Json | null
          mood_before?: Json | null
          narrative?: string | null
          notification_message?: string | null
          notified_at?: string | null
          occurred_at?: string
          related_activity_id?: string | null
          related_interest_id?: string | null
          scheduled_at?: string | null
          shareable?: boolean
          shared_with_user?: boolean
          should_notify_user?: boolean
          significance?: Database["public"]["Enums"]["event_significance"]
          title: string
          user_context?: string | null
        }
        Update: {
          companion_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          emoji?: string | null
          emotional_impact?: Json | null
          event_type?: string
          id?: string
          involves_user?: boolean
          metadata?: Json | null
          mood_after?: Json | null
          mood_before?: Json | null
          narrative?: string | null
          notification_message?: string | null
          notified_at?: string | null
          occurred_at?: string
          related_activity_id?: string | null
          related_interest_id?: string | null
          scheduled_at?: string | null
          shareable?: boolean
          shared_with_user?: boolean
          should_notify_user?: boolean
          significance?: Database["public"]["Enums"]["event_significance"]
          title?: string
          user_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "life_events_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_events_related_activity_id_fkey"
            columns: ["related_activity_id"]
            isOneToOne: false
            referencedRelation: "companion_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_events_related_interest_id_fkey"
            columns: ["related_interest_id"]
            isOneToOne: false
            referencedRelation: "companion_interests"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          access_count: number
          category_id: string | null
          companion_id: string
          content: string
          created_at: string
          embedding: string | null
          emotional_context: Json | null
          emotional_weight: number | null
          id: string
          importance: number | null
          importance_score: number
          is_active: boolean
          is_core_memory: boolean
          is_pinned: boolean
          is_verified: boolean
          last_accessed: string | null
          memory_type: string | null
          source_conversation_id: string | null
          source_message_id: string | null
          source_type: string
          summary: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          access_count?: number
          category_id?: string | null
          companion_id: string
          content: string
          created_at?: string
          embedding?: string | null
          emotional_context?: Json | null
          emotional_weight?: number | null
          id?: string
          importance?: number | null
          importance_score?: number
          is_active?: boolean
          is_core_memory?: boolean
          is_pinned?: boolean
          is_verified?: boolean
          last_accessed?: string | null
          memory_type?: string | null
          source_conversation_id?: string | null
          source_message_id?: string | null
          source_type?: string
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          access_count?: number
          category_id?: string | null
          companion_id?: string
          content?: string
          created_at?: string
          embedding?: string | null
          emotional_context?: Json | null
          emotional_weight?: number | null
          id?: string
          importance?: number | null
          importance_score?: number
          is_active?: boolean
          is_core_memory?: boolean
          is_pinned?: boolean
          is_verified?: boolean
          last_accessed?: string | null
          memory_type?: string | null
          source_conversation_id?: string | null
          source_message_id?: string | null
          source_type?: string
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "memory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_access_log: {
        Row: {
          access_type: Database["public"]["Enums"]["memory_access_type"]
          companion_id: string
          context: string | null
          created_at: string
          id: string
          memory_id: string
        }
        Insert: {
          access_type: Database["public"]["Enums"]["memory_access_type"]
          companion_id: string
          context?: string | null
          created_at?: string
          id?: string
          memory_id: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["memory_access_type"]
          companion_id?: string
          context?: string | null
          created_at?: string
          id?: string
          memory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_access_log_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_access_log_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "companion_memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_access_log_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_system: boolean
          name: string
          priority: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          priority?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          priority?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          companion_id: string
          content: string
          content_type: Database["public"]["Enums"]["content_type"]
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          is_edited: boolean
          metadata: Json | null
          role: Database["public"]["Enums"]["message_role"]
          tokens_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          companion_id: string
          content: string
          content_type?: Database["public"]["Enums"]["content_type"]
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          metadata?: Json | null
          role: Database["public"]["Enums"]["message_role"]
          tokens_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          companion_id?: string
          content?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          metadata?: Json | null
          role?: Database["public"]["Enums"]["message_role"]
          tokens_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proactive_messages: {
        Row: {
          companion_id: string
          content: string
          context_snapshot: Json | null
          created_at: string
          expired_at: string | null
          generated_content: string | null
          id: string
          metadata: Json | null
          priority: string
          read: boolean
          read_at: string | null
          related_activity_id: string | null
          related_interest_id: string | null
          related_life_event_id: string | null
          responded_at: string | null
          scheduled_for: string | null
          seen_at: string | null
          sent_at: string | null
          status: string
          trigger_type: string
          user_id: string
        }
        Insert: {
          companion_id: string
          content: string
          context_snapshot?: Json | null
          created_at?: string
          expired_at?: string | null
          generated_content?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          read?: boolean
          read_at?: string | null
          related_activity_id?: string | null
          related_interest_id?: string | null
          related_life_event_id?: string | null
          responded_at?: string | null
          scheduled_for?: string | null
          seen_at?: string | null
          sent_at?: string | null
          status?: string
          trigger_type: string
          user_id: string
        }
        Update: {
          companion_id?: string
          content?: string
          context_snapshot?: Json | null
          created_at?: string
          expired_at?: string | null
          generated_content?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          read?: boolean
          read_at?: string | null
          related_activity_id?: string | null
          related_interest_id?: string | null
          related_life_event_id?: string | null
          responded_at?: string | null
          scheduled_for?: string | null
          seen_at?: string | null
          sent_at?: string | null
          status?: string
          trigger_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proactive_messages_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_messages_related_activity_id_fkey"
            columns: ["related_activity_id"]
            isOneToOne: false
            referencedRelation: "companion_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_messages_related_interest_id_fkey"
            columns: ["related_interest_id"]
            isOneToOne: false
            referencedRelation: "companion_interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_messages_related_life_event_id_fkey"
            columns: ["related_life_event_id"]
            isOneToOne: false
            referencedRelation: "life_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_tier: Database["public"]["Enums"]["age_tier"]
          avatar_url: string | null
          behavioral_profile: Json | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string | null
          id: string
          is_admin: boolean
          is_minor_flagged: boolean
          messages_reset_at: string
          messages_today: number
          minor_flag_reason: string | null
          minor_flagged_at: string | null
          preferences: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_period_end: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          timezone: string | null
          updated_at: string
          voice_characters_reset_at: string | null
          voice_characters_used: number | null
        }
        Insert: {
          age_tier?: Database["public"]["Enums"]["age_tier"]
          avatar_url?: string | null
          behavioral_profile?: Json | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          is_minor_flagged?: boolean
          messages_reset_at?: string
          messages_today?: number
          minor_flag_reason?: string | null
          minor_flagged_at?: string | null
          preferences?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string | null
          updated_at?: string
          voice_characters_reset_at?: string | null
          voice_characters_used?: number | null
        }
        Update: {
          age_tier?: Database["public"]["Enums"]["age_tier"]
          avatar_url?: string | null
          behavioral_profile?: Json | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          is_minor_flagged?: boolean
          messages_reset_at?: string
          messages_today?: number
          minor_flag_reason?: string | null
          minor_flagged_at?: string | null
          preferences?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string | null
          updated_at?: string
          voice_characters_reset_at?: string | null
          voice_characters_used?: number | null
        }
        Relationships: []
      }
      relationship_milestones: {
        Row: {
          achieved_at: string
          achieved_value: number | null
          celebrated: boolean
          companion_id: string
          created_at: string
          description: string | null
          id: string
          milestone_type: string
          threshold_value: number | null
          title: string
          unlocks: string[] | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          achieved_value?: number | null
          celebrated?: boolean
          companion_id: string
          created_at?: string
          description?: string | null
          id?: string
          milestone_type: string
          threshold_value?: number | null
          title: string
          unlocks?: string[] | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          achieved_value?: number | null
          celebrated?: boolean
          companion_id?: string
          created_at?: string
          description?: string | null
          id?: string
          milestone_type?: string
          threshold_value?: number | null
          title?: string
          unlocks?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_milestones_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_generation_tracker: {
        Row: {
          companion_id: string
          generation_count: number | null
          id: string
          last_generation_at: string | null
          last_theme: string | null
          user_id: string
        }
        Insert: {
          companion_id: string
          generation_count?: number | null
          id?: string
          last_generation_at?: string | null
          last_theme?: string | null
          user_id: string
        }
        Update: {
          companion_id?: string
          generation_count?: number | null
          id?: string
          last_generation_at?: string | null
          last_theme?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_generation_tracker_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_states: {
        Row: {
          activities_today: number
          companion_id: string
          created_at: string
          current_activity_id: string | null
          id: string
          is_sleeping: boolean
          last_activity_at: string | null
          last_journal_at: string | null
          last_proactive_message_at: string | null
          last_simulation_at: string
          next_scheduled_at: string
          simulation_version: number
          updated_at: string
        }
        Insert: {
          activities_today?: number
          companion_id: string
          created_at?: string
          current_activity_id?: string | null
          id?: string
          is_sleeping?: boolean
          last_activity_at?: string | null
          last_journal_at?: string | null
          last_proactive_message_at?: string | null
          last_simulation_at?: string
          next_scheduled_at?: string
          simulation_version?: number
          updated_at?: string
        }
        Update: {
          activities_today?: number
          companion_id?: string
          created_at?: string
          current_activity_id?: string | null
          id?: string
          is_sleeping?: boolean
          last_activity_at?: string | null
          last_journal_at?: string | null
          last_proactive_message_at?: string | null
          last_simulation_at?: string
          next_scheduled_at?: string
          simulation_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_states_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: true
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_usage_log: {
        Row: {
          companion_id: string
          id: string
          message_id: string | null
          skill_id: string
          usage_type: string
          used_at: string
          user_feedback: string | null
          was_successful: boolean | null
        }
        Insert: {
          companion_id: string
          id?: string
          message_id?: string | null
          skill_id: string
          usage_type?: string
          used_at?: string
          user_feedback?: string | null
          was_successful?: boolean | null
        }
        Update: {
          companion_id?: string
          id?: string
          message_id?: string | null
          skill_id?: string
          usage_type?: string
          used_at?: string
          user_feedback?: string | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_usage_log_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_usage_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_usage_log_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "companion_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      trivia_games: {
        Row: {
          answers: Json | null
          category: string
          companion_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          score: number
          started_at: string
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          category: string
          companion_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          score?: number
          started_at: string
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          category?: string
          companion_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          score?: number
          started_at?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          rarity: Database["public"]["Enums"]["achievement_rarity"]
          title: string
          unlocked_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          achievement_id: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          title: string
          unlocked_at?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          achievement_id?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          title?: string
          unlocked_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      companion_memories: {
        Row: {
          access_count: number | null
          category_id: string | null
          companion_id: string | null
          companion_name: string | null
          content: string | null
          created_at: string | null
          embedding: string | null
          emotional_context: Json | null
          id: string | null
          importance_score: number | null
          is_core_memory: boolean | null
          last_accessed: string | null
          memory_type: string | null
          source_conversation_id: string | null
          source_message_id: string | null
          summary: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "memory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_age: { Args: { dob: string }; Returns: number }
      can_access_activity: {
        Args: { p_activity_id: string; p_user_id: string }
        Returns: boolean
      }
      can_access_romantic_content: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      can_send_message: { Args: { user_id: string }; Returns: boolean }
      check_and_award_milestone: {
        Args: {
          p_celebration_message?: string
          p_companion_id: string
          p_description?: string
          p_milestone_type: Database["public"]["Enums"]["milestone_type"]
          p_title: string
        }
        Returns: string
      }
      check_user_age_tier_valid: { Args: never; Returns: boolean }
      cleanup_expired_scenes: { Args: never; Returns: undefined }
      complete_activity_session: {
        Args: {
          p_outcome?: string
          p_score?: number
          p_session_id: string
          p_user_rating?: number
        }
        Returns: Json
      }
      create_conversation: {
        Args: { p_companion_id: string; p_user_id: string }
        Returns: string
      }
      create_memory: {
        Args: {
          p_category_slug: string
          p_companion_id: string
          p_content: string
          p_importance?: number
          p_is_core?: boolean
          p_source_type?: string
          p_title: string
        }
        Returns: string
      }
      flag_user_as_minor:
        | { Args: { p_reason: string; p_user_id: string }; Returns: undefined }
        | {
            Args: {
              p_confidence?: number
              p_reason: string
              p_triggers?: string[]
              p_user_id: string
            }
            Returns: boolean
          }
      generate_short_id: { Args: never; Returns: string }
      get_age_tier: {
        Args: { dob: string }
        Returns: Database["public"]["Enums"]["age_tier"]
      }
      get_crisis_statistics: {
        Args: { p_days?: number }
        Returns: {
          by_day: Json
          by_type: Json
          critical_crises: number
          escalated_crises: number
          false_positives: number
          high_crises: number
          low_crises: number
          medium_crises: number
          total_crises: number
          unreviewed_crises: number
        }[]
      }
      get_memory_context: {
        Args: {
          p_companion_id: string
          p_limit?: number
          p_query_embedding: string
        }
        Returns: {
          combined_score: number
          content: string
          id: string
          importance_score: number
          is_core_identity: boolean
          relevance_score: number
          summary: string
        }[]
      }
      get_or_create_conversation: {
        Args: {
          p_companion_id: string
          p_max_idle_minutes?: number
          p_user_id: string
        }
        Returns: string
      }
      get_pending_notifications: {
        Args: { p_companion_id: string }
        Returns: {
          event_id: string
          event_type: Database["public"]["Enums"]["life_event_type"]
          message: string
          scheduled_at: string
          title: string
        }[]
      }
      get_relevant_skills: {
        Args: {
          p_companion_id: string
          p_limit?: number
          p_search_text: string
        }
        Returns: {
          confidence_score: number
          id: string
          proficiency: Database["public"]["Enums"]["skill_proficiency"]
          relevance_rank: number
          skill_category: Database["public"]["Enums"]["skill_category"]
          skill_content: string
          skill_name: string
          skill_summary: string
        }[]
      }
      get_safe_relationship_types: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_top_memories: {
        Args: { p_companion_id: string; p_limit?: number }
        Returns: {
          category_name: string
          content: string
          id: string
          importance_score: number
          is_core_identity: boolean
          title: string
        }[]
      }
      increment_message_count: { Args: { user_id: string }; Returns: undefined }
      increment_rate_limit: {
        Args: {
          p_route_key: string
          p_user_id: string
          p_window_seconds: number
        }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      log_memory_access: {
        Args: {
          p_access_type?: string
          p_companion_id: string
          p_context?: Json
          p_conversation_id?: string
          p_memory_id: string
          p_message_id?: string
          p_query_text?: string
          p_relevance_score?: number
        }
        Returns: string
      }
      match_memories: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_companion_id?: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
        }[]
      }
      record_memory_access: {
        Args: { p_access_type: string; p_context?: Json; p_memory_id: string }
        Returns: undefined
      }
      request_data_export: {
        Args: {
          p_date_range_end?: string
          p_date_range_start?: string
          p_export_type?: string
          p_format?: string
          p_include_deleted?: boolean
          p_user_id: string
        }
        Returns: string
      }
      search_memories: {
        Args: { p_companion_id: string; p_limit?: number; p_query: string }
        Returns: {
          category_name: string
          content: string
          id: string
          importance_score: number
          rank: number
          title: string
        }[]
      }
      should_treat_as_minor: { Args: { p_user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_affection: {
        Args: { p_companion_id: string; p_delta: number }
        Returns: number
      }
      update_companion_interaction: {
        Args: {
          p_companion_id: string
          p_message_count?: number
          p_voice_minutes?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      achievement_rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
      activity_type:
        | "game"
        | "watch"
        | "create"
        | "learn"
        | "explore"
        | "workout"
        | "meditate"
        | "social"
        | "adventure"
        | "exercise"
        | "relax"
      age_tier: "blocked" | "minor" | "adult"
      content_type: "text" | "image" | "audio" | "file"
      crisis_severity: "low" | "medium" | "high" | "critical"
      crisis_type: "self_harm" | "harm_to_others" | "abuse" | "none"
      event_significance:
        | "trivial"
        | "minor"
        | "moderate"
        | "major"
        | "milestone"
      export_status: "pending" | "processing" | "completed" | "failed"
      export_type: "full" | "companion" | "memories" | "conversations"
      life_event_type:
        | "wake_up"
        | "morning_routine"
        | "breakfast"
        | "work_activity"
        | "lunch"
        | "hobby_time"
        | "exercise"
        | "dinner"
        | "evening_relaxation"
        | "sleep"
        | "learning_new_skill"
        | "reading"
        | "practicing_hobby"
        | "discovered_interest"
        | "thinking_of_user"
        | "missing_user"
        | "excited_to_chat"
        | "wants_to_share"
        | "mood_shift"
        | "reflection"
        | "daydreaming"
        | "feeling_grateful"
        | "anniversary"
        | "milestone_reached"
        | "new_goal_set"
        | "achievement_unlocked"
        | "created_something"
        | "had_idea"
        | "wrote_journal"
        | "custom"
      memory_access_type: "retrieval" | "update" | "reinforcement"
      memory_category:
        | "fact"
        | "emotion"
        | "preference"
        | "event"
        | "relationship"
        | "goal"
      message_role: "user" | "companion" | "system"
      milestone_type:
        | "first_conversation"
        | "first_week"
        | "first_month"
        | "messages_100"
        | "messages_500"
        | "messages_1000"
        | "messages_5000"
        | "trust_25"
        | "trust_50"
        | "trust_75"
        | "trust_100"
        | "affection_25"
        | "affection_50"
        | "affection_75"
        | "affection_100"
        | "first_activity"
        | "activities_10"
        | "activities_50"
        | "shared_secret"
        | "overcame_conflict"
        | "anniversary"
      relationship_type: "friend" | "mentor" | "romantic" | "family" | "custom"
      skill_category:
        | "coding"
        | "recipes"
        | "domain"
        | "traditions"
        | "games"
        | "creative"
        | "language"
        | "procedures"
        | "trivia"
        | "other"
      skill_proficiency:
        | "novice"
        | "familiar"
        | "competent"
        | "proficient"
        | "expert"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "trialing"
        | "incomplete"
      subscription_tier: "free" | "basic" | "pro" | "ultimate"
      task_status: "pending" | "processing" | "completed" | "failed"
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
      achievement_rarity: ["common", "uncommon", "rare", "epic", "legendary"],
      activity_type: [
        "game",
        "watch",
        "create",
        "learn",
        "explore",
        "workout",
        "meditate",
        "social",
        "adventure",
        "exercise",
        "relax",
      ],
      age_tier: ["blocked", "minor", "adult"],
      content_type: ["text", "image", "audio", "file"],
      crisis_severity: ["low", "medium", "high", "critical"],
      crisis_type: ["self_harm", "harm_to_others", "abuse", "none"],
      event_significance: [
        "trivial",
        "minor",
        "moderate",
        "major",
        "milestone",
      ],
      export_status: ["pending", "processing", "completed", "failed"],
      export_type: ["full", "companion", "memories", "conversations"],
      life_event_type: [
        "wake_up",
        "morning_routine",
        "breakfast",
        "work_activity",
        "lunch",
        "hobby_time",
        "exercise",
        "dinner",
        "evening_relaxation",
        "sleep",
        "learning_new_skill",
        "reading",
        "practicing_hobby",
        "discovered_interest",
        "thinking_of_user",
        "missing_user",
        "excited_to_chat",
        "wants_to_share",
        "mood_shift",
        "reflection",
        "daydreaming",
        "feeling_grateful",
        "anniversary",
        "milestone_reached",
        "new_goal_set",
        "achievement_unlocked",
        "created_something",
        "had_idea",
        "wrote_journal",
        "custom",
      ],
      memory_access_type: ["retrieval", "update", "reinforcement"],
      memory_category: [
        "fact",
        "emotion",
        "preference",
        "event",
        "relationship",
        "goal",
      ],
      message_role: ["user", "companion", "system"],
      milestone_type: [
        "first_conversation",
        "first_week",
        "first_month",
        "messages_100",
        "messages_500",
        "messages_1000",
        "messages_5000",
        "trust_25",
        "trust_50",
        "trust_75",
        "trust_100",
        "affection_25",
        "affection_50",
        "affection_75",
        "affection_100",
        "first_activity",
        "activities_10",
        "activities_50",
        "shared_secret",
        "overcame_conflict",
        "anniversary",
      ],
      relationship_type: ["friend", "mentor", "romantic", "family", "custom"],
      skill_category: [
        "coding",
        "recipes",
        "domain",
        "traditions",
        "games",
        "creative",
        "language",
        "procedures",
        "trivia",
        "other",
      ],
      skill_proficiency: [
        "novice",
        "familiar",
        "competent",
        "proficient",
        "expert",
      ],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "trialing",
        "incomplete",
      ],
      subscription_tier: ["free", "basic", "pro", "ultimate"],
      task_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const

// Re-export hand-written helpers so existing imports from
// @/types/database continue to resolve.
export * from './database-helpers';
