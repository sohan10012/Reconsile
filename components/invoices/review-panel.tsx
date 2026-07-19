'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitReview } from '@/app/actions/reviews'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type ReviewRow = {
  id: number
  action: string
  comment: string | null
  created_at: string
}

export function ReviewPanel({
  invoiceId,
  currentDecision,
  reviews = [],
}: {
  invoiceId: number
  currentDecision: string | null
  reviews?: ReviewRow[]
}) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAction(action: 'approve' | 'reject' | 'comment') {
    if (action === 'comment' && !comment.trim()) {
      toast.error('Please enter a comment.')
      return
    }

    startTransition(async () => {
      try {
        await submitReview(invoiceId, action, comment)
        toast.success(
          action === 'approve'
            ? 'Invoice approved successfully'
            : action === 'reject'
              ? 'Invoice rejected'
              : 'Comment added',
        )
        setComment('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Review action failed')
      }
    })
  }

  const needsReview = currentDecision === 'review' || !currentDecision

  return (
    <div className="flex flex-col gap-6">
      {/* Review Actions Panel */}
      {needsReview && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="size-4 text-warning" />
            Human Verification Required
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            This invoice was flagged for manual review by the deterministic rule engine. Make a final decision below.
          </p>

          <div className="mt-4 space-y-3">
            <Textarea
              placeholder="Provide a reason for approval/rejection or add a review comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none min-h-[80px] bg-background/50 text-sm"
              disabled={isPending}
            />

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('comment')}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                )}
                Add Comment
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleAction('reject')}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                Reject
              </Button>
              <Button
                variant="default"
                className="bg-success hover:bg-success/90 text-white gap-1.5"
                size="sm"
                onClick={() => handleAction('approve')}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="size-3.5" />
                )}
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review History Trail */}
      {reviews.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Review History</h3>
          <div className="relative border-l border-border pl-4 space-y-5">
            {reviews.map((rev) => {
              const isApprove = rev.action === 'approve'
              const isReject = rev.action === 'reject'
              return (
                <div key={rev.id} className="relative text-sm">
                  <span
                    className={cn(
                      'absolute -left-[23px] top-1 flex size-3 items-center justify-center rounded-full border-2 border-background',
                      isApprove
                        ? 'bg-success'
                        : isReject
                          ? 'bg-destructive'
                          : 'bg-muted-foreground',
                    )}
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground capitalize">
                      {rev.action === 'approve'
                        ? 'Approved'
                        : rev.action === 'reject'
                          ? 'Rejected'
                          : 'Comment'}
                    </span>
                    •
                    <span>{formatDateTime(rev.created_at)}</span>
                  </div>
                  {rev.comment && (
                    <p className="mt-1 text-foreground text-sm bg-muted/30 p-2.5 rounded-lg border border-border/40 italic">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
