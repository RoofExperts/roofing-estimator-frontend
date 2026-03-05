import { useState, useEffect } from 'react'
import { adminAPI } from '../../api'

const PROPOSAL_TYPES = {
  gc: 'General Contractor',
  tenant_finish_out: 'Tenant Finish Out',
  reroof: 'Re-Roof',
}

function EditableList({ items, onChange, placeholder = 'Add item...' }) {
  const [newItem, setNewItem] = useState('')

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()])
      setNewItem('')
    }
  }

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group">
          <span className="flex-1 text-sm text-gray-700 py-1">{item}</span>
          <button
            onClick={() => removeItem(i)}
            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
        <button
          onClick={addItem}
          className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export default function ProposalSettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [activeTypeTab, setActiveTypeTab] = useState('gc')

  // Rate settings
  const [rates, setRates] = useState({
    markup_percent: 25.0,
    tax_rate: 8.25,
    labor_rate_per_square: 85.0,
    default_waste_factor: 10.0,
  })

  // Proposal type defaults
  const [proposalDefaults, setProposalDefaults] = useState({
    gc: { terms: [], exclusions: [], notes: [] },
    tenant_finish_out: { terms: [], exclusions: [], notes: [] },
    reroof: { terms: [], exclusions: [], notes: [] },
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await adminAPI.getCompany()
      const data = res.data
      setRates({
        markup_percent: data.markup_percent ?? 25.0,
        tax_rate: data.tax_rate ?? 8.25,
        labor_rate_per_square: data.labor_rate_per_square ?? 85.0,
        default_waste_factor: data.default_waste_factor ?? 10.0,
      })
      if (data.proposal_type_defaults) {
        setProposalDefaults(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data.proposal_type_defaults).map(([k, v]) => [k, {
              terms: v.terms || [],
              exclusions: v.exclusions || [],
              notes: v.notes || [],
            }])
          ),
        }))
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await adminAPI.updateCompany({
        ...rates,
        proposal_type_defaults: proposalDefaults,
      })
      setMessage({ type: 'success', text: 'Settings saved successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  const updateProposalField = (type, field, value) => {
    setProposalDefaults(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`px-4 py-3 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Rate Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Estimate Rate Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Markup %</label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                value={rates.markup_percent}
                onChange={(e) => setRates({ ...rates, markup_percent: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="absolute right-3 top-2.5 text-sm text-gray-400">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate %</label>
            <div className="relative">
              <input
                type="number"
                step="0.25"
                value={rates.tax_rate}
                onChange={(e) => setRates({ ...rates, tax_rate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="absolute right-3 top-2.5 text-sm text-gray-400">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Labor Rate / Square</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-gray-400">$</span>
              <input
                type="number"
                step="5"
                value={rates.labor_rate_per_square}
                onChange={(e) => setRates({ ...rates, labor_rate_per_square: parseFloat(e.target.value) })}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Waste %</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={rates.default_waste_factor}
                onChange={(e) => setRates({ ...rates, default_waste_factor: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="absolute right-3 top-2.5 text-sm text-gray-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Type Defaults */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Proposal Type Defaults</h2>

        {/* Type tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {Object.entries(PROPOSAL_TYPES).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTypeTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTypeTab === key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Current type content */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
            <EditableList
              items={proposalDefaults[activeTypeTab]?.terms || []}
              onChange={(items) => updateProposalField(activeTypeTab, 'terms', items)}
              placeholder="Add a term or condition..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exclusions</label>
            <EditableList
              items={proposalDefaults[activeTypeTab]?.exclusions || []}
              onChange={(items) => updateProposalField(activeTypeTab, 'exclusions', items)}
              placeholder="Add an exclusion..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <EditableList
              items={proposalDefaults[activeTypeTab]?.notes || []}
              onChange={(items) => updateProposalField(activeTypeTab, 'notes', items)}
              placeholder="Add a note..."
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Proposal Settings'}
        </button>
      </div>
    </div>
  )
}
