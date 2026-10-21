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
  headerAction?: React.ReactNode
  subtitle?: string
  bodyClassName?: string
}

export const SectionCard: React.FC<SectionCardProps> = ({
  number,
  title,
  icon,
  children,
  color = '#3b82f6',
  className = '',
  headerAction,
  subtitle,
  bodyClassName = 'p-4 sm:p-5',
}) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col ${className}`}>
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 bg-slate-50/70">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs"
          style={{ backgroundColor: color }}
        >
          {number}
        </div>
        <div className="shrink-0" style={{ color }}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-slate-800 leading-snug truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-400 font-normal leading-tight truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {headerAction && (
        <div className="shrink-0 flex items-center gap-2">
          {headerAction}
        </div>
      )}
    </div>
    <div className={`flex-1 ${bodyClassName}`}>
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
  compact?: boolean
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color = '#3b82f6',
  alert = false,
  compact = false,
}) => {
  const isAlertActive = alert && Number(value) > 0

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
          isAlertActive
            ? 'border-amber-200 bg-amber-50/80 text-amber-900'
            : 'border-slate-200/90 bg-slate-50/70 text-slate-700'
        }`}
      >
        <span className="flex items-center gap-1.5 font-medium text-slate-600 truncate">
          <span className="shrink-0" style={{ color: isAlertActive ? '#d97706' : color }}>{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        <span className={`font-bold ml-2 shrink-0 ${isAlertActive ? 'text-amber-800' : 'text-slate-800'}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col gap-1 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg border transition-colors ${
        isAlertActive
          ? 'border-amber-200 bg-amber-50/70'
          : 'border-slate-200/90 bg-slate-50/70'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="shrink-0" style={{ color: isAlertActive ? '#d97706' : color }}>
          {icon}
        </span>
        <span className={`text-xs font-medium truncate ${
          isAlertActive ? 'text-amber-700' : 'text-slate-500'
        }`}>
          {label}
        </span>
      </div>
      <span className={`text-lg sm:text-xl font-bold tracking-tight ${
        isAlertActive ? 'text-amber-800' : 'text-slate-800'
      }`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

// ---- Toggle ----------------------------------------------------------------

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  id?: string
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
}) => (
  <label
    htmlFor={id}
    className={`flex items-center gap-2.5 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          if (!disabled) onChange(!checked)
        }
      }}
      className={`relative inline-flex h-5 w-9 sm:h-5.5 sm:w-10 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-4 sm:translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
    {(label || description) && (
      <div className="min-w-0">
        {label && <p className="text-xs sm:text-sm font-medium text-slate-700 leading-tight truncate">{label}</p>}
        {description && <p className="text-xs text-slate-400 leading-tight mt-0.5 truncate">{description}</p>}
      </div>
    )}
  </label>
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
      className="border border-slate-300 rounded-lg px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
    />
  </div>
)

// ---- Badge -----------------------------------------------------------------

interface BadgeProps {
  children: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'slate'
  className?: string
}

const badgeColors = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'slate', className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${badgeColors[color]} ${className}`}>
    {children}
  </span>
)

// ---- Loading spinner -------------------------------------------------------

export const Spinner: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
  <svg
    className={`animate-spin ${size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-current`}
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
  className?: string
}

const alertStyles = {
  info: 'bg-blue-50/80 border-blue-200 text-blue-800',
  warning: 'bg-amber-50/80 border-amber-200 text-amber-800',
  error: 'bg-red-50/80 border-red-200 text-red-800',
  success: 'bg-emerald-50/80 border-emerald-200 text-emerald-800',
}

export const Alert: React.FC<AlertProps> = ({ type, children, className = '' }) => (
  <div className={`flex items-start gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg border text-xs sm:text-sm ${alertStyles[type]} ${className}`}>
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
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500 shadow-xs',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400 shadow-xs',
  ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-xs',
}

const buttonSizes = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-xs sm:text-sm',
  lg: 'px-5 py-2.5 text-sm sm:text-base font-semibold',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  disabled,
  className = '',
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={`
      inline-flex items-center justify-center gap-2 font-medium rounded-lg
      transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
      ${buttonVariants[variant]} ${buttonSizes[size]} ${className}
    `}
  >
    {loading && <Spinner size={size === 'lg' ? 'md' : 'sm'} />}
    {children}
  </button>
)
