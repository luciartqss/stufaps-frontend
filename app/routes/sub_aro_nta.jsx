// HomePage.jsx
import { useEffect, useState } from 'react'
import { Typography, Button, Modal, Form, Input, Select, Upload, message, Card, Space, Popconfirm } from 'antd'
import { InboxOutlined, DeleteOutlined, FileOutlined, FilePdfOutlined } from '@ant-design/icons'
const { Text, Title } = Typography



export default function SUB_ARO_NTA() {
  const [fiscalYears, setFiscalYears] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sub-aro');

  // Fetch fiscal years from backend
  useEffect(() => {
    fetch("http://localhost:8000/api/fiscal-years")
      .then((res) => res.json())
      .then((data) => {
        setFiscalYears(data);
        // Auto-select first fiscal year
        if (data.length > 0) {
          setSelectedFiscalYear(data[0]);
        }
      })
      .catch((err) => console.error("Error fetching fiscal years:", err));
  }, []);

  // Fetch uploaded files from backend
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setFilesLoading(true);
      const response = await fetch("http://localhost:8000/api/sub-aro-nta-files");
      const data = await response.json();
      setUploadedFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setFilesLoading(false);
    }
  };

  // Add Fiscal Year handler (persist to backend)
  const handleAddFiscalYear = async () => {
    try {
      // Determine the next year
      const latestYear = fiscalYears.length > 0
        ? Math.max(...fiscalYears.map(fy => parseInt(fy.fiscal_year)))
        : 2020;

      const newYear = latestYear + 1;

      // Call Laravel API to store new fiscal year
      const response = await fetch("http://localhost:8000/api/fiscal-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year: newYear.toString() })
      });

      if (!response.ok) {
        throw new Error("Failed to add fiscal year");
      }

      const newFY = await response.json();

      // Update local state with new record
      setFiscalYears([...fiscalYears, newFY]);
    } catch (error) {
      console.error("Error adding fiscal year:", error);
    }
  };

  // Handle Upload Modal Open
  const handleOpenUploadModal = () => {
    form.resetFields();
    setFileList([]);
    setIsModalVisible(true);
  };

  // Handle Modal Close
  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  // Handle File Upload
  const handleFileChange = ({ fileList: newFileList }) => {
    setFileList(newFileList.slice(-1)); // Allow only 1 file
  };

  // Handle Form Submission
  const handleSubmitFile = async (values) => {
    if (fileList.length === 0) {
      message.error("Please select a PDF file");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj);
      formData.append('filename', values.filename);
      formData.append('yearsuffix', values.yearsuffix);
      formData.append('number_count', values.number_count);
      formData.append('filetype', activeTab.toUpperCase()); // Add file type based on active tab

      const response = await fetch("http://localhost:8000/api/sub-aro-nta-files", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      message.success("File uploaded successfully");
      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      fetchFiles(); // Refresh file list
    } catch (error) {
      console.error("Error uploading file:", error);
      message.error("Error uploading file");
    } finally {
      setLoading(false);
    }
  };

  // Handle File Deletion
  const handleDeleteFile = async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/api/sub-aro-nta-files/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      message.success("File deleted successfully");
      fetchFiles(); // Refresh file list
    } catch (error) {
      console.error("Error deleting file:", error);
      message.error("Error deleting file");
    }
  };

  // Handle File Download
  const handleDownloadFile = (filePath) => {
    const fileUrl = `http://localhost:8000/storage/${filePath}`;
    window.open(fileUrl, "_blank");
  };

  // Render cards for uploaded files
  const renderFileCards = () => {
    let filteredFiles = uploadedFiles;

    // Filter by file type (NTA or SUB-ARO)
    filteredFiles = filteredFiles.filter(f => f.filetype === activeTab.toUpperCase());

    // Filter by fiscal year
    if (selectedFiscalYear) {
      filteredFiles = filteredFiles.filter(f => f.yearsuffix === selectedFiscalYear.year_suffix);
    }

    // Filter by search query (filename, number_count, or title)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredFiles = filteredFiles.filter(f =>
        f.filename.toLowerCase().includes(query) ||
        f.number_count.toLowerCase().includes(query) ||
        f.yearsuffix.toLowerCase().includes(query) ||
        `${f.yearsuffix}-${f.number_count}`.toLowerCase().includes(query) ||
        `CHEDRO-${f.yearsuffix}-${f.number_count}`.toLowerCase().includes(query)
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 16 }}>
        {filteredFiles.map((record) => (
          <Card
            key={record.id}
            style={{
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex',
            }}
            bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#e6f7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: '#1890ff',
                flexShrink: 0,
              }}
            >
              <FilePdfOutlined />
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Text strong style={{ fontSize: 14, display: 'block' }}>
                {record.filetype === 'NTA' 
                  ? `NTA-${record.yearsuffix || "N/A"}-${record.number_count}` 
                  : `CHEDRO IV-${record.yearsuffix || "N/A"}-${record.number_count}`}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  display: 'block',
                  marginBottom: 8,
                  color: '#1890ff',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  wordBreak: 'break-word'
                }}
                onClick={() => handleDownloadFile(record.file)}
              >
                {record.filename}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                Uploaded: {new Date(record.created_at).toLocaleDateString()}
              </Text>
            </div>

            <Space style={{ flexShrink: 0 }}>
              <Popconfirm
                title="Delete File"
                description="Are you sure you want to delete this file?"
                onConfirm={() => handleDeleteFile(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="default" danger size="small" icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            </Space>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#fff', margin: -24, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>SUB-ARO/NTA</Title>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>Sub Allotment Release Order / Notice of Transfer Allocation</Text>
          </div>
        </div>
      </div>

      {/* Large Card Tab Buttons */}
      <div style={{ padding: '20px 30px', borderBottom: '1px solid #e8eaed', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', gap: 15 }}>
          <Card
            onClick={() => {
              setActiveTab('sub-aro');
              setSearchQuery('');
            }}
            style={{
              flex: 1,
              cursor: 'pointer',
              border: activeTab === 'sub-aro' ? '2px solid #2563eb' : '1px solid #e8eaed',
              backgroundColor: activeTab === 'sub-aro' ? '#e6f4ff' : 'white',
              transition: 'all 0.2s ease',
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Text strong style={{ fontSize: 16, color: activeTab === 'sub-aro' ? '#2563eb' : '#1a1a1a' }}>SUB-ARO</Text>
          </Card>
          <Card
            onClick={() => {
              setActiveTab('nta');
              setSearchQuery('');
            }}
            style={{
              flex: 1,
              cursor: 'pointer',
              border: activeTab === 'nta' ? '2px solid #2563eb' : '1px solid #e8eaed',
              backgroundColor: activeTab === 'nta' ? '#e6f4ff' : 'white',
              transition: 'all 0.2s ease',
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Text strong style={{ fontSize: 16, color: activeTab === 'nta' ? '#2563eb' : '#1a1a1a' }}>NTA</Text>
          </Card>
        </div>
      </div>

      <div style={{ padding: '30px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
        {/* Layout */}
        <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0 }}>

          {/* Sidebar */}
          <aside
            style={{
              width: '200px',
              backgroundColor: '#1e3a8a',
              color: 'white',
              borderRadius: '8px',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px',
                marginBottom: '10px',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                position: 'sticky',
                top: 0,
                backgroundColor: '#1e3a8a',
                zIndex: 10
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: '18px', fontWeight: 600 }}>Fiscal Years</h2>
              {activeTab === 'sub-aro' && (
                <Button
                  type="primary"
                  size="small"
                  onClick={handleAddFiscalYear}
                  style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}
                >
                  Add
                </Button>
              )}
            </div>
 
            <ul style={{ listStyle: 'none', margin: 0, padding: '5px' }}>
              {fiscalYears.map((fy) => (
                <li
                  key={fy.id}
                  onClick={() => setSelectedFiscalYear(selectedFiscalYear?.id === fy.id ? null : fy)}
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    backgroundColor: selectedFiscalYear?.id === fy.id ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
                    borderLeft: selectedFiscalYear?.id === fy.id ? '3px solid #2563eb' : '3px solid transparent',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={(e) => !selectedFiscalYear || selectedFiscalYear?.id !== fy.id ? (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)') : null}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = selectedFiscalYear?.id === fy.id ? 'rgba(37, 99, 235, 0.3)' : 'transparent')}
                >
                  <strong>FY: {fy.fiscal_year}</strong>
                  <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>{fy.fiscal_year}-{parseInt(fy.fiscal_year) + 1}</div>
                </li>
              ))}
            </ul>
          </aside>

          {/* Main Content */}
          <main
            style={{
              flex: 1,
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ maxWidth: '300px' }}
                />
              </div>
              <Button
                type="primary"
                onClick={handleOpenUploadModal}
                style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}
              >
                Upload File
              </Button>
            </div>

            {/* Title for current tab */}
            <div style={{ marginBottom: '20px' }}>
              <Title level={4} style={{ margin: 0, color: '#1a1a1a' }}>
                {activeTab === 'sub-aro' ? 'Sub Allotment Release Order' : 'Notice of Transfer Allocation'}
              </Title>
            </div>

            {/* Content based on active tab */}
            {filesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text type="secondary">Loading files...</Text>
              </div>
            ) : !selectedFiscalYear ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text type="secondary">Select a fiscal year to view files</Text>
              </div>
            ) : activeTab === 'sub-aro' ? (
              uploadedFiles.filter(f => 
                f.filetype === 'SUB-ARO' &&
                f.yearsuffix === selectedFiscalYear.year_suffix &&
                (searchQuery.trim() === '' ||
                  f.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  f.number_count.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  f.yearsuffix.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  `${f.yearsuffix}-${f.number_count}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  `CHEDRO IV-${f.yearsuffix}-${f.number_count}`.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text type="secondary">
                    {searchQuery.trim() ? 'No files match your search' : 'No SUB-ARO files for this fiscal year'}
                  </Text>
                </div>
              ) : (
                renderFileCards()
              )
            ) : (
              uploadedFiles.filter(f => 
                f.filetype === 'NTA' &&
                f.yearsuffix === selectedFiscalYear.year_suffix &&
                (searchQuery.trim() === '' ||
                  f.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  f.number_count.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  f.yearsuffix.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  `${f.yearsuffix}-${f.number_count}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  `NTA-${f.yearsuffix}-${f.number_count}`.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text type="secondary">
                    {searchQuery.trim() ? 'No files match your search' : 'No NTA files for this fiscal year'}
                  </Text>
                </div>
              ) : (
                renderFileCards()
              )
            )}
          </main>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        title={`Upload ${activeTab === 'nta' ? 'NTA' : 'SUB-ARO'} File`}
        open={isModalVisible}
        onOk={form.submit}
        onCancel={handleCloseModal}
        confirmLoading={loading}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitFile}
        >
          {/* PDF Upload */}
          <Form.Item
            label="Select PDF File"
            required
          >
            <Upload.Dragger
              fileList={fileList}
              onChange={handleFileChange}
              accept=".pdf"
              maxCount={1}
              beforeUpload={() => false} // Prevent automatic upload
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag PDF file to this area</p>
              <p className="ant-upload-hint">Only PDF files are supported</p>
            </Upload.Dragger>
          </Form.Item>

          {/* Filename */}
          <Form.Item
            name="filename"
            label="Filename (Custom name for this file)"
            rules={[
              { required: true, message: 'Please enter filename' },
              { max: 255, message: 'Filename must not exceed 255 characters' }
            ]}
          >
            <Input placeholder="e.g., Budget Report - January" />
          </Form.Item>

          {/* Year Suffix Dropdown */}
          <Form.Item
            name="yearsuffix"
            label="Fiscal Year"
            rules={[{ required: true, message: 'Please select a fiscal year' }]}
          >
            <Select placeholder="Select fiscal year" value={selectedFiscalYear?.year_suffix}>
              {fiscalYears.map((fy) => (
                <Select.Option key={fy.id} value={fy.year_suffix}>
                  <p>FY: <strong>{fy.fiscal_year} - ({fy.year_suffix})</strong></p>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Number Input */}
          <Form.Item
            name="number_count"
            label="Reference Number (Format: XX-XXXX...)"
            rules={[
              { required: true, message: 'Please enter reference number' },
              {
                pattern: /^\d{2}-\d+$/,
                message: 'Format must be XX-XXXX (2 digits, hyphen, then unlimited digits. e.g., 01-001, 25-12345)'
              }
            ]}
          >
            <Input placeholder="e.g., 25-001" />
          </Form.Item>

          {/* Display how title will appear */}
          <Form.Item
            label="Display Title (Auto-generated)"
          >
            <div style={{ padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: '4px', color: '#666' }}>
              {activeTab === 'nta' 
                ? `NTA-${selectedFiscalYear?.year_suffix || 'YYYY'}-[your reference number]` 
                : `CHEDRO IV-${selectedFiscalYear?.year_suffix || 'YYYY'}-[your reference number]`}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
