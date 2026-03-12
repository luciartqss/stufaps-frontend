import { useEffect, useState, useMemo, useCallback } from 'react'
import { Typography, Button, Modal, Form, Input, Select, Upload, message, Card, Space, Popconfirm, Segmented, Spin, Empty, Tag, Tooltip, Collapse, Checkbox } from 'antd'
import { InboxOutlined, DeleteOutlined, FilePdfOutlined, SearchOutlined, UploadOutlined, PlusOutlined, CalendarOutlined, EditOutlined } from '@ant-design/icons'
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

  /* ── Filter SUB-ARO files when fiscal year changes in modal ── */
  useEffect(() => {
    const selectedYearSuffix = form.getFieldValue('yearsuffix')
    if (!selectedYearSuffix) {
      setFilteredSubAroForModal([])
      return
    }
    
    setLoadingSubAroFilter(true)
    // Use setTimeout to give visual feedback of loading state
    const timer = setTimeout(() => {
      const filtered = subAroFiles.filter(f => f.yearsuffix === selectedYearSuffix)
      setFilteredSubAroForModal(filtered)
      setLoadingSubAroFilter(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [form, subAroFiles])

  /* ── Handle fiscal year change in modal ── */
  const handleFiscalYearChange = (yearsuffix) => {
    if (!yearsuffix) {
      setFilteredSubAroForModal([])
      return
    }
    
    setLoadingSubAroFilter(true)
    const timer = setTimeout(() => {
      const filtered = subAroFiles.filter(f => f.yearsuffix === yearsuffix)
      setFilteredSubAroForModal(filtered)
      setLoadingSubAroFilter(false)
    }, 100)
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
      
      if (activeTab === 'SUB-ARO') {
        fd.append('budget', values.budget || '')
            fd.append('Operational_Cost', values.Operational_Cost || '')
        fd.append('scholarship_program', values.scholarship_program || '')
        fd.append('number_of_grantees', values.number_of_grantees || '')
      } else {
        // For NTA: send sub_aro_breakdown as JSON string within FormData
        fd.append('sub_aro_breakdown', JSON.stringify(subAroBreakdown))
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
    })
    
    if (file.filetype === 'SUB-ARO') {
      form.setFieldsValue({
        budget: file.budget,
        Operational_Cost: file.Operational_Cost,
        scholarship_program: file.scholarship_program,
        number_of_grantees: file.number_of_grantees,
      })
    } else {
      // NTA: set the breakdown
      setSubAroBreakdown(file.sub_aro_breakdown || [])
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
                      {new Date(f.created_at).toLocaleDateString()}
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
                {(f.budget || f.total_budget || f.Operational_Cost || f.disbursed || f.scholarship_program || f.number_of_grantees || (f.sub_aro_breakdown && f.sub_aro_breakdown.length > 0)) && (
                  <Collapse
                    items={[
                      {
                        key: f.id,
                        label: <span style={{ fontSize: 12, color: '#8c8c8c' }}>Details</span>,
                        children: (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* For SUB-ARO: Budget, Operational Cost, Disbursed, Scholarship, Grantees */}
                            {f.filetype === 'SUB-ARO' ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, flex: 1 }}>
                                    {f.budget && (
                                      <div>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Fund Transfer</Text>
                                        <Text strong style={{ fontSize: 13, color: '#52c41a' }}>
                                          ₱{parseFloat(f.budget + (f.Operational_Cost || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </Text>
                                      </div>
                                    )}
                                    {f.Operational_Cost && (
                                      <div>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Operational Cost</Text>
                                        <Text strong style={{ fontSize: 13, color: '#fa541c' }}>
                                          ₱{parseFloat(f.Operational_Cost).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </Text>
                                      </div>
                                    )}

                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Total Amount</Text>
                                      <Text strong style={{ fontSize: 13, color: '#faad14' }}>
                                        ₱{(parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </Text>
                                    </div>

                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Actual Obligation</Text>
                                      <Text strong style={{ fontSize: 13, color: '#faad14' }}>
                                        ₱{(parseFloat(f.budget || 0) + parseFloat(f.Operational_Cost || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </Text>
                                    </div>

                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Actual disbursement</Text>
                                      <Text strong style={{ fontSize: 13, color: '#faad14' }}>
                                        ₱{parseFloat(f.disbursed || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </Text>
                                    </div>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
                                  {f.scholarship_program && (
                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Scholarship Program</Text>
                                      <Text strong style={{ fontSize: 13 }}>{f.scholarship_program}</Text>
                                    </div>
                                  )}
                                  {f.number_of_grantees && (
                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>No. of Grantees</Text>
                                      <Text strong style={{ fontSize: 13, color: '#1890ff' }}>{f.number_of_grantees}</Text>
                                    </div>
                                  )}

                                  <div>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Disbursement %</Text>
                                    <Text strong style={{ fontSize: 13, color: f.budget && parseFloat(f.budget) > 0 ? '#1890ff' : '#8c8c8c' }}>
                                      {f.budget && parseFloat(f.budget) > 0 
                                        ? ((parseFloat(f.disbursed || 0) / parseFloat(f.budget)) * 100).toFixed(2) 
                                        : '0.00'}%
                                    </Text>
                                  </div>
                                </div>
                              </>
                            ) : (
                              /* For NTA: SUB-ARO Breakdown + Total Budget + Disbursed */
                              <>
                                {f.sub_aro_breakdown && f.sub_aro_breakdown.length > 0 && (
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>SUB-ARO Breakdown</Text>
                                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                                      {f.sub_aro_breakdown.map((item, idx) => {
                                        const subAro = subAroFiles.find(s => s.id === item.sub_aro_id)
                                        return (
                                          <div key={idx} style={{ padding: '8px 12px', borderBottom: idx < f.sub_aro_breakdown.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            
                                              <Text style={{ fontSize: 12 }}>
                                                {subAro ? `CHEDRO IV-${subAro.yearsuffix}-${subAro.number_count}` : `SUB-ARO #${item.sub_aro_id}`}
                                              </Text>

                                              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Amount</Text>
                                                  <Text strong style={{ fontSize: 12, color: '#52c41a' }}>
                                                    ₱{(parseFloat(item.budget || 0) + parseFloat(item.Operational_Cost || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </Text>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Amount</Text>
                                                  <Text strong style={{ fontSize: 12, color: '#52c41a' }}>
                                                    ₱{(parseFloat(item.budget || 0) + parseFloat(item.Operational_Cost || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </Text>
                                                </div>

                                                

                                                <div style={{ textAlign: 'right' }}>
                                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Actual Obligation</Text>
                                                  <Text strong style={{ fontSize: 12, color: '#52c41a' }}>
                                                    ₱{parseFloat(item.budget - (subAro?.disbursed || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </Text>
                                                </div>

                                                <div style={{ textAlign: 'right' }}>
                                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Disbursed</Text>
                                                  <Text strong style={{ fontSize: 12, color: '#faad14' }}>
                                                    ₱{parseFloat(subAro?.disbursed || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </Text>
                                                </div>

                                                <div style={{ textAlign: 'right', minWidth: 80 }}>
                                                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Disbursement %</Text>
                                                  <Text strong style={{ fontSize: 13, color: item.budget && parseFloat(item.budget) > 0 ? '#1890ff' : '#8c8c8c' }}>
                                                    {item.budget && parseFloat(item.budget) > 0 
                                                      ? ((parseFloat(subAro?.disbursed || 0) / parseFloat(item.budget)) * 100).toFixed(2) 
                                                      : '0.00'}%
                                                  </Text>
                                                </div>

                                              </div>
          

                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, flex: 1 }}>
                                    {f.total_budget && (
                                      <div>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Amount</Text>
                                        <Text strong style={{ fontSize: 13, color: '#52c41a' }}>
                                          ₱{parseFloat(f.total_budget).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </Text>
                                      </div>
                                    )}

                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Actual Obligation</Text>
                                      <Text strong style={{ fontSize: 13, color: '#52c41a' }}>
                                          ₱{parseFloat(f.total_budget - f.sub_aro_breakdown?.reduce((sum, item) => {
                                            const subAro = subAroFiles.find(s => s.id === item.sub_aro_id)
                                            return sum + (parseFloat(subAro?.disbursed || 0))
                                          }, 0) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </Text>
                                    </div>

                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Actual disbursement</Text>
                                      <Text strong style={{ fontSize: 13, color: '#faad14' }}>
                                        ₱{parseFloat(
                                          f.sub_aro_breakdown?.reduce((sum, item) => {
                                            const subAro = subAroFiles.find(s => s.id === item.sub_aro_id)
                                            return sum + (parseFloat(subAro?.disbursed || 0))
                                          }, 0) || 0
                                        ).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </Text>
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Disbursement %</Text>
                                    <Text strong style={{ fontSize: 13, color: f.total_budget && parseFloat(f.total_budget) > 0 ? '#1890ff' : '#8c8c8c' }}>
                                      {f.total_budget && parseFloat(f.total_budget) > 0 
                                        ? ((parseFloat(f.sub_aro_breakdown?.reduce((sum, item) => {
                                            const subAro = subAroFiles.find(s => s.id === item.sub_aro_id)
                                            return sum + (parseFloat(subAro?.disbursed || 0))
                                          }, 0) || 0) / parseFloat(f.total_budget)) * 100).toFixed(2) 
                                        : '0.00'}%
                                    </Text>
                                  </div>
                                </div>
                              </>
                            )}
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

          <Form.Item name="filename" label="File Name" rules={[{ required: true, message: 'Required' }]}>
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
                      return (
                        <div key={subAro.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSubAroBreakdown([
                                  ...subAroBreakdown,
                                  {
                                    sub_aro_id: subAro.id,
                                    budget: parseFloat(subAro.budget) || 0,
                                    title: `CHEDRO IV-${subAro.yearsuffix}-${subAro.number_count}`
                                  }
                                ])
                              } else {
                                setSubAroBreakdown(subAroBreakdown.filter(b => b.sub_aro_id !== subAro.id))
                              }
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, display: 'block' }}>
                              CHEDRO IV-{subAro.yearsuffix}-{subAro.number_count}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              ₱{parseFloat(subAro.budget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: 60 }}>
                            <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Disbursed</Text>
                            <Text strong style={{ fontSize: 11, color: subAro.budget && parseFloat(subAro.budget) > 0 ? '#1890ff' : '#8c8c8c' }}>
                              {subAro.budget && parseFloat(subAro.budget) > 0 
                                ? ((parseFloat(subAro.disbursed || 0) / parseFloat(subAro.budget)) * 100).toFixed(2) 
                                : '0.00'}%
                            </Text>
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
                      const subAro = subAroFiles.find(s => s.id === subAroBreakdown[idx].sub_aro_id)
                      return (
                        <div key={idx} style={{ padding: '12px', borderBottom: idx < subAroBreakdown.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12 }}>{item.title}</Text>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 50 }}>
                              <Text strong style={{ fontSize: 11, color: item.budget && parseFloat(item.budget) > 0 ? '#1890ff' : '#8c8c8c' }}>
                                {item.budget && parseFloat(item.budget) > 0 
                                  ? ((parseFloat(subAro?.disbursed || 0) / parseFloat(item.budget)) * 100).toFixed(2) 
                                  : '0.00'}%
                              </Text>
                            </div>
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                setSubAroBreakdown(subAroBreakdown.filter((_, i) => i !== idx))
                              }}
                            />
                          </div>
                          <Text style={{ fontSize: 12, color: '#1890ff' }}>
                            ₱{parseFloat(item.budget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
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
