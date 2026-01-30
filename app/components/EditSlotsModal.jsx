import React, { useState, useEffect } from 'react'
import { Modal, Select, Input, InputNumber, Button, message } from 'antd'
import axios from 'axios'

export default function EditSlotsModal({ open, onClose, onUpdated }) {
  const [records, setRecords] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [scholarshipName, setScholarshipName] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [totalSlots, setTotalSlots] = useState(null)

  // Fetch scholarship program records (choices) when modal opens
  useEffect(() => {
    if (open) {
      axios.get('http://localhost:8000/api/scholarship_program_records')
        .then(res => {
          const data = res.data.data || res.data
          setRecords(Array.isArray(data) ? data : [])
        })
        .catch(() => message.error('Error fetching scholarship program choices'))
    }
  }, [open])

  const handleInsert = () => {
    if (!selectedRecord || !academicYear) {
      message.warning('Please select a scholarship and enter an academic year')
      return
    }

    const total = Number(totalSlots || 0)
    axios.post('http://localhost:8000/api/scholarship_program_records', {
      program_id: selectedRecord,
      scholarship_program_name: scholarshipName,
      academic_year: academicYear,
      total_slot: total,
    })
    .then(res => {
      message.success('Scholarship program inserted successfully!')
      onClose()
      if (onUpdated) onUpdated(res.data.program)
    })
    .catch(() => message.error('Failed to insert scholarship program'))
  }

  return (
    <Modal
      title="Add Scholarship Program"
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <Select
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="Select a scholarship (from records)"
        onChange={value => {
          setSelectedRecord(value)
          const rec = records.find(rr => rr.id === value)
          setScholarshipName(rec?.scholarship_program_name || '')
        }}
        value={selectedRecord}
      >
        {records.map(r => (
          <Select.Option key={r.id} value={r.id}>
            {r.scholarship_program_name}{r.description ? ` — ${r.description}` : ''}
          </Select.Option>
        ))}
      </Select>

      <Input
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="Academic year (e.g., 2025-2026)"
        value={academicYear}
        onChange={e => setAcademicYear(e.target.value)}
      />

      <InputNumber
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="Total slots (optional)"
        value={totalSlots}
        onChange={value => setTotalSlots(value)}
        min={0}
      />
      <Button type="primary" block onClick={handleInsert}>
        Insert Slot to Scholarship Program
      </Button>
    </Modal>
  )
}
