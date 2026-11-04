import { useId } from 'react'
import { motion } from 'motion/react'
import { snap } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface Props<T extends string> {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: React.ReactNode }[]
  label: string
  className?: string
  size?: 'default' | 'sm'
  role?: 'tablist' | 'group'
}

/** Segmented control: round track, white thumb that slides on a spring. */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = 'default', role = 'group' }: Props<T>) {
  const id = useId()
  return (
    <div role={role} aria-label={label} className={cn('inline-flex rounded-full bg-fill p-0.5', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role={role === 'tablist' ? 'tab' : undefined}
            aria-selected={role === 'tablist' ? on : undefined}
            aria-pressed={role === 'group' ? on : undefined}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex flex-1 items-center justify-center whitespace-nowrap rounded-full outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ink active:scale-[0.97]',
              size === 'sm' ? 'h-7 px-3.5 text-[13px]' : 'h-8 px-5 text-[13.5px]',
              on ? 'font-semibold text-ink' : 'font-medium text-ink-2 hover:text-ink',
            )}
          >
            {on && <motion.span layoutId={`seg-${id}`} transition={snap} className="absolute inset-0 rounded-full bg-card shadow-[0_1px_3px_rgb(0_0_0/0.12)]" aria-hidden />}
            <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
