import { useEffect, useRef, useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { fetchAdminUnits, createAdminUnit, updateAdminUnit, deleteAdminUnit } from '../../api/adminApi.js'

const TYPE_LABEL = { scooter: '🛴 Skuter', bike: '🚲 Velosiped' }
const STATUS_OPTS = [
  { value: 'available',   label: "Bo'sh" },
  { value: 'rented',      label: 'Band' },
  { value: 'maintenance', label: "Ta'mirlashda" },
]
const TYPE_OPTS = [
  { value: 'scooter', label: '🛴 Skuter' },
  { value: 'bike',    label: '🚲 Velosiped' },
]

const EMPTY_FORM = {
  model_name: '', serial_number: '', unit_type: 'scooter',
  status: 'available', description: '', price_per_day: '0',
}

function UnitModal({ unit, onClose, onSaved }) {
  const [form, setForm] = useState(unit ? {
    model_name: unit.model_name,
    serial_number: unit.serial_number,
    unit_type: unit.unit_type,
    status: unit.status,
    description: unit.description ?? '',
    price_per_day: unit.price_per_day ?? '0',
  } : { ...EMPTY_FORM })
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(unit?.image ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })) }

  function onImage(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.model_name.trim() || !form.serial_number.trim()) {
      setError("Nomi va seriya raqami majburiy")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (imageFile) fd.append('image', imageFile)
      const result = unit
        ? await updateAdminUnit(unit.id, fd)
        : await createAdminUnit(fd)
      onSaved(result, !!unit)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-5 text-base font-black text-text">
          {unit ? 'Transportni tahrirlash' : 'Yangi transport qo\'shish'}
        </h2>

        <form onSubmit={submit} className="space-y-3">
          {/* Image */}
          <div
            onClick={() => fileRef.current.click()}
            className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-bg hover:border-gold/50 transition-colors"
          >
            {preview
              ? <img src={preview} alt="" className="h-full w-full object-cover" />
              : <span className="text-xs text-text-muted">Rasm tanlash (ixtiyoriy)</span>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-text-muted">Nomi *</label>
              <input
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-gold"
                value={form.model_name}
                onChange={(e) => set('model_name', e.target.value)}
                placeholder="masalan: Xiaomi Pro 2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-muted">Seriya raqami *</label>
              <input
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-gold"
                value={form.serial_number}
                onChange={(e) => set('serial_number', e.target.value)}
                placeholder="SN-0001"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-muted">Turi</label>
              <select
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-gold"
                value={form.unit_type}
                onChange={(e) => set('unit_type', e.target.value)}
              >
                {TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-muted">Holati</label>
              <select
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-gold"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-text-muted">Tavsif</label>
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-gold"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Qo'shimcha ma'lumot..."
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {unit ? 'Saqlash' : "Qo'shish"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ unit, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  async function confirm() {
    setLoading(true)
    try {
      await deleteAdminUnit(unit.id)
      onDeleted(unit.id)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-2 text-base font-black text-text">O'chirishni tasdiqlang</h2>
        <p className="mb-5 text-sm text-text-muted">
          <span className="font-semibold text-text">{unit.model_name}</span> o'chiriladi. Bu amalni qaytarib bo'lmaydi.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Bekor</Button>
          <Button
            className="flex-1 !bg-red-500 hover:!bg-red-600"
            loading={loading}
            onClick={confirm}
          >
            O'chirish
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function TransportsPage() {
  const [units, setUnits] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)   // null | 'create' | { unit }
  const [deleteUnit, setDeleteUnit] = useState(null)
  const [activeType, setActiveType] = useState('scooter')

  useEffect(() => {
    fetchAdminUnits()
      .then(setUnits)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  function onSaved(result, isEdit) {
    setUnits((prev) =>
      isEdit ? prev.map((u) => (u.id === result.id ? result : u)) : [result, ...prev]
    )
    setModal(null)
  }

  function onDeleted(id) {
    setUnits((prev) => prev.filter((u) => u.id !== id))
    setDeleteUnit(null)
  }

  const scooters = units.filter((u) => u.unit_type === 'scooter')
  const bikes    = units.filter((u) => u.unit_type === 'bike')
  const displayed = activeType === 'scooter' ? scooters : bikes

  const TABS = [
    { value: 'scooter', label: '🛴 Skuterlar', count: scooters.length },
    { value: 'bike',    label: '🚲 Velosipedlar', count: bikes.length },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-text sm:text-2xl">Transportlar</h1>
          <p className="text-xs text-text-muted">Skuter va velosipedlarni boshqarish</p>
        </div>
        <Button onClick={() => setModal('create')}>+ Qo'shish</Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveType(tab.value)}
            className={[
              'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all',
              activeType === tab.value
                ? 'border-gold bg-gold text-black'
                : 'border-border bg-surface text-text-muted hover:border-gold/40 hover:text-text',
            ].join(' ')}
          >
            {tab.label}
            <span className={[
              'rounded-full px-1.5 py-0.5 text-xs font-semibold',
              activeType === tab.value ? 'bg-black/15' : 'bg-bg text-text-muted',
            ].join(' ')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading && <p className="text-text-muted text-sm">Yuklanmoqda...</p>}

      {!isLoading && displayed.length === 0 && (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="mb-3 text-sm text-text-muted">Hozircha transport yo'q</p>
          <Button onClick={() => setModal('create')}>+ Birinchisini qo'shish</Button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayed.map((unit) => (
          <div
            key={unit.id}
            className="overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-gold/30"
          >
            {/* Image */}
            <div className="aspect-[4/3] bg-bg">
              {unit.image
                ? <img src={unit.image} alt={unit.model_name} className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-4xl">
                    {unit.unit_type === 'scooter' ? '🛴' : '🚲'}
                  </div>}
            </div>

            <div className="p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-text">{unit.model_name}</p>
                  <p className="text-xs text-text-muted">{unit.serial_number}</p>
                </div>
                <StatusBadge status={unit.status} />
              </div>

              {unit.description && (
                <p className="mb-3 line-clamp-2 text-xs text-text-muted">{unit.description}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModal({ unit })}
                  className="flex-1 rounded-lg border border-border py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-gold/40 hover:text-text"
                >
                  Tahrirlash
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteUnit(unit)}
                  className="flex-1 rounded-lg border border-red-500/30 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500 hover:text-white"
                >
                  O'chirish
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <UnitModal onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {modal && modal.unit && (
        <UnitModal unit={modal.unit} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {deleteUnit && (
        <DeleteConfirm unit={deleteUnit} onClose={() => setDeleteUnit(null)} onDeleted={onDeleted} />
      )}
    </div>
  )
}
