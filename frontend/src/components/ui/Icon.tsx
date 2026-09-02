type IconName =
  | 'pencil'
  | 'trash'
  | 'check'
  | 'arrowRight'
  | 'plus'
  | 'chevron'
  | 'lock'
  | 'clock'
  | 'scale'
  | 'text'
  | 'target'
  | 'camera'
  | 'menu'
  | 'mic'
  | 'stop'
  | 'sol'
  | 'lua'

type IconProps = {
  name: IconName
  className?: string
  title?: string
}

// Traco unico de 1.5, cantos retos: um so desenho pro app inteiro.
const paths: Record<IconName, string> = {
  pencil: 'M4 20h4L20 8l-4-4L4 16v4Z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  check: 'M4 12.5 9 18 20 6',
  arrowRight: 'M4 12h15m0 0-6-6m6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M6 9l6 6 6-6',
  lock: 'M6 11h12v9H6v-9Zm3 0V7a3 3 0 0 1 6 0v4',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  scale: 'M12 4v16M5 8h14l-3 6h-8l-3-6Z',
  text: 'M5 6h14M5 12h14M5 18h9',
  target: 'M12 12h.01M12 3v3m0 12v3M3 12h3m12 0h3M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z',
  camera:
    'M4 8h3l1.5-2h7L17 8h3v11H4V8Zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  menu: 'M5 8h14M5 16h14',
  mic: 'M12 4a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0v-5A2.5 2.5 0 0 1 12 4Zm-6 7a6 6 0 0 0 12 0M12 17v3',
  stop: 'M7 7h10v10H7z',
  sol: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4',
  lua: 'M20 14.3A8.4 8.4 0 0 1 9.7 4 8.5 8.5 0 1 0 20 14.3Z',
}

export function Icon({ name, className = 'h-4 w-4', title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={paths[name]} />
    </svg>
  )
}
