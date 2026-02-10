import React, { useState, useEffect } from 'react'
import { Modal, Select, Input, InputNumber, Button, message } from 'antd'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function EditSlotsModal({ open, onClose, onUpdated }) {
  const [records, setRecords] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
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

    axios.post(`${API_BASE}/scholarship_program_records`, {
      scholarship_program_name: rec.scholarship_program_name,
      description: rec.description,
      Academic_year: academicYear,
      total_slot: Number(totalSlots || 0),
    })
      .then(res => {
        message.success('Scholarship program inserted successfully!')
        onClose()
        if (onUpdated) onUpdated(res?.data?.program ?? res?.data ?? null)
      })
      .catch(() => message.error('This scholarship program already has a record for that academic year.'))
  }

  return (
    <Modal title="Add Slots to Scholarship Program" open={open} onCancel={onClose} footer={null}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 4 }}>
          Scholarship Program
        </label>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a scholarship (Name — Description)"
          onChange={value => setSelectedRecord(value)}
          value={selectedRecord}
        >
          {records.map(r => (
            <Select.Option key={r.id} value={r.id}>
              {r.scholarship_program_name} — {r.description}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#595959', marginBottom: 4 }}>
          Academic Year
        </label>
        <Input
          placeholder="e.g. 2025-2026"
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
        />
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
        />
      </div>

      <Button type="primary" block onClick={handleSave} disabled={!selectedRecord || !academicYear}>
        Add Slots
      </Button>
    </Modal>
  )
}
