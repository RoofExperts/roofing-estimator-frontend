import { useState, useEffect } from 'react'
import { proposalAPI, estimateAPI } from '../api'
import { LoadingSpinner } from './common'

const defaultLineItem = { item: '', description: '', qty: '', unit: 'SF', unit_price: '', total: '' }

function LineItemRow({ item, index, onChange, onRemove }) {
  const handleField = (field, value) => {
    const updated = { ...item, [field]: value }
    // Auto-calculate total
    if (field === 'qty' || field === 'unit_price') {
      const q = parseFloat(updated.qty) || 0
      const p = parseFloat(updated.unit_price) || 0
      updated.total = (q * p) > 0 ? `$${(q * p).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''
    }
    onChange(index, updated)
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-2 py-1">
        <input type="text" value={item.item} onChange={e => handleField('item', e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="#" />
      </td>
      <td className="px-2 py-1">
        <input type="text" value={item.description} onChange={e => handleField('description', e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Description" />
      </td>
      <td className="px-2 py-1">
        <input type="text" value={item.qty} onChange={e => handleField('qty', e.target.value)}
          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" placeholder="0" />
      </td>
      <td className="px-2 py-1">
        <select value={item.unit} onChange={e => handleField('unit', e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm">
          <option>SF</option><option>LF</option><option>SQ</option><option>EA</option><option>LS</option>
        </select>
      </td>
      <td className="px-2 py-1">
        <input type="text" value={item.unit_price} onChange={e => handleField('unit_price', e.target.value)}
          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right" placeholder="0.00" />
      </td>
      <td className="px-2 py-1 text-sm text-right font-medium text-gray-700">{item.total}</td>
      <td className="px-2 py-1">
        <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  )
}

function LineItemTable({ title, items, setItems }) {
  const addRow = () => setItems([...items, { ...defaultLineItem, item: `${items.length + 1}` }])
  const removeRow = (idx) => setItems(items.filter((_, i) => i !== idx))
  const updateRow = (idx, updated) => setItems(items.map((it, i) => i === idx ? updated : it))

  const calcTotal = () => {
    const sum = items.reduce((s, it) => {
      const t = parseFloat(String(it.total).replace(/[$,]/g, '')) || 0
      return s + t
    }, 0)
    return sum > 0 ? `$${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <button onClick={addRow}
          className="text-xs bg-primary-50 text-primary-700 px-3 py-1 rounded-lg hover:bg-primary-100 font-medium">
          + Add Line Item
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Item</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-20">Qty</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Unit</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Unit Price</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Total</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <LineItemRow key={idx} item={item} index={idx} onChange={updateRow} onRemove={removeRow} />
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-primary-50">
              <tr>
                <td colSpan={5} className="px-4 py-2 text-sm font-bold text-primary-700 text-right">Total:</td>
                <td className="px-2 py-2 text-sm font-bold text-primary-700 text-right">{calcTotal()}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export default function ProposalTab({ projectId, project }) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Page toggles
  const [includeMetalRoof, setIncludeMetalRoof] = useState(false)
  const [includeWallPanels, setIncludeWallPanels] = useState(false)
  const [includeAwnings, setIncludeAwnings] = useState(false)

  // Prepared for
  const [preparedFor, setPreparedFor] = useState({
    company: '', contact_name: '', contact_email: '', contact_phone: ''
  })

  // Description fields
  const [roofingDescription, setRoofingDescription] = useState('')
  const [metalRoofDescription, setMetalRoofDescription] = useState('')
  const [wallPanelDescription, setWallPanelDescription] = useState('')
  const [awningDescription, setAwningDescription] = useState('')

  // Line items per section
  const [roofingItems, setRoofingItems] = useState([])
  const [metalRoofItems, setMetalRoofItems] = useState([])
  const [wallPanelItems, setWallPanelItems] = useState([])
  const [awningItems, setAwningItems] = useState([])

  // Load defaults from estimate data
  useEffect(() => {
    loadDefaults()
  }, [projectId])

  const loadDefaults = async () => {
    setLoading(true)
    try {
      const res = await proposalAPI.defaults(projectId)
      const d = res.data
      if (d.prepared_for) setPreparedFor(d.prepared_for)
      if (d.roofing_system_description) setRoofingDescription(d.roofing_system_description)
      if (d.roofing_items?.length) setRoofingItems(d.roofing_items)
    } catch (err) {
      // No defaults yet, that's fine
    } finally {
      setLoading(false)
    }
  }

  const calcSectionTotal = (items) => {
    const sum = items.reduce((s, it) => {
      const t = parseFloat(String(it.total).replace(/[$,]/g, '')) || 0
      return s + t
    }, 0)
    return sum > 0 ? `$${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        prepared_for: preparedFor,
        roofing_system_description: roofingDescription,
        roofing_items: roofingItems.filter(i => i.description),
        roofing_total: calcSectionTotal(roofingItems),
        include_metal_roof: includeMetalRoof,
        include_wall_panels: includeWallPanels,
        include_awnings: includeAwnings,
      }

      if (includeMetalRoof) {
        payload.metal_roof_description = metalRoofDescription
        payload.metal_roof_items = metalRoofItems.filter(i => i.description)
        payload.metal_roof_total = calcSectionTotal(metalRoofItems)
      }
      if (includeWallPanels) {
        payload.wall_panel_description = wallPanelDescription
        payload.wall_panel_items = wallPanelItems.filter(i => i.description)
        payload.wall_panel_total = calcSectionTotal(wallPanelItems)
      }
      if (includeAwnings) {
        payload.awning_description = awningDescription
        payload.awning_items = awningItems.filter(i => i.description)
        payload.awning_total = calcSectionTotal(awningItems)
      }

      // Calculate grand total
      const allTotals = [roofingItems, metalRoofItems, wallPanelItems, awningItems]
      const grandSum = allTotals.flat().reduce((s, it) => {
        const t = parseFloat(String(it.total).replace(/[$,]/g, '')) || 0
        return s + t
      }, 0)
      if (grandSum > 0) {
        payload.grand_total = `$${grandSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      }

      const res = await proposalAPI.generate(projectId, payload)

      // Download the PDF
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Proposal_${project?.project_name || 'Project'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setSuccess('Proposal PDF generated and downloaded!')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate proposal. Please check your inputs.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Proposal Generator</h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {generating ? 'Generating PDF...' : 'Generate Proposal PDF'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Page Toggles */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Proposal Pages</h3>
        <p className="text-xs text-gray-500 mb-3">Page 1 (Roofing System) and Page 5 (About) are always included.</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={includeMetalRoof} onChange={e => setIncludeMetalRoof(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Page 2: Metal Roofing</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={includeWallPanels} onChange={e => setIncludeWallPanels(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Page 3: Wall Panels / Metals</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" checked={includeAwnings} onChange={e => setIncludeAwnings(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Page 4: Awnings / Canopies</span>
          </label>
        </div>
      </div>

      {/* Prepared For */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Prepared For</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
            <input type="text" value={preparedFor.company}
              onChange={e => setPreparedFor({ ...preparedFor, company: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Client company name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name</label>
            <input type="text" value={preparedFor.contact_name}
              onChange={e => setPreparedFor({ ...preparedFor, contact_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Contact person" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={preparedFor.contact_email}
              onChange={e => setPreparedFor({ ...preparedFor, contact_email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input type="tel" value={preparedFor.contact_phone}
              onChange={e => setPreparedFor({ ...preparedFor, contact_phone: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="(555) 123-4567" />
          </div>
        </div>
      </div>

      {/* Page 1: Roofing System (always shown) */}
      <div className="space-y-3">
        <h3 className="text-md font-semibold text-gray-800 flex items-center">
          <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-0.5 rounded mr-2">Page 1</span>
          Roofing System
        </h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">System Description</label>
          <textarea value={roofingDescription} onChange={e => setRoofingDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
            placeholder="e.g., Remove existing roof system and install new 60-mil TPO membrane..." />
        </div>
        <LineItemTable title="Roofing Line Items" items={roofingItems} setItems={setRoofingItems} />
      </div>

      {/* Page 2: Metal Roofing (conditional) */}
      {includeMetalRoof && (
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mr-2">Page 2</span>
            Metal Roofing System
          </h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={metalRoofDescription} onChange={e => setMetalRoofDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
              placeholder="Standing seam metal roofing system details..." />
          </div>
          <LineItemTable title="Metal Roofing Line Items" items={metalRoofItems} setItems={setMetalRoofItems} />
        </div>
      )}

      {/* Page 3: Wall Panels (conditional) */}
      {includeWallPanels && (
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-gray-800 flex items-center">
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded mr-2">Page 3</span>
            Wall Panels &amp; Architectural Metals
          </h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={wallPanelDescription} onChange={e => setWallPanelDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
              placeholder="Wall panel system, column wraps, architectural metals..." />
          </div>
          <LineItemTable title="Wall Panel Line Items" items={wallPanelItems} setItems={setWallPanelItems} />
        </div>
      )}

      {/* Page 4: Awnings (conditional) */}
      {includeAwnings && (
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-gray-800 flex items-center">
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded mr-2">Page 4</span>
            Awnings &amp; Canopies
          </h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={awningDescription} onChange={e => setAwningDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
              placeholder="Awning and canopy system details..." />
          </div>
          <LineItemTable title="Awning Line Items" items={awningItems} setItems={setAwningItems} />
        </div>
      )}
    </div>
  )
}
