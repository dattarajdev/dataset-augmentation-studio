// Shared small UI primitives used across the app

import React from 'react'

// ---- Section wrapper -------------------------------------------------------

interface SectionCardProps {
  number: number
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  color?: string
  className?: string
}

export const SectionCard: React.FC<SectionCardProps> = ({
  number, title, icon, children, color = '#3b82f6', className = ''
}) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
      <div
        className="section-badge text-white"
        style={{ backgroundColor: color }}
      >
        {number}
      </div>
      <div className="text-slate-500" style={{ color }}>
        {icon}
      </div>
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
)

// ---- Stat card -------------------------------------------------------------

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color?: string
  alert?: boolean
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, icon, color = '#3b82f6', alert = false
}) => (
  <div
    className={`flex flex-col gap-1 px-4 py-3 rounded-lg border ${
      alert && Number(value) > 0
        ? 'border-amber-200 bg-amber-50'
        : 'border-slate-200 bg-slate-50'
    }`}
  >
    <div className="flex items-center gap-2">
      <span style={{ color: alert && Number(value) > 0 ? '#d97706' : color }}>
        {icon}
      </span>
      <span className={`text-xs font-medium ${
        alert && Number(value) > 0 ? 'text-amber-700' : 'text-slate-500'
      }`}>
        {label}
      </span>
    </div>
    <span className={`text-xl font-bold ${
      alert && Number(value) > 0 ? 'text-amber-800' : 'text-slate-800'
    }`}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </span>
  </div>
)

// ---- Toggle ----------------------------------------------------------------

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  description?: string
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, description }) => (
  <div className="flex items-center gap-3">
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`toggle-slider inline-block h-4 w-4 rounded-full bg-white shadow ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
    {(label || description) && (
      <div>
        {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
    )}
  </div>
)

// ---- Input with label ------------------------------------------------------

interface LabeledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export const LabeledInput: React.FC<LabeledInputProps> = ({ label, ...props }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-slate-600">{label}</label>
    <input
      {...props}
      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
    />
  </div>
)

// ---- Badge -----------------------------------------------------------------

interface BadgeProps {
  children: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'slate'
}

const badgeColors = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-amber-100 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'slate' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeColors[color]}`}>
    {children}
  </span>
)

// ---- Loading spinner -------------------------------------------------------

export const Spinner: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
  <svg
    className={`animate-spin ${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} text-blue-500`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
)

// ---- Alert strip -----------------------------------------------------------

interface AlertProps {
  type: 'info' | 'warning' | 'error' | 'success'
  children: React.ReactNode
}

const alertStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
}

export const Alert: React.FC<AlertProps> = ({ type, children }) => (
  <div className={`flex items-start gap-2 px-4 py-3 rounded-lg border text-sm ${alertStyles[type]}`}>
    {children}
  </div>
)

// ---- Primary button --------------------------------------------------------

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
}

const buttonSizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, children, disabled, className = '', ...props
}) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={`
      inline-flex items-center gap-2 font-medium rounded-lg
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      ${buttonVariants[variant]} ${buttonSizes[size]} ${className}
    `}
  >
    {loading && <Spinner size="sm" />}
    {children}
  </button>
)
