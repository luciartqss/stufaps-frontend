import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Select } from 'antd'
import { ContactsOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
const { Text } = Typography
const { Option } = Select
import { Progress } from 'antd'

export function meta() {
  return [
    { title: 'SCHOLARSHIP PROGRAM FOR FUTURE MEDICAL TECHNOLOGISTS AND PHARMACISTS (MTP-SP)MTP-SP | StuFAPs' },
    { name: 'description', content: 'Manage CMSP records' },
  ]
}

function StatsCards({ financialAssistances }) {

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

export default function FinancialAssistanceMTP() {
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
        setFinancialAssistances(Array.isArray(programsData) ? programsData : [])

        const uniqueYears = [
          ...new Set(
            programsData.map(p => p.academic_year || p.Academic_year).filter(Boolean)
          )
        ]

        setAcademicYears([ ...uniqueYears.sort()])
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

  const filteredMTP_SP = (Array.isArray(financialAssistances) ? financialAssistances : []).filter(p => {
    if (p?.scholarship_program_name?.toUpperCase() !== 'MTP-SP') return false
    if (academicYearFilter && academicYearFilter !== 'All') {
      return (p.academic_year || p.Academic_year) === academicYearFilter
    }
    // Only keep the "All" row when filter is All
    return (p.academic_year || p.Academic_year) === 'All'
  })

  const sucPrograms = [
    {
      id: "financial-assistance",
      name: "Financial Assistance Package",
      rows: [
        {
          label: "Tuition and other school fees",
          perSem: "₱40,000.00",
          perAY: "₱80,000.00",
        },
        {
          label:
            "Stipend (subsistence, clothing, transportation allowance, educational tours, field trips, expenses for small projects, and medical insurance)",
          perSem: "₱60,000.00",
          perAY: "₱120,000.00",
        },
        {
          label: "Book allowance and other learning materials",
          perSem: "₱5,000.00",
          perAY: "₱10,000.00",
        },
      ],
      total: {
        perSem: "₱105,000.00",
        perAY: "₱210,000.00",
      },
    },
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
                        <td className="border border-gray-400 p-3 text-ceneter text-gray-700">
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
                            <td className="border border-gray-400 p-3 text-center font-medium text-gray-800 w-28">
                              {row.perSem}
                            </td>
                            <td className="border border-gray-400 p-3 text-center font-medium text-gray-800 w-28">
                              {row.perAY}
                            </td>
                          </>
                        )}
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
    <div className="min-h-screen bg-white">
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

        <StatsCards financialAssistances={filteredMTP_SP} />

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            SCHOLARSHIP PROGRAM FOR FUTURE MEDICAL TECHNOLOGISTS AND PHARMACISTS (MTP-SP)
          </h1>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">MTP-SP</h1>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            The Scholarship Program for Future Medical Technologists and Pharmacists is an initiative by the Commission on Higher Education (CHED) aimed at strengthening the healthcare workforce in the Philippines.
          </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Overview</h1>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            CHED supports measures to ensure equitable distribution of health human resources (HRH) through competitive compensation, benefits, and good working conditions in geographically
            isolated and disadvantaged areas (GIDAs). This aligns with Universal Health Coverage and the DOH 8-Point Action Agenda, ensuring safe, high-quality, people-centered health services. DOH data
            show an inadequate and uneven distribution of health professionals, limiting access to quality basic health services, especially in peripheral areas.
          </p>
        </div>



        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Scope and Coverage</h1>
          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            The Scholarship Program for Future Medical Technologists and Pharmacists (MTP-SP) is open to qualified students enrolled in BS Medical Technology/Medical Laboratory Science or BS Pharmacy
            at participating SUCs or PHEIs. Priority is given to students from GIDAs or IP communities and to special groups, including the underprivileged and homeless, those below the poverty threshold,
            persons with disabilities, solo parents and their children, senior citizens, indigenous peoples, and first-generation college students, in accordance with program requirements.
          </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Qualification Process</h1>
          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>Must be a Filipino citizen residing in the Philippines</li>
            <li>
              Senior high school STEM graduate or a current student in Medical Technology / Medical Laboratory Science or Pharmacy with a general weighted average (GWA) of at least 80% or equivalent
            </li>
            <li>
              Incoming students must pass entrance exams and meet admission requirements of the participating SUC or PHEI
            </li>
            <li>
              Continuing students must meet academic requirements in the most recent term/semester with no failed subjects
            </li>
            <li>
              Family combined annual gross income must not exceed ₱400,000. If it does, the applicant must provide either a medical certificate for a family member’s illness or school certifications showing two or more dependents enrolled in college
            </li>
          </ol>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Qualification Process</h1>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>
              Photocopy of Birth Certificate issued by the Local Civil Registry or PSA
            </li>
            <li>
              Certified true copy of Form 138 for incoming first-year students or certified grades for current college students
            </li>
            <li>
              One of the following income documents:
              <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                <li>Latest Income Tax Return (ITR) of parent/s or guardian</li>
                <li>BIR Tax Exemption/Non-Filer Certificate with Barangay Low-Income/Indigence Certificate</li>
                <li>Case Study Report from City/Municipal Social Welfare and Development Office</li>
                <li>Latest contract or proof of income for children of OFWs/seafarers</li>
              </ol>
            </li>
            <li>
              Additional documents, if applicable, for applicants from IP communities, GIDAs, or special groups, such as certifications or IDs issued by relevant authorities
            </li>
          </ol>

        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Application Procedure</h1>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>
              CHED/CHED Regional Offices (CHEDRO) and participating SUCs/PHEIs shall promote the program, its application and selection process, and general provisions annually, subject to fund availability
            </li>
            <li>
              Interested applicants must meet Section 7 qualifications and submit applications through participating SUCs/PHEIs. The SUCs/PHEIs shall endorse applicants to CHEDRO with:
              <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                <li>Completed application form (Annex "A") with supporting documents</li>
                <li>Notarized Scholar’s Commitment to Render Return Service (Annex "B")</li>
              </ol>
            </li>
            <li>
              The CHEDRO shall:
              <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                <li>Evaluate and rank applications</li>
                <li>Inform applicants of their status</li>
                <li>Send the Notice of Award (NOA, Annex "C") to qualified applicants</li>
                <li>Notify non-qualified applicants via email, SMS, or letter</li>
              </ol>
            </li>
            <li>
              Applicants accept the NOA by signing and returning it (printed or electronic) within seven (7) working days
            </li>
            <li>
              To waive the NOA, applicants must write “Waived,” sign, and return it or notify CHEDRO in writing within the same period
            </li>
            <li>
              A Scholarship Contract (Annex "D") shall be executed between the CHEDRO and the accepted applicant
            </li>
          </ol>
        </div>

        <div>
          <TableSection title="Medical Tuition Package (MTP)" programs={sucPrograms} expandedId={expandedSUC} setExpandedId={setExpandedSUC} />
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Direct Payment</h1>
          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>
              CHEDROs shall pay scholars directly under the following conditions if enrolled in SUCs/PHEIs:
              <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                <li>The SUC/PHEI is outside the CHEDRO’s regional jurisdiction</li>
                <li>The SUC/PHEI has fewer than ten (10) scholars</li>
                <li>There are unliquidated balances</li>
                <li>There are verified complaints or issues related to CHED-administered programs</li>
              </ol>
            </li>
            <li>
              CHEDRO transfers the financial assistance directly to the scholar’s account via ATM or cheque
            </li>
          </ol>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Payment through SUCs/PHEIs</h1>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>
              CHEDRO may enter into an MOA with participating SUCs or PHEIs that have 10 or more grantees
            </li>
            <li>
              Any MOA that exists prior to the issuance of these guidelines remains valid until officially revoked
            </li>
            <li>
              HEIs must submit a billing statement using the prescribed template, signed by Coordinator/Authorized Staff, Chief Accountant, President/School Head
            </li>
            <li>
              Must be supported by the Registrar's Certificate (Annex "H"), which specifies:
              <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                <li>Number of units enrolled</li>
                <li>General Weighted Average (GWA)</li>
                <li>Degree program and curriculum</li>
                <li>Semester/term</li>
              </ol>
            </li>
            <li>
              Certification that the scholar is not receiving any other government scholarship grant
            </li>
          </ol>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Transfer of a Scholar to Other identified participating SUCs or PHEIs </h1>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>
              Change of residence (e.g., parent’s employment or government relocation/resettlement), certified by the LGU
            </li>
            <li>
              Safety and security / peace and order issues, certified by the LGU
            </li>
            <li>
              Financial concerns
            </li>
            <li>
              Natural calamities
            </li>
            <li>
              Health reasons, supported by a medical certificate from a licensed physician
            </li>
            <li>
              Force majeure (unforeseeable events beyond control)
            </li>
            <li>
              Greater access to academic opportunities
            </li>
          </ol>

        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Leave of Absence</h1>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>
              The LOA cannot exceed one (1) academic year
            </li>
            <li>
              The reason must be valid and justified, such as:
              <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                <li>Health concerns</li>
                <li>Safety and security issues</li>
                <li>Force majeure (unforeseeable events beyond control)</li>
                <li>Must include a written request and supporting documents</li>
              </ol>
            </li>
            <li>
              The LOA must comply with the guidelines and policies of the participating SUC or PHEI
            </li>
          </ol>

        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Shifting</h1>

          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            Section 24 allows scholars to shift programs with CHEDRO approval.
            Shifting to a medical or allied health program requires one year of government service per scholarship year, while shifting to a non-medical program requires full repayment of the scholarship and benefits.
          </p>

        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Replacement</h1>

          <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            Section 25 allows the replacement of a scholar within an academic year due to failure to accept the award, withdrawal, transfer, dropping out, termination, or non-completion of the degree. The replaced scholar is notified in writing, and the replacement is taken from the CHEDRO’s official ranklist, assuming the scholarship benefits for the remaining duration.
          </p>

        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Grounds for Termination</h1>
          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>Violation of the provisions of the scholarship contract and guidelines</li>
            <li>Enrollment in a non-recognized or non-priority program</li>
            <li>Failure to maintain a GWA of at least 80% or its equivalent</li>
            <li>
              Graduating scholars who fail to meet the GWA requirement may file an appeal to CHEDRO; after review, CHEDRO endorses to OSDS, which escalates to CEB for decision
            </li>
            <li>Not carrying the required maximum academic load per semester/trimester/term</li>
            <li>Exceeding the allowable period of the Leave of Absence (LOA)</li>
            <li>Shifting to another program or transferring to another SUC/PHEI without CHEDRO approval</li>
            <li>Submission of falsified or fraudulent documents</li>
            <li>Final conviction of an offense involving moral turpitude</li>
            <li>
              Participation or involvement in fraternity or sorority-related hazing activities, as determined by the concerned SUC/PHEI
            </li>
            <li>Non-completion of the degree program</li>
            <li>Other causes analogous to the foregoing</li>
          </ol>

        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Mandatory Return Service</h1>

          <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
            <li>
              After passing the licensure exam administered by the PRC, scholars must render one (1) year of return service for each year of scholarship availed, in accordance with DOH guidelines under SP No. 9 (DOH-OSEC budget, RA No. 11975) and Section 26 of RA No. 11223 (Universal Health Care Act)
            </li>
            <li>
              Upon completing the return service, scholars must submit service records to the DOH covering the required period
            </li>
            <li>
              The DOH will issue a Certificate of Completion of Return Service, and CHED will provide a clearance as proof of compliance
            </li>
            <li>
              Scholars unable to comply due to severe or serious illness must submit a written request to CHEDRO with a medical certificate from a licensed physician for approval
            </li>
          </ol>

        </div>

      </main>
      <footer className="bg-gray-800 text-white text-center py-4">
        <div>
          <p className="text-sm">
            CMO-NO.-11-S.-2024
          </p>
          <p className="text-sm">

            © {new Date().getFullYear()} CMO. All rights reserved.
          </p>
        </div>

      </footer>
    </div>


  );
}
