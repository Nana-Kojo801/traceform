import * as React from 'react'
import { cn } from '@/lib/utils'

export const boxClass =
  'w-full rounded-[6px] border border-line-strong bg-white px-3 text-[13.5px] text-ink outline-none transition-colors focus-visible:border-ink focus-visible:outline-none disabled:opacity-50'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(boxClass, 'h-[34px]', className)} {...props} />,
)
Input.displayName = 'Input'

/** The ledger's signature input: a single ink rule underneath. */
export const LineInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full min-w-0 border-0 border-b border-ink bg-transparent px-0 text-[20px] font-medium text-ink outline-none focus-visible:border-b-2 focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
LineInput.displayName = 'LineInput'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(boxClass, 'min-h-24 py-2 leading-relaxed', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(boxClass, 'h-[34px] pr-2', className)} {...props} />,
)
NativeSelect.displayName = 'NativeSelect'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('cap block', className)} {...props} />
}
