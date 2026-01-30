import { useEffect, useState } from 'react' 
import { Card, Typography } from 'antd' 
import { ContactsOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
const { Text } = Typography
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'SCHOLARSHIP GRANT PROGRAM FOR CHILDREN AND DEPENDENTS OF SUGARCANE INDUSTRY WORKERSAND SMALL SUGARCANE FARMERS (SIDA-SGP) | StuFAPs' },
    { name: 'description', content: 'Manage CMSP records' },
  ]
}

function StatsCards({ financialAssistances = [] }) {
  
  const totals = {
    totalSlots: financialAssistances.reduce((sum, p) => sum + (p?.total_slot || 0), 0),
    totalFilled: financialAssistances.reduce((sum, p) => sum + (p?.filled_slot || 0), 0),
    totalUnfilled: financialAssistances.reduce((sum, p) => sum + (p?.unfilled_slot || 0), 0),
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

export default function FinancialAssistanceSida_Sgp() { 
    const [expandedId, setExpandedId] = useState(null);
    const [financialAssistances, setFinancialAssistances] = useState([])


    const [expandedSUC, setExpandedSUC] = useState(null);
    const [expandedPrivate, setExpandedPrivate] = useState(null);

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

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

    const sucPrograms = [
            {
            id: "regular-allowances",
            name: "Regular Allowances",
            rows: [
            {
                label:
                "Stipend (includes subsistence, clothing, transportation, tours, field trips, small projects, medical insurance)",
                perSem: "10,000.00/month x 10 months or 50,000/semester",
                perAY: "₱100,000.00",
            },
            {
                label: "Book allowance and other learning materials",
                perSem: "₱5,000.00/Semester",
                perAY: "₱10,000.00",
            },
            ],
            total: {perAY: "₱110,000.00" },
        }
    ];

    const gradPrograms = [
            {
            id: "Regular Allowances",
            name: "Regular Allowances",
            rows: [
            {
                label:
                "a. Tuition and Other School Fees",
                perSem: "₱30,000.00/semester",
                perAY: "₱60,000.00",
            },
            {
                label: "Stipend (which includes subsistence, clothing, transportation allowance, educational tours, field trips, expenses for small projects and medical insurance)",
                perSem: "PHP10,000.00/month x 10 months or PHP50,000/semester",
                perAY: "₱100,000.00",
            },
            {
                label: " Book allowance and other learning materials",
                perSem: "₱7,500.00/semester",
                perAY: "₱15000.00",
            },
            ],
            total: { perAY: "₱175,000.00" },
        }
    ];



    const TableSection = ({ title, programs, expandedId, setExpandedId }) => (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700 mb-6">
            {title}
            </h2>
            <div className="space-y-4">
            {programs.map((program) => (
                <div
                key={program.id}
                className="border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                <button
                    onClick={() =>
                    setExpandedId(expandedId === program.id ? null : program.id)
                    }
                    className="w-full bg-red-50 hover:bg-red-100 p-4 text-left flex justify-between items-center transition-colors duration-200"
                >
                    <span className="font-bold text-gray-800">{program.name}</span>
                    <span
                    className="text-red-600 text-xl transition-transform duration-200"
                    style={{
                        transform:
                        expandedId === program.id ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    >
                    ▼
                    </span>
                </button>

                {expandedId === program.id && (
                    <div className="p-4 animate-in fade-in duration-200">
                    <table className="w-full text-sm md:text-base border-collapse border border-gray-400">
                        <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-400 p-3 text-left font-bold text-gray-800">
                            Type
                            </th>
                            <th className="border border-gray-400 p-3 text-center font-bold text-gray-800 w-28">
                            Unit Cost (PHP)
                            </th>
                            <th className="border border-gray-400 p-3 text-center font-bold text-gray-800 w-28">
                            Total Cost per Academic Year (PHP)
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {program.rows.map((row, idx) => (
                            <tr
                            key={idx}
                            className="hover:bg-gray-50 transition-colors duration-100"
                            >
                            <td className="border border-gray-400 p-3 text-left text-gray-700">
                                {row.label}
                            </td>
                            <td className="border border-gray-400 p-3 text-center font-medium text-gray-800 w-28">
                                {row.perSem}
                            </td>
                            <td className="border border-gray-400 p-3 text-center font-medium text-gray-800 w-28">
                                {row.perAY}
                            </td>
                            </tr>
                        ))}
                        <tr className="bg-red-100 hover:bg-red-150 transition-colors duration-100 font-bold">
                            <td className="border border-gray-400 p-3 text-left text-gray-800">
                            Total
                            </td>
                            <td colSpan={2} className="border border-gray-400 p-3 text-right text-gray-800 w-28">
                            
                            {program.total.perAY}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    </div>
                )}
                </div>
            ))}
            </div>
        </div>
    );

    const otherPrograms = [
        {
            id: "other-benefits",
            name: "Others",
            rows: [
            {
                label: "Thesis and/or OJT allowance",
                cost: "₱75,000.00",
            },
            {
                label:
                "One-time attendance to local conference/fora (junior/senior year, outside enrolled HEI)",
                cost: "₱15,000.00",
            },
            ],
            total: { cost: "₱90,000.00" },
        },
    ];

    const grad_otherPrograms = [
        {
            id: "grad-other-benefits",
            name: "Others",
            rows: [
            {
                label:                
                "One-time attendance to local conference/fora; (Should be related to the graduate program. The activity should not be on the same HEI where the beneficiary is enrolled.)",
                cost: "₱15,000",
            },
            {
                label:
                "Dissertation Allowance (Doctoral)",
                cost: "₱100,000.00",
            },
            ],
            total: { cost: "₱75,000.00" },
        },
    ];

    const CompressedTableSection = ({ title, programs, expandedId, setExpandedId }) => (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700 mb-6">
        {title}
        </h2>
        <div className="space-y-4">
        {programs.map((program) => (
            <div
            key={program.id}
            className="border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
            <button
                onClick={() =>
                setExpandedId(expandedId === program.id ? null : program.id)
                }
                className="w-full bg-red-50 hover:bg-red-100 p-4 text-left flex justify-between items-center transition-colors duration-200"
            >
                <span className="font-bold text-gray-800">{program.name}</span>
                <span
                className="text-red-600 text-xl transition-transform duration-200"
                style={{
                    transform:
                    expandedId === program.id ? "rotate(180deg)" : "rotate(0deg)",
                }}
                >
                ▼
                </span>
            </button>

            {expandedId === program.id && (
                <div className="p-4 animate-in fade-in duration-200">
                <table className="w-full text-sm md:text-base border-collapse border border-gray-400">
                    <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-gray-400 p-3 text-left font-bold text-gray-800">
                        Type
                        </th>
                        <th className="border border-gray-400 p-3 text-center font-bold text-gray-800 w-36">
                        Total Cost
                        </th>
                    </tr>
                    </thead>
                    <tbody>
                    {program.rows.map((row, idx) => (
                        <tr
                        key={idx}
                        className="hover:bg-gray-50 transition-colors duration-100"
                        >
                        <td className="border border-gray-400 p-3 text-left text-gray-700">
                            {row.label}
                        </td>
                        <td className="border border-gray-400 p-3 text-center font-medium text-gray-800 w-36">
                            {row.cost}
                        </td>
                        </tr>
                    ))}
                    <tr className="bg-red-100 hover:bg-red-150 transition-colors duration-100 font-bold">
                        <td className="border border-gray-400 p-3 text-left text-gray-800">
                        Total
                        </td>
                        <td className="border border-gray-400 p-3 text-center text-gray-800 w-36">
                        {program.total.cost}
                        </td>
                    </tr>
                    </tbody>
                </table>
                </div>
            )}
            </div>
        ))}
        </div>
    </div>
    );





    return (
        
        <div className="min-h-screen bg-gray-100">
        
        <main>
            
            <StatsCards financialAssistances={(Array.isArray(financialAssistances) ? financialAssistances : []).filter(
              p => p?.scholarship_program_name?.toUpperCase() === "SIDA-SGP"
            )} />

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    SCHOLARSHIP GRANT PROGRAM FOR CHILDREN AND DEPENDENTS 
                    OF SUGARCANE INDUSTRY WORKERSAND SMALL SUGARCANE FARMERS 
                    (SIDA-SGP)              
                </h1>   
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">SIDA-SGP</h3>
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    To provide scholarship grant to children and dependents of sugarcane industry workers
                    and small sugarcane farmers duly certified by the Sugar Regulatory Administration (SRA).            
                </p>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Overview</h1>
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Administered in partnership with the Sugar Regulatory Administration (SRA), the program is designed to assist children and dependents of sugarcane industry workers and small sugarcane farmers in accessing quality higher education.           
                </p>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Scope and Coverage</h1>
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    The scholarship grant program is open to qualified and deserving children and
                    dependents of sugarcane industry workers and small sugarcane farmers. This
                    program shall cover both undergraduate and graduate students who will enroll or are
                    currently enrolled in agriculture, agricultural engineering and mechanics, and
                    chemical engineering/sugar technology as identified in Sec. 6.b of R.A. 10659 in any
                    identified State Universities and Colleges (SUCs). Slot allocation per concerned region will be determined and recommended by Sugar
                    Regulatory Administration (SRA).
                </p>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Application Process</h1>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-700">
                        Undergraduate Program
                    </h1>

                        <ol className="mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                            <li>
                                For Graduating Senior High School students – duly certified true copy of grades for Grade 11 and 1st semester of Grade 12
                            </li>
                            <li>
                                For Lifelong Learners eligible for college – High School Report Card
                            </li>
                            <li>
                                For Applicants with earned units in college – duly Certified Copy of Grades for the latest semester/term attended
                            </li>
                            <li>
                                For other Applicants:
                                <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                                <li>ALS – duly certified copy of ALS Accreditation and Equivalency Test Passer Certificate</li>
                                <li>PEPT – duly certified copy of PEPT Certificate of Advancing to the next level</li>
                                </ol>
                            </li>
                            <li>
                                Certificate of Good Moral Character from the last school attended
                            </li>
                            <li>
                                Certification from SRA as children and dependents of sugarcane industry workers and small sugarcane farmers
                            </li>
                            <li>
                                Notice of admission from the SUC
                            </li>
                        </ol>
                </div>
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Graduate Program</h1>

                    <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                        <li>Must be a Filipino Citizen</li>
                        <li>
                            With related undergraduate degree program and must pass the entry level requirements of identified SUC for master and doctoral degree programs
                        </li>
                        <li>
                            Duly certified by SRA as Sugarcane Industry Workers and Small Sugarcane Farmers' children and dependents
                        </li>
                        <li>
                            Applicant and/or spouse must have a combined annual gross income of not to exceed Php 500,000.00
                        </li>
                    </ol>
            </div>
            

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Documentary Requirements</h1>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-700">
                        Undergraduate Program
                    </h1>

                        <ol className="mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                            <li>
                                For Graduating Senior High School students – duly certified true copy of grades for Grade 11 and 1st semester of Grade 12
                            </li>
                            <li>
                                For Lifelong Learners eligible for college – High School Report Card
                            </li>
                            <li>
                                For Applicants with earned units in college – duly Certified Copy of Grades for the latest semester/term attended
                            </li>
                            <li>
                                For other Applicants:
                                <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                                <li>ALS – duly certified copy of ALS Accreditation and Equivalency Test Passer Certificate</li>
                                <li>PEPT – duly certified copy of PEPT Certificate of Advancing to the next level</li>
                                </ol>
                            </li>
                            <li>
                                Certificate of Good Moral Character from the last school attended
                            </li>
                            <li>
                                Certification from SRA as children and dependents of sugarcane industry workers and small sugarcane farmers
                            </li>
                            <li>
                                Notice of admission from the SUC
                            </li>
                            <li>
                                Proof of Income – any one (1) of the following:
                                <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                                <li>Latest Income Tax Return (ITR) of parents/guardians if employed</li>
                                <li>Certificate of Tax Exemption from the Bureau of Internal Revenue (BIR)</li>
                                <li>Certificate of No Income from BIR</li>
                                <li>Certificate of Indigence from their barangay</li>
                                <li>Certificate/Case Study from Department of Social Welfare and Development (DSWD)</li>
                                <li>For Children of OFW and Seafarers, a latest copy of contract or proof of income may be considered</li>
                                </ol>
                            </li>
                        </ol>
                </div>
            </div>
            

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Graduate Program</h1>

                    <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                        <li>
                            Diploma and Transcript of Records (TOR) of baccalaureate/master's thesis/dissertation proposal approved and endorsed by the Technical Working Group (TWG) for grant
                        </li>
                        <li>
                            Certificate of Good Moral Character from the last school attended
                        </li>
                        <li>
                            Certification from SRA as children and dependents of Sugarcane Industry Workers and Small Sugarcane Farmers
                        </li>
                        <li>
                            Notice of admission from the SUC
                        </li>
                        <li>
                            Proof of Income – any one (1) of the following:
                            <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                            <li>Latest ITR</li>
                            <li>Certificate of Tax Exemption from the BIR</li>
                            <li>Certificate of No Income from BIR</li>
                            <li>Certificate of Indigence from their barangay</li>
                            <li>Certificate/Case Study from DSWD</li>
                            </ol>
                        </li>
                        </ol>

            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Modes of Payment</h1>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-700">
                        Mode 1
                    </h1>

                    <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    CHEDROs release financial benefits directly to
                    beneficiaries through checks or authorized banks; and           
                    </p>

                    <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-700">
                        Mode 2
                    </h1>

                    <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    CHEDROs transfer financial benefits to beneficiaries through SUCs.           
                    </p>
          
                </div>
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Documentary Requirement for Regular Allowance</h1>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-700">
                        Mode 1
                    </h1>

                    <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                        <li>Copy of Notice of Award (NOA) – Annex A</li>
                        <li>Copy of Certificate of Enrollment (COE) or Certificate of Registration (COR)</li>
                        <li>Certified True Copy of Grades of the previous term issued by the school</li>
                        <li>Copy of valid school ID</li>
                        <li>Copy of ATM card as applicable</li>
                    </ol>


                    <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-700">
                        Mode 2
                    </h1>

                    <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                        <li>Billing Statement from SUC</li>
                        <li>Memorandum of Agreement between CHEDRO and SUC</li>
                    </ol>

          
                </div>
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Documentary Requirement for Thesis/Dissertation Allowance</h1>

                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Hardbound copy of Thesis/Dissertation with signed approval
                    sheet or certification from SUC of completion of the study, to be
                    submitted to CHED Central Office through CHEDRO.          
                </p>

                
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Documentary Requirement for On-the-Job Training (OJT) Allowance</h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Copy of Narrative Report</li>
                    <li>Copy of Grades to be submitted to CHED Central Office through CHEDRO</li>
                </ol>
                
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Documentary Requirement for Attendance to Local Conference/Fora</h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>
                        Invitation to a local conference/fora or brochure providing details of the conference and/or seminar attended
                    </li>
                    <li>
                        Letter of endorsement/recommendation by the Dean or Head of the institution where applicant is enrolled
                    </li>
                    <li>
                        Proof of acceptance
                    </li>
                    <li>
                        Certificate of appearance or participation
                    </li>
                </ol>
                
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Application Procedure</h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>
                        Student applicant shall submit to the SRA Mill District all documentary requirements to secure SRA certification
                    </li>
                    <li>
                        The SRA Mill District shall submit the completed documents, which includes SRA Board Secretary Certificate among others, to the concerned CHEDRO
                    </li>
                    <li>
                        CHEDROs shall evaluate and rank student applicants
                    </li>
                    <li>
                        OSDS shall validate the rank list and approve the list of qualified beneficiaries for funding purposes
                    </li>
                </ol>
                
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">

                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Financial Benefits</h1>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <TableSection
                        title="Undergraduate Programs"
                        programs={sucPrograms}
                        expandedId={expandedId}
                        setExpandedId={setExpandedId}
                    />

                    <CompressedTableSection
                        title="Others"
                        programs={otherPrograms}
                        expandedId={expandedId}
                        setExpandedId={setExpandedId}
                    />

                </div >
            
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">

            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Graduate Programs</h1>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <TableSection
                            title="Graduate Programs"
                            programs={gradPrograms}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                        />

                        <CompressedTableSection
                            title="Others"
                            programs={grad_otherPrograms}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                        />
                </div>
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Conditions of the Scholarship Program</h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Accept and sign the NOA</li>
                    <li>Enroll only in identified priority programs in the concerned SUCs following the conditions of the NOA</li>
                    <li>Carry a full load as prescribed in the curriculum of the study program of the concerned SUCs</li>
                    <li>Pass all subjects enrolled for the continuance of the program</li>
                    <li>Maintain a GWA of at least 2.5 for baccalaureate and 2.0 for graduate</li>
                    <li>Execute and conform with the Scholarship Service Contract (SSC) (Annex B) in consideration of the scholarship grant</li>
                    <li>Transfer only to concerned SUCs or shift to priority programs upon written approval of CHEDRO</li>
                    <li>
                    Complete the degree program enrolled within its prescribed duration.  
                    In case of delayed completion due to acceptable and valid reasons, one semester extension may be granted but without stipend
                    </li>
                    <li>
                    Avail of only one government-funded financial assistance program.  
                    Beneficiaries may benefit from another financial assistance program from a separate government entity provided there is no duplication of financial benefits mentioned under Section V of this amendatory CMO, unless a later law indicates otherwise
                    </li>
                </ol>
                
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Administrative Cost</h1>
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    The Administrative Cost (AC) shall be 5% of the total budget allocated for the program
                    and shall be distributed as follows: 2.5% for Office of the Student Development and
                    Services (OSDS), CHED, 1.25% for the concerned CHEDROs and 1.25% for the
                    SUCs. The utilization of AC should be in accordance with the existing government
                    accounting and auditing rules and regulations.
                </p>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">AC shall be used for related expenses such as but not limited to:</h1>
                
                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Office supplies and materials</li>
                    <li>Communication</li>
                    <li>Transportation/travel</li>
                    <li>Monitoring</li>
                    <li>Maintenance/repair of equipment</li>
                    <li>Meetings and conferences</li>
                    <li>Printing</li>
                    <li>Sourcing of job order services</li>
                    <li>Overtime services</li>
                    <li>Other incidental expenses</li>
                </ol>

            </div>
        </main>
        <footer className="bg-gray-800 text-white text-center py-4">
            <div>
                <p className="text-sm">
                CMO-No.-2-s.-2020-Amendments-to-CMO-No.-30-s-2016 
            </p>
            <p className="text-sm">
                
            © {new Date().getFullYear()} CMO. All rights reserved.
            </p>
            </div>
            
      </footer>
        </div>
    )
}