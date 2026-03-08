import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { costDatabaseAPI } from '../../api'

const CATEGORIES = ['All', 'membrane', 'insulation', 'coverboard', 'fastener', 'flashing', 'adhesive', 'accessory', 'sealant', 'coatings', 'asphalt', 'plates']
const UNITS = ['sqft', 'lnft', 'each', 'gallon', 'roll']
const MFR_QUICK_PICKS = ['Generic', 'Carlisle', 'Firestone', 'GAF', 'Johns Manville', 'Versico']

const fmtMoney = (v) => v != null ? `$${Number(v).toFixed(2)}` : '—'

// ── Category badge colors ──
const catColor = {
  membrane: 'bg-blue-100 text-blue-800',
  insulation: 'bg-yellow-100 text-yellow-800',
  coverboard: 'bg-amber-100 text-amber-800',
  fastener: 'bg-gray-100 text-gray-800',
  flashing: 'bg-orange-100 text-orange-800',
  adhesive: 'bg-green-100 text-green-800',
  accessory: 'bg-purple-100 text-purple-800',
  sealant: 'bg-pink-100 text-pink-800',
  coatings: 'bg-sky-100 text-sky-800',
  asphalt: 'bg-stone-200 text-stone-800',
  plates: 'bg-zinc-100 text-zinc-800',
}

// ── Add/Edit Modal ──
function ItemModal({ item, onSave, onClose }) {
  const isEdit = !!item?.id
  const [form, setForm] = useState({
    material_name: item?.material_name || '',
    manufacturer: item?.manufacturer || '',
    material_category: item?.material_category || 'membrane',
    unit: item?.unit || 'sqft',
    unit_cost: item?.unit_cost ?? 0,
    labor_cost_per_unit: item?.labor_cost_per_unit ?? 0,
    purchase_unit: item?.purchase_unit || '',
    units_per_purchase: item?.units_per_purchase ?? '',
    product_name: item?.product_name || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        unit_cost: parseFloat(form.unit_cost) || 0,
        labor_cost_per_unit: parseFloat(form.labor_cost_per_unit) || 0,
        units_per_purchase: form.units_per_purchase ? parseFloat(form.units_per_purchase) : null,
        purchase_unit: form.purchase_unit || null,
        product_name: form.product_name || null,
      }
      if (isEdit) {
        await costDatabaseAPI.update(item.id, payload)
      } else {
        await costDatabaseAPI.create(payload)
      }
      onSave()
    } catch (err) {
      console.error('Save failed:', err)
      alert('Failed to save: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, field, type = 'text', options, placeholder, half }) => (
    <div className={half ? 'col-span-1' : 'col-span-2'}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {options ? (
        <select
          value={form[field]}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[field]}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
          placeholder={placeholder}
          step={type === 'number' ? '0.01' : undefined}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit' : 'Add'} Cost Database Item</h3>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <Field label="Material Name" field="material_name" placeholder="e.g. TPO 60mil Membrane" />
          {/* Manufacturer with quick-pick tags */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Manufacturer</label>
            <input
              type="text"
              value={form.manufacturer}
              onChange={e => setForm({ ...form, manufacturer: e.target.value })}
              placeholder="e.g. Carlisle"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {MFR_QUICK_PICKS.map(mfr => (
                <button key={mfr} type="button"
                  onClick={() => setForm({ ...form, manufacturer: mfr })}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    form.manufacturer === mfr
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >{mfr}</button>
              ))}
            </div>
          </div>
          {/* Multi-category selector */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <div className="flex flex-wrap gap-1 p-1.5 border border-gray-300 rounded-md bg-white min-h-[38px]">
              {CATEGORIES.filter(c => c !== 'All').map(cat => {
                const cats = (form.material_category || '').split(',').map(c => c.trim()).filter(Boolean)
                const isSelected = cats.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      let newCats
                      if (isSelected) {
                        newCats = cats.filter(c => c !== cat)
                        if (newCats.length === 0) newCats = [cat]
                      } else {
                        newCats = [...cats, cat]
                      }
                      setForm({ ...form, material_category: newCats.join(',') })
                    }}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                      isSelected
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>
          <Field label="Unit" field="unit" half options={UNITS} />
          <Field label="Unit Cost ($)" field="unit_cost" type="number" half />
          <Field label="Labor Cost ($)" field="labor_cost_per_unit" type="number" half />
          <Field label="Purchase Unit" field="purchase_unit" half placeholder="e.g. Roll, Box, Pail" />
          <Field label="Units per Purchase" field="units_per_purchase" type="number" half placeholder="e.g. 1000" />
          <Field label="Product Name" field="product_name" placeholder="e.g. TPO 60mil 10x100 Roll" />
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.material_name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >{saving ? 'Saving...' : isEdit ? 'Update' : 'Add Item'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Inline Edit Row ──
function InlineEditRow({ item, onSave, onCancel }) {
  const [cost, setCost] = useState(item.unit_cost ?? 0)
  const [labor, setLabor] = useState(item.labor_cost_per_unit ?? 0)
  const [pu, setPu] = useState(item.purchase_unit || '')
  const [upp, setUpp] = useState(item.units_per_purchase ?? '')
  const [category, setCategory] = useState(item.material_category || '')
  const [manufacturer, setManufacturer] = useState(item.manufacturer || '')
  const [saving, setSaving] = useState(false)

  const cats = category.split(',').map(c => c.trim()).filter(Boolean)
  const toggleCat = (cat) => {
    let newCats
    if (cats.includes(cat)) {
      newCats = cats.filter(c => c !== cat)
      if (newCats.length === 0) newCats = [cat]
    } else {
      newCats = [...cats, cat]
    }
    setCategory(newCats.join(','))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await costDatabaseAPI.update(item.id, {
        unit_cost: parseFloat(cost) || 0,
        labor_cost_per_unit: parseFloat(labor) || 0,
        purchase_unit: pu || null,
        units_per_purchase: upp ? parseFloat(upp) : null,
        material_category: category,
        manufacturer: manufacturer || null,
      })
      onSave()
    } catch (err) {
      console.error('Update failed:', err)
      alert('Failed to update: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="bg-blue-50 border-b border-blue-200">
      <td className="px-3 py-2 text-center w-10"></td>
      <td className="px-3 py-2 text-sm text-gray-900">
        <div className="min-w-[200px]">{item.material_name}</div>
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={manufacturer}
          onChange={e => setManufacturer(e.target.value)}
          placeholder="Manufacturer"
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 mb-1"
        />
        <div className="flex flex-wrap gap-0.5">
          {MFR_QUICK_PICKS.map(mfr => (
            <button key={mfr} type="button" onClick={() => setManufacturer(mfr)}
              className={`px-1 py-0.5 text-[9px] font-medium rounded transition-colors ${
                manufacturer === mfr ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}>{mfr}</button>
          ))}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-0.5 min-w-[120px]">
          {CATEGORIES.filter(c => c !== 'All').map(cat => (
            <button key={cat} type="button" onClick={() => toggleCat(cat)}
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                cats.includes(cat) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}>{cat}</button>
          ))}
        </div>
      </td>
      <td className="px-3 py-2 text-sm text-gray-600">{item.unit}</td>
      <td className="px-3 py-2">
        <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-primary-500" />
      </td>
      <td className="px-3 py-2">
        <input type="number" step="0.01" value={labor} onChange={e => setLabor(e.target.value)}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-primary-500" />
      </td>
      <td className="px-3 py-2">
        <input type="text" value={pu} onChange={e => setPu(e.target.value)}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500" placeholder="Box" />
      </td>
      <td className="px-3 py-2">
        <input type="number" value={upp} onChange={e => setUpp(e.target.value)}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-primary-500" placeholder="500" />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={saving}
            className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50">
            {saving ? '...' : 'Save'}
          </button>
          <button onClick={onCancel}
            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300">
            Cancel
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Main Component ──
export default function CostDatabaseTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [manufacturerFilter, setManufacturerFilter] = useState('All')
  const [editingId, setEditingId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalItem, setModalItem] = useState(null)
  const [message, setMessage] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [sortField, setSortField] = useState('material_name')
  const [sortDir, setSortDir] = useState('asc')
  const [dedupResult, setDedupResult] = useState(null)
  const [dedupRunning, setDedupRunning] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkForm, setBulkForm] = useState({ manufacturer: '', material_category: '' })
  const [bulkUpdating, setBulkUpdating] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    try {
      const resp = await costDatabaseAPI.list()
      setItems(resp.data)
    } catch (err) {
      console.error('Failed to load cost database:', err)
      showMsg('Failed to load cost database', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadItems() }, [])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  // Derived data
  const manufacturers = useMemo(() => {
    const set = new Set(items.map(i => i.manufacturer).filter(Boolean))
    set.add('Generic')
    return ['All', ...Array.from(set).sort()]
  }, [items])

  const filtered = useMemo(() => {
    let result = items
    if (categoryFilter !== 'All') {
      result = result.filter(i => (i.material_category || '').split(',').map(c => c.trim()).includes(categoryFilter))
    }
    if (manufacturerFilter !== 'All') {
      result = result.filter(i => i.manufacturer === manufacturerFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.material_name.toLowerCase().includes(q) ||
        (i.manufacturer || '').toLowerCase().includes(q) ||
        (i.product_name || '').toLowerCase().includes(q)
      )
    }
    // Sort
    result = [...result].sort((a, b) => {
      let av = a[sortField] ?? ''
      let bv = b[sortField] ?? ''
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [items, categoryFilter, manufacturerFilter, search, sortField, sortDir])

  // Stats
  const stats = useMemo(() => {
    const total = items.length
    const needsPricing = items.filter(i => !i.unit_cost || i.unit_cost === 0).length
    const cats = new Set(items.map(i => i.material_category)).size
    const mfrs = new Set(items.filter(i => i.manufacturer).map(i => i.manufacturer)).size
    return { total, needsPricing, cats, mfrs }
  }, [items])

  const handleDelete = async (item) => {
    try {
      await costDatabaseAPI.delete(item.id)
      showMsg(`Deleted "${item.material_name}"`)
      setDeleteConfirm(null)
      loadItems()
    } catch (err) {
      console.error('Delete failed:', err)
      showMsg('Failed to delete item', 'error')
    }
  }

  const handleDedupScan = async () => {
    setDedupRunning(true)
    try {
      const res = await costDatabaseAPI.dedup(true) // dry_run = true
      setDedupResult(res.data)
      if (res.data.duplicate_groups === 0) {
        showMsg('No duplicates found — your database is clean!', 'success')
      }
    } catch (err) {
      showMsg('Failed to scan for duplicates: ' + (err.response?.data?.detail || err.message), 'error')
    } finally {
      setDedupRunning(false)
    }
  }

  const handleDedupMerge = async () => {
    if (!window.confirm(`This will merge ${dedupResult?.total_duplicates || 0} duplicate items and keep the best version of each. Continue?`)) return
    setDedupRunning(true)
    try {
      const res = await costDatabaseAPI.dedup(false) // dry_run = false — actually merge
      showMsg(`Cleaned up ${res.data.items_removed} duplicates across ${res.data.duplicate_groups} groups. ${res.data.references_updated} material references updated.`, 'success')
      setDedupResult(null)
      loadItems()
    } catch (err) {
      showMsg('Failed to merge duplicates: ' + (err.response?.data?.detail || err.message), 'error')
    } finally {
      setDedupRunning(false)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortHeader = ({ field, children, className = '' }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none ${className}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-primary-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  )

  // ── Selection handlers ──
  const handleSelectItem = (itemId) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(item => item.id)))
    }
  }

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return
    if (!bulkForm.manufacturer && !bulkForm.material_category) {
      showMsg('Select a manufacturer or category to apply', 'error')
      return
    }
    if (!window.confirm(`Update ${selectedIds.size} item(s)? This cannot be undone.`)) return
    setBulkUpdating(true)
    try {
      const res = await costDatabaseAPI.bulkUpdate(Array.from(selectedIds), bulkForm)
      showMsg(res.data?.message || `Updated ${selectedIds.size} items`, 'success')
      setSelectedIds(new Set())
      setBulkForm({ manufacturer: '', material_category: '' })
      await loadItems()
    } catch (err) {
      console.error('Bulk update failed:', err)
      showMsg('Bulk update failed: ' + (err.response?.data?.detail || err.message), 'error')
    } finally {
      setBulkUpdating(false)
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setBulkForm({ manufacturer: '', material_category: '' })
  }

  // Checkbox ref for indeterminate state
  const selectAllRef = useCallback(node => {
    if (node) {
      node.indeterminate = selectedIds.size > 0 && selectedIds.size < filtered.length
    }
  }, [selectedIds.size, filtered.length])

  return (
    <div>
      {/* Toast */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-md text-sm font-medium ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Items</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.mfrs}</div>
          <div className="text-xs text-gray-500 mt-1">Manufacturers</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.cats}</div>
          <div className="text-xs text-gray-500 mt-1">Categories</div>
        </div>
        <div className={`rounded-lg border p-4 ${stats.needsPricing > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
          <div className={`text-2xl font-bold ${stats.needsPricing > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
            {stats.needsPricing}
          </div>
          <div className={`text-xs mt-1 ${stats.needsPricing > 0 ? 'text-yellow-600' : 'text-green-600'}`}>Need Pricing</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, manufacturer, or product..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>
          {/* Manufacturer Filter */}
          <select
            value={manufacturerFilter}
            onChange={e => setManufacturerFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500"
          >
            {manufacturers.map(m => (
              <option key={m} value={m}>{m === 'All' ? 'All Manufacturers' : m}</option>
            ))}
          </select>
          {/* Clean Duplicates Button */}
          <button
            onClick={handleDedupScan}
            disabled={dedupRunning}
            className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 flex items-center gap-2 disabled:opacity-50"
          >
            {dedupRunning ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            Clean Duplicates
          </button>
          {/* Add Button */}
          <button
            onClick={() => { setModalItem(null); setShowModal(true) }}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Showing {filtered.length} of {items.length} items
        </div>
      </div>

      {/* Dedup Results Panel */}
      {dedupResult && dedupResult.duplicate_groups > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Found {dedupResult.duplicate_groups} duplicate groups ({dedupResult.total_duplicates} items to remove)
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                For each group, the best item (with pricing, manufacturer, org-specific) will be kept.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDedupResult(null)}
                className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Dismiss
              </button>
              <button
                onClick={handleDedupMerge}
                disabled={dedupRunning}
                className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50"
              >
                {dedupRunning ? 'Merging...' : 'Merge All Duplicates'}
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {dedupResult.details.map((group, i) => (
              <div key={i} className="bg-white rounded border border-amber-200 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">KEEP</span>
                  <span className="text-sm font-medium text-gray-900">{group.kept.material_name}</span>
                  {group.kept.manufacturer && <span className="text-xs text-gray-500">{group.kept.manufacturer}</span>}
                  {group.kept.unit_cost > 0 && <span className="text-xs text-gray-500">${group.kept.unit_cost}</span>}
                  <span className="text-[10px] text-gray-400">ID: {group.kept.id}</span>
                </div>
                {group.removed.map((dupe, j) => (
                  <div key={j} className="flex items-center gap-2 ml-4 mt-1">
                    <span className="text-xs font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">REMOVE</span>
                    <span className="text-xs text-gray-700">{dupe.material_name}</span>
                    {dupe.manufacturer && <span className="text-[10px] text-gray-400">{dupe.manufacturer}</span>}
                    {dupe.unit_cost > 0 && <span className="text-[10px] text-gray-400">${dupe.unit_cost}</span>}
                    {dupe.is_global && <span className="text-[10px] text-blue-500">global</span>}
                    {(dupe.refs_would_relink > 0) && (
                      <span className="text-[10px] text-amber-600">{dupe.refs_would_relink} refs will relink</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-center w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    title="Select all"
                  />
                </th>
                <SortHeader field="material_name">Name</SortHeader>
                <SortHeader field="manufacturer">Manufacturer</SortHeader>
                <SortHeader field="material_category">Category</SortHeader>
                <SortHeader field="unit">Unit</SortHeader>
                <SortHeader field="unit_cost" className="text-right">Unit $</SortHeader>
                <SortHeader field="labor_cost_per_unit" className="text-right">Labor $</SortHeader>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purch Unit</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty/Purch</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
                    Loading cost database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No items found matching your filters.
                  </td>
                </tr>
              ) : filtered.map(item => (
                editingId === item.id ? (
                  <InlineEditRow
                    key={item.id}
                    item={item}
                    onSave={() => { setEditingId(null); showMsg('Item updated'); loadItems() }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={item.id} className={`hover:bg-gray-50 ${selectedIds.has(item.id) ? 'bg-blue-50' : ''} ${(!item.unit_cost || item.unit_cost === 0) ? 'bg-yellow-50' : ''}`}>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      <div className="min-w-[200px]">
                        {item.material_name}
                        {item.product_name && item.product_name.toLowerCase() !== item.material_name.toLowerCase() && (
                          <div className="text-xs text-gray-400 font-normal mt-0.5">{item.product_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">{item.manufacturer || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-0.5">
                        {(item.material_category || '').split(',').map(c => c.trim()).filter(Boolean).map((cat, ci) => (
                          <span key={ci} className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${catColor[cat] || 'bg-gray-100 text-gray-800'}`}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">{item.unit}</td>
                    <td className={`px-3 py-2 text-sm text-right ${item.unit_cost ? 'text-gray-900' : 'text-red-500 font-medium'}`}>
                      {fmtMoney(item.unit_cost)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-600">{fmtMoney(item.labor_cost_per_unit)}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{item.purchase_unit || '—'}</td>
                    <td className="px-3 py-2 text-sm text-gray-600 text-right">{item.units_per_purchase || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingId(item.id)}
                          className="p-1 text-gray-400 hover:text-primary-600 rounded"
                          title="Quick edit pricing"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setModalItem(item); setShowModal(true) }}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                          title="Full edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-900">
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-700">
              Clear selection
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            {/* Manufacturer */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Set Manufacturer</label>
              <input
                type="text"
                value={bulkForm.manufacturer}
                onChange={e => setBulkForm(f => ({ ...f, manufacturer: e.target.value }))}
                placeholder="Type or pick below..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 mb-1"
              />
              <div className="flex flex-wrap gap-1">
                {MFR_QUICK_PICKS.map(mfr => (
                  <button key={mfr} type="button"
                    onClick={() => setBulkForm(f => ({ ...f, manufacturer: mfr }))}
                    className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                      bulkForm.manufacturer === mfr ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{mfr}</button>
                ))}
              </div>
            </div>
            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Set Category</label>
              <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-md bg-white min-h-[40px]">
                {CATEGORIES.filter(c => c !== 'All').map(cat => {
                  const cats = (bulkForm.material_category || '').split(',').map(c => c.trim()).filter(Boolean)
                  const isOn = cats.includes(cat)
                  return (
                    <button key={cat} type="button"
                      onClick={() => {
                        const next = isOn ? cats.filter(c => c !== cat) : [...cats, cat]
                        setBulkForm(f => ({ ...f, material_category: next.join(',') }))
                      }}
                      className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                        isOn ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>{cat}</button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={clearSelection}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Cancel
            </button>
            <button onClick={handleBulkUpdate}
              disabled={bulkUpdating || (!bulkForm.manufacturer && !bulkForm.material_category)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
              {bulkUpdating ? 'Updating...' : `Apply to ${selectedIds.size} Items`}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Item?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <strong>{deleteConfirm.material_name}</strong>? This will deactivate it in the cost database.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <ItemModal
          item={modalItem}
          onClose={() => { setShowModal(false); setModalItem(null) }}
          onSave={() => { setShowModal(false); setModalItem(null); showMsg(modalItem ? 'Item updated' : 'Item added'); loadItems() }}
        />
      )}
    </div>
  )
}
