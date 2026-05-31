import { Select } from 'radix-ui'
import { ChevronDown, Check } from 'lucide-react'

// Inject CSS once for states that can't be expressed via inline styles
if (typeof document !== 'undefined' && !document.getElementById('app-select-css')) {
  const s = document.createElement('style')
  s.id = 'app-select-css'
  s.textContent = `
    .aso-trigger:focus-visible { border-color: var(--border-focus) !important; outline: none; }
    .aso-item[data-highlighted] { background: var(--bg-hover); outline: none; }
    .aso-item[data-disabled] { opacity: 0.4; cursor: not-allowed; }
    .aso-content[data-state="open"] { animation: aso-in 0.13s ease; }
    @keyframes aso-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  `
  document.head.appendChild(s)
}

export function AppSelectItem({ value, children, disabled }) {
  return (
    <Select.Item
      value={value === '' ? '__empty__' : value}
      disabled={disabled}
      className="aso-item"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px 8px 12px', fontSize: 13,
        color: 'var(--text-primary)', cursor: 'pointer',
        outline: 'none', userSelect: 'none', borderRadius: 5,
        transition: 'background 0.1s',
      }}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator>
        <Check size={12} color="var(--accent-blue)" />
      </Select.ItemIndicator>
    </Select.Item>
  )
}

export default function AppSelect({ value, onChange, children, style }) {
  const radixValue = (value === '' || value == null) ? '__empty__' : String(value)

  function handleChange(v) {
    onChange(v === '__empty__' ? '' : v)
  }

  return (
    <Select.Root value={radixValue} onValueChange={handleChange}>
      <Select.Trigger
        className="aso-trigger"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '8px 10px', borderRadius: 7,
          border: '1px solid var(--border-strong)', background: 'var(--bg-input)',
          color: 'var(--text-primary)', fontSize: 13,
          cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
          transition: 'border-color 0.15s',
          ...style,
        }}
      >
        <Select.Value />
        <Select.Icon asChild>
          <ChevronDown size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="aso-content"
          position="popper"
          sideOffset={4}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 9,
            boxShadow: 'var(--shadow-modal)',
            zIndex: 9999,
            minWidth: 'var(--radix-select-trigger-width)',
            overflow: 'hidden',
          }}
        >
          <Select.ScrollUpButton style={{ display: 'flex', justifyContent: 'center', padding: 4, color: 'var(--text-muted)' }}>
            <ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} />
          </Select.ScrollUpButton>
          <Select.Viewport style={{ padding: 4, maxHeight: 300 }}>
            {children}
          </Select.Viewport>
          <Select.ScrollDownButton style={{ display: 'flex', justifyContent: 'center', padding: 4, color: 'var(--text-muted)' }}>
            <ChevronDown size={12} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
