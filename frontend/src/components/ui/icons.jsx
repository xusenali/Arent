function Icon({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function EyeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  )
}

export function EyeOffIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.5 6.6C4.1 8.2 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.4 4.9-1.1M9.9 4.2A9.7 9.7 0 0 1 12 4c6.4 0 10 8 10 8a17.3 17.3 0 0 1-2.3 3.3" />
    </Icon>
  )
}

export function GridIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Icon>
  )
}

export function UsersIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5c1.7.4 3 2 3 3.9 0 1.9-1.3 3.5-3 3.9" />
      <path d="M21 20c0-2.8-2-5.1-4.7-5.8" />
    </Icon>
  )
}

export function MapPinIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </Icon>
  )
}

export function ReceiptIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 2h12v20l-2.5-1.5L13 22l-2.5-1.5L8 22l-2-1.5V2Z" />
      <path d="M9 8h6M9 12h6" />
    </Icon>
  )
}

export function BookIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5A2.5 2.5 0 0 0 17.5 21H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
    </Icon>
  )
}

export function LogoutIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  )
}

export function ChevronRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  )
}

export function ChevronLeftIcon(props) {
  return (
    <Icon {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  )
}

export function UploadIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Icon>
  )
}

export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 13l4 4L19 7" />
    </Icon>
  )
}

export function XIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function ClockIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Icon>
  )
}

export function MenuIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  )
}

export function FileIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 2h9l5 5v15H6V2Z" />
      <path d="M15 2v5h5" />
    </Icon>
  )
}

export function VideoIcon(props) {
  return (
    <Icon {...props}>
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="M16 10.5l6-3.5v10l-6-3.5" />
    </Icon>
  )
}
