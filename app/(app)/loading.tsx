import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col">
      {/* Header placeholder mirrors PageHeader spacing */}
      <div className="border-b border-border px-6 py-6 sm:px-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>

      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}
