import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'dialog-content fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[16px] bg-card p-6 shadow-[0_24px_64px_rgb(0_0_0/0.18)]',
          className,
        )}
        {...props}
      >
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <DialogPrimitive.Title className="pr-10 text-[20px] font-bold tracking-[-0.02em]">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-1.5 text-[14px] leading-relaxed text-muted">{description}</DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        )}
        <div className="mt-5">{children}</div>
        <DialogPrimitive.Close className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-fill text-ink-2 hover:bg-[rgb(17_17_19/0.1)]" aria-label="Close">
          <X className="size-4" strokeWidth={2.4} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
