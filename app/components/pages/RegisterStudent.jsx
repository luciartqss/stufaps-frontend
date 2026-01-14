import { useState, useEffect } from 'react'

export default function RegisterStudent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Fetch students from the database
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true)
      const response = await fetch('http://localhost:8000/api/students', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      })

      if (response.ok) {
        const result = await response.json()
        setStudents(result)
      } else {
        console.error('Failed to fetch students')
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  // Fetch students on component mount
  useEffect(() => {
    fetchStudents()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    setMessage('')

    try {
      const response = await fetch('http://localhost:8000/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Student registered successfully!')
        setFormData({ name: '', email: '', password: '' })
        // Refresh the students list after successful registration
        fetchStudents()
      } else {
        setMessage('Registration failed. Please try again.')
      }
    } catch (error) {
      console.error('Error registering student:', error)
      setMessage('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      color: '#e0e0e0'
    }}>
      {/* Registration Form */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ color: '#fff', marginBottom: '20px' }}>Student Registration</h1>
        
        {message && (
          <div style={{ 
            padding: '10px', 
            marginBottom: '15px',
            backgroundColor: message.includes('successfully') ? '#155724' : '#721c24',
            color: '#fff',
            border: `1px solid ${message.includes('successfully') ? '#28a745' : '#dc3545'}`,
            borderRadius: '4px'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="name" style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #555',
                borderRadius: '4px',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="email" style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #555',
                borderRadius: '4px',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #555',
                borderRadius: '4px',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#555' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Registering...' : 'Register Student'}
          </button>
        </form>
      </div>

      {/* Students List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ marginRight: '15px', color: '#fff' }}>Registered Students</h2>
          <button
            onClick={fetchStudents}
            disabled={loadingStudents}
            style={{
              padding: '8px 16px',
              backgroundColor: loadingStudents ? '#555' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loadingStudents ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {loadingStudents ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loadingStudents ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px', 
            color: '#999',
            fontSize: '16px'
          }}>
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px', 
            backgroundColor: '#2a2a2a',
            borderRadius: '4px',
            color: '#999',
            border: '1px solid #555'
          }}>
            No students registered yet.
          </div>
        ) : (
          <div style={{ 
            border: '1px solid #555', 
            borderRadius: '4px',
            backgroundColor: '#2a2a2a',
            overflow: 'hidden'
          }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 1fr',
              gap: '15px',
              padding: '15px',
              backgroundColor: '#333',
              borderBottom: '1px solid #555',
              fontWeight: 'bold',
              color: '#fff',
              fontSize: '14px'
            }}>
              <div>ID</div>
              <div>Name</div>
              <div>Email</div>
            </div>

            {/* Table Body */}
            {students.map((student, index) => (
              <div
                key={student.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 1fr',
                  gap: '15px',
                  padding: '15px',
                  borderBottom: index < students.length - 1 ? '1px solid #444' : 'none',
                  backgroundColor: index % 2 === 0 ? '#2a2a2a' : '#333',
                  color: '#e0e0e0',
                  fontSize: '14px'
                }}
              >
                <div style={{ color: '#007bff', fontWeight: 'bold' }}>{student.id}</div>
                <div>{student.name}</div>
                <div style={{ color: '#28a745' }}>{student.email}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ 
          marginTop: '15px', 
          fontSize: '14px', 
          color: '#999',
          textAlign: 'center'
        }}>
          Total Students: <span style={{ color: '#007bff', fontWeight: 'bold' }}>{students.length}</span>
        </div>
      </div>
    </div>
  )
}