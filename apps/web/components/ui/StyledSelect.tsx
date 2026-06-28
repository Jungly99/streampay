'use client'
import React from 'react'

interface StyledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}

export default function StyledSelect({ style, children, ...rest }: StyledSelectProps) {
  return (
    <div style={{ position: 'relative', display: 'block' }}>
      <select
        {...rest}
        style={{
          width: '100%',
          padding: '10px 36px 10px 13px',
          borderRadius: 9,
          fontSize: 13,
          background: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.09)',
          color: '#f8fafc',
          outline: 'none',
          boxSizing: 'border-box',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          cursor: 'pointer',
          ...style,
        }}
      >
        {children}
      </select>
      {/* Custom chevron */}
      <svg
        viewBox="0 0 10 6"
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 10,
          height: 6,
          pointerEvents: 'none',
          fill: 'none',
          stroke: '#6366f1',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      >
        <polyline points="0,0 5,6 10,0" />
      </svg>
    </div>
  )
}

export function SelectOption({ value, children, ...rest }: React.OptionHTMLAttributes<HTMLOptionElement>) {
  return (
    <option
      value={value}
      style={{ background: '#1a1a2e', color: '#f8fafc' }}
      {...rest}
    >
      {children}
    </option>
  )
}
