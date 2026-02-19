import React, { useState, useEffect } from 'react'
import { Modal, Select, InputNumber, Button, message, Alert } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import axios from 'axios'
import { API_BASE } from '../lib/config'

export default function UpdateSlotModal({ open, onClose, onUpdated }) {
  const [records, setRecords] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [selectedYearData, setSelectedYearData] = useState(null)
  const [academicYear, setAcademicYear] = useState('')
  const [totalSlots, setTotalSlots] = useState(null)

  useEffect(() => {
    if (open) {
      axios.get(`${API_BASE}/scholarship_program_records/grouped`)
        .then(res => {
          const payload = res?.data?.programs ?? []
          setRecords(Array.isArray(payload) ? payload : [])
        })
        .catch(() => message.error('Error fetching scholarship program choices'))
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setSelectedRecord(null)
      setSelectedYearData(null)
      setAcademicYear('')
      setTotalSlots(null)
      setAcademicYears([])
    }
  }, [open])

  const handleProgramChange = (value) => {
    const rec = records.find(r => r.scholarship_program_name === value)
    if (!rec) return
    setSelectedRecord(rec)
    setAcademicYears(rec.years?.map(y => y.Academic_year) || [])
    setAcademicYear('')
    setTotalSlots(null)
    setSelectedYearData(null)
  }

  const handleYearChange = (value) => {
    setAcademicYear(value)
    const match = selectedRecord?.years?.find(y => y.Academic_year === value)
    setSelectedYearData(match || null)
    setTotalSlots(match ? match.total_slot : null)
  }

  const exceeded = selectedYearData && totalSlots !== null && totalSlots < selectedYearData.total_students

  const handleSave = () => {
    if (!selectedYearData || !academicYear) {
      message.warning('Please select a scholarship program and academic year')
      return
    }

    axios.put(`${API_BASE}/scholarship_program_records/updateSlots`, {
      id: selectedYearData.id,
      total_slot: Number(totalSlots || 0),
    })
      .then(res => {
        message.success('Slot count updated successfully!')
        onClose()
        if (onUpdated) onUpdated(res?.data?.program ?? res?.data ?? null)
      })
      .catch(() => message.error('Failed to update slot count'))
  }

  return (
    <Modal
      title="Update Slot Count"
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 4 }}>
          Scholarship Program
        </label>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a scholarship program"
          value={selectedRecord?.scholarship_program_name || undefined}
          onChange={handleProgramChange}
        >
          {records.map(r => (
            <Select.Option key={r.scholarship_program_name} value={r.scholarship_program_name}>
              {r.scholarship_program_name} — {r.description}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 4 }}>
          Academic Year
        </label>
        <Select
          style={{ width: '100%' }}
          placeholder="Select academic year"
          value={academicYear || undefined}
          onChange={handleYearChange}
          disabled={!selectedRecord}
        >
          {academicYears.map(year => (
            <Select.Option key={year} value={year}>{year}</Select.Option>
          ))}
        </Select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 4 }}>
          Total Slots
        </label>
        <InputNumber
          style={{ width: '100%' }}
          placeholder="Total slots"
          value={totalSlots}
          onChange={value => setTotalSlots(value)}
          min={0}
          disabled={!selectedYearData}
        />
      </div>

      {selectedYearData && (
        <div style={{
          background: '#fafafa',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          color: '#595959',
        }}>
          <div>Students using slots: <strong>{selectedYearData.total_students}</strong></div>
          <div>Current unfilled: <strong>{selectedYearData.unfilled_slot}</strong></div>
        </div>
      )}

      {exceeded && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          message="Slots will be exceeded"
          description={`${selectedYearData.total_students} students currently use slots but you are setting the total to ${totalSlots}.`}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      <Button type="primary" block onClick={handleSave} disabled={!selectedYearData}>
        Update Slot Count
      </Button>
    </Modal>
  )
}
