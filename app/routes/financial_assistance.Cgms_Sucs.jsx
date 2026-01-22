import { Link } from "react-router";
import { useState } from "react";

export default function cgms_sucs() {
  return (
    <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-700">
            Cash Grant to Medical Students Enrolled in State Universities and Colleges (CGMS-SUCs)
            </h1>

            <div className="mt-8">
                <div className="border-4 border-gray-700 rounded-lg shadow-lg overflow-hidden">
                    <table className="w-full border-collapse">
                    <tbody>
                        <tr className="hover:bg-gray-100 transition-colors">
                            <td
                                colSpan={2}
                                className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle text-center w-24"
                            >
                                CASH GRANT TO MEDICAL STUDENTS ENROLLED IN STATE UNIVERSITIES AND COLLEGES (CGMS-SUCs)
                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                                WHAT
                            </td>
                            <td className="px-6 py-4 border border-gray-500">
                                <p className="text-gray-700 leading-relaxed">
                                The Implementing Guidelines for the Cash Grants to Medical students enrolled In State Universities and Colleges (CGMS-SUCs) are jointly issued by the Commission on Higher Education (CHED) and the Department of Budget and Management (DBM), aims to provide tuition fee subsidy and financial assistance to all medical students enrolled in identified SUCs offering Doctor of Medicine Program.
                                </p>
                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                                WHO
                            </td>
                            <td className="px-6 py-4 border border-gray-500">

                                <p className="font-bold text-gray-700 leading-relaxed">
                                    Who may apply?                                
                                </p>   

                                <p className="text-gray-700 leading-relaxed">
                                    The program is intended for all Filipino medical students, both new and continuing, who are enrolled in the Doctor of Medicine Program in the following SUCs:
                                </p>   

                                <ol className="list-decimal list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
                                    <li>Bicol University – Daraga, Albay</li>
                                    <li>Cagayan State University – Carig, Tuguegarao City, Cagayan</li>
                                    <li>Mariano Marcos State University – Quiling Sur, City of Batac, Ilocos Norte</li>
                                    <li>Mindanao State University – Marawi City, Lanao Del Sur</li>
                                    <li>University of Northern Philippines – Tamag, Vigan City, Ilocos Sur</li>
                                    <li>University of the Philippines Manila College of Medicine – Pedro Gil, Manila</li>
                                    <li>University of the Philippines Manila School of Health Sciences – Palo, Leyte</li>
                                    <li>West Visayas State University – Luna Street, La Paz, Iloilo City</li>
                                </ol> 

                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                                WHERE
                            </td>
                            <td className="px-6 py-4 border border-gray-500">
                                <p className="font-bold text-gray-700 leading-relaxed mb-1">
                                Where to secure file application?
                                </p>
                                <p className="text-gray-700 leading-relaxed mb-4">
                                Participating SUCs offering Doctor of Medicine programs
                                </p>
                                <p className="font-bold text-gray-700 leading-relaxed mb-1">
                                Where and how to file the application?
                                </p>
                                <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
                                <li>
                                    Applicant submits the accomplished CGMS-SUCs Application Form (Annex “A”) directly to the SUC concerned together with the required documents before the start of academic year applied
                                </li>
                                <li>SUC evaluates the documents of applicants</li>
                                <li>SUC issues Notice of Award (NOA) using Annex “B”</li>
                                <li>Applicant accepts NOA</li>
                                </ul>
                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td className="px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                                WHO
                            </td>
                            <td className="px-6 py-4 border border-gray-500">

                                <p className="font-bold text-gray-700 leading-relaxed">
                                    Schedule of application:                               
                                </p>   

                                <p className="text-gray-700 leading-relaxed">
                                    Before the start of Academic Year (AY) applied
                                </p> 
                            </td>
                        </tr>

                        <tr className="hover:bg-gray-100 transition-colors">
                            <td colSpan={2} className="text-center px-6 py-4 font-bold text-red-700 bg-gray-50 border border-gray-500 align-middle w-24">
                               <p>
                                    For queries, call (02) 8988-0001 or email osds-lsad@ched.gov.ph
                               </p>
                            </td>

                        </tr>
                        
                    </tbody>
                    </table>
                </div>
            </div>


            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4">
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-700 mb-4">
                    CGMS-SUCs Reference Materials
                </h2>
                <ul className="list-disc list-inside text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed space-y-2">
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
                </div>


        </div>
    </div>
  );
}
