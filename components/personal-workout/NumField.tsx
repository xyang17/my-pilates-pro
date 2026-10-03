'use client'

// 数字输入框。不用 type="number"：受控组件下浏览器会吞输入（"这个 1 删不掉"），
// 统一用 type="text" + inputMode + 正则过滤。值始终是字符串，'' 表示没填。

export function NumField({
  value, onChange, decimal = false, placeholder, style, ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  decimal?: boolean
  placeholder?: string
  style?: React.CSSProperties
  ariaLabel?: string
}) {
  const pattern = decimal ? /^\d*\.?\d{0,2}$/ : /^\d*$/
  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={e => {
        const v = e.target.value.replace(/[。，,]/g, '.')
        if (v === '' || pattern.test(v)) onChange(v)
      }}
      style={style}
    />
  )
}
