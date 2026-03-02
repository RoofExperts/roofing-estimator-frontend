import { useState, useEffect } from 'react'
import { estimateAPI } from '../api'
import { LoadingSpinner } from './common'

export default function EstimateTab({ projectId }) {
  const [estimate, setEstimate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState('')
  const [initialLoad, setInitialLoad] = useState(true)

  const fetchEstimate = async () => {
    try {
      const res = await estimateAPI.get(projectId)
      setEstimate(res.data)
    } catch (err) {
      // 404 means no estimate yet, which is fine
      if (err.response?.status !== 404) {
        setError('Failed to load estimate')
      }
    } finally {
      setInitialLoad(false)
    }
  }

  useEffect(() => { fetchEstimate() }, [projectId])

  const handleCalculate = async () => {
    setCalculating(true)
    setError('')
    try {
      const res = await estimateAPI.calculate(projectId)
      setEstimate(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate estimate. Make sure you have conditions defined.')
    } finally {
      setCalculating(false)
    }
  }

  if (initialLoad) return <LoadingSpinner />

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
  }

  // Group line items by category
  const groupedItems = {}
  if (estimate?.line_items) {
    estimate.line_items.forEach(item => {
      const cat = item.category || 'Other'
      if (!groupedItems[cat]) groupedItems[cat] = []
      groupedItems[cat].push(item)
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Cost Estimate</h2>
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {calculating ? 'Calculating...' : (estimate ? 'Recalculate' : 'Calculate Estimate')}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {!estimate ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Estimate Yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add roof conditions first, then click "Calculate Estimate" to generate a cost breakdown.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Materials</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(estimate.material_total)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Labor</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(estimate.labor_total)}</p>
            </div>
            <div className="bg-primary-50 rounded-xl border border-primary-200 p-6">
              <p className="text-sm text-primary-600 mb-1">Grand Total</p>
              <p className="text-2xl font-bold text-primary-700">{formatCurrency(estimate.grand_total)}</p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          {Object.keys(groupedItems).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-md font-semibold text-gray-900">Detailed Breakdown</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <>
                      <tr key={category} className="bg-gray-50">
                        <td colSpan={4} className="px-6 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          {category}
                        </td>
                      </tr>
                      {items.map((item, idx) => (
                        <tr key={`${category}-${idx}`} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-900">{item.material || item.description}</td>
                          <td className="px-6 py-3 text-sm text-gray-700 text-right">
                            {item.quantity?.toLocaleString()} {item.unit || ''}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700 text-right">{formatCurrency(item.unit_cost)}</td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
                <tfoot className="bg-primary-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-sm font-bold text-primary-700 text-right">Grand Total</td>
                    <td className="px-6 py-4 text-lg font-bold text-primary-700 text-right">{formatCurrency(estimate.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
          }
