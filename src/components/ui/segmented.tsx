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

/** Segmented control: fully round track with a white thumb. */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = 'default', role = 'group' }: Props<T>) {
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
              'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ink',
              size === 'sm' ? 'h-7 px-3.5 text-[13px]' : 'h-8 px-5 text-[13.5px]',
              on ? 'bg-card font-semibold text-ink shadow-[0_1px_3px_rgb(0_0_0/0.1)]' : 'font-medium text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
