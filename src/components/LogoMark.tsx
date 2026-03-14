// The Auto Atlas needle mark — two triangles forming a compass needle
// Blue north triangle + dark south triangle + white pivot diamond

interface LogoMarkProps {
  size?: number       // height in px, width scales proportionally (190:697 ratio)
  spinning?: boolean  // if true, applies continuous rotation animation
  className?: string
}

export function LogoMark({ size = 32, spinning = false, className }: LogoMarkProps) {
  const width = Math.round((190 / 697) * size)
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 190 697"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={spinning ? {
        animation: 'logo-spin 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      } : undefined}
    >
      <path d="M95 0L177.272 348.75H12.7276L95 0Z" fill="#0066FF"/>
      <path d="M95 697L12.7276 348.25H177.272L95 697Z" fill="#0D0F12"/>
      <path d="M53 348.5L73.75 276.187H115.25L136 348.5L115.25 420.813H73.75L53 348.5Z" fill="white"/>
    </svg>
  )
}
