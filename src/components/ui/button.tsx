import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[6px] font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-35 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        ink: 'bg-ink text-white hover:bg-[#26272b]',
        outline: 'border border-line-strong bg-white text-ink hover:bg-wash',
        soft: 'bg-desk text-ink hover:bg-line',
        ghost: 'text-ink-2 hover:bg-wash hover:text-ink',
        link: 'h-auto px-0 text-ink underline decoration-1 underline-offset-4 hover:decoration-2',
        danger: 'text-review hover:bg-red-50',
      },
      size: {
        default: 'h-[34px] px-3.5 text-[13px] [&_svg]:size-4',
        lg: 'h-11 px-5 text-[15px] [&_svg]:size-[18px]',
        sm: 'h-8 px-3 text-[12.5px] [&_svg]:size-3.5',
        icon: 'size-[34px] [&_svg]:size-4',
        'icon-lg': 'size-11 [&_svg]:size-[18px]',
      },
    },
    defaultVariants: { variant: 'outline', size: 'default' },
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
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size }), variant === 'link' && 'px-0', className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export function Kbd({ children, dark, className }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return <kbd className={cn('kbd', dark && 'kbd-dark', className)}>{children}</kbd>
}
