import React, { useState, useEffect } from 'react'
import { Modal, Select, Input, InputNumber, Button, message } from 'antd'
import axios from 'axios'

export default function EditSlotsModal({ open, onClose, onUpdated }) {
  const [records, setRecords] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [academicYear, setAcademicYear] = useState('')
  const [totalSlots, setTotalSlots] = useState(null)

  // Fetch scholarship program records
  useEffect(() => {
    if (open) {
      axios.get('http://localhost:8000/api/scholarship_program_records')
        .then(res => {
          const payload = res?.data?.data ?? []
          setRecords(Array.isArray(payload) ? payload : [])
        })
        .catch(() => message.error('Error fetching scholarship program choices'))
    }
  }, [open])

  // Reset fields when modal opens
  useEffect(() => {
    if (open) {
      setSelectedRecord(null)
      setAcademicYear('')
      setTotalSlots(null)
    }
  }, [open])

  const handleSave = () => {
    const rec = records.find(r => r.id === selectedRecord)

    if (!rec || !academicYear) {
      message.warning('Please select a scholarship and enter an academic year')
      return
    }

    const payload = {
      scholarship_program_name: rec.scholarship_program_name,
      description: rec.description,
      academic_year: academicYear,
      total_slot: Number(totalSlots || 0),
    }

    axios.post('http://localhost:8000/api/scholarship_program_records', payload)
      .then(res => {
        message.success('Scholarship program inserted successfully!')
        onClose()
        const program = res?.data?.program ?? res?.data ?? null
        if (onUpdated) onUpdated(program)
      })
      .catch(() => message.error('Failed to insert scholarship program'))
  }

  return (
    <Modal
      title="Insert Slot to Scholarship Program"
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <Select
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="Select a scholarship (Name - Description)"
        onChange={value => setSelectedRecord(value)}
        value={selectedRecord}
      >
        {records.map(r => (
          <Select.Option key={r.id} value={r.id}>
            {r.scholarship_program_name} — {r.description}
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
        placeholder="Total slots"
        value={totalSlots}
        onChange={value => setTotalSlots(value)}
        min={0}
      />

      <Button type="primary" block onClick={handleSave}>
        Insert Slot to Scholarship Program
      </Button>
    </Modal>
  )
}
