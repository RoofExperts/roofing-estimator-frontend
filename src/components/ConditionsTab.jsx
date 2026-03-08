import { useState, useEffect, useCallback } from 'react'
import { conditionAPI, referenceAPI, planAPI, projectAPI, systemAPI } from '../api'
import { useRef } from 'react'
import { LoadingSpinner, ErrorDisplay } from './common'
import Modal from './Modal'

// ============================================================================
// ICONS (inline SVG helpers)
// ============================================================================
const ChevronDown = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)
const ChevronRight = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)
const PlusIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)
const TrashIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)
const SpinnerIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)
const BoltIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)
const SearchIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)
const ArrowUpIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
)
const ArrowDownIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)
const PencilIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
)

// Unit display helpers
const UNIT_LABELS = { sqft: 'SF', lnft: 'LF', each: 'EA' }
const fmtUnit = (u) => UNIT_LABELS[u] || u
const fmtNum = (v) => v != null ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'
const fmtMoney = (v) => v != null ? '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

// Pretty condition type labels
const TYPE_LABELS = {
  field: 'Field', wall_flashing: 'Wall Flashing', roof_drain: 'Roof Drain',
  scupper: 'Scupper', pipe_flashing: 'Pipe Flashing', coping: 'Coping',
  perimeter: 'Perimeter', curb: 'Curb', penetration: 'Penetration',
  corner: 'Corner', expansion_joint: 'Expansion Joint', edge_detail: 'Edge Detail',
  transition: 'Transition', parapet: 'Parapet', custom: 'Custom',
}

// Condition type colors for card headers
const TYPE_COLORS = {
  field:            { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800', accent: 'border-l-blue-500' },
  wall_flashing:    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800', accent: 'border-l-amber-500' },
  roof_drain:       { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800', badge: 'bg-cyan-100 text-cyan-800', accent: 'border-l-cyan-500' },
  scupper:          { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', badge: 'bg-teal-100 text-teal-800', accent: 'border-l-teal-500' },
  pipe_flashing:    { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800', badge: 'bg-violet-100 text-violet-800', accent: 'border-l-violet-500' },
  coping:           { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800', accent: 'border-l-orange-500' },
  perimeter:        { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-800', accent: 'border-l-green-500' },
  curb:             { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', badge: 'bg-pink-100 text-pink-800', accent: 'border-l-pink-500' },
  penetration:      { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', badge: 'bg-rose-100 text-rose-800', accent: 'border-l-rose-500' },
  corner:           { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-800', accent: 'border-l-indigo-500' },
  expansion_joint:  { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', badge: 'bg-gray-100 text-gray-800', accent: 'border-l-gray-500' },
  edge_detail:      { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-800', badge: 'bg-lime-100 text-lime-800', accent: 'border-l-lime-500' },
  transition:       { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-800', accent: 'border-l-emerald-500' },
  parapet:          { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800', accent: 'border-l-yellow-500' },
  custom:           { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', badge: 'bg-slate-100 text-slate-800', accent: 'border-l-slate-500' },
}
const getColors = (type) => TYPE_COLORS[type] || TYPE_COLORS.custom

// ============================================================================
// COST DATABASE SEARCH INPUT — dropdown that searches the cost DB
// ============================================================================
function CostDbSearchInput({ category, onSelect, placeholder = 'Search materials...' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = { current: null }

  const doSearch = async (q) => {
    setLoading(true)
    try {
      const res = await conditionAPI.searchCostDatabase(q, category || '')
      setResults(res.data || [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setOpen(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 250)
  }

  const handleFocus = () => {
    setOpen(true)
    if (results.length === 0) doSearch(query)
  }

  const handleSelect = (item) => {
    setQuery(item.material_name)
    setOpen(false)
    onSelect(item)
  }

  return (
    <div className="relative">
      <div className="relative">
        <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
          placeholder={placeholder}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
          {loading && <div className="px-3 py-3 text-xs text-gray-400 text-center">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">No matches found</div>
          )}
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2.5 hover:bg-primary-50 border-b border-gray-50 last:border-0 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900">{item.material_name}</div>
              <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                {item.manufacturer && <span>{item.manufacturer}</span>}
                <span>{fmtUnit(item.unit)}</span>
                <span className="font-medium">{fmtMoney(item.unit_cost)}/{item.unit}</span>
                {item.product_name && <span className="text-gray-400">{item.product_name}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


// Category-specific labels for what "coverage_rate" means
const COVERAGE_LABELS = {
  fastener:  'Per Board',
  adhesive:  'Gal / SQ',
  sealant:   'Tubes / 100 LF',
  membrane:  'Coverage Rate',
  insulation:'Coverage Rate',
  flashing:  'Coverage Rate',
  metal:     'Coverage Rate',
  accessory: 'Coverage Rate',
  misc:      'Coverage Rate',
}

const SwapIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

// ============================================================================
// MATERIAL ITEM — Product-selector card for each material in a condition
// ============================================================================
function MaterialItem({ material, index, totalCount, conditionMeasurement, onUpdate, onDelete, onMove, onSwapProduct }) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setEditing(true)
    setValues({
      coverage_rate: material.coverage_rate,
      waste_factor: material.waste_factor,
      override_quantity: material.override_quantity ?? '',
      notes: material.notes || '',
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await onUpdate(material.id, {
        coverage_rate: parseFloat(values.coverage_rate) || 0,
        waste_factor: parseFloat(values.waste_factor) || 0,
        override_quantity: values.override_quantity !== '' ? parseFloat(values.override_quantity) : null,
        notes: values.notes || null,
      })
      setEditing(false)
    } finally { setSaving(false) }
  }

  const toggleIncluded = async () => {
    await onUpdate(material.id, { is_included: !material.is_included })
  }

  // Use enriched qty from backend if available, otherwise compute
  const qtyCalc = material.qty_calculated || 0
  const unitCost = material.unit_cost || 0
  const laborCost = material.labor_cost_per_unit || 0
  const extCost = material.extended_cost || 0
  const coverage = material.coverage_rate || 1
  const waste = material.waste_factor || 0
  const isFastener = material.material_category === 'fastener'
  const coverageLabel = COVERAGE_LABELS[material.material_category] || 'Coverage Rate'
  const hasProduct = !!material.cost_database_item_id

  // Category badge colors
  const catColors = {
    membrane: 'bg-blue-100 text-blue-800',
    insulation: 'bg-purple-100 text-purple-800',
    fastener: 'bg-orange-100 text-orange-800',
    adhesive: 'bg-teal-100 text-teal-800',
    flashing: 'bg-amber-100 text-amber-800',
    metal: 'bg-gray-200 text-gray-800',
    sealant: 'bg-cyan-100 text-cyan-800',
    accessory: 'bg-pink-100 text-pink-800',
    coverboard: 'bg-yellow-100 text-yellow-800',
    base_sheet: 'bg-lime-100 text-lime-800',
    misc: 'bg-slate-100 text-slate-700',
  }
  const catBadge = catColors[material.material_category] || 'bg-gray-100 text-gray-700'

  return (
    <div className={`group relative border rounded-lg transition-all ${
      !material.is_included
        ? 'bg-gray-50 border-gray-200 opacity-40'
        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
    }`}>
      {/* Row 1: Material header with toggle, name, category, product info, and actions */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100">
        {/* Toggle */}
        <input
          type="checkbox"
          checked={material.is_included}
          onChange={toggleIncluded}
          className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 flex-shrink-0"
        />

        {/* Category badge */}
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${catBadge} flex-shrink-0 uppercase tracking-wide`}>
          {material.material_category}
        </span>

        {/* Material Name + Product Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">{material.material_name}</span>
          </div>
          {/* Subtitle: manufacturer + product name (only if different from material_name) */}
          {(() => {
            const mName = (material.material_name || '').toLowerCase()
            const pName = (material.product_name || '').toLowerCase()
            const showProduct = material.product_name && !pName.includes(mName) && !mName.includes(pName)
            if (!material.manufacturer && !showProduct) return null
            return (
              <div className="text-xs text-gray-500 mt-0.5">
                {material.manufacturer && <span>{material.manufacturer}</span>}
                {material.manufacturer && showProduct && <span> — </span>}
                {showProduct && <span>{material.product_name}</span>}
              </div>
            )
          })()}
        </div>

        {/* Product link status + change button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasProduct ? (
            <button
              onClick={() => onSwapProduct(material)}
              className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 rounded-md transition-colors"
              title="Change to a different product"
            >
              <SwapIcon className="w-3 h-3" />
              Change
            </button>
          ) : unitCost > 0 ? (
            <button
              onClick={() => onSwapProduct(material)}
              className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-md font-medium transition-colors"
              title="Link to a specific product"
            >
              <SwapIcon className="w-3 h-3" />
              Link Product
            </button>
          ) : (
            <button
              onClick={() => onSwapProduct(material)}
              className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-md font-semibold transition-colors animate-pulse"
              title="Select a product from cost database"
            >
              <SearchIcon className="w-3 h-3" />
              Select Product
            </button>
          )}
        </div>

        {/* Reorder + delete */}
        <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-gray-100 pl-2 ml-1">
          <div className="flex flex-col">
            <button onClick={() => onMove(index, 'up')} disabled={index === 0}
              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed" title="Move up">
              <ArrowUpIcon className="w-3 h-3" />
            </button>
            <button onClick={() => onMove(index, 'down')} disabled={index === totalCount - 1}
              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed" title="Move down">
              <ArrowDownIcon className="w-3 h-3" />
            </button>
          </div>
          <button onClick={() => onDelete(material.id)}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Remove material">
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2: Parameters and cost — only show when included */}
      {material.is_included && (
        <div className="px-3 py-2">
          {!editing ? (
            <div className="flex items-center justify-between">
              {/* Left: editable params */}
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <button onClick={startEdit} className="flex items-center gap-3 hover:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors group"
                  title="Click to edit parameters">
                  <span>{coverageLabel}: <span className="font-mono font-medium text-gray-800">{coverage}</span></span>
                  <span className="text-gray-300">|</span>
                  <span>Waste: <span className="font-mono font-medium text-gray-800">{(waste * 100).toFixed(0)}%</span></span>
                  {material.override_quantity && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>Override Qty: <span className="font-mono font-medium text-amber-700">{fmtNum(material.override_quantity)}</span></span>
                    </>
                  )}
                  <PencilIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* Right: qty + cost summary */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">
                  Qty: <span className="font-mono font-medium text-gray-800">{fmtNum(qtyCalc)}</span> {fmtUnit(material.unit)}
                </span>
                {unitCost > 0 && (
                  <>
                    <span className="text-gray-400">@</span>
                    <span className="text-gray-500">{fmtMoney(unitCost)}</span>
                    {laborCost > 0 && <span className="text-gray-400">+{fmtMoney(laborCost)} labor</span>}
                  </>
                )}
                {extCost > 0 && (
                  <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{fmtMoney(extCost)}</span>
                )}
              </div>
            </div>
          ) : (
            /* Edit form — parameters */
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">{coverageLabel}</label>
                  <input
                    type="number" step="0.001" value={values.coverage_rate}
                    onChange={(e) => setValues({ ...values, coverage_rate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                  {isFastener && (
                    <p className="text-[10px] text-gray-400 mt-0.5">e.g., 5 fasteners per board of insulation</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Waste %</label>
                  <div className="relative">
                    <input
                      type="number" step="1" value={Math.round(values.waste_factor * 100)}
                      onChange={(e) => setValues({ ...values, waste_factor: parseFloat(e.target.value) / 100 || 0 })}
                      className="w-full px-2.5 py-1.5 pr-7 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Override Quantity</label>
                  <input
                    type="number" step="0.01" value={values.override_quantity}
                    onChange={(e) => setValues({ ...values, override_quantity: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Auto-calculate"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Notes</label>
                  <input
                    type="text" value={values.notes}
                    onChange={(e) => setValues({ ...values, notes: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                <button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ============================================================================
// CONDITION CARD — Expandable card for one condition with material stack
// ============================================================================
function ConditionCard({ condition, onRefresh, onToggleActive, isSystemCondition, systemData }) {
  const [expanded, setExpanded] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState(false)
  const [measValue, setMeasValue] = useState(condition.measurement_value)
  const [measUnit, setMeasUnit] = useState(condition.measurement_unit)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(condition.description || '')
  const [addingMaterial, setAddingMaterial] = useState(false)
  const [swapMaterial, setSwapMaterial] = useState(null)
  const [error, setError] = useState('')

  const materials = condition.materials || []
  const includedMats = materials.filter(m => m.is_included)
  const colors = getColors(condition.condition_type)

  // Total material cost for this condition — use backend enriched extended_cost
  const totalCost = includedMats.reduce((sum, m) => sum + (m.extended_cost || 0), 0)

  // --- Material CRUD ---
  const handleUpdateMaterial = async (materialId, data) => {
    try {
      await conditionAPI.updateMaterial(materialId, data)
      onRefresh()
    } catch { setError('Failed to update material') }
  }

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Remove this material from the condition?')) return
    try {
      await conditionAPI.deleteMaterial(materialId)
      onRefresh()
    } catch { setError('Failed to delete material') }
  }

  const handleAddFromCostDb = async (costItem) => {
    try {
      await conditionAPI.addMaterial(condition.id, {
        cost_database_item_id: costItem.id,
        coverage_rate: 1.0,
        waste_factor: 0.10,
      })
      setAddingMaterial(false)
      onRefresh()
    } catch { setError('Failed to add material') }
  }

  const handleMoveMaterial = async (index, direction) => {
    const sorted = [...materials].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const swapIdx = direction === 'up' ? index - 1 : index + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    // Build new order
    const items = sorted.map((m, i) => {
      if (i === index) return { material_id: m.id, sort_order: swapIdx }
      if (i === swapIdx) return { material_id: m.id, sort_order: index }
      return { material_id: m.id, sort_order: i }
    })
    try {
      await conditionAPI.reorderMaterials(condition.id, items)
      onRefresh()
    } catch { setError('Failed to reorder') }
  }

  const handleSwapProduct = async (costItem) => {
    if (!swapMaterial) return
    try {
      await conditionAPI.updateMaterial(swapMaterial.id, {
        material_name: costItem.material_name,
        cost_database_item_id: costItem.id,
      })
      setSwapMaterial(null)
      onRefresh()
    } catch { setError('Failed to swap product') }
  }

  // --- Inline measurement edit ---
  const saveMeasurement = async () => {
    try {
      await conditionAPI.update(condition.id, {
        measurement_value: parseFloat(measValue),
        measurement_unit: measUnit,
      })
      setEditingMeasurement(false)
      onRefresh()
    } catch { setError('Failed to update measurement') }
  }

  const saveDescription = async () => {
    try {
      await conditionAPI.update(condition.id, { description: descValue })
      setEditingDesc(false)
      onRefresh()
    } catch { setError('Failed to update') }
  }

  const handleDeleteCondition = async () => {
    if (!window.confirm(`Delete "${condition.label || condition.condition_type}" and all its materials?`)) return
    try {
      await conditionAPI.delete(condition.id)
      onRefresh()
    } catch { setError('Failed to delete condition') }
  }

  const sortedMaterials = [...materials].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  return (
    <div className={`border rounded-xl overflow-hidden border-l-4 ${colors.accent} ${expanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'} transition-all bg-white`}>
      {/* Card Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </div>

          {/* Type badge */}
          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md ${colors.badge}`}>
            {TYPE_LABELS[condition.condition_type] || condition.condition_type}
          </span>

          {/* Label / Description + Buildup Stack for field conditions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {condition.label && condition.label !== condition.condition_type && (
                <span className="text-sm font-medium text-gray-900 truncate">{condition.label}</span>
              )}
              {condition.description && (
                <span className="text-xs text-gray-500 truncate">{condition.description}</span>
              )}
            </div>
            {condition.condition_type === 'field' && systemData && (
              <BuildupStack systemData={systemData} />
            )}
          </div>

          {/* Measurement value — click to edit */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {editingMeasurement ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={measValue}
                  onChange={(e) => setMeasValue(e.target.value)}
                  className="w-24 px-2 py-1 border border-primary-300 rounded text-sm font-mono focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') saveMeasurement(); if (e.key === 'Escape') setEditingMeasurement(false) }}
                />
                <select
                  value={measUnit}
                  onChange={(e) => setMeasUnit(e.target.value)}
                  className="px-1 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="sqft">SF</option>
                  <option value="lnft">LF</option>
                  <option value="each">EA</option>
                </select>
                <button onClick={saveMeasurement} className="text-xs text-green-700 font-medium hover:text-green-900 px-1">Save</button>
                <button onClick={() => setEditingMeasurement(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => { setMeasValue(condition.measurement_value); setMeasUnit(condition.measurement_unit); setEditingMeasurement(true) }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors group"
                title="Click to edit measurement"
              >
                <span className="text-sm font-bold font-mono text-gray-800">{fmtNum(condition.measurement_value)}</span>
                <span className="text-xs font-medium text-gray-500">{fmtUnit(condition.measurement_unit)}</span>
                <PencilIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        </div>

        {/* Right side info */}
        <div className="flex items-center gap-3 ml-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {condition.wind_zone && condition.wind_zone !== '1' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">WZ{condition.wind_zone}</span>
          )}
          <span className="text-xs text-gray-500">
            {includedMats.length}/{materials.length} materials
          </span>
          {totalCost > 0 && (
            <span className="text-xs font-medium text-gray-700">{fmtMoney(totalCost)}</span>
          )}
          <button
            onClick={handleDeleteCondition}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete condition"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100">
          {error && (
            <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 flex items-center justify-between">
              {error}
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
            </div>
          )}

          {/* Material Stack */}
          <div className="p-4">
            {sortedMaterials.length > 0 ? (
              <div className="space-y-2">
                {sortedMaterials.map((mat, idx) => (
                  <MaterialItem
                    key={mat.id}
                    material={mat}
                    index={idx}
                    totalCount={sortedMaterials.length}
                    conditionMeasurement={condition.measurement_value}
                    onUpdate={handleUpdateMaterial}
                    onDelete={handleDeleteMaterial}
                    onMove={handleMoveMaterial}
                    onSwapProduct={(m) => setSwapMaterial(m)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                No materials yet. Click "+ Add Material" below to pull from cost database.
              </div>
            )}

            {/* Add Material Section */}
            <div className="mt-3">
              {addingMaterial ? (
                <div className="border border-primary-200 bg-primary-50/30 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-700 mb-2">Search cost database to add a material:</div>
                  <CostDbSearchInput
                    category=""
                    placeholder="Search by name, category, or manufacturer..."
                    onSelect={handleAddFromCostDb}
                  />
                  <div className="flex justify-end mt-2">
                    <button onClick={() => setAddingMaterial(false)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingMaterial(true)}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
                  Add Material
                </button>
              )}
            </div>
          </div>

          {/* Product Swap / Select Modal */}
          {swapMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSwapMaterial(null)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-200">
                  <h3 className="text-base font-semibold text-gray-900">
                    {swapMaterial.cost_database_item_id ? 'Change Product' : 'Select Product'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {swapMaterial.cost_database_item_id
                      ? <>Replace <span className="font-medium">{swapMaterial.material_name}</span> with a different product</>
                      : <>Choose a product from your cost database for <span className="font-medium">{swapMaterial.material_name}</span></>
                    }
                  </p>
                </div>
                <div className="p-5">
                  <CostDbSearchInput
                    category={swapMaterial.material_category}
                    placeholder={`Search ${swapMaterial.material_category} products...`}
                    onSelect={handleSwapProduct}
                  />
                </div>
                <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setSwapMaterial(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ============================================================================
// PLAN ANALYSIS SECTION (compact, kept from original)
// ============================================================================
function PlanAnalysisSection({ projectId, onConditionsChanged }) {
  const [planFiles, setPlanFiles] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [extractions, setExtractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [pollingId, setPollingId] = useState(null)
  const [error, setError] = useState('')

  const fetchPlans = useCallback(async () => {
    try {
      const res = await planAPI.list(projectId)
      const plans = res.data || []
      setPlanFiles(plans)
      if (plans.length > 0 && !selectedPlan) setSelectedPlan(plans[0])
    } catch { setPlanFiles([]) }
    finally { setLoading(false) }
  }, [projectId, selectedPlan])

  const fetchExtractions = useCallback(async (planFileId) => {
    try {
      const res = await planAPI.extractions(planFileId)
      setExtractions(res.data || [])
    } catch { setExtractions([]) }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])
  useEffect(() => { if (selectedPlan?.id) fetchExtractions(selectedPlan.id) }, [selectedPlan, fetchExtractions])

  useEffect(() => {
    if (!pollingId) return
    const interval = setInterval(async () => {
      try {
        const res = await planAPI.status(pollingId)
        const status = res.data?.status
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval)
          setPollingId(null)
          setAnalyzing(false)
          fetchPlans()
          fetchExtractions(pollingId)
          if (status === 'failed') setError(`Analysis failed: ${res.data?.error_message || 'Unknown error'}`)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(interval)
  }, [pollingId, fetchPlans, fetchExtractions])

  const handleAnalyzePlan = async (planFile) => {
    setAnalyzing(true)
    setError('')
    if (planFile.upload_status === 'pending' || planFile.upload_status === 'processing') {
      setPollingId(planFile.id)
      return
    }
    try {
      await planAPI.reanalyze(planFile.id)
      setPollingId(planFile.id)
    } catch {
      setError('Failed to start analysis')
      setAnalyzing(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (planFiles.length === 0) {
    return (
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          No roof plans uploaded yet. Go to the <strong>Plans</strong> tab to upload architectural plans, then come back here to build conditions.
        </p>
      </div>
    )
  }

  const isPlanProcessing = selectedPlan && (selectedPlan.upload_status === 'pending' || selectedPlan.upload_status === 'processing')

  return (
    <div className="mb-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center">
            <svg className="w-4 h-4 text-primary-600 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Plan Analysis
          </h3>
          {selectedPlan && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              selectedPlan.upload_status === 'completed' ? 'bg-green-100 text-green-700' :
              selectedPlan.upload_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {selectedPlan.upload_status === 'completed' ? 'Analyzed' :
               selectedPlan.upload_status === 'failed' ? 'Failed' : 'Processing...'}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <select
            value={selectedPlan?.id || ''}
            onChange={(e) => setSelectedPlan(planFiles.find(p => p.id === parseInt(e.target.value)) || null)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
          >
            {planFiles.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.file_name} — {plan.upload_status}{plan.page_count ? ` (${plan.page_count} pg)` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedPlan && handleAnalyzePlan(selectedPlan)}
            disabled={analyzing || !selectedPlan || isPlanProcessing}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
              analyzing || !selectedPlan || isPlanProcessing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {analyzing || isPlanProcessing ? (<><SpinnerIcon className="w-4 h-4 mr-2" /> Analyzing...</>) : 'Re-Analyze'}
          </button>
        </div>
        {selectedPlan?.upload_status === 'completed' && (
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            {selectedPlan.page_count && <span>{selectedPlan.page_count} pages</span>}
            {selectedPlan.detected_scale && <span>Scale: {selectedPlan.detected_scale}</span>}
            <span>{extractions.length} extractions</span>
          </div>
        )}
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">{error}</div>
        )}
      </div>
    </div>
  )
}


// ============================================================================
// SYSTEM SPEC PANEL — Collapsible roof system configuration
// ============================================================================
const SYSTEM_TYPES = ['TPO', 'EPDM', 'PVC', 'ModBit', 'BUR', 'StandingSeam']
const MEMBRANE_OPTIONS = ['45 mil', '60 mil', '80 mil', '90 mil (fleeceback)', '110 mil (fleeceback)', '135 mil (fleeceback)']
const FIELD_ATTACHMENT_OPTIONS = ['Mechanically Fastened', 'Rhinobond', 'Adhesive', 'Low Rise Foam']
const WALL_FLASHING_OPTIONS = ['45 mil', '60 mil', '80 mil']
const COVERBOARD_ATTACHMENT_OPTIONS = ['Mechanically Fastened', 'Low Rise Foam']
const INSULATION_ATTACHMENT_OPTIONS = ['Mechanically Fastened', 'Gang Fastened', 'Low Rise Foam']
const VAPOR_BOARD_ATTACHMENT_OPTIONS = ['Mechanically Fastened', 'Gang Fastened', 'Low Rise Foam']

const DEFAULT_SYSTEM = {
  name: 'Roof Area 1', system_type: 'TPO', manufacturer: '',
  membrane_thickness: '', field_attachment: '', wall_flashing_thickness: '',
  has_coverboard: false, coverboard_attachment: '',
  has_top_insulation: false, top_insulation_attachment: '',
  has_bottom_insulation: false, bottom_insulation_attachment: '',
  has_vapor_barrier: false, has_vapor_barrier_board: false, vapor_barrier_board_attachment: '',
}

function SystemSpecPanel({ projectId, systemData, onSystemChange, onSystemTypeChange }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef(null)
  const sys = systemData || DEFAULT_SYSTEM

  // Build summary line for collapsed state
  const summaryParts = []
  if (sys.system_type) summaryParts.push(sys.system_type)
  if (sys.membrane_thickness) summaryParts.push(sys.membrane_thickness)
  if (sys.field_attachment) summaryParts.push(sys.field_attachment)
  if (sys.manufacturer) summaryParts.push(sys.manufacturer)
  const layerParts = []
  if (sys.has_vapor_barrier) layerParts.push('Vapor Barrier')
  const insulCount = (sys.has_bottom_insulation ? 1 : 0) + (sys.has_top_insulation ? 1 : 0)
  if (insulCount > 0) layerParts.push(`${insulCount}-Layer Insulation`)
  if (sys.has_coverboard) layerParts.push('Coverboard')
  if (layerParts.length > 0) summaryParts.push(layerParts.join(' + '))
  const summary = summaryParts.join(' | ') || 'Not configured'

  const handleChange = (field, value) => {
    const updated = { ...sys, [field]: value }
    // Clear child fields when parent toggled off
    if (field === 'has_coverboard' && !value) updated.coverboard_attachment = ''
    if (field === 'has_top_insulation' && !value) updated.top_insulation_attachment = ''
    if (field === 'has_bottom_insulation' && !value) updated.bottom_insulation_attachment = ''
    if (field === 'has_vapor_barrier' && !value) {
      updated.has_vapor_barrier_board = false
      updated.vapor_barrier_board_attachment = ''
    }
    if (field === 'has_vapor_barrier_board' && !value) updated.vapor_barrier_board_attachment = ''

    // If system type changed, also update the project-level system type
    if (field === 'system_type' && onSystemTypeChange) {
      onSystemTypeChange(value)
    }

    onSystemChange(updated)

    // Debounced auto-save
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(updated), 800)
  }

  const autoSave = async (data) => {
    setSaving(true)
    try {
      const payload = {
        name: data.name || 'Roof Area 1',
        system_type: data.system_type || 'TPO',
        manufacturer: data.manufacturer || null,
        membrane_thickness: data.membrane_thickness || null,
        field_attachment: data.field_attachment || null,
        wall_flashing_thickness: data.wall_flashing_thickness || null,
        has_coverboard: data.has_coverboard || false,
        coverboard_attachment: data.has_coverboard ? data.coverboard_attachment || null : null,
        has_top_insulation: data.has_top_insulation || false,
        top_insulation_attachment: data.has_top_insulation ? data.top_insulation_attachment || null : null,
        has_bottom_insulation: data.has_bottom_insulation || false,
        bottom_insulation_attachment: data.has_bottom_insulation ? data.bottom_insulation_attachment || null : null,
        has_vapor_barrier: data.has_vapor_barrier || false,
        has_vapor_barrier_board: data.has_vapor_barrier ? data.has_vapor_barrier_board || false : false,
        vapor_barrier_board_attachment: data.has_vapor_barrier_board ? data.vapor_barrier_board_attachment || null : null,
      }
      if (data.id) {
        await systemAPI.update(data.id, payload)
      } else {
        const res = await systemAPI.create(projectId, payload)
        onSystemChange({ ...data, id: res.data?.id })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save system:', err)
    } finally {
      setSaving(false)
    }
  }

  const SpecSelect = ({ label, value, options, onChange, className = '' }) => (
    <div className={className}>
      <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )

  const SpecToggle = ({ label, value, onChange, children }) => (
    <div className="border border-gray-100 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onChange(true)}
            className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-l-md border transition-colors ${
              value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
            }`}>Yes</button>
          <button type="button" onClick={() => onChange(false)}
            className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-r-md border transition-colors ${
              !value ? 'bg-gray-500 text-white border-gray-500' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
            }`}>No</button>
        </div>
      </div>
      {value && children && <div className="mt-2 ml-2">{children}</div>}
    </div>
  )

  return (
    <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header — click to expand */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              Specified Roof System
              {sys.system_type && (
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded">
                  {sys.system_type}
                </span>
              )}
              {saving && <SpinnerIcon className="w-3 h-3 text-gray-400" />}
              {saved && <span className="text-[11px] text-green-600 font-medium">Saved</span>}
            </h3>
            {!expanded && (
              <p className="text-xs text-gray-500 mt-0.5">{summary}</p>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-4 border-t border-gray-100 space-y-4">
          {/* Row 1: Name + System Type + Manufacturer */}
          <div className="flex items-end gap-3">
            <div className="flex-shrink-0 w-40">
              <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">System Name</label>
              <input
                type="text"
                value={sys.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Roof Area 1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">System Type</label>
              <div className="flex gap-1">
                {SYSTEM_TYPES.map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleChange('system_type', st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      sys.system_type === st
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-48">
              <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Manufacturer</label>
              <input
                type="text"
                value={sys.manufacturer || ''}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Carlisle, GAF"
              />
            </div>
          </div>

          {/* Row 2: Membrane + Attachment + Wall Flashing */}
          <div className="grid grid-cols-3 gap-3">
            <SpecSelect label="Membrane Thickness" value={sys.membrane_thickness} options={MEMBRANE_OPTIONS} onChange={(v) => handleChange('membrane_thickness', v)} />
            <SpecSelect label="Field Attachment" value={sys.field_attachment} options={FIELD_ATTACHMENT_OPTIONS} onChange={(v) => handleChange('field_attachment', v)} />
            <SpecSelect label="Wall Flashing" value={sys.wall_flashing_thickness} options={WALL_FLASHING_OPTIONS} onChange={(v) => handleChange('wall_flashing_thickness', v)} />
          </div>

          {/* Row 3: Buildup Layers */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wide">Roof Buildup Layers</label>
            <div className="grid grid-cols-2 gap-3">
              <SpecToggle label="Coverboard" value={sys.has_coverboard} onChange={(v) => handleChange('has_coverboard', v)}>
                <SpecSelect label="Attachment" value={sys.coverboard_attachment} options={COVERBOARD_ATTACHMENT_OPTIONS} onChange={(v) => handleChange('coverboard_attachment', v)} />
              </SpecToggle>

              <SpecToggle label="Top Insulation" value={sys.has_top_insulation} onChange={(v) => handleChange('has_top_insulation', v)}>
                <SpecSelect label="Attachment" value={sys.top_insulation_attachment} options={INSULATION_ATTACHMENT_OPTIONS} onChange={(v) => handleChange('top_insulation_attachment', v)} />
              </SpecToggle>

              <SpecToggle label="Bottom Insulation" value={sys.has_bottom_insulation} onChange={(v) => handleChange('has_bottom_insulation', v)}>
                <SpecSelect label="Attachment" value={sys.bottom_insulation_attachment} options={INSULATION_ATTACHMENT_OPTIONS} onChange={(v) => handleChange('bottom_insulation_attachment', v)} />
              </SpecToggle>

              <SpecToggle label="Vapor Barrier" value={sys.has_vapor_barrier} onChange={(v) => handleChange('has_vapor_barrier', v)}>
                <SpecToggle label="Vapor Barrier Board" value={sys.has_vapor_barrier_board} onChange={(v) => handleChange('has_vapor_barrier_board', v)}>
                  <SpecSelect label="Board Attachment" value={sys.vapor_barrier_board_attachment} options={VAPOR_BOARD_ATTACHMENT_OPTIONS} onChange={(v) => handleChange('vapor_barrier_board_attachment', v)} />
                </SpecToggle>
              </SpecToggle>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ============================================================================
// BUILDUP STACK — Visual layer chips for field condition cards
// ============================================================================
function BuildupStack({ systemData }) {
  if (!systemData) return null
  const sys = systemData

  const layers = []
  layers.push({ label: 'Deck', color: 'bg-gray-200 text-gray-700', sub: null })
  if (sys.has_vapor_barrier) {
    layers.push({ label: 'VB', color: 'bg-purple-100 text-purple-800', sub: sys.has_vapor_barrier_board ? 'Board' : null })
  }
  if (sys.has_bottom_insulation) {
    const att = sys.bottom_insulation_attachment ? sys.bottom_insulation_attachment.replace('Mechanically ', 'Mech. ').replace('Fastened', 'Fast.') : ''
    layers.push({ label: 'Bottom Insul.', color: 'bg-orange-100 text-orange-800', sub: att })
  }
  if (sys.has_top_insulation) {
    const att = sys.top_insulation_attachment ? sys.top_insulation_attachment.replace('Mechanically ', 'Mech. ').replace('Fastened', 'Fast.') : ''
    layers.push({ label: 'Top Insul.', color: 'bg-orange-100 text-orange-800', sub: att })
  }
  if (sys.has_coverboard) {
    const att = sys.coverboard_attachment ? sys.coverboard_attachment.replace('Mechanically ', 'Mech. ').replace('Fastened', 'Fast.') : ''
    layers.push({ label: 'Coverboard', color: 'bg-yellow-100 text-yellow-800', sub: att })
  }
  layers.push({
    label: `Membrane${sys.membrane_thickness ? ' ' + sys.membrane_thickness : ''}`,
    color: 'bg-blue-100 text-blue-800',
    sub: sys.field_attachment ? sys.field_attachment.replace('Mechanically ', 'Mech. ').replace('Fastened', 'Fast.') : null,
  })

  return (
    <div className="flex items-center gap-0.5 flex-wrap mt-1">
      {layers.map((layer, i) => (
        <div key={i} className="flex items-center">
          <div className={`inline-flex flex-col items-center px-1.5 py-0.5 rounded ${layer.color}`}>
            <span className="text-[10px] font-semibold leading-tight">{layer.label}</span>
            {layer.sub && <span className="text-[8px] opacity-70 leading-tight">{layer.sub}</span>}
          </div>
          {i < layers.length - 1 && <span className="text-[10px] text-gray-300 mx-0.5">→</span>}
        </div>
      ))}
    </div>
  )
}


// ============================================================================
// MAIN CONDITIONS TAB
// ============================================================================
export default function ConditionsTab({ projectId }) {
  const [conditions, setConditions] = useState([])
  const [systems, setSystems] = useState([])
  const [conditionTypes, setConditionTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [smartBuilding, setSmartBuilding] = useState(false)
  const [smartBuildResult, setSmartBuildResult] = useState(null)
  const [projectData, setProjectData] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const [systemData, setSystemData] = useState(null)
  const [systemDirty, setSystemDirty] = useState(false)
  const [newCondition, setNewCondition] = useState({
    condition_type: '', description: '', measurement_value: '', measurement_unit: 'sqft', wind_zone: '1',
  })

  const fetchConditions = useCallback(async () => {
    try {
      const [condRes, typesRes, projRes, sysRes] = await Promise.all([
        conditionAPI.listWithMaterials(projectId),
        referenceAPI.conditionTypes().catch(() => ({ data: [] })),
        projectAPI.get(projectId).catch(() => ({ data: null })),
        systemAPI.list(projectId).catch(() => ({ data: [] })),
      ])
      const data = condRes.data
      if (data && data.conditions) {
        setConditions(data.conditions || [])
        setSystems(data.systems || [])
      } else {
        setConditions(Array.isArray(data) ? data : [])
      }
      const types = typesRes.data?.condition_types || typesRes.data || []
      setConditionTypes(types)
      setProjectData(projRes.data)
      // Load system spec data
      const systemsList = sysRes.data || []
      if (systemsList.length > 0) {
        setSystemData({ ...DEFAULT_SYSTEM, ...systemsList[0] })
      }
    } catch (err) {
      setError('Failed to load conditions')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchConditions() }, [fetchConditions])

  const handleSmartBuild = async () => {
    setSmartBuilding(true)
    setError('')
    setSmartBuildResult(null)
    try {
      const res = await conditionAPI.smartBuild(projectId)
      setSmartBuildResult(res.data)
      fetchConditions()
    } catch (err) {
      setError('Smart Build failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSmartBuilding(false)
    }
  }

  const handleSystemTypeChange = async (newSystem) => {
    try {
      await projectAPI.update(projectId, { system_type: newSystem })
      fetchConditions()
    } catch {
      setError('Failed to update system type')
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await conditionAPI.create(projectId, {
        ...newCondition,
        measurement_value: parseFloat(newCondition.measurement_value),
      })
      setShowAddModal(false)
      setNewCondition({ condition_type: '', description: '', measurement_value: '', measurement_unit: 'sqft', wind_zone: '1' })
      fetchConditions()
    } catch {
      setError('Failed to add condition')
    }
  }

  const handlePopulateMaterials = async () => {
    try {
      const res = await conditionAPI.populateMaterials(projectId)
      fetchConditions()
      return res.data
    } catch {
      setError('Failed to populate materials')
    }
  }

  const handleToggleConditionActive = async (conditionId, currentActive) => {
    try {
      await conditionAPI.update(conditionId, { is_active: !currentActive })
      fetchConditions()
    } catch {
      setError('Failed to toggle condition')
    }
  }

  if (loading) return <LoadingSpinner />

  const activeConditions = conditions.filter(c => c.is_active !== false)
  const inactiveConditions = conditions.filter(c => c.is_active === false)

  const totalSF = activeConditions.reduce((s, c) => s + (c.measurement_unit === 'sqft' ? (c.measurement_value || 0) : 0), 0)
  const totalLF = activeConditions.reduce((s, c) => s + (c.measurement_unit === 'lnft' ? (c.measurement_value || 0) : 0), 0)
  const totalEA = activeConditions.reduce((s, c) => s + (c.measurement_unit === 'each' ? (c.measurement_value || 0) : 0), 0)
  const totalMaterials = activeConditions.reduce((s, c) => s + (c.materials?.length || 0), 0)

  const currentSystem = systems.length > 0 ? systems[0] : null

  const handleRefreshMaterials = async () => {
    try {
      await conditionAPI.populateMaterials(projectId)
      setSystemDirty(false)
      fetchConditions()
    } catch {
      setError('Failed to refresh materials')
    }
  }

  return (
    <div>
      {/* Specified Roof System Panel */}
      <SystemSpecPanel
        projectId={projectId}
        systemData={systemData}
        onSystemChange={(data) => {
          setSystemData(data)
          setSystemDirty(true)
        }}
        onSystemTypeChange={handleSystemTypeChange}
      />

      {/* Refresh Materials Banner — shows when system spec changed */}
      {systemDirty && conditions.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm text-amber-800">System spec changed. Refresh materials to update conditions with new settings.</span>
          </div>
          <button
            onClick={handleRefreshMaterials}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
          >
            <BoltIcon className="w-3 h-3 mr-1" />
            Refresh Materials
          </button>
        </div>
      )}

      {/* Plan Analysis */}
      <PlanAnalysisSection projectId={projectId} onConditionsChanged={fetchConditions} />

      {/* Smart Build Section */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-blue-900 flex items-center">
              <BoltIcon className="w-5 h-5 text-blue-600 mr-2" />
              Smart Build Conditions
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Reads spec analysis + plan extractions to build conditions with materials for each roof area.
            </p>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={handleSmartBuild}
              disabled={smartBuilding}
              className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg shadow-sm ${
                smartBuilding
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {smartBuilding ? (<><SpinnerIcon className="w-4 h-4 mr-2" /> Building...</>) : (<><BoltIcon className="w-4 h-4 mr-2" /> Smart Build</>)}
            </button>
            {conditions.length > 0 && (
              <button
                onClick={handlePopulateMaterials}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-white text-blue-700 border border-blue-300 hover:bg-blue-50"
              >
                <PlusIcon className="w-3 h-3 mr-1" />
                Re-populate Materials
              </button>
            )}
          </div>
        </div>

        {/* Smart Build Results */}
        {smartBuildResult && (
          <div className="mt-4 bg-white/80 rounded-lg border border-blue-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-blue-900 flex items-center">
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded mr-2">
                  {smartBuildResult.system_type}
                </span>
                {smartBuildResult.system_name || 'Roof System'}
              </h4>
              <div className="flex gap-2">
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                  {smartBuildResult.conditions_active || 0} active
                </span>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {smartBuildResult.conditions_inactive || 0} inactive
                </span>
                <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {smartBuildResult.materials_populated || 0} materials
                </span>
              </div>
            </div>
            {smartBuildResult.note && (
              <p className="text-xs text-blue-700 mb-2">{smartBuildResult.note}</p>
            )}
            {smartBuildResult.spec_data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {smartBuildResult.spec_data.membrane && <div><span className="text-gray-500">Membrane:</span> <strong>{smartBuildResult.spec_data.membrane}</strong></div>}
                {smartBuildResult.spec_data.thickness && <div><span className="text-gray-500">Thickness:</span> <strong>{smartBuildResult.spec_data.thickness}</strong></div>}
                {smartBuildResult.spec_data.insulation && <div><span className="text-gray-500">Insulation:</span> <strong>{smartBuildResult.spec_data.insulation}</strong></div>}
                {smartBuildResult.spec_data.attachment && <div><span className="text-gray-500">Attachment:</span> <strong>{smartBuildResult.spec_data.attachment}</strong></div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conditions Header + Add Button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {currentSystem ? currentSystem.name : 'Roof Conditions'}
          </h2>
          <div className="flex gap-3 text-xs text-gray-500 mt-1">
            {currentSystem && (
              <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                {currentSystem.system_type}
              </span>
            )}
            <span>{activeConditions.length} active conditions</span>
            <span>{totalMaterials} materials</span>
            {totalSF > 0 && <span>{totalSF.toLocaleString()} SF</span>}
            {totalLF > 0 && <span>{totalLF.toLocaleString()} LF</span>}
            {totalEA > 0 && <span>{totalEA.toLocaleString()} EA</span>}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 shadow-sm transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-1.5" />
          Add Condition
        </button>
      </div>

      {/* Summary Stats */}
      {activeConditions.length > 0 && (
        <div className="mb-4 grid grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{activeConditions.length}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-blue-600">{totalSF > 0 ? totalSF.toLocaleString() : '—'}</div>
            <div className="text-xs text-gray-500">SF</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-green-600">{totalLF > 0 ? totalLF.toLocaleString() : '—'}</div>
            <div className="text-xs text-gray-500">LF</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{totalEA > 0 ? totalEA.toLocaleString() : '—'}</div>
            <div className="text-xs text-gray-500">EA</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
        </div>
      )}

      {/* Active Conditions */}
      {conditions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500 mb-2 font-medium">No conditions yet</p>
          <p className="text-sm text-gray-400 mb-4">Upload plans and run Smart Build, or add conditions manually.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="w-4 h-4 mr-1.5" />
            Add Your First Condition
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {activeConditions.map((c) => (
              <ConditionCard
                key={c.id}
                condition={c}
                onRefresh={fetchConditions}
                onToggleActive={() => handleToggleConditionActive(c.id, true)}
                isSystemCondition={!!c.roof_system_id}
                systemData={systemData}
              />
            ))}
          </div>

          {/* Inactive Conditions Section */}
          {inactiveConditions.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
              >
                {showInactive ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-medium">
                  {inactiveConditions.length} inactive condition{inactiveConditions.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-400">— click to enable</span>
              </button>
              {showInactive && (
                <div className="space-y-2">
                  {inactiveConditions.map((c) => {
                    const clr = getColors(c.condition_type)
                    return (
                      <div
                        key={c.id}
                        className="border border-gray-200 rounded-lg bg-gray-50 px-4 py-3 flex items-center justify-between opacity-60 hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded ${clr.badge}`}>
                            {TYPE_LABELS[c.condition_type] || c.condition_type}
                          </span>
                          <span className="text-sm text-gray-500">
                            {fmtNum(c.measurement_value)} {fmtUnit(c.measurement_unit)}
                          </span>
                          <span className="text-xs text-gray-400 italic">Inactive</span>
                        </div>
                        <button
                          onClick={() => handleToggleConditionActive(c.id, false)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                        >
                          Enable
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Condition Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Condition">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Condition Type *</label>
            <select
              required
              value={newCondition.condition_type}
              onChange={(e) => {
                const val = e.target.value
                const typeObj = conditionTypes.find(t => (t.value || t) === val)
                const defaultUnit = typeObj?.default_unit || 'sqft'
                setNewCondition({ ...newCondition, condition_type: val, measurement_unit: defaultUnit })
              }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select type...</option>
              {conditionTypes.map(t => {
                const val = t.value || t
                const label = t.label || t
                return <option key={val} value={val}>{label}</option>
              })}
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description / Label</label>
            <input
              type="text"
              value={newCondition.description}
              onChange={(e) => setNewCondition({ ...newCondition, description: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Main roof field area, North wall flashing"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Measurement *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newCondition.measurement_value}
                onChange={(e) => setNewCondition({ ...newCondition, measurement_value: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., 7680"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <select
                value={newCondition.measurement_unit}
                onChange={(e) => setNewCondition({ ...newCondition, measurement_unit: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="sqft">SF (Square Feet)</option>
                <option value="lnft">LF (Linear Feet)</option>
                <option value="each">EA (Each)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Wind Zone</label>
            <select
              value={newCondition.wind_zone}
              onChange={(e) => setNewCondition({ ...newCondition, wind_zone: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="1">Zone 1 (Field)</option>
              <option value="2">Zone 2 (Perimeter)</option>
              <option value="3">Zone 3 (Corner)</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm">
              Add Condition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
