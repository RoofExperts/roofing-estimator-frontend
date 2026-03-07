import { useState, useEffect, useCallback } from 'react'
import { systemAPI } from '../api'

const SYSTEM_TYPE_OPTIONS = ['TPO', 'EPDM', 'PVC']

const MEMBRANE_OPTIONS = [
  '45 mil',
  '60 mil',
  '80 mil',
  '90 mil (fleeceback)',
  '110 mil (fleeceback)',
  '135 mil (fleeceback)',
]

const FIELD_ATTACHMENT_OPTIONS = [
  'Mechanically Fastened',
  'Rhinobond',
  'Adhesive',
  'Low Rise Foam',
]

const WALL_FLASHING_OPTIONS = ['45 mil', '60 mil', '80 mil']

const COVERBOARD_ATTACHMENT_OPTIONS = ['Mechanically Fastened', 'Low Rise Foam']

const INSULATION_ATTACHMENT_OPTIONS = [
  'Mechanically Fastened',
  'Gang Fastened',
  'Low Rise Foam',
]

const VAPOR_BOARD_ATTACHMENT_OPTIONS = [
  'Mechanically Fastened',
  'Gang Fastened',
  'Low Rise Foam',
]

const DEFAULT_SYSTEM = {
  name: '',
  system_type: 'TPO',
  manufacturer: '',
  membrane_thickness: '',
  field_attachment: '',
  wall_flashing_thickness: '',
  has_coverboard: false,
  coverboard_attachment: '',
  has_top_insulation: false,
  top_insulation_attachment: '',
  has_bottom_insulation: false,
  bottom_insulation_attachment: '',
  has_vapor_barrier: false,
  has_vapor_barrier_board: false,
  vapor_barrier_board_attachment: '',
}

export default function SpecRoofSystemTab({ projectId }) {
  const [systems, setSystems] = useState([])
  const [systemCount, setSystemCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Fetch existing systems on mount
  useEffect(() => {
    fetchSystems()
  }, [projectId])

  const fetchSystems = async () => {
    try {
      const res = await systemAPI.list(projectId)
      const data = res.data || []
      if (data.length > 0) {
        setSystems(data.map(s => ({
          ...DEFAULT_SYSTEM,
          ...s,
          has_coverboard: s.has_coverboard || false,
          has_top_insulation: s.has_top_insulation || false,
          has_bottom_insulation: s.has_bottom_insulation || false,
          has_vapor_barrier: s.has_vapor_barrier || false,
          has_vapor_barrier_board: s.has_vapor_barrier_board || false,
        })))
        setSystemCount(data.length)
      } else {
        setSystems([{ ...DEFAULT_SYSTEM, name: 'Roof Area 1' }])
        setSystemCount(1)
      }
    } catch (err) {
      setError('Failed to load roof systems')
    } finally {
      setLoading(false)
    }
  }

  const handleSystemCountChange = (newCount) => {
    const count = parseInt(newCount)
    setSystemCount(count)
    const updated = [...systems]
    while (updated.length < count) {
      updated.push({ ...DEFAULT_SYSTEM, name: `Roof Area ${updated.length + 1}` })
    }
    // Don't remove systems that already exist in DB — just hide them
    setSystems(updated.slice(0, count))
  }

  const handleFieldChange = (index, field, value) => {
    const updated = [...systems]
    updated[index] = { ...updated[index], [field]: value }

    // Clear child fields when parent toggled off
    if (field === 'has_coverboard' && !value) {
      updated[index].coverboard_attachment = ''
    }
    if (field === 'has_top_insulation' && !value) {
      updated[index].top_insulation_attachment = ''
    }
    if (field === 'has_bottom_insulation' && !value) {
      updated[index].bottom_insulation_attachment = ''
    }
    if (field === 'has_vapor_barrier' && !value) {
      updated[index].has_vapor_barrier_board = false
      updated[index].vapor_barrier_board_attachment = ''
    }
    if (field === 'has_vapor_barrier_board' && !value) {
      updated[index].vapor_barrier_board_attachment = ''
    }

    setSystems(updated)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      for (let i = 0; i < systems.length; i++) {
        const sys = systems[i]
        const payload = {
          name: sys.name || `Roof Area ${i + 1}`,
          system_type: sys.system_type || 'TPO',
          manufacturer: sys.manufacturer || null,
          membrane_thickness: sys.membrane_thickness || null,
          field_attachment: sys.field_attachment || null,
          wall_flashing_thickness: sys.wall_flashing_thickness || null,
          has_coverboard: sys.has_coverboard || false,
          coverboard_attachment: sys.has_coverboard ? sys.coverboard_attachment || null : null,
          has_top_insulation: sys.has_top_insulation || false,
          top_insulation_attachment: sys.has_top_insulation ? sys.top_insulation_attachment || null : null,
          has_bottom_insulation: sys.has_bottom_insulation || false,
          bottom_insulation_attachment: sys.has_bottom_insulation ? sys.bottom_insulation_attachment || null : null,
          has_vapor_barrier: sys.has_vapor_barrier || false,
          has_vapor_barrier_board: sys.has_vapor_barrier ? sys.has_vapor_barrier_board || false : false,
          vapor_barrier_board_attachment: sys.has_vapor_barrier_board ? sys.vapor_barrier_board_attachment || null : null,
        }

        if (sys.id) {
          await systemAPI.update(sys.id, payload)
        } else {
          const res = await systemAPI.create(projectId, payload)
          systems[i] = { ...systems[i], id: res.data.id }
        }
      }

      // Delete systems that were removed (beyond the current count)
      const res = await systemAPI.list(projectId)
      const existingIds = (res.data || []).map(s => s.id)
      const keepIds = systems.filter(s => s.id).map(s => s.id)
      for (const id of existingIds) {
        if (!keepIds.includes(id)) {
          await systemAPI.delete(id)
        }
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await fetchSystems()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save systems')
    } finally {
      setSaving(false)
    }
  }

  // Render a dropdown field
  const SelectField = ({ label, value, options, onChange, disabled }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )

  // Render a Yes/No toggle
  const ToggleField = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
            value
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
            !value
              ? 'bg-gray-600 text-white border-gray-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          No
        </button>
      </div>
    </div>
  )

  const renderSystemCard = (sys, index) => (
    <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* System header */}
      <div className="bg-primary-50 px-5 py-3 border-b border-primary-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-primary-800">
            System {index + 1}
          </span>
          <input
            type="text"
            value={sys.name || ''}
            onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
            placeholder={`Roof Area ${index + 1}`}
            className="text-sm border border-primary-200 rounded px-2 py-1 bg-white text-gray-800 w-48 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        {sys.id && (
          <span className="text-xs text-primary-500">ID: {sys.id}</span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Row 1: System Type + Manufacturer */}
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Roof System"
            value={sys.system_type}
            options={SYSTEM_TYPE_OPTIONS}
            onChange={(v) => handleFieldChange(index, 'system_type', v)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <input
              type="text"
              value={sys.manufacturer || ''}
              onChange={(e) => handleFieldChange(index, 'manufacturer', e.target.value)}
              placeholder="e.g., Carlisle, Firestone, GAF"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Row 2: Membrane + Field Attachment */}
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Membrane"
            value={sys.membrane_thickness}
            options={MEMBRANE_OPTIONS}
            onChange={(v) => handleFieldChange(index, 'membrane_thickness', v)}
          />
          <SelectField
            label="Field Membrane Attachment"
            value={sys.field_attachment}
            options={FIELD_ATTACHMENT_OPTIONS}
            onChange={(v) => handleFieldChange(index, 'field_attachment', v)}
          />
        </div>

        {/* Row 3: Wall Flashing */}
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Wall Flashing Thickness"
            value={sys.wall_flashing_thickness}
            options={WALL_FLASHING_OPTIONS}
            onChange={(v) => handleFieldChange(index, 'wall_flashing_thickness', v)}
          />
          <div /> {/* spacer */}
        </div>

        <hr className="border-gray-100" />

        {/* Coverboard */}
        <ToggleField
          label="Coverboard"
          value={sys.has_coverboard}
          onChange={(v) => handleFieldChange(index, 'has_coverboard', v)}
        />
        {sys.has_coverboard && (
          <div className="ml-6">
            <SelectField
              label="Coverboard Attachment"
              value={sys.coverboard_attachment}
              options={COVERBOARD_ATTACHMENT_OPTIONS}
              onChange={(v) => handleFieldChange(index, 'coverboard_attachment', v)}
            />
          </div>
        )}

        <hr className="border-gray-100" />

        {/* Top Insulation */}
        <ToggleField
          label="Top Insulation"
          value={sys.has_top_insulation}
          onChange={(v) => handleFieldChange(index, 'has_top_insulation', v)}
        />
        {sys.has_top_insulation && (
          <div className="ml-6">
            <SelectField
              label="Top Insulation Attachment"
              value={sys.top_insulation_attachment}
              options={INSULATION_ATTACHMENT_OPTIONS}
              onChange={(v) => handleFieldChange(index, 'top_insulation_attachment', v)}
            />
          </div>
        )}

        {/* Bottom Insulation */}
        <ToggleField
          label="Bottom Insulation"
          value={sys.has_bottom_insulation}
          onChange={(v) => handleFieldChange(index, 'has_bottom_insulation', v)}
        />
        {sys.has_bottom_insulation && (
          <div className="ml-6">
            <SelectField
              label="Bottom Insulation Attachment"
              value={sys.bottom_insulation_attachment}
              options={INSULATION_ATTACHMENT_OPTIONS}
              onChange={(v) => handleFieldChange(index, 'bottom_insulation_attachment', v)}
            />
          </div>
        )}

        <hr className="border-gray-100" />

        {/* Vapor Barrier */}
        <ToggleField
          label="Vapor Barrier"
          value={sys.has_vapor_barrier}
          onChange={(v) => handleFieldChange(index, 'has_vapor_barrier', v)}
        />
        {sys.has_vapor_barrier && (
          <div className="ml-6 space-y-3">
            <ToggleField
              label="Vapor Barrier Board"
              value={sys.has_vapor_barrier_board}
              onChange={(v) => handleFieldChange(index, 'has_vapor_barrier_board', v)}
            />
            {sys.has_vapor_barrier_board && (
              <div className="ml-6">
                <SelectField
                  label="Vapor Barrier Board Attachment"
                  value={sys.vapor_barrier_board_attachment}
                  options={VAPOR_BOARD_ATTACHMENT_OPTIONS}
                  onChange={(v) => handleFieldChange(index, 'vapor_barrier_board_attachment', v)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Specified Roof System</h2>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : 'Save All Systems'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-500 hover:text-red-700">x</button>
        </div>
      )}

      {/* System count selector */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">How Many Roof Systems?</label>
        <select
          value={systemCount}
          onChange={(e) => handleSystemCountChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {[1, 2, 3, 4].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* System cards */}
      <div className="space-y-6">
        {systems.slice(0, systemCount).map((sys, index) => renderSystemCard(sys, index))}
      </div>
    </div>
  )
}
