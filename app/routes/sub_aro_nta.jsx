import { useEffect, useState, useMemo, useCallback } from 'react'
import { Typography, Button, Modal, Form, Input, Select, Upload, message, Card, Space, Popconfirm, Segmented, Spin, Empty, Tag, Tooltip, Collapse, Checkbox, Progress, DatePicker } from 'antd'
import { InboxOutlined, DeleteOutlined, FilePdfOutlined, SearchOutlined, UploadOutlined, PlusOutlined, CalendarOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { API_BASE } from '../lib/config'
import { useAuth } from '../lib/AuthContext'

const { Text, Title } = Typography
const STORAGE_BASE = API_BASE.replace('/api', '/storage')

/* ── CMSP Sub-Programs ── */
const CMSP_KEYWORDS = ['SSP', 'PESFA']

const isCmspProgram = (prog) => {
  if (!prog) return false
  const upper = prog.toUpperCase().trim()
  return CMSP_KEYWORDS.some(keyword => upper.includes(keyword))
}

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
  const [exceedingBalances, setExceedingBalances] = useState([])

  /* ── Helper: Calculate remaining balance for a SubAro ── */
  const getSubAroRemainingBalance = useCallback((subAro) => {
    // actualObligation = budget + operational_cost
    const actualObligation = (parseFloat(subAro.budget) || 0) + (parseFloat(subAro.Operational_Cost) || 0)
    // disbursed from the database
    const disbursed = parseFloat(subAro.disbursed) || 0
    // remaining = obligation - disbursed (what's left to allocate to NTAs)
    return Math.max(actualObligation - disbursed, 0)
  }, [])

  /* ── Helper: Calculate total NTA budget allocated (sum of all assignments) ── */
  const getNTATotalBudgetAllocated = useCallback((ntaFile) => {
    return parseFloat(ntaFile.assignments?.reduce((sum, item) => sum + (parseFloat(item.nta_budget_allocated || 0)), 0) || 0)
  }, [])

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    try {
      const [fyRes, subAroRes, ntaRes, filterRes, exceedingRes] = await Promise.all([
        fetch(`${API_BASE}/fiscal-years`).then(r => r.json()),
        fetch(`${API_BASE}/files/sub-aro`).then(r => r.json()),
        fetch(`${API_BASE}/files/nta`).then(r => r.json()),
        fetch(`${API_BASE}/students/filter-options`).then(r => r.json()),
        fetch(`${API_BASE}/files/nta/exceeding-balances/distinct`).then(r => r.json()),
      ])
      setFiscalYears(Array.isArray(fyRes) ? fyRes : [])
      setScholarshipPrograms(filterRes.scholarshipPrograms || [])
      setExceedingBalances(Array.isArray(exceedingRes) ? exceedingRes : [])

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

  useEffect(() => { 
    fetchAll()
    
    // Set up polling to refresh NTA/SubAro data every 5 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAll()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [fetchAll])

  // Refresh data when switching between tabs to ensure fresh NTA/SubAro data
  useEffect(() => {
    fetchAll()
  }, [activeTab, fetchAll])

  /* ── Filter SUB-ARO files when fiscal year or scholarship program changes in modal ── */
  useEffect(() => {
    const selectedYearSuffix = form.getFieldValue('yearsuffix')
    const selectedScholarshipProgram = form.getFieldValue('scholarship_program')

    if (!selectedYearSuffix) {
      setFilteredSubAroForModal([])
      return
    }

    // Filter without setTimeout for instant real-time updates
    let filtered = subAroFiles.filter(f => f.yearsuffix === selectedYearSuffix)

    // If scholarship program is selected, filter by it too
    if (selectedScholarshipProgram) {
      filtered = filtered.filter(f => f.scholarship_program === selectedScholarshipProgram)
    }

    // Show SubAros that either:
    // 1. Have remaining balance (available for selection), OR
    // 2. Are already in the current breakdown (for editing)
    filtered = filtered.filter(f => {
      const hasRemainingBalance = getSubAroRemainingBalance(f) > 0
      const isInBreakdown = activeTab === 'NTA' && subAroBreakdown.some(item => item.sub_aro_id === f.id)
      return hasRemainingBalance || isInBreakdown
    })

    setFilteredSubAroForModal(filtered)
    setLoadingSubAroFilter(false)
  }, [subAroFiles, getSubAroRemainingBalance, activeTab, subAroBreakdown, form])

  /* ── Handle fiscal year change in modal ── */
  const handleFiscalYearChange = (yearsuffix) => {
    if (!yearsuffix) {
      setFilteredSubAroForModal([])
      return
    }

    // Update instantly without setTimeout for real-time responsiveness
    let filtered = subAroFiles.filter(f => f.yearsuffix === yearsuffix)

    // Also filter by scholarship program if selected
    const selectedScholarshipProgram = form.getFieldValue('scholarship_program')
    if (selectedScholarshipProgram) {
      filtered = filtered.filter(f => f.scholarship_program === selectedScholarshipProgram)
    }

    // Show SubAros that either:
    // 1. Have remaining balance (available for selection), OR
    // 2. Are already in the current breakdown (for editing)
    filtered = filtered.filter(f => {
      const hasRemainingBalance = getSubAroRemainingBalance(f) > 0
      const isInBreakdown = activeTab === 'NTA' && subAroBreakdown.some(item => item.sub_aro_id === f.id)
      return hasRemainingBalance || isInBreakdown
    })

    setFilteredSubAroForModal(filtered)
  }

  /* ── Handle scholarship program change in modal ── */
  const handleScholarshipProgramChange = () => {
    const selectedYearSuffix = form.getFieldValue('yearsuffix')
    const selectedScholarshipProgram = form.getFieldValue('scholarship_program')

    if (!selectedYearSuffix) {
      setFilteredSubAroForModal([])
      return
    }

    // Update instantly without setTimeout for real-time responsiveness
    let filtered = subAroFiles.filter(f => f.yearsuffix === selectedYearSuffix)

    if (selectedScholarshipProgram) {
      filtered = filtered.filter(f => f.scholarship_program === selectedScholarshipProgram)
    }

    // Show SubAros that either:
    // 1. Have remaining balance (available for selection), OR
    // 2. Are already in the current breakdown (for editing)
    filtered = filtered.filter(f => {
      const hasRemainingBalance = getSubAroRemainingBalance(f) > 0
      const isInBreakdown = activeTab === 'NTA' && subAroBreakdown.some(item => item.sub_aro_id === f.id)
      return hasRemainingBalance || isInBreakdown
    })

    setFilteredSubAroForModal(filtered)
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
      console.log('Form submit - values:', values, 'activeTab:', activeTab)

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

        // Ensure nta_budget is sent as a number
        const ntaBudgetValue = values.total_budget ? parseFloat(values.total_budget) : 0
        console.log('NTA Budget value being sent:', ntaBudgetValue, 'from form value:', values.total_budget)
        fd.append('nta_budget', ntaBudgetValue.toString())

        fd.append('scholarship_program', values.scholarship_program || '')
      }

      const endpoint = activeTab === 'SUB-ARO' ? 'files/sub-aro' : 'files/nta'
      const url = editingFileId ? `${API_BASE}/${endpoint}/${editingFileId}` : `${API_BASE}/${endpoint}`

      // Always use POST for FormData uploads — PHP doesn't parse multipart/form-data
      // on PUT requests, so $request->hasFile() and form fields fail silently.
      // Laravel's _method spoofing routes POST + _method=PUT to the update() method.
      if (editingFileId) {
        fd.append('_method', 'PUT')
      }

      console.log(`Uploading to: ${url}`, { endpoint, editing: !!editingFileId, fileCount: fileList.length })

      const res = await fetch(url, {
        method: 'POST',
        body: fd
      })

      console.log(`Response status: ${res.status}`)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Upload error response:', res.status, errorText)
        try {
          const errorJson = JSON.parse(errorText)
          console.error('Error details:', errorJson)
        } catch (e) { }
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
      // NTA: convert assignments to breakdown format
      const breakdown = file.assignments?.map(assignment => {
        // Fallback: if exceedingBalance data isn't available, calculate from assignment values
        const remainingBalance = assignment.exceedingBalance?.remaining_obligation_balance != null
          ? parseFloat(assignment.exceedingBalance.remaining_obligation_balance)
          : Math.max(parseFloat(assignment.actual_obligation || 0) - parseFloat(assignment.disbursed || 0), 0)

        return {
          sub_aro_id: assignment.sub_aro_id,
          budget: parseFloat(assignment.nta_budget_allocated || 0),
          title: `CHEDRO IV-${assignment.sub_aro_reference}`,
          actual_obligation: parseFloat(assignment.actual_obligation || 0),
          disbursed: parseFloat(assignment.disbursed || 0),
          remaining_balance: remainingBalance,
          number_of_grantees: parseInt(assignment.number_of_grantees || 0),
          granted_count: parseInt(assignment.granted_count || 0),
          undisbursed_count: Math.max(parseInt(assignment.number_of_grantees || 0) - parseInt(assignment.granted_count || 0), 0),
          scholarship_program: assignment.scholarship_program,
          carryover_balance: 0,
          carryover_undisbursed_count: 0
        }
      }) || []

      setSubAroBreakdown(breakdown)
      setPreviousBreakdown(JSON.parse(JSON.stringify(breakdown)))

      // Set total_budget to the actual file.nta_budget (not the sum of allocations)
      form.setFieldsValue({
        total_budget: parseFloat(file.nta_budget || 0),
        scholarship_program: file.scholarship_program,
      })

      // Manually trigger filter for already-assigned SUB-AROs
      setTimeout(() => {
        const selectedYearSuffix = file.yearsuffix
        const selectedScholarshipProgram = file.scholarship_program
        if (selectedYearSuffix) {
          let filtered = subAroFiles.filter(f => f.yearsuffix === selectedYearSuffix)
          if (selectedScholarshipProgram) {
            filtered = filtered.filter(f => f.scholarship_program === selectedScholarshipProgram)
          }
          filtered = filtered.filter(f => {
            const hasRemainingBalance = getSubAroRemainingBalance(f) > 0
            const isInBreakdown = breakdown.some(item => item.sub_aro_id === f.id)
            return hasRemainingBalance || isInBreakdown
          })
          setFilteredSubAroForModal(filtered)
        }
      }, 50)
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

  // Helper: Get all NTAs this SubAro is assigned to (excluding current NTA if editing)
  const getSubAroAssignedNtas = useCallback((subAroId, excludeNtaId = null) => {
    const ntaFiles = uploadedFiles.filter(f => f.filetype === 'NTA' && f.assignments?.length > 0)
    const assignedNtas = []

    ntaFiles.forEach(nta => {
      if (excludeNtaId && nta.id === excludeNtaId) return
      const assignment = nta.assignments.find(item => item.sub_aro_id === subAroId)
      if (assignment) {
        const fy = fiscalYears.find(y => y.year_suffix === nta.yearsuffix)
        assignedNtas.push({
          id: nta.id,
          reference: nta.nta_reference || `NTA-${fy?.fiscal_year || '????'}-${nta.number_count}`,
          allocated: parseFloat(assignment.nta_budget_allocated || 0)
        })
      }
    })

    return assignedNtas
  }, [uploadedFiles, fiscalYears])

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" style={{ display: 'block', marginBottom: 16 }} />
          <Text style={{ fontSize: 14, color: '#6b7280' }}>Loading document management system...</Text>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#f9fafb', minHeight: 'calc(100vh - 72px)', margin: -24 }}>

      {/* Header */}
      <div style={{ padding: '32px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1f2937', letterSpacing: '-0.5px' }}>Sub-Allotment Release Order / Notice of Transfer Allocation</Title>
            <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 4, display: 'block' }}>Manage budget allocations and transfer documentation</Text>
          </div>
          {canEdit && (
            <Button 
              type="primary" 
              icon={<UploadOutlined />} 
              onClick={() => { form.resetFields(); setFileList([]); setSubAroBreakdown([]); setFilteredSubAroForModal([]); setLoadingSubAroFilter(false); setIsModalVisible(true) }}
              style={{ borderRadius: 6, fontWeight: 500 }}
            >
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar: Tab + Fiscal Year + Search */}
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '2px solid #e5e7eb' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tab Section */}
          <div>
            <Text style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Document Type</Text>
            <Segmented
              block
              value={activeTab}
              onChange={(v) => { setActiveTab(v); setSearchQuery(''); fetchAll() }}
              options={[
                { label: <span style={{ fontSize: 13, fontWeight: 500 }}>Sub Allotment Release Order <Tag style={{ marginLeft: 8, fontSize: 11, backgroundColor: '#eef2ff', color: '#3730a3', border: 'none' }}>{fileCounts['SUB-ARO']}</Tag></span>, value: 'SUB-ARO' },
                { label: <span style={{ fontSize: 13, fontWeight: 500 }}>Notice of Transfer Allocation <Tag style={{ marginLeft: 8, fontSize: 11, backgroundColor: '#f0fdf4', color: '#15803d', border: 'none' }}>{fileCounts.NTA}</Tag></span>, value: 'NTA' },
              ]}
              style={{ background: '#f3f4f6' }}
            />
          </div>

          {/* Filters Row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto' }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Fiscal Year</Text>
              <Select
                value={selectedFY}
                onChange={v => setSelectedFY(v)}
                style={{ width: 200 }}
                placeholder="All Years"
                allowClear
                size="large"
              >
                {fiscalYears.map(fy => (
                  <Select.Option key={fy.id} value={fy.year_suffix}>
                    Fiscal Year {fy.fiscal_year} ({fy.year_suffix})
                  </Select.Option>
                ))}
              </Select>
            </div>

            {canEdit && activeTab === 'SUB-ARO' && (
              <Button size="large" type="dashed" onClick={handleAddFiscalYear} style={{ borderColor: '#d1d5db', color: '#374151' }}>
                Add New Fiscal Year
              </Button>
            )}

            <div style={{ flex: 1, minWidth: 300 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Search</Text>
              <Input
                placeholder="Search by document name or reference number..."
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                allowClear
                size="large"
                style={{ borderRadius: 6 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '24px' }}>
        {/* Section Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 4, height: 24, background: '#3b82f6', borderRadius: 2 }}></div>
            <Text strong style={{ fontSize: 16, color: '#1f2937' }}>
              {activeTab === 'SUB-ARO' ? 'Sub Allotment Release Orders' : 'Notices of Transfer Allocation'}
            </Text>
            {selectedFYObj && (
              <span style={{ padding: '4px 12px', background: '#eff6ff', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                <Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>Fiscal Year {selectedFYObj.fiscal_year}</Text>
              </span>
            )}
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
              {filteredFiles.length} document{filteredFiles.length !== 1 ? 's' : ''} found
            </Text>
          </div>
          <div style={{ height: 1, background: '#e5e7eb' }}></div>
        </div>

        {/* File grid */}
        {filteredFiles.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 32, color: '#d1d5db', marginBottom: 12, fontWeight: 300 }}>FILE</div>
            <Text strong style={{ fontSize: 16, color: '#374151', display: 'block', marginBottom: 8 }}>
              No Documents Found
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {searchQuery.trim() ? 'No documents match your search criteria. Try adjusting your filters.' : `No ${activeTab} documents available for the selected fiscal year.`}
            </Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredFiles.map(f => (
              <Card
                key={f.id}
                size="small"
                style={{ borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.02)' }}
                styles={{ body: { padding: 0 } }}
                hoverable
              >
                {/* Card Header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #f3f4f6' }}>
                  {/* Icon */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 6,
                    background: activeTab === 'NTA' ? '#f0fdf4' : '#eff6ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: activeTab === 'NTA' ? '#15803d' : '#3b82f6',
                    fontSize: 20, flexShrink: 0, border: `1px solid ${activeTab === 'NTA' ? '#dcfce7' : '#bfdbfe'}`
                  }}>
                    <FilePdfOutlined />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 14, display: 'block', color: '#1f2937', marginBottom: 4 }}>{getTitle(f)}</Text>
                    <Tooltip title={`Click to open: ${f.filename}`} placement="top">
                      <Text
                        style={{ fontSize: 12, color: '#3b82f6', cursor: 'pointer', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        onClick={() => openFile(f.file)}
                      >
                        {f.filename}
                      </Text>
                    </Tooltip>
                    <Text type="secondary" style={{ fontSize: 11, color: '#9ca3af' }}>
                      Uploaded: {f.upload_date ? dayjs(f.upload_date).format('DD MMMM YYYY') : dayjs(f.created_at).format('DD MMMM YYYY')}
                    </Text>
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <Space size={8} style={{ flexShrink: 0 }}>
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditFile(f)} style={{ color: '#6b7280' }} title="Edit document" />
                      <Popconfirm title="Delete this document?" onConfirm={() => handleDelete(f.id)} okText="Delete" okButtonProps={{ danger: true }}>
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} title="Delete document" />
                      </Popconfirm>
                    </Space>
                  )}
                </div>

                {/* Details Dropdown */}
                {(f.budget || f.nta_budget || f.Operational_Cost || f.disbursed || f.scholarship_program || f.number_of_grantees || (f.assignments && f.assignments.length > 0)) && (
                  <Collapse
                    items={[
                      {
                        key: f.id,
                        label: <span style={{ fontSize: 13, fontWeight: 500, color: '#3b82f6' }}>View Financial Details</span>,
                        children: (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                            {/* For SUB-ARO: Financial Summary */}
                            {f.filetype === 'SUB-ARO' ? (
                              <>
                                {/* Program Banner */}
                                {f.scholarship_program && (
                                  <div style={{ padding: '12px 16px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bfdbfe', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase' }}>Scholarship Program</Text>
                                    <Text strong style={{ fontSize: 14, color: '#1e40af' }}>{f.scholarship_program}</Text>
                                  </div>
                                )}

                                {/* Financial Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                                  {/* Fund Transfer */}
                                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Fund Transfer</Text>
                                    <Text strong style={{ fontSize: 16, color: '#0369a1' }}>
                                      ₱{parseFloat(f.budget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </div>
                                  
                                  {/* Operational Cost */}
                                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Operational Cost</Text>
                                    <Text strong style={{ fontSize: 16, color: '#ea580c' }}>
                                      ₱{parseFloat(f.Operational_Cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </div>
                                  
                                  {/* Total Obligation */}
                                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Total Obligation</Text>
                                    <Text strong style={{ fontSize: 16, color: '#1e40af' }}>
                                      ₱{(parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </div>
                                  
                                  {/* Actual Disbursement */}
                                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Disbursed</Text>
                                    <Text strong style={{ fontSize: 16, color: '#16a34a' }}>
                                      ₱{parseFloat(f.disbursed || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Text>
                                  </div>
                                </div>

                                {/* Beneficiary Stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Total Grantees</Text>
                                    <Text strong style={{ fontSize: 20, color: '#7c3aed' }}>{f.number_of_grantees || 0}</Text>
                                  </div>
                                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Granted</Text>
                                    <Text strong style={{ fontSize: 20, color: '#059669' }}>{f.granted_count || 0}</Text>
                                  </div>
                                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Disbursement %</Text>
                                    <Text strong style={{ fontSize: 20, color: '#7c3aed' }}>
                                      {(parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)) > 0
                                        ? ((parseFloat(f.disbursed || 0) / (parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0))) * 100).toFixed(1)
                                        : '0.0'}%
                                    </Text>
                                  </div>
                                </div>

                                {/* Charts */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                  {/* Obligation vs Disbursement */}
                                  <div style={{ padding: '16px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 12, color: '#374151' }}>Obligation vs Disbursement</Text>
                                    {(() => {
                                      const totalObligation = parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)
                                      const disbursed = parseFloat(f.disbursed || 0)
                                      const remaining = Math.max(totalObligation - disbursed, 0)
                                      const obligationData = [
                                        { name: 'Disbursed', value: disbursed },
                                        { name: 'Remaining', value: remaining },
                                      ]
                                      const OB_COLORS = ['#059669', '#cbd5e1']
                                      return (
                                        <ResponsiveContainer width="100%" height={180}>
                                          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                            <Pie
                                              data={obligationData}
                                              cx="50%" cy="50%"
                                              innerRadius={28} outerRadius={45}
                                              paddingAngle={2}
                                              dataKey="value"
                                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                              labelLine={false}
                                              style={{ fontSize: 10, fontWeight: 500 }}
                                            >
                                              {obligationData.map((_, i) => <Cell key={i} fill={OB_COLORS[i]} />)}
                                            </Pie>
                                          </PieChart>
                                        </ResponsiveContainer>
                                      )
                                    })()}
                                  </div>

                                  {/* Beneficiaries */}
                                  <div style={{ padding: '16px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 12, color: '#374151' }}>Beneficiary Status</Text>
                                    {(() => {
                                      const total = parseInt(f.number_of_grantees || 0)
                                      const granted = parseInt(f.granted_count || 0)
                                      const notGranted = Math.max(total - granted, 0)
                                      const granteeData = [
                                        { name: 'Granted', value: granted },
                                        { name: 'Pending', value: notGranted },
                                      ]
                                      const GR_COLORS = ['#3b82f6', '#cbd5e1']
                                      return (
                                        <ResponsiveContainer width="100%" height={180}>
                                          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                            <Pie
                                              data={granteeData}
                                              cx="50%" cy="50%"
                                              innerRadius={28} outerRadius={45}
                                              paddingAngle={2}
                                              dataKey="value"
                                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                              labelLine={false}
                                              style={{ fontSize: 10, fontWeight: 500 }}
                                            >
                                              {granteeData.map((_, i) => <Cell key={i} fill={GR_COLORS[i]} />)}
                                            </Pie>
                                          </PieChart>
                                        </ResponsiveContainer>
                                      )
                                    })()}
                                  </div>
                                </div>
                              </>
                            ) : (
                              /* For NTA: SUB-ARO Breakdown + Summary */
                              <>
                                {f.assignments && f.assignments.length > 0 && (
                                  <div style={{ marginBottom: 20 }}>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 12, color: '#1F2937' }}>SUB-ARO ALLOCATION DETAILS</Text>
                                    <div style={{ border: '1px solid #D1D5DB', borderRadius: 6, overflow: 'hidden' }}>
                                      {f.assignments.map((item, idx) => {
                                        const subAro = item.subAro
                                        const actualObligation = item.exceedingBalance?.actual_obligation ? parseFloat(item.exceedingBalance.actual_obligation) : (item.actual_obligation ? parseFloat(item.actual_obligation) : 0)
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
                                          <div key={idx} style={{ paddingBottom: idx < f.assignments.length - 1 ? 0 : 0, borderBottom: idx < f.assignments.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                                            {/* Header with SUB-ARO name and scholarship program */}
                                            <div style={{ padding: '12px 16px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                              <div style={{ flex: 1 }}>
                                                <Text strong style={{ fontSize: 11, display: 'block', color: '#111827', marginBottom: 2 }}>
                                                  {item.sub_aro_reference ? `CHEDRO IV-${item.sub_aro_reference}` : 'Unknown SUB-ARO'}
                                                </Text>
                                                {subAro?.scholarship_program && (
                                                  <Text type="secondary" style={{ fontSize: 10, display: 'block', color: '#6B7280' }}>
                                                    {subAro.scholarship_program}
                                                  </Text>
                                                )}
                                              </div>
                                            </div>

                                            {/* Financial Allocation Details - Table Format */}
                                            <div style={{ padding: '12px 16px' }}>
                                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 12 }}>
                                                {/* Column 1: Actual Obligation */}
                                                <div style={{ borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                                  <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Actual Obligation</Text>
                                                  <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                                    ₱{actualObligation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </Text>
                                                </div>
                                                {/* Column 2: Disbursed */}
                                                <div style={{ borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                                  <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Disbursed Amount</Text>
                                                  <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                                    ₱{disbursed.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </Text>
                                                </div>
                                                {/* Column 3: Remaining Balance */}
                                                <div style={{ borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                                  <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Remaining Balance</Text>
                                                  <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                                    ₱{remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </Text>
                                                </div>
                                                {/* Column 4: Disbursement % */}
                                                <div>
                                                  <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Disbursement %</Text>
                                                  <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                                    {disbursementPercent}%
                                                  </Text>
                                                </div>
                                              </div>
                                              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                                                {/* Grantee Stats - Row 2 */}
                                                <div style={{ borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                                  <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Grantees</Text>
                                                  <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                                    {grantees}
                                                  </Text>
                                                </div>
                                                <div style={{ borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                                  <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Granted Count</Text>
                                                  <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                                    {granted}
                                                  </Text>
                                                </div>
                                                <div style={{ borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                                  <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Grant % Progress</Text>
                                                  <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                                    {grantedPercent}%
                                                  </Text>
                                                </div>
                                                <div>
                                                  <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Undisbursed Count</Text>
                                                  <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                                    {undisbursedCount}
                                                  </Text>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Carryover Section */}
                                            {hasCarryover && (
                                              <div style={{ padding: '12px 16px', background: '#FFFBEB', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <Text strong style={{ fontSize: 10, color: '#B45309', textTransform: 'uppercase' }}>⚠ CARRYOVER BALANCE FROM PREVIOUS ALLOCATION</Text>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                                  <div style={{ borderRight: '1px solid #FEF3C7', paddingRight: 12 }}>
                                                    <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4, fontWeight: 600, color: '#92400E' }}>Balance Amount</Text>
                                                    <Text strong style={{ fontSize: 12, color: '#B45309' }}>
                                                      ₱{carryoverBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </Text>
                                                  </div>
                                                  <div style={{ borderRight: '1px solid #FEF3C7', paddingRight: 12 }}>
                                                    <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4, fontWeight: 600, color: '#92400E' }}>Undisbursed</Text>
                                                    <Text strong style={{ fontSize: 12, color: '#B45309' }}>
                                                      {carryoverUndisbursedCount}
                                                    </Text>
                                                  </div>
                                                  <div>
                                                    <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4, fontWeight: 600, color: '#92400E' }}>Status</Text>
                                                    <Text strong style={{ fontSize: 12, color: parseFloat(disbursementPercent) === 100 ? '#059669' : '#B45309' }}>
                                                      {parseFloat(disbursementPercent) === 100 ? 'Completed' : 'In Progress'}
                                                    </Text>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {/* SubAro/NTA Gateway History */}
                                            {(() => {
                                              const diffs = getSubAroDifferences(item, item.sub_aro_id, f.id)
                                              if (!diffs.hasAllocation) return null

                                              const { allocation, actualObligation, totalAllocatedByPrev, remaining } = diffs
                                              const subAroFile = subAroFiles.find(s => s.id === item.sub_aro_id)
                                              const subAroName = subAroFile ? `CHEDRO IV-${subAroFile.yearsuffix}-${subAroFile.number_count}` : item.sub_aro_reference

                                              return (
                                                <div style={{ padding: '8px 12px', background: '#EEF2FF', borderTop: '1px solid #C7D2FE', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                  <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, color: '#4F46E5' }}>📊 SubAro/NTA Gateway History</Text>
                                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {/* SubAro Reference - the gateway key */}
                                                    <div style={{ fontSize: 10, display: 'flex', gap: 12, alignItems: 'center', padding: '6px 8px', background: '#F3E8FF', borderRadius: 3 }}>
                                                      <span style={{ fontWeight: 600, color: '#6B21A8', minWidth: 120 }}>SubAro:</span>
                                                      <strong style={{ color: '#7C3AED', fontSize: 11 }}>{subAroName}</strong>
                                                    </div>

                                                    <div style={{ fontSize: 10, display: 'flex', gap: 12, alignItems: 'center', padding: '4px 0' }}>
                                                      <span style={{ fontWeight: 600, color: '#4F46E5', minWidth: 120 }}>Total Obligation:</span>
                                                      <strong style={{ color: '#DC2626' }}>₱{actualObligation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                    </div>

                                                    {allocation && (
                                                      <div style={{ fontSize: 10, display: 'flex', gap: 12, alignItems: 'center', padding: '6px 8px', background: '#FFFFFF', borderRadius: 4, border: '1px solid #E5E7EB' }}>
                                                        <span style={{ fontWeight: 600, color: '#6B7280', minWidth: 120 }}>Previous NTA ({allocation.ntaName}):</span>
                                                        <strong style={{ color: '#EC4899' }}>₱{allocation.allocated.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                        <span style={{ color: '#9CA3AF', fontSize: 9 }}>allocated to this SubAro</span>
                                                      </div>
                                                    )}

                                                    <div style={{ fontSize: 10, display: 'flex', gap: 12, alignItems: 'center', padding: '6px 8px', background: '#F0FDF4', borderRadius: 4, border: '1px solid #BBEF63' }}>
                                                      <span style={{ fontWeight: 600, color: '#4F46E5', minWidth: 120 }}>Remaining:</span>
                                                      <strong style={{ color: '#16A34A', fontSize: 11 }}>₱{remaining.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                                      <span style={{ color: '#15803D', fontSize: 9 }}>available for new NTA allocation</span>
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
                                  {/* NTA Breakdown Header */}
                                  <Text strong style={{ fontSize: 12, display: 'block', color: '#1F2937' }}>NTA ALLOCATION SUMMARY</Text>
                                  <Card size="small" style={{ borderRadius: 6, background: '#fff', border: '1px solid #D1D5DB' }} styles={{ body: { padding: '16px' } }}>
                                    {/* NTA Total Budget Header - 4-Column Layout */}
                                    <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #E5E7EB', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                                      {/* Column 1: Overall Allotment */}
                                      <div style={{ borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                        {(() => {
                                          const ntaBudget = parseFloat(f.nta_budget || 0)
                                          return (
                                            <>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Budget Allotment</Text>
                                              <Text strong style={{ fontSize: 14, color: '#1F2937' }}>
                                                ₱{ntaBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </Text>
                                            </>
                                          )
                                        })()}
                                      </div>

                                      {/* Column 2: Total Disbursed */}
                                      <div style={{ borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                        {(() => {
                                          const totalDisbursed = parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0)
                                          return (
                                            <>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Disbursed</Text>
                                              <Text strong style={{ fontSize: 14, color: '#1F2937' }}>
                                                ₱{totalDisbursed.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </Text>
                                            </>
                                          )
                                        })()}
                                      </div>

                                      {/* Column 3: Remaining Balance */}
                                      <div style={{ borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                        {(() => {
                                          const remainingCash = parseFloat(f.remaining_cash || 0)
                                          return (
                                            <>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Remaining Cash</Text>
                                              <Text strong style={{ fontSize: 14, color: '#1F2937' }}>
                                                ₱{remainingCash.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </Text>
                                            </>
                                          )
                                        })()}
                                      </div>

                                      {/* Column 4: Percentage Breakdown */}
                                      <div>
                                        {(() => {
                                          const ntaBudget = parseFloat(f.nta_budget || 0)
                                          const totalDisbursed = parseFloat(f.disbursed || 0)
                                          const disbursementPercent = ntaBudget > 0 ? ((totalDisbursed / ntaBudget) * 100).toFixed(2) : '0.00'
                                          return (
                                            <>
                                              <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 6, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Disbursement Progress</Text>
                                              <Text strong style={{ fontSize: 14, color: '#1F2937' }}>
                                                {disbursementPercent}%
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

                                    {/* Balance Report Charts - Formal Style */}
                                    <div style={{ marginTop: 20, marginBottom: 16 }}>
                                      <Text strong style={{ fontSize: 12, display: 'block', color: '#1F2937', marginBottom: 12 }}>BALANCE REPORT & ANALYTICS</Text>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                        
                                        {/* Bar Chart - Budget Data */}
                                        <Card size="small" style={{ borderRadius: 6, background: '#fff', border: '1px solid #D1D5DB' }} styles={{ body: { padding: '12px' } }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                                          {(() => {
                                            const ntaTotalBudget = parseFloat(f.nta_budget || 0)
                                            const totalDisbursed = parseFloat(f.disbursed || 0)
                                            const remainingCash = parseFloat(f.remaining_cash || 0)
                                            const budgetChartData = [
                                              { name: 'Budget', disbursed: totalDisbursed, remaining: remainingCash },
                                            ]
                                            return (
                                              <div>
                                                <Text strong style={{ fontSize: 10, display: 'block', textAlign: 'center', marginBottom: 8, color: '#1F2937', fontWeight: 600 }}>ALLOTMENT BALANCE REPORT</Text>
                                                <ResponsiveContainer width="100%" height={150}>
                                                  <BarChart data={budgetChartData} layout="vertical" margin={{ top: 30, right: 30, left: 0, bottom: 10 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis type="number" style={{ fontSize: 8 }} />
                                                    <YAxis dataKey="name" type="category" style={{ fontSize: 8 }} />
                                                    <RechartsTooltip formatter={(val) => `₱${parseFloat(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                                    <Bar dataKey="disbursed" stackId="a" fill="#10B981" name="Disbursed" />
                                                    <Bar dataKey="remaining" stackId="a" fill="#FCD34D" name="Remaining Cash" />
                                                    <Legend wrapperStyle={{ fontSize: 8 }} />
                                                  </BarChart>
                                                </ResponsiveContainer>
                                              </div>
                                            )
                                          })()}
                                        </div>
                                      </Card>
                                      
                                      {/* Pie Chart - Disbursement */}
                                      <Card size="small" style={{ borderRadius: 6, background: '#fff', border: '1px solid #D1D5DB' }} styles={{ body: { padding: '12px' } }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                                          {(() => {
                                            const totalDisbursed = parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0)
                                            const totalBudget = getNTATotalBudgetAllocated(f)
                                            const remaining = Math.max(totalBudget - totalDisbursed, 0)
                                            const chartData = [
                                              { name: 'Disbursed', value: totalDisbursed },
                                              { name: 'Remaining', value: remaining },
                                            ]
                                            const CHART_COLORS = ['#10B981', '#FCD34D']
                                            return (
                                              <div>
                                                <Text strong style={{ fontSize: 10, display: 'block', textAlign: 'center', marginBottom: 8, color: '#1F2937', fontWeight: 600 }}>NTA DISBURSEMENT PROGRESS</Text>
                                                <ResponsiveContainer width="100%" height={150}>
                                                  <PieChart margin={{ top: 20, right: 15, bottom: 10, left: 15 }}>
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
                                      </Card>

                                      {/* Pie Chart - Grantees */}
                                      <Card size="small" style={{ borderRadius: 6, background: '#fff', border: '1px solid #D1D5DB' }} styles={{ body: { padding: '12px' } }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
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
                                                <Text strong style={{ fontSize: 10, display: 'block', textAlign: 'center', marginBottom: 8, color: '#1F2937', fontWeight: 600 }}>GRANTEE DISTRIBUTION</Text>
                                                <ResponsiveContainer width="100%" height={150}>
                                                  <PieChart margin={{ top: 20, right: 15, bottom: 10, left: 15 }}>
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
                                      </Card>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, paddingTop: 12, borderTop: '1px solid #E5E7EB', marginTop: 12 }}>
                                      {/* Column 1: Disbursed & Total Obligation */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Disbursed</Text>
                                          <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                            ₱{parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </Text>
                                        </div>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Sub-ARO Obligation</Text>
                                          <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                            ₱{parseFloat(f.assignments?.reduce((sum, item) => sum + (parseFloat(item.actual_obligation || 0)), 0) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </Text>
                                        </div>
                                      </div>

                                      {/* Column 2: Sub-ARO count & Disbursement */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>No. of Selected Sub-ARO</Text>
                                          <Text strong style={{ fontSize: 13, color: '#1F2937' }}>{f.assignments?.length || 0}</Text>
                                        </div>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Disbursement %</Text>
                                          <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                            {(() => {
                                              const totalObl = f.assignments?.reduce((sum, item) => sum + (parseFloat(item.actual_obligation || 0)), 0) || 0
                                              const totalDisbursed = f.assignments?.reduce((sum, item) => sum + (parseFloat(item.disbursed || 0)), 0) || 0
                                              return totalObl > 0 ? ((totalDisbursed / totalObl) * 100).toFixed(2) : '0.00'
                                            })()}%
                                          </Text>
                                        </div>
                                      </div>

                                      {/* Column 3: Grantees & Granted */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Grantees</Text>
                                          <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                            {f.assignments?.reduce((sum, item) => sum + (parseInt(item.number_of_grantees || 0)), 0) || 0}
                                          </Text>
                                        </div>
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 4, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Granted Count</Text>
                                          <Text strong style={{ fontSize: 13, color: '#1F2937' }}>
                                            {(() => {
                                              const totalGrantees = f.assignments?.reduce((sum, item) => sum + (parseInt(item.number_of_grantees || 0)), 0) || 0;
                                              const totalGranted = f.assignments?.reduce((sum, item) => sum + (parseInt(item.granted_count || 0)), 0) || 0;
                                              const grantedPct = totalGrantees > 0 ? ((totalGranted / totalGrantees) * 100).toFixed(2) : '0.00';
                                              return `${totalGranted} (${grantedPct}%)`;
                                            })()}
                                          </Text>
                                        </div>
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
                                                    {item.sub_aro_reference ? `CHEDRO IV-${item.sub_aro_reference}` : 'Unknown SUB-ARO'}
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
                                              ₱{parseFloat(f.remaining_cash || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Text>
                                          </div>
                                        </div>
                                      </div>
                                    </Card>
                                  </div>
                                </div>
                              </>)}
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
        title={
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
            {editingFileId ? `Update ${activeTab === 'NTA' ? 'Notice of Transfer Allocation' : 'Sub-Allotment Release Order'}` : `Upload New ${activeTab === 'NTA' ? 'Notice of Transfer Allocation' : 'Sub-Allotment Release Order'}`}
          </div>
        }
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
        width={activeTab === 'NTA' ? 1000 : 520}
        okText={editingFileId ? 'Save Changes' : 'Upload Document'}
        cancelText="Cancel"
        okButtonProps={{ style: { borderRadius: 6 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        styles={{
          body: { paddingTop: 20 }
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitFile}>
          {/* Document File Upload */}
          <Form.Item label={<span style={{ fontWeight: 600, color: '#1f2937' }}>PDF Document</span>} required={!editingFileId}>
            <Upload.Dragger
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
              accept=".pdf"
              maxCount={1}
              beforeUpload={() => false}
              style={{ borderRadius: 6 }}
            >
              <p style={{ fontSize: 24, margin: '8px 0 12px', color: '#d1d5db', fontWeight: 300 }}>PDF FILE</p>
              <p style={{ fontWeight: 500, color: '#1f2937', marginBottom: 4 }}>{editingFileId ? 'Update PDF (optional)' : 'Upload PDF Document'}</p>
              <p style={{ fontSize: 12, color: '#6b7280' }}>Click to browse or drag and drop PDF file here</p>
            </Upload.Dragger>
          </Form.Item>

          {/* Filename */}
          <Form.Item name="filename" label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Document Name</span>} rules={[{ required: true, message: 'Please enter document name' }]}>
            <Input placeholder="e.g., Budget Allocation - January 2024" size="large" style={{ borderRadius: 6 }} />
          </Form.Item>

          {/* Fiscal Year and Reference Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="yearsuffix" label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Fiscal Year</span>} rules={[{ required: true, message: 'Select fiscal year' }]}>
              <Select placeholder="Select Fiscal Year" onChange={handleFiscalYearChange} size="large" style={{ borderRadius: 6 }}>
                {fiscalYears.map(fy => (
                  <Select.Option key={fy.id} value={fy.year_suffix}>
                    FY {fy.fiscal_year} ({fy.year_suffix})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="number_count"
              label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Reference Number</span>}
              rules={[{ required: true, message: 'Please enter reference number' }]}
            >
              <Input placeholder="e.g., 001" size="large" style={{ borderRadius: 6 }} />
            </Form.Item>
          </div>

          <Form.Item name="upload_date" label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Upload Date</span>}>
            <DatePicker style={{ width: '100%', borderRadius: 6 }} size="large" />
          </Form.Item>

          {/* SUB-ARO Financial Details */}
          {activeTab === 'SUB-ARO' ? (
            <>
              <div style={{ marginTop: 24, marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e5e7eb' }}>
                <Text strong style={{ fontSize: 13, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Information</Text>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="budget" label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Fund Transfer</span>}>
                  <Input placeholder="0.00" type="number" step="0.01" size="large" style={{ borderRadius: 6 }} />
                </Form.Item>

                <Form.Item name="Operational_Cost" label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Operational Cost</span>}>
                  <Input placeholder="0.00" type="number" step="0.01" size="large" style={{ borderRadius: 6 }} />
                </Form.Item>
              </div>

              <Form.Item name="scholarship_program" label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Scholarship Program</span>}>
                <Select placeholder="Select or type scholarship program" allowClear showSearch optionFilterProp="label" size="large" style={{ borderRadius: 6 }}>
                  {(() => {
                    const cmspInList = scholarshipPrograms.filter(p => isCmspProgram(p))
                    const otherProgs = scholarshipPrograms.filter(p => !isCmspProgram(p))
                    return (
                      <>
                        {cmspInList.length > 0 && (
                          <Select.Option key="CMSP" value="CMSP">
                            CMSP
                          </Select.Option>
                        )}
                        {otherProgs.length > 0 && (
                          <Select.OptGroup label="Other Programs">
                            {otherProgs.map(prog => (
                              <Select.Option key={prog} value={prog}>
                                {prog}
                              </Select.Option>
                            ))}
                          </Select.OptGroup>
                        )}
                      </>
                    )
                  })()}
                </Select>
              </Form.Item>

              <Form.Item name="number_of_grantees" label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Number of Grantees</span>}>
                <Input placeholder="e.g., 100" type="number" size="large" style={{ borderRadius: 6 }} />
              </Form.Item>
            </>
          ) : (
            <>
              {/* NTA Fields */}
              <div style={{ marginTop: 24, marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e5e7eb' }}>
                <Text strong style={{ fontSize: 13, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Budget Information</Text>
              </div>

              <Form.Item name="scholarship_program" label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Scholarship Program</span>}>
                <Select
                  placeholder="Select or type scholarship program"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  onChange={handleScholarshipProgramChange}
                  size="large"
                  style={{ borderRadius: 6 }}
                >
                  {(() => {
                    const cmspInList = scholarshipPrograms.filter(p => isCmspProgram(p))
                    const otherProgs = scholarshipPrograms.filter(p => !isCmspProgram(p))
                    return (
                      <>
                        {cmspInList.length > 0 && (
                          <Select.Option key="CMSP" value="CMSP">
                            CMSP
                          </Select.Option>
                        )}
                        {otherProgs.length > 0 && (
                          <Select.OptGroup label="Other Programs">
                            {otherProgs.map(prog => (
                              <Select.Option key={prog} value={prog}>
                                {prog}
                              </Select.Option>
                            ))}
                          </Select.OptGroup>
                        )}
                      </>
                    )
                  })()}
                </Select>
              </Form.Item>

              <Form.Item name="total_budget" label={<span style={{ fontWeight: 600, color: '#1f2937' }}>Total Budget Allocation</span>} initialValue={0}>
                <Input placeholder="0.00" type="number" step="0.01" size="large" style={{ borderRadius: 6 }} onChange={(e) => {
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

              {/* Two-Column Layout: Main Content + Right Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 16 }}>
                
                {(() => {
                  const selectedYearSuffix = form.getFieldValue('yearsuffix')
                  const selectedScholarshipProgram = form.getFieldValue('scholarship_program')
                  
                  if (!selectedYearSuffix || !selectedScholarshipProgram) {
                    return (
                      <div style={{ 
                        padding: '40px 20px', 
                        textAlign: 'center', 
                        background: '#f9fafb', 
                        borderRadius: 6, 
                        border: '1px solid #e5e7eb' 
                      }}>
                        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                          {!selectedYearSuffix && !selectedScholarshipProgram 
                            ? 'Please select a Fiscal Year and Scholarship Program to view available Sub-AROs'
                            : !selectedYearSuffix
                            ? 'Please select a Fiscal Year to view available Sub-AROs'
                            : 'Please select a Scholarship Program to view available Sub-AROs'}
                        </Text>
                      </div>
                    )
                  }

                  return (
                    <>
                {/* Top Row: Available and With Balance side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Left: Available SUB-AROs */}
                  <div>
                    <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                      <Text strong style={{ fontSize: 13, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Sub-AROs</Text>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, maxHeight: 320, overflowY: 'auto', background: '#fafafa', position: 'relative' }}>
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
                          const assignedNtas = getSubAroAssignedNtas(subAro.id, editingFileId)
                          const isAssignedToOtherNta = assignedNtas.length > 0

                          // Hide fully obligated or fully disbursed Sub-AROs unless already selected
                          // Also hide Sub-AROs already assigned to other NTAs unless already selected
                          if (((fullyObligated || fullyDisbursed) || isAssignedToOtherNta) && !isSelected) return null

                          const ntaBudget = parseFloat(form.getFieldValue('total_budget')) || 0
                          const currentAllocated = subAroBreakdown.reduce((sum, item) => sum + (parseFloat(item.budget) || 0), 0)
                          const remainingNtaBudget = ntaBudget - currentAllocated

                          return (
                            <div key={subAro.id} style={{
                              marginBottom: 8, padding: '10px', display: 'flex', alignItems: 'flex-start', gap: 10,
                              opacity: (fullyObligated || fullyDisbursed) && !isSelected ? 0.6 : 1,
                              background: isSelected ? '#f0fdf4' : '#fff',
                              borderRadius: 4,
                              border: isSelected ? '1px solid #dcfce7' : '1px solid #e5e7eb'
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
                                <Text style={{ fontSize: 12, fontWeight: 500, color: '#1f2937', display: 'block', marginBottom: 4 }}>
                                  CHEDRO IV-{subAro.yearsuffix}-{subAro.number_count}
                                </Text>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 6 }}>
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Obligation</Text>
                                    <Text strong style={{ fontSize: 11, color: '#1f2937' }}>₱{obligation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
                                  </div>
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Disbursed</Text>
                                    <Text strong style={{ fontSize: 11, color: '#059669' }}>₱{disbursed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
                                  </div>
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Remaining</Text>
                                    <Text strong style={{ fontSize: 11, color: '#0369a1' }}>₱{(obligation - disbursed).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
                                  </div>
                                </div>
                                {(() => {
                                  const assignedNtas = getSubAroAssignedNtas(subAro.id, editingFileId)
                                  return (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                      {assignedNtas.length > 0 && (
                                        <span style={{ fontSize: 10, padding: '2px 8px', background: '#fef3c7', borderRadius: 3, border: '1px solid #fde68a', color: '#92400e' }}>
                                          Assigned to: {assignedNtas.map(n => n.reference).join(', ')}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )
                        })
                      ) : !loadingSubAroFilter && (
                        <div style={{ padding: '20px', textAlign: 'center', background: '#f9fafb', color: '#6b7280', fontSize: 12 }}>
                          No SUB-AROs available for selected fiscal year
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: SUB-AROs With Balance */}
                  <div>
                    <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                      <Text strong style={{ fontSize: 13, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SUB-AROs With Balance</Text>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', maxHeight: 320 }}>
                      <div style={{ flex: 1, overflowY: 'auto', padding: 12, minHeight: 0 }}>
                        {(() => {
                          // Get selected fiscal year and scholarship program from form
                          const selectedYearSuffix = form.getFieldValue('yearsuffix')
                          const selectedScholarshipProgram = form.getFieldValue('scholarship_program')
                          
                          // Filter exceeding_balances by:
                          // 1. Remaining balance > 0
                          // 2. Fiscal year (yearsuffix) matches selected
                          // 3. Scholarship program matches selected (if selected)
                          // 4. Not already in current breakdown
                          const subarosWithBalance = exceedingBalances
                            .filter(item => 
                              parseFloat(item.remaining_obligation_balance || 0) > 0 &&
                              item.yearsuffix === selectedYearSuffix &&
                              (!selectedScholarshipProgram || item.scholarship_program === selectedScholarshipProgram)
                            )

                          return subarosWithBalance.length > 0 ? (
                            subarosWithBalance.map((item, idx) => {
                              const isSelected = subAroBreakdown.some(b => b.sub_aro_id === item.sub_aro_id)
                              const remainingBalance = parseFloat(item.remaining_obligation_balance || 0)
                              const actualObligation = parseFloat(item.actual_obligation || 0)
                              const ntaBudgetAllocated = parseFloat(item.nta_budget_allocated || 0)
                              
                              return (
                                <Tooltip
                                  key={idx}
                                  title={
                                    <div style={{ fontSize: 10 }}>
                                      <div style={{ marginBottom: 6 }}>
                                        <div style={{ color: '#ccc', fontSize: 8, marginBottom: 1 }}>REMAINING</div>
                                        <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>₱{remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                                      </div>
                                      <div style={{ marginBottom: 6 }}>
                                        <div style={{ color: '#ccc', fontSize: 8, marginBottom: 1 }}>OBLIGATION</div>
                                        <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>₱{actualObligation.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                                      </div>
                                      <div style={{ marginBottom: 6 }}>
                                        <div style={{ color: '#ccc', fontSize: 8, marginBottom: 1 }}>PREV. ALLOC.</div>
                                        <div style={{ fontSize: 11, color: '#d8b4fe', fontWeight: 600 }}>₱{ntaBudgetAllocated.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                                      </div>
                                      {item.nta_reference && (
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #444', color: '#93c5fd', fontSize: 9 }}>
                                          From: {item.nta_reference}
                                        </div>
                                      )}
                                    </div>
                                  }
                                  placement="left"
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'help', padding: '6px 4px', borderRadius: 3, background: isSelected ? '#f0f9ff' : 'transparent', border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent', marginBottom: 4 }}>
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const subAroFile = subAroFiles.find(s => s.id === item.sub_aro_id)
                                          const newBreakdown = [
                                            ...subAroBreakdown,
                                            {
                                              sub_aro_id: item.sub_aro_id,
                                              budget: remainingBalance,
                                              title: subAroFile ? `CHEDRO IV-${subAroFile.yearsuffix}-${subAroFile.number_count}` : `CHEDRO IV-${item.sub_aro_reference}`,
                                              actual_obligation: actualObligation,
                                              nta_budget_allocated: remainingBalance,
                                              scholarship_program: item.scholarship_program
                                            }
                                          ]
                                          setSubAroBreakdown(newBreakdown)
                                        } else {
                                          const newBreakdown = subAroBreakdown.filter(b => b.sub_aro_id !== item.sub_aro_id)
                                          setSubAroBreakdown(newBreakdown)
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <Text style={{ fontSize: 11, fontWeight: 500, color: '#1f2937', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      CHEDRO IV-{item.sub_aro_reference}
                                    </Text>
                                    <Text strong style={{ fontSize: 10, color: '#059669', whiteSpace: 'nowrap' }}>
                                      ₱{remainingBalance.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                                    </Text>
                                  </div>
                                </Tooltip>
                              )
                            })
                          ) : (
                            <div style={{ padding: '16px 12px', textAlign: 'center', color: '#6b7280', fontSize: 11 }}>
                              No SUB-AROs with remaining balance available
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Total Allocation - Full Width */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
                  <div style={{ padding: '12px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4, fontWeight: 600, color: '#15803d', textTransform: 'uppercase' }}>Total Allocation</Text>
                    <Text strong style={{ fontSize: 24, color: '#15803d' }}>
                      ₱{subAroBreakdown.reduce((sum, item) => sum + (parseFloat(item.budget) || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 11, color: '#6b7280' }}>Selected Sub-AROs</Text>
                      <Tag color="blue" style={{ fontSize: 11, fontWeight: 600 }}>{subAroBreakdown.length}</Tag>
                    </div>
                    <div style={{ height: 1, background: '#f3f4f6', marginBottom: 8 }}></div>
                    {subAroBreakdown.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                        {subAroBreakdown.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, paddingBottom: 6, borderBottom: '1px solid #f0f0f0' }}>
                            <Text type="secondary" style={{ fontSize: 10, flex: 1, wordBreak: 'break-word' }}>
                              {item.title}
                            </Text>
                            <Text strong style={{ fontSize: 10, color: '#3b82f6', marginLeft: 8, whiteSpace: 'nowrap' }}>
                              ₱{parseFloat(item.budget || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Text>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                        No Sub-AROs selected
                      </Text>
                    )}
                  </div>
                </div>
                    </>
                  )
                })()}
              </div>
            </>
          )}

          {/* Document Title Preview */}
          <div style={{ marginTop: 24, padding: '16px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bfdbfe' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8, fontWeight: 600, color: '#0c4a6e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Document Reference Number</Text>
            <Text strong style={{ fontSize: 14, color: '#1e40af', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              {activeTab === 'NTA'
                ? `NTA-${selectedFYObj?.fiscal_year || 'YYYY'}-${form.getFieldValue('number_count') || '_'}`
                : `CHEDRO IV-${selectedFYObj?.fiscal_year || 'YYYY'}-${form.getFieldValue('number_count') || '_'}`
              }
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
