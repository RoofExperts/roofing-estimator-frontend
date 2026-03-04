import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { estimateAPI } from '../api'
import { LoadingSpinner } from './common'

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0)
const fmtNum = (v) => v != null ? Number(v).toLocaleString() : '—'


// ============================================================================
// QUANTITY SUMMARY — Shows total estimated qty per item across all groups
// ============================================================================
function QuantitySummary({ takeoff }) {
  // Aggregate quantities by base description across all material groups
  const aggregated = useMemo(() => {
    if (!takeoff) return []
    const map = {}
    const allGroups = [
      ...(takeoff.flat_materials || []),
      ...(takeoff.metals || []),
      ...(takeoff.labor || []),
    ]
    allGroups.forEach(group => {
      (group.items || []).forEach(item => {
        if (!item.qty || item.qty <= 0) return
        const key = `${item.description}||${item.unit}`
        if (!map[key]) {
          map[key] = { description: item.description, unit: item.unit, totalQty: 0 }
        }
        map[key].totalQty += item.qty
      })
    })
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty)
  }, [takeoff])

  if (aggregated.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-200">
        <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider">Total Estimated Quantities</h4>
      </div>
      <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {aggregated.map((item, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-1.5 text-sm hover:bg-gray-50">
            <span className="text-gray-700">{item.description}</span>
            <span className="font-mono font-semibold text-gray-900 ml-4 whitespace-nowrap">
              {fmtNum(Math.ceil(item.totalQty))} {item.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}


// ============================================================================
// ADD ITEM MODAL
// ============================================================================
function AddItemModal({ onAdd, onClose, groups }) {
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('EA')
  const [unitCost, setUnitCost] = useState('')
  const [targetGroup, setTargetGroup] = useState(0)
  const [inStock, setInStock] = useState(false)

  const [wastePct, setWastePct] = useState(0)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!description.trim()) return
    const q = parseFloat(qty) || 0
    const uc = parseFloat(unitCost) || 0
    const wp = parseFloat(wastePct) || 0
    onAdd(targetGroup, {
      description: description.trim(),
      qty: q,
      unit,
      unit_cost: uc,
      waste_pct: wp,
      extended: q * (1 + wp / 100) * uc,
      in_stock: inStock,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Line Item</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select value={targetGroup} onChange={e => setTargetGroup(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              {groups.map((g, i) => (
                <option key={i} value={i}>{g.category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g., 6&quot; #14 HD Screws"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              autoFocus required />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} step="0.01" min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                {['EA', 'SQ', 'SF', 'LF', 'ROLL', 'PAIL', 'TUBE', 'BAG', 'BDL', 'CTN', 'GAL', 'HR', 'DAY', 'LS', 'SET'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Waste %</label>
              <input type="number" value={wastePct} onChange={e => setWastePct(e.target.value)} step="1" min="0" max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost</label>
              <input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} step="0.01" min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
            <span className="text-sm text-gray-700">In warehouse stock</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ============================================================================
// MATERIAL TABLE
// ============================================================================
function MaterialTable({ groups, pageTotal, pageTotalLabel, onEdit, onDelete, onAdd, onToggleStock, tabKey, showAddModal, setShowAddModal }) {
  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-2 py-2.5 text-center text-xs font-semibold text-gray-600 w-10">
                <span title="Warehouse Stock">WH</span>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 w-10">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">Description</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 w-20">Qty</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 w-16">Unit</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 w-16">
                <span title="Waste Percentage">Waste%</span>
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 w-28">Unit Cost</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 w-28">Extended</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold text-gray-600 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) => (
              <GroupRows key={gi} group={group} groupIndex={gi} onEdit={onEdit} onDelete={onDelete}
                onToggleStock={onToggleStock} tabKey={tabKey} />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300">
              <td colSpan={7} className="px-4 py-3 text-sm font-bold text-gray-700 text-right">
                {pageTotalLabel || 'PAGE TOTAL:'}
              </td>
              <td className="px-3 py-3 text-sm font-bold text-gray-900 text-right">{fmt(pageTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add item button */}
      <div className="mt-2 flex justify-start">
        <button onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Line Item
        </button>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          groups={groups}
          onAdd={(groupIndex, item) => onAdd(tabKey, groupIndex, item)}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}


function GroupRows({ group, groupIndex, onEdit, onDelete, onToggleStock, tabKey }) {
  if (!group.items || group.items.length === 0) return null

  const handleQtyChange = (itemIndex, value) => {
    onEdit(tabKey, groupIndex, itemIndex, 'qty', parseFloat(value) || 0)
  }
  const handleUnitCostChange = (itemIndex, value) => {
    onEdit(tabKey, groupIndex, itemIndex, 'unit_cost', parseFloat(value) || 0)
  }
  const handleWasteChange = (itemIndex, value) => {
    onEdit(tabKey, groupIndex, itemIndex, 'waste_pct', parseFloat(value) || 0)
  }

  return (
    <>
      {/* Category header row */}
      <tr className="bg-blue-50 border-t border-gray-200">
        <td colSpan={9} className="px-4 py-2 text-xs font-bold text-blue-800 uppercase tracking-wider">
          {group.category}
        </td>
      </tr>
      {/* Item rows */}
      {group.items.map((item, idx) => (
        <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${item.in_stock ? 'bg-green-50/40' : ''}`}>
          {/* Warehouse stock checkbox */}
          <td className="px-2 py-1.5 text-center">
            <input
              type="checkbox"
              checked={!!item.in_stock}
              onChange={() => onToggleStock(tabKey, groupIndex, idx)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
              title={item.in_stock ? 'In warehouse stock' : 'Not in stock'}
            />
          </td>
          <td className="px-3 py-1.5 text-sm text-gray-500 text-center">{item.line || idx + 1}</td>
          <td className="px-3 py-1.5 text-sm text-gray-900">
            {item.description}
            {item.in_stock && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                WH
              </span>
            )}
          </td>
          <td className="px-3 py-1.5 text-sm text-gray-700 text-right font-mono">
            <input
              type="number"
              value={typeof item.qty === 'number' ? item.qty : 0}
              onChange={(e) => handleQtyChange(idx, e.target.value)}
              className="w-16 px-1.5 py-1 text-right font-mono text-sm border border-gray-300 rounded bg-yellow-50 focus:bg-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              step="0.01"
            />
          </td>
          <td className="px-3 py-1.5 text-sm text-gray-500">{item.unit}</td>
          <td className="px-3 py-1.5 text-sm text-gray-700 text-right font-mono">
            <input
              type="number"
              value={item.waste_pct || 0}
              onChange={(e) => handleWasteChange(idx, e.target.value)}
              className="w-14 px-1.5 py-1 text-right font-mono text-sm border border-gray-300 rounded bg-orange-50 focus:bg-orange-100 focus:outline-none focus:ring-1 focus:ring-orange-400"
              step="1" min="0" max="100"
            />
          </td>
          <td className="px-3 py-1.5 text-sm text-gray-700 text-right font-mono">
            <input
              type="number"
              value={item.unit_cost || 0}
              onChange={(e) => handleUnitCostChange(idx, e.target.value)}
              className="w-24 px-1.5 py-1 text-right font-mono text-sm border border-gray-300 rounded bg-yellow-50 focus:bg-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              step="0.01" min="0"
            />
          </td>
          <td className="px-3 py-1.5 text-sm font-medium text-gray-900 text-right font-mono">
            {fmt(item.extended || 0)}
          </td>
          {/* Delete button */}
          <td className="px-2 py-1.5 text-center">
            <button
              onClick={() => onDelete(tabKey, groupIndex, idx)}
              className="text-gray-300 hover:text-red-500 transition-colors"
              title="Remove line item"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </td>
        </tr>
      ))}
      <tr><td colSpan={9} className="h-1"></td></tr>
    </>
  )
}


// ============================================================================
// PROJECT SUMMARY TAB
// ============================================================================
function ProjectSummaryTab({ summary }) {
  if (!summary) return null
  const cs = summary.cost_summary || {}

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
          PROJECT SUMMARY — ROOFING ESTIMATE
        </h3>
        <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
          <span className="text-gray-500 font-medium">PROJECT:</span>
          <span className="text-gray-900 font-semibold">{summary.project_name}</span>
          <span className="text-gray-500 font-medium">ADDRESS:</span>
          <span className="text-gray-900">{summary.address || '—'}</span>
          <span className="text-gray-500 font-medium">DATE:</span>
          <span className="text-gray-900">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Roof System Specifications</h4>
        <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
          <span className="text-gray-500">System Type:</span>
          <span className="text-gray-900 font-medium">{summary.system_description}</span>
          <span className="text-gray-500">Manufacturer:</span>
          <span className="text-gray-900">{summary.manufacturer}</span>
          <span className="text-gray-500">Membrane:</span>
          <span className="text-gray-900">{summary.membrane}</span>
          <span className="text-gray-500">Insulation:</span>
          <span className="text-gray-900">{summary.insulation || '—'}</span>
          {summary.cover_board && (
            <>
              <span className="text-gray-500">Cover Board:</span>
              <span className="text-gray-900">{summary.cover_board}</span>
            </>
          )}
          <span className="text-gray-500">Warranty:</span>
          <span className="text-gray-900">{summary.warranty}</span>
          <span className="text-gray-500">Roof Area:</span>
          <span className="text-gray-900 font-medium">{fmtNum(summary.roof_area_sf)} SF ({summary.roof_area_sq} SQ)</span>
          <span className="text-gray-500">Perimeter:</span>
          <span className="text-gray-900">{fmtNum(summary.perimeter_lf)} LF</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Cost Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Flat Roof Materials (Page 2):</span>
            <span className="font-mono text-gray-900">{fmt(cs.flat_materials)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Roof Related Metals (Page 3):</span>
            <span className="font-mono text-gray-900">{fmt(cs.metals)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Labor & General Conditions (Page 4):</span>
            <span className="font-mono text-gray-900">{fmt(cs.labor)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Warranty:</span>
            <span className="font-mono text-gray-900">{fmt(cs.warranty)}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-gray-200 font-semibold">
            <span className="text-gray-700">SUBTOTAL:</span>
            <span className="font-mono text-gray-900">{fmt(cs.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Profit Markup ({((cs.markup_pct || 0.25) * 100).toFixed(0)}%):</span>
            <span className="font-mono text-gray-900">{fmt(cs.markup)}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-gray-200 font-semibold">
            <span className="text-gray-700">SUBTOTAL WITH MARKUP:</span>
            <span className="font-mono text-gray-900">{fmt(cs.subtotal_with_markup)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Sales Tax ({((cs.tax_pct || 0.0825) * 100).toFixed(2)}%):</span>
            <span className="font-mono text-gray-900">{fmt(cs.tax)}</span>
          </div>
          <div className="flex justify-between py-3 border-t-2 border-gray-300 mt-2">
            <span className="text-lg font-bold text-gray-900">GRAND TOTAL:</span>
            <span className="text-lg font-bold text-blue-700 font-mono">{fmt(cs.grand_total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}


// ============================================================================
// PRINT MATERIAL LIST
// ============================================================================
function printMaterialList(takeoff) {
  if (!takeoff) return

  const summary = takeoff.summary || {}
  const allSections = [
    { title: 'FLAT ROOF MATERIALS', groups: takeoff.flat_materials || [], total: takeoff.flat_materials_total },
    { title: 'ROOF RELATED METALS', groups: takeoff.metals || [], total: takeoff.metals_total },
    { title: 'LABOR & GENERAL CONDITIONS', groups: takeoff.labor || [], total: takeoff.labor_total },
  ]

  // Build aggregate quantities
  const qtyMap = {}
  allSections.forEach(s => {
    s.groups.forEach(g => {
      (g.items || []).forEach(item => {
        if (!item.qty || item.qty <= 0) return
        const key = `${item.description}||${item.unit}`
        if (!qtyMap[key]) qtyMap[key] = { description: item.description, unit: item.unit, totalQty: 0, inStock: false }
        qtyMap[key].totalQty += item.qty
        if (item.in_stock) qtyMap[key].inStock = true
      })
    })
  })
  const aggregated = Object.values(qtyMap).sort((a, b) => a.description.localeCompare(b.description))

  let html = `<!DOCTYPE html><html><head><title>Material List - ${summary.project_name || 'Project'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
  h1 { font-size: 16px; text-align: center; margin-bottom: 2px; }
  .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 16px; }
  h2 { font-size: 13px; background: #e8edf3; padding: 5px 8px; margin: 12px 0 4px; border-left: 3px solid #2563eb; }
  h3 { font-size: 11px; color: #2563eb; padding: 3px 8px; background: #f0f5ff; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th { text-align: left; font-size: 9px; color: #666; text-transform: uppercase; padding: 3px 6px; border-bottom: 1px solid #ccc; }
  th.r { text-align: right; }
  td { padding: 3px 6px; border-bottom: 1px solid #eee; font-size: 11px; }
  td.r { text-align: right; font-family: 'Courier New', monospace; }
  td.c { text-align: center; }
  tr.stock td { background: #f0fdf4; }
  .stock-badge { display: inline-block; background: #dcfce7; color: #166534; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; }
  .total-row td { font-weight: bold; border-top: 2px solid #333; padding-top: 6px; }
  .section-total td { font-weight: bold; border-top: 1px solid #999; background: #f5f5f5; }
  .grand-total td { font-size: 13px; font-weight: bold; border-top: 3px double #333; padding: 8px 6px; }
  .qty-summary { margin-top: 20px; page-break-before: always; }
  .qty-summary h2 { background: #f3e8ff; border-left-color: #7c3aed; }
  @media print {
    body { padding: 10px; }
    .no-print { display: none !important; }
    @page { margin: 0.5in; size: letter; }
  }
</style></head><body>`

  html += `<h1>MATERIAL LIST</h1>`
  html += `<div class="subtitle">${summary.project_name || ''} — ${summary.address || ''} — ${new Date().toLocaleDateString()}</div>`

  // Print button
  html += `<div class="no-print" style="text-align:center;margin-bottom:16px">
    <button onclick="window.print()" style="padding:8px 24px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer">Print / Save PDF</button>
    <button onclick="window.close()" style="padding:8px 16px;margin-left:8px;background:#eee;border:1px solid #ccc;border-radius:6px;font-size:13px;cursor:pointer">Close</button>
  </div>`

  // Detail sections
  allSections.forEach(section => {
    if (section.groups.length === 0) return
    html += `<h2>${section.title}</h2>`

    section.groups.forEach(group => {
      if (!group.items || group.items.length === 0) return
      html += `<h3>${group.category}</h3>`
      html += `<table><thead><tr><th style="width:30px">#</th><th>Description</th><th class="r" style="width:60px">Qty</th><th style="width:40px">Unit</th><th class="r" style="width:50px">Waste%</th><th class="r" style="width:80px">Unit Cost</th><th class="r" style="width:80px">Extended</th><th style="width:30px">WH</th></tr></thead><tbody>`

      group.items.forEach((item, i) => {
        const cls = item.in_stock ? ' class="stock"' : ''
        html += `<tr${cls}>
          <td class="c">${item.line || i + 1}</td>
          <td>${item.description}</td>
          <td class="r">${fmtNum(item.qty)}</td>
          <td>${item.unit}</td>
          <td class="r">${item.waste_pct ? item.waste_pct + '%' : '—'}</td>
          <td class="r">${fmt(item.unit_cost)}</td>
          <td class="r">${fmt(item.extended)}</td>
          <td class="c">${item.in_stock ? '<span class="stock-badge">WH</span>' : ''}</td>
        </tr>`
      })
      html += `</tbody></table>`
    })

    html += `<table><tbody><tr class="section-total"><td colspan="6" style="text-align:right">${section.title} TOTAL:</td><td class="r">${fmt(section.total)}</td><td></td></tr></tbody></table>`
  })

  // Grand total
  const cs = summary.cost_summary || {}
  html += `<table style="margin-top:12px"><tbody>
    <tr><td colspan="6" style="text-align:right">Subtotal:</td><td class="r">${fmt(cs.subtotal)}</td><td></td></tr>
    <tr><td colspan="6" style="text-align:right">Markup (${((cs.markup_pct || 0.25) * 100).toFixed(0)}%):</td><td class="r">${fmt(cs.markup)}</td><td></td></tr>
    <tr><td colspan="6" style="text-align:right">Tax (${((cs.tax_pct || 0.0825) * 100).toFixed(2)}%):</td><td class="r">${fmt(cs.tax)}</td><td></td></tr>
    <tr class="grand-total"><td colspan="6" style="text-align:right">GRAND TOTAL:</td><td class="r">${fmt(cs.grand_total)}</td><td></td></tr>
  </tbody></table>`

  // Quantity summary page
  html += `<div class="qty-summary"><h2>TOTAL ESTIMATED QUANTITIES</h2>
    <table><thead><tr><th>Material / Item</th><th class="r" style="width:80px">Total Qty</th><th style="width:40px">Unit</th><th style="width:30px">WH</th></tr></thead><tbody>`
  aggregated.forEach(item => {
    const cls = item.inStock ? ' class="stock"' : ''
    html += `<tr${cls}><td>${item.description}</td><td class="r">${fmtNum(Math.ceil(item.totalQty))}</td><td>${item.unit}</td><td class="c">${item.inStock ? '<span class="stock-badge">WH</span>' : ''}</td></tr>`
  })
  html += `</tbody></table></div>`

  html += `</body></html>`

  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
}


// ============================================================================
// RECAP TAB — Final cost summary with tax, overhead, profit
// ============================================================================
function RecapTab({ takeoff, onRecapChange }) {
  // Initialize recap from takeoff or defaults
  const recap = takeoff.recap || {}

  const defaultLines = () => {
    const materialsAmt = (takeoff.flat_materials_total || 0) + (takeoff.metals_total || 0)
    const laborAmt = takeoff.labor_total || 0
    return [
      { id: 'materials', label: 'Materials', amount: materialsAmt, taxable: true, editable: false },
      { id: 'labor', label: 'Labor', amount: laborAmt, taxable: false, editable: false },
      { id: 'subcontractors', label: 'Subcontractors', amount: recap.subcontractors_amount || 0, taxable: recap.subcontractors_taxable ?? false, editable: true },
      { id: 'equipment', label: 'Equipment', amount: recap.equipment_amount || 0, taxable: recap.equipment_taxable ?? false, editable: true },
    ]
  }

  // Merge stored recap values with computed totals
  const lines = useMemo(() => {
    const dl = defaultLines()
    // Override taxable flags from saved recap
    if (recap.lines) {
      recap.lines.forEach(saved => {
        const match = dl.find(l => l.id === saved.id)
        if (match) {
          match.taxable = saved.taxable
          if (match.editable) match.amount = saved.amount
        }
      })
    }
    return dl
  }, [takeoff])

  const taxMode = recap.tax_mode || 'per_line' // 'per_line' or 'project_total'
  const taxRate = recap.tax_rate ?? 8.25
  const overheadPct = recap.overhead_pct ?? 0
  const profitPct = recap.profit_pct ?? 0

  // Any additional recap line items the user has added
  const customLines = recap.custom_lines || []

  const allLines = [...lines, ...customLines]

  // Calculations
  const subtotal = allLines.reduce((s, l) => s + (l.amount || 0), 0)

  let taxableAmount = 0
  if (taxMode === 'per_line') {
    taxableAmount = allLines.filter(l => l.taxable).reduce((s, l) => s + (l.amount || 0), 0)
  } else {
    taxableAmount = subtotal
  }
  const salesTax = taxableAmount * (taxRate / 100)

  const subtotalWithTax = subtotal + salesTax
  const overheadAmount = subtotalWithTax * (overheadPct / 100)
  const profitAmount = (subtotalWithTax + overheadAmount) * (profitPct / 100)
  const grandTotal = subtotalWithTax + overheadAmount + profitAmount

  const emitChange = (updates) => {
    const newRecap = {
      ...recap,
      lines: (updates.lines || allLines).map(l => ({ id: l.id, label: l.label, amount: l.amount, taxable: l.taxable, editable: l.editable })),
      custom_lines: updates.custom_lines !== undefined ? updates.custom_lines : customLines,
      tax_mode: updates.tax_mode !== undefined ? updates.tax_mode : taxMode,
      tax_rate: updates.tax_rate !== undefined ? updates.tax_rate : taxRate,
      overhead_pct: updates.overhead_pct !== undefined ? updates.overhead_pct : overheadPct,
      profit_pct: updates.profit_pct !== undefined ? updates.profit_pct : profitPct,
      // Store computed totals for reference
      computed_subtotal: subtotal,
      computed_tax: salesTax,
      computed_overhead: overheadAmount,
      computed_profit: profitAmount,
      computed_grand_total: grandTotal,
    }
    onRecapChange(newRecap)
  }

  const handleTaxableToggle = (lineId) => {
    const updated = allLines.map(l => l.id === lineId ? { ...l, taxable: !l.taxable } : l)
    const stdLines = updated.filter(l => !l._custom)
    const custLines = updated.filter(l => l._custom)
    emitChange({ lines: stdLines, custom_lines: custLines })
  }

  const handleAmountChange = (lineId, value) => {
    const amt = parseFloat(value) || 0
    const isCustom = customLines.find(l => l.id === lineId)
    if (isCustom) {
      const updated = customLines.map(l => l.id === lineId ? { ...l, amount: amt } : l)
      emitChange({ custom_lines: updated })
    } else {
      // For editable standard lines, store in recap
      const newRecap = { ...recap }
      newRecap[`${lineId}_amount`] = amt
      const updated = allLines.map(l => l.id === lineId ? { ...l, amount: amt } : l)
      const stdLines = updated.filter(l => !l._custom)
      emitChange({ lines: stdLines })
    }
  }

  const handleAddCustomLine = () => {
    const id = `custom_${Date.now()}`
    const newLine = { id, label: 'New Item', amount: 0, taxable: false, editable: true, _custom: true }
    emitChange({ custom_lines: [...customLines, newLine] })
  }

  const handleDeleteCustomLine = (lineId) => {
    emitChange({ custom_lines: customLines.filter(l => l.id !== lineId) })
  }

  const handleCustomLabelChange = (lineId, label) => {
    const updated = customLines.map(l => l.id === lineId ? { ...l, label } : l)
    emitChange({ custom_lines: updated })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-base font-bold text-gray-800 uppercase">Project Recap</h3>

      {/* Tax Mode Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Sales Tax Method</h4>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => emitChange({ tax_mode: 'per_line' })}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                taxMode === 'per_line' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >Per Line Item</button>
            <button
              onClick={() => emitChange({ tax_mode: 'project_total' })}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                taxMode === 'project_total' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >Entire Project</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Tax Rate:</label>
          <input
            type="number"
            value={taxRate}
            onChange={e => emitChange({ tax_rate: parseFloat(e.target.value) || 0 })}
            className="w-20 px-2 py-1 text-sm font-mono border border-gray-300 rounded bg-yellow-50 focus:bg-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right"
            step="0.01" min="0" max="25"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
        {taxMode === 'per_line' && (
          <p className="text-xs text-gray-400 mt-2">Toggle the "Tax" checkbox on each line item to apply sales tax selectively.</p>
        )}
        {taxMode === 'project_total' && (
          <p className="text-xs text-gray-400 mt-2">Sales tax will be applied to the entire project subtotal regardless of individual line settings.</p>
        )}
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              {taxMode === 'per_line' && (
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 w-12">Tax</th>
              )}
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Description</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 w-40">Amount</th>
              {taxMode === 'per_line' && (
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 w-28">Tax Amount</th>
              )}
              <th className="px-2 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {/* Standard lines */}
            {lines.map(line => (
              <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                {taxMode === 'per_line' && (
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={line.taxable}
                      onChange={() => handleTaxableToggle(line.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-4 py-2 text-sm font-medium text-gray-900">{line.label}</td>
                <td className="px-4 py-2 text-right">
                  {line.editable ? (
                    <input
                      type="number"
                      value={line.amount}
                      onChange={e => handleAmountChange(line.id, e.target.value)}
                      className="w-32 px-2 py-1 text-right font-mono text-sm border border-gray-300 rounded bg-yellow-50 focus:bg-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      step="0.01" min="0"
                    />
                  ) : (
                    <span className="text-sm font-mono font-medium text-gray-900">{fmt(line.amount)}</span>
                  )}
                </td>
                {taxMode === 'per_line' && (
                  <td className="px-3 py-2 text-right text-sm font-mono text-gray-500">
                    {line.taxable ? fmt(line.amount * (taxRate / 100)) : '—'}
                  </td>
                )}
                <td></td>
              </tr>
            ))}

            {/* Custom lines */}
            {customLines.map(line => (
              <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50/30">
                {taxMode === 'per_line' && (
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={line.taxable}
                      onChange={() => handleTaxableToggle(line.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={line.label}
                    onChange={e => handleCustomLabelChange(line.id, e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    value={line.amount}
                    onChange={e => handleAmountChange(line.id, e.target.value)}
                    className="w-32 px-2 py-1 text-right font-mono text-sm border border-gray-300 rounded bg-yellow-50 focus:bg-yellow-100 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    step="0.01" min="0"
                  />
                </td>
                {taxMode === 'per_line' && (
                  <td className="px-3 py-2 text-right text-sm font-mono text-gray-500">
                    {line.taxable ? fmt(line.amount * (taxRate / 100)) : '—'}
                  </td>
                )}
                <td className="px-2 py-2 text-center">
                  <button onClick={() => handleDeleteCustomLine(line.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors" title="Remove">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Totals */}
          <tfoot>
            {/* Subtotal */}
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={taxMode === 'per_line' ? 2 : 1} className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right">
                SUBTOTAL
              </td>
              <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right font-mono">{fmt(subtotal)}</td>
              {taxMode === 'per_line' && <td></td>}
              <td></td>
            </tr>

            {/* Sales Tax */}
            <tr className="bg-gray-50">
              <td colSpan={taxMode === 'per_line' ? 2 : 1} className="px-4 py-2 text-sm text-gray-600 text-right">
                Sales Tax ({taxRate}%){taxMode === 'per_line' ? ` on ${fmt(taxableAmount)} taxable` : ''}
              </td>
              <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right font-mono">{fmt(salesTax)}</td>
              {taxMode === 'per_line' && <td></td>}
              <td></td>
            </tr>

            {/* Subtotal with Tax */}
            <tr className="bg-gray-100 border-t border-gray-300">
              <td colSpan={taxMode === 'per_line' ? 2 : 1} className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right">
                SUBTOTAL WITH TAX
              </td>
              <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right font-mono">{fmt(subtotalWithTax)}</td>
              {taxMode === 'per_line' && <td></td>}
              <td></td>
            </tr>

            {/* Overhead */}
            <tr className="bg-gray-50">
              <td colSpan={taxMode === 'per_line' ? 2 : 1} className="px-4 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm text-gray-600">Overhead</span>
                  <input
                    type="number"
                    value={overheadPct}
                    onChange={e => emitChange({ overhead_pct: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-1.5 py-1 text-right font-mono text-sm border border-gray-300 rounded bg-orange-50 focus:bg-orange-100 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    step="0.5" min="0" max="100"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </td>
              <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right font-mono">{fmt(overheadAmount)}</td>
              {taxMode === 'per_line' && <td></td>}
              <td></td>
            </tr>

            {/* Profit */}
            <tr className="bg-gray-50">
              <td colSpan={taxMode === 'per_line' ? 2 : 1} className="px-4 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm text-gray-600">Profit</span>
                  <input
                    type="number"
                    value={profitPct}
                    onChange={e => emitChange({ profit_pct: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-1.5 py-1 text-right font-mono text-sm border border-gray-300 rounded bg-green-50 focus:bg-green-100 focus:outline-none focus:ring-1 focus:ring-green-400"
                    step="0.5" min="0" max="100"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </td>
              <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right font-mono">{fmt(profitAmount)}</td>
              {taxMode === 'per_line' && <td></td>}
              <td></td>
            </tr>

            {/* Grand Total */}
            <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-300">
              <td colSpan={taxMode === 'per_line' ? 2 : 1} className="px-4 py-3 text-right">
                <span className="text-base font-bold text-gray-900">BID TOTAL</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-lg font-bold text-blue-700 font-mono">{fmt(grandTotal)}</span>
              </td>
              {taxMode === 'per_line' && <td></td>}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add line item */}
      <div className="flex justify-start">
        <button onClick={handleAddCustomLine}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Line Item
        </button>
      </div>

      {/* Breakdown summary card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Bid Breakdown</h4>
        <div className="space-y-1.5 text-sm">
          {allLines.map(l => (
            <div key={l.id} className="flex justify-between">
              <span className="text-gray-600">{l.label}{l.taxable && taxMode === 'per_line' ? ' *' : ''}</span>
              <span className="font-mono text-gray-900">{fmt(l.amount)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-1.5 flex justify-between font-medium">
            <span className="text-gray-700">Subtotal</span>
            <span className="font-mono text-gray-900">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Sales Tax ({taxRate}%)</span>
            <span className="font-mono text-gray-900">{fmt(salesTax)}</span>
          </div>
          {overheadPct > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Overhead ({overheadPct}%)</span>
              <span className="font-mono text-gray-900">{fmt(overheadAmount)}</span>
            </div>
          )}
          {profitPct > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Profit ({profitPct}%)</span>
              <span className="font-mono text-gray-900">{fmt(profitAmount)}</span>
            </div>
          )}
          <div className="border-t-2 border-gray-300 pt-2 flex justify-between">
            <span className="text-base font-bold text-gray-900">BID TOTAL</span>
            <span className="text-base font-bold text-blue-700 font-mono">{fmt(grandTotal)}</span>
          </div>
        </div>
        {taxMode === 'per_line' && (
          <p className="text-xs text-gray-400 mt-2">* Taxable line items</p>
        )}
      </div>
    </div>
  )
}


// ============================================================================
// MAIN ESTIMATE TAB
// ============================================================================
export default function EstimateTab({ projectId }) {
  const [takeoff, setTakeoff] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [savedVersion, setSavedVersion] = useState(null)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const saveTimerRef = useRef(null)

  // Add item modal state per tab
  const [showAddMaterials, setShowAddMaterials] = useState(false)
  const [showAddMetals, setShowAddMetals] = useState(false)
  const [showAddLabor, setShowAddLabor] = useState(false)

  // ---- Load saved estimate on mount ----
  useEffect(() => { loadSavedEstimate() }, [projectId])

  const loadSavedEstimate = async () => {
    try {
      const res = await estimateAPI.load(projectId)
      if (res.data.saved) {
        setTakeoff(res.data.estimate_data)
        setSavedVersion(res.data.version)
        setLastSavedAt(res.data.updated_at)
        setSaveStatus('saved')
      }
    } catch (err) { /* no saved estimate */ }
    finally { setLoadingInitial(false) }
  }

  // ---- Save ----
  const saveEstimate = useCallback(async (data) => {
    if (!data) return
    setSaving(true); setSaveStatus('saving')
    try {
      const res = await estimateAPI.save(projectId, data)
      setSavedVersion(res.data.version)
      setLastSavedAt(new Date().toISOString())
      setSaveStatus('saved'); setHasUnsavedChanges(false)
    } catch (err) { setSaveStatus('error') }
    finally { setSaving(false) }
  }, [projectId])

  const debouncedSave = useCallback((data) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setHasUnsavedChanges(true); setSaveStatus('unsaved')
    saveTimerRef.current = setTimeout(() => saveEstimate(data), 2000)
  }, [saveEstimate])

  useEffect(() => { return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) } }, [])

  // ---- Recalculate helper ----
  const recalcTotals = (updated) => {
    const flatTotal = updated.flat_materials?.reduce((sum, g) => sum + (g.items || []).reduce((s, it) => s + (it.extended || 0), 0), 0) || 0
    const metalsTotal = updated.metals?.reduce((sum, g) => sum + (g.items || []).reduce((s, it) => s + (it.extended || 0), 0), 0) || 0
    const laborTotal = updated.labor?.reduce((sum, g) => sum + (g.items || []).reduce((s, it) => s + (it.extended || 0), 0), 0) || 0

    updated.flat_materials_total = flatTotal
    updated.metals_total = metalsTotal
    updated.labor_total = laborTotal

    // Recalc group totals too
    ;['flat_materials', 'metals', 'labor'].forEach(key => {
      (updated[key] || []).forEach(g => {
        g.total = (g.items || []).reduce((s, it) => s + (it.extended || 0), 0)
      })
    })

    const subtotal = flatTotal + metalsTotal + laborTotal + (updated.warranty_cost || 0)
    const markupPct = updated.summary?.cost_summary?.markup_pct || 0.25
    const markup = subtotal * markupPct
    const subtotalWithMarkup = subtotal + markup
    const taxPct = updated.summary?.cost_summary?.tax_pct || 0.0825
    const tax = subtotalWithMarkup * taxPct
    const grandTotal = subtotalWithMarkup + tax

    if (updated.summary?.cost_summary) {
      updated.summary.cost_summary.flat_materials = flatTotal
      updated.summary.cost_summary.metals = metalsTotal
      updated.summary.cost_summary.labor = laborTotal
      updated.summary.cost_summary.subtotal = subtotal
      updated.summary.cost_summary.markup = markup
      updated.summary.cost_summary.subtotal_with_markup = subtotalWithMarkup
      updated.summary.cost_summary.tax = tax
      updated.summary.cost_summary.grand_total = grandTotal
    }
    return updated
  }

  // ---- Generate takeoff ----
  const fetchTakeoff = async () => {
    setLoading(true); setError('')
    try {
      const res = await estimateAPI.takeoff(projectId)
      setTakeoff(res.data)
      await saveEstimate(res.data)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to generate takeoff. Make sure you have conditions (run Smart Build first).')
    } finally { setLoading(false) }
  }

  // ---- Edit item ----
  const handleItemEdit = (tabKey, groupIndex, itemIndex, field, value) => {
    setTakeoff(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      const item = updated[tabKey]?.[groupIndex]?.items?.[itemIndex]
      if (!item) return prev
      item[field] = value
      item.extended = (item.qty || 0) * (1 + (item.waste_pct || 0) / 100) * (item.unit_cost || 0)
      recalcTotals(updated)
      debouncedSave(updated)
      return updated
    })
  }

  // ---- Delete item ----
  const handleDeleteItem = (tabKey, groupIndex, itemIndex) => {
    setTakeoff(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      const group = updated[tabKey]?.[groupIndex]
      if (!group?.items) return prev
      group.items.splice(itemIndex, 1)
      // Renumber remaining
      group.items.forEach((it, i) => { it.line = i + 1 })
      recalcTotals(updated)
      debouncedSave(updated)
      return updated
    })
  }

  // ---- Add item ----
  const handleAddItem = (tabKey, groupIndex, newItem) => {
    setTakeoff(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      const group = updated[tabKey]?.[groupIndex]
      if (!group) return prev
      if (!group.items) group.items = []
      newItem.line = group.items.length + 1
      group.items.push(newItem)
      recalcTotals(updated)
      debouncedSave(updated)
      return updated
    })
  }

  // ---- Toggle warehouse stock ----
  const handleToggleStock = (tabKey, groupIndex, itemIndex) => {
    setTakeoff(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      const item = updated[tabKey]?.[groupIndex]?.items?.[itemIndex]
      if (!item) return prev
      item.in_stock = !item.in_stock
      debouncedSave(updated)
      return updated
    })
  }

  // ---- Recap change handler ----
  const handleRecapChange = (newRecap) => {
    setTakeoff(prev => {
      const updated = JSON.parse(JSON.stringify(prev))
      updated.recap = newRecap
      // Update the grand total in summary to reflect recap bid total
      if (updated.summary?.cost_summary && newRecap.computed_grand_total != null) {
        updated.summary.cost_summary.grand_total = newRecap.computed_grand_total
      }
      debouncedSave(updated)
      return updated
    })
  }

  const tabs = [
    { id: 'summary', label: 'Project Summary' },
    { id: 'materials', label: 'Flat Roof Materials' },
    { id: 'metals', label: 'Roof Related Metals' },
    { id: 'labor', label: 'Labor & General Conditions' },
    { id: 'quantities', label: 'Total Quantities' },
    { id: 'recap', label: 'Recap' },
  ]

  if (loadingInitial) {
    return <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Material Takeoff & Estimate</h2>
          {takeoff && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              saveStatus === 'saved' ? 'bg-green-50 text-green-700' :
              saveStatus === 'saving' ? 'bg-blue-50 text-blue-700' :
              saveStatus === 'unsaved' ? 'bg-yellow-50 text-yellow-700' :
              saveStatus === 'error' ? 'bg-red-50 text-red-700' :
              'bg-gray-50 text-gray-500'
            }`}>
              {saveStatus === 'saved' && (
                <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Saved{savedVersion ? ` (v${savedVersion})` : ''}</>
              )}
              {saveStatus === 'saving' && (
                <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
              )}
              {saveStatus === 'unsaved' && (<><div className="w-2 h-2 rounded-full bg-yellow-500" />Unsaved changes</>)}
              {saveStatus === 'error' && (<><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Save failed</>)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Print material list */}
          {takeoff && (
            <button onClick={() => printMaterialList(takeoff)}
              className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Material List
            </button>
          )}
          {/* Save Now */}
          {takeoff && hasUnsavedChanges && (
            <button onClick={() => saveEstimate(takeoff)} disabled={saving}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {saving ? 'Saving...' : 'Save Now'}
            </button>
          )}
          {/* Generate */}
          <button onClick={fetchTakeoff} disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? (
              <><svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Generating...</>
            ) : (
              <><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>{takeoff ? 'Regenerate Takeoff' : 'Generate Takeoff'}</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {!takeoff ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Takeoff Yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Upload specs and plans, run the AI analysis, then Smart Build conditions.
            Once you have conditions, click "Generate Takeoff" to produce a full material takeoff and estimate.
          </p>
        </div>
      ) : (
        <div>
          {/* Grand Total Banner */}
          <div className="mb-4 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 flex items-center justify-between text-white">
            <div>
              <p className="text-xs text-blue-200 uppercase tracking-wider">
                {takeoff.recap?.computed_grand_total ? 'Bid Total' : 'Grand Total'}
              </p>
              <p className="text-2xl font-bold">
                {fmt(takeoff.recap?.computed_grand_total || takeoff.summary?.cost_summary?.grand_total)}
              </p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-blue-200">Materials</p>
                <p className="text-sm font-semibold">{fmt((takeoff.flat_materials_total || 0) + (takeoff.metals_total || 0))}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Labor</p>
                <p className="text-sm font-semibold">{fmt(takeoff.labor_total)}</p>
              </div>
              {takeoff.recap?.overhead_pct > 0 && (
                <div>
                  <p className="text-xs text-blue-200">OH {takeoff.recap.overhead_pct}%</p>
                  <p className="text-sm font-semibold">{fmt(takeoff.recap.computed_overhead)}</p>
                </div>
              )}
              {takeoff.recap?.profit_pct > 0 && (
                <div>
                  <p className="text-xs text-blue-200">Profit {takeoff.recap.profit_pct}%</p>
                  <p className="text-sm font-semibold">{fmt(takeoff.recap.computed_profit)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-blue-200">System</p>
                <p className="text-sm font-semibold">{takeoff.summary?.system_type}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Area</p>
                <p className="text-sm font-semibold">{fmtNum(takeoff.summary?.roof_area_sf)} SF</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white border border-b-0 border-gray-200 text-blue-700 -mb-px'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >{tab.label}</button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'summary' && <ProjectSummaryTab summary={takeoff.summary} />}

            {activeTab === 'materials' && (
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3 uppercase">Flat Roof Materials</h3>
                <MaterialTable
                  groups={takeoff.flat_materials || []}
                  pageTotal={takeoff.flat_materials_total}
                  pageTotalLabel="PAGE 2 TOTAL:"
                  onEdit={handleItemEdit} onDelete={handleDeleteItem} onAdd={handleAddItem}
                  onToggleStock={handleToggleStock} tabKey="flat_materials"
                  showAddModal={showAddMaterials} setShowAddModal={setShowAddMaterials}
                />
              </div>
            )}

            {activeTab === 'metals' && (
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3 uppercase">Roof Related Metals</h3>
                <MaterialTable
                  groups={takeoff.metals || []}
                  pageTotal={takeoff.metals_total}
                  pageTotalLabel="PAGE 3 TOTAL:"
                  onEdit={handleItemEdit} onDelete={handleDeleteItem} onAdd={handleAddItem}
                  onToggleStock={handleToggleStock} tabKey="metals"
                  showAddModal={showAddMetals} setShowAddModal={setShowAddMetals}
                />
              </div>
            )}

            {activeTab === 'labor' && (
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3 uppercase">Labor & General Conditions</h3>
                <MaterialTable
                  groups={takeoff.labor || []}
                  pageTotal={takeoff.labor_total}
                  pageTotalLabel="PAGE 4 TOTAL:"
                  onEdit={handleItemEdit} onDelete={handleDeleteItem} onAdd={handleAddItem}
                  onToggleStock={handleToggleStock} tabKey="labor"
                  showAddModal={showAddLabor} setShowAddModal={setShowAddLabor}
                />
                {takeoff.warranty_cost > 0 && (
                  <div className="mt-3 bg-white rounded-lg border border-gray-200 px-4 py-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{takeoff.warranty_description}</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">{fmt(takeoff.warranty_cost)}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'quantities' && (
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3 uppercase">Total Estimated Quantities</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Aggregated quantities across all material pages. Use this to decide if similar items can be consolidated
                  (e.g., use only 6" screws and delete the 2" line).
                </p>
                <QuantitySummary takeoff={takeoff} />
              </div>
            )}

            {activeTab === 'recap' && (
              <RecapTab takeoff={takeoff} onRecapChange={handleRecapChange} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
