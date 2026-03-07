import { useState, useEffect, useCallback } from 'react'
import { conditionAPI, referenceAPI, planAPI, projectAPI, systemAPI } from '../api'
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
const SwapIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)
const SearchIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

// Unit display helpers
const UNIT_LABELS = { sqft: 'SF', lnft: 'LF', each: 'EA' }
const fmtUnit = (u) => UNIT_LABELS[u] || u
const fmtNum = (v) => v != null ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'
const fmtMoney = (v) => v != null ? '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'

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
        <SearchIcon className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-sm"
          placeholder={placeholder}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">No matches found</div>
          )}
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-primary-50 border-b border-gray-50 last:border-0"
            >
              <div className="text-sm font-medium text-gray-900">{item.material_name}</div>
              <div className="text-xs text-gray-500 flex gap-3">
                {item.manufacturer && <span>{item.manufacturer}</span>}
                <span>{fmtUnit(item.unit)}</span>
                <span>{fmtMoney(item.unit_cost)}/{item.unit}</span>
                {item.product_name && <span className="text-gray-400">{item.product_name}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Condition type colors for the accordion headers
const TYPE_COLORS = {
  field:            'bg-blue-50 border-blue-200 text-blue-800',
  wall_flashing:    'bg-amber-50 border-amber-200 text-amber-800',
  roof_drain:       'bg-cyan-50 border-cyan-200 text-cyan-800',
  scupper:          'bg-teal-50 border-teal-200 text-teal-800',
  pipe_flashing:    'bg-violet-50 border-violet-200 text-violet-800',
  coping:           'bg-orange-50 border-orange-200 text-orange-800',
  perimeter:        'bg-green-50 border-green-200 text-green-800',
  curb:             'bg-pink-50 border-pink-200 text-pink-800',
  penetration:      'bg-rose-50 border-rose-200 text-rose-800',
  corner:           'bg-indigo-50 border-indigo-200 text-indigo-800',
  expansion_joint:  'bg-gray-50 border-gray-300 text-gray-800',
  edge_detail:      'bg-lime-50 border-lime-200 text-lime-800',
  transition:       'bg-emerald-50 border-emerald-200 text-emerald-800',
  parapet:          'bg-yellow-50 border-yellow-200 text-yellow-800',
  custom:           'bg-slate-50 border-slate-200 text-slate-800',
}

// ============================================================================
// MATERIAL ROW — Inline editable row inside a condition accordion
// ============================================================================
function MaterialRow({ material, onUpdate, onDelete, onSwap }) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setEditing(true)
    setValues({
      coverage_rate: material.coverage_rate,
      waste_factor: material.waste_factor,
      override_quantity: material.override_quantity ?? '',
      is_included: material.is_included,
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
        is_included: values.is_included,
        notes: values.notes || null,
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const toggleIncluded = async () => {
    await onUpdate(material.id, { is_included: !material.is_included })
  }

  return (
    <tr className={`text-sm ${!material.is_included ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}`}>
      {/* Toggle */}
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={material.is_included}
          onChange={toggleIncluded}
          className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
        />
      </td>
      {/* Material Name + Category + Cost DB Status */}
      <td className="px-3 py-2">
        <div className="font-medium text-gray-900">{material.material_name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{material.material_category}</span>
          {material.cost_database_item_id ? (
            <span className="inline-flex items-center text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
              <svg className="w-2.5 h-2.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Linked
            </span>
          ) : material.unit_cost > 0 ? (
            <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
              ~ Fuzzy match
            </span>
          ) : (
            <span className="inline-flex items-center text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
              ✗ No match
            </span>
          )}
        </div>
      </td>
      {/* Unit */}
      <td className="px-3 py-2 text-gray-600">{fmtUnit(material.unit)}</td>
      {/* Coverage Rate */}
      <td className="px-3 py-2">
        {editing ? (
          <input
            type="number"
            step="0.001"
            value={values.coverage_rate}
            onChange={(e) => setValues({ ...values, coverage_rate: e.target.value })}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        ) : (
          <span className="font-mono text-gray-700">{material.coverage_rate}</span>
        )}
      </td>
      {/* Waste % */}
      <td className="px-3 py-2">
        {editing ? (
          <input
            type="number"
            step="0.01"
            value={values.waste_factor}
            onChange={(e) => setValues({ ...values, waste_factor: e.target.value })}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        ) : (
          <span className="font-mono text-gray-700">{(material.waste_factor * 100).toFixed(0)}%</span>
        )}
      </td>
      {/* Qty (calculated) */}
      <td className="px-3 py-2 text-right">
        <span className="font-mono text-gray-700">
          {material.is_included && material.qty_calculated ? fmtNum(material.qty_calculated) : '—'}
        </span>
      </td>
      {/* Unit Cost */}
      <td className="px-3 py-2 text-right">
        {material.unit_cost > 0 ? (
          <span className="font-mono text-gray-700">${fmtNum(material.unit_cost)}</span>
        ) : (
          <span className="text-xs text-amber-500" title="No cost database match">—</span>
        )}
      </td>
      {/* Extended Cost */}
      <td className="px-3 py-2 text-right">
        {material.is_included && material.extended_cost > 0 ? (
          <span className="font-mono font-medium text-gray-900">${fmtNum(material.extended_cost)}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      {/* Actions */}
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {editing ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="text-xs text-green-700 hover:text-green-900 font-medium"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            {material.cost_database_item_id ? (
              <button
                onClick={() => onSwap(material)}
                className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-0.5"
                title="Swap to a different product from cost database"
              >
                <SwapIcon className="w-3 h-3" />
                Swap
              </button>
            ) : (
              <button
                onClick={() => onSwap(material)}
                className="text-xs text-amber-600 hover:text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1"
                title="Link this material to a product in your cost database"
              >
                <SwapIcon className="w-3 h-3" />
                Link
              </button>
            )}
            <button
              onClick={startEdit}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(material.id)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ============================================================================
// CONDITION CARD — Accordion card for one condition with materials table
// ============================================================================
function ConditionCard({ condition, onRefresh, onToggleActive, isSystemCondition }) {
  const [expanded, setExpanded] = useState(false)
  const [editingCondition, setEditingCondition] = useState(false)
  const [condValues, setCondValues] = useState({})
  const [addingMaterial, setAddingMaterial] = useState(false)
  const [newMat, setNewMat] = useState({
    material_name: '', material_category: 'membrane', unit: 'sqft',
    coverage_rate: 1, waste_factor: 0.1, calc_type: 'standard',
    cost_database_item_id: null,
  })
  const [swapMaterial, setSwapMaterial] = useState(null) // material being swapped
  const [error, setError] = useState('')

  const materials = condition.materials || []
  const includedCount = materials.filter(m => m.is_included).length
  const colors = TYPE_COLORS[condition.condition_type] || TYPE_COLORS.custom

  const handleUpdateMaterial = async (materialId, data) => {
    try {
      await conditionAPI.updateMaterial(materialId, data)
      onRefresh()
    } catch (err) {
      setError('Failed to update material')
    }
  }

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Remove this material from the condition?')) return
    try {
      await conditionAPI.deleteMaterial(materialId)
      onRefresh()
    } catch (err) {
      setError('Failed to delete material')
    }
  }

  const handleAddMaterial = async (e) => {
    e.preventDefault()
    try {
      await conditionAPI.addMaterial(condition.id, {
        ...newMat,
        coverage_rate: parseFloat(newMat.coverage_rate),
        waste_factor: parseFloat(newMat.waste_factor),
        cost_database_item_id: newMat.cost_database_item_id,
      })
      setAddingMaterial(false)
      setNewMat({ material_name: '', material_category: 'membrane', unit: 'sqft', coverage_rate: 1, waste_factor: 0.1, calc_type: 'standard', cost_database_item_id: null })
      onRefresh()
    } catch (err) {
      setError('Failed to add material')
    }
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
    } catch (err) {
      setError('Failed to swap product')
    }
  }

  const startConditionEdit = () => {
    setEditingCondition(true)
    setCondValues({
      measurement_value: condition.measurement_value,
      measurement_unit: condition.measurement_unit,
      wind_zone: condition.wind_zone || '1',
      description: condition.description || '',
      flashing_height: condition.flashing_height || '',
      fastener_spacing: condition.fastener_spacing || '',
    })
  }

  const saveConditionEdit = async () => {
    try {
      await conditionAPI.update(condition.id, {
        measurement_value: parseFloat(condValues.measurement_value),
        measurement_unit: condValues.measurement_unit,
        wind_zone: condValues.wind_zone,
        description: condValues.description,
        flashing_height: condValues.flashing_height ? parseFloat(condValues.flashing_height) : null,
        fastener_spacing: condValues.fastener_spacing ? parseInt(condValues.fastener_spacing) : null,
      })
      setEditingCondition(false)
      onRefresh()
    } catch (err) {
      setError('Failed to update condition')
    }
  }

  const handleDeleteCondition = async () => {
    if (!window.confirm(`Delete "${condition.label || condition.condition_type}" and all its materials?`)) return
    try {
      await conditionAPI.delete(condition.id)
      onRefresh()
    } catch (err) {
      setError('Failed to delete condition')
    }
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${expanded ? 'shadow-md' : 'shadow-sm'} transition-shadow`}>
      {/* Accordion Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none border-l-4 ${colors}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {expanded ? <ChevronDown className="w-5 h-5 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{condition.label || condition.condition_type}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/60 font-mono">
                {fmtNum(condition.measurement_value)} {fmtUnit(condition.measurement_unit)}
              </span>
              {condition.wind_zone && condition.wind_zone !== '1' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/60">WZ{condition.wind_zone}</span>
              )}
            </div>
            {condition.description && (
              <p className="text-xs opacity-70 truncate mt-0.5">{condition.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="bg-white/70 px-2 py-0.5 rounded">
            {includedCount}/{materials.length} materials
          </span>
          <button
            onClick={startConditionEdit}
            className="text-xs hover:underline opacity-70 hover:opacity-100"
          >
            Edit
          </button>
          {isSystemCondition && onToggleActive && (
            <button
              onClick={onToggleActive}
              className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
              title="Disable this condition"
            >
              Disable
            </button>
          )}
          <button
            onClick={handleDeleteCondition}
            className="text-red-600 hover:text-red-800 opacity-70 hover:opacity-100"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="bg-white">
          {error && (
            <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 flex items-center justify-between">
              {error}
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
            </div>
          )}

          {/* Condition Edit Form (inline) */}
          {editingCondition && (
            <div className="mx-4 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Measurement</label>
                  <input
                    type="number"
                    step="0.01"
                    value={condValues.measurement_value}
                    onChange={(e) => setCondValues({ ...condValues, measurement_value: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                  <select
                    value={condValues.measurement_unit}
                    onChange={(e) => setCondValues({ ...condValues, measurement_unit: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    <option value="sqft">SF (Square Feet)</option>
                    <option value="lnft">LF (Linear Feet)</option>
                    <option value="each">EA (Each)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Wind Zone</label>
                  <select
                    value={condValues.wind_zone}
                    onChange={(e) => setCondValues({ ...condValues, wind_zone: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    <option value="1">Zone 1</option>
                    <option value="2">Zone 2</option>
                    <option value="3">Zone 3</option>
                  </select>
                </div>
                {(condition.condition_type === 'wall_flashing' || condition.condition_type === 'parapet') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Flashing Height (in)</label>
                    <input
                      type="number"
                      step="1"
                      value={condValues.flashing_height}
                      onChange={(e) => setCondValues({ ...condValues, flashing_height: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      placeholder="60"
                    />
                  </div>
                )}
              </div>
              <div className="mt-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  value={condValues.description}
                  onChange={(e) => setCondValues({ ...condValues, description: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setEditingCondition(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">
                  Cancel
                </button>
                <button onClick={saveConditionEdit} className="px-3 py-1.5 text-xs text-white bg-primary-600 hover:bg-primary-700 rounded">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Materials Table */}
          {materials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-10">On</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Material</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-14">Unit</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">Coverage</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-16">Waste</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Unit Cost</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Ext. Cost</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materials.map((mat) => (
                    <MaterialRow
                      key={mat.id}
                      material={mat}
                      onUpdate={handleUpdateMaterial}
                      onDelete={handleDeleteMaterial}
                      onSwap={(m) => setSwapMaterial(m)}
                    />
                  ))}
                </tbody>
                {/* Condition Subtotal */}
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Condition Total</td>
                    <td className="px-3 py-2 text-right text-sm font-mono font-semibold text-gray-700">
                      {fmtNum(materials.filter(m => m.is_included).reduce((sum, m) => sum + (m.qty_calculated || 0), 0))}
                    </td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 text-right text-sm font-mono font-bold text-gray-900">
                      ${fmtNum(materials.filter(m => m.is_included).reduce((sum, m) => sum + (m.extended_cost || 0), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No materials assigned. Click "Add Material" or run Smart Build to populate.
            </div>
          )}

          {/* Add Material Button / Form */}
          <div className="px-4 py-3 border-t border-gray-100">
            {addingMaterial ? (
              <form onSubmit={handleAddMaterial} className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category (select first)</label>
                    <select
                      value={newMat.material_category}
                      onChange={(e) => setNewMat({ ...newMat, material_category: e.target.value, material_name: '', cost_database_item_id: null })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="membrane">Membrane</option>
                      <option value="insulation">Insulation</option>
                      <option value="fastener">Fastener</option>
                      <option value="adhesive">Adhesive</option>
                      <option value="flashing">Flashing</option>
                      <option value="metal">Metal</option>
                      <option value="sealant">Sealant</option>
                      <option value="accessory">Accessory</option>
                      <option value="misc">Misc</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Material (from Cost Database) *</label>
                    <CostDbSearchInput
                      category={newMat.material_category}
                      placeholder="Search materials..."
                      onSelect={(item) => setNewMat({
                        ...newMat,
                        material_name: item.material_name,
                        unit: item.unit,
                        cost_database_item_id: item.id,
                      })}
                    />
                    {newMat.material_name && (
                      <div className="mt-1 text-xs text-green-700 flex items-center gap-1">
                        ✓ {newMat.material_name}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Coverage Rate</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newMat.coverage_rate}
                      onChange={(e) => setNewMat({ ...newMat, coverage_rate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Waste Factor</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newMat.waste_factor}
                      onChange={(e) => setNewMat({ ...newMat, waste_factor: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Calc Type</label>
                    <select
                      value={newMat.calc_type}
                      onChange={(e) => setNewMat({ ...newMat, calc_type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="standard">Standard (meas x rate)</option>
                      <option value="wall_membrane">Wall Membrane (length x height)</option>
                      <option value="fastener">Fastener (length / spacing)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setAddingMaterial(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newMat.material_name}
                    className="px-3 py-1.5 text-xs text-white bg-primary-600 hover:bg-primary-700 rounded disabled:opacity-50"
                  >
                    Add Material
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingMaterial(true)}
                className="inline-flex items-center text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                Add Material
              </button>
            )}
          </div>

          {/* Product Swap Modal */}
          {swapMaterial && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-800">Swap Product</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Replace <span className="font-medium">{swapMaterial.material_name}</span> with a different product
                  </p>
                </div>
                <div className="p-4">
                  <CostDbSearchInput
                    category={swapMaterial.material_category}
                    placeholder={`Search ${swapMaterial.material_category} products...`}
                    onSelect={handleSwapProduct}
                  />
                </div>
                <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setSwapMaterial(null)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
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
// PLAN ANALYSIS SECTION (simplified — kept from original)
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

  // Poll for analysis status
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
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>
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
  const [newCondition, setNewCondition] = useState({
    condition_type: '', description: '', measurement_value: '', measurement_unit: 'sqft', wind_zone: '1',
  })

  const fetchConditions = useCallback(async () => {
    try {
      const [condRes, typesRes, projRes] = await Promise.all([
        conditionAPI.listWithMaterials(projectId),
        referenceAPI.conditionTypes().catch(() => ({ data: [] })),
        projectAPI.get(projectId).catch(() => ({ data: null })),
      ])
      // Handle new response format: { conditions: [...], systems: [...] }
      const data = condRes.data
      if (data && data.conditions) {
        setConditions(data.conditions || [])
        setSystems(data.systems || [])
      } else {
        // Backward compat: old format returns array directly
        setConditions(Array.isArray(data) ? data : [])
      }
      const types = typesRes.data?.condition_types || typesRes.data || []
      setConditionTypes(types)
      setProjectData(projRes.data)
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

  if (loading) return <LoadingSpinner />

  // Separate active and inactive conditions
  const activeConditions = conditions.filter(c => c.is_active !== false)
  const inactiveConditions = conditions.filter(c => c.is_active === false)

  // Summarize (active only)
  const totalSF = activeConditions.reduce((s, c) => s + (c.measurement_unit === 'sqft' ? (c.measurement_value || 0) : 0), 0)
  const totalLF = activeConditions.reduce((s, c) => s + (c.measurement_unit === 'lnft' ? (c.measurement_value || 0) : 0), 0)
  const totalEA = activeConditions.reduce((s, c) => s + (c.measurement_unit === 'each' ? (c.measurement_value || 0) : 0), 0)
  const totalMaterials = activeConditions.reduce((s, c) => s + (c.materials?.length || 0), 0)

  // Toggle condition active/inactive
  const handleToggleConditionActive = async (conditionId, currentActive) => {
    try {
      await conditionAPI.update(conditionId, { is_active: !currentActive })
      fetchConditions()
    } catch {
      setError('Failed to toggle condition')
    }
  }

  const currentSystem = systems.length > 0 ? systems[0] : null

  return (
    <div>
      {/* Plan Analysis */}
      <PlanAnalysisSection projectId={projectId} onConditionsChanged={fetchConditions} />

      {/* Smart Build Section */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-blue-900 flex items-center">
              <BoltIcon className="w-5 h-5 text-blue-600 mr-2" />
              Smart Build Conditions
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Reads spec analysis + plan extractions to build conditions with materials for each roof area.
            </p>

            {/* System Type Selector */}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="text-xs font-medium text-blue-800">System:</label>
              <div className="flex gap-1">
                {['TPO', 'EPDM', 'PVC', 'ModBit', 'BUR', 'StandingSeam'].map(sys => (
                  <button
                    key={sys}
                    onClick={() => handleSystemTypeChange(sys)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      (projectData?.system_type || '').toUpperCase() === sys.toUpperCase()
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-100'
                    }`}
                  >
                    {sys}
                  </button>
                ))}
              </div>
              {!projectData?.system_type && (
                <span className="text-xs text-amber-600 italic">Auto-detect from spec</span>
              )}
            </div>
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

      {/* System Header */}
      {currentSystem && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{currentSystem.name}</h2>
              <div className="flex gap-2 items-center mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                  {currentSystem.system_type}
                </span>
                <span className="text-xs text-gray-500">
                  {activeConditions.length} active / {conditions.length} total conditions
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Condition
          </button>
        </div>
      )}

      {/* Conditions Header (when no system exists) */}
      {!currentSystem && (
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Roof Conditions</h2>
            <div className="flex gap-3 text-xs text-gray-500 mt-1">
              <span>{activeConditions.length} active conditions</span>
              <span>{totalMaterials} materials</span>
              {totalSF > 0 && <span>{totalSF.toLocaleString()} SF</span>}
              {totalLF > 0 && <span>{totalLF.toLocaleString()} LF</span>}
              {totalEA > 0 && <span>{totalEA.toLocaleString()} EA</span>}
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Condition
          </button>
        </div>
      )}

      {/* Summary Stats (active conditions) */}
      {activeConditions.length > 0 && (
        <div className="mb-4 grid grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-900">{activeConditions.length}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{totalSF > 0 ? totalSF.toLocaleString() : '—'}</div>
            <div className="text-xs text-gray-500">SF</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-600">{totalLF > 0 ? totalLF.toLocaleString() : '—'}</div>
            <div className="text-xs text-gray-500">LF</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-600">{totalEA > 0 ? totalEA.toLocaleString() : '—'}</div>
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
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500 mb-2">No conditions yet.</p>
          <p className="text-sm text-gray-400">Upload plans and run Smart Build, or add conditions manually.</p>
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
                    const ct_info = { label: c.condition_label || c.condition_type }
                    const colors = TYPE_COLORS[c.condition_type] || TYPE_COLORS.custom
                    return (
                      <div
                        key={c.id}
                        className="border border-gray-200 rounded-lg bg-gray-50 px-4 py-3 flex items-center justify-between opacity-60 hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2 py-0.5 ${colors.bg} ${colors.text} text-xs font-semibold rounded`}>
                            {ct_info.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {fmtNum(c.measurement_value)} {fmtUnit(c.measurement_unit)}
                          </span>
                          <span className="text-xs text-gray-400 italic">No plan data</span>
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
                // Auto-set unit based on type
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
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={newCondition.description}
              onChange={(e) => setNewCondition({ ...newCondition, description: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Main roof field area"
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
                placeholder="e.g., 5000"
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
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
              Add Condition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
