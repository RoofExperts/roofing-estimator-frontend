import { useState, useEffect } from 'react'
import { conditionAPI, referenceAPI } from '../api'
import { LoadingSpinner, ErrorDisplay } from './common'
import Modal from './Modal'

export default function ConditionsTab({ projectId }) {
  const [conditions, setConditions] = useState([])
  const [conditionTypes, setConditionTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [newCondition, setNewCondition] = useState({
    condition_type: '', measurement: '', unit: 'SF', wind_zone: '1'
  })

  const fetchData = async () => {
    try {
      const [condRes, typesRes] = await Promise.all([
        conditionAPI.list(projectId),
        referenceAPI.conditionTypes().catch(() => ({ data: [] }))
      ])
      setConditions(condRes.data)
      setConditionTypes(typesRes.data || [])
    } catch (err) {
      setError('Failed to load conditions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [projectId])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await conditionAPI.create(projectId, {
        ...newCondition,
        measurement: parseFloat(newCondition.measurement)
      })
      setShowAddModal(false)
      setNewCondition({ condition_type: '', measurement: '', unit: 'SF', wind_zone: '1' })
      fetchData()
    } catch (err) {
      setError('Failed to add condition')
    }
  }

  const startEdit = (condition) => {
    setEditingId(condition.id)
    setEditValues({
      measurement: condition.measurement,
      unit: condition.unit,
      wind_zone: condition.wind_zone
    })
  }

  const saveEdit = async (id) => {
    try {
      await conditionAPI.update(id, {
        ...editValues,
        measurement: parseFloat(editValues.measurement)
      })
      setEditingId(null)
      fetchData()
    } catch (err) {
      setError('Failed to update condition')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this condition?')) return
    try {
      await conditionAPI.delete(id)
      fetchData()
    } catch (err) {
      setError('Failed to delete condition')
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay message={error} onRetry={fetchData} />

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Roof Conditions</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Condition
        </button>
      </div>

      {conditions.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No conditions yet. Add conditions manually or upload a roof plan to auto-extract them.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Measurement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wind Zone</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {conditions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.condition_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {editingId === c.id ? (
                      <input type="number" value={editValues.measurement}
                        onChange={(e) => setEditValues({...editValues, measurement: e.target.value})}
                        className="w-24 px-2 py-1 border rounded" />
                    ) : c.measurement}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {editingId === c.id ? (
                      <select value={editValues.unit}
                        onChange={(e) => setEditValues({...editValues, unit: e.target.value})}
                        className="px-2 py-1 border rounded">
                        <option>SF</option><option>LF</option><option>EA</option>
                      </select>
                    ) : c.unit}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {editingId === c.id ? (
                      <select value={editValues.wind_zone}
                        onChange={(e) => setEditValues({...editValues, wind_zone: e.target.value})}
                        className="px-2 py-1 border rounded">
                        <option>1</option><option>2</option><option>3</option>
                      </select>
                    ) : c.wind_zone}
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    {editingId === c.id ? (
                      <>
                        <button onClick={() => saveEdit(c.id)} className="text-green-600 hover:text-green-800">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-800">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(c)} className="text-primary-600 hover:text-primary-800">Edit</button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Condition">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Condition Type *</label>
            <select
              required
              value={newCondition.condition_type}
              onChange={(e) => setNewCondition({...newCondition, condition_type: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select type...</option>
              {conditionTypes.length > 0 ? (
                conditionTypes.map(t => <option key={t} value={t}>{t}</option>)
              ) : (
                <>
                  <option value="field_of_roof">Field of Roof</option>
                  <option value="perimeter">Perimeter</option>
                  <option value="corners">Corners</option>
                  <option value="penetrations">Penetrations</option>
                  <option value="drains">Drains</option>
                  <option value="scuppers">Scuppers</option>
                  <option value="curbs">Curbs</option>
                  <option value="parapets">Parapets</option>
                  <option value="expansion_joints">Expansion Joints</option>
                </>
              )}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Measurement *</label>
              <input type="number" step="0.01" required value={newCondition.measurement}
                onChange={(e) => setNewCondition({...newCondition, measurement: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., 5000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <select value={newCondition.unit}
                onChange={(e) => setNewCondition({...newCondition, unit: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                <option>SF</option><option>LF</option><option>EA</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Wind Zone</label>
            <select value={newCondition.wind_zone}
              onChange={(e) => setNewCondition({...newCondition, wind_zone: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
              <option value="1">Zone 1 (Field)</option>
              <option value="2">Zone 2 (Perimeter)</option>
              <option value="3">Zone 3 (Corner)</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg">Add Condition</button>
          </div>
        </form>
      </Modal>
    </div>
  )
  }
