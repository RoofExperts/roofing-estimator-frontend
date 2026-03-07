import { useState, useEffect } from 'react'
import { adminAPI } from '../../api'

const SYSTEM_TYPES = ['TPO', 'EPDM', 'PVC', 'ModBit', 'BUR', 'StandingSeam']
const UNIT_OPTIONS = ['sqft', 'lnft', 'each']

export default function SystemTemplatesTab() {
  const [systemType, setSystemType] = useState('TPO')
  const [conditions, setConditions] = useState([])
  const [isCustom, setIsCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [newCondition, setNewCondition] = useState({
    condition_type: '',
    description: '',
    measurement_unit: 'sqft',
    flashing_height: '',
    fastener_spacing: '',
  })

  useEffect(() => {
    fetchTemplate()
  }, [systemType])

  const fetchTemplate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminAPI.getSystemTemplate(systemType)
      setConditions(res.data.conditions || [])
      setIsCustom(res.data.is_custom)
    } catch (err) {
      setError('Failed to load system template')
      console.error(err)
    }
    setLoading(false)
  }

  const handleAddCondition = async () => {
    if (!newCondition.condition_type.trim()) return
    setSaving(true)
    try {
      const data = {
        condition_type: newCondition.condition_type.toLowerCase().replace(/\s+/g, '_'),
        description: newCondition.description || newCondition.condition_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        measurement_unit: newCondition.measurement_unit,
        flashing_height: newCondition.flashing_height ? parseFloat(newCondition.flashing_height) : null,
        fastener_spacing: newCondition.fastener_spacing ? parseInt(newCondition.fastener_spacing) : null,
      }
      await adminAPI.addTemplateCondition(systemType, data)
      setShowAddModal(false)
      setNewCondition({ condition_type: '', description: '', measurement_unit: 'sqft', flashing_height: '', fastener_spacing: '' })
      fetchTemplate()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add condition')
    }
    setSaving(false)
  }

  const handleDeleteCondition = async (condId, condType) => {
    if (!confirm(`Remove "${condType}" from this system template?`)) return
    try {
      await adminAPI.deleteTemplateCondition(systemType, condId)
      fetchTemplate()
    } catch (err) {
      setError('Failed to remove condition')
    }
  }

  const handleStartEdit = (cond) => {
    setEditingId(cond.id)
    setEditForm({
      description: cond.description || '',
      measurement_unit: cond.measurement_unit || 'sqft',
      flashing_height: cond.flashing_height ?? '',
      fastener_spacing: cond.fastener_spacing ?? '',
    })
  }

  const handleSaveEdit = async (condId) => {
    setSaving(true)
    try {
      const data = {
        description: editForm.description || null,
        measurement_unit: editForm.measurement_unit,
        flashing_height: editForm.flashing_height !== '' ? parseFloat(editForm.flashing_height) : null,
        fastener_spacing: editForm.fastener_spacing !== '' ? parseInt(editForm.fastener_spacing) : null,
      }
      await adminAPI.updateTemplateCondition(systemType, condId, data)
      setEditingId(null)
      fetchTemplate()
    } catch (err) {
      setError('Failed to update condition')
    }
    setSaving(false)
  }

  const handleMoveCondition = async (index, direction) => {
    const newList = [...conditions]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newList.length) return

    // Only works on custom templates
    if (!isCustom) {
      // Need to clone first — trigger by calling add which ensures org template
      setError('Click "Customize Template" first to reorder conditions')
      return
    }

    ;[newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]]
    setConditions(newList)

    try {
      await adminAPI.reorderTemplateConditions(systemType, newList.map(c => c.id))
    } catch (err) {
      fetchTemplate() // revert on failure
    }
  }

  const handleResetToDefaults = async () => {
    if (!confirm('Reset this system template to platform defaults? All customizations will be removed.')) return
    try {
      await adminAPI.resetSystemTemplate(systemType)
      fetchTemplate()
    } catch (err) {
      setError('Failed to reset template')
    }
  }

  const fmtType = (type) => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">System Templates</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define which conditions are included when Smart Build creates a new roof system.
            Each condition type here becomes a section in the estimator.
          </p>
        </div>
      </div>

      {/* System Type Selector */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-gray-700">System Type:</span>
        <div className="flex gap-2">
          {SYSTEM_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setSystemType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                systemType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isCustom && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">Custom</span>
          )}
          {!isCustom && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded">Default</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-2">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading template...</div>
      ) : (
        <>
          {/* Conditions Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Flash Ht (in)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Fastener Sp</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conditions.map((cond, idx) => (
                  <tr key={cond.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{fmtType(cond.condition_type)}</span>
                      <span className="ml-2 text-xs text-gray-400 font-mono">{cond.condition_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cond.id ? (
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={e => setEditForm({...editForm, description: e.target.value})}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-600">{cond.description || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cond.id ? (
                        <select
                          value={editForm.measurement_unit}
                          onChange={e => setEditForm({...editForm, measurement_unit: e.target.value})}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-600 font-mono">{cond.measurement_unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cond.id ? (
                        <input
                          type="number"
                          value={editForm.flashing_height}
                          onChange={e => setEditForm({...editForm, flashing_height: e.target.value})}
                          placeholder="-"
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">{cond.flashing_height ? `${cond.flashing_height}"` : '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cond.id ? (
                        <input
                          type="number"
                          value={editForm.fastener_spacing}
                          onChange={e => setEditForm({...editForm, fastener_spacing: e.target.value})}
                          placeholder="-"
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">{cond.fastener_spacing ? `${cond.fastener_spacing}"` : '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isCustom && (
                          <>
                            <button onClick={() => handleMoveCondition(idx, -1)} disabled={idx === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move up">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button onClick={() => handleMoveCondition(idx, 1)} disabled={idx === conditions.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Move down">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          </>
                        )}
                        {editingId === cond.id ? (
                          <>
                            <button onClick={() => handleSaveEdit(cond.id)} disabled={saving}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                            <button onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleStartEdit(cond)}
                              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                            {isCustom && (
                              <button onClick={() => handleDeleteCondition(cond.id, cond.condition_type)}
                                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Remove</button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Condition
            </button>
            {isCustom && (
              <button
                onClick={handleResetToDefaults}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                Reset to Defaults
              </button>
            )}
            <div className="ml-auto text-sm text-gray-500">
              {conditions.length} condition{conditions.length !== 1 ? 's' : ''} in template
            </div>
          </div>
        </>
      )}

      {/* Add Condition Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Condition to Template</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition Name *</label>
                <input
                  type="text"
                  value={newCondition.condition_type}
                  onChange={e => setNewCondition({...newCondition, condition_type: e.target.value})}
                  placeholder="e.g., vents, skylights, walkway_pads"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Use lowercase with underscores (auto-formatted)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newCondition.description}
                  onChange={e => setNewCondition({...newCondition, description: e.target.value})}
                  placeholder="e.g., Roof Vents"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={newCondition.measurement_unit}
                    onChange={e => setNewCondition({...newCondition, measurement_unit: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flash Ht</label>
                  <input
                    type="number"
                    value={newCondition.flashing_height}
                    onChange={e => setNewCondition({...newCondition, flashing_height: e.target.value})}
                    placeholder="-"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fastener Sp</label>
                  <input
                    type="number"
                    value={newCondition.fastener_spacing}
                    onChange={e => setNewCondition({...newCondition, fastener_spacing: e.target.value})}
                    placeholder="-"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleAddCondition} disabled={saving || !newCondition.condition_type.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Adding...' : 'Add Condition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
