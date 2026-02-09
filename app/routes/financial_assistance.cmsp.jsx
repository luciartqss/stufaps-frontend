import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Select } from 'antd'
import { ContactsOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
const { Text } = Typography
const { Option } = Select
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'CHED Merit Scholarship Program (CMSP) | StuFAPs' },
    { name: 'description', content: 'Manage CMSP records' },
  ]
}

function StatsCards({ financialAssistances = [] }) {
  let totals;

  if (financialAssistances.length === 1 && (financialAssistances[0].academic_year === 'All' || financialAssistances[0].Academic_year === 'All')) {
    // Use backend values directly for the "All" row
    const row = financialAssistances[0];
    totals = {
      totalSlots: Number(row?.total_slot) || 0,
      totalFilled: Number(row?.total_students) || 0,
      totalUnfilled: Number(row?.unfilled_slot) || 0,
    };
  } else {
    // Sum across rows for a specific year
    totals = {
      totalSlots: financialAssistances.reduce((sum, p) => sum + (Number(p?.total_slot) || 0), 0),
      totalFilled: financialAssistances.reduce((sum, p) => sum + (Number(p?.total_students) || 0), 0),
      totalUnfilled: financialAssistances.reduce((sum, p) => sum + (Number(p?.unfilled_slot) || 0), 0),
    };
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
        <Card key={index} style={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: 96 }}
          bodyStyle={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}
        >
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              {stat.title}
            </Text>
            <Text strong style={{ fontSize: 20, color: stat.color, lineHeight: 1.1, display: 'block' }}>
              {(stat.value ?? 0).toLocaleString()}
            </Text>
            {stat.percentage && (
              <>
                <Progress percent={parseFloat(stat.percentage)} showInfo={false} strokeColor={stat.color} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 12, color: stat.color }}>{stat.percentage}% of total</Text>
              </>
            )}
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: stat.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: stat.color }}>
            {stat.icon}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function FinancialAssistanceCmsp() {
  const [financialAssistances, setFinancialAssistances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedSUC, setExpandedSUC] = useState(null)
  const [academicYearFilter, setAcademicYearFilter] = useState('All')
  const [programFilter, setProgramFilter] = useState('All')

  const [academicYears, setAcademicYears] = useState([])
  const [programs, setPrograms] = useState([])

  const [expandedPrivate, setExpandedPrivate] = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/api/scholarship_program_records')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => {
        console.log('API Response:', data)
        const programsData = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        setFinancialAssistances(programsData)

        const uniqueYears = [
          ...new Set(
            programsData.map(p => p.academic_year || p.Academic_year).filter(Boolean)
          )
        ]

        const uniquePrograms = [ 
            ...new Set( 
              programsData 
              .filter(p => p.description === 'CHED Merit Scholarship Program') 
              .map(p => p.scholarship_program_name) 
              .filter(Boolean) 
            ) ]

        setPrograms([...uniquePrograms.sort()])
        setAcademicYears([...uniqueYears.sort()])
        setLoading(false)
      })
      .catch(err => {
        console.error('Fetch Error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleAcademicYearChange = value => 
  { 
    setAcademicYearFilter(value || 'All') 
  } 

  const handleProgramChange = value => 
  { 
    setProgramFilter(value) 
  } 

  if (loading) return <div>Loading CMSP data...</div>
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>

  const allowedPrograms = [
  'FULLSSP', 'HALFSSP', 'HALFSSPGAD', 'FULLSSPGAD',
  'FULLPESFA', 'HALFPESFA', 'HALFPESFAGAD', 'FULLPESFAGAD'
  ];

  // helper function to format program names
  const formatProgramName = name => {
    if (!name) return '';
    return name
      .replace(/SSP/g, ' SSP')       // turn FULLSSP → FULL SSP
      .replace(/PESFA/g, ' PESFA')   // turn FULLPESFA → FULL PESFA
      .replace(/GAD/g, '-GAD')       // turn FULLSSPGAD → FULL SSP GAD
      .trim();
  };

  const filteredCms = (Array.isArray(financialAssistances) ? financialAssistances : []).filter(p => {
    const programName = p?.scholarship_program_name?.toUpperCase().trim();

    // Only keep allowed programs
    if (!allowedPrograms.includes(programName)) return false;

    // Apply program filter if not "All"
    if (programFilter && programFilter !== 'All') {
      if (programName !== programFilter.toUpperCase().trim()) return false;
    }

    // Apply academic year filter if not "All"
    if (academicYearFilter && academicYearFilter !== 'All') {
      return (p.academic_year || p.Academic_year) === academicYearFilter;
    }

    // Default: keep "All" row when year filter is All
    return (p.academic_year || p.Academic_year) === 'All';
  });

  const sucPrograms = [
    {
      id: "full-ssp",
      name: "Full-SSP",
      rows: [
        { label: "TOSF: Free Higher Education (FHE)", perSem: "-", perAY: "-" },
        { label: "Stipend (₱7,000 × 5 months)", perSem: "₱35,000.00", perAY: "₱70,000.00" },
        { label: "Book/Connectivity Allowance", perSem: "₱5,000.00", perAY: "₱10,000.00" },
      ],
      total: { perSem: "₱40,000.00", perAY: "₱80,000.00" },
    },
    {
      id: "half-ssp",
      name: "Half-SSP",
      rows: [
        { label: "TOSF: FHE", perSem: "-", perAY: "-" },
        { label: "Stipend (₱3,500 × 5 months)", perSem: "₱17,500.00", perAY: "₱35,000.00" },
        { label: "Book/Connectivity Allowance", perSem: "₱2,500.00", perAY: "₱5,000.00" },
      ],
      total: { perSem: "₱20,000.00", perAY: "₱40,000.00" },
    },
  ];

  const privatePrograms = [
    {
      id: "full-pesfa",
      name: "Full-PESFA",
      rows: [
        { label: "TOSF", perSem: "₱20,000.00", perAY: "₱40,000.00" },
        { label: "Stipend (₱7,000 × 5 months)", perSem: "₱35,000.00", perAY: "₱70,000.00" },
        { label: "Book/Connectivity Allowance", perSem: "₱5,000.00", perAY: "₱10,000.00" },
      ],
      total: { perSem: "₱60,000.00", perAY: "₱120,000.00" },
    },
    {
      id: "half-pesfa",
      name: "Half-PESFA",
      rows: [
        { label: "TOSF", perSem: "₱10,000.00", perAY: "₱20,000.00" },
        { label: "Stipend (₱7,000 × 5 months)", perSem: "₱17,500.00", perAY: "₱35,000.00" },
        { label: "Book/Connectivity Allowance", perSem: "₱2,500.00", perAY: "₱5,000.00" },
      ],
      total: { perSem: "₱30,000.00", perAY: "₱60,000.00" },
    },
  ];

  const TableSection = ({ title, programs, expandedId, setExpandedId }) => (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700 mb-6">
        {title}
      </h2>
      <div className="space-y-4">
        {programs.map((program) => (
          <div key={program.id} className="border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <button
              onClick={() => setExpandedId(expandedId === program.id ? null : program.id)}
              className="w-full bg-red-50 hover:bg-red-100 p-4 text-left flex justify-between items-center transition-colors duration-200"
            >
              <span className="font-bold text-gray-800">{program.name}</span>
              <span className="text-red-600 text-xl transition-transform duration-200" style={{
                transform: expandedId === program.id ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                ▼
              </span>
            </button>

            {expandedId === program.id && (
              <div className="p-4 animate-in fade-in duration-200">
                <table className="w-full text-sm md:text-base border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 p-3 text-left font-bold text-gray-800">Item</th>
                      <th className="border border-gray-400 p-3 text-center font-bold text-gray-800 w-28">Per Sem</th>
                      <th className="border border-gray-400 p-3 text-center font-bold text-gray-800 w-28">Per AY</th>
                    </tr>
                  </thead>
                  <tbody>

                    {program.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors duration-100">
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
                      <td className="border border-gray-400 p-3 text-center text-gray-800 w-28">
                        {program.total.perSem}
                      </td>
                      <td className="border border-gray-400 p-3 text-center text-gray-800 w-28">
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

  return (
    <div className="min-h-screen">
      <main>

      {/* dropdown*/}

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

        <Select
          value={programFilter}
          allowClear
          size="middle"
          style={{ width: 160, marginLeft: 12, marginBottom: 12 }}
          onChange={handleProgramChange}
        >
          {programs.map(program => (
            <Option key={program} value={program}>
              {formatProgramName(program)}
            </Option>
          ))}
        </Select>

        <StatsCards financialAssistances={filteredCms} />

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            CHED Merit Scholarship Program (CMSP)
          </h1>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            The CHED Merit Scholarship Program (CMSP) is a competitive grant by the
            Commission on Higher Education for academically talented Filipino students.
            It is open to incoming or current first-year…
          </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Scope & Coverage
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            The CMSP is open to all incoming or current first-year students regardless of background or status.
            Additional ranking points are granted to applicants from special equity groups under the following laws:
            RA 7279 (Urban Development and Housing Act of 1992), RA 11291 (Magna Carta of the Poor),
            RA 7277 (Magna Carta for Persons with Disabilities), as amended, RA 11861 (Expanded Solo Parents Welfare Act), as amended,
            RA 9994 (Expanded Senior Citizens Act of 2010), and
            RA 8371 (Indigenous Peoples’ Rights Act of 1997), as well as other relevant legislation prioritizing marginalized sectors, including first-generation college students.
          </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Application Process (Eligible Applicant)
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            Filipino citizen, Graduate of a Senior High School in the Philippines with a minimum GWA of 93% or its equivalent, Combined annual gross income of parents or legal guardians must not exceed ₱500,000.00.
          </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Ineligible Applicant
          </h2>

          <ul className="bg-red-50 border border-red-200 rounded-lg p-6 list-disc list-inside space-y-3 text-gray-700">
            <li className="font-medium">Foreign students</li>
            <li>Applicants who are not incoming or current first-year undergraduate students</li>
            <li>Applicants who will or are enrolled in priority programs but not granted government recognition or certification by CHED</li>
            <li>Applicants who will or intend to enroll in a non-priority program</li>
            <li>Transferees and shiftees with credited units as determined by admitting HEIs</li>
            <li>Existing recipients of any nationally government-funded scholarships or grants (TES, TDP); grantees under the One-time Grants are exempted</li>
            <li>Applicants who have completed an undergraduate degree program or are second-course takers</li>
            <li>Applicants who submitted tampered and/or falsified application documents</li>
          </ul>
        </div>

        {/* Financial Assistance Tables */}
        <div >
          <div>
            <div className="px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700 mb-1 px-4 sm:px-6 lg:px-8">
                SUCs/LUCs
              </h2>
            </div>
            <div className="px-4 sm:px-6 lg:px-8">
              <TableSection title="" programs={sucPrograms} expandedId={expandedSUC} setExpandedId={setExpandedSUC} />
            </div>
          </div>
        </div>

        <div>
          <div>
            <div className="px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700 mb-1 px-4 sm:px-6 lg:px-8">
                Private HEIs
              </h2>
            </div>

            <div className="px-4 sm:px-6 lg:px-8">
              <TableSection title="" programs={privatePrograms} expandedId={expandedPrivate} setExpandedId={setExpandedPrivate} />

              <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <p className="text-sm md:text-base text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <strong>Note:</strong> For HEIs with trimester or quarter systems, the total amount of financial assistance shall be distributed proportionately based on the scholarship type under this CMO.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Direct Payment to Scholars
          </h1>

          <ul className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-[lower-alpha] list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>HEI has no Memorandum of Agreement (MOA) Annex J with CHEDRO;</li>
            <li>HEI has fewer than ten (10) scholars;</li>
            <li>HEI has unliquidated balances or transferred funds; or</li>
            <li>HEI has verified StuFAPs-related complaints/issues</li>
          </ul>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Initial Payment/Requirements
          </h1>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            Payment Type
          </p>

          <ul className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>Certified true copy of Certificate of Registration/Enrollment (COR/COE)
              or system-generated registration document signed by registrar/authorized official</li>
            <li>College ID or any government-issued ID with signature, certification from the school</li>
            <li>Photocopy of active Landbank ATM card</li>
          </ul>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Succeeding Payment/Requirements
          </h1>

          <ul className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>
              Certified true copy of Certificate of Registration/Enrollment (COR/COE) or
              system-generated registration document signed by registrar/authorized official
            </li>
            <li>
              Certified true copy of grades with GWA from previous semester/term signed by
              registrar/authorized official; Certification from HEI that the scholar is not a
              recipient of other national-funded scholarships for the current academic year
              (signed by Scholarship Coordinator or Registrar; submitted every start of the
              academic year)
            </li>
          </ul>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Responsibilities of Scholars
          </h1>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>Adhere to the provisions of the scholarship contract (Annex B-2)</li>
            <li>Enroll in CHED-identified priority programs of PHEIs with GR, SUCs, or LUCs with COPC</li>
            <li>Maintain a GWA of at least 85% (full scholars) or 80% (half scholars);</li>
            <li>Enroll the required regular academic load per semester/trimester/term, except when only a few subjects remain to complete the program;</li>
            <li>Complete the degree within the prescribed period in the curriculum;</li>
            <li>
              Secure written approval from CHEDRO (Annex H) before:
              <ol className="list-[lower-alpha] list-inside ml-6 space-y-1">
                <li>Transferring to another HEI;</li>
                <li>Shifting to another recognized/certified priority program; or</li>
                <li>Filing a Leave of Absence (LOA) — allowed only once for one (1) academic year, without financial benefits during the LOA;</li>
              </ol>
            </li>
            <li>Refund to CHED all financial benefits if the scholarship is terminated for reasons under Section 26;</li>
            <li>Exhibit good moral character and follow CHED/HEI rules and regulations;</li>
            <li>Inform CHEDRO of any changes in status, program, HEI, or personal circumstances affecting eligibility;</li>
            <li>Submit required reports/documents within the deadlines;</li>
            <li>Submit an accomplished graduate exit form (Annex I).</li>
          </ol>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Grounds for Scholarship Termination
          </h2>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>Any violation of the provisions of these guidelines;</li>
            <li>Breach of contract;</li>
            <li>Availment of another National Government funded scholarship program;</li>
            <li>Enrollment in non-recognized program of PHEIs or SUCs or non-certified program of LUCs;</li>
            <li>Enrollment in non-priority programs;</li>
            <li>Failure to maintain the required GWA;</li>
            <li>Failure to enroll the required regular load based on approved curriculum of the HEI;</li>
            <li>Dropping out;</li>
            <li>LOA of scholar must not be more than one (1) academic year;</li>
            <li>Shifting to another program or transferring to another HEI without approval from concerned CHEDRO;</li>
            <li>Any acts inimical to the government and/or CHED;</li>
            <li>Prima facie evidence of participation or involvement in hazing related activities; and</li>
            <li>
              Transfer of HEI that involves a change of scholarship program from: Full-SSP to Full-PESFA, or vice versa,
              shall result in the automatic termination of the scholarship.
            </li>
          </ol>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Appeal
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            A scholar may submit a written appeal for reconsideration within seven (7) working days from receipt of the termination notice.
          </p>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            The appeal must include reasons and supporting documents
          </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Procedures for Appeal
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            CHEDRO shall review and decide on the appeal within fifteen (15) days and update the database (Annex E-2).
          </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Replacement
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            Scholars who fail to confirm their Notice of Award (NOA) within fifteen (15) working days will be replaced by applicants from the Official Ranklist. Terminated scholars may also be replaced by the next eligible applicant with a GWA of at least 85% (Full) or 80% (Half).
          </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Leave of Absence (LOA) Guidelines
          </h2>

          <ul className="mt-4 list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <p>A scholar may apply for LOA for a maximum of one (1) academic year.
              Valid reasons include illness, family emergencies, or force majeure.
              The request and documents must be submitted to CHEDRO for approval (Annex H).
              No financial benefits are granted during LOA.</p>
          </ul>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Transferee/Shiftee
          </h2>

          <ul className="mt-4 list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <p>Scholars who transfer or shift with CHEDRO approval may continue their scholarship.
              If enrolled with reduced units, they must take a full load in the next semester to retain eligibility.
              or proven participation or involvement in hazing-related activities.
            </p>
          </ul>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Refund
          </h2>

          <ul className="mt-4 list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <p>Scholars are required to refund all financial grants received under the scholarship program if their
              scholarship is terminated due to specific grounds, including enrollment in non-recognized or non
              priority programs, engagement in acts that are inimical to the government or CHED
            </p>
          </ul>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Procedures for Refund
          </h2>

          <ul className="mt-4 list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <p>After due process, scholars are required to refund all financial benefits received under the
              scholarship within sixty (60) days from the date of the notice of demand issued by CHEDRO.
              Failure to comply with this requirement will result in CHEDRO endorsing the case to higher
              authorities for appropriate action.</p>
          </ul>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <p>
            Maintaining GWA Full
            Full-SSP & Full PESFA
            At least 85% or 2.00
          </p>

          <p>
            Maintaining GWA Half
            Half-SSP & Half PESFA
            At least 80% or 2.5
          </p>
        </div>
      </main>
      <footer className="bg-gray-800 text-white text-center py-4">
        <div>
          <p className="text-sm">
            CMO-NO.-13-S.-2025
          </p>
          <p className="text-sm">

            © {new Date().getFullYear()} CMO. All rights reserved.
          </p>
        </div>

      </footer>
    </div>
  );
}
