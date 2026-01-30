import { useEffect, useState } from 'react' 
import { Card, Typography } from 'antd' 
import { ContactsOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
const { Text } = Typography
import { Progress } from 'antd'

export function meta() {
  return [
        { title: 'Medical Scholarship and Return Service (MSRS) | StuFAPs' },
        { name: 'description', content: 'Manage MSRS records' },
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

export default function FinancialAssistanceMSRS() {
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

  return (
        <div className="min-h-screen">
        <main>
            
            <StatsCards financialAssistances={(Array.isArray(financialAssistances) ? financialAssistances : []).filter(
                        p => p?.scholarship_program_name?.toUpperCase() === "MSRS"
            )} />

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Medical Scholarship and Return Service (MSRS)</h1>
            
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    These Implementing Rules and Regulations (IRR) of Republic Act No. 11509, or the "Doktor Para sa Bayan" Act, establish a medical scholarship and return service program for deserving students pursuing medicine.
                </p>          
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Overview</h1>
            
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Scholars shall serve in government health offices or hospitals in their hometowns or underserved municipalities as part of their integration into the public health system. The program aims to ensure the availability of doctors providing basic, promotive quality, 
                    preventive, and curative health services in all municipalities, especially in remote, disadvantaged, and conflict-affected areas.               
                </p>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Scope and Coverage</h1>
            
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    The Medical Scholarship and Return Service (MSRS) Program under
                    Republic Act No. 11509 shall be available to deserving Filipino students
                    pursuing a Doctor of Medicine degree.
                    The program covers the entire duration of medical education, including the Summer Immersion Program (SIP) or Community Orientation Summer Workshop (COSW), one (1) year of post-graduate internship, the Physician Licensure Examination, and the completion of the return service agreement. Priority shall be given to applicants
                    from areas without government physicians to ensure that
                    every municipality has a doctor. 
                </p>
                
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Student financial assistance under the MSRS Program includes:           
                </p>
         
                
                    <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-[lower-alpha] list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                        <li>Free tuition and other school fees</li> 
                        <li>Allowances for books, supplies, uniforms, accommodation, and transportation</li> 
                        <li>Internship and board review fees</li> <li>Licensure fees</li> 
                        <li>Annual medical, PHIC, and accident insurance</li> 
                        <li>Other education-related living allowances</li> 
                    </ol> 
        
                
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed"> 
                    The CHED, in coordination with the DOH, shall set mechanisms to determine financial assistance amounts per scholar based on budget and program costs. For private higher education institutions (PHEIs), CHED shall establish standard fees, and PHEIs shall provide counterpart funding for scholars’ tuition and other fees. 
                </p>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Coverage and Benefit Package</h1>
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    The MSRS Program under the Act shall be open to deserving Filipino students
                    pursuing a Doctor of Medicine degree. It covers the full duration of medical education, including the Summer Immersion Program (SIP) or Community Orientation Summer Workshop (COSW), one (1) year of post-graduate internship, the Physician Licensure Examination, and the return service period. Priority shall be given to applicants from areas without government physicians to ensure a doctor in every municipality.
                </p>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Free tuition and other school fees</li> 
                    <li>Allowance for prescribed books, supplies and equipment</li> 
                    <li>Clothing or uniform allowance</li> 
                    <li>Allowance for dormitory or boarding house accommodation</li> 
                    <li>Transportation allowance</li> 
                    <li>Internship fees including financial assistance during mandatory internship</li> 
                    <li>Medical board review fees</li> 
                    <li>Licensure fees</li> 
                    <li>Annual medical insurance; PHIC enrolment and accident insurance</li> 
                    <li>Other education-related miscellaneous subsistence or living allowances</li>
                </ol>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Qualification Process</h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Must be a Filipino citizen residing in the Philippines</li>
                    <li>
                        Must be a graduating student or a graduate of an appropriate undergraduate program identified as a prerequisite for a Doctor of Medicine degree, from any HEI duly recognized by the CHED, including a direct entrant to the Integrated Liberal Arts and Medicine (INTARMED) Program who satisfactorily completes the first two (2) years of the Program. Provided, that deserving incoming second year medical students and those in the higher year levels of the Doctor of Medicine Program shall also be covered under this Act, as long as they have complied with the academic requirements and retention policies of the school in the past terms preceding their scholarship application
                    </li>
                    <li>
                        Must have passed the entrance examinations and complied with other related requirements for admission into a Doctor of Medicine degree in the SUC or PHEI where the scholar intends to enroll as well as the other requirements of the CHED and the DOH
                    </li>
                    <li>
                        Must obtain a National Medical Admission Test (NMAT) score mandated by the CHED and required by the SUC or PHEI where the student intends to enroll in
                    </li>
                </ol>

            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Documentary Requirements</h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>
                        Proof of Filipino citizenship such as any government-issued document showing proof of Filipino citizenship, including, but not limited to certified true copy of birth certificate, PHILSYS ID
                    </li>
                    <li>Certificate of Good Moral Character</li>
                    <li>
                        Additional requirements for priority groups (as applicable):
                        <ol className="list-inside list-[lower-alpha] pl-6 space-y-1 mt-2">
                        <li>Certificate of Residency from Barangay</li>
                        <li>
                            Certification as members of indigenous people or minority group / National Commission on Indigenous People (NCIP) certificate
                        </li>
                        <li>
                            Tax Exemption / Tax Declaration (from BIR) or social case study duly signed by a registered social worker where the applicant resides
                        </li>
                        </ol>
                    </li>
                    </ol>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Application Process</h1>

                    <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>
                        Applicants shall apply in the SUCs and PHEIs of their choice within or near the province or region of residence. Applicants shall undergo screening and selection process as defined by the SUCs or PHEIs for admission to the Medical Program/Course
                    </li>
                    <li>
                        The SUCs and PHEIs shall endorse the list of scholarship applicants to CHED for evaluation and validation
                    </li>
                    <li>
                        CHED shall validate the results from the SUCs and PHEIs and priority shall be given to deserving applicants from, but not limited to, the groups in the following order of priority:
                        <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                        <li>Those residing in a municipality without government physicians</li>
                        <li>
                            Those residing in geographically isolated and disadvantaged areas (GIDA) or from the top twenty (20) percent provinces and/or municipalities as identified by the PSA, calamity-prone and conflict areas
                        </li>
                        <li>
                            Those belonging to the ethnic group or indigenous population/communities as certified by respective local government units and the National Commission on Indigenous Peoples (NCIP)
                        </li>
                        <li>Those dependents of Community health volunteers</li>
                        <li>Those residing in low income class municipalities with high poverty incidence</li>
                        <li>Those whose combined annual family income of less than Php 450,000.00</li>
                        <li>
                            CHED shall endorse the list of approved/accepted scholars to the concerned SUCs and PHEIs to facilitate the enrolment of the scholars
                        </li>
                        </ol>
                    </li>
                    </ol>
                
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Conditions for the Grant of Scholarship</h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>
                        Must sign a scholarship agreement with terms set by CHED and DOH under the Act
                    </li>
                    <li>
                        Must take the full prescribed academic load each semester and not drop courses that result in underloading
                    </li>
                    <li>
                        Must complete the Doctor of Medicine program within the prescribed period of the SUC or PHEI, following its retention policies. Deferment or leave of absence (LOA) may be allowed for valid reasons with SUC or PHEI approval. Transfers to another SUC or PHEI may also be permitted for valid, justified reasons and subject to both institutions’ admission and retention policies:
                        <ol type="a" className="list-[lower-alpha] list-inside pl-6 space-y-1 mt-2">
                        <li>Change of residence, e.g. but not limited to employment of parents, government relocation/resettlement plan, etc</li>
                        <li>Safety and security / peace and order situations</li>
                        <li>Financial concerns</li>
                        <li>Natural calamities</li>
                        <li>Health reasons</li>
                        <li>Force majeure</li>
                        <li>Greater access to academic opportunities</li>
                        <li>Other analogous cases</li>
                        </ol>
                    </li>
                    <li>
                        Must complete the mandatory internship prescribed by the CHED-recognized association of medical schools after graduation or during the final year for those in a five (5)-year program. Scholars in a four (4)-year program shall be prioritized for placement in government hospitals. If no slots are available, the internship may be completed in a DOH-accredited public health facility or any accredited government hospital within the region, subject to the association’s requirements
                    </li>
                    <li>
                        Must take the Physician Licensure Examination within one (1) year after completing the mandatory internship for four (4)-year programs, or within one (1) year after graduation for five (5)-year programs
                    </li>
                    <li>
                        Must fulfill the required return service as stated in Section 14 of this IRR
                    </li>
                    <li>
                        Must serve full-time in a DOH-designated priority public health facility in the Philippines for one (1) year for every year of scholarship, within one (1) year after graduation or licensure. Those who render two (2) additional years of service shall receive incentives as determined by the DOH
                    </li>
                    </ol>               
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Grounds for Disqualification</h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Violation of any of the terms and conditions of the scholarship agreement</li>
                    <li>Submission of falsified or fraudulent documents</li>
                    <li>
                        Failure to meet the academic requirements or to complete the course within the prescribed period without valid cause as may be determined by the SUC or PHEI
                    </li>
                    <li>
                        Violation of any student disciplinary rules and regulations of the SUC or PHEI which merit the penalty of expulsion or suspension for more than one (1) year
                    </li>
                    <li>Transfer to non-partner PHEI</li>
                    <li>Exceeding the allowable period of the LOA, as prescribed under Section 11</li>
                    <li>
                        The scholar accepts another scholarship/grant from other government or private agency or entity while enjoying the benefits under the Medical Scholarship and Return Service Program
                    </li>
                    <li>
                        While being a scholar, the scholar commits gross misconduct in a manner that would bring significant damage to the concerned SUC or PHEI, its administration, faculty and students and to the community
                    </li>
                </ol>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Transfer to other Partner School/Lateral Entry</h1>
                
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Scholars may transfer to other SUCs or PHEIs if approved by both the originating and receiving institutions and justified under Section 8(c) of this IRR. The CHED regional office shall conduct evaluation and validation, supported by required documents such as a release or approval letter 
                    and transcript of records (TOR).
                </p>
            
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Leave of Absence</h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>
                        The reason is valid and supported by documents (e.g., health, safety, or force majeure)
                    </li>
                    <li>
                        The LOA follows the policies of the partner HEI and affiliate hospital (for post-graduate interns)
                    </li>
                    <li>
                        The LOA does not exceed one (1) school year
                    </li>
                </ol> 
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Internship for Medical Scholars</h1>
                
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    CHED shall coordinate with the Philippine Association of Medical Schools and
the DOH to assign medical scholars to DOH hospitals, affiliate hospitals, and
other government hospitals. Medical scholars in internship shall receive a monthly stipend for living, lodging, and transportation for up to one (1) year, in accordance with Section 4(f) of the Act. Stipends will not be provided if the internship is not completed within the prescribed period, unless delays are due to circumstances beyond the scholar’s control.
                </p>
            
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Physician Licensure Examination</h1>
                
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Scholars must take the Physician Licensure Examination (PLE) within one (1) year after completing the mandatory internship for four (4)-year programs, or within one (1) year after graduation for five (5)-year programs. Retakes are allowed, but the scholar must cover all related expenses.
                </p>
            
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Mandatory Return Service and Integration of the Scholar into the Public Health and Medical Service System</h1>
                
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Upon passing the Physician Licensure Examination (PLE) administered by the PRC, scholars shall be integrated into the public health system through the DOH and receive the corresponding civil service rank, salary, and benefits, 
                </p>

                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Subject to the following:                
                </p>

                <ol type="a" className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-[lower-alpha] list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>
                        Scholars shall serve in a government health office, hospital, or accredited facility in their hometown if there are no government physicians. Otherwise, they may serve within their home province or in the nearest underserved municipality outside the province, as prioritized by the DOH
                    </li>
                    <li>
                        Mandatory return service shall be completed within six (6) years for four (4)-year program scholars and seven (7) years for five (5)-year program scholars
                    </li>
                    <li>
                        During pandemics or public health emergencies, the DOH may require scholars to serve in any public health office or government hospital where needed
                    </li>
                    <li>
                        CHED, through the Office of Student Development and Services and in consultation with the DOH, shall establish a tracking system to monitor scholars’ compliance with the mandatory return service within six (6) years after passing the PLE
                    </li>
                    <li>
                        Upon completing the return service, scholars must submit a service record to the DOH if employed outside the DOH
                    </li>
                    <li>
                        The DOH shall issue a certificate of completion after evaluating the service rendered
                    </li>
                </ol>

            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Compliance with the Return Service Program (RSP) requires scholars to practice in the Philippines as a physician </h1>
                
                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Local Health Officer or Rural Health Physician</li>
                    <li>Primary Care Physician in accredited government primary care facilities</li>
                    <li>
                        Medical Officer in district or provincial hospitals in priority areas, if all local health offices and primary care facilities are fully staffed
                    </li>
                </ol>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Sanctions for Non-Compliance of RSA</h1>
                
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Physicians who have availed of the MSRS Program but fail or refuse to comply
with the mandatory return service must repay twice the full cost of the scholarship, including all benefits and expenses. If payment is not made, the PRC may, after due process, deny license renewal. These penalties do not apply if non-compliance is due to serious illness. Payments shall be made to CHED through the SUC or partner PHEI from which the scholar graduated.
                </p>
            </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">Funding</h1>
                
                <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                    Funding for the implementation of this Act shall come from the current-year appropriations of participating SUCs, DOH, and CHED. Starting Academic Year 2021–2022, new MSRS scholars shall be funded under the CHED budget, while current scholars under the DOH medical scholarship program shall continue to be funded by the DOH until transferred to CHED. Future funding for the 
MSRS program shall be included in the annual General Appropriations Act under the scholarship programs of SUCs and CHED.
                </p>
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


