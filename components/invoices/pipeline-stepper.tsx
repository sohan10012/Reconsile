'use client'

import { Check, Loader2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const PIPELINE_STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'ocr', label: 'OCR + transcription' },
  { key: 'extraction', label: 'Field extraction' },
  { key: 'schema', label: 'Strict schema validation' },
  { key: 'matching', label: 'Vendor / PO matching' },
  { key: 'rules', label: 'Rule evaluation' },
  { key: 'decision', label: 'Decision' },
] as const

export type StepKey = (typeof PIPELINE_STEPS)[number]['key']

export function PipelineStepper({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="flex flex-col gap-1">
      {PIPELINE_STEPS.map((step, i) => {
        const done = i < activeIndex
        const active = i === activeIndex
        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                done && 'border-success/40 bg-success/10 text-success',
                active && 'border-primary/40 bg-primary/10 text-primary',
                !done && !active && 'border-border bg-muted text-muted-foreground',
              )}
            >
              {done ? (
                <Check className="size-3.5" />
              ) : active ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Circle className="size-2 fill-current" />
              )}
            </span>
            <span
              className={cn(
                'text-sm',
                active ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
