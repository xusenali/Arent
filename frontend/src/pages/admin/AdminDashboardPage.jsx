import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import StatCard from '../../components/ui/StatCard.jsx'
import { GridIcon, UsersIcon, ReceiptIcon, ClockIcon } from '../../components/ui/icons.jsx'
import { fetchDashboardStats } from '../../api/adminApi.js'

const GOLD = '#d2c4b4'
const GOLD2 = '#a89a89'
const RED = '#f87171'
const AMBER = '#fbbf24'
const EMERALD = '#34d399'
const MUTED = '#9a9a9a'

const DONUT_COLORS = {
  active: EMERALD,
  pending: AMBER,
  blocked: RED,
}

function CustomTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 text-text-muted">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? GOLD }} className="font-bold">
          {typeof p.value === 'number' ? p.value.toLocaleString('uz-UZ') : p.value}{suffix}
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardStats().then(setStats).catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="text-red-400">{error}</p>
  if (!stats) return <p className="text-text-muted">{t('common.loading')}</p>

  const cards = [
    { label: t('admin_dashboard.total_workers'), value: stats.total_workers, Icon: UsersIcon, accent: true },
    { label: t('admin_dashboard.active_rentals'), value: stats.active_rentals, Icon: GridIcon },
    { label: t('admin_dashboard.monthly_revenue'), value: `${Number(stats.monthly_revenue).toLocaleString('uz-UZ')} ${t('common.sum')}`, Icon: ReceiptIcon },
    { label: t('admin_dashboard.overdue'), value: stats.overdue_count, Icon: ClockIcon },
    { label: t('admin_dashboard.pending_receipts'), value: stats.pending_receipts_count, Icon: ReceiptIcon },
    { label: t('admin_dashboard.pending_requests'), value: stats.pending_worker_requests_count, Icon: UsersIcon },
  ]

  // Donut chart ma'lumoti
  const workerPie = [
    { name: t('workers.tab_active'), value: stats.worker_stats?.active ?? 0, color: EMERALD },
    { name: t('workers.tab_pending'), value: stats.worker_stats?.pending ?? 0, color: AMBER },
    { name: 'Bloklangan', value: stats.worker_stats?.blocked ?? 0, color: RED },
  ].filter((d) => d.value > 0)

  // Bar chart ma'lumoti
  const rentalBar = [
    { name: t('workers.tab_active'), value: stats.rental_stats?.active ?? 0, fill: EMERALD },
    { name: t('workers.tab_overdue'), value: stats.rental_stats?.overdue ?? 0, fill: RED },
    { name: 'Yakunlangan', value: stats.rental_stats?.completed ?? 0, fill: GOLD2 },
  ]

  // Area chart — daily revenue
  const dailyRevenue = (stats.daily_revenue ?? []).map((d) => ({
    date: d.date?.slice(5),   // "MM-DD"
    amount: d.amount,
  }))

  return (
    <div>
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl font-black text-text sm:text-2xl">{t('admin_dashboard.title')}</h1>
        <p className="text-xs text-text-muted sm:text-sm">{t('admin_dashboard.subtitle')}</p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">

        {/* Area chart — daromad */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-bold text-text">So'nggi 30 kunlik daromad</h2>
          {dailyRevenue.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-text-muted">
              Ma'lumot yo'q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                <Tooltip content={<CustomTooltip suffix=" so'm" />} />
                <Area type="monotone" dataKey="amount" stroke={GOLD} strokeWidth={2}
                  fill="url(#goldGrad)" dot={false} activeDot={{ r: 4, fill: GOLD }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart — ishchilar */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-bold text-text">Ishchilar holati</h2>
          {workerPie.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-text-muted">
              Ma'lumot yo'q
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={workerPie}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {workerPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {workerPie.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                    <span className="text-xs text-text-muted">{entry.name}</span>
                    <span className="text-xs font-bold text-text">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar chart — ijaralar */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-bold text-text">Ijaralar holati</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rentalBar} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#d2c4b410' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {rentalBar.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}
