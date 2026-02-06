import React, { useState, useEffect } from 'react'
import { Modal, Select, InputNumber, Button, message } from 'antd'
import axios from 'axios'

export default function EditSlotsModal({ open, onClose, onUpdated }) {
  const [records, setRecords] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [academicYear, setAcademicYear] = useState('')
  const [totalSlots, setTotalSlots] = useState(null)
  const [unfilledSlot, setUnfilledSlot] = useState(null)


  // Fetch scholarship program records
  useEffect(() => {
    if (open) {
      axios.get('http://localhost:8000/api/scholarship_program_records/grouped')
        .then(res => {
          console.log('API Response:', res.data)
          const payload = res?.data?.programs ?? []
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
      setAcademicYears([])
      setTotalSlots([])
      setUnfilledSlot([])
    }
  }, [open])

  // When a program is selected, build its academic years list
  const handleProgramChange = id => {
    const rec = records.find(r => r.id === id)
    if (!rec) return

    setSelectedRecord(rec)

    const years = records
      .filter(r => r.scholarship_program_name === rec.scholarship_program_name)
      .map(r => r.Academic_year)
      .filter(Boolean)

    setAcademicYears([...new Set(years)])
    setAcademicYear(rec.Academic_year || '')
    setTotalSlots(rec.total_slot || null)
  }

  // When year changes, update slots automatically
  const handleYearChange = value => {
    setAcademicYear(value)
    if (selectedRecord) {
      const match = records.find(
        r =>
          r.scholarship_program_name === selectedRecord.scholarship_program_name &&
          r.Academic_year === value
      )
      if (match) {
        setTotalSlots(match.total_slot)
      } else {
        setTotalSlots(null)
      }
    }
  }

  const handleSave = () => {
    if (!selectedRecord || !academicYear) {
      message.warning('Please select a scholarship and enter an academic year')
      return
    }

    const payload = {
      id: selectedRecord.id,
      scholarship_program_name: selectedRecord.scholarship_program_name,
      description: selectedRecord.description,
      Academic_year: academicYear,
      total_slot: Number(totalSlots || 0),
      total_students: selectedRecord.totalstudents,
    }

    axios.put('http://localhost:8000/api/scholarship_program_records/updateSlots', payload)
      .then(res => {
        message.success('Scholarship program updated successfully!')
        onClose()
        const program = res?.data?.program ?? res?.data ?? null
        if (onUpdated) onUpdated(program)
      })
      .catch(() => message.error('Failed to update scholarship program'))
  }
  return (
    <Modal
      title="Update Slot Count for Scholarship Program"
      open={open}
      onCancel={onClose}
      footer={null}
    >
      {/* Scholarship Program Name */}
      <Select
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="Select a scholarship program"
        value={selectedRecord ? selectedRecord.scholarship_program_name : undefined}
        onChange={value => {
          const rec = records.find(r => r.scholarship_program_name === value)
          if (!rec) return
          setSelectedRecord(rec)
          setAcademicYears(rec.years.map(y => y.Academic_year)) // ✅ pull from nested years
          setAcademicYear('')
          setTotalSlots('')
          setUnfilledSlot(match ? match.unfilled_slot : null) // ✅
        }}
      >
        {records.map(r => (
          <Select.Option key={r.scholarship_program_name} value={r.scholarship_program_name}>
            {r.scholarship_program_name} — {r.description}
          </Select.Option>
        ))}
      </Select>

      {/* Academic Year */}
      <Select
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="Select Academic Year"
        value={academicYear}
        onChange={value => {
          setAcademicYear(value)
          const match = selectedRecord?.years.find(y => y.Academic_year === value)
          setTotalSlots(match ? match.total_slot : null)
          setUnfilledSlot(match ? match.unfilled_slot : 0) // ✅ set here
        }}
      >
        {academicYears.map(year => (
          <Select.Option key={year} value={year}>
            {year}
          </Select.Option>
        ))}
      </Select>

      {/* Total Slots */}
      <InputNumber
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="Total slots"
        value={totalSlots}
        onChange={value => setTotalSlots(value)}
        min={0}
      />

      {academicYear && (
        <p style={{
          width: '100%',
          marginBottom: 12,
          marginLeft: 12,
          fontStyle: 'italic'
        }}
        >
          You selected <strong>{academicYear}</strong>
          <br />
          Unfilled slots are <strong>{unfilledSlot}</strong>

        </p>
      )}

      <Button type="primary" block onClick={handleSave}>
        Update Slot to Scholarship Program
      </Button>
    </Modal>

  )
}
