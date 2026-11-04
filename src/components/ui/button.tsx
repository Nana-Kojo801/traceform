import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.96] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        ink: 'bg-ink text-white hover:bg-[#2a2a2e]',
        soft: 'bg-card text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-[#fafaf8]',
        tint: 'bg-fill text-ink hover:bg-[rgb(17_17_19/0.1)]',
        ghost: 'text-ink hover:bg-fill',
        danger: 'text-bad-text hover:bg-bad-soft',
      },
      size: {
        default: 'h-10 rounded-[12px] px-[18px] text-[14px] [&_svg]:size-4',
        sm: 'h-9 rounded-[12px] px-3.5 text-[13.5px] [&_svg]:size-4',
        lg: 'h-12 rounded-[12px] px-[22px] text-[15px] [&_svg]:size-[18px]',
        xl: 'h-[52px] rounded-[12px] px-6 text-[16px] [&_svg]:size-5',
        icon: 'size-10 rounded-full [&_svg]:size-[18px]',
        'icon-lg': 'size-12 rounded-full [&_svg]:size-5',
        'icon-sm': 'size-8 rounded-full [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'soft', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} type={asChild ? undefined : (type ?? 'button')} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  },
)
Button.displayName = 'Button'
