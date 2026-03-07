import { useState, useEffect } from 'react'
import Modal from '../Modal'

// ============================================================================
// API HELPERS
// ============================================================================

const BASE = import.meta.env.VITE_API_BASE_URL || 'https://roofing-estimator-backend.onrender.com'
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
})

const conditionPresetsAPI = {
  getByCondition: (conditionType, systemType) => {
    const params = new URLSearchParams({ condition_type: conditionType })
    if (systemType) params.append('system_type', systemType)
    return fetch(`${BASE}/material-templates/by-condition?${params}`, {
      headers: authHeaders()
    }).then(r => r.json())
  },
  listAll: (conditionType, systemType) => {
    const params = new URLSearchParams()
    if (conditionType) params.append('condition_type', conditionType)
    if (systemType) params.append('system_type', systemType)
    return fetch(`${BASE}/material-templates?${params}`, {
      headers: authHeaders()
    }).then(r => r.json())
  },
  createTemplate: (data) => {
    return fetch(`${BASE}/material-templates`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    }).then(r => {
      if (!r.ok) throw new Error('Failed to create template')
      return r.json()
    })
  },
  reorder: (templateIds) => {
    return fetch(`${BASE}/material-templates/reorder`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ template_ids: templateIds })
    }).then(r => r.json())
  },
  resetCondition: (conditionType, systemType) => {
    return fetch(`${BASE}/material-templates/reset-condition`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ condition_type: conditionType, system_type: systemType || null })
    }).then(r => r.json())
  },
  getCostItems: () => {
    return fetch(`${BASE}/cost-database`, {
      headers: authHeaders()
    }).then(r => r.json())
  },
}


// ============================================================================
// CONSTANTS
// ============================================================================

const CONDITION_TYPES = [
  { value: 'field', label: 'Field of Roof' },
  { value: 'wall_flashing', label: 'Wall Flashings' },
  { value: 'curb', label: 'Curb Flashing' },
  { value: 'roof_drain', label: 'Roof Drains' },
  { value: 'pipe_flashing', label: 'Pipe Flashings' },
  { value: 'pitch_pan', label: 'Pitch Pans' },
  { value: 'scupper', label: 'Scuppers' },
  { value: 'coping', label: 'Coping' },
  { value: 'perimeter', label: 'Perimeter' },
  { value: 'corner', label: 'Corners' },
  { value: 'penetration', label: 'Penetrations' },
  { value: 'expansion_joint', label: 'Expansion Joints' },
  { value: 'parapet', label: 'Parapets' },
  { value: 'edge_detail', label: 'Edge Details' },
  { value: 'transition', label: 'Transitions' },
]

const SYSTEM_TYPES = [
  { value: '', label: 'All Systems' },
  { value: 'TPO', label: 'TPO' },
  { value: 'EPDM', label: 'EPDM' },
  { value: 'PVC', label: 'PVC' },
  { value: 'ModBit', label: 'Mod Bit' },
  { value: 'BUR', label: 'BUR' },
  { value: 'StandingSeam', label: 'Standing Seam' },
]

const CATEGORY_OPTIONS = [
  'membrane', 'insulation', 'coverboard', 'fastener', 'adhesive',
  'sealant', 'accessory', 'base_sheet', 'flashing',
]

const UNIT_OPTIONS = [
  { value: 'sqft', label: 'Square Feet (SF)' },
  { value: 'lnft', label: 'Linear Feet (LF)' },
  { value: 'each', label: 'Each (EA)' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'roll', label: 'Roll' },
  { value: 'tube', label: 'Tube' },
  { value: 'bag', label: 'Bag' },
]

const CALC_TYPE_OPTIONS = [
  { value: '', label: 'Standard (multiply)' },
  { value: 'wall_membrane', label: 'Wall Membrane (uses flashing height)' },
  { value: 'fastener', label: 'Fastener (uses spacing)' },
]

const getCategoryColor = (category) => {
  const colors = {
    membrane: 'bg-blue-100 text-blue-700',
    insulation: 'bg-yellow-100 text-yellow-700',
    coverboard: 'bg-amber-100 text-amber-700',
    fastener: 'bg-orange-100 text-orange-700',
    adhesive: 'bg-green-100 text-green-700',
    sealant: 'bg-purple-100 text-purple-700',
    accessory: 'bg-pink-100 text-pink-700',
    base_sheet: 'bg-stone-100 text-stone-700',
    flashing: 'bg-cyan-100 text-cyan-700',
  }
  return colors[category] || 'bg-gray-100 text-gray-700'
}


// ============================================================================
// ADD MATERIAL MODAL
// ============================================================================

function AddMaterialModal({ isOpen, onClose, onSave, conditionType, systemType, costItems }) {
  const [form, setForm] = useState({
    material_name: '',
    material_category: 'membrane',
    unit: 'sqft',
    coverage_rate: 1.0,
    waste_factor: 0.10,
    calc_type: '',
    is_optional: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        material_name: '',
        material_category: 'membrane',
        unit: 'sqft',
        coverage_rate: 1.0,
        waste_factor: 0.10,
        calc_type: '',
        is_optional: false,
      })
      setError(null)
    }
  }, [isOpen])

  // When user picks a cost item from datalist, auto-fill category and unit
  const handleNameChange = (e) => {
    const name = e.target.value
    setForm(prev => ({ ...prev, material_name: name }))

    // Try to match a cost database item and auto-fill fields
    const match = costItems.find(ci => ci.material_name === name)
    if (match) {
      setForm(prev => ({
        ...prev,
        material_name: name,
        material_category: match.material_category || prev.material_category,
        unit: match.unit || prev.unit,
      }))
    }
  }

  const handleSubmit = async () => {
    if (!form.material_name.trim()) {
      setError('Material name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        ...form,
        system_type: systemType || 'common',
        condition_type: conditionType,
        calc_type: form.calc_type || null,
        coverage_rate: parseFloat(form.coverage_rate) || 1.0,
        waste_factor: parseFloat(form.waste_factor) || 0.10,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create material.')
    } finally {
      setSaving(false)
    }
  }

  const condLabel = CONDITION_TYPES.find(c => c.value === conditionType)?.label || conditionType
  const sysLabel = systemType || 'All Systems'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Material to Preset" size="md">
      <div className="space-y-5">
        {/* Context banner */}
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg text-sm">
          <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-primary-700">
            Adding to <strong>{condLabel}</strong> &middot; <strong>{sysLabel}</strong>
          </span>
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Material Name with autocomplete from cost database */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
          <input
            type="text"
            list="cost-item-suggestions"
            value={form.material_name}
            onChange={handleNameChange}
            placeholder="Type or select from cost database..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            autoFocus
          />
          <datalist id="cost-item-suggestions">
            {costItems.map((ci, i) => (
              <option key={i} value={ci.material_name} />
            ))}
          </datalist>
        </div>

        {/* Category + Unit row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.material_category}
              onChange={(e) => setForm({ ...form, material_category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {UNIT_OPTIONS.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Coverage Rate + Waste Factor row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Rate</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.coverage_rate}
              onChange={(e) => setForm({ ...form, coverage_rate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-xs text-gray-400">Units of material per unit of condition</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Waste Factor</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.waste_factor}
              onChange={(e) => setForm({ ...form, waste_factor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-xs text-gray-400">e.g. 0.10 = 10% waste</p>
          </div>
        </div>

        {/* Calc Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Type</label>
          <select
            value={form.calc_type}
            onChange={(e) => setForm({ ...form, calc_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            {CALC_TYPE_OPTIONS.map(ct => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>
        </div>

        {/* Optional checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_optional}
            onChange={(e) => setForm({ ...form, is_optional: e.target.checked })}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Optional material (user can toggle on/off per project)</span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.material_name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Adding...' : 'Add Material'}
          </button>
        </div>
      </div>
    </Modal>
  )
}


// ============================================================================
// SUMMARY CARD
// ============================================================================

function SummaryCard({ selectedSystem, conditionCounts }) {
  if (!selectedSystem) return null

  const total = CONDITION_TYPES.length
  const configured = Object.values(conditionCounts).filter(c => c > 0).length
  const pct = Math.round((configured / total) * 100)

  let barColor = 'bg-gray-400'
  if (pct >= 75) barColor = 'bg-green-500'
  else if (pct >= 40) barColor = 'bg-yellow-500'
  else if (pct > 0) barColor = 'bg-orange-500'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Database Coverage — {selectedSystem}
        </h3>
        <span className="text-sm font-medium text-gray-600">{configured} / {total} conditions</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {CONDITION_TYPES.map(ct => {
          const count = conditionCounts[ct.value] || 0
          return (
            <span
              key={ct.value}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
              }`}
              title={`${ct.label}: ${count} materials`}
            >
              {ct.label} ({count})
            </span>
          )
        })}
      </div>
    </div>
  )
}


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ConditionPresetsTab() {
  const [selectedCondition, setSelectedCondition] = useState('field')
  const [selectedSystem, setSelectedSystem] = useState('')
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Add material modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [costItems, setCostItems] = useState([])

  // Summary card state
  const [conditionCounts, setConditionCounts] = useState({})

  // Load templates when condition or system changes
  useEffect(() => {
    loadTemplates()
  }, [selectedCondition, selectedSystem])

  // Load cost items once for autocomplete
  useEffect(() => {
    conditionPresetsAPI.getCostItems()
      .then(items => setCostItems(Array.isArray(items) ? items : []))
      .catch(() => {})
  }, [])

  // Load summary counts when system changes
  useEffect(() => {
    if (!selectedSystem) {
      setConditionCounts({})
      return
    }
    loadSummaryCounts()
  }, [selectedSystem])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await conditionPresetsAPI.getByCondition(selectedCondition, selectedSystem || null)
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Failed to load templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSummaryCounts = async () => {
    try {
      const counts = {}
      // Fetch template counts for each condition type in parallel
      await Promise.all(
        CONDITION_TYPES.map(async (ct) => {
          const data = await conditionPresetsAPI.getByCondition(ct.value, selectedSystem)
          counts[ct.value] = (data.templates || []).length
        })
      )
      setConditionCounts(counts)
    } catch (err) {
      console.error('Failed to load summary:', err)
    }
  }

  const moveUp = async (index) => {
    if (index === 0) return
    const newList = [...templates]
    ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
    setTemplates(newList)
    await conditionPresetsAPI.reorder(newList.map(t => t.id))
  }

  const moveDown = async (index) => {
    if (index === templates.length - 1) return
    const newList = [...templates]
    ;[newList[index + 1], newList[index]] = [newList[index], newList[index + 1]]
    setTemplates(newList)
    await conditionPresetsAPI.reorder(newList.map(t => t.id))
  }

  const handleReset = async () => {
    if (!confirm('Reset this condition to global defaults? This will delete any org-specific customizations.')) return
    try {
      await conditionPresetsAPI.resetCondition(selectedCondition, selectedSystem || null)
      setMessage({ type: 'success', text: 'Condition reset to defaults.' })
      loadTemplates()
      if (selectedSystem) loadSummaryCounts()
    } catch (err) {
      setMessage({ type: 'error', text: 'Reset failed.' })
    }
  }

  const startEdit = (t) => {
    setEditingId(t.id)
    setEditForm({
      coverage_rate: t.coverage_rate,
      waste_factor: t.waste_factor,
      unit: t.unit,
      is_optional: t.is_optional,
    })
  }

  const saveEdit = async () => {
    try {
      const res = await fetch(
        `${BASE}/material-templates/${editingId}`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(editForm)
        }
      )
      if (res.ok) {
        setMessage({ type: 'success', text: 'Template updated.' })
        setEditingId(null)
        loadTemplates()
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Update failed.' })
    }
  }

  const deleteTemplate = async (id) => {
    if (!confirm('Remove this material from the condition preset?')) return
    try {
      await fetch(`${BASE}/material-templates/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      setMessage({ type: 'success', text: 'Material removed.' })
      loadTemplates()
      if (selectedSystem) loadSummaryCounts()
    } catch (err) {
      setMessage({ type: 'error', text: 'Delete failed.' })
    }
  }

  const handleAddMaterial = async (formData) => {
    await conditionPresetsAPI.createTemplate(formData)
    setMessage({ type: 'success', text: `"${formData.material_name}" added to ${CONDITION_TYPES.find(c => c.value === selectedCondition)?.label}.` })
    loadTemplates()
    if (selectedSystem) loadSummaryCounts()
  }

  // Auto-clear messages after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div className="space-y-6">
      {/* Toast message */}
      {message && (
        <div className={`px-4 py-3 rounded-lg border flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      {/* Summary Card */}
      <SummaryCard selectedSystem={selectedSystem} conditionCounts={conditionCounts} />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition Type</label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {CONDITION_TYPES.map(ct => {
                const count = conditionCounts[ct.value]
                return (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}{count !== undefined ? ` (${count})` : ''}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">System Type</label>
            <select
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {SYSTEM_TYPES.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Material Build-Up Stack */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Build-Up Stack — {CONDITION_TYPES.find(c => c.value === selectedCondition)?.label}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Materials auto-populate onto every new condition of this type
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{templates.length} materials</span>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Material
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="mt-3 text-sm text-gray-500">No materials defined for this combination.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Add the first material
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t, idx) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  t.is_optional ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Order arrows */}
                <div className="flex flex-col">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 p-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === templates.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 p-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Order number */}
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>

                {/* Material info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">{t.material_name}</span>
                    {/* Category badge */}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getCategoryColor(t.material_category)}`}>
                      {t.material_category.replace('_', ' ')}
                    </span>
                    {t.is_optional && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">Optional</span>
                    )}
                    {t.is_global && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Global</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {t.system_type} &middot; {t.coverage_rate} {t.unit} &middot; {(t.waste_factor * 100).toFixed(0)}% waste
                    {t.calc_type && <span className="ml-1 text-purple-600">({t.calc_type})</span>}
                  </div>
                </div>

                {/* Edit / Delete buttons */}
                {editingId === t.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.coverage_rate}
                      onChange={(e) => setEditForm({ ...editForm, coverage_rate: parseFloat(e.target.value) })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                      placeholder="Rate"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.waste_factor}
                      onChange={(e) => setEditForm({ ...editForm, waste_factor: parseFloat(e.target.value) })}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                      placeholder="Waste"
                    />
                    <button onClick={saveEdit} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(t)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Material Modal */}
      <AddMaterialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddMaterial}
        conditionType={selectedCondition}
        systemType={selectedSystem}
        costItems={costItems}
      />
    </div>
  )
}
