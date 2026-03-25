import { useEffect, useState, useMemo, useCallback } from 'react'
import { Typography, Button, Modal, Form, Input, Select, Upload, message, Card, Space, Popconfirm, Segmented, Spin, Empty, Tag, Tooltip, Collapse, Checkbox, Progress, DatePicker } from 'antd'
import { InboxOutlined, DeleteOutlined, FilePdfOutlined, SearchOutlined, UploadOutlined, PlusOutlined, CalendarOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { API_BASE } from '../lib/config'
import { useAuth } from '../lib/AuthContext'

const { Text, Title } = Typography
const STORAGE_BASE = API_BASE.replace('/api', '/storage')

export function meta() {
  return [
    { title: 'SUB-ARO / NTA | StuFAPs' },
    { name: 'description', content: 'Manage SUB-ARO and NTA files' },
  ]
}

export default function SUB_ARO_NTA() {
  const { getAccess, permissions } = useAuth()
  const canEdit = getAccess('sub-aro-nta') === 'full'
  const isMasterAdmin = permissions?.role === 'master_admin'
  const [fiscalYears, setFiscalYears] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [selectedFY, setSelectedFY] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('SUB-ARO')
  const [editingFileId, setEditingFileId] = useState(null)
  const [scholarshipPrograms, setScholarshipPrograms] = useState([])
  const [subAroFiles, setSubAroFiles] = useState([])
  const [subAroBreakdown, setSubAroBreakdown] = useState([])
  const [filteredSubAroForModal, setFilteredSubAroForModal] = useState([])
  const [loadingSubAroFilter, setLoadingSubAroFilter] = useState(false)
  const [previousBreakdown, setPreviousBreakdown] = useState([]) // Track original data when editing

  /* ── Helper: Calculate remaining balance for a SubAro ── */
  const getSubAroRemainingBalance = useCallback((subAro) => {
    // actualObligation = budget + operational_cost
    const actualObligation = (parseFloat(subAro.budget) || 0) + (parseFloat(subAro.Operational_Cost) || 0)
    // disbursed from the database
    const disbursed = parseFloat(subAro.disbursed) || 0
    // remaining = obligation - disbursed (what's left to allocate to NTAs)
    return Math.max(actualObligation - disbursed, 0)
  }, [])

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    try {
      const [fyRes, subAroRes, ntaRes, filterRes] = await Promise.all([
        fetch(`${API_BASE}/fiscal-years`).then(r => r.json()),
        fetch(`${API_BASE}/files/sub-aro`).then(r => r.json()),
        fetch(`${API_BASE}/files/nta`).then(r => r.json()),
        fetch(`${API_BASE}/students/filter-options`).then(r => r.json()),
      ])
      setFiscalYears(Array.isArray(fyRes) ? fyRes : [])
      setScholarshipPrograms(filterRes.scholarshipPrograms || [])
      
      const subAroFilesArray = (Array.isArray(subAroRes) ? subAroRes : [])
      setSubAroFiles(subAroFilesArray)
      
      // Add filetype back for frontend logic
      const subAroWithType = subAroFilesArray.map(f => ({ ...f, filetype: 'SUB-ARO' }))
      const ntaFiles = (Array.isArray(ntaRes) ? ntaRes : []).map(f => ({ ...f, filetype: 'NTA' }))
      setUploadedFiles([...subAroWithType, ...ntaFiles])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── Filter SUB-ARO files when fiscal year or scholarship program changes in modal ── */
  useEffect(() => {
    const selectedYearSuffix = form.getFieldValue('yearsuffix')
    const selectedScholarshipProgram = form.getFieldValue('scholarship_program')
    
    if (!selectedYearSuffix) {
      setFilteredSubAroForModal([])
      return
    }
    
    setLoadingSubAroFilter(true)
    // Use setTimeout to give visual feedback of loading state
    const timer = setTimeout(() => {
      let filtered = subAroFiles.filter(f => f.yearsuffix === selectedYearSuffix)
      
      // If scholarship program is selected, filter by it too
      if (selectedScholarshipProgram) {
        filtered = filtered.filter(f => f.scholarship_program === selectedScholarshipProgram)
      }
      
      // Only show SubAros that still have remaining balance (not fully disbursed)
      // This enables many-to-many: one SubAro can be in multiple NTAs as long as it has undisbursed balance
      // Multiple NTAs can allocate to the same SubAro without consuming the balance
      filtered = filtered.filter(f => getSubAroRemainingBalance(f) > 0)
      
      setFilteredSubAroForModal(filtered)
      setLoadingSubAroFilter(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [subAroFiles, getSubAroRemainingBalance])

  /* ── Handle fiscal year change in modal ── */
  const handleFiscalYearChange = (yearsuffix) => {
    if (!yearsuffix) {
      setFilteredSubAroForModal([])
      return
    }
    
    setLoadingSubAroFilter(true)
    const timer = setTimeout(() => {
      let filtered = subAroFiles.filter(f => f.yearsuffix === yearsuffix)
      console.log('After year filter:', {
        year: yearsuffix,
        count: filtered.length,
        programs: [...new Set(filtered.map(f => f.scholarship_program))]
      })
      
      // Also filter by scholarship program if selected
      const selectedScholarshipProgram = form.getFieldValue('scholarship_program')
      if (selectedScholarshipProgram) {
        console.log('Filtering by scholarship program:', selectedScholarshipProgram)
        filtered = filtered.filter(f => f.scholarship_program === selectedScholarshipProgram)
        console.log('After scholarship program filter:', filtered.length)
      }
      
      // Only show SubAros with undisbursed balance (many-to-many relationship)
      // Multiple NTAs can allocate to the same SubAro as long as it has remaining balance
      filtered = filtered.filter(f => {
        const remaining = getSubAroRemainingBalance(f)
        return remaining > 0
      })
      console.log('After remaining balance filter:', filtered.length)
      
      setFilteredSubAroForModal(filtered)
      setLoadingSubAroFilter(false)
    }, 100)
  }

  /* ── Handle scholarship program change in modal ── */
  const handleScholarshipProgramChange = () => {
    const selectedYearSuffix = form.getFieldValue('yearsuffix')
    const selectedScholarshipProgram = form.getFieldValue('scholarship_program')
    
    console.log('Scholarship Program Changed:', { 
      selectedYearSuffix, 
      selectedScholarshipProgram, 
      totalSubAros: subAroFiles.length 
    })
    
    if (!selectedYearSuffix) {
      setFilteredSubAroForModal([])
      return
    }
    
    setLoadingSubAroFilter(true)
    const timer = setTimeout(() => {
      let filtered = subAroFiles.filter(f => f.yearsuffix === selectedYearSuffix)
      console.log('After year filter:', filtered.length, 'SubAros')
      
      if (selectedScholarshipProgram) {
        console.log('Filtering by scholarship program:', selectedScholarshipProgram)
        console.log('Available programs in filtered SubAros:', [...new Set(filtered.map(f => f.scholarship_program))])
        filtered = filtered.filter(f => f.scholarship_program === selectedScholarshipProgram)
        console.log('After scholarship program filter:', filtered.length, 'SubAros')
      }
      
      // Only show SubAros with undisbursed balance (many-to-many relationship)
      // Multiple NTAs can allocate to the same SubAro as long as it has remaining balance
      filtered = filtered.filter(f => {
        const remaining = getSubAroRemainingBalance(f)
        return remaining > 0
      })
      console.log('After remaining balance filter:', filtered.length, 'SubAros')
      
      setFilteredSubAroForModal(filtered)
      setLoadingSubAroFilter(false)
    }, 50)
  }

  /* ── Filtered files ── */
  const filteredFiles = useMemo(() => {
    let list = uploadedFiles.filter(f => f.filetype === activeTab)
    if (selectedFY) list = list.filter(f => f.yearsuffix === selectedFY)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(f =>
        f.filename?.toLowerCase().includes(q) ||
        f.number_count?.toLowerCase().includes(q) ||
        `${f.yearsuffix}-${f.number_count}`.toLowerCase().includes(q)
      )
    }
    // Sort: latest years first, then newest files first
    return list.sort((a, b) => {
      const yearDiff = (b.yearsuffix || '').localeCompare(a.yearsuffix || '')
      if (yearDiff !== 0) return yearDiff
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [uploadedFiles, activeTab, selectedFY, searchQuery])

  /* ── File counts per tab ── */
  const fileCounts = useMemo(() => {
    const sub = uploadedFiles.filter(f => f.filetype === 'SUB-ARO' && (!selectedFY || f.yearsuffix === selectedFY)).length
    const nta = uploadedFiles.filter(f => f.filetype === 'NTA' && (!selectedFY || f.yearsuffix === selectedFY)).length
    return { 'SUB-ARO': sub, NTA: nta }
  }, [uploadedFiles, selectedFY])

  /* ── Add fiscal year ── */
  const handleAddFiscalYear = async () => {
    try {
      const latest = fiscalYears.length > 0 ? Math.max(...fiscalYears.map(fy => parseInt(fy.fiscal_year))) : 2020
      const res = await fetch(`${API_BASE}/fiscal-years`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscal_year: String(latest + 1) }),
      })
      if (!res.ok) throw new Error()
      const newFY = await res.json()
      setFiscalYears(prev => [...prev, newFY])
      setSelectedFY(newFY.year_suffix)
      message.success(`FY ${newFY.fiscal_year} added`)
    } catch { message.error('Failed to add fiscal year') }
  }

  /* ── Upload / Edit ── */
  const handleSubmitFile = async (values) => {
    // For create: file is required. For edit: file is optional
    if (!editingFileId && fileList.length === 0) { message.error('Please select a PDF file'); return }
    
    // For NTA: check that sub_aro_breakdown is not empty
    if (activeTab === 'NTA' && (!subAroBreakdown || subAroBreakdown.length === 0)) { 
      message.error('Please add at least one SUB-ARO'); return 
    }
    
    setLoading(true)
    try {
      const fd = new FormData()
      if (fileList.length > 0) {
        fd.append('file', fileList[0].originFileObj)
      }
      fd.append('filename', values.filename)
      fd.append('yearsuffix', values.yearsuffix)
      fd.append('number_count', values.number_count)
      if (values.upload_date) {
        fd.append('upload_date', values.upload_date.format('YYYY-MM-DD HH:mm:ss'))
      }
      
      if (activeTab === 'SUB-ARO') {
        fd.append('budget', values.budget || '')
        fd.append('Operational_Cost', values.Operational_Cost || '')
        fd.append('scholarship_program', values.scholarship_program || '')
        fd.append('number_of_grantees', values.number_of_grantees || '')
      } else {
        // For NTA: send sub_aro_breakdown as JSON string within FormData
        const subAroAssignments = subAroBreakdown.map(item => ({
          sub_aro_id: item.sub_aro_id,
          nta_budget_allocated: item.budget
        }))
        fd.append('sub_aro_assignments', JSON.stringify(subAroAssignments))
        fd.append('scholarship_program', values.scholarship_program || '')
      }
      
      const endpoint = activeTab === 'SUB-ARO' ? 'files/sub-aro' : 'files/nta'
      const url = editingFileId ? `${API_BASE}/${endpoint}/${editingFileId}` : `${API_BASE}/${endpoint}`
      const method = editingFileId ? 'PUT' : 'POST'
      
      console.log(`Uploading to: ${url}`, { endpoint, method, fileCount: fileList.length })
      
      const res = await fetch(url, {
        method: method,
        body: fd
      })
      
      console.log(`Response status: ${res.status}`)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Upload error response:', res.status, errorText)
        try {
          const errorJson = JSON.parse(errorText)
          console.error('Error details:', errorJson)
        } catch (e) {}
        throw new Error(`Server responded with ${res.status}`)
      }
      
      const responseData = await res.json()
      console.log('Upload success:', responseData)
      message.success(editingFileId ? 'File updated' : 'File uploaded')
      setIsModalVisible(false)
      form.resetFields()
      setFileList([])
      setSubAroBreakdown([])
      setEditingFileId(null)
      fetchAll()
    } catch (err) {
      console.error('Upload error details:', err)
      message.error(`Operation failed: ${err.message}`)
    }
    finally { setLoading(false) }
  }

  /* ── Edit handler ── */
  const handleEditFile = (file) => {
    setEditingFileId(file.id)
    form.setFieldsValue({
      filename: file.filename,
      yearsuffix: file.yearsuffix,
      number_count: file.number_count,
      upload_date: file.upload_date ? dayjs(file.upload_date) : dayjs(file.created_at),
    })
    
    if (file.filetype === 'SUB-ARO') {
      form.setFieldsValue({
        budget: file.budget,
        Operational_Cost: file.Operational_Cost,
        scholarship_program: file.scholarship_program,
        number_of_grantees: file.number_of_grantees,
      })
    } else {
      // NTA: set the breakdown and total_budget
      setSubAroBreakdown(file.sub_aro_breakdown || [])
      setPreviousBreakdown(JSON.parse(JSON.stringify(file.sub_aro_breakdown || []))) // Store original for diff detection
      form.setFieldsValue({
        total_budget: file.total_budget,
        scholarship_program: file.scholarship_program,
      })
    }
    
    setFileList([])
    setIsModalVisible(true)
  }

  /* ── Delete ── */
  const handleDelete = async (id) => {
    try {
      const endpoint = activeTab === 'SUB-ARO' ? 'files/sub-aro' : 'files/nta'
      const res = await fetch(`${API_BASE}/${endpoint}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      message.success('Deleted')
      setUploadedFiles(prev => prev.filter(f => f.id !== id))
    } catch { message.error('Delete failed') }
  }

  /* ── Helpers ── */
  const getTitle = (f) => {
    const fy = fiscalYears.find(y => y.year_suffix === f.yearsuffix)
    if (f.filetype === 'NTA') {
      return `NTA-${fy?.fiscal_year || '????'}-${f.number_count}`
    } else {
      return `CHEDRO IV-${fy?.fiscal_year || '????'}-${f.number_count}`
    }
  }

  const openFile = (path) => window.open(`${STORAGE_BASE}/${path}`, '_blank')

  /* ── Sub-ARO NTA obligation tracking ── */
  // Calculate total amount obligated for a Sub-ARO across ALL NTAs
  const getSubAroTotalNtaObligated = useCallback((subAroId, excludeNtaId = null) => {
    const ntaFiles = uploadedFiles.filter(f => f.filetype === 'NTA' && f.assignments?.length > 0)
    let total = 0
    ntaFiles.forEach(nta => {
      if (excludeNtaId && nta.id === excludeNtaId) return
      nta.assignments.forEach(item => {
        if (item.sub_aro_id === subAroId) {
          total += parseFloat(item.nta_budget_allocated || 0)
        }
      })
    })
    return total
  }, [uploadedFiles])

  // Remaining amount available for new NTAs = actual obligation - total already obligated by NTAs
  const getSubAroRemainingForNTAs = useCallback((subAroId, excludeNtaId = null) => {
    const subAro = subAroFiles.find(s => s.id === subAroId)
    if (!subAro) return 0
    const actualObligation = parseFloat(subAro.budget || 0) + parseFloat(subAro.Operational_Cost || 0)
    const totalObligated = getSubAroTotalNtaObligated(subAroId, excludeNtaId)
    return Math.max(actualObligation - totalObligated, 0)
  }, [subAroFiles, getSubAroTotalNtaObligated])

  // Check if a Sub-ARO is fully obligated across all NTAs
  const isSubAroFullyObligated = useCallback((subAroId, excludeNtaId = null) => {
    return getSubAroRemainingForNTAs(subAroId, excludeNtaId) <= 0
  }, [getSubAroRemainingForNTAs])

  // Auto-distribute NTA budget across selected Sub-AROs (waterfall)
  const redistributeNtaBudget = useCallback((ntaBudget, breakdown, excludeNtaId = null) => {
    let remaining = parseFloat(ntaBudget) || 0
    return breakdown.map(item => {
      const maxAllocation = getSubAroRemainingForNTAs(item.sub_aro_id, excludeNtaId)
      const currentAllocation = Math.min(maxAllocation, remaining)
      remaining -= currentAllocation
      return { ...item, budget: currentAllocation }
    })
  }, [getSubAroRemainingForNTAs])

  // Helper: get snapshot-aware values from a breakdown item (prefers saved snapshot, falls back to live)
  const getBreakdownValues = useCallback((item) => {
    const subAro = subAroFiles.find(s => s.id === item.sub_aro_id)
    const actualObligation = item.actual_obligation != null ? parseFloat(item.actual_obligation) : (parseFloat(subAro?.budget || 0) + parseFloat(subAro?.Operational_Cost || 0))
    const disbursed = item.disbursed != null ? parseFloat(item.disbursed) : parseFloat(subAro?.disbursed || 0)
    const remainingBalance = item.remaining_balance != null ? parseFloat(item.remaining_balance) : Math.max(actualObligation - disbursed, 0)
    const grantees = item.number_of_grantees != null ? parseInt(item.number_of_grantees) : parseInt(subAro?.number_of_grantees || 0)
    const granted = item.granted_count != null ? parseInt(item.granted_count) : parseInt(subAro?.granted_count || 0)
    const undisbursedCount = item.undisbursed_count != null ? parseInt(item.undisbursed_count) : Math.max(grantees - granted, 0)
    const carryoverBalance = item.carryover_balance != null ? parseFloat(item.carryover_balance) : 0
    const carryoverUndisbursedCount = item.carryover_undisbursed_count != null ? parseInt(item.carryover_undisbursed_count) : undisbursedCount
    return { subAro, actualObligation, disbursed, remainingBalance, grantees, granted, undisbursedCount, scholarshipProgram: item.scholarship_program || subAro?.scholarship_program, carryoverBalance, carryoverUndisbursedCount }
  }, [subAroFiles])

  // Helper: get carryover details for a SubAro (for display in modal/breakdown)
  const getCarryoverDetails = useCallback((subAroId, excludeNtaId = null) => {
    const subAro = subAroFiles.find(s => s.id === subAroId)
    if (!subAro) return null
    const actualObligation = parseFloat(subAro.budget || 0) + parseFloat(subAro.Operational_Cost || 0)
    const totalAllocated = getSubAroTotalNtaObligated(subAroId, excludeNtaId)
    const carryoverBalance = Math.max(actualObligation - totalAllocated, 0)
    const undisbursedCount = parseInt(subAro.number_of_grantees || 0) - parseInt(subAro.granted_count || 0)
    return { carryoverBalance, undisbursedCount, totalAllocated, actualObligation }
  }, [subAroFiles, getSubAroTotalNtaObligated])

  // Helper: get SubAro allocation tracking - compare with immediately previous NTA only
  const getSubAroDifferences = useCallback((currentItem, subAroId, currentNtaId) => {
    const subAro = subAroFiles.find(s => s.id === subAroId)
    if (!subAro) return { allocation: null }
    
    const actualObligation = parseFloat(subAro.budget || 0) + parseFloat(subAro.Operational_Cost || 0)
    
    // Get all NTA files sorted by upload date
    const ntaFiles = uploadedFiles
      .filter(f => f.filetype === 'NTA' && f.assignments?.length > 0)
      .sort((a, b) => {
        const dateA = new Date(a.upload_date || a.created_at)
        const dateB = new Date(b.upload_date || b.created_at)
        return dateA - dateB
      })
    
    // Find current NTA position
    const currentNtaIndex = ntaFiles.findIndex(nta => nta.id === currentNtaId)
    
    // Get immediately previous NTA (if it exists)
    let allocation = null
    if (currentNtaIndex > 0) {
      const previousNta = ntaFiles[currentNtaIndex - 1]
      const subAroAlloc = previousNta.assignments.find(item => item.sub_aro_id === subAroId)
      
      if (subAroAlloc) {
        const fy = fiscalYears.find(y => y.year_suffix === previousNta.yearsuffix)
        allocation = {
          ntaName: `NTA-${fy?.fiscal_year || '????'}-${previousNta.number_count}`,
          allocated: parseFloat(subAroAlloc.nta_budget_allocated || 0),
          uploadDate: previousNta.upload_date || previousNta.created_at,
        }
      }
    }
    
    // Calculate total allocated by the previous NTA
    const totalAllocatedByPrev = allocation ? allocation.allocated : 0
    const remaining = Math.max(actualObligation - totalAllocatedByPrev, 0)
    
    return { 
      allocation,
      actualObligation,
      totalAllocatedByPrev,
      remaining,
      hasAllocation: allocation !== null,
      isFirstNta: currentNtaIndex === 0,
    }
  }, [uploadedFiles, subAroFiles, fiscalYears])

  // Helper: get differences between current and previous breakdown when editing
  const getEditDifferences = useCallback((breakdownIndex) => {
    if (previousBreakdown.length === 0) return {}
    
    const currentItem = subAroBreakdown[breakdownIndex]
    const previousItem = previousBreakdown[breakdownIndex]
    
    if (!currentItem || !previousItem) return {}
    
    const differences = {}
    const compareFields = [
      { field: 'budget', label: 'Budget', type: 'float' },
      { field: 'actual_obligation', label: 'Actual Obligation', type: 'float' },
      { field: 'disbursed', label: 'Disbursed', type: 'float' },
      { field: 'number_of_grantees', label: 'Grantees', type: 'int' },
      { field: 'granted_count', label: 'Granted', type: 'int' },
    ]

    compareFields.forEach(({ field, label, type }) => {
      const curr = type === 'float' ? parseFloat(currentItem[field] || 0) : parseInt(currentItem[field] || 0)
      const prev = type === 'float' ? parseFloat(previousItem[field] || 0) : parseInt(previousItem[field] || 0)
      
      if (curr !== prev) {
        differences[field] = {
          label,
          current: curr,
          previous: prev,
          change: curr - prev,
          percentChange: prev !== 0 ? ((curr - prev) / prev * 100).toFixed(2) : null,
        }
      }
    })

    return differences
  }, [subAroBreakdown, previousBreakdown])

  const selectedFYObj = fiscalYears.find(fy => fy.year_suffix === selectedFY)

  /* ── Loading state ── */
  if (initialLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 16, fontSize: 15 }}>Loading...</Text>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', minHeight: 'calc(100vh - 72px)', margin: -24 }}>

      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 600 }}>SUB-ARO / NTA</Title>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>Sub Allotment Release Order / Notice of Transfer Allocation</Text>
          </div>
          {canEdit && (
          <Button type="primary" icon={<UploadOutlined />} onClick={() => { form.resetFields(); setFileList([]); setSubAroBreakdown([]); setFilteredSubAroForModal([]); setLoadingSubAroFilter(false); setIsModalVisible(true) }}>
            Upload File
          </Button>
          )}
        </div>
      </div>

      {/* Toolbar: Tab + Fiscal Year + Search */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Segmented
          block
          value={activeTab}
          onChange={(v) => { setActiveTab(v); setSearchQuery('') }}
          options={[
            { label: <span>Sub Allotment Release Order <Tag style={{ marginLeft: 6, fontSize: 11 }}>{fileCounts['SUB-ARO']}</Tag></span>, value: 'SUB-ARO' },
            { label: <span>Notice of Transfer Allocation <Tag style={{ marginLeft: 6, fontSize: 11 }}>{fileCounts.NTA}</Tag></span>, value: 'NTA' },
          ]}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <Select
            value={selectedFY}
            onChange={v => setSelectedFY(v)}
            style={{ width: 160 }}
            placeholder="Fiscal Year"
            allowClear
          >
            {fiscalYears.map(fy => (
              <Select.Option key={fy.id} value={fy.year_suffix}>
                FY {fy.fiscal_year} ({fy.year_suffix})
              </Select.Option>
            ))}
          </Select>
          {canEdit && activeTab === 'SUB-ARO' && (
            <Button size="small" icon={<PlusOutlined />} onClick={handleAddFiscalYear}>Add FY</Button>
          )}
        </div>

        <Input
          placeholder="Search files..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
          style={{ width: 240, marginLeft: 'auto' }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {/* Info */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 15 }}>
            {activeTab === 'SUB-ARO' ? 'Sub Allotment Release Order' : 'Notice of Transfer Allocation'}
          </Text>
          {selectedFYObj && (
            <Tag color="blue">FY {selectedFYObj.fiscal_year}</Tag>
          )}
          <Text type="secondary" style={{ fontSize: 13 }}>
            — {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
          </Text>
        </div>

        {/* File grid */}
        {filteredFiles.length === 0 ? (
          <Empty
            description={searchQuery.trim() ? 'No files match your search' : `No ${activeTab} files found`}
            style={{ padding: '60px 0' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredFiles.map(f => (
              <Card
                key={f.id}
                size="small"
                style={{ borderRadius: 10, border: '1px solid #f0f0f0' }}
                styles={{ body: { padding: 0 } }}
              >
                {/* Header */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: activeTab === 'NTA' ? '#f0f5ff' : '#e6f7ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: activeTab === 'NTA' ? '#2f54eb' : '#1890ff', fontSize: 18, flexShrink: 0,
                  }}>
                    <FilePdfOutlined />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, display: 'block' }}>{getTitle(f)}</Text>
                    <Tooltip title={f.filename} placement="top">
                      <Text
                        style={{ fontSize: 12, color: '#1890ff', cursor: 'pointer', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        onClick={() => openFile(f.file)}
                      >
                        {f.filename}
                      </Text>
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {f.upload_date ? dayjs(f.upload_date).format('DD/MM/YYYY') : dayjs(f.created_at).format('DD/MM/YYYY')}
                    </Text>
                  </div>

                  {/* Actions */}
                  {canEdit && (
                  <Space size={4}>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditFile(f)} />
                    <Popconfirm title="Delete this file?" onConfirm={() => handleDelete(f.id)} okText="Delete" okButtonProps={{ danger: true }}>
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                  )}
                </div>

                {/* Details Dropdown */}
                {(f.budget || f.total_budget || f.Operational_Cost || f.disbursed || f.scholarship_program || f.number_of_grantees || (f.assignments && f.assignments.length > 0)) && (
                  <Collapse
                    items={[
                      {
                        key: f.id,
                        label: <span style={{ fontSize: 12, color: '#8c8c8c' }}>Details</span>,
                        children: (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* For SUB-ARO: 3-column layout with scholarship program header */}
                            {f.filetype === 'SUB-ARO' ? (
                              <>
                                {/* Scholarship Program Header */}
                                {f.scholarship_program && (
                                  <div style={{ padding: '8px 12px', background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f', marginBottom: 4 }}>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>Scholarship Program</Text>
                                    <Text strong style={{ fontSize: 14 }}>{f.scholarship_program}</Text>
                                  </div>
                                )}

                                {/* 3-Column Layout: Card | Chart | Chart */}
                                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 1fr', gap: 16 }}>
                                  {/* Card for Column 1 & 2 */}
                                  <div>
                                    <Card size="small" style={{ borderRadius: 8, height: '100%', background: '#fafafa' }} styles={{ body: { padding: '12px' } }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        {/* Column 1: Financial */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Fund Transfer</Text>
                                            <Text strong style={{ fontSize: 12, color: '#0891B2' }}>
                                              ₱{parseFloat(f.budget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Operational Cost</Text>
                                            <Text strong style={{ fontSize: 12, color: '#F97316' }}>
                                              ₱{parseFloat(f.Operational_Cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Total Amount</Text>
                                            <Text strong style={{ fontSize: 12, color: '#2563EB' }}>
                                              ₱{(parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Actual Obligation</Text>
                                            <Text strong style={{ fontSize: 12, color: '#DC2626' }}>
                                              ₱{(parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                        </div>

                                        {/* Column 2: Grantees & Disbursement */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 12, borderLeft: '2px solid #E5E7EB' }}>
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>No. of Grantees</Text>
                                            <Text strong style={{ fontSize: 12, color: '#7C3AED' }}>{f.number_of_grantees || 0}</Text>
                                          </div>
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Granted</Text>
                                            <Text strong style={{ fontSize: 12, color: '#10B981' }}>{f.granted_count || 0}</Text>
                                          </div>
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Disbursement %</Text>
                                            <Text strong style={{ fontSize: 12, color: (parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)) > 0 ? '#8B5CF6' : '#9CA3AF' }}>
                                              {(parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)) > 0
                                                ? ((parseFloat(f.disbursed || 0) / (parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0))) * 100).toFixed(2)
                                                : '0.00'}%
                                            </Text>
                                          </div>
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Actual Disbursement</Text>
                                            <Text strong style={{ fontSize: 12, color: '#F59E0B' }}>
                                              ₱{parseFloat(f.disbursed || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                        </div>
                                      </div>
                                    </Card>
                                  </div>

                                  {/* Column 3: Pie Chart 1 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    {(() => {
                                      const totalObligation = parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)
                                      const disbursed = parseFloat(f.disbursed || 0)
                                      const remaining = Math.max(totalObligation - disbursed, 0)
                                      const obligationData = [
                                        { name: 'Disbursed', value: disbursed },
                                        { name: 'Remaining', value: remaining },
                                      ]
                                      const OB_COLORS = ['#10B981', '#FCD34D']
                                      return (
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', textAlign: 'center', marginBottom: 4 }}>Obligation vs Disbursement</Text>
                                          <ResponsiveContainer width="100%" height={200}>
                                            <PieChart margin={{ top: 20, right: 30, bottom: 10, left: 30 }}>
                                              <Pie
                                                data={obligationData}
                                                cx="50%" cy="45%"
                                                innerRadius={30} outerRadius={48}
                                                paddingAngle={3}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={{ stroke: '#d9d9d9', strokeWidth: 1 }}
                                                style={{ fontSize: 9 }}
                                              >
                                                {obligationData.map((_, i) => <Cell key={i} fill={OB_COLORS[i]} />)}
                                              </Pie>
                                              <RechartsTooltip formatter={(val) => `₱${parseFloat(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                                            </PieChart>
                                          </ResponsiveContainer>
                                        </div>
                                      )
                                    })()}
                                  </div>

                                  {/* Column 4: Pie Chart 2 */}
                                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    {(() => {
                                      const total = parseInt(f.number_of_grantees || 0)
                                      const granted = parseInt(f.granted_count || 0)
                                      const notGranted = Math.max(total - granted, 0)
                                      const granteeData = [
                                        { name: 'Granted', value: granted },
                                        { name: 'Not Yet', value: notGranted },
                                      ]
                                      const GR_COLORS = ['#EF4444', '#6B7280']
                                      return (
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', textAlign: 'center', marginBottom: 4 }}>Granted vs Not Yet Granted</Text>
                                          <ResponsiveContainer width="100%" height={200}>
                                            <PieChart margin={{ top: 20, right: 30, bottom: 10, left: 30 }}>
                                              <Pie
                                                data={granteeData}
                                                cx="50%" cy="45%"
                                                innerRadius={30} outerRadius={48}
                                                paddingAngle={3}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={{ stroke: '#d9d9d9', strokeWidth: 1 }}
                                                style={{ fontSize: 9 }}
                                              >
                                                {granteeData.map((_, i) => <Cell key={i} fill={GR_COLORS[i]} />)}
                                              </Pie>
                                              <RechartsTooltip formatter={(val, name) => [val + ' scholars', name]} />
                                              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                                            </PieChart>
                                          </ResponsiveContainer>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                </div>
                              </>
                            ) : (
                              /* For NTA: SUB-ARO Breakdown + Summary Card + Pie Chart */
                              <>
                                {f.assignments && f.assignments.length > 0 && (
                                  <div style={{ marginBottom: 20 }}>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>SUB-ARO Breakdown</Text>
                                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                                      {f.assignments.map((item, idx) => {
                                        const subAro = item.subAro
                                        const actualObligation = item.actual_obligation ? parseFloat(item.actual_obligation) : 0
                                        const disbursed = item.disbursed ? parseFloat(item.disbursed) : 0
                                        const remainingBalance = item.remaining_balance ? parseFloat(item.remaining_balance) : Math.max(actualObligation - disbursed, 0)
                                        const grantees = item.number_of_grantees ? parseInt(item.number_of_grantees) : 0
                                        const granted = item.granted_count ? parseInt(item.granted_count) : 0
                                        const undisbursedCount = item.undisbursed_count ? parseInt(item.undisbursed_count) : Math.max(grantees - granted, 0)
                                        const carryoverBalance = item.carryover_balance ? parseFloat(item.carryover_balance) : 0
                                        const carryoverUndisbursedCount = item.carryover_undisbursed_count ? parseInt(item.carryover_undisbursed_count) : undisbursedCount
                                        const disbursementPercent = actualObligation > 0 ? ((disbursed / actualObligation) * 100).toFixed(2) : '0.00'
                                        const grantedPercent = grantees > 0 ? ((granted / grantees) * 100).toFixed(2) : '0.00'
                                        const hasCarryover = carryoverBalance > 0 || carryoverUndisbursedCount > 0
                                        return (
                                          <div key={idx} style={{ paddingBottom: idx < f.assignments.length - 1 ? 12 : 8, borderBottom: idx < f.assignments.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                                            {/* Header with SUB-ARO name and scholarship program */}
                                            <div style={{ padding: '8px 12px', paddingBottom: 8, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center' }}>
                                              <Text strong style={{ fontSize: 12 }}>
                                                {item.sub_aro_reference ? `CHEDRO IV-${item.sub_aro_reference}` : 'Unknown SUB-ARO'}
                                                {subAro?.scholarship_program && (
                                                  <span style={{ marginLeft: 8, marginRight: 8 }}>-</span>
                                                )}
                                                {subAro?.scholarship_program && (
                                                  <span style={{ fontWeight: 500, color: '#8c8c8c' }}>
                                                    {subAro.scholarship_program}
                                                  </span>
                                                )}
                                              </Text>
                                            </div>
                                            
                                            {/* Row 1: Actual Obligation, Disbursed, Remaining Balance */}
                                            <div style={{ padding: '8px 12px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                                              <div style={{ flex: 1, textAlign: 'left' }}>
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Actual Obligation</Text>
                                                <Text strong style={{ fontSize: 12, color: '#DC2626' }}>
                                                  ₱{actualObligation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Text>
                                              </div>
                                              <div style={{ flex: 1, textAlign: 'left' }}>
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Disbursed</Text>
                                                <Text strong style={{ fontSize: 12, color: '#10B981' }}>
                                                  ₱{disbursed.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Text>
                                              </div>
                                              <div style={{ flex: 1, textAlign: 'left' }}>
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Obligation Disbursement %</Text>
                                                <Text strong style={{ fontSize: 12, color: actualObligation > 0 ? '#8B5CF6' : '#9CA3AF' }}>
                                                  {disbursementPercent}%
                                                </Text>
                                              </div>
                                            </div>

                                            {/* Row 2: Remaining Balance, Grantees, Granted */}
                                            <div style={{ padding: '8px 12px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                                              <div style={{ flex: 1, textAlign: 'left' }}>
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Remaining Balance</Text>
                                                <Text strong style={{ fontSize: 12, color: remainingBalance > 0 ? '#F59E0B' : '#10B981' }}>
                                                  ₱{remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Text>
                                              </div>
                                              <div style={{ flex: 1, textAlign: 'left' }}>
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Grantees</Text>
                                                <Text strong style={{ fontSize: 12, color: '#7C3AED' }}>
                                                  {grantees}
                                                </Text>
                                              </div>
                                              <div style={{ flex: 1, textAlign: 'left' }}>
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Granted</Text>
                                                <Text strong style={{ fontSize: 12, color: '#10B981' }}>
                                                  {granted} {grantees > 0 && <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 10 }}>({grantedPercent}%)</span>}
                                                </Text>
                                              </div>
                                            </div>

                                            {/* Carryover Section */}
                                            {hasCarryover && (
                                              <div style={{ padding: '8px 12px', background: '#FEF3C7', borderTop: '1px solid #FDE68A', display: 'flex', gap: 24, alignItems: 'flex-start', borderRadius: '0 0 4px 4px' }}>
                                                <div style={{ flex: 1, textAlign: 'left' }}>
                                                  <Text type="warning" style={{ fontSize: 10, display: 'block', marginBottom: 4, fontWeight: 600 }}>💼 Carryover Balance</Text>
                                                  <Text strong style={{ fontSize: 12, color: '#D97706' }}>
                                                    ₱{carryoverBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </Text>
                                                </div>
                                                <div style={{ flex: 1, textAlign: 'left' }}>
                                                  <Text type="warning" style={{ fontSize: 10, display: 'block', marginBottom: 4, fontWeight: 600 }}>📋 Undisbursed Count</Text>
                                                  <Text strong style={{ fontSize: 12, color: '#D97706' }}>
                                                    {carryoverUndisbursedCount} disbursements pending
                                                  </Text>
                                                </div>
                                                <div style={{ flex: 1, textAlign: 'left' }}>
                                                  <Text type="warning" style={{ fontSize: 10, display: 'block', marginBottom: 4, fontWeight: 600 }}>ℹ️ Status</Text>
                                                  <Text strong style={{ fontSize: 12, color: '#D97706' }}>
                                                    Available in NTA-2
                                                  </Text>
                                                </div>
                                              </div>
                                            )}

                                            {/* Differences Section - Compare with previous NTA only */}
                                            {(() => {
                                              const diffs = getSubAroDifferences(item, item.sub_aro_id, f.id)
                                              if (!diffs.hasAllocation) return null
                                              
                                              const { allocation, actualObligation, totalAllocatedByPrev, remaining } = diffs
                                              
                                              return (
                                                <div style={{ padding: '8px 12px', background: '#EEF2FF', borderTop: '1px solid #C7D2FE', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, color: '#4F46E5' }}>📊 Previous NTA Allocation</Text>
                                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <div style={{ fontSize: 10, display: 'flex', gap: 12, alignItems: 'center', padding: '4px 0' }}>
                                                      <span style={{ fontWeight: 600, color: '#4F46E5', minWidth: 120 }}>Total Obligation:</span>
                                                      <strong style={{ color: '#DC2626' }}>₱{actualObligation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                    </div>
                                                    
                                                    {allocation && (
                                                      <div style={{ fontSize: 10, display: 'flex', gap: 12, alignItems: 'center', padding: '6px 8px', background: '#FFFFFF', borderRadius: 4, border: '1px solid #E5E7EB' }}>
                                                        <span style={{ fontWeight: 600, color: '#6B7280', minWidth: 120 }}>{allocation.ntaName}:</span>
                                                        <strong style={{ color: '#EC4899' }}>₱{allocation.allocated.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                        <span style={{ color: '#9CA3AF', fontSize: 9 }}>allocated</span>
                                                      </div>
                                                    )}
                                                    
                                                    <div style={{ fontSize: 10, display: 'flex', gap: 12, alignItems: 'center', padding: '6px 8px', background: '#F0FDF4', borderRadius: 4, border: '1px solid #BBEF63' }}>
                                                      <span style={{ fontWeight: 600, color: '#4F46E5', minWidth: 120 }}>Remaining:</span>
                                                      <strong style={{ color: '#16A34A', fontSize: 11 }}>₱{remaining.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                      <span style={{ color: '#15803D', fontSize: 9 }}>for this NTA</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            })()}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Summary Card + Balance Report + Pie Chart */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                  {/* Summary Card Header */}
                                  <Text type="secondary" style={{ fontSize: 11, display: 'block'}}>NTA Breakdown</Text>
                                  <Card size="small" style={{ borderRadius: 8, background: '#fafafa' }} styles={{ body: { padding: '12px' } }}>
                                    {/* NTA Total Budget Header */}
                                    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #E5E7EB', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                      {/* Column 1: Overall Allotment */}
                                      <div>
                                        {(() => {
                                          const totalAllocated = parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.nta_budget_allocated || 0)), 0) || 0)
                                          return (
                                            <>
                                              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Overall Allotment</Text>
                                              <Text strong style={{ fontSize: 16, color: '#1890FF' }}>
                                                ₱{totalAllocated.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </Text>
                                            </>
                                          )
                                        })()}
                                      </div>

                                      {/* Column 2: Disbursed */}
                                      <div>
                                        {(() => {
                                          const totalDisbursed = parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0)
                                          return (
                                            <>
                                              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Disbursed</Text>
                                              <Text strong style={{ fontSize: 16, color: '#10B981' }}>
                                                ₱{totalDisbursed.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </Text>
                                            </>
                                          )
                                        })()}
                                      </div>

                                      {/* Column 3: Remaining Cash */}
                                      <div>
                                        {(() => {
                                          const totalAllocated = parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.nta_budget_allocated || 0)), 0) || 0)
                                          const totalDisbursed = parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0)
                                          const remainingCash = Math.max(totalAllocated - totalDisbursed, 0)
                                          const disbursementPercent = totalAllocated > 0 ? ((totalDisbursed / totalAllocated) * 100).toFixed(2) : '0.00'
                                          return (
                                            <>
                                              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Remaining Cash</Text>
                                              <Text strong style={{ fontSize: 16, color: remainingCash > 0 ? '#F59E0B' : '#10B981' }}>
                                                ₱{remainingCash.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </Text>
                                              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
                                                {disbursementPercent}% disbursed
                                              </Text>
                                            </>
                                          )
                                        })()}
                                      </div>
                                    </div>

                                    {/* Previous NTA Allocation Section */}
                                    {(() => {
                                      // Find if this NTA has any SubAro allocations from a previous NTA
                                      const ntaFiles = uploadedFiles
                                        .filter(file => file.filetype === 'NTA' && file.assignments?.length > 0)
                                        .sort((a, b) => {
                                          const dateA = new Date(a.upload_date || a.created_at)
                                          const dateB = new Date(b.upload_date || b.created_at)
                                          return dateA - dateB
                                        })
                                      
                                      const currentNtaIndex = ntaFiles.findIndex(nta => nta.id === f.id)
                                      if (currentNtaIndex <= 0) return null
                                      
                                      const previousNta = ntaFiles[currentNtaIndex - 1]
                                      const prevFy = fiscalYears.find(y => y.year_suffix === previousNta.yearsuffix)
                                      const prevNtaName = `NTA-${prevFy?.fiscal_year || '????'}-${previousNta.number_count}`
                                      const prevTotalActualObligation = previousNta.assignments?.reduce((sum, item) => sum + (parseFloat(item.actual_obligation || 0)), 0) || 0
                                      const prevTotalDisbursed = previousNta.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0
                                      const prevRemainingBalance = Math.max(prevTotalActualObligation - prevTotalDisbursed, 0)
                                      const prevTotalGrantees = previousNta.assignments?.reduce((sum, item) => sum + (parseInt(item.number_of_grantees || 0)), 0) || 0
                                      const prevTotalGranted = previousNta.assignments?.reduce((sum, item) => sum + (parseInt(item.granted_count || 0)), 0) || 0
                                      const prevUndisbursedCount = Math.max(prevTotalGrantees - prevTotalGranted, 0)
                                      
                                      return (
                                        <div style={{ padding: '12px', background: '#EEF2FF', borderRadius: 4, border: '1px solid #C7D2FE', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                          <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, color: '#4F46E5' }}>📊 Previous NTA Allocation</Text>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                            <div style={{ fontSize: 10 }}>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 2 }}>Previous NTA</Text>
                                              <Text strong style={{ fontSize: 11, color: '#4F46E5' }}>{prevNtaName}</Text>
                                            </div>
                                            <div style={{ fontSize: 10 }}>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 2 }}>Total Obligation</Text>
                                              <Text strong style={{ fontSize: 11, color: '#DC2626' }}>₱{prevTotalActualObligation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                            </div>
                                            <div style={{ fontSize: 10 }}>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 2 }}>Disbursed</Text>
                                              <Text strong style={{ fontSize: 11, color: '#10B981' }}>₱{parseFloat(prevTotalDisbursed).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                            </div>
                                          </div>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingTop: 8, borderTop: '1px solid #C7D2FE' }}>
                                            <div style={{ fontSize: 10 }}>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 2 }}>Remaining Balance</Text>
                                              <Text strong style={{ fontSize: 11, color: '#F59E0B' }}>₱{prevRemainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                                            </div>
                                            <div style={{ fontSize: 10 }}>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 2 }}>Grantees / Granted</Text>
                                              <Text strong style={{ fontSize: 11, color: '#7C3AED' }}>{prevTotalGranted} / {prevTotalGrantees}</Text>
                                            </div>
                                            <div style={{ fontSize: 10 }}>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 2 }}>Undisbursed Count</Text>
                                              <Text strong style={{ fontSize: 11, color: '#DC2626' }}>{prevUndisbursedCount}</Text>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })()}

                                    {/* Three Charts - Horizontally Aligned */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                                      {/* Pie Chart - Disbursement */}
                                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                      {(() => {
                                        const totalDisbursed = parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0)
                                        const totalBudget = parseFloat(f.total_budget || 0)
                                        const remaining = Math.max(totalBudget - totalDisbursed, 0)
                                        const chartData = [
                                          { name: 'Disbursed', value: totalDisbursed },
                                          { name: 'Remaining', value: remaining },
                                        ]
                                        const CHART_COLORS = ['#10B981', '#FCD34D']
                                        return (
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', textAlign: 'center', marginBottom: 4 }}>NTA Disbursement Summary</Text>
                                            <ResponsiveContainer width="100%" height={150}>
                                              <PieChart margin={{ top: 20, right: 30, bottom: 10, left: 0 }}>
                                                <Pie
                                                  data={chartData}
                                                  cx="50%" cy="45%"
                                                  innerRadius={25} outerRadius={40}
                                                  paddingAngle={3}
                                                  dataKey="value"
                                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                  labelLine={{ stroke: '#d9d9d9', strokeWidth: 1 }}
                                                  style={{ fontSize: 8 }}
                                                >
                                                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => `₱${parseFloat(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 8 }} />
                                              </PieChart>
                                            </ResponsiveContainer>
                                          </div>
                                        )
                                      })()}
                                      </div>

                                      {/* Pie Chart - Grantees */}
                                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                      {(() => {
                                        const totalGrantees = f.assignments?.reduce((sum, item) => sum + (parseInt(item.number_of_grantees || 0)), 0) || 0
                                        const totalGranted = f.assignments?.reduce((sum, item) => sum + (parseInt(item.granted_count || 0)), 0) || 0
                                        const notGranted = Math.max(totalGrantees - totalGranted, 0)
                                        const granteeChartData = [
                                          { name: 'Granted', value: totalGranted },
                                          { name: 'Not Granted', value: notGranted },
                                        ]
                                        const GRANTEE_COLORS = ['#10B981', '#EF4444']
                                        return (
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', textAlign: 'center', marginBottom: 4 }}>Overall Grantees</Text>
                                            <ResponsiveContainer width="100%" height={150}>
                                              <PieChart margin={{ top: 20, right: 30, bottom: 10, left: 0 }}>
                                                <Pie
                                                  data={granteeChartData}
                                                  cx="50%" cy="45%"
                                                  innerRadius={25} outerRadius={40}
                                                  paddingAngle={3}
                                                  dataKey="value"
                                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                  labelLine={{ stroke: '#d9d9d9', strokeWidth: 1 }}
                                                  style={{ fontSize: 8 }}
                                                >
                                                  {granteeChartData.map((_, i) => <Cell key={i} fill={GRANTEE_COLORS[i]} />)}
                                                </Pie>
                                                <RechartsTooltip formatter={(val) => `${val} scholars`} />
                                                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 8 }} />
                                              </PieChart>
                                            </ResponsiveContainer>
                                          </div>
                                        )
                                      })()}
                                      </div>

                                      {/* Bar Chart - Budget Data */}
                                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                      {(() => {
                                        const totalDisbursed = parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0)
                                        const remainingCash = Math.max(parseFloat(f.total_budget || 0) - totalDisbursed, 0)
                                        const budgetChartData = [
                                          { name: 'Budget', total_budget: parseFloat(f.total_budget || 0) },
                                          { name: 'Disbursed', disbursed: totalDisbursed },
                                          { name: 'Remaining', remaining_cash: remainingCash },
                                        ]
                                        return (
                                          <div>
                                            <Text type="secondary" style={{ fontSize: 10, display: 'block', textAlign: 'center', marginBottom: 4 }}>Allotment Balance Report</Text>
                                            <ResponsiveContainer width="100%" height={150}>
                                              <BarChart data={budgetChartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="name" style={{ fontSize: 8 }} />
                                                <YAxis style={{ fontSize: 8 }} />
                                                <RechartsTooltip formatter={(val) => `₱${parseFloat(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                                <Bar dataKey="total_budget" fill="#1890ff" name="NTA Total Budget" />
                                                <Bar dataKey="disbursed" fill="#10B981" name="Disbursed" />
                                                <Bar dataKey="remaining_cash" fill="#FCD34D" name="Remaining Cash" />
                                                <Legend wrapperStyle={{ fontSize: 8 }} />
                                              </BarChart>
                                            </ResponsiveContainer>
                                          </div>
                                        )
                                      })()}
                                      </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                      {/* Column 1: Disbursed & Total Obligation */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Total Disbursed</Text>
                                          <Text strong style={{ fontSize: 12, color: '#10B981' }}>
                                            ₱{parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </Text>
                                        </div>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Total Sub-ARO Obligation</Text>
                                          <Text strong style={{ fontSize: 12, color: '#DC2626' }}>
                                            ₱{parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.actual_obligation || 0)), 0) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </Text>
                                        </div>
                                      </div>

                                      {/* Column 2: Sub-ARO count & Disbursement */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 12, borderLeft: '2px solid #E5E7EB' }}>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>No. of Selected Sub-ARO</Text>
                                          <Text strong style={{ fontSize: 12, color: '#7C3AED' }}>{f.assignments?.length || 0}</Text>
                                        </div>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Disbursement %</Text>
                                          <Text strong style={{ fontSize: 12, color: (() => {
                                            const totalObl = f.assignments?.reduce((sum, item) => sum + (parseFloat(item.actual_obligation || 0)), 0) || 0
                                            return totalObl > 0 ? '#8B5CF6' : '#9CA3AF'
                                          })() }}>
                                            {(() => {
                                              const totalObl = f.assignments?.reduce((sum, item) => sum + (parseFloat(item.actual_obligation || 0)), 0) || 0
                                              const totalDisbursed = f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0
                                              return totalObl > 0 ? ((totalDisbursed / totalObl) * 100).toFixed(2) : '0.00'
                                            })()}%
                                          </Text>
                                        </div>
                                      </div>

                                      {/* Column 3: Grantees & Granted */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 12, borderLeft: '2px solid #E5E7EB' }}>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Total Grantees</Text>
                                          <Text strong style={{ fontSize: 12, color: '#7C3AED' }}>
                                            {f.assignments?.reduce((sum, item) => sum + (parseInt(item.number_of_grantees || 0)), 0) || 0}
                                          </Text>
                                        </div>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Granted</Text>
                                          <Text strong style={{ fontSize: 12, color: '#10B981' }}>
                                            {f.assignments?.reduce((sum, item) => sum + (parseInt(item.granted_count || 0)), 0) || 0}
                                          </Text>
                                        </div>
                                      </div>
                                    </div>
                                  </Card>

                                  {/* Balance Report + Pie Chart Below - Stacked Vertically */}
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                                    {/* Left: Balance Report with SubARO Breakdown */}
                                    <Card size="small" style={{ borderRadius: 8, background: '#fafafa' }} styles={{ body: { padding: '16px' } }}>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>Balance Report</Text>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 0 }}>
                                        {/* SubARO Column */}
                                        <div style={{ paddingRight: 16, borderRight: '1px solid #E5E7EB' }}>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600 }}>SubARO</Text>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                                            {f.assignments?.map((item, idx) => {
                                              const subAro = item.subAro
                                              const actualObligation = item.actual_obligation ? parseFloat(item.actual_obligation) : 0
                                              const disbursed = item.disbursed ? parseFloat(item.disbursed) : 0
                                              const remainingBalance = item.remaining_balance ? parseFloat(item.remaining_balance) : Math.max(actualObligation - disbursed, 0)
                                              return (
                                                <div key={idx} style={{ paddingBottom: 8, borderBottom: idx < (f.assignments?.length - 1) ? '1px solid #E5E7EB' : 'none' }}>
                                                  <Text style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                                                    CHEDRO IV-{subAro?.yearsuffix}-{subAro?.number_count}
                                                  </Text>
                                                  <div style={{ fontSize: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                      <Text type="secondary" style={{ fontSize: 10 }}>Actual Obligation:</Text>
                                                      <Text strong style={{ fontSize: 10, color: '#DC2626' }}>
                                                        ₱{actualObligation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                      </Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                      <Text type="secondary" style={{ fontSize: 10 }}>Disbursed:</Text>
                                                      <Text strong style={{ fontSize: 10, color: '#10B981' }}>
                                                        ₱{disbursed.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                      </Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                      <Text type="secondary" style={{ fontSize: 10 }}>Remaining Balance:</Text>
                                                      <Text strong style={{ fontSize: 10, color: '#F59E0B' }}>
                                                        ₱{remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                      </Text>
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            }) || []}
                                          </div>
                                        </div>

                                        {/* Disbursement Column */}
                                        <div style={{ paddingLeft: 16 }}>
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600 }}>Disbursement</Text>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                                            {f.assignments?.map((item, idx) => {
                                              const actualObligation = item.actual_obligation ? parseFloat(item.actual_obligation) : 0
                                              const disbursed = item.disbursed ? parseFloat(item.disbursed) : 0
                                              const disbursementPercent = actualObligation > 0 ? ((disbursed / actualObligation) * 100).toFixed(2) : '0.00'
                                              return (
                                                <div key={idx} style={{ paddingBottom: 8, borderBottom: idx < (f.assignments?.length - 1) ? '1px solid #E5E7EB' : 'none' }}>
                                                  <Text style={{ fontSize: 11, display: 'block', marginBottom: 4, opacity: 0 }}>
                                                    •
                                                  </Text>
                                                  <div style={{ fontSize: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                      <Text type="secondary" style={{ fontSize: 10 }}>Disbursed:</Text>
                                                      <Text strong style={{ fontSize: 10, color: '#10B981' }}>
                                                        ₱{disbursed.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                      </Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                      <Text type="secondary" style={{ fontSize: 10 }}>Percentage:</Text>
                                                      <Text strong style={{ fontSize: 10, color: '#8B5CF6' }}>
                                                        {disbursementPercent}%
                                                      </Text>
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            }) || []}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Total Row */}
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginTop: 12, paddingTop: 12, borderTop: '2px solid #E5E7EB' }}>
                                        <div style={{ paddingRight: 16, borderRight: '1px solid #E5E7EB' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text type="secondary" style={{ fontSize: 10, fontWeight: 600 }}>Total Obligation:</Text>
                                            <Text strong style={{ fontSize: 11, color: '#DC2626' }}>
                                              ₱{parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.actual_obligation || 0)), 0) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text type="secondary" style={{ fontSize: 10, fontWeight: 600 }}>Total Remaining:</Text>
                                            <Text strong style={{ fontSize: 11, color: '#F59E0B' }}>
                                              ₱{(() => {
                                                const totalObl = f.assignments?.reduce((sum, item) => sum + (parseFloat(item.actual_obligation || 0)), 0) || 0
                                                const totalDisbursed = f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0
                                                return Math.max(totalObl - totalDisbursed, 0)
                                              })().toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                        </div>

                                        <div style={{ paddingLeft: 16 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text type="secondary" style={{ fontSize: 10, fontWeight: 600 }}>Total Disbursed:</Text>
                                            <Text strong style={{ fontSize: 11, color: '#10B981' }}>
                                              ₱{parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text type="secondary" style={{ fontSize: 10, fontWeight: 600 }}>Remaining Cash:</Text>
                                            <Text strong style={{ fontSize: 11, color: '#F59E0B' }}>
                                              ₱{Math.max(parseFloat(f.nta_budget || 0) - parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                        </div>
                                      </div>
                                    </Card>
                                  </div>
                                </div>
                              </>                            )}
                          </div>
                        ),
                      }
                    ]}
                    style={{ border: 'none' }}
                  />
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload / Edit Modal */}
      <Modal
        title={editingFileId ? `Edit ${activeTab} File` : `Upload ${activeTab} File`}
        open={isModalVisible}
        onOk={form.submit}
        onCancel={() => { 
          setIsModalVisible(false)
          setEditingFileId(null)
          setSubAroBreakdown([])
          setFilteredSubAroForModal([])
          setLoadingSubAroFilter(false)
        }}
        confirmLoading={loading}
        width={activeTab === 'NTA' ? 600 : 480}
        okText={editingFileId ? 'Update' : 'Upload'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitFile} style={{ marginTop: 16 }}>
          <Form.Item label="PDF File" required={!editingFileId}>
            <Upload.Dragger
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
              accept=".pdf"
              maxCount={1}
              beforeUpload={() => false}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">{editingFileId ? 'Upload new PDF (optional)' : 'Click or drag a PDF here'}</p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item name="filename" label="Sub-Allotment Release Order" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="e.g., Budget Report - January" />
          </Form.Item>

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="yearsuffix" label="Fiscal Year" rules={[{ required: true, message: 'Required' }]} style={{ flex: 1 }}>
              <Select placeholder="Select FY" onChange={handleFiscalYearChange}>
                {fiscalYears.map(fy => (
                  <Select.Option key={fy.id} value={fy.year_suffix}>
                    FY {fy.fiscal_year} ({fy.year_suffix})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="number_count"
              label="Reference No."
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="e.g., 001" />
            </Form.Item>
          </Space>

          <Form.Item name="upload_date" label="Date Uploaded">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          {activeTab === 'SUB-ARO' ? (
            <>
              <Form.Item name="budget" label="Fund Transfer">
                <Input placeholder="0.00" type="number" step="0.01" />
              </Form.Item>

              <Form.Item name="Operational_Cost" label="Operational Cost">
                <Input placeholder="0.00" type="number" step="0.01" />
              </Form.Item>

              <Form.Item name="scholarship_program" label="Scholarship Program">
                <Select placeholder="Select or type a scholarship program" allowClear showSearch optionFilterProp="label">
                  {scholarshipPrograms.map(prog => (
                    <Select.Option key={prog} value={prog} label={prog}>
                      {prog}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="number_of_grantees" label="No. of Grantees">
                <Input placeholder="e.g., 100" type="number" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="scholarship_program" label="Scholarship Program">
                <Select 
                  placeholder="Select or type a scholarship program" 
                  allowClear 
                  showSearch 
                  optionFilterProp="label"
                  onChange={handleScholarshipProgramChange}
                >
                  {scholarshipPrograms.map(prog => (
                    <Select.Option key={prog} value={prog} label={prog}>
                      {prog}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="total_budget" label="Total Budget">
                <Input placeholder="0.00" type="number" step="0.01" onChange={(e) => {
                  const newBudget = parseFloat(e.target.value) || 0
                  // Auto-redistribute NTA budget across selected Sub-AROs
                  if (subAroBreakdown.length > 0) {
                    setSubAroBreakdown(redistributeNtaBudget(newBudget, subAroBreakdown, editingFileId))
                  }
                }} />
              </Form.Item>

              {/* Remaining NTA budget indicator */}
              {(() => {
                const ntaBudget = parseFloat(form.getFieldValue('total_budget')) || 0
                const allocated = subAroBreakdown.reduce((sum, item) => sum + (parseFloat(item.budget) || 0), 0)
                const remaining = ntaBudget - allocated
                return ntaBudget > 0 ? (
                  <div style={{ marginBottom: 16, padding: '8px 12px', background: remaining > 0 ? '#fffbe6' : remaining === 0 ? '#f6ffed' : '#fff2f0', borderRadius: 6, border: `1px solid ${remaining > 0 ? '#ffe58f' : remaining === 0 ? '#b7eb8f' : '#ffccc7'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12 }}>NTA Budget: <strong>₱{ntaBudget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></Text>
                      <Text style={{ fontSize: 12 }}>Allocated: <strong>₱{allocated.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></Text>
                      <Text style={{ fontSize: 12, color: remaining > 0 ? '#d48806' : remaining === 0 ? '#389e0d' : '#cf1322' }}>
                        Remaining: <strong>₱{remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                      </Text>
                    </div>
                    <Progress 
                      percent={ntaBudget > 0 ? Math.min((allocated / ntaBudget) * 100, 100) : 0} 
                      size="small" 
                      strokeColor={remaining === 0 ? '#52c41a' : '#faad14'}
                      showInfo={false}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                ) : null
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 16 }}>
              {/* LEFT: SUB-ARO Checklist */}
              <div>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                  Available SUB-AROs
                </Text>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, maxHeight: 300, overflowY: 'auto', position: 'relative' }}>
                  {loadingSubAroFilter && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
                      <Spin size="small" style={{ marginRight: 8 }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>Loading SUB-AROs...</Text>
                    </div>
                  )}
                  {!loadingSubAroFilter && filteredSubAroForModal.length > 0 ? (
                    filteredSubAroForModal.map(subAro => {
                      const isSelected = subAroBreakdown.some(b => b.sub_aro_id === subAro.id)
                      const obligation = parseFloat(subAro.budget || 0) + parseFloat(subAro.Operational_Cost || 0)
                      const remainingForNTAs = getSubAroRemainingForNTAs(subAro.id, editingFileId)
                      const fullyObligated = isSubAroFullyObligated(subAro.id, editingFileId)
                      const totalNtaObligated = getSubAroTotalNtaObligated(subAro.id, editingFileId)
                      const obligatedPercent = obligation > 0 ? ((totalNtaObligated / obligation) * 100).toFixed(1) : '0.0'
                      const disbursed = parseFloat(subAro.disbursed || 0)
                      const fullyDisbursed = obligation > 0 && disbursed >= obligation

                      // Hide fully obligated or fully disbursed Sub-AROs unless already selected
                      if ((fullyObligated || fullyDisbursed) && !isSelected) return null

                      const ntaBudget = parseFloat(form.getFieldValue('total_budget')) || 0
                      const currentAllocated = subAroBreakdown.reduce((sum, item) => sum + (parseFloat(item.budget) || 0), 0)
                      const remainingNtaBudget = ntaBudget - currentAllocated

                      return (
                        <div key={subAro.id} style={{ 
                          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
                          opacity: (fullyObligated || fullyDisbursed) ? 0.5 : 1 
                        }}>
                          <Checkbox
                            checked={isSelected}
                            disabled={(fullyObligated || fullyDisbursed) && !isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Auto-populate with carryover amount
                                const carryover = getCarryoverDetails(subAro.id, editingFileId)
                                const allocation = carryover ? carryover.carryoverBalance : Math.min(remainingForNTAs, Math.max(remainingNtaBudget, 0))
                                const newBreakdown = [
                                  ...subAroBreakdown,
                                  {
                                    sub_aro_id: subAro.id,
                                    budget: allocation,
                                    title: `CHEDRO IV-${subAro.yearsuffix}-${subAro.number_count}`
                                  }
                                ]
                                setSubAroBreakdown(newBreakdown)
                              } else {
                                const newBreakdown = subAroBreakdown.filter(b => b.sub_aro_id !== subAro.id)
                                const ntaBudget = parseFloat(form.getFieldValue('total_budget')) || 0
                                setSubAroBreakdown(redistributeNtaBudget(ntaBudget, newBreakdown, editingFileId))
                              }
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, display: 'block' }}>
                              CHEDRO IV-{subAro.yearsuffix}-{subAro.number_count}
                            </Text>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Obligation: ₱{obligation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Disbursed: ₱{disbursed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, color: '#1890ff' }}>
                                Remaining: ₱{(obligation - disbursed).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </Text>
                              {fullyDisbursed && (
                                <Tag color="red" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                                  Fully Disbursed
                                </Tag>
                              )}
                              {!fullyDisbursed && totalNtaObligated > 0 && (
                                <Tag color={fullyObligated ? 'red' : 'blue'} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                                  {fullyObligated ? 'Fully Obligated' : `Available for NTA: ₱${remainingForNTAs.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (${obligatedPercent}% obligated)`}
                                </Tag>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : !loadingSubAroFilter && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No SUB-AROs available for selected fiscal year
                    </Text>
                  )}
                </div>
              </div>

              {/* RIGHT: Selected SUB-ARO Breakdown */}
              <div>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                  Selected SUB-AROs ({subAroBreakdown.length})
                </Text>
                {subAroBreakdown.length > 0 ? (
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
                    {subAroBreakdown.map((item, idx) => {
                      const subAro = subAroFiles.find(s => s.id === item.sub_aro_id)
                      const remainingForNTAs = getSubAroRemainingForNTAs(item.sub_aro_id, editingFileId)
                      const obligation = parseFloat(subAro?.budget || 0) + parseFloat(subAro?.Operational_Cost || 0)
                      const totalNtaObligated = getSubAroTotalNtaObligated(item.sub_aro_id, editingFileId)
                      const allocationPercent = obligation > 0 ? ((parseFloat(item.budget) / obligation) * 100).toFixed(1) : '0.0'
                      const carryover = getCarryoverDetails(item.sub_aro_id, editingFileId)
                      const hasCarryover = carryover && carryover.carryoverBalance > 0
                      const editDiffs = previousBreakdown.length > 0 ? getEditDifferences(idx) : {}
                      const hasEditDiff = Object.keys(editDiffs).length > 0
                      return (
                        <div key={idx} style={{ padding: '12px', borderBottom: idx < subAroBreakdown.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12 }}>{item.title}</Text>
                              <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                                Available: ₱{remainingForNTAs.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                {totalNtaObligated > 0 && ` (₱${totalNtaObligated.toLocaleString('en-PH', { minimumFractionDigits: 2 })} obligated by other NTAs)`}
                              </Text>
                              {hasCarryover && (
                                <div style={{ marginTop: 6, padding: '6px', background: '#FEF3C7', borderRadius: 4, border: '1px solid #FDE68A' }}>
                                  <Text type="warning" style={{ fontSize: 10, display: 'block' }}>
                                    💼 <strong>Carryover:</strong> ₱{carryover.carryoverBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })} remaining
                                  </Text>
                                  <Text type="warning" style={{ fontSize: 10, display: 'block' }}>
                                    📋 <strong>Undisbursed:</strong> {carryover.undisbursedCount} disbursements pending
                                  </Text>
                                </div>
                              )}
                              {hasEditDiff && (
                                <div style={{ marginTop: 6, padding: '6px', background: '#EEF2FF', borderRadius: 4, border: '1px solid #C7D2FE' }}>
                                  <Text type="secondary" style={{ fontSize: 10, display: 'block', color: '#4F46E5', fontWeight: 600 }}>
                                    ✏️ Changes from original:
                                  </Text>
                                  {Object.entries(editDiffs).map(([field, diff]) => (
                                    <Text key={field} type="secondary" style={{ fontSize: 9, display: 'block', color: '#6B7280', marginTop: 2 }}>
                                      <span style={{ fontWeight: 600 }}>{diff.label}:</span> {diff.previous} → <strong style={{ color: '#4F46E5' }}>{diff.current}</strong>
                                    </Text>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                const newBreakdown = subAroBreakdown.filter((_, i) => i !== idx)
                                const ntaBudget = parseFloat(form.getFieldValue('total_budget')) || 0
                                setSubAroBreakdown(redistributeNtaBudget(ntaBudget, newBreakdown, editingFileId))
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 11, color: '#8c8c8c' }}>₱</Text>
                            <Input
                              size="small"
                              type="number"
                              step="0.01"
                              min="0"
                              max={remainingForNTAs}
                              value={item.budget}
                              style={{ flex: 1, fontSize: 12 }}
                              onChange={(e) => {
                                const val = Math.min(Math.max(parseFloat(e.target.value) || 0, 0), remainingForNTAs)
                                setSubAroBreakdown(prev => prev.map((b, i) => i === idx ? { ...b, budget: val } : b))
                              }}
                            />
                            <Tag color={parseFloat(item.budget) >= remainingForNTAs ? 'green' : 'blue'} style={{ fontSize: 10, margin: 0 }}>
                              {allocationPercent}%
                            </Tag>
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Total Row */}
                    <div style={{ padding: '12px', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600 }}>
                      <Text strong style={{ fontSize: 12 }}>Total:</Text>
                      <Text strong style={{ color: '#52c41a', fontSize: 13 }}>
                        ₱{subAroBreakdown.reduce((sum, item) => sum + (parseFloat(item.budget) || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 20, textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Select SUB-AROs from the list
                    </Text>
                  </div>
                )}
              </div>
            </div>
            </>
          )}

          <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 6, fontSize: 13, color: '#8c8c8c' }}>
            Title preview: <strong style={{ color: '#262626' }}>
              {activeTab === 'NTA'
                ? `NTA-${selectedFYObj?.fiscal_year || 'YYYY'}-${form.getFieldValue('number_count') || ''}`
                : `CHEDRO IV-${selectedFYObj?.fiscal_year || 'YYYY'}-${form.getFieldValue('number_count') || ''}`
              }
            </strong>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
