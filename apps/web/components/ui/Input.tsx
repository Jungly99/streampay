import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-white/5 border text-slate-100 placeholder-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all',
          error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
export default Input
