import React, { useState, useEffect } from 'react';
import api from '../api';

const MaterialDatabasePage = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [costDatabase, setCostDatabase] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters for Material Templates
  const [templateFilters, setTemplateFilters] = useState({
    systemType: 'All',
    category: 'All',
    isActive: true,
  });

  // Filters for Cost Database
  const [costFilters, setCostFilters] = useState({
    category: 'All',
    isActive: true,
  });

  // Editing states
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingCostId, setEditingCostId] = useState(null);
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [addingCostItem, setAddingCostItem] = useState(false);

  // Form data states
  const [newTemplateData, setNewTemplateData] = useState({
    material_name: '',
    system_type: 'TPO',
    condition_type: '',
    material_category: 'membrane',
    unit: 'sqft',
    coverage_rate: '',
    waste_factor: '',
    is_active: true,
  });

  const [newCostData, setNewCostData] = useState({
    material_name: '',
    manufacturer: '',
    material_category: 'membrane',
    unit: 'sqft',
    unit_cost: '',
    labor_cost_per_unit: '',
    is_active: true,
  });

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch material templates
  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (templateFilters.systemType !== 'All') {
        params.system_type = templateFilters.systemType;
      }
      if (templateFilters.category !== 'All') {
        params.material_category = templateFilters.category;
      }
      params.is_active = templateFilters.isActive;

      const response = await api.get('/api/v1/material-templates', { params });
      setTemplates(response.data || []);
    } catch (err) {
      setError(`Failed to fetch material templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cost database
  const fetchCostDatabase = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (costFilters.category !== 'All') {
        params.material_category = costFilters.category;
      }
      params.is_active = costFilters.isActive;

      const response = await api.get('/api/v1/cost-database', { params });
      setCostDatabase(response.data || []);
    } catch (err) {
      setError(`Failed to fetch cost database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on filter changes
  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [templateFilters, activeTab]);

  useEffect(() => {
    if (activeTab === 'costdb') {
      fetchCostDatabase();
    }
  }, [costFilters, activeTab]);

  // Add Material Template
  const handleAddTemplate = async () => {
    setError('');
    try {
      const payload = {
        ...newTemplateData,
        coverage_rate: parseFloat(newTemplateData.coverage_rate),
        waste_factor: parseFloat(newTemplateData.waste_factor),
      };
      await api.post('/api/v1/material-templates', payload);
      setSuccess('Material template added successfully');
      setTimeout(() => setSuccess(''), 3000);
      setNewTemplateData({
        material_name: '',
        system_type: 'TPO',
        condition_type: '',
        material_category: 'membrane',
        unit: 'sqft',
        coverage_rate: '',
        waste_factor: '',
        is_active: true,
      });
      setAddingTemplate(false);
      fetchTemplates();
    } catch (err) {
      setError(`Failed to add material template: ${err.message}`);
    }
  };

  // Update Material Template
  const handleUpdateTemplate = async (id, updatedData) => {
    setError('');
    try {
      const payload = {
        ...updatedData,
        coverage_rate: parseFloat(updatedData.coverage_rate),
        waste_factor: parseFloat(updatedData.waste_factor),
      };
      await api.put(`/api/v1/material-templates/${id}`, payload);
      setSuccess('Material template updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      setEditingTemplateId(null);
      fetchTemplates();
    } catch (err) {
      setError(`Failed to update material template: ${err.message}`);
    }
  };

  // Delete Material Template
  const handleDeleteTemplate = async (id) => {
    if (window.confirm('Are you sure you want to delete this material template?')) {
      setError('');
      try {
        await api.delete(`/api/v1/material-templates/${id}`);
        setSuccess('Material template deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
        fetchTemplates();
      } catch (err) {
        setError(`Failed to delete material template: ${err.message}`);
      }
    }
  };

  // Add Cost Database Item
  const handleAddCostItem = async () => {
    setError('');
    try {
      const payload = {
        ...newCostData,
        unit_cost: parseFloat(newCostData.unit_cost),
        labor_cost_per_unit: parseFloat(newCostData.labor_cost_per_unit),
      };
      await api.post('/api/v1/cost-database', payload);
      setSuccess('Cost database item added successfully');
      setTimeout(() => setSuccess(''), 3000);
      setNewCostData({
        material_name: '',
        manufacturer: '',
        material_category: 'membrane',
        unit: 'sqft',
        unit_cost: '',
        labor_cost_per_unit: '',
        is_active: true,
      });
      setAddingCostItem(false);
      fetchCostDatabase();
    } catch (err) {
      setError(`Failed to add cost database item: ${err.message}`);
    }
  };

  // Update Cost Database Item
  const handleUpdateCostItem = async (id, updatedData) => {
    setError('');
    try {
      const payload = {
        ...updatedData,
        unit_cost: parseFloat(updatedData.unit_cost),
        labor_cost_per_unit: parseFloat(updatedData.labor_cost_per_unit),
      };
      await api.put(`/api/v1/cost-database/${id}`, payload);
      setSuccess('Cost database item updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      setEditingCostId(null);
      fetchCostDatabase();
    } catch (err) {
      setError(`Failed to update cost database item: ${err.message}`);
    }
  };

  // Delete Cost Database Item
  const handleDeleteCostItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this cost database item?')) {
      setError('');
      try {
        await api.delete(`/api/v1/cost-database/${id}`);
        setSuccess('Cost database item deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
        fetchCostDatabase();
      } catch (err) {
        setError(`Failed to delete cost database item: ${err.message}`);
      }
    }
  };

  // Handle Vendor Pricing Upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUploadPricing = async () => {
    if (!uploadFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await api.post('/api/v1/cost-database/upload-pricing', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data);
      setSuccess('Pricing file uploaded successfully');
      setTimeout(() => setSuccess(''), 5000);
      setUploadFile(null);
      fetchCostDatabase();
    } catch (err) {
      setError(`Failed to upload pricing file: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const systemTypeOptions = ['All', 'TPO', 'EPDM', 'PVC', 'common'];
  const categoryOptions = ['All', 'membrane', 'insulation', 'fastener', 'adhesive', 'flashing', 'sealant', 'accessory'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Material Database</h1>
          <p className="text-gray-600 mt-2">Manage roofing material templates and pricing</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Material Templates
            </button>
            <button
              onClick={() => setActiveTab('costdb')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'costdb'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cost Database
            </button>
          </div>
        </div>

        {/* Material Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Type
                  </label>
                  <select
                    value={templateFilters.systemType}
                    onChange={(e) =>
                      setTemplateFilters({ ...templateFilters, systemType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {systemTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={templateFilters.category}
                    onChange={(e) =>
                      setTemplateFilters({ ...templateFilters, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateFilters.isActive}
                      onChange={(e) =>
                        setTemplateFilters({ ...templateFilters, isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Add Template Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <button
                onClick={() => setAddingTemplate(true)}
                disabled={addingTemplate}
                className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
              >
                Add Template
              </button>

              {addingTemplate && (
                <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">New Material Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Material Name"
                      value={newTemplateData.material_name}
                      onChange={(e) =>
                        setNewTemplateData({
                          ...newTemplateData,
                          material_name: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={newTemplateData.system_type}
                      onChange={(e) =>
                        setNewTemplateData({
                          ...newTemplateData,
                          system_type: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="TPO">TPO</option>
                      <option value="EPDM">EPDM</option>
                      <option value="PVC">PVC</option>
                      <option value="common">Common</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Condition Type"
                      value={newTemplateData.condition_type}
                      onChange={(e) =>
                        setNewTemplateData({
                          ...newTemplateData,
                          condition_type: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={newTemplateData.material_category}
                      onChange={(e) =>
                        setNewTemplateData({
                          ...newTemplateData,
                          material_category: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categoryOptions.slice(1).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Unit"
                      value={newTemplateData.unit}
                      onChange={(e) =>
                        setNewTemplateData({
                          ...newTemplateData,
                          unit: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Coverage Rate"
                      step="0.01"
                      value={newTemplateData.coverage_rate}
                      onChange={(e) =>
                        setNewTemplateData({
                          ...newTemplateData,
                          coverage_rate: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Waste Factor"
                      step="0.01"
                      value={newTemplateData.waste_factor}
                      onChange={(e) =>
                        setNewTemplateData({
                          ...newTemplateData,
                          waste_factor: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTemplateData.is_active}
                        onChange={(e) =>
                          setNewTemplateData({
                            ...newTemplateData,
                            is_active: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddTemplate}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setAddingTemplate(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Templates Table */}
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No material templates found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Material Name
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          System Type
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Condition
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Unit
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Coverage Rate
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Waste Factor
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Active
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {templates.map((template) => (
                        <TemplateRow
                          key={template.id}
                          template={template}
                          isEditing={editingTemplateId === template.id}
                          onEdit={() => setEditingTemplateId(template.id)}
                          onUpdate={(updated) => handleUpdateTemplate(template.id, updated)}
                          onCancel={() => setEditingTemplateId(null)}
                          onDelete={() => handleDeleteTemplate(template.id)}
                          categoryOptions={categoryOptions}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cost Database Tab */}
        {activeTab === 'costdb' && (
          <div className="space-y-6">
            {/* Vendor Pricing Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Pricing Upload</h2>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-center space-x-3 mb-3">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-medium mb-2">Drag and drop your CSV or Excel file</p>
                  <p className="text-gray-600 text-sm mb-4">or</p>
                  <label className="inline-block">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium">
                      Browse Files
                    </span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                    />
                  </label>
                  {uploadFile && (
                    <p className="text-sm text-green-600 mt-3">Selected: {uploadFile.name}</p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleUploadPricing}
                    disabled={!uploadFile || uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
                  >
                    {uploading ? 'Uploading...' : 'Upload Pricing'}
                  </button>
                  {uploadFile && (
                    <button
                      onClick={() => setUploadFile(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {uploadResult && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Upload Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm text-gray-600">Matched Items</p>
                        <p className="text-2xl font-bold text-green-600">
                          {uploadResult.matched_items || 0}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm text-gray-600">Updated Prices</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {uploadResult.updated_prices || 0}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm text-gray-600">Unmatched Items</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {uploadResult.unmatched_items || 0}
                        </p>
                      </div>
                    </div>
                    {uploadResult.details && (
                      <div className="text-sm text-gray-700">
                        <p className="font-medium mb-2">Details:</p>
                        <p>{uploadResult.details}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={costFilters.category}
                    onChange={(e) =>
                      setCostFilters({ ...costFilters, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={costFilters.isActive}
                      onChange={(e) =>
                        setCostFilters({ ...costFilters, isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active Only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Add Cost Item Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <button
                onClick={() => setAddingCostItem(true)}
                disabled={addingCostItem}
                className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
              >
                Add Item
              </button>

              {addingCostItem && (
                <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">New Cost Database Item</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Material Name"
                      value={newCostData.material_name}
                      onChange={(e) =>
                        setNewCostData({
                          ...newCostData,
                          material_name: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Manufacturer"
                      value={newCostData.manufacturer}
                      onChange={(e) =>
                        setNewCostData({
                          ...newCostData,
                          manufacturer: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={newCostData.material_category}
                      onChange={(e) =>
                        setNewCostData({
                          ...newCostData,
                          material_category: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categoryOptions.slice(1).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Unit"
                      value={newCostData.unit}
                      onChange={(e) =>
                        setNewCostData({
                          ...newCostData,
                          unit: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <input
                      type="number"
                      placeholder="Unit Cost"
                      step="0.01"
                      value={newCostData.unit_cost}
                      onChange={(e) =>
                        setNewCostData({
                          ...newCostData,
                          unit_cost: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Labor Cost Per Unit"
                      step="0.01"
                      value={newCostData.labor_cost_per_unit}
                      onChange={(e) =>
                        setNewCostData({
                          ...newCostData,
                          labor_cost_per_unit: e.target.value,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCostData.is_active}
                        onChange={(e) =>
                          setNewCostData({
                            ...newCostData,
                            is_active: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddCostItem}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setAddingCostItem(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Cost Database Table */}
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading cost database...</p>
                </div>
              ) : costDatabase.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No cost database items found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Material Name
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Manufacturer
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Unit
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Unit Cost
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Labor Cost
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Last Updated
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Active
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {costDatabase.map((item) => (
                        <CostDatabaseRow
                          key={item.id}
                          item={item}
                          isEditing={editingCostId === item.id}
                          onEdit={() => setEditingCostId(item.id)}
                          onUpdate={(updated) => handleUpdateCostItem(item.id, updated)}
                          onCancel={() => setEditingCostId(null)}
                          onDelete={() => handleDeleteCostItem(item.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Material Template Row Component
const TemplateRow = ({
  template,
  isEditing,
  onEdit,
  onUpdate,
  onCancel,
  onDelete,
  categoryOptions,
}) => {
  const [formData, setFormData] = useState({
    material_name: template.material_name,
    system_type: template.system_type,
    condition_type: template.condition_type,
    material_category: template.material_category,
    unit: template.unit,
    coverage_rate: template.coverage_rate,
    waste_factor: template.waste_factor,
    is_active: template.is_active,
  });

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-6 py-4">
          <input
            type="text"
            value={formData.material_name}
            onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={formData.system_type}
            onChange={(e) => setFormData({ ...formData, system_type: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="TPO">TPO</option>
            <option value="EPDM">EPDM</option>
            <option value="PVC">PVC</option>
            <option value="common">Common</option>
          </select>
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={formData.condition_type}
            onChange={(e) => setFormData({ ...formData, condition_type: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={formData.material_category}
            onChange={(e) => setFormData({ ...formData, material_category: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categoryOptions.slice(1).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="number"
            step="0.01"
            value={formData.coverage_rate}
            onChange={(e) => setFormData({ ...formData, coverage_rate: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="number"
            step="0.01"
            value={formData.waste_factor}
            onChange={(e) => setFormData({ ...formData, waste_factor: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <button
            onClick={() => onUpdate(formData)}
            className="text-green-600 hover:text-green-900 font-medium text-sm mr-3"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900 font-medium text-sm"
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900">{template.material_name}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{template.system_type}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{template.condition_type}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{template.material_category}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{template.unit}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{template.coverage_rate}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{template.waste_factor}</td>
      <td className="px-6 py-4 text-sm">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            template.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {template.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-900 font-medium text-sm mr-3"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-900 font-medium text-sm"
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

// Cost Database Row Component
const CostDatabaseRow = ({
  item,
  isEditing,
  onEdit,
  onUpdate,
  onCancel,
  onDelete,
}) => {
  const [formData, setFormData] = useState({
    material_name: item.material_name,
    manufacturer: item.manufacturer,
    material_category: item.material_category,
    unit: item.unit,
    unit_cost: item.unit_cost,
    labor_cost_per_unit: item.labor_cost_per_unit,
    is_active: item.is_active,
  });

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-6 py-4">
          <span className="text-sm text-gray-900">{item.material_name}</span>
        </td>
        <td className="px-6 py-4">
          <span className="text-sm text-gray-900">{item.manufacturer}</span>
        </td>
        <td className="px-6 py-4">
          <span className="text-sm text-gray-900">{item.material_category}</span>
        </td>
        <td className="px-6 py-4">
          <span className="text-sm text-gray-900">{item.unit}</span>
        </td>
        <td className="px-6 py-4">
          <input
            type="number"
            step="0.01"
            value={formData.unit_cost}
            onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="number"
            step="0.01"
            value={formData.labor_cost_per_unit}
            onChange={(e) => setFormData({ ...formData, labor_cost_per_unit: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
          {item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'N/A'}
        </td>
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <button
            onClick={() => onUpdate(formData)}
            className="text-green-600 hover:text-green-900 font-medium text-sm mr-3"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-900 font-medium text-sm"
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900">{item.material_name}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{item.manufacturer}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{item.material_category}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{item.unit}</td>
      <td className="px-6 py-4 text-sm text-gray-900">${item.unit_cost?.toFixed(2) || '0.00'}</td>
      <td className="px-6 py-4 text-sm text-gray-900">
        ${item.labor_cost_per_unit?.toFixed(2) || '0.00'}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'N/A'}
      </td>
      <td className="px-6 py-4 text-sm">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            item.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-900 font-medium text-sm mr-3"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-900 font-medium text-sm"
        >
          Delete
        </button>
      </td>
    </tr>
  );
};

export default MaterialDatabasePage;
