import { useEffect, useState, useMemo, useCallback } from 'react'
import { Typography, Button, Modal, Form, Input, Select, Upload, message, Card, Space, Popconfirm, Segmented, Spin, Empty, Tag, Tooltip } from 'antd'
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

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    try {
      const [fyRes, filesRes] = await Promise.all([
        fetch(`${API_BASE}/fiscal-years`).then(r => r.json()),
        fetch(`${API_BASE}/sub-aro-nta-files`).then(r => r.json()),
      ])
      setFiscalYears(Array.isArray(fyRes) ? fyRes : [])
      setUploadedFiles(Array.isArray(filesRes) ? filesRes : [])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

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
    setLoading(true)
    try {
      const fd = new FormData()
      if (fileList.length > 0) {
        fd.append('file', fileList[0].originFileObj)
      }
      fd.append('filename', values.filename)
      fd.append('yearsuffix', values.yearsuffix)
      fd.append('number_count', values.number_count)
      fd.append('filetype', activeTab)
      
      const url = editingFileId ? `${API_BASE}/sub-aro-nta-files/${editingFileId}` : `${API_BASE}/sub-aro-nta-files`
      const method = editingFileId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method: method,
        body: fd
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Upload error response:', res.status, errorText)
        try {
          const errorJson = JSON.parse(errorText)
          console.error('Error details:', errorJson)
        } catch (e) {}
        throw new Error(`Server responded with ${res.status}`)
      }
      message.success(editingFileId ? 'File updated' : 'File uploaded')
      setIsModalVisible(false)
      form.resetFields()
      setFileList([])
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
    setFileList([])
    setIsModalVisible(true)
  }

  /* ── Delete ── */
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/sub-aro-nta-files/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      message.success('Deleted')
      setUploadedFiles(prev => prev.filter(f => f.id !== id))
    } catch { message.error('Delete failed') }
  }

  /* ── Helpers ── */
  const getTitle = (f) => {
    if (f.filetype === 'NTA') {
      return `NTA-${f.yearsuffix || '??'}-${f.number_count}`
    } else {
      const fy = fiscalYears.find(y => y.year_suffix === f.yearsuffix)
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
          <Button type="primary" icon={<UploadOutlined />} onClick={() => { form.resetFields(); setFileList([]); setIsModalVisible(true) }}>
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
                bodyStyle={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
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
        onCancel={() => { setIsModalVisible(false); setEditingFileId(null) }}
        confirmLoading={loading}
        width={480}
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
              <Select placeholder="Select FY">
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

          <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 6, fontSize: 13, color: '#8c8c8c' }}>
            Title preview: <strong style={{ color: '#262626' }}>
              {activeTab === 'NTA'
                ? `NTA-${form.getFieldValue('yearsuffix') || 'YY'}-${form.getFieldValue('number_count') || ''}`
                : `CHEDRO IV-${selectedFYObj?.fiscal_year || 'YYYY'}-${form.getFieldValue('number_count') || ''}`
              }
            </strong>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
