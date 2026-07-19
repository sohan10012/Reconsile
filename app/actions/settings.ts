'use server'

import { createClient } from "@/lib/supabase/server"
import { getUserId } from "@/lib/session"
import { validateUserSettingsInput } from "@/lib/validation/input"
import { revalidatePath } from "next/cache"

export interface UserSettingsData {
  amountTolerancePct: number
  priceTolerancePct: number
  autoApproveThreshold: number
  notificationsEnabled: boolean
}

const DEFAULT_SETTINGS: UserSettingsData = {
  amountTolerancePct: 0.02, // 2%
  priceTolerancePct: 0.05,  // 5%
  autoApproveThreshold: 0.95, // 95%
  notificationsEnabled: true,
}

export async function getUserSettings(): Promise<UserSettingsData> {
  const userId = await getUserId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // If not found, insert defaults
    const { data: inserted, error: insertError } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        amount_tolerance_pct: DEFAULT_SETTINGS.amountTolerancePct,
        price_tolerance_pct: DEFAULT_SETTINGS.priceTolerancePct,
        auto_approve_threshold: DEFAULT_SETTINGS.autoApproveThreshold,
        notifications_enabled: DEFAULT_SETTINGS.notificationsEnabled,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      return DEFAULT_SETTINGS
    }

    return {
      amountTolerancePct: Number(inserted.amount_tolerance_pct),
      priceTolerancePct: Number(inserted.price_tolerance_pct),
      autoApproveThreshold: Number(inserted.auto_approve_threshold),
      notificationsEnabled: inserted.notifications_enabled,
    }
  }

  return {
    amountTolerancePct: Number(data.amount_tolerance_pct),
    priceTolerancePct: Number(data.price_tolerance_pct),
    autoApproveThreshold: Number(data.auto_approve_threshold),
    notificationsEnabled: data.notifications_enabled,
  }
}

export async function updateUserSettings(settings: Partial<UserSettingsData>) {
  const userId = await getUserId()

  // Validate the incoming updates
  const current = await getUserSettings()
  const fullCandidate = { ...current, ...settings }
  const validation = validateUserSettingsInput(fullCandidate)
  if (!validation.success) {
    throw new Error(validation.error.issues[0].message)
  }
  const cleanData = validation.data

  const supabase = await createClient()
  const { error } = await supabase
    .from('user_settings')
    .update({
      amount_tolerance_pct: cleanData.amountTolerancePct,
      price_tolerance_pct: cleanData.priceTolerancePct,
      auto_approve_threshold: cleanData.autoApproveThreshold,
      notifications_enabled: cleanData.notificationsEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
