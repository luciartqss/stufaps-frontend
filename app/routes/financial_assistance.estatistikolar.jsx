import { useState } from "react";

export default function FinancialAssistanceEstatistikolar() {
    const [expandedSUC, setExpandedSUC] = useState(null);
    const [expandedPrivate, setExpandedPrivate] = useState(null);
    const sucPrograms = [
  {
    id: "full-ssp",
    name: "Full-SSP",
    rows: [
      { label: "TOSF", colSpan: 2, value: "Free Higher Education" },
      { label: "Stipend", perSem: "₱35,000.00", perAY: "₱70,000.00" },
      { label: "Book/Connectivity Allowance", perSem: "₱5,000.00", perAY: "₱10,000.00" },
    ],
    total: { perSem: "₱40,000.00", perAY: "₱80,000.00" },
  },
];

const privatePrograms = [
  {
    id: "full-pesfa",
    name: "Full-PESFA",
    rows: [
      { label: "TOSF", perSem: "₱20,000.00", perAY: "₱40,000.00" },
      { label: "Stipend", perSem: "₱35,000.00", perAY: "₱70,000.00" },
      { label: "Book/Connectivity Allowance", perSem: "₱5,000.00", perAY: "₱10,000.00" },
    ],
    total: { perSem: "₱60,000.00", perAY: "₱120,000.00" },
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
                  <tr className="bg-red-100 hover:bg-red-150 transition-colors duration-100 font-bold">
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
          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
              CHED Scholarship for Future Statisticians (Estatistikolar)
            </h1>
            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                The CHED Estatistikolar Program aims to address the shortage of statisticians in the Philippines by supporting qualified students in Statistics programs under CHED’s mandate in RA 7722.
            </p>
          </div>

          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
              Overview
            </h1>
            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                The CHED shall  provide a scholarship to qualified students who will or are enrolled in 1) Bachelor of Science (BS) in Statistics, BS in Applied Statistics, and programs identified by Philippine Statistics Authority (PSA), with Government Recognition (GR) or Certificate of Program Compliance (COPC) 2) Private Higher Education Institutions (PHEIs) with GR or State Universities and Colleges (SUCs) or Local Universities and Colleges (LUCs) with Institutional Recognition (IR).            </p>
          </div>

          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Scope and Coverage
            </h1>
            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                Open to all Filipino college students, regardless of personal background or status. Extra ranking points are given to those belonging to special equity groups—including underprivileged or homeless citizens, PWDs, solo parents, senior citizens, and Indigenous Peoples, as well as first-generation college students. 
            </p>
          </div>

          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Application Process (Eligible Applicant)  
            </h2>
                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Filipino citizen;</li>
                    <li>
                    Graduate of a Senior High School in the Philippines with a minimum GWA of 85% or its equivalent;
                    </li>
                    <li>
                    For second- to fourth-year college students, a minimum GWA of 80% or its equivalent; and
                    </li>
                    <li>
                    Combined annual gross income of parents or legal guardians should not exceed Five Hundred Thousand Pesos (Php500,000.00).
                    </li>
                </ol>
          </div>

            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                    Ineligible Applicant
                </h2>


                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>Foreign students;</li>
                    <li>
                    Applicants who will or are enrolled in priority programs but not granted government recognition or certification by CHED;
                    </li>
                    <li>Applicants who will or are enrolled in a non-priority program;</li>
                    <li>Transferees and Shiftees with credited units as determined by admitting HEIs;</li>
                    <li>
                    An existing recipient of any nationally government-funded scholarships or grants including Tertiary Education Subsidy (TES) or Tulong Dunong Program (TDP).
                    Grantees under the One-time Grants are exempted;
                    </li>
                    <li>Applicants who have completed an undergraduate degree program or are second course takers; or</li>
                    <li>
                    Applicants who submitted tampered and/or falsified application documents, including documentary requirements.
                    </li>
                </ol>

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
            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
                CHEDROs may directly pay scholars under any of the following conditions
            </p>



                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-[lower-alpha] list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>HEI has no Memorandum of Agreement (MOA) Annex J with CHEDRO;</li>
                    <li>HEI has fewer than ten (10) scholars;</li>
                    <li>HEI has unliquidated balances or transferred funds; or</li>
                    <li>HEI has verified StuFAPs-related complaints/issues</li>
                </ol>
  

        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Initial Payment/Requirements            
            </h1>
            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            Payment Type             
            </p>
                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                    <li>
                    Certified true copy of Certificate of Registration/Enrollment (COR/COE) or
                    system-generated registration document signed by registrar/authorized official
                    </li>
                    <li>
                    College ID or any government-issued ID with signature, certification from the school
                    </li>
                    <li>
                    Photocopy of active Landbank ATM card
                    </li>
                </ol>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Succeeding Payment/Requirements
            </h1>
                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
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
                </ol>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Responsibilities of Scholars
            </h1>

                <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                <li>
                    Adhere to the provisions of the scholarship contract (Annex B-2) and other applicable guidelines;
                </li>
                <li>
                    Enroll in BS in Statistics, BS in Applied Statistics programs, or programs identified by PSA offered in PHEIs with GR, SUCs or LUCs with COPC;
                </li>
                <li>
                    Maintain a GWA of at least 80% or its equivalent;
                </li>
                <li>
                    Enroll the required regular academic load based on the curriculum, for each school semester/trimester or term, except when the subjects are the last remaining subjects to complete the degree program;
                </li>
                <li>
                    Complete the degree program within the number of years or period as prescribed in the curriculum;
                </li>
                <li>
                    The scholar must secure a written approval of the concerned CHEDRO using Annex H prior to:
                    <ol className="list-[lower-alpha] list-inside ml-6 space-y-1">
                    <li>Transfer to another HEI;</li>
                    <li>Shift to another recognized or certified priority programs; or</li>
                    <li>
                        Leave of absence (LOA) which is allowed only once for a maximum of one (1) academic year but he/she is not eligible to claim financial benefits while on leave;
                    </li>
                    </ol>
                </li>
                <li>
                    Refund to CHED the total financial benefits received if the scholarship has been terminated based on any grounds enumerated in Section 26;
                </li>
                <li>
                    Exhibit good moral character and comply with the rules and regulations of CHED and HEI;
                </li>
                <li>
                    Inform CHEDRO promptly on any changes in academic status, program, HEI, personal circumstances that may affect the scholarship eligibility;
                </li>
                <li>
                    Submit required reports and documents within the deadline set in this PSG; and
                </li>
                <li>
                    Submit an accomplished graduate exit form using Annex I.
                </li>
                </ol>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Grounds for Termination
            </h1>
    
              <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
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
                  Transfer of HEI that involves a change of scholarship program from: Full-SSP (State Scholarship Program) 
                  to Full-PESFA (Private Education Student Financial Assistance), or vice versa, shall result in the automatic 
                  termination of the scholarship.
                  </li>
              </ol>

        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Appeal
            </h1>

            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
              A scholar may submit a written appeal for reconsideration within seven (7) working days from receipt of the termination notice.
              The appeal must include reasons and supporting documents            
            </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Replacement
            </h1>

            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
              Scholars who fail to confirm their Notice of Award (NOA) within fifteen (15) working days will be 
              replaced by applicants from the Official Ranklist. Terminated scholars may also be replaced by the next eligible applicant with a GWA of at least 85% (Full) or 80% (Half).         
            </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Extension of Scholarship
            </h1>

            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            Scholars who become irregular due to LOA may continue once re-enrolled.
            Extensions beyond the program duration are allowed only for exceptional reasons
            upon CHEDRO approval with documentation.            
            </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Transferee/Shiftee
            </h1>

            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            A scholar who requested to transfer or shift and was
            approved by the CHEDRO can continue their scholarship for the semester even underload,
            provided with certification from the Dean of College on the units the scholar can only take, but
            for the succeeding semester, the scholar must take a regular load, or else the scholar will be
            terminated.           
            </p>
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Refund
            </h1>

            <p className="mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed">
            The total financial grant received under this CMO shall be refunded to CHED if the scholarship has been terminated on the following grounds:         
            </p>


              <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                  <li>Enrollment in non-recognized program of PHEIs or SUCs or non-certified programof LUCs;</li>
                  <li>Enrollment in non-priority programs;</li>
                  <li>Any acts inimical to the government and/or CHED;</li>
                  <li>Prima facie evidence of participation or involvement in hazing related activities.</li>    
              </ol>
     
        </div>

        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
                Procedures for Refund
            </h1>

              <ol className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4 list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                <li>
                  Upon finding of any existence of ground for termination as enumerated in Section
                  26 hereof, a scholar shall, after due process, refund the full amount defrayed by
                  CHED for his/her scholarship under this CMO, within sixty (60) days from notice of
                  the demand letter to refund issued by CHEDRO;
                </li>
                <li>
                  In case of failure of the scholar to make the refund within the period prescribed,
                  the concerned CHEDRO shall make the corresponding report/endorsement on the
                  matter with recommendations to the CEB for its appropriate action;
                </li>
                <li>
                  The obligation to refund on the part of the scholar shall be specified in the NOA
                  (Annex B-1) which is treated as a supplemental scholarship contract for purposes
                  of this CMO
                </li>
              </ol>

        </div>
      </main>

        <footer className="bg-gray-800 text-white text-center py-4">
            <div>
                <p className="text-sm">
                CMO-NO.-14-S.-2025
            </p>
            <p className="text-sm">
                
            © {new Date().getFullYear()} CMO. All rights reserved.
            </p>
            </div>
            
      </footer>
    </div>
  );
}