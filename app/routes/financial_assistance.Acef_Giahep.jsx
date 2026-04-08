import { useEffect, useState, useCallback } from 'react'
import { API_BASE } from '../lib/config'
import {
    Card,
    Typography,
    Space,
    Select,
} from 'antd'
import {
    ContactsOutlined,
    TeamOutlined,
    FilterOutlined,
    UserOutlined,
    InfoCircleOutlined,
    ReconciliationOutlined,
    AuditOutlined,
    ProjectOutlined,
    FileProtectOutlined,
    ExceptionOutlined,
    FileDoneOutlined,
    DollarOutlined,
    FundOutlined,
    FundProjectionScreenOutlined,
    LinkOutlined,
    WarningOutlined,
} from '@ant-design/icons'
const { Text, Title } = Typography
const { Option } = Select
import { Progress } from 'antd'
import { useRealtime } from '../lib/useRealtime'

export function meta() {
    return [
        { title: 'Agricultural Competitiveness Enhancement Fund-Grants-In-Aid for Higher Education Program (ACEF-GIAHEP) | StuFAPs' },
        { name: 'description', content: 'Manage ACEF-GIAHEP records' },
    ]
}

function StatsCards({ financialAssistances = [], semester }) {
    const semShort = { First: '1st Sem', Second: '2nd Sem' }[semester] || semester

    const totals = {
        totalSlots: financialAssistances.reduce((sum, p) => sum + (Number(p?.total_slot) || 0), 0),
        totalFilled: financialAssistances.reduce((sum, p) => sum + (Number(p?.total_students) || 0), 0),
        totalUnfilled: financialAssistances.reduce((sum, p) => sum + (Number(p?.unfilled_slot) || 0), 0),
    }

    const exceeded = totals.totalFilled > totals.totalSlots && totals.totalSlots > 0

    const statsConfig = [
        {
            title: 'Cumulative Slots',
            value: totals.totalSlots,
            icon: <ContactsOutlined />,
            color: '#1890ff',
            bgColor: '#e6f7ff',
        },
        {
            title: `Disbursed (${semShort})`,
            value: totals.totalFilled,
            icon: exceeded ? <WarningOutlined /> : <TeamOutlined />,
            color: exceeded ? '#ff4d4f' : '#52c41a',
            bgColor: exceeded ? '#fff2f0' : '#f6ffed',
            percentage: ((totals.totalFilled / (totals.totalSlots || 1)) * 100).toFixed(1),
        },
        {
            title: `Not Yet Disbursed (${semShort})`,
            value: totals.totalUnfilled,
            icon: <UserOutlined />,
            color: '#faad14',
            bgColor: '#fffbe6',
            percentage: ((totals.totalUnfilled / (totals.totalSlots || 1)) * 100).toFixed(1),
        },
    ]

    return (
        <>
            {exceeded && (
                <div style={{
                    background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8,
                    padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 12,
                }}>
                    <WarningOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
                    <Text style={{ color: '#cf1322', fontSize: 13 }}>
                        <strong>Slots Exceeded</strong> — Disbursed students exceed available slots
                    </Text>
                </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {statsConfig.map((stat, index) => (
                <Card
                    key={index}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        borderRadius: 12,
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                    bodyStyle={{
                        padding: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                            {stat.title}
                        </Text>
                        <Text strong style={{ fontSize: 20, color: stat.color, lineHeight: 1.1, display: 'block' }}>
                            {stat.value.toLocaleString()}
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
            ))}
        </div>
        </>
    )

}

export default function FinancialAssistanceAcef_giahep() {
    const [financialAssistances, setFinancialAssistances] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [academicYearFilter, setAcademicYearFilter] = useState(null)
    const [semesterFilter, setSemesterFilter] = useState('First')
    const [academicYears, setAcademicYears] = useState([])

    const fetchData = useCallback((silent) => {
        if (!silent) setLoading(true)
        const semParam = `?semester=${encodeURIComponent(semesterFilter)}`
        fetch(`${API_BASE}/scholarship_program_records${semParam}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`)
                }
                return res.json()
            })
            .then(data => {
                const programsData = data.data || data
                setFinancialAssistances(Array.isArray(programsData) ? programsData : [])

                const uniqueYears = [
                    ...new Set(
                        programsData.map(p => p.academic_year || p.Academic_year).filter(Boolean)
                    )
                ]

                setAcademicYears([...uniqueYears.sort()])
            })
            .catch(err => {
                console.error('Fetch Error:', err)
                setError(err.message)
            })
            .finally(() => { if (!silent) setLoading(false) })
    }, [semesterFilter])

    useEffect(() => { fetchData() }, [fetchData])

    useRealtime('ScholarshipProgramRecord', fetchData)

    const sortedYears = [...academicYears].filter(y => y !== 'All').sort()

    useEffect(() => {
        if (sortedYears.length > 0 && !sortedYears.includes(academicYearFilter)) {
            setAcademicYearFilter(sortedYears[sortedYears.length - 1])
        }
    }, [sortedYears])

    const handleAcademicYearChange = value => { setAcademicYearFilter(value) }

    if (loading) return <div className="p-8">Loading...</div>
    if (error) return <div className="p-8 text-red-600 bg-red-50 border border-red-300 rounded">Error: {error}</div>

    const filteredAcef_Giahep = (() => {
        const allData = (Array.isArray(financialAssistances) ? financialAssistances : [])
            .filter(p => p?.scholarship_program_name?.toUpperCase() === 'ACEFGIAHEP')

        const targetYear = academicYearFilter

        if (targetYear) {
            const yearIdx = sortedYears.indexOf(targetYear)
            const yearsUpTo = yearIdx >= 0 ? sortedYears.slice(0, yearIdx + 1) : [targetYear]
            const recordsUpTo = allData.filter(p => {
                const ay = p.academic_year || p.Academic_year
                return ay !== 'All' && yearsUpTo.includes(ay)
            })
            const currentRecords = allData.filter(p => (p.academic_year || p.Academic_year) === targetYear)

            const cumSlots = {}
            for (const r of recordsUpTo) {
                const k = r.scholarship_program_name?.toUpperCase().trim()
                cumSlots[k] = (cumSlots[k] || 0) + (Number(r.total_slot) || 0)
            }

            const seen = new Set()
            const result = currentRecords.map(r => {
                const k = r.scholarship_program_name?.toUpperCase().trim()
                seen.add(k)
                const cs = cumSlots[k] || 0
                const filled = Number(r.total_students) || 0
                return { ...r, total_slot: cs, unfilled_slot: Math.max(0, cs - filled) }
            })

            for (const [k, slots] of Object.entries(cumSlots)) {
                if (!seen.has(k) && slots > 0) {
                    const s = recordsUpTo.find(r => r.scholarship_program_name?.toUpperCase().trim() === k)
                    if (s) result.push({ ...s, academic_year: targetYear, Academic_year: targetYear, total_slot: slots, total_students: 0, unfilled_slot: slots })
                }
            }

            return result
        }

        return allData.filter(p => (p.academic_year || p.Academic_year) === 'All')
    })()

    return (
        <div style={{ background: '#fff', margin: -24, minHeight: 'calc(100vh - 72px)' }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>ACEF-GIAHEP</Title>
                        <Text style={{ color: '#6b7280', fontSize: 16 }}>Agricultural Competitiveness Enhancement Fund-Grants-In-Aid for Higher Education Program</Text>
                    </div>
                    <Space size={12}>
                        <FilterOutlined style={{ color: '#6b7280' }} />
                        <Select
                            value={academicYearFilter}
                            size="middle"
                            style={{ width: 200 }}
                            onChange={handleAcademicYearChange}
                            allowClear={false}
                        >
                            {[...sortedYears].reverse().map((year, i) => (
                                <Option key={year} value={year}>{year}{i === 0 ? ' (Current)' : ''}</Option>
                            ))}
                        </Select>
                        <Select
                            value={semesterFilter}
                            onChange={v => setSemesterFilter(v)}
                            style={{ width: 160 }}
                            allowClear={false}
                        >
                            <Option value="1st Semester">1st Semester</Option>
                            <Option value="2nd Semester">2nd Semester</Option>
                        </Select>
                    </Space>
                </div>
            </div>

            <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
                <StatsCards financialAssistances={filteredAcef_Giahep} semester={semesterFilter} />
            </div>

            {/* Overview */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <InfoCircleOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Overview
                    </Title>
                </Space>
                <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    <strong>Legal Bases:</strong> Republic Act (R.A.) No. 10848, "Agricultural Competitiveness Enhancement Fund Extension Law"
                </Text>
            </div>

            {/* Implementing Guidelines */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <ReconciliationOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Implementing Guidelines
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ul className="list-disc">
                        <li>
                            <span className="font-semibold">CHED–DA Joint Memorandum Circular (JMC) No. 2017-7</span>,
                            dated December 5, 2017 — "Implementing Guidelines of the Agricultural Competitiveness Enhancement Fund – Grants-in-Aid for Higher Education Program (ACEF-GIAHEP)"
                        </li>
                        <li>
                            <span className="font-semibold">CHED Administrative Order No. 1, Series of 2018</span> —
                            "Guidelines for the Implementation of the Memorandum of Agreement (MOA) Between CHED and DA, particularly in fully settling the unpaid obligation of DA to its ACEF Scholars"
                        </li>
                        <li>
                            <span className="font-semibold">CHED–DA JMC No. 6, Series of 2019</span> —
                            "Amendments to Numbers 6.1 and 6.2 of JMC No. 2017-7"
                        </li>
                        <li>
                            <span className="font-semibold">CHED–DA JMC No. 2, Series of 2024</span> —
                            "Enhanced Implementing Guidelines of the Agricultural Competitiveness Enhancement Fund – Grants-in-Aid for Higher Education Program"
                        </li>
                    </ul>
                </Typography>
            </div>

            {/* Objective */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <AuditOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Objective
                    </Title>
                </Space>
                <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    The ACEF-GIAHEP aims to promote the development of agriculture and fisheries by increasing the number
                    of graduates in higher education who are trained in scientific habit of thought, entrepreneurial skills
                    and technical competencies in the areas of agriculture, forestry, fisheries, and veterinary medicine
                    education.
                </Text>
            </div>

            {/* Coverage */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <ProjectOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Coverage
                    </Title>
                </Space>
                <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    The ACEF-GIAHEP is open to all qualified and deserving undergraduate students who will enroll or are
                    currently enrolled in any CHED recognized higher education institution in the areas of agriculture,
                    forestry, fisheries, veterinary medicine education and related agricultural education programs.
                </Text>
            </div>

            {/* Eligibility Requirements */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FileProtectOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Eligibility Requirements
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ol className="list-decimal">
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
                            <span>
                                *In exceptional cases, where income exceeds ₱400,000.00, CHEDROs shall determine the merit of the application. Said exceptional cases include but are not limited to:
                            </span>
                            <ul className="list-disc" style={{ marginTop: 8 }}>
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
                </Typography>
            </div>

            {/* Documentary Requirements */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <ExceptionOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Documentary Requirements
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ol className="list-decimal">
                        <li>Certified true copy of Birth Certificate</li>
                        <li>
                            Academic requirement:
                            <ul className="list-disc">
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
                            <ul className="list-disc">
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
                </Typography>
            </div>

            {/* Application Procedure */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FileDoneOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Application Procedure
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ol className="list-decimal">
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
                </Typography>
            </div>

            {/* Financial Assistance - SUCs/LUCs */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FundOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        SUCs/LUCs
                    </Title>
                </Space>
                <Card
                    style={{
                        borderRadius: 12,
                        border: '1px solid #f0f2f5',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        marginTop: 8,
                    }}
                    title="Allowances"
                >
                    <table style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: "#3366cc", color: '#FFF' }}>
                            <tr>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Allowances</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Per Sem</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Per AY</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>TOSF</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱10,000</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱20,000.00</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Stipend</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱17,500.00</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱35,000.00</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Book Allowance</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱2,500.00</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱5,000.00</td>
                            </tr>
                        </tbody>
                        <tfoot style={{ background: '#CED4DA', textAlign: 'center' }}>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱30,000.00</td>
                                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱60,000.00</td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>
            </div>

            {/* Financial Assistance - Private HEIs */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FundProjectionScreenOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Private HEIs
                    </Title>
                </Space>
                <Card
                    style={{
                        borderRadius: 12,
                        border: '1px solid #f0f2f5',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        marginTop: 8,
                    }}
                    title="Allowances"
                >
                    <table style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: "#3366cc", color: '#FFF' }}>
                            <tr>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Allowances</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Per Sem</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Per AY</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>TOSF</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>FREE</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>FREE</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Stipend</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱17,500.00</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱35,000.00</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Book Allowance</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱2,000.00</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱5,000.00</td>
                            </tr>
                        </tbody>
                        <tfoot style={{ background: '#CED4DA', textAlign: 'center' }}>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱20,000.00</td>
                                <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>₱40,000.00</td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>
            </div>

            {/* Issuances */}
            <div style={{ padding: '12px 24px 24px' }}>
                <Space size={12} align="start">
                    <LinkOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Issuances
                    </Title>
                </Space>
                <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    <a href="https://ched.gov.ph/wp-content/uploads/MOC_CALL_FOR_APPLICATIONS_FOR_THE_AGRICULTURAL_COMPETITIVENESS_ENHANCEMENT.pdf" target="_blank" rel="noopener noreferrer">
                        The ACEF-GIAHEP aims to promote the development of agriculture and fisheries by increasing the number
                        of graduates in higher education who are trained in scientific habit of thought, entrepreneurial skills
                        and technical competencies in the areas of agriculture, forestry, fisheries, and veterinary medicine
                        education.
                    </a>
                </Text>
            </div>

            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <WarningOutlined style={{ marginTop: 6, fontSize: 24, color: '#6b7280' }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Issuances
                    </Title>
                </Space>
                <Typography style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
                    <ul className="list-disc">
                        <li>
                            <a
                                href="https://ched.gov.ph/wp-content/uploads/MOC_CALL_FOR_APPLICATIONS_FOR_THE_AGRICULTURAL_COMPETITIVENESS_ENHANCEMENT.pdf"
                                className="text-blue-600 hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Memorandum from the Office of the Chairperson – Call for Applications for the Agricultural Competitiveness Enhancement Fund – Grants-in-Aid for Higher Education Program (ACEF-GIAHEP) for Academic Year 2024-2025
                            </a>
                        </li>
                        
                    </ul>
                </Typography>
                
            </div>
        </div>
    );
}
