'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ShieldCheck, Gauge, ShieldAlert, Timer, UserCheck, Save, Loader2, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateUserSettings, type UserSettingsData } from '@/app/actions/settings'

export function SettingsForm({
  user,
  initialSettings,
}: {
  user: { name: string; email: string; id: string }
  initialSettings: UserSettingsData
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State in percent forms for user convenience
  const [amountTol, setAmountTol] = useState((initialSettings.amountTolerancePct * 100).toFixed(0))
  const [priceTol, setPriceTol] = useState((initialSettings.priceTolerancePct * 100).toFixed(0))
  const [approveThreshold, setApproveThreshold] = useState((initialSettings.autoApproveThreshold * 100).toFixed(0))
  const [notifications, setNotifications] = useState(initialSettings.notificationsEnabled)

  function handleSave() {
    const amountVal = Number(amountTol) / 100
    const priceVal = Number(priceTol) / 100
    const thresholdVal = Number(approveThreshold) / 100

    if (isNaN(amountVal) || amountVal < 0 || amountVal > 1) {
      toast.error('Amount tolerance must be between 0% and 100%')
      return
    }
    if (isNaN(priceVal) || priceVal < 0 || priceVal > 1) {
      toast.error('Unit price tolerance must be between 0% and 100%')
      return
    }
    if (isNaN(thresholdVal) || thresholdVal < 0.5 || thresholdVal > 1.0) {
      toast.error('Auto-approve threshold must be between 50% and 100%')
      return
    }

    startTransition(async () => {
      try {
        await updateUserSettings({
          amountTolerancePct: amountVal,
          priceTolerancePct: priceVal,
          autoApproveThreshold: thresholdVal,
          notificationsEnabled: notifications,
        })
        toast.success('Configuration saved successfully')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update settings')
      }
    })
  }

  return (
    <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2">
      {/* Account Settings */}
      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Account</h3>
          <p className="text-xs text-muted-foreground">Logged in user details</p>
        </div>
        <div className="space-y-3 divide-y divide-border">
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{user.name || '—'}</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-muted-foreground">User ID</span>
            <span className="text-sm font-mono text-muted-foreground">{user.id.slice(0, 12)}…</span>
          </div>
        </div>
      </Card>

      {/* Extraction Model */}
      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Extraction model</h3>
          <p className="text-xs text-muted-foreground">Multimodal parsing parameters</p>
        </div>
        <div className="space-y-3 divide-y divide-border">
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Provider</span>
            <span className="text-sm font-medium text-success">Google Gemini</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-muted-foreground">Model</span>
            <span className="text-sm font-medium font-mono text-primary">gemini-2.0-flash</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-muted-foreground">Mode</span>
            <span className="text-sm font-medium">Multimodal OCR + Structured JSON</span>
          </div>
        </div>
      </Card>

      {/* Configuration Settings */}
      <Card className="flex flex-col gap-4 p-5 lg:col-span-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Verification thresholds</h3>
          <p className="text-xs text-muted-foreground">
            Deterministic tolerances applied by the rule engine. Amounts outside tolerance are flagged for review or rejected.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-border pt-4">
          <div className="grid gap-1.5">
            <Label htmlFor="amount-tol">Total amount tolerance (%)</Label>
            <Input
              id="amount-tol"
              type="number"
              value={amountTol}
              onChange={(e) => setAmountTol(e.target.value)}
              className="bg-background/50 h-9"
              placeholder="2"
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">Allowed variance of invoice total compared to matched PO.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="price-tol">Unit price tolerance (%)</Label>
            <Input
              id="price-tol"
              type="number"
              value={priceTol}
              onChange={(e) => setPriceTol(e.target.value)}
              className="bg-background/50 h-9"
              placeholder="5"
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">Allowed variance of invoice item unit prices compared to PO.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="threshold">Auto-approve threshold (%)</Label>
            <Input
              id="threshold"
              type="number"
              value={approveThreshold}
              onChange={(e) => setApproveThreshold(e.target.value)}
              className="bg-background/50 h-9"
              placeholder="95"
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">Minimum validation score required for automatic clearing.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <input
            type="checkbox"
            id="notifications"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            className="size-4 rounded-sm border-primary accent-primary"
            disabled={isPending}
          />
          <Label htmlFor="notifications" className="flex flex-col gap-0.5 cursor-pointer">
            <span className="text-sm font-medium">Enable pipeline notifications</span>
            <span className="text-xs text-muted-foreground">Receive system notifications on auto-rejected documents or exceptions.</span>
          </Label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="gap-2 h-9 px-4"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
