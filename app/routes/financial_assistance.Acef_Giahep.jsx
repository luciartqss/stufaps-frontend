import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
    Card,
    Typography,
    Space,
    Select,
    Row,
    Col
} from 'antd'

import {
    LinkOutlined,
    ContactsOutlined,
    TeamOutlined,
    FilterOutlined,
    UserOutlined,
    EyeOutlined,
    OrderedListOutlined,
    ProjectOutlined,
    CheckCircleOutlined,
    FundOutlined,
    FundProjectionScreenOutlined,
    FileExcelOutlined,
    FileProtectOutlined,
    SwitcherOutlined,
    ReadOutlined,
    FileDoneOutlined,
    ExclamationOutlined,
    ReconciliationOutlined,
    DollarOutlined,
    FieldTimeOutlined,
    InteractionOutlined,
    ProfileOutlined,
    FileSearchOutlined,
    ExceptionOutlined,
    UserSwitchOutlined,
    SolutionOutlined,
    DeliveredProcedureOutlined,
    AuditOutlined
} from '@ant-design/icons'

const { Text, Title } = Typography
const { Option } = Select
import { Progress } from 'antd'

export function meta() {
    return [
        { title: 'Agricultural Competitiveness Enhancement Fund - Grants-in-Aid for Higher Education Program (ACEF-GIAHEP) Overview | StuFAPs' },
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

export default function FinancialAssistanceAcef_giahep() {

    const [expandedId, setExpandedId] = useState(null);
    const [financialAssistances, setFinancialAssistances] = useState([])
    const [expandedSUC, setExpandedSUC] = useState(null);
    const [expandedPrivate, setExpandedPrivate] = useState(null);
    const [loading, setLoading] = useState(true)
    const [academicYearFilter, setAcademicYearFilter] = useState('All')
    const [academicYears, setAcademicYears] = useState([])
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

                const uniqueYears = [
                    ...new Set(
                        programsData.map(p => p.academic_year || p.Academic_year).filter(Boolean)
                    )
                ]

                setAcademicYears([...uniqueYears.sort()])
                setLoading(false)
            })
            .catch(err => {
                console.error('Fetch Error:', err)
                setError(err.message)
                setLoading(false)
            })
    }, [])

    const handleAcademicYearChange = value => { setAcademicYearFilter(value || 'All') }

    if (loading) return <div className="p-8">Loading...</div>
    if (error) return <div className="p-8 text-red-600 bg-red-50 border border-red-300 rounded">Error: {error}</div>
    if (!Array.isArray(financialAssistances) || financialAssistances.length === 0) {
        return <div className="p-8 text-yellow-600 bg-yellow-50 border border-yellow-300 rounded">No scholarship programs found. Make sure your backend is running and database is seeded.</div>
    }

    const filteredAcef_Giahep = (Array.isArray(financialAssistances) ? financialAssistances : []).filter(p => {
        if (p?.scholarship_program_name?.toUpperCase() !== 'ACEFGIAHEP') return false
        if (academicYearFilter && academicYearFilter !== 'All') {
            return (p.academic_year || p.Academic_year) === academicYearFilter
        }
        // Only keep the "All" row when filter is All
        return (p.academic_year || p.Academic_year) === 'All'
    })

    return (
        <div style={{ background: '#fafbfc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    <div>
                        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>ACEF-GIAHEP</Title>
                        <Text style={{ color: '#6b7280', fontSize: 16 }}>Agricultural Competitiveness Enhancement Fund - Grants-in-Aid for Higher Education Program</Text>

                    </div>

                    {/* dropdown*/}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Space size={12}>
                            <FilterOutlined style={{ color: '#6b7280' }} />
                            <Select
                                value={academicYearFilter}
                                allowClear
                                size="middle"
                                style={{ width: 160 }}
                                onChange={handleAcademicYearChange}
                            >
                                {academicYears.map(year => (
                                    <Option key={year} value={year}>{year}</Option>
                                ))}
                            </Select>
                        </Space>
                    </div>
                </div>
            </div>

            <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', background: '#fff' }}>
                <StatsCards financialAssistances={filteredAcef_Giahep} />
            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
                        <div>
                            <Space size={12}>
                                <EyeOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                                    Overview
                                </Title>
                            </Space>
                            <br />
                            <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                <strong>Legal Bases:</strong> Republic Act (R.A.) No. 10848, “Agricultural Competitiveness Enhancement Fund Extension Law”
                            </Text>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>

                        <div>
                            <Space size={12}>
                                <ReconciliationOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                                    Implementing Guidelines:
                                </Title>
                            </Space>

                            <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                                <ul className="list-disc">
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
                            </Typography>
                        </div>
                    </div>
                </div>


            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
                        <div>
                            <Space size={12}>
                                <OrderedListOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                                    Objective:
                                </Title>
                            </Space>
                            <br />
                            <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                The ACEF-GIAHEP aims to promote the development of agriculture and fisheries by increasing the number
                                of graduates in higher education who are trained in scientific habit of thought, entrepreneurial skills
                                and technical competencies in the areas of agriculture, forestry, fisheries, and veterinary medicine
                                education.

                            </Text>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
                        <div>
                            <Space size={12}>
                                <ProjectOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                                    Coverage:
                                </Title>
                            </Space>
                            <br />
                            <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                The ACEF-GIAHEP is open to all qualified and deserving undergraduate students who will enroll or are
                                currently enrolled in any CHED recognized higher education institution in the areas of agriculture,
                                forestry, fisheries, veterinary medicine education and related agricultural education programs.

                            </Text>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
                        <div>
                            <Space size={12}>
                                <FileProtectOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                                    Eligibility Requirements
                                </Title>
                            </Space>
                            <br />

                            <Typography style={{ color: '#6b7280', fontSize: 16 }}>
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
                                        <br />
                                        <br />

                                        <ul className="list-disc">
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
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
                        <div>
                            <Space size={12}>
                                <ExceptionOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                                    Documentary Requirements
                                </Title>
                            </Space>
                            <br />

                            <Typography style={{ color: '#6b7280', fontSize: 16 }}>
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
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
                        <div>
                            <Space size={12}>
                                <FileDoneOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                                    Application Procedure
                                </Title>
                            </Space>
                            <br />

                            <Typography style={{ color: '#6b7280', fontSize: 16 }}>
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
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', borderBottom: '1px solid #e8eaed' }}>

                        <div>
                            <Space size={12}>
                                <DollarOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                                    Financial Assistance
                                </Title>
                            </Space>
                            <br />
                            <Typography level={5} style={{ fontWeight: 500, }}>

                                <Row gutter={[24]}>
                                    <Col span={24}>
                                        <Card
                                            style={{
                                                borderRadius: 12,
                                                border: '1px solid #f0f2f5',
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                                transition: 'all 0.3s ease',
                                            }}
                                            title={
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <FundOutlined style={{ fontSize: 16, color: '#6b7280' }} />
                                                    <Title level={2} style={{ fontSize: 16, margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                                                        SUCs/LUCs
                                                    </Title>
                                                </div>
                                            }
                                        >

                                            <div style={{ marginBottom: 10 }}>
                                                <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                                    <strong>Allowances</strong>
                                                </Text>
                                            </div>

                                            <div>
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
                                                            <td style={{ border: '1px solid #000', padding: '8px' }}>Stipend)</td>
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
                                            </div>
                                        </Card>
                                    </Col>

                                </Row>
                            </Typography>
                        </div>

                        <br />

                        <div>

                            <Typography level={5} style={{ color: '#1a1a1a', fontWeight: 500, }}>
                                <Row gutter={[24]}>
                                    <Col span={24}>
                                        <Card style={
                                            {
                                                borderRadius: 12,
                                                border: '1px solid #f0f2f5',
                                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                                transition: 'all 0.3s ease',
                                            }
                                        }
                                            title={
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <FundProjectionScreenOutlined style={{ fontSize: 16, color: '#6b7280' }} />
                                                    <Title level={2} style={{ fontSize: 16, margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                                                        Private HEIs
                                                    </Title>
                                                </div>
                                            }
                                        >
                                            <div style={{ marginBottom: 10 }}>
                                                <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                                    <strong>Allowances</strong>
                                                </Text>
                                            </div>

                                            <div>
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
                                            </div>
                                        </Card>
                                    </Col>
                                </Row>
                            </Typography>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
                        <div>
                            <Space size={12}>
                                <LinkOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                <Title level={2} style={{ paddingBottom: '1px', color: '#1a1a1a', fontWeight: 600 }}>
                                    ISSUANCES
                                </Title>
                            </Space>
                            <br />
                            <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                <a href="https://ched.gov.ph/wp-content/uploads/MOC_CALL_FOR_APPLICATIONS_FOR_THE_AGRICULTURAL_COMPETITIVENESS_ENHANCEMENT.pdf" target="_blank" rel="noopener noreferrer">
                                    The ACEF-GIAHEP aims to promote the development of agriculture and fisheries by increasing the number
                                    of graduates in higher education who are trained in scientific habit of thought, entrepreneurial skills
                                    and technical competencies in the areas of agriculture, forestry, fisheries, and veterinary medicine
                                    education.
                                </a>
                            </Text>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    );
}

