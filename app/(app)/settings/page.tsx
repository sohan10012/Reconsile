import { PageHeader } from '@/components/page-header'
import { SettingsForm } from '@/components/settings/settings-form'
import { requireSession } from '@/lib/session'
import { getUserSettings } from '@/app/actions/settings'

export default async function SettingsPage() {
  const session = await requireSession()
  const settings = await getUserSettings()

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Account details and the pipeline configuration used to verify invoices."
      />

      <SettingsForm
        user={{
          name: session.user.name || '',
          email: session.user.email,
          id: session.user.id,
        }}
        initialSettings={settings}
      />
    </div>
  )
}
