import { useEffect, useState } from 'react'
import { fetchAdminApplications, approveApplication, rejectApplication } from '../../api/applicationsApi.js'
import Button from '../../components/ui/Button.jsx'
import { CheckIcon, XIcon } from '../../components/ui/icons.jsx'

const TYPE_LABEL    = { scooter: '🛴 Skuter', bike: '🚲 Velosiped' }
const PERIOD_LABEL  = { daily: 'Kunlik', weekly: 'Haftalik', monthly: 'Oylik' }
const PAY_LABEL     = { start: 'Boshida', end: 'Oxirida' }

function formatSum(n) {
  return n ? Number(n).toLocaleString('uz-UZ') + " so'm" : '—'
}

const STATUS_TABS = [
  { value: 'pending',  label: 'Kutilmoqda' },
  { value: 'approved', label: 'Tasdiqlangan' },
  { value: 'rejected', label: 'Rad etilgan' },
]

function ApproveModal({ app, onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function confirm() {
    setLoading(true)
    setError(null)
    try {
      await approveApplication(app.id)
      onDone(app.id)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-3 text-base font-black text-text">Arizani tasdiqlash</h2>
        <div className="mb-4 space-y-1.5 text-sm">
          <p><span className="text-text-muted">Ism:</span> <span className="font-semibold text-text">{app.full_name}</span></p>
          <p><span className="text-text-muted">Telefon:</span> <span className="font-semibold text-text">{app.phone}</span></p>
          {app.unit_name && (
            <p><span className="text-text-muted">Transport:</span> <span className="font-semibold text-text">
              {TYPE_LABEL[app.unit_type] ?? ''} — {app.unit_name}
            </span></p>
          )}
          {app.battery_count != null && (
            <p>
              <span className="text-text-muted">Batareya:</span>{' '}
              <span className="font-semibold text-text">{app.battery_count} ta</span>
            </p>
          )}
          {app.unit_type !== 'scooter' && (
            <p>
              <span className="text-text-muted">Davr:</span>{' '}
              <span className="font-semibold text-text">{PERIOD_LABEL[app.period_type] ?? app.period_type}</span>
            </p>
          )}
          <p>
            <span className="text-text-muted">To'lov:</span>{' '}
            <span className="font-semibold text-text">{PAY_LABEL[app.pay_timing] ?? app.pay_timing}</span>
          </p>
          {app.total_amount != null && (
            <p>
              <span className="text-text-muted">Jami:</span>{' '}
              <span className="font-black text-gold">{formatSum(app.total_amount)}</span>
            </p>
          )}
        </div>
        <div className="mb-4 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5 text-xs text-text-muted">
          Tasdiqlanganda:
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Ishchi hisobi yaratiladi (parol: raqamlar)</li>
            <li>Transport "Band" bo'ladi</li>
            <li>{PERIOD_LABEL[app.period_type] ?? 'Haftalik'} ijara boshlanadi</li>
            {app.pay_timing === 'start' && <li>To'lov darhol yaratiladi</li>}
            {app.pay_timing === 'end'   && <li>To'lov ijara oxirida yaratiladi</li>}
          </ul>
        </div>
        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Bekor</Button>
          <Button className="flex-1" loading={loading} onClick={confirm}>
            <CheckIcon className="h-4 w-4" /> Tasdiqlash
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationsPage() {
  const [tab, setTab]           = useState('pending')
  const [apps, setApps]         = useState([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError]       = useState(null)
  const [approving, setApproving] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)

  function load(s) {
    setLoading(true)
    fetchAdminApplications(s)
      .then(setApps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  function onApproved(id) {
    setApps((prev) => prev.filter((a) => a.id !== id))
    setApproving(null)
  }

  async function handleReject(id) {
    setRejectingId(id)
    try {
      await rejectApplication(id)
      setApps((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      setError(e.message)
    } finally {
      setRejectingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black text-text sm:text-2xl">Arizalar</h1>
        <p className="text-xs text-text-muted">Ijara arizalarini ko'rish va tasdiqlash</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={[
              'rounded-xl border px-4 py-2 text-sm font-bold transition-all',
              tab === t.value
                ? 'border-gold bg-gold text-black'
                : 'border-border bg-surface text-text-muted hover:border-gold/40 hover:text-text',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {isLoading && <p className="text-sm text-text-muted">Yuklanmoqda...</p>}

      {!isLoading && apps.length === 0 && (
        <div className="rounded-xl border border-border bg-surface py-16 text-center text-sm text-text-muted">
          Ariza yo'q
        </div>
      )}

      <div className="space-y-3">
        {apps.map((app) => (
          <div key={app.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start gap-4">
              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-bold text-text">{app.full_name}</p>
                <p className="text-sm text-text-muted">{app.phone}</p>
                {app.unit_name && (
                  <p className="text-sm">
                    <span className="text-text-muted">Transport: </span>
                    <span className="font-semibold text-gold">
                      {TYPE_LABEL[app.unit_type] ?? ''} — {app.unit_name}
                    </span>
                  </p>
                )}
                {!app.unit_name && app.desired_unit_model && (
                  <p className="text-sm text-text-muted">
                    Istak: {TYPE_LABEL[app.desired_unit_model] ?? app.desired_unit_model}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                  {app.battery_count != null
                    ? <span className="text-text-muted">{app.battery_count} ta batareya · Haftalik</span>
                    : <span className="text-text-muted">{PERIOD_LABEL[app.period_type] ?? app.period_type}</span>
                  }
                  <span className="text-text-muted">
                    To'lov: {PAY_LABEL[app.pay_timing] ?? app.pay_timing}
                  </span>
                  {app.total_amount != null && (
                    <span className="font-bold text-gold">{formatSum(app.total_amount)}</span>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  {new Date(app.created_at).toLocaleString('uz-UZ')}
                </p>
              </div>

              {/* Actions */}
              {tab === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    className="!border-red-500/40 !text-red-400 hover:!bg-red-500 hover:!text-white"
                    loading={rejectingId === app.id}
                    onClick={() => handleReject(app.id)}
                  >
                    <XIcon className="h-4 w-4" />
                    Rad
                  </Button>
                  <Button onClick={() => setApproving(app)}>
                    <CheckIcon className="h-4 w-4" />
                    Tasdiqlash
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {approving && (
        <ApproveModal
          app={approving}
          onClose={() => setApproving(null)}
          onDone={onApproved}
        />
      )}
    </div>
  )
}
