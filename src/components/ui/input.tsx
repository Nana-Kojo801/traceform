import * as React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export const boxClass =
  'w-full rounded-[12px] bg-card px-3.5 text-[15px] text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none transition-shadow focus-visible:shadow-[inset_0_0_0_2px_var(--ink)] focus-visible:outline-none disabled:opacity-50'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(boxClass, 'h-11', className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(boxClass, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />,
)
Textarea.displayName = 'Textarea'

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(boxClass, 'h-11 pr-2', className)} {...props} />,
)
NativeSelect.displayName = 'NativeSelect'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('block text-[13px] font-medium text-muted', className)} {...props} />
}

/** iOS-style search field: filled, no border. */
export const SearchField = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { wrapClassName?: string }>(
  ({ className, wrapClassName, ...props }, ref) => (
    <label className={cn('flex h-10 items-center gap-2 rounded-[12px] bg-fill px-3 text-muted focus-within:shadow-[inset_0_0_0_2px_var(--ink)]', wrapClassName)}>
      <Search className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
      <input ref={ref} className={cn('min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none', className)} {...props} />
    </label>
  ),
)
SearchField.displayName = 'SearchField'
