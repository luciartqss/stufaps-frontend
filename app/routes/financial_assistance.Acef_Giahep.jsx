import { useEffect, useState } from 'react' 
import { Card, Typography } from 'antd' 
import { ContactsOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
const { Text } = Typography
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'Agricultural Competitiveness Enhancement Fund - Grants-in-Aid for Higher Education Program (ACEF-GIAHEP) Overview | StuFAPs' },
    { name: 'description', content: 'Manage CMSP records' },
  ]
}

function StatsCards({ financialAssistances }) {
  
  const totals = {
        totalSlots: financialAssistances.reduce((sum, p) => sum + (p.total_slot || 0), 0),
        totalFilled: financialAssistances.reduce((sum, p) => sum + (p.filled_slot || 0), 0),
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

export default function FinancialAssistanceAcef_giahep() {
    
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
    
      // ✅ Scholarship Benefits Data
      const PrivateHEIs = [
        {
          id: "regular-allowances",
          name: "Allowances",
          rows: [
            {
              label: "TOSF",
              perSem: "₱10,000",
              perAY: "₱20,000.00",
            },
            {
              label: "Stipend",
              perSem: "₱17,500.00",
              perAY: "₱35,000.00",
            },
            {
              label: "Book Allowance",
              perSem: "₱2,500.00",
              perAY: "₱5,000.00",
            },
          ],
          total: { perSem: "₱30,000", perAY: "₱60,000" },
        },
      ];
      
        // ✅ Scholarship Benefits Data
        const SUCsLUCs = [
            {
            id: "regular-allowances",
            name: "Allowances",
            rows: [
                {
                label: "TOSF",
                perSem: "FREE",
                perAY: "FREE",
                },
                {
                label: "Stipend",
                perSem: "₱17,500.00",
                perAY: "₱35,000.00",
                },
                {
                label: "Book Allowance",
                perSem: "₱2,500.00",
                perAY: "₱5,000.00",
                },
            ],
            total: { perSem: "₱20,000", perAY: "₱40,000" },
            },
        ];

        const TableSection = ({ title, programs, expandedId, setExpandedId }) => (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            {title && (
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700 mb-6">
                {title}
                </h2>
            )}
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
                                Allowances
                            </th>
                            <th className="border border-gray-400 p-3 text-center font-bold text-gray-800 w-28">
                                Per Sem
                            </th>
                            <th className="border border-gray-400 p-3 text-center font-bold text-gray-800 w-28">
                                Per AY
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

                                {row.colSpan ? (
                                    <td
                                    colSpan={2}
                                    className="border border-gray-400 p-3 text-center font-medium text-gray-800"
                                    >
                                    {row.value}
                                    </td>
                                ) : (
                                    <>
                                    <td className="border border-gray-400 p-3 text-right font-medium text-gray-800 w-28">
                                        {row.perSem}
                                    </td>
                                    <td className="border border-gray-400 p-3 text-right font-medium text-gray-800 w-28">
                                        {row.perAY}
                                    </td>
                                    </>
                                )}
                                </tr>
                            ))}

                            {/* ✅ Flexible Total Row */}
                            {program.total.value ? (
                                // One value → span across 2 columns
                                <tr className="bg-red-100 font-bold">
                                <td className="border border-gray-400 p-3 text-left text-gray-800">
                                    Total
                                </td>
                                <td
                                    colSpan={2}
                                    className="border border-gray-400 p-3 text-center text-gray-800"
                                >
                                    {program.total.value}
                                </td>
                                </tr>
                            ) : (
                                // Two values → render separately
                                <tr className="bg-red-100 font-bold">
                                <td className="border border-gray-400 p-3 text-left text-gray-800">
                                    Total
                                </td>
                                <td className="border border-gray-400 p-3 text-right text-gray-800 w-28">
                                    {program.total.perSem}
                                </td>
                                <td className="border border-gray-400 p-3 text-right text-gray-800 w-28">
                                    {program.total.perAY}
                                </td>
                                </tr>
                            )}
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
    <div className="min-h-screen">

        <main>

            <StatsCards financialAssistances={(Array.isArray(financialAssistances) ? financialAssistances : []).filter(
                        p => p?.scholarship_program_name?.toUpperCase() === "ACEF-GIAHEP"
            )} />

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">

                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    Agricultural Competitiveness Enhancement Fund - Grants-in-Aid for Higher Education Program (ACEF-GIAHEP)
                </h1>

                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    Overview
                </h1>
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                <strong>Legal Bases:</strong> Republic Act (R.A.) No. 10848, “Agricultural Competitiveness Enhancement Fund Extension Law”
                </p>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    Implementing Guidelines:
                </h1>
                    
                    <ul className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                        <li>
                        <span className="font-semibold">CHED–DA Joint Memorandum Circular (JMC) No. 2017-7</span>, 
                        dated December 5, 2017 — “Implementing Guidelines of the Agricultural Competitiveness Enhancement Fund – Grants-in-Aid for Higher Education Program (ACEF-GIAHEP)”
                        </li>
                        <li>
                        <span className="font-semibold">CHED Administrative Order No. 1, Series of 2018</span> — 
                        “Guidelines for the Implementation of the Memorandum of Agreement (MOA) Between CHED and DA, particularly in fully settling the unpaid obligation of DA to its ACEF Scholars”
                        </li>
                        <li>
                        <span className="font-semibold">CHED–DA JMC No. 6, Series of 2019</span> — 
                        “Amendments to Numbers 6.1 and 6.2 of JMC No. 2017-7”
                        </li>
                        <li>
                        <span className="font-semibold">CHED–DA JMC No. 2, Series of 2024</span> — 
                        “Enhanced Implementing Guidelines of the Agricultural Competitiveness Enhancement Fund – Grants-in-Aid for Higher Education Program”
                        </li>
                    </ul>
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">


                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    Objective: 
                </h1>
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    The ACEF-GIAHEP aims to promote the development of agriculture and fisheries by increasing the number of graduates in higher education who are trained in scientific habit of thought, entrepreneurial skills and technical competencies in the areas of agriculture, forestry, fisheries, and veterinary medicine education.
                </p>
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">

               
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    Coverage:
                </h1>
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    The ACEF-GIAHEP is open to all qualified and deserving undergraduate students who will enroll or are currently enrolled in any CHED recognized higher education institution in the areas of agriculture, forestry, fisheries, veterinary medicine education and related agricultural education programs.
                </p>
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">

               
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    ELIGIBILITY REQUIREMENTS
                </h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Filipino citizen</li>
                    <li>
                    Graduating high school students; high school graduates; or those with earned college academic units relevant to the identified degree programs
                    </li>
                    <li>
                    Will enroll or currently enrolled in recognized programs of private higher education institutions or authorized programs of SUCs/LUCs in agriculture, forestry, fisheries, veterinary medicine education, and related agricultural education programs
                    </li>
                    <li>
                    Combined annual gross income of parents/guardians not to exceed Four Hundred Thousand Pesos (₱400,000.00).
                    <br />
                    <span className="italic text-gray-600">
                        *In exceptional cases, where income exceeds ₱400,000.00, CHEDROs shall determine the merit of the application. Said exceptional cases include but are not limited to:
                    </span>
                    <ul className="list-disc list-inside ml-6 space-y-1">
                        <li>Applicant who has four (4) or more dependent siblings</li>
                        <li>Applicant who has family member/s with medical findings of serious illness</li>
                        <li>Applicant whose Overseas Filipino Worker parent/guardian faces employment problems, termination, or deportation</li>
                        <li>Other similar cases as mentioned above</li>
                    </ul>
                    </li>
                    <li>
                    Preferably dependent of registered farmers and/or fisherfolks in the Registry System for Basic Sectors in Agriculture (RSBSA) and other registry systems
                    </li>
                    <li>Must not be a beneficiary of any government-funded student financial assistance program</li>
                    <li>Must not be convicted of a crime involving moral turpitude</li>
                </ol>

            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">

               
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    DOCUMENTARY REQUIREMENTS


                </h1>
            
                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Certified true copy of Birth Certificate</li>
                    <li>
                    Academic requirement:
                    <ul className="list-disc list-inside ml-6 space-y-1">
                        <li>For senior high school graduates – Form 138</li>
                        <li>
                        For graduating senior high school students — duly certified true copy of grades for Grade 11 and 1st semester of Grade 12
                        </li>
                        <li>
                        For applicants with earned units in college — duly certified copy of grades for the latest semester/term attended
                        </li>
                    </ul>
                    </li>
                    <li>
                    Proof of income – <span className="italic">ANY of the following:</span>
                    <ul className="list-disc list-inside ml-6 space-y-1">
                        <li>Latest Income Tax Return (ITR) of parent/s or guardian/s if employed</li>
                        <li>Certificate of Tax Exemption from the Bureau of Internal Revenue (BIR)</li>
                        <li>Certificate of No Income from BIR</li>
                        <li>
                        Certificate/Case Study Report from City/Municipal Social Welfare and Development Office (C/MSWD)
                        </li>
                    </ul>
                    </li>
                    <li>Proof that the student applicant belonged to special group/s (if applicable)</li>
                </ol>
    
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">

                

                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    APPLICATION PROCEDURE

                </h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-4">
                    <li>
                    Student Applicant should submit application to your CHED Regional Office:
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 ml-6 text-gray-800">
                        <span>CHEDRO I</span>
                        <span>CHEDRO II</span>
                        <span>CHEDRO III</span>
                        <span>CHEDRO IV</span>
                        <span>CHEDRO V</span>
                        <span>CHEDRO VI</span>
                        <span>CHEDRO VII</span>
                        <span>CHEDRO VIII</span>
                        <span>CHEDRO IX</span>
                        <span>CHEDRO IX (BARMM)</span>                        
                        <span>CHEDRO X</span>
                        <span>CHEDRO X (BARMM)</span>      
                        <span>CHEDRO XI</span>
                        <span>CHEDRO XII</span>
                        <span>CHEDRO XII (BARMM)</span>
                        <span>CARAGA</span>  
                        <span>MIMAROPA</span>   
                        <span>NCR</span>              
                        <span>CAR</span>
                    </div>
                    </li>
                    <li>
                    The CHED Regional Office will then evaluate and approve applications and recommend the master list to CHED OSDS
                    </li>
                    <li>
                    The CHED OSDS will then validate and approve the list of qualified beneficiaries for funding purposes
                    </li>
                </ol>
    

            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    FINANCIAL ASSISTANCE
                </h1>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="space-y-8">
                        {/* SUCs/LUCs Section */}
                        <div>
                        <div className="px-4 sm:px-6 lg:px-8">
                            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700 mb-1">
                            SUCs/LUCs
                            </h2>
                        </div>
                        <div className="px-4 sm:px-6 lg:px-8">
                            <TableSection
                            title=""
                            programs={PrivateHEIs}
                            expandedId={expandedSUC}
                            setExpandedId={setExpandedSUC}
                            />
                        </div>
                        </div>

                        {/* Private HEIs Section */}
                        <div>
                        <div className="px-4 sm:px-6 lg:px-8">
                            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700 mb-1">
                            Private HEIs
                            </h2>
                        </div>
                        <div className="px-4 sm:px-6 lg:px-8">
                            <TableSection
                            title=""
                            programs={SUCsLUCs}
                            expandedId={expandedPrivate}
                            setExpandedId={setExpandedPrivate}
                            />
                        </div>
                        </div>
                    </div>
                </div>   
            </div>


            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    ISSUANCES
                </h1>

                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Memorandum from the Office of the Chairperson – Call for Applications for the Agricultural Competitiveness Enhancement Fund – Grants-in-Aid for Higher Education Program (ACEF-GIAHEP) for Academic Year 2024-2025
                </p>
            </div>

        </main>
      
    </div>
  );
}

