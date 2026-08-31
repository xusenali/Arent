export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={[
            'flex-1 rounded-md px-2 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-semibold transition-colors',
            activeTab === tab.value
              ? 'bg-gold text-black'
              : 'text-text-muted hover:text-text',
          ].join(' ')}
        >
          {tab.label}
          {typeof tab.count === 'number' && (
            <span
              className={[
                'ml-2 rounded-full px-1.5 py-0.5 text-xs',
                activeTab === tab.value ? 'bg-black/15' : 'bg-bg',
              ].join(' ')}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
