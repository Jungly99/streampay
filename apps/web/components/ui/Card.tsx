import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean
}

export function Card({ className, glow, children, ...props }: CardProps) {
  return (
    <div className={cn('glass-card p-5', glow && 'shadow-lg shadow-purple-500/10', className)} {...props}>
      {children}
    </div>
  )
}

const colorMap = {
  purple: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', text: '#a78bfa', icon: 'rgba(139,92,246,0.15)' },
  pink:   { bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.2)',  text: '#f472b6', icon: 'rgba(236,72,153,0.15)' },
  cyan:   { bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.2)',   text: '#22d3ee', icon: 'rgba(6,182,212,0.15)'  },
  green:  { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  text: '#34d399', icon: 'rgba(16,185,129,0.15)' },
  orange: { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  text: '#fb923c', icon: 'rgba(249,115,22,0.15)' },
}

export function StatCard({
  label,
  value,
  icon,
  color = 'purple',
  trend,
}: {
  label: string
  value: string | number
  icon?: string
  color?: keyof typeof colorMap
  trend?: string
}) {
  const c = colorMap[color]
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-center justify-between">
        {icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: c.icon }}>
            {icon}
          </div>
        )}
        {trend && <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: c.icon, color: c.text }}>{trend}</span>}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm mt-0.5" style={{ color: 'rgb(100,116,139)' }}>{label}</p>
      </div>
    </div>
  )
}
