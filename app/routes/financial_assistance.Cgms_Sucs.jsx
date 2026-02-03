import { useEffect, useState } from 'react' 
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Select } from 'antd' 
import { ContactsOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
const { Text } = Typography
const { Option } = Select
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'Cash Grant to Medical Students Enrolled in State Universities and Colleges (CGMS-SUCs) | StuFAPs' },
    { name: 'description', content: 'Manage CMSP records' },
  ]
}

function StatsCards({ financialAssistances }) {
  
  const totals = {
    totalSlots: financialAssistances.reduce((sum, p) => sum + (p.total_slot || 0), 0),
    totalFilled: financialAssistances.reduce((sum, p) => sum + (p.total_students || 0), 0),
    totalUnfilled: financialAssistances.reduce((sum, p) => sum + (p.unfilled_slot || 0), 0),
  }

  const statsConfig = [
    {
      title: 'Total Slots',
      value: totals.totalSlots,
      icon: <ContactsOutlined />,
      color: '#1890ff',
      bgColor: '#e6f7ff',
    },
    {
      title: 'Filled Slots',
      value: totals.totalFilled,
      icon: <TeamOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
      percentage: ((totals.totalFilled / (totals.totalSlots || 1)) * 100).toFixed(1),
    },
    {
      title: 'Unfilled Slots',
      value: totals.totalUnfilled,
      icon: <UserOutlined />,
      color: '#faad14',
      bgColor: '#fffbe6',
      percentage: ((totals.totalUnfilled / (totals.totalSlots || 1)) * 100).toFixed(1),
    },
  ]

return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      {statsConfig.map((stat, index) => (
        <div key={index} style={{ flex: 1, minWidth: 0 }}>
          <Card
            style={{
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              height: 96,
            }}
            bodyStyle={{ 
              padding: 16, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              height: '100%'
            }}
          >
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                {stat.title}
              </Text>
              <Text strong style={{ fontSize: 20, color: stat.color, lineHeight: 1.1, display: 'block' }}>
                {stat.prefix || ''}
                {stat.formatter ? stat.formatter(stat.value) : stat.value.toLocaleString()}
              </Text>
              {stat.percentage && (
                  <>
                  <Progress percent={parseFloat(stat.percentage)} 
                  showInfo={false} 
                  strokeColor={stat.color} 
                  style={{ marginBottom: 8 }} 
                  />

                  <Text style={{ fontSize: 12, color: stat.color }}>
                    {stat.percentage}% of total
                  </Text>
                </>   
              )}
            </div>
            <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: stat.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: stat.color,
                  flexShrink: 0,
                }}
              >
              {stat.icon}
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}

export default function FinancialAssistancescgms_sucs() {
    const [expandedId, setExpandedId] = useState(null);
    const [financialAssistances, setFinancialAssistances] = useState([])


    const [expandedSUC, setExpandedSUC] = useState(null);
    const [expandedPrivate, setExpandedPrivate] = useState(null);

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [academicYearFilter, setAcademicYearFilter] = useState('All')
    const [academicYears, setAcademicYears] = useState([])

        useEffect(() => {
            fetch('http://localhost:8000/api/scholarship_program_records')
                .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`)
                }
                return res.json()
                })
                .then(data => {
                console.log('API Response:', data)
                const programsData = data.data || data
                console.log('Programs Data:', programsData)
                setFinancialAssistances(Array.isArray(programsData) ? programsData : [])
                
                const uniqueYears = [
                ...new Set(
                    programsData.map(p => p.academic_year || p.Academic_year).filter(Boolean)
                )
                ]
                
                setAcademicYears(['All', ...uniqueYears.sort()])
                setLoading(false)
                })
                .catch(err => {
                console.error('Fetch Error:', err)
                setError(err.message)
                setLoading(false)
                })
            }, [])
        
            if (loading) return <div className="p-8">Loading...</div>
            if (error) return <div className="p-8 text-red-600 bg-red-50 border border-red-300 rounded">Error: {error}</div>
            if (!Array.isArray(financialAssistances) || financialAssistances.length === 0) {
            return <div className="p-8 text-yellow-600 bg-yellow-50 border border-yellow-300 rounded">No scholarship programs found. Make sure your backend is running and database is seeded.</div>
            }

            const handleAcademicYearChange = value => { setAcademicYearFilter(value || 'All') }
            
            const filteredCgms = (Array.isArray(financialAssistances) ? financialAssistances : []).filter(p => {
                if (p?.scholarship_program_name?.toUpperCase() !== 'CGMS-SUCS') return false
                if (academicYearFilter && academicYearFilter !== 'All') {
                return (p.academic_year || p.Academic_year) === academicYearFilter
                }
                return true
            })

  return (
    
    <div className="min-h-screen bg-gray-50">
    <main>
        
        <Select
                value={academicYearFilter}
                allowClear
                size="middle"
                style={{ width: 160, marginLeft: 12, marginBottom: 12 }}
                onChange={handleAcademicYearChange}
                >
            {academicYears.map(year => (
            <Option key={year} value={year}>{year}</Option>
            ))}
        </Select>
                    
        <StatsCards financialAssistances={filteredCgms} />

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Cash Grant to Medical Students Enrolled in State Universities and Colleges (CGMS-SUCs)
            </h1>

            <div className="mt-8">
                <div className="border-4 border-gray-700 rounded-lg shadow-lg overflow-hidden">
                    <table className="w-full border-collapse">
                    <tbody>
                        <tr className="hover:bg-gray-100 transition-colors">
                            <td
                                colSpan={2}
                                className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle text-center w-24"
                            >
                                CASH GRANT TO MEDICAL STUDENTS ENROLLED IN STATE UNIVERSITIES AND COLLEGES (CGMS-SUCs)
                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                                WHAT
                            </td>
                            <td className="px-6 py-4 border border-gray-500">
                                <p className="text-gray-700 leading-relaxed">
                                The Implementing Guidelines for the Cash Grants to Medical students enrolled In State Universities and Colleges (CGMS-SUCs) are jointly issued by the Commission on Higher Education (CHED) and the Department of Budget and Management (DBM), aims to provide tuition fee subsidy and financial assistance to all medical students enrolled in identified SUCs offering Doctor of Medicine Program.
                                </p>
                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                                WHO
                            </td>
                            <td className="px-6 py-4 border border-gray-500">

                                <p className="font-bold text-gray-700 leading-relaxed">
                                    Who may apply?                                
                                </p>   

                                <p className="text-gray-700 leading-relaxed">
                                    The program is intended for all Filipino medical students, both new and continuing, who are enrolled in the Doctor of Medicine Program in the following SUCs:
                                </p>   

                                <ol className="list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                                    <li>Bicol University – Daraga, Albay</li>
                                    <li>Cagayan State University – Carig, Tuguegarao City, Cagayan</li>
                                    <li>Mariano Marcos State University – Quiling Sur, City of Batac, Ilocos Norte</li>
                                    <li>Mindanao State University – Marawi City, Lanao Del Sur</li>
                                    <li>University of Northern Philippines – Tamag, Vigan City, Ilocos Sur</li>
                                    <li>University of the Philippines Manila College of Medicine – Pedro Gil, Manila</li>
                                    <li>University of the Philippines Manila School of Health Sciences – Palo, Leyte</li>
                                    <li>West Visayas State University – Luna Street, La Paz, Iloilo City</li>
                                </ol> 

                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                                WHERE
                            </td>
                            <td className="px-6 py-4 border border-gray-500">
                                <p className="font-bold text-gray-700 leading-relaxed mb-1">
                                Where to secure file application?
                                </p>
                                <p className="text-gray-700 leading-relaxed mb-4">
                                Participating SUCs offering Doctor of Medicine programs
                                </p>
                                <p className="font-bold text-gray-700 leading-relaxed mb-1">
                                Where and how to file the application?
                                </p>
                                <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
                                <li>
                                    Applicant submits the accomplished CGMS-SUCs Application Form (Annex “A”) directly to the SUC concerned together with the required documents before the start of academic year applied
                                </li>
                                <li>SUC evaluates the documents of applicants</li>
                                <li>SUC issues Notice of Award (NOA) using Annex “B”</li>
                                <li>Applicant accepts NOA</li>
                                </ul>
                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                                WHO
                            </td>
                            <td className="px-6 py-4 border border-gray-500">

                                <p className="font-bold text-gray-700 leading-relaxed">
                                    Schedule of application:                               
                                </p>   

                                <p className="text-gray-700 leading-relaxed">
                                    Before the start of Academic Year (AY) applied
                                </p> 
                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td colSpan={2} className="text-center px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                               <p>
                                    For queries, call (02) 8988-0001 or email osds-lsad@ched.gov.ph
                               </p>
                            </td>

                        </tr>
                        
                    </tbody>
                    </table>
                </div>
            </div>


            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4">
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-700 mb-4">
                    CGMS-SUCs Reference Materials
                </h2>
                <ul className="list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>
                    <a
                        href="https://ched.gov.ph/wp-content/uploads/CGMS-SUCs-Application-Form.pdf"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        CGMS-SUCs Application Form
                    </a>
                    </li>
                    <li>
                    <a
                        href="https://ched.gov.ph/wp-content/uploads/CGMS-SUCs-Flyer.png"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        CGMS-SUCs Flyer
                    </a>
                    </li>
                    <li>
                    <a
                        href="https://ched.gov.ph/wp-content/uploads/Implementing-Guidelines-for-the-Cash-Grants-to-Medical-Students-Enrolled-in-SUCs-Pursuant-to-Special-Provision-Applicable-to-SUCs-RA-No.-10964.pdf"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Implementing Guidelines for the Cash Grants to Medical Students Enrolled in SUCs, Pursuant to Special Provision Applicable to SUCs, RA No. 10964
                    </a>
                    </li>
                    <li>
                    <a
                        href="https://ched.gov.ph/wp-content/uploads/AMENDM1.pdf"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Amendments to CHED and DBM JMC No. 2018-1
                    </a>
                    </li>
                </ul>
                </div>


        </div>
        </main>
    </div>
  );
}
