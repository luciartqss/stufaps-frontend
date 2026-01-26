import React, { useState, useEffect } from 'react'
import { Modal, Select, InputNumber, Button, message } from 'antd'
import axios from 'axios'

export default function EditSlotsModal({ open, onClose, onUpdated }) {
  const [programs, setPrograms] = useState([])
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [newSlots, setNewSlots] = useState(null)

  // Fetch programs when modal opens
  useEffect(() => {
    if (open) {
      axios.get('http://localhost:8000/api/scholarship_programs')
        .then(res => {
          const data = res.data.data || res.data
          setPrograms(Array.isArray(data) ? data : [])
        })
        .catch(() => message.error('Error fetching programs'))
    }
  }, [open])

  const handleUpdate = () => {
    if (!selectedProgram || !newSlots) {
      message.warning('Please select a program and enter slots')
      return
    }

    axios.post('http://localhost:8000/api/scholarship_programs/edit-slots', {
      id: selectedProgram,
      slots: newSlots,
    })
    .then(res => {
      message.success('Slots updated successfully!')
      onClose()
      if (onUpdated) onUpdated(res.data.program)   // ✅ pass updated program back
    })
    .catch(() => message.error('Failed to update slots'))
  }

  return (
    <Modal
      title="Edit Scholarship Slots"
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <Select
        style={{ width: '100%', marginBottom: 16 }}
        placeholder="Select a scholarship program"
        onChange={value => {
          setSelectedProgram(value)
          const selected = programs.find(p => p.id === value)
          setNewSlots(selected?.total_slot || null)
        }}
      >
        {programs.map(p => (
          <Select.Option key={p.id} value={p.id}>
            {p.scholarship_program_name} — {p.description}
          </Select.Option>
        ))}
      </Select>

      <InputNumber
        style={{ width: '100%', marginBottom: 16 }}
        placeholder="Enter new slot count"
        value={newSlots}
        onChange={value => setNewSlots(value)}
      />

      <Button type="primary" block onClick={handleUpdate}>
        Update Slots
      </Button>
    </Modal>
  )
}
