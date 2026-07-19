// Database client — now uses Supabase.
// This file re-exports the server client for backward compatibility with
// existing pipeline code that imports from '@/lib/db'.
import { createClient, createServiceClient } from '@/lib/supabase/server'

export { createClient as getSupabase, createServiceClient as getServiceSupabase }

// Re-export types for convenience
export type { Database, Tables, TablesInsert as InsertTables, TablesUpdate as UpdateTables } from '@/lib/supabase/types'
