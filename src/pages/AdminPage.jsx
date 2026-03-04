import { useState, useEffect, useRef } from 'react'
import { adminAPI } from '../api'

// ── Editable List Component ──────────────────────────────────
function EditableList({ label, items, onChange }) {
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

  const moveItem = (index, direction) => {
    const arr = [...items]
    const target = index + direction
    if (target < 0 || target >= arr.length) return
    ;[arr[index], arr[target]] = [arr[target], arr[index]]
    onChange(arr)
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="space-y-1 mb-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-1.5 text-sm">
            <span className="flex-1">{item}</span>
            <button type="button" onClick={() => moveItem(i, -1)} className="text-gray-400 hover:text-gray-600" title="Move up">&uarr;</button>
            <button type="button" onClick={() => moveItem(i, 1)} className="text-gray-400 hover:text-gray-600" title="Move down">&darr;</button>
            <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
          placeholder={`Add new ${label.toLowerCase().replace(/s$/, '')}...`}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
        <button type="button" onClick={addItem} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
          Add
        </button>
      </div>
    </div>
  )
}


// ── Main Admin Page ──────────────────────────────────────────
export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const fileInputRef = useRef(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    tagline: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    license_info: '',
    logo_url: null,
    about_text: '',
    services: [],
    certifications: [],
    why_choose_us: [],
    default_terms: [],
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await adminAPI.getCompany()
      setForm(res.data)
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Unknown error'
      setMessage({ text: `Failed to load settings: ${detail}`, type: 'error' })
      console.error('Admin load error:', err.response?.data || err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ text: '', type: '' })
    try {
      const { logo_url, id, updated_at, ...updateData } = form
      await adminAPI.updateCompany(updateData)
      setMessage({ text: 'Settings saved successfully!', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.traceback || err.message || 'Unknown error'
      setMessage({ text: `Failed to save: ${detail}`, type: 'error' })
      console.error('Admin save error:', err.response?.data || err)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const res = await adminAPI.uploadLogo(file)
      setForm(prev => ({ ...prev, logo_url: res.data.logo_url }))
      setMessage({ text: 'Logo uploaded!', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (err) {
      setMessage({ text: 'Failed to upload logo', type: 'error' })
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteLogo = async () => {
    try {
      await adminAPI.deleteLogo()
      setForm(prev => ({ ...prev, logo_url: null }))
      setMessage({ text: 'Logo removed', type: 'success' })
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    } catch (err) {
      setMessage({ text: 'Failed to remove logo', type: 'error' })
    }
  }

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-500">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your company profile, logo, and default proposal settings</p>
      </div>

      {message.text && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* ── Company Info Section ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
          <p className="text-sm text-gray-500 mb-4">This information appears in your proposal PDF headers and footers.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input type="text" value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="text" value={form.website} onChange={(e) => updateField('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">License / Insurance Info</label>
              <input type="text" value={form.license_info} onChange={(e) => updateField('license_info', e.target.value)}
                placeholder="Licensed & Insured | Commercial Roofing Contractor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
          </div>
        </div>

        {/* ── Logo Section ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h2>
          <p className="text-sm text-gray-500 mb-4">Upload your company logo. It will appear in the header of your proposal PDFs.</p>

          <div className="flex items-start gap-6">
            {form.logo_url ? (
              <div className="flex-shrink-0">
                <div className="w-40 h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                  <img src={form.logo_url} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <button type="button" onClick={handleDeleteLogo}
                  className="mt-2 text-sm text-red-600 hover:text-red-700">
                  Remove Logo
                </button>
              </div>
            ) : (
              <div className="w-40 h-24 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-gray-400 text-sm">No logo</span>
              </div>
            )}
            <div>
              <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                {uploadingLogo ? 'Uploading...' : (form.logo_url ? 'Replace Logo' : 'Upload Logo')}
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP, or SVG. Recommended: 300x100px</p>
            </div>
          </div>
        </div>

        {/* ── About Section (Page 5) ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">About Your Company</h2>
          <p className="text-sm text-gray-500 mb-4">This content appears on the &quot;About&quot; page (Page 5) of your proposals.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">About Text</label>
            <textarea value={form.about_text || ''} onChange={(e) => updateField('about_text', e.target.value)}
              rows={4}
              placeholder="Tell your clients about your company..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
          </div>

          <EditableList label="Services" items={form.services || []} onChange={(v) => updateField('services', v)} />
          <EditableList label="Certifications" items={form.certifications || []} onChange={(v) => updateField('certifications', v)} />
          <EditableList label="Why Choose Us" items={form.why_choose_us || []} onChange={(v) => updateField('why_choose_us', v)} />
        </div>

        {/* ── Terms & Conditions ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Terms &amp; Conditions</h2>
          <p className="text-sm text-gray-500 mb-4">These terms will be included by default on every proposal. You can override them per-proposal.</p>

          <EditableList label="Terms" items={form.default_terms || []} onChange={(v) => updateField('default_terms', v)} />
        </div>

        {/* ── Save Button ── */}
        <div className="flex justify-end mb-8">
          <button type="submit" disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
