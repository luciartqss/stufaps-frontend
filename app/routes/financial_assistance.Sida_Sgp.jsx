import { useEffect, useState } from 'react'
import { Card, Typography, Space, Select } from 'antd'
import { API_BASE } from '../lib/config'
import {
    ContactsOutlined,
    TeamOutlined,
    FilterOutlined,
    UserOutlined,
    InfoCircleOutlined,
    ProjectOutlined,
    FileProtectOutlined,
    ReconciliationOutlined,
    FormOutlined,
    SnippetsOutlined,
    DollarOutlined,
    ReadOutlined,
    FileDoneOutlined,
    AuditOutlined,
    FileSearchOutlined,
    ExceptionOutlined,
    FundOutlined,
    FundProjectionScreenOutlined,
    WarningOutlined,
    CreditCardOutlined,
} from '@ant-design/icons'
const { Text, Title } = Typography
const { Option } = Select
import { Progress } from 'antd'


export function meta() {
    return [
        { title: 'Scholarship Grant Program for Children and Dependents of Sugarcane Industry Workers and Small Sugarcane Farmers (SIDA-SGP) | StuFAPs' },
        { name: 'description', content: 'Manage SIDA-SGP records' },
    ]
}

function StatsCards({ financialAssistances = [] }) {

    let totals;

    if (financialAssistances.length === 1 && (financialAssistances[0].academic_year === 'All' || financialAssistances[0].Academic_year === 'All')) {
        const row = financialAssistances[0];
        totals = {
            totalSlots: Number(row?.total_slot) || 0,
            totalFilled: Number(row?.total_students) || 0,
            totalUnfilled: Number(row?.unfilled_slot) || 0,
        };
    } else {
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
            ))}
        </div>
    )

}

export default function FinancialAssistanceSida_Sgp() {
    const [financialAssistances, setFinancialAssistances] = useState([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [academicYearFilter, setAcademicYearFilter] = useState('All')
    const [academicYears, setAcademicYears] = useState([])

    useEffect(() => {
        fetch(`${API_BASE}/scholarship_program_records`)
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

    const filteredSida_Sgp = (Array.isArray(financialAssistances) ? financialAssistances : []).filter(p => {
        if (p?.scholarship_program_name?.toUpperCase() !== 'SIDASGP') return false
        if (academicYearFilter && academicYearFilter !== 'All') {
            return (p.academic_year || p.Academic_year) === academicYearFilter
        }
        return (p.academic_year || p.Academic_year) === 'All'
    })

    return (
        <div style={{ background: '#fff', margin: -24, minHeight: 'calc(100vh - 72px)' }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>SIDA-SGP</Title>
                        <Text style={{ color: '#6b7280', fontSize: 16 }}>Scholarship Grant Program for Children and Dependents of Sugarcane Industry Workers and Small Sugarcane Farmers</Text>
                    </div>
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

            <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
                <StatsCards financialAssistances={filteredSida_Sgp} />
            </div>

            <div style={{ padding: '12px 24px 0' }}>
                <Text style={{ color: '#6b7280', fontSize: 16 }}>
                    To provide scholarship grant to children and dependents of sugarcane industry workers
                    and small sugarcane farmers duly certified by the Sugar Regulatory Administration (SRA).
                </Text>
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
                    Administered in partnership with the Sugar Regulatory Administration (SRA), the program is designed to assist children and dependents of sugarcane industry workers and small sugarcane farmers in accessing quality higher education.
                </Text>
            </div>

            {/* Scope and Coverage */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <ProjectOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Scope and Coverage
                    </Title>
                </Space>
                <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    The scholarship grant program is open to qualified and deserving children and
                    dependents of sugarcane industry workers and small sugarcane farmers. This
                    program shall cover both undergraduate and graduate students who will enroll or are
                    currently enrolled in agriculture, agricultural engineering and mechanics, and
                    chemical engineering/sugar technology as identified in Sec. 6.b of R.A. 10659 in any
                    identified State Universities and Colleges (SUCs). Slot allocation per concerned region will be determined and recommended by Sugar
                    Regulatory Administration (SRA).
                </Text>
            </div>

            {/* Application Process */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FileProtectOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Application Process
                    </Title>
                </Space>
                <Text strong style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    Undergraduate Program
                </Text>
                <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                    <ol className="list-decimal">
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
                            <ol type="a" className="list-[lower-alpha] list-inside pl-6">
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
                </Typography>
            </div>

            {/* Graduate Program - Qualifications */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <ReconciliationOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Graduate Program
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ol className="list-decimal">
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
                </Typography>
            </div>

            {/* Documentary Requirements - Undergraduate */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FormOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Documentary Requirements
                    </Title>
                </Space>
                <Text strong style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    Undergraduate Program
                </Text>
                <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                    <ol className="list-decimal">
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
                            <ol type="a" className="list-[lower-alpha] list-inside pl-6">
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
                            <ol type="a" className="list-[lower-alpha] list-inside pl-6">
                                <li>Latest Income Tax Return (ITR) of parents/guardians if employed</li>
                                <li>Certificate of Tax Exemption from the Bureau of Internal Revenue (BIR)</li>
                                <li>Certificate of No Income from BIR</li>
                                <li>Certificate of Indigence from their barangay</li>
                                <li>Certificate/Case Study from Department of Social Welfare and Development (DSWD)</li>
                                <li>For Children of OFW and Seafarers, a latest copy of contract or proof of income may be considered</li>
                            </ol>
                        </li>
                    </ol>
                </Typography>
            </div>

            {/* Documentary Requirements - Graduate */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <SnippetsOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Graduate Program
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ol className="list-decimal">
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
                            <ol type="a" className="list-[lower-alpha] list-inside pl-6">
                                <li>Latest ITR</li>
                                <li>Certificate of Tax Exemption from the BIR</li>
                                <li>Certificate of No Income from BIR</li>
                                <li>Certificate of Indigence from their barangay</li>
                                <li>Certificate/Case Study from DSWD</li>
                            </ol>
                        </li>
                    </ol>
                </Typography>
            </div>

            {/* Modes of Payment */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <DollarOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Modes of Payment
                    </Title>
                </Space>
                <Text strong style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    Mode 1
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 16, display: 'block' }}>
                    CHEDROs release financial benefits directly to
                    beneficiaries through checks or authorized banks; and
                </Text>
                <Text strong style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 12 }}>
                    Mode 2
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 16, display: 'block' }}>
                    CHEDROs transfer financial benefits to beneficiaries through SUCs.
                </Text>
            </div>

            {/* Documentary Requirement for Regular Allowance */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <ReadOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Documentary Requirement for Regular Allowance
                    </Title>
                </Space>
                <Text strong style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    Mode 1
                </Text>
                <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                    <ol className="list-decimal">
                        <li>Copy of Notice of Award (NOA) – Annex A</li>
                        <li>Copy of Certificate of Enrollment (COE) or Certificate of Registration (COR)</li>
                        <li>Certified True Copy of Grades of the previous term issued by the school</li>
                        <li>Copy of valid school ID</li>
                        <li>Copy of ATM card as applicable</li>
                    </ol>
                </Typography>
                <Text strong style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 12 }}>
                    Mode 2
                </Text>
                <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                    <ol className="list-decimal">
                        <li>Billing Statement from SUC</li>
                        <li>Memorandum of Agreement between CHEDRO and SUC</li>
                    </ol>
                </Typography>
            </div>

            {/* Documentary Requirement for Thesis/Dissertation Allowance */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FileDoneOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Documentary Requirement for Thesis/Dissertation Allowance
                    </Title>
                </Space>
                <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    Hardbound copy of Thesis/Dissertation with signed approval
                    sheet or certification from SUC of completion of the study, to be
                    submitted to CHED Central Office through CHEDRO.
                </Text>
            </div>

            {/* Documentary Requirement for OJT Allowance */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <AuditOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Documentary Requirement for On-the-Job Training (OJT) Allowance
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ol className="list-decimal">
                        <li>Copy of Narrative Report</li>
                        <li>Copy of Grades to be submitted to CHED Central Office through CHEDRO</li>
                    </ol>
                </Typography>
            </div>

            {/* Documentary Requirement for Conference/Fora */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FileSearchOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Documentary Requirement for Attendance to Local Conference/Fora
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ol className="list-decimal">
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
                </Typography>
            </div>

            {/* Application Procedure */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <ExceptionOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Application Procedure
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ol className="list-decimal">
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
                </Typography>
            </div>

            {/* Financial Benefits - Undergraduate */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FundOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Financial Benefits — Undergraduate Programs
                    </Title>
                </Space>
                <Card
                    style={{
                        borderRadius: 12,
                        border: '1px solid #f0f2f5',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        marginTop: 8,
                    }}
                    title="Regular Allowances"
                >
                    <table style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: "#3366cc", color: '#FFF' }}>
                            <tr>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Type</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Unit Cost (PHP)</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Total Cost per Academic Year (PHP)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Stipend (includes subsistence, clothing, transportation, tours, field trips, small projects, medical insurance)</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>10,000.00/month x 10 months or 50,000/semester</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱100,000.00</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Book allowance and other learning materials</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱5,000.00/Semester</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱10,000.00</td>
                            </tr>
                        </tbody>
                        <tfoot style={{ background: '#CED4DA'}}>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                                <td colSpan={2} style={{ border: '1px solid #000',  textAlign: 'center' , padding: '8px', fontWeight: 'bold' }}>₱110,000.00</td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>
                <Card
                    style={{
                        borderRadius: 12,
                        border: '1px solid #f0f2f5',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        marginTop: 12,
                    }}
                    title="Others"
                >
                    <table style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: "#3366cc", color: '#FFF' }}>
                            <tr>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Type</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Thesis and/or OJT allowance</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱75,000.00</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>One-time attendance to local conference/fora (junior/senior year, outside enrolled HEI)</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱15,000.00</td>
                            </tr>
                        </tbody>
                        <tfoot style={{ background: '#CED4DA' }}>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                                <td style={{ border: '1px solid #000', textAlign: 'center', padding: '8px', paddingLeft: '35px', paddingRight: '35px', fontWeight: 'bold' }}>₱90,000.00</td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>
            </div>

            {/* Financial Benefits - Graduate */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <FundProjectionScreenOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Financial Benefits — Graduate Programs
                    </Title>
                </Space>
                <Card
                    style={{
                        borderRadius: 12,
                        border: '1px solid #f0f2f5',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        marginTop: 8,
                    }}
                    title="Regular Allowances"
                >
                    <table style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: "#3366cc", color: '#FFF' }}>
                            <tr>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Type</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Unit Cost (PHP)</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Total Cost per Academic Year (PHP)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Tuition and Other School Fees</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱30,000.00/semester</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱60,000.00</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Stipend (which includes subsistence, clothing, transportation allowance, educational tours, field trips, expenses for small projects and medical insurance)</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱10,000.00/month x 10 months or ₱50,000/semester</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱100,000.00</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Book allowance and other learning materials</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱7,500.00/semester</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱15,000.00</td>
                            </tr>
                        </tbody>
                        <tfoot style={{ background: '#CED4DA'}}>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                                <td colSpan={2} style={{ border: '1px solid #000', textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>₱175,000.00</td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>
                <Card
                    style={{
                        borderRadius: 12,
                        border: '1px solid #f0f2f5',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        marginTop: 12,
                    }}
                    title="Others"
                >
                    <table style={{ width: '100%' }}>
                        <thead style={{ backgroundColor: "#3366cc", color: '#FFF' }}>
                            <tr>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Type</th>
                                <th style={{ border: '1px solid #000', padding: '8px' }}>Total Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>One-time attendance to local conference/fora (Should be related to the graduate program. The activity should not be on the same HEI where the beneficiary is enrolled.)</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱15,000</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Dissertation Allowance (Doctoral)</td>
                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>₱100,000.00</td>
                            </tr>
                        </tbody>
                        <tfoot style={{ background: '#CED4DA' }}>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '8px' }}>Total</td>
                                <td style={{ border: '1px solid #000', padding: '8px', paddingLeft: '66px', paddingRight: '66px', fontWeight: 'bold' }}>₱75,000.00</td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>
            </div>

            {/* Conditions of the Scholarship Program */}
            <div style={{ padding: '12px 24px 24px', borderBottom: '1px solid #e8eaed' }}>
                <Space size={12} align="start">
                    <WarningOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Conditions of the Scholarship Program
                    </Title>
                </Space>
                <Typography style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>
                    <ol className="list-decimal">
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
                </Typography>
            </div>

            {/* Administrative Cost */}
            <div style={{ padding: '12px 24px 24px' }}>
                <Space size={12} align="start">
                    <CreditCardOutlined style={{ fontSize: 24, color: '#6b7280', marginTop: 6 }} />
                    <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                        Administrative Cost
                    </Title>
                </Space>
                <Text style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 8 }}>
                    The Administrative Cost (AC) shall be 5% of the total budget allocated for the program
                    and shall be distributed as follows: 2.5% for Office of the Student Development and
                    Services (OSDS), CHED, 1.25% for the concerned CHEDROs and 1.25% for the
                    SUCs. The utilization of AC should be in accordance with the existing government
                    accounting and auditing rules and regulations.
                </Text>
                <Text strong style={{ color: '#6b7280', fontSize: 16, display: 'block', marginTop: 16 }}>
                    AC shall be used for related expenses such as but not limited to:
                </Text>
                <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                    <ol className="list-decimal">
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
                </Typography>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 16 }}>
                    Reference: CMO-No.-2-s.-2020-Amendments-to-CMO-No.-30-s-2016
                </Text>
            </div>
        </div>
    );
}
