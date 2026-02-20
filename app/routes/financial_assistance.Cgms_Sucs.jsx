import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Tag, Typography, Space, Select, Row, Col } from 'antd'
import { API_BASE } from '../lib/config'
import {
    ContactsOutlined,
    RightOutlined,    //
    TeamOutlined,
    FilePptOutlined,
    FileDoneOutlined,
    MedicineBoxOutlined,
    FileSyncOutlined, //not used yet
    WarningOutlined,
    FilterOutlined,
    SnippetsOutlined,
    UserOutlined,
    EyeOutlined,
    GiftOutlined,
    ProjectOutlined,
    ExceptionOutlined,
    FundOutlined,
    FundProjectionScreenOutlined,
    FileExcelOutlined,
    FileProtectOutlined,
    SwitcherOutlined,
    ReadOutlined,
    ExclamationOutlined,
    ReconciliationOutlined,
    DollarOutlined,
    CreditCardOutlined,
    FieldTimeOutlined,
    InteractionOutlined,
    ProfileOutlined,
    FileSearchOutlined,
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
        { title: 'Cash Grant to Medical Students Enrolled in State Universities and Colleges (CGMS-SUCs) | StuFAPs' },
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

    if (loading) return <div className="p-8">Loading...</div>
    if (error) return <div className="p-8 text-red-600 bg-red-50 border border-red-300 rounded">Error: {error}</div>
    if (!Array.isArray(financialAssistances) || financialAssistances.length === 0) {
        return <div className="p-8 text-yellow-600 bg-yellow-50 border border-yellow-300 rounded">No scholarship programs found. Make sure your backend is running and database is seeded.</div>
    }

    const handleAcademicYearChange = value => { setAcademicYearFilter(value || 'All') }

    const filteredCgms = (Array.isArray(financialAssistances) ? financialAssistances : []).filter(p => {
        if (p?.scholarship_program_name?.toUpperCase() !== 'CGMSSUCS') return false
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
                        <Title level={2} style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>CGMS-SUCs</Title>
                        <Text style={{ color: '#6b7280', fontSize: 16 }}>Cash Grant to Medical Students Enrolled in State Universities and Colleges</Text>

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
                <StatsCards financialAssistances={filteredCgms} />
            </div>

            <div style={{ background: '#fff' }}>
                <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                    <div style={{ paddingBottom: '24px', borderBottom: '1px solid #e8eaed' }}>


                        <div>
                            <div>
                                <table style={{ width: '100%' }}>
                                    <thead style={{ backgroundColor: "#3366cc", border: '1px solid #000', color: '#FFF', textAlign: 'center', fontWeight: 500 }}>
                                        <tr>
                                            <td colSpan={2} style={{fontSize: 15, padding: '8px', border: '1px solid #000' }}>
                                                CASH GRANT TO MEDICAL STUDENTS ENROLLED IN STATE UNIVERSITIES AND COLLEGES (CGMS-SUCs)
                                            </td>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                                                <strong>WHAT</strong>
                                            </td>
                                            <td style={{ border: '1px solid #000', padding: '8px' }}>
                                                <Space>
                                                    <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                                        The Implementing Guidelines for the Cash Grants to Medical students enrolled In
                                                        State Universities and Colleges (CGMS-SUCs) are jointly issued by the Commission on
                                                        Higher Education (CHED) and the Department of Budget and Management (DBM), aims to
                                                        provide tuition fee subsidy and financial assistance to all medical students
                                                        enrolled in identified SUCs offering Doctor of Medicine Program.

                                                    </Text>
                                                </Space>

                                            </td>
                                        </tr>

                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                                                <strong>WHO</strong>
                                            </td>
                                            <td style={{ border: '1px solid #000', padding: '8px' }}>
                                                <Space>
                                                    <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                                        <strong>Who may apply?</strong>
                                                    </Text>
                                                </Space>

                                                <Space>
                                                    <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                                        The program is intended for all Filipino medical students, both new and continuing,
                                                        who are enrolled in the Doctor of Medicine Program in the following SUCs:
                                                    </Text>
                                                </Space>

                                                <Space>
                                                    <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                                                        <ol className="list-decimal">
                                                            <li>Bicol University – Daraga, Albay</li>
                                                            <li>Cagayan State University – Carig, Tuguegarao City, Cagayan</li>
                                                            <li>Mariano Marcos State University – Quiling Sur, City of Batac, Ilocos Norte</li>
                                                            <li>Mindanao State University – Marawi City, Lanao Del Sur</li>
                                                            <li>University of Northern Philippines – Tamag, Vigan City, Ilocos Sur</li>
                                                            <li>University of the Philippines Manila College of Medicine – Pedro Gil, Manila</li>
                                                            <li>University of the Philippines Manila School of Health Sciences – Palo, Leyte</li>
                                                            <li>West Visayas State University – Luna Street, La Paz, Iloilo City</li>
                                                        </ol>
                                                    </Typography>
                                                </Space>

                                            </td>
                                        </tr>

                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                                                <strong>WHERE</strong>
                                            </td>
                                            <td style={{ border: '1px solid #000', padding: '8px' }}>
                                                <Space>
                                                    <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                                        <strong>Where to secure file application?</strong>
                                                    </Text>
                                                </Space>

                                                <Space>
                                                    <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                                        Participating SUCs offering Doctor of Medicine programs
                                                    </Text>
                                                </Space>

                                                <Space>
                                                    <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                                        <strong>Where and how to file the application?</strong>
                                                    </Text>
                                                </Space>
                                                <br />

                                                <Space>
                                                    <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                                                        <ul className="list-disc">
                                                            <li>
                                                                Applicant submits the accomplished CGMS-SUCs Application Form (Annex “A”) directly to the SUC concerned together with the required documents before the start of academic year applied
                                                            </li>
                                                            <li>SUC evaluates the documents of applicants</li>
                                                            <li>SUC issues Notice of Award (NOA) using Annex “B”</li>
                                                            <li>Applicant accepts NOA</li>
                                                        </ul>
                                                    </Typography>
                                                </Space>

                                            </td>
                                        </tr>

                                        <tr>
                                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                                                <strong>WHEN</strong>
                                            </td>
                                            <td style={{ border: '1px solid #000', padding: '8px' }}>
                                                <Space>
                                                    <Text style={{ color: '#6b7280', fontSize: 16 }}>
                                                        <strong>Schedule of application: </strong> Before the start of Academic Year (AY) applied
                                                    </Text>
                                                </Space>

                                            </td>
                                        </tr>

                                    </tbody>
                                    <tfoot>
                                        <tr style={{ alignItems: "center", textAlign: "center", fontWeight: "bold" }} >
                                            <td colSpan={2} style={{ border: '1px solid #000', padding: '8px' }}>
                                                <p>
                                                    For queries, call (02) 8988-0001 or email osds-lsad@ched.gov.ph
                                                </p>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div style={{ background: '#fff' }}>
                            <div style={{ paddingRight: '24px', paddingTop: '12px', paddingLeft: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>

                                        <Space size={12}>
                                            <SwitcherOutlined style={{ paddingBottom: '10px', fontSize: 24, color: '#6b7280' }} />
                                            <Title level={2} style={{ color: '#1a1a1a', fontWeight: 600 }}>
                                                CGMS-SUCs Reference Materials
                                            </Title>
                                        </Space>
                                        <br />
                                        <Text className="font-medium" style={{ color: '#6b7280', fontSize: 16 }}>Payment Type</Text>

                                        <Typography style={{ color: '#6b7280', fontSize: 16 }}>
                                            <ul className="list-disc">
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
                                        </Typography>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
