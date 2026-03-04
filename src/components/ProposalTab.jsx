import { useState, useEffect, useCallback } from 'react'
import { proposalAPI, estimateAPI, customerAPI, savedProposalAPI, proposalTypeAPI } from '../api'
import { LoadingSpinner } from './common'
import Modal from './Modal'

const defaultLineItem = { item: '', description: '', qty: '', unit: 'SF', unit_price: '', total: '' }

function LineItemRow({ item, index, onChange, onRemove }) {
  const handleField = (field, value) => {
    const updated = { ...item, [field]: value }
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

// ============================================================================
// CUSTOMER SELECTOR WITH INLINE ADD
// ============================================================================
function CustomerSelector({ selectedId, onSelect, customers, onRefreshCustomers }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    company_name: '', contact_name: '', contact_email: '', contact_phone: ''
  })
  const [saving, setSaving] = useState(false)

  const handleAddCustomer = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await customerAPI.create(newCustomer)
      onRefreshCustomers()
      onSelect(res.data.id)
      setShowAddForm(false)
      setNewCustomer({ company_name: '', contact_name: '', contact_email: '', contact_phone: '' })
    } catch (err) {
      alert('Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Select Customer</label>
          <select
            value={selectedId || ''}
            onChange={e => onSelect(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">-- Select a customer or enter manually --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.company_name}{c.contact_name ? ` (${c.contact_name})` : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Customer
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCustomer} className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input required placeholder="Company name *" value={newCustomer.company_name}
              onChange={e => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
            <input placeholder="Contact name" value={newCustomer.contact_name}
              onChange={e => setNewCustomer({ ...newCustomer, contact_name: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
            <input type="email" placeholder="Email" value={newCustomer.contact_email}
              onChange={e => setNewCustomer({ ...newCustomer, contact_email: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
            <input type="tel" placeholder="Phone" value={newCustomer.contact_phone}
              onChange={e => setNewCustomer({ ...newCustomer, contact_phone: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ============================================================================
// BATCH PROPOSAL MODAL
// ============================================================================
function BatchProposalModal({ isOpen, onClose, customers, projectId, proposalData, calcSectionTotal, roofingItems, metalRoofItems, wallPanelItems, awningItems }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState(null)

  const toggleCustomer = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleGenerate = async () => {
    if (selectedIds.length === 0) return
    setGenerating(true)
    setResults(null)
    try {
      const res = await savedProposalAPI.batchGenerate(projectId, {
        customer_ids: selectedIds,
        proposal_data: proposalData,
      })
      setResults(res.data.proposals)
    } catch (err) {
      alert('Batch generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const downloadPdf = async (proposalId, customerName) => {
    try {
      const res = await savedProposalAPI.generatePdf(proposalId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Proposal_${customerName.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download PDF')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate for Multiple Customers">
      <div className="space-y-4">
        {!results ? (
          <>
            <p className="text-sm text-gray-600">
              Select the customers you'd like to send this proposal to. A separate proposal will be created for each.
            </p>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {customers.map(c => (
                <label key={c.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleCustomer(c.id)}
                    className="rounded border-gray-300 text-primary-600 mr-3"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{c.company_name}</span>
                    {c.contact_name && (
                      <span className="text-xs text-gray-500 ml-2">{c.contact_name}</span>
                    )}
                  </div>
                </label>
              ))}
              {customers.length === 0 && (
                <p className="text-sm text-gray-500 p-3">No customers in database yet. Add customers first.</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || selectedIds.length === 0}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {generating ? 'Creating...' : `Create ${selectedIds.length} Proposal${selectedIds.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-green-700 font-medium">
              {results.filter(r => !r.error).length} proposal(s) created successfully.
            </p>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${r.error ? 'bg-red-50' : 'bg-green-50'}`}>
                  <div>
                    <span className="text-sm font-medium">{r.customer_company || `Customer #${r.customer_id}`}</span>
                    {r.error && <span className="text-xs text-red-600 ml-2">{r.error}</span>}
                  </div>
                  {!r.error && (
                    <button
                      onClick={() => downloadPdf(r.proposal_id, r.customer_company)}
                      className="text-xs bg-white border border-green-300 text-green-700 px-3 py-1 rounded hover:bg-green-100"
                    >
                      Download PDF
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ============================================================================
// SAVED PROPOSALS LIST
// ============================================================================
function SavedProposalsList({ projectId, onLoad }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProposals = useCallback(async () => {
    try {
      const res = await savedProposalAPI.list(projectId)
      setProposals(res.data || [])
    } catch (err) {
      // No saved proposals yet
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this saved proposal?')) return
    try {
      await savedProposalAPI.delete(id)
      fetchProposals()
    } catch (err) {
      alert('Failed to delete')
    }
  }

  const handleDownload = async (id, name) => {
    try {
      const res = await savedProposalAPI.generatePdf(id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${name || 'Proposal'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to generate PDF')
    }
  }

  if (loading) return null
  if (proposals.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Saved Proposals</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {proposals.map(p => (
          <div key={p.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
            <div>
              <span className="text-sm font-medium text-gray-900">{p.proposal_name}</span>
              {p.customer_company && (
                <span className="text-xs text-gray-500 ml-2">({p.customer_company})</span>
              )}
              <div className="flex gap-2 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  p.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  p.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  p.status === 'declined' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {p.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(p.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onLoad(p.id)}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                Edit
              </button>
              <button onClick={() => handleDownload(p.id, p.proposal_name)}
                className="text-xs text-green-600 hover:text-green-800 font-medium">
                PDF
              </button>
              <button onClick={() => handleDelete(p.id)}
                className="text-xs text-red-500 hover:text-red-700">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PROPOSAL TAB
// ============================================================================
export default function ProposalTab({ projectId, project }) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentProposalId, setCurrentProposalId] = useState(null)

  // Proposal type
  const [proposalType, setProposalType] = useState('reroof')
  const [proposalTypes, setProposalTypes] = useState({})
  const [showSignatureBlock, setShowSignatureBlock] = useState(true)
  const [showPreparedFor, setShowPreparedFor] = useState(true)

  // Customers
  const [customers, setCustomers] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)

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

  // Terms, exclusions, notes
  const [terms, setTerms] = useState([])
  const [exclusions, setExclusions] = useState([])
  const [notes, setNotes] = useState([])

  // Batch modal
  const [showBatchModal, setShowBatchModal] = useState(false)

  // Saved proposals refresh key
  const [savedKey, setSavedKey] = useState(0)

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await customerAPI.list()
      setCustomers(res.data || [])
    } catch (err) {
      // Customers endpoint may not exist yet
    }
  }, [])

  const fetchProposalTypes = useCallback(async () => {
    try {
      const res = await proposalTypeAPI.list()
      setProposalTypes(res.data || {})
    } catch (err) {
      // Fallback if endpoint doesn't exist yet
    }
  }, [])

  // Apply presets when proposal type changes
  const applyTypePreset = useCallback((typeKey) => {
    const preset = proposalTypes[typeKey]
    if (!preset) return

    setShowSignatureBlock(preset.show_signature_block)
    setShowPreparedFor(preset.show_prepared_for)
    setIncludeMetalRoof(preset.default_pages?.include_metal_roof || false)
    setIncludeWallPanels(preset.default_pages?.include_wall_panels || false)
    setIncludeAwnings(preset.default_pages?.include_awnings || false)
    setTerms(preset.default_terms || [])
    setExclusions(preset.default_exclusions || [])
    setNotes(preset.default_notes || [])
  }, [proposalTypes])

  useEffect(() => {
    fetchCustomers()
    fetchProposalTypes()
    loadDefaults()
  }, [projectId])

  // When a customer is selected, auto-fill the "Prepared For" fields
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId)
      if (customer) {
        setPreparedFor({
          company: customer.company_name || '',
          contact_name: customer.contact_name || '',
          contact_email: customer.contact_email || '',
          contact_phone: customer.contact_phone || '',
        })
      }
    }
  }, [selectedCustomerId, customers])

  const loadDefaults = async () => {
    setLoading(true)
    try {
      const res = await proposalAPI.defaults(projectId)
      const d = res.data
      if (d.prepared_for) setPreparedFor(d.prepared_for)
      if (d.roofing_system_description) setRoofingDescription(d.roofing_system_description)
      if (d.roofing_items?.length) setRoofingItems(d.roofing_items)
    } catch (err) {
      // No defaults yet
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

  const buildPayload = () => {
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

    // Grand total
    const allTotals = [roofingItems, metalRoofItems, wallPanelItems, awningItems]
    const grandSum = allTotals.flat().reduce((s, it) => {
      const t = parseFloat(String(it.total).replace(/[$,]/g, '')) || 0
      return s + t
    }, 0)
    if (grandSum > 0) {
      payload.grand_total = `$${grandSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    }

    // Proposal type & layout
    payload.proposal_type = proposalType
    payload.show_signature_block = showSignatureBlock
    payload.show_prepared_for = showPreparedFor
    payload.terms = terms
    payload.exclusions = exclusions
    payload.notes = notes

    return payload
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      const payload = buildPayload()
      const res = await proposalAPI.generate(projectId, payload)

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

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = buildPayload()
      const saveData = {
        proposal_name: `Proposal - ${preparedFor.company || project?.project_name || 'Draft'}`,
        customer_id: selectedCustomerId,
        proposal_data: payload,
      }

      if (currentProposalId) {
        await savedProposalAPI.update(currentProposalId, saveData)
        setSuccess('Proposal updated!')
      } else {
        const res = await savedProposalAPI.save(projectId, saveData)
        setCurrentProposalId(res.data.id)
        setSuccess('Proposal saved!')
      }
      setSavedKey(k => k + 1)
    } catch (err) {
      setError('Failed to save proposal')
    } finally {
      setSaving(false)
    }
  }

  const handleLoadSaved = async (proposalId) => {
    setLoading(true)
    setError('')
    try {
      const res = await savedProposalAPI.get(proposalId)
      const d = res.data.proposal_data
      setCurrentProposalId(proposalId)
      setSelectedCustomerId(res.data.customer_id)

      if (d.prepared_for) setPreparedFor(d.prepared_for)
      setRoofingDescription(d.roofing_system_description || '')
      setRoofingItems(d.roofing_items || [])
      setIncludeMetalRoof(d.include_metal_roof || false)
      setIncludeWallPanels(d.include_wall_panels || false)
      setIncludeAwnings(d.include_awnings || false)
      setMetalRoofDescription(d.metal_roof_description || '')
      setMetalRoofItems(d.metal_roof_items || [])
      setWallPanelDescription(d.wall_panel_description || '')
      setWallPanelItems(d.wall_panel_items || [])
      setAwningDescription(d.awning_description || '')
      setAwningItems(d.awning_items || [])

      // Proposal type settings
      if (d.proposal_type) setProposalType(d.proposal_type)
      if (d.show_signature_block !== undefined) setShowSignatureBlock(d.show_signature_block)
      if (d.show_prepared_for !== undefined) setShowPreparedFor(d.show_prepared_for)
      if (d.terms) setTerms(d.terms)
      if (d.exclusions) setExclusions(d.exclusions)
      if (d.notes) setNotes(d.notes)

      setSuccess('Proposal loaded!')
    } catch (err) {
      setError('Failed to load proposal')
    } finally {
      setLoading(false)
    }
  }

  const handleNewProposal = () => {
    setCurrentProposalId(null)
    setSelectedCustomerId(null)
    setPreparedFor({ company: '', contact_name: '', contact_email: '', contact_phone: '' })
    setRoofingDescription('')
    setRoofingItems([])
    setIncludeMetalRoof(false)
    setIncludeWallPanels(false)
    setIncludeAwnings(false)
    setMetalRoofDescription('')
    setMetalRoofItems([])
    setWallPanelDescription('')
    setWallPanelItems([])
    setAwningDescription('')
    setAwningItems([])
    setProposalType('reroof')
    setShowSignatureBlock(true)
    setShowPreparedFor(true)
    setTerms([])
    setExclusions([])
    setNotes([])
    setError('')
    setSuccess('')
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Proposal Generator</h2>
          {currentProposalId && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              Editing saved proposal
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {currentProposalId && (
            <button onClick={handleNewProposal}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
              + New Proposal
            </button>
          )}
          <button
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Multi-Customer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {saving ? 'Saving...' : currentProposalId ? 'Update' : 'Save Draft'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {generating ? 'Generating PDF...' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Saved Proposals */}
      <SavedProposalsList key={savedKey} projectId={projectId} onLoad={handleLoadSaved} />

      {/* Proposal Type Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Proposal Type</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(proposalTypes).length > 0 ? (
            Object.entries(proposalTypes).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => { setProposalType(key); applyTypePreset(key) }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  proposalType === key
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                }`}
              >
                <div>{preset.label}</div>
                <div className={`text-xs mt-0.5 ${proposalType === key ? 'text-primary-200' : 'text-gray-400'}`}>
                  {preset.description}
                </div>
              </button>
            ))
          ) : (
            // Fallback if API not ready
            <>
              {[
                { key: 'gc', label: 'GC / New Construction', desc: 'Bid submission for general contractors' },
                { key: 'tenant_finish_out', label: 'Tenant Finish Out', desc: 'Bid for TI / finish-out work' },
                { key: 'reroof', label: 'Re-Roof', desc: 'Full proposal with signature block' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setProposalType(t.key)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    proposalType === t.key
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                  }`}
                >
                  <div>{t.label}</div>
                  <div className={`text-xs mt-0.5 ${proposalType === t.key ? 'text-primary-200' : 'text-gray-400'}`}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
        {proposalType && proposalTypes[proposalType] && (
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span>{showSignatureBlock ? 'Signature block included' : 'No signature block (bid submission)'}</span>
            <span>|</span>
            <span>{terms.length} terms</span>
            <span>|</span>
            <span>{exclusions.length} exclusions</span>
          </div>
        )}
      </div>

      {/* Page Toggles */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Proposal Pages</h3>
        <p className="text-xs text-gray-500 mb-3">Page 1 (Roofing System) and About page are always included.</p>
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

      {/* Customer Selection + Prepared For */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Prepared For</h3>

        <CustomerSelector
          selectedId={selectedCustomerId}
          onSelect={setSelectedCustomerId}
          customers={customers}
          onRefreshCustomers={fetchCustomers}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
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

      {/* Page 1: Roofing System */}
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

      {/* Page 2: Metal Roofing */}
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

      {/* Page 3: Wall Panels */}
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

      {/* Page 4: Awnings */}
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

      {/* Terms, Exclusions, Notes — always visible, editable */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Terms, Exclusions &amp; Notes
          <span className="text-xs font-normal text-gray-400 ml-2">
            (defaults from {proposalTypes[proposalType]?.label || proposalType} template — editable per proposal)
          </span>
        </h3>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Exclusions {exclusions.length > 0 && `(${exclusions.length})`}
          </label>
          <textarea
            value={exclusions.join('\n')}
            onChange={e => setExclusions(e.target.value.split('\n').filter(l => l.trim()))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={Math.max(Math.min(exclusions.length + 1, 8), 3)}
            placeholder="One exclusion per line..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Notes {notes.length > 0 && `(${notes.length})`}
          </label>
          <textarea
            value={notes.join('\n')}
            onChange={e => setNotes(e.target.value.split('\n').filter(l => l.trim()))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={Math.max(Math.min(notes.length + 1, 6), 3)}
            placeholder="One note per line..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Terms &amp; Conditions {terms.length > 0 && `(${terms.length})`}
          </label>
          <textarea
            value={terms.join('\n')}
            onChange={e => setTerms(e.target.value.split('\n').filter(l => l.trim()))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={Math.max(Math.min(terms.length + 1, 10), 3)}
            placeholder="One term per line..."
          />
        </div>
      </div>

      {/* Batch Modal */}
      <BatchProposalModal
        isOpen={showBatchModal}
        onClose={() => { setShowBatchModal(false); setSavedKey(k => k + 1) }}
        customers={customers}
        projectId={projectId}
        proposalData={buildPayload()}
        calcSectionTotal={calcSectionTotal}
        roofingItems={roofingItems}
        metalRoofItems={metalRoofItems}
        wallPanelItems={wallPanelItems}
        awningItems={awningItems}
      />
    </div>
  )
}
