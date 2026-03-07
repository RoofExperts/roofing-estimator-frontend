import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { projectAPI } from '../api'
import ConditionsTab from '../components/ConditionsTab'
import PlansTab from '../components/PlansTab'
import EstimateTab from '../components/EstimateTab'
import SpecificationsTab from '../components/SpecificationsTab'
import SpecRoofSystemTab from '../components/SpecRoofSystemTab'
import ProposalTab from '../components/ProposalTab'
import { LoadingSpinner, ErrorDisplay } from '../components/common'

const TABS = [
  { id: 'specifications', label: 'Specifications', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'plans', label: 'Plans', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'spec-roof-system', label: 'Specified Roof System', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'conditions', label: 'Conditions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'estimate', label: 'Estimate', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'proposal', label: 'Proposal', icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
]

export default function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [activeTab, setActiveTab] = useState('specifications')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProject = async () => {
    try {
      const res = await projectAPI.get(id)
      setProject(res.data)
    } catch (err) {
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay message={error} onRetry={fetchProject} />
  if (!project) return <ErrorDisplay message="Project not found" />

  return (
    <div>
      {/* Breadcrumb + Header */}
      <div className="mb-6">
        <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700 flex items-center mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.project_name || project.name}</h1>
            {project.address && (
              <p className="text-sm text-gray-500 mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {project.address}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            project.status === 'completed' ? 'bg-green-100 text-green-800' :
            project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {project.status || 'New'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'specifications' && (
          <SpecificationsTab projectId={id} project={project} onProjectUpdate={fetchProject} />
        )}
        {activeTab === 'plans' && <PlansTab projectId={id} />}
        {activeTab === 'spec-roof-system' && (
          <SpecRoofSystemTab projectId={id} project={project} onProjectUpdate={fetchProject} />
        )}
        {activeTab === 'conditions' && <ConditionsTab projectId={id} />}
        {activeTab === 'estimate' && <EstimateTab projectId={id} />}
        {activeTab === 'proposal' && <ProposalTab projectId={id} project={project} />}
      </div>
    </div>
  )
            }
