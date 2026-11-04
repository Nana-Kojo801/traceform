import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 [&_svg]:size-3',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-3 text-muted-foreground',
        accent: 'bg-accent-soft text-accent',
        supported: 'bg-supported-soft text-supported',
        conflicting: 'bg-conflicting-soft text-conflicting',
        missing: 'bg-missing-soft text-missing',
        review: 'bg-review-soft text-review',
        outline: 'border border-border-strong text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
