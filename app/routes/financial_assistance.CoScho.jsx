import { useEffect, useState } from 'react' 
import { Card, Typography } from 'antd' 
import { ContactsOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
const { Text } = Typography
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'Scholarship Program for Coconut Farmers and Their Families (CoScho) | StuFAPs' },
    { name: 'description', content: 'Manage Estatistikolar records' },
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
    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      {statsConfig.map((stat, index) => (
        <div key={index} style={{ flex: '1 1 calc(33% - 8px)', minWidth: 250 }}>
          <Card
            style={{
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              height: "auto",
            }}
            bodyStyle={{
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 500 }}>
                {stat.title}
              </Text>
              <Text strong style={{ fontSize: 18, color: stat.color, lineHeight: 1.1, display: 'block', marginBottom: 4 }}>
                {stat.value.toLocaleString()}
              </Text>
            </div>
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
          </Card>
        </div>
      ))}
    </div>
  )
}

export default function FinancialAssistanceCoScho() 
{
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [expandedSUC, setExpandedSUC] = useState(null);
  const [expandedPrivate, setExpandedPrivate] = useState(null);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
      fetch('http://localhost:8000/api/scholarship_programs')
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
  const sucPrograms = [
    {
      id: "regular-allowances",
      name: "Regular Allowances",
      rows: [
        {
          label: "Stipend (food, tours, transport, projects, medical)",
          perSem: "₱35,000.00",
          perAY: "₱70,000.00",
        },
        {
          label: "Book allowance and other learning materials",
          perSem: "₱5,000.00",
          perAY: "₱10,000.00",
        },
      ],
      total: { perSem: "₱40,000.00", perAY: "₱80,000.00" },
    },
  ];

  const privatePrograms = [
    {
      id: "other-allowances",
      name: "Other Allowances",
      rows: [
        {
          label: "Thesis/OJT Allowance",
          colSpan: 2,
          value: "₱75,000.00",
        },
        {
          label:
            "One-time attendance in local conference (junior/senior year, off-campus)",
          colSpan: 2,
          value: "₱10,000.00",
        },
        {
          label:
            "One-time laptop assistance (first year of scholarship grant)",
          colSpan: 2,
          value: "₱30,000.00",
        },
      ],
      total: {value: "₱115,000.00" },
    },
  ];

  // ✅ Reusable TableSection Component
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
                        Item
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
      {/* Program Title */}
        <StatsCards financialAssistances={financialAssistances.filter(
          p => p.scholarship_program_name.toUpperCase() === "COSCHO"
        )} />
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
          Scholarship Program for Coconut Farmers and Their Families (CoScho)
        </h1>
        <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
          The CoScho Program is open to incoming first-year college students who are qualified coconut
          farmers or their dependents. However, continuing college students who meet the eligibility
          requirements may also apply, provided they are not recipients of any other government scholarship.
        </p>
      </div>

      {/* Overview */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
          Overview
        </h1>
        <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
          The Joint Memorandum Circular No. 01, series of 2023 outlines the implementing guidelines of the
          Scholarship Program for Coconut Farmers and Their Families (CoScho) under the Coconut Farmers
          and Industry Development Plan (CFIDP). It is a joint initiative of the Commission on Higher
          Education (CHED) and the Philippine Coconut Authority (PCA) aimed at providing educational
          opportunities to qualified coconut farmers and their dependents.
        </p>
      </div>

      {/* Scope and Coverage */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
          Scope and Coverage
        </h1>
        <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
          The CoScho Program covers qualified coconut farmers and their dependents listed in the
          National Coconut Farmers Registry System (NCFRS). It is implemented nationwide in identified
          coconut-producing provinces and applies to undergraduate degree programs offered by SUCs,
          LUCs, and CHED-recognized HEIs.
        </p>
      </div>

      {/* Application Process */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
          Application Process (Scholar)
        </h1>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>Filipino citizen;</li>
            <li>
              Child or dependent of a registered coconut farmer in the National Coconut Farmers Registry System (NCFRS); High school graduate;
            </li>
            <li>Not more than 25 years old (except for senior citizens or special cases);</li>
            <li>Must not have any other government scholarship;</li>
            <li>With good moral character.</li>
            </ol>
      </div>

              {/* Scholarship Benefits */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
          Scholarship Benefits
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
                  programs={sucPrograms}
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
                  programs={privatePrograms}
                  expandedId={expandedPrivate}
                  setExpandedId={setExpandedPrivate}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Payment to Scholars */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Direct Payment to Scholars</h1>

        <div className="space-y-8">
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">CHEDROs shall transfer financial benefits directly to the scholars per semester of academic year 
            until the completion of the degree program by crediting it to the authorized bank account of 
            scholars. 
          </p>
        </div>
      </div>

      {/* Initial Payment/Requirements */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Initial Payment/Requirements</h1>

        <div className="mt-4 list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 list-disc list-inside space-y-3 text-gray-700">
            <li>Certified true copy of the registration form or photocopy verified against the original document by the CHEDRO StuFAPs coordinator</li>
            <li>Copy of Automated Teller Machine (ATM) card from authorized government banks</li>
            <li>Copy of school ID for current semester/term</li>
          </ol>

        </div>
      </div>

      {/* Succeeding Payment/Requirements */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Succeeding Payment/Requirements</h1>

          <ul className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>Certified true copy of the registration form or photocopy verified against the original document by the CHEDRO StuFAPs coordinator</li>
            <li>Copy of Automated Teller Machine (ATM) card from authorized government banks</li>
            <li>Copy of school ID for current semester/term</li>
          </ul>
        
      </div>

      {/* Responsibilities of Scholars */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
          Responsibilities of Scholars
        </h1>

        <ul className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
          <li>Execute a Scholarship Grant Contact (Annex E) with CHEDRO for the scholarship program</li>
          <li>Enroll in recognized priority programs of Private Higher Education Institutions (PHEIs) or SUCs/LUCs with COPCs</li>
          <li>Carry a regular load per semester/term as determined by the HEI and complete the degree program within the timeframe required in the curriculum. However, a scholar may be allowed to defer his/her enrolment not exceeding one (1) academic year due to health reasons supported by a medical certificate and/or displacement of residence due to force majeure, threat to safety and security which would prevent him/her from enrolling</li>
          <li>Maintain a GWA of at least 80% or its equivalent</li>
          <li>Transfer only to the concerned HEI or shift to other priority program upon written approval of CHEDRO and shall be subject to the originating and receiving HEI's policies</li>
          <li>Must not avail any other government funded student financial assistance program</li>
        </ul>
      </div>

      {/* Grounds for Termination */}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
          Grounds for Termination
        </h1>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>Execute a Scholarship Grant Contact (Annex E) with CHEDRO for the scholarship program</li>
            <li>Enroll in recognized priority programs of Private Higher Education Institutions (PHEIs) or SUCs/LUCs with COPCs</li>
            <li>
              Carry a regular load per semester/term as determined by the HEI and complete the degree program within the timeframe required in the curriculum. However, a scholar may be allowed to defer his/her enrolment not exceeding one (1) academic year due to health reasons supported by a medical certificate and/or displacement of residence due to force majeure, threat to safety and security which would prevent him/her from enrolling
            </li>
            <li>Maintain a GWA of at least 80% or its equivalent</li>
            <li>
              Transfer only to the concerned HEI or shift to other priority program upon written approval of CHEDRO and shall be subject to the originating and receiving HEI's policies
            </li>
            <li>Must not avail any other government funded student financial assistance program</li>
          </ol>
        </div>



      {/* Replacement */}
      <div class="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 class="text-2xl font-bold text-red-700">
          Replacement of a Scholar
        </h1>

        
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            Replacement of a scholar may be allowed within a given academic year,
            through any of the following grounds:
          </p>

        
          <ol class="bg-red-50 border border-red-200 rounded-lg p-6 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2 mt-4">
            <li>Failure to confirm acceptance of the award fifteen (15) working days upon receipt of the NOA</li>
            <li>Voluntary withdrawal/Waiver of scholarship grant</li>
            <li>Dropping out from school without notice to CHEDRO</li>
            <li>Termination of scholarship grant on grounds stated in Section 14</li>
          </ol>

        <div>
          <p class="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            A replacement must be chosen based on the definition of "dependent" under this Circular who shall be taken from the official rank list of the CHEDRO. The replacement shall avail of the benefits for the remaining duration of the scholarship grant.
          </p>

          <p class="mt-2 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            The replaced scholar shall be informed in writing by the concerned CHEDRO stating therein the reason/s for his/her replacement. PCA shall be informed of any replacement made for information and record purposes.
          </p>
        </div>
      </div>

    </main>

        <footer className="bg-gray-800 text-white text-center py-4">
            <div>
                <p className="text-sm">
                20230913-JMC-No-01-S-2023-Implementing ... mers-and-their-Families-CoScho
            </p>
            <p className="text-sm">
                
            © {new Date().getFullYear()} CMO. All rights reserved.
            </p>
            </div>
            
      </footer>
    </div>
  );
}

