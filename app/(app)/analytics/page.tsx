import { PageHeader } from '@/components/page-header'
import { AnalyticsView } from '@/components/analytics/analytics-view'
import { getAnalyticsData } from '@/app/actions/dashboard'

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()
  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Decision outcomes, exceptions, and spend across your verified invoices."
      />
      <div className="p-6 sm:p-8">
        <AnalyticsView data={data} />
      </div>
    </div>
  )
}
