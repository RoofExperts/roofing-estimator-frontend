import { useState, useEffect } from 'react'

// API helper for the new endpoints
const conditionPresetsAPI = {
  getByCondition: (conditionType, systemType) => {
    const params = new URLSearchParams({ condition_type: conditionType })
    if (systemType) params.append('system_type', systemType)
    return fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://roofing-estimator-backend.onrender.com'}/material-templates/by-condition?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
    }).then(r => r.json())
  },
  reorder: (templateIds) => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://roofing-estimator-backend.onrender.com'}/material-templates/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      body: JSON.stringify({ template_ids: templateIds })
    }).then(r => r.json())
  },
  resetCondition: (conditionType, systemType) => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://roofing-estimator-backend.onrender.com'}/material-templates/reset-condition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      body: JSON.stringify({ condition_type: conditionType, system_type: systemType || null })
    }).then(r => r.json())
  },
}

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

export default function ConditionPresetsTab() {
  const [selectedCondition, setSelectedCondition] = useState('field')
  const [selectedSystem, setSelectedSystem] = useState('')
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    loadTemplates()
  }, [selectedCondition, selectedSystem])

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
        `${import.meta.env.VITE_API_BASE_URL || 'https://roofing-estimator-backend.onrender.com'}/material-templates/${editingId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
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
      await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://roofing-estimator-backend.onrender.com'}/material-templates/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      )
      setMessage({ type: 'success', text: 'Material removed.' })
      loadTemplates()
    } catch (err) {
      setMessage({ type: 'error', text: 'Delete failed.' })
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`px-4 py-3 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

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
              {CONDITION_TYPES.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
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

      {/* Material Stack */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Build-Up Stack — {CONDITION_TYPES.find(c => c.value === selectedCondition)?.label}
          </h2>
          <span className="text-sm text-gray-500">{templates.length} materials</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No materials defined for this condition/system combination.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t, idx) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  t.is_optional ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'
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
                    {t.is_optional && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">Optional</span>
                    )}
                    {t.is_global && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Global</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {t.system_type} · {t.material_category} · {t.coverage_rate} {t.unit} · {(t.waste_factor * 100).toFixed(0)}% waste
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
    </div>
  )
}
