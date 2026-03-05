import { useState } from 'react'
import { referenceAPI } from '../../api'

export default function PricingTab() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [message, setMessage] = useState(null)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await referenceAPI.uploadPricing(formData)
      setUploadResult(res.data)
      setMessage({ type: 'success', text: `Successfully uploaded pricing: ${res.data.updated || 0} items updated, ${res.data.created || 0} new items created.` })
      setFile(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`px-4 py-3 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Vendor Pricing</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a CSV file with columns: material_name, manufacturer, material_category, unit, unit_cost, labor_cost_per_unit
        </p>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
        </div>
      </div>

      {/* CSV Format Guide */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">CSV Format Guide</h2>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <div className="text-gray-500 mb-2">material_name,manufacturer,material_category,unit,unit_cost,labor_cost_per_unit</div>
          <div>Sure-Weld TPO 60mil 10'x100',Carlisle,membrane,sqft,0.85,0.75</div>
          <div>InsulBase Polyiso 2.0" 4'x8',Carlisle,insulation,sqft,0.55,0.30</div>
          <div>InsulFast 3" Fastener,Carlisle,fastener,each,0.18,0.10</div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium mb-2">Column descriptions:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            <li><span className="font-medium text-gray-700">material_name</span> — Must match an existing product name in the cost database</li>
            <li><span className="font-medium text-gray-700">manufacturer</span> — Brand/manufacturer name</li>
            <li><span className="font-medium text-gray-700">material_category</span> — membrane, insulation, coverboard, fastener, adhesive, sealant, accessory</li>
            <li><span className="font-medium text-gray-700">unit</span> — sqft, lnft, each, gallon</li>
            <li><span className="font-medium text-gray-700">unit_cost</span> — Material cost per unit (decimal)</li>
            <li><span className="font-medium text-gray-700">labor_cost_per_unit</span> — Labor cost per unit (decimal, optional)</li>
          </ul>
        </div>
      </div>

      {/* Upload Results */}
      {uploadResult && uploadResult.results && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Results</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Material</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Status</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Unit Cost</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Labor Cost</th>
                </tr>
              </thead>
              <tbody>
                {uploadResult.results.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-3">{r.material_name}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === 'updated' ? 'bg-green-100 text-green-700' :
                        r.status === 'created' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">${r.unit_cost?.toFixed(2) || '—'}</td>
                    <td className="py-2 px-3 text-right">${r.labor_cost?.toFixed(2) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
