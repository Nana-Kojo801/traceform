import * as React from 'react'
import { cn } from '@/lib/utils'

export const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle-foreground outline-none transition-colors focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldClass, 'h-9', className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClass, 'min-h-20 py-2 leading-relaxed', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(fieldClass, 'h-9 appearance-auto pr-2', className)} {...props} />
  ),
)
NativeSelect.displayName = 'NativeSelect'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-xs font-medium text-muted-foreground', className)} {...props} />
}
