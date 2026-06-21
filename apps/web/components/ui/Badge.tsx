import { cn } from '../../lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'purple'
  className?: string
}

export default function Badge({ children, variant = 'purple', className }: BadgeProps) {
  const variants = {
    success: 'bg-green-500/15 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    error: 'bg-red-500/15 text-red-400 border-red-500/20',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border', variants[variant], className)}>
      {children}
    </span>
  )
}
