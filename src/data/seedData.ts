import {
  Company,
  User,
  Job,
  Candidate,
  Application,
  StageHistory,
  EmailTemplate,
  EmailLog,
  DuplicateGroup,
  Notification,
  AuditLog,
} from '@/types'
import { matchScore } from '@/lib/scoring'

export const SEED_COMPANIES: Company[] = [
  {
    id: 'company-nova',
    name: 'Nova Labs Pvt Ltd',
    slug: 'novalabs',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop&q=80',
    industry: 'Software & AI Products',
    settings: {
      scoringWeights: {
        skills: 45,
        experience: 30,
        education: 10,
        semantic: 15,
      },
      pipelineStages: [
        { id: 'applied', name: 'Applied', color: '#2563EB', isDefault: true },
        { id: 'shortlisted', name: 'Shortlisted', color: '#7C3AED' },
        { id: 'interview', name: 'Interview', color: '#F59E0B' },
        { id: 'offer', name: 'Offer', color: '#16A34A', isHired: true },
        { id: 'rejected', name: 'Rejected', color: '#DC2626', isReject: true },
      ],
      customFields: [
        { id: 'cf-ctc', name: 'Expected CTC (LPA)', type: 'number' },
        { id: 'cf-notice', name: 'Notice Period (Days)', type: 'select', options: ['Immediate', '15 Days', '30 Days', '60 Days', '90 Days'] },
        { id: 'cf-remote', name: 'Remote Preference', type: 'select', options: ['Remote Only', 'Hybrid', 'In-Office'] },
      ],
      skillSynonyms: {
        'JavaScript': ['JS', 'ES6', 'ECMAScript'],
        'React': ['ReactJS', 'React.js', 'React 18'],
        'Node.js': ['Node', 'NodeJS', 'Express'],
        'Machine Learning': ['ML', 'Deep Learning', 'Data Science', 'AI'],
        'Python': ['Py', 'Python3'],
        'Kubernetes': ['K8s'],
        'AWS': ['Amazon Web Services', 'Cloud Computing'],
        'TypeScript': ['TS'],
        'PostgreSQL': ['Postgres', 'PSQL', 'SQL'],
      },
      blindMode: false,
      hiddenFields: ['photo', 'gender'],
      retentionDays: 180,
      learnFromDecisions: true,
    },
  },
  {
    id: 'company-campus',
    name: 'Campus Hire Co',
    slug: 'campushire',
    logo: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=100&h=100&fit=crop&q=80',
    industry: 'University Talent Acquisition',
    settings: {
      scoringWeights: {
        skills: 25,
        experience: 5,
        education: 55,
        semantic: 15,
      },
      pipelineStages: [
        { id: 'applied', name: 'Applied', color: '#2563EB', isDefault: true },
        { id: 'oa', name: 'Online Assessment', color: '#3B82F6' },
        { id: 'shortlisted', name: 'Shortlisted', color: '#7C3AED' },
        { id: 'interview', name: 'Technical Round', color: '#F59E0B' },
        { id: 'offer', name: 'Offer', color: '#16A34A', isHired: true },
        { id: 'rejected', name: 'Rejected', color: '#DC2626', isReject: true },
      ],
      customFields: [
        { id: 'cf-tier', name: 'College Tier', type: 'select', options: ['Tier-1', 'Tier-2', 'Tier-3'] },
        { id: 'cf-backlogs', name: 'Active Backlogs', type: 'number' },
        { id: 'cf-relocate', name: 'Willing to Relocate', type: 'boolean' },
      ],
      skillSynonyms: {
        'Java': ['Core Java', 'J2EE', 'Spring'],
        'Python': ['Python 3', 'Python Programming'],
        'Data Structures': ['DSA', 'Algorithms', 'Problem Solving'],
        'SQL': ['MySQL', 'RDBMS', 'PostgreSQL'],
        'C++': ['CPP', 'C/C++'],
      },
      blindMode: false,
      hiddenFields: ['name', 'photo', 'gender', 'college'],
      retentionDays: 365,
      learnFromDecisions: false,
    },
  },
]

export const SEED_USERS: User[] = [
  // Nova Labs Users
  {
    id: 'user-nova-admin',
    companyId: 'company-nova',
    name: 'Vikram Mehta',
    email: 'admin@novalabs.com',
    role: 'Admin',
    avatarColor: 'bg-indigo-600',
  },
  {
    id: 'user-nova-recruiter',
    companyId: 'company-nova',
    name: 'Anjali Sharma',
    email: 'recruiter@novalabs.com',
    role: 'Recruiter',
    avatarColor: 'bg-teal-600',
  },
  {
    id: 'user-nova-hm',
    companyId: 'company-nova',
    name: 'Rahul Sen',
    email: 'hiring@novalabs.com',
    role: 'HiringManager',
    avatarColor: 'bg-amber-600',
  },
  {
    id: 'user-nova-viewer',
    companyId: 'company-nova',
    name: 'Deepa Rao',
    email: 'viewer@novalabs.com',
    role: 'Viewer',
    avatarColor: 'bg-rose-600',
  },

  // Campus Hire Co Users
  {
    id: 'user-campus-admin',
    companyId: 'company-campus',
    name: 'Dr. Suresh Pillai',
    email: 'admin@campushire.com',
    role: 'Admin',
    avatarColor: 'bg-blue-600',
  },
  {
    id: 'user-campus-recruiter',
    companyId: 'company-campus',
    name: 'Pooja Kulkarni',
    email: 'recruiter@campushire.com',
    role: 'Recruiter',
    avatarColor: 'bg-purple-600',
  },
]

export const SEED_JOBS: Job[] = [
  // Nova Labs Jobs
  {
    id: 'job-nova-1',
    companyId: 'company-nova',
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    location: 'Bengaluru, India (Hybrid)',
    type: 'Full-time',
    jdText: `We are looking for a Senior Full Stack Engineer with 3+ years of experience building modern web apps.
You will architect reliable microservices and sleek user interfaces using React, TypeScript, Node.js, and PostgreSQL.
Required: React, TypeScript, Node.js, PostgreSQL, AWS. Preferred: Docker, Kubernetes, Redis, GraphQL, Next.js.
Must have deep understanding of RESTful APIs, distributed caching, and CI/CD pipelines.`,
    requirements: {
      requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
      preferredSkills: ['Docker', 'Kubernetes', 'Redis', 'GraphQL'],
      minExperience: 3,
      minCgpa: 7.0,
      gradYears: [2018, 2019, 2020, 2021, 2022],
      minTenth: 70,
      minTwelfth: 70,
    },
    status: 'Active',
    createdAt: '2026-10-15T10:00:00Z',
  },
  {
    id: 'job-nova-2',
    companyId: 'company-nova',
    title: 'Machine Learning / AI Engineer',
    department: 'Data & AI',
    location: 'Remote, India',
    type: 'Full-time',
    jdText: `Nova Labs is seeking an AI/ML Engineer to train LLMs and deploy production AI pipelines.
Hands-on expertise in Python, PyTorch, Machine Learning, Docker, and FastAPI required.
Preferred skills include LangChain, Vector Databases, Hugging Face, Kubernetes, and AWS SageMaker.
Candidate should have experience deploying models to production with latency under 100ms.`,
    requirements: {
      requiredSkills: ['Python', 'Machine Learning', 'PyTorch', 'Docker', 'FastAPI'],
      preferredSkills: ['Kubernetes', 'AWS', 'NLP', 'Vector Databases'],
      minExperience: 2,
      minCgpa: 7.5,
      gradYears: [2019, 2020, 2021, 2022, 2023, 2024],
      minTenth: 75,
      minTwelfth: 75,
    },
    status: 'Active',
    createdAt: '2026-10-20T11:00:00Z',
  },
  {
    id: 'job-nova-3',
    companyId: 'company-nova',
    title: 'Frontend Developer (React / UI)',
    department: 'Design & Frontend',
    location: 'Pune, India',
    type: 'Full-time',
    jdText: `We need a creative Frontend Developer proficient with React, Tailwind CSS, TypeScript, and state management.
Experience with design systems, Framer Motion, and web performance optimization is highly valued.
Requirements: React, Tailwind CSS, TypeScript, HTML/CSS. Preferred: Figma, Next.js, Jest, Vite.`,
    requirements: {
      requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'JavaScript'],
      preferredSkills: ['Figma', 'Next.js', 'Redux', 'Jest'],
      minExperience: 1,
      minCgpa: 6.5,
      gradYears: [2021, 2022, 2023, 2024, 2025],
      minTenth: 65,
      minTwelfth: 65,
    },
    status: 'Active',
    createdAt: '2026-11-01T09:30:00Z',
  },
  {
    id: 'job-nova-4',
    companyId: 'company-nova',
    title: 'Cloud DevOps & Site Reliability Engineer',
    department: 'Infrastructure',
    location: 'Hyderabad, India (Hybrid)',
    type: 'Full-time',
    jdText: `Looking for a DevOps / SRE engineer to automate infrastructure, manage Kubernetes clusters, and maintain 99.99% uptime.
Required skills: AWS, Docker, Kubernetes, Terraform, CI/CD, Linux.
Preferred: Prometheus, Grafana, Ansible, Python scripting.`,
    requirements: {
      requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
      preferredSkills: ['Linux', 'Python', 'Prometheus', 'Ansible'],
      minExperience: 2.5,
      minCgpa: 6.5,
      gradYears: [2019, 2020, 2021, 2022, 2023],
    },
    status: 'Active',
    createdAt: '2026-11-05T14:15:00Z',
  },

  // Campus Hire Co Jobs
  {
    id: 'job-campus-1',
    companyId: 'company-campus',
    title: 'Graduate Software Engineer Trainee (Batch 2025)',
    department: 'Engineering Campuses',
    location: 'Delhi NCR, India',
    type: 'Full-time',
    jdText: `Campus recruitment drive for 2025 batch engineering graduates!
Rigorous academic record with minimum 7.5 CGPA required. Strong foundation in Data Structures, Algorithms,
Object-Oriented Programming in Java or C++, and relational databases (SQL).
Required: Java, Data Structures, SQL, Problem Solving. Preferred: Python, Spring Boot, Git, Web Basics.`,
    requirements: {
      requiredSkills: ['Java', 'Data Structures', 'SQL', 'Python'],
      preferredSkills: ['Spring Boot', 'Git', 'Linux'],
      minExperience: 0,
      minCgpa: 7.5,
      gradYears: [2024, 2025],
      minTenth: 80,
      minTwelfth: 80,
    },
    status: 'Active',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'job-campus-2',
    companyId: 'company-campus',
    title: 'Associate Data & Analytics Intern',
    department: 'Analytics',
    location: 'Bengaluru, India',
    type: 'Internship',
    jdText: `Internship opportunity for pre-final and final year students with strong analytical skills.
You will extract insights from transactional logs, build SQL queries, and visualize trends in PowerBI/Excel.
Required: SQL, Python, Excel, Statistics. Preferred: Tableau, PowerBI, Pandas, R.`,
    requirements: {
      requiredSkills: ['SQL', 'Python', 'Excel', 'Data Structures'],
      preferredSkills: ['PowerBI', 'Tableau', 'Pandas'],
      minExperience: 0,
      minCgpa: 7.0,
      gradYears: [2025, 2026],
      minTenth: 75,
      minTwelfth: 75,
    },
    status: 'Active',
    createdAt: '2026-09-15T10:00:00Z',
  },
  {
    id: 'job-campus-3',
    companyId: 'company-campus',
    title: 'Junior QA & Automation Tester',
    department: 'Quality Assurance',
    location: 'Chennai, India',
    type: 'Full-time',
    jdText: `Looking for detail-oriented freshers interested in QA automation, manual testing, and test suites.
Requires knowledge of Java or Python, Selenium WebDriver basics, and SQL.
Required: Java, Selenium, SQL. Preferred: API Testing, Postman, JIRA.`,
    requirements: {
      requiredSkills: ['Java', 'Selenium', 'SQL'],
      preferredSkills: ['Python', 'Postman', 'Git'],
      minExperience: 0,
      minCgpa: 6.8,
      gradYears: [2024, 2025],
      minTenth: 70,
      minTwelfth: 70,
    },
    status: 'Active',
    createdAt: '2026-10-01T12:00:00Z',
  },
]

// Data helpers for generating 65+ candidates per company
const INDIAN_FIRST_NAMES = [
  'Aarav', 'Aditya', 'Akash', 'Amit', 'Ananya', 'Anik', 'Anjali', 'Arjun', 'Arnav', 'Ayush',
  'Deepak', 'Divya', 'Gaurav', 'Harish', 'Isha', 'Kavya', 'Karan', 'Manish', 'Megha', 'Naveen',
  'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya', 'Rahul', 'Rishabh', 'Riya', 'Rohan', 'Rohit',
  'Sahil', 'Sakshi', 'Sameer', 'Sanjay', 'Shreya', 'Siddharth', 'Sneha', 'Sourabh', 'Suresh', 'Tanvi',
  'Tarun', 'Utkarsh', 'Varun', 'Vikas', 'Vikram', 'Vinay', 'Yash', 'Zoya', 'Kunal', 'Simran'
]

const INDIAN_LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Iyer', 'Malhotra', 'Gupta', 'Nair', 'Deshmukh', 'Reddy', 'Chopra',
  'Banerjee', 'Chatterjee', 'Mishra', 'Pandey', 'Bhatia', 'Saxena', 'Mehta', 'Kulkarni', 'Joshi', 'Aggarwal',
  'Singh', 'Kumar', 'Kapoor', 'Menon', 'Pillai', 'Rao', 'Gowda', 'Sen', 'Dutta', 'Bose'
]

const INDIAN_COLLEGES = [
  { name: 'IIT Delhi', tier: 'Tier-1' },
  { name: 'IIT Bombay', tier: 'Tier-1' },
  { name: 'BITS Pilani', tier: 'Tier-1' },
  { name: 'NIT Trichy', tier: 'Tier-1' },
  { name: 'IIIT Hyderabad', tier: 'Tier-1' },
  { name: 'DTU (Delhi Technological University)', tier: 'Tier-1' },
  { name: 'VIT Vellore', tier: 'Tier-2' },
  { name: 'Manipal Institute of Technology', tier: 'Tier-2' },
  { name: 'Thapar Institute of Engineering', tier: 'Tier-2' },
  { name: 'RV College of Engineering, Bengaluru', tier: 'Tier-2' },
  { name: 'SRM Institute of Science and Technology', tier: 'Tier-2' },
  { name: 'PSG College of Technology', tier: 'Tier-2' },
  { name: 'Pune Institute of Computer Technology (PICT)', tier: 'Tier-2' },
  { name: 'Amity University, Noida', tier: 'Tier-3' },
  { name: 'Chandigarh University', tier: 'Tier-3' },
  { name: 'PES University, Bengaluru', tier: 'Tier-2' },
  { name: 'KIIT University, Bhubaneswar', tier: 'Tier-3' },
]

const INDIAN_CITIES = ['Bengaluru', 'Delhi NCR', 'Pune', 'Hyderabad', 'Chennai', 'Mumbai', 'Remote']

const ALL_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Python', 'Machine Learning', 'PyTorch',
  'Docker', 'FastAPI', 'Kubernetes', 'Redis', 'GraphQL', 'Tailwind CSS', 'JavaScript', 'HTML/CSS',
  'Terraform', 'CI/CD', 'Linux', 'Java', 'Data Structures', 'SQL', 'Spring Boot', 'Git',
  'Excel', 'PowerBI', 'Selenium', 'MongoDB', 'Next.js', 'Figma'
]

export function generateSeedCandidatesAndApplications(): {
  candidates: Candidate[];
  applications: Application[];
  stageHistories: StageHistory[];
  duplicateGroups: DuplicateGroup[];
} {
  const candidates: Candidate[] = []
  const applications: Application[] = []
  const stageHistories: StageHistory[] = []
  const duplicateGroups: DuplicateGroup[] = []

  let candCounter = 1

  // Generate candidates for Nova Labs (65 candidates)
  const novaCompany = SEED_COMPANIES[0]
  const novaJobs = SEED_JOBS.filter((j) => j.companyId === novaCompany.id)

  for (let i = 0; i < 65; i++) {
    const firstName = INDIAN_FIRST_NAMES[i % INDIAN_FIRST_NAMES.length]
    const lastName = INDIAN_LAST_NAMES[(i * 3) % INDIAN_LAST_NAMES.length]
    const name = `${firstName} ${lastName}`
    const collegeObj = INDIAN_COLLEGES[i % INDIAN_COLLEGES.length]
    const location = INDIAN_CITIES[i % INDIAN_CITIES.length]
    const id = `cand-nova-${candCounter++}`

    // Varied experience: freshers to 7 years
    const expYears = (i % 8) * 0.8 + (i % 2 === 0 ? 1 : 0)
    const roundedExp = Math.round(expYears * 10) / 10
    const gradYear = 2025 - Math.floor(roundedExp)
    const cgpa = Math.round((6.8 + ((i * 7) % 31) / 10) * 10) / 10 // 6.8 to 9.8
    const tenth = 72 + ((i * 13) % 26) // 72 to 97
    const twelfth = 70 + ((i * 11) % 28) // 70 to 97

    // Pick 4 to 8 skills tailored towards modern tech
    const skillCount = 4 + (i % 5)
    const candSkills: string[] = []
    for (let s = 0; s < skillCount; s++) {
      const skill = ALL_SKILLS[(i + s * 4) % ALL_SKILLS.length]
      if (!candSkills.includes(skill)) candSkills.push(skill)
    }

    const isLowConfidence = i === 12 || i === 28 || i === 47
    const parseConfidence = isLowConfidence ? 52 : Math.min(99, 82 + (i % 17))

    const resumeFileName = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_resume.pdf`
    const resumeText = `${name}
Email: ${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com | Phone: +91 98${(10000000 + i * 2345).toString().slice(0, 8)}
Education: B.Tech in Computer Science from ${collegeObj.name}, Graduated ${gradYear}. CGPA: ${cgpa}/10.
10th Grade: ${tenth}%, 12th Grade: ${twelfth}%.
Technical Skills: ${candSkills.join(', ')}.
Summary: Experienced software engineer with ${roundedExp} years in software architecture, cloud platforms, and full-stack development.
Work History: Software Engineer at Infosys / Tech Mahindra (${gradYear} - Present). Built high-throughput microservices and responsive frontends.
Projects: Developed scalable distributed dashboard with ${candSkills.slice(0, 2).join(' and ')}.`

    const candidate: Candidate = {
      id,
      companyId: novaCompany.id,
      name,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `+91 98${(10000000 + i * 2345).toString().slice(0, 8)}`,
      location,
      college: collegeObj.name,
      degree: 'B.Tech',
      branch: i % 3 === 0 ? 'Computer Science' : i % 3 === 1 ? 'Information Technology' : 'Electronics & Comm.',
      gradYear,
      tenthPercent: tenth,
      twelfthPercent: twelfth,
      cgpa,
      skills: candSkills,
      experienceYears: roundedExp,
      experience: roundedExp > 0 ? [
        {
          title: roundedExp > 3 ? 'Senior Software Engineer' : 'Software Engineer',
          company: i % 2 === 0 ? 'Razorpay' : 'Swiggy Tech',
          duration: `${roundedExp} years`,
          description: `Engineered core platform services handling 10k+ requests/min using ${candSkills.slice(0, 3).join(', ')}.`,
        }
      ] : [],
      projects: [
        {
          title: `${candSkills[0] || 'Cloud'} Analytics Hub`,
          description: `Built end-to-end data processing workflow and real-time visualization with ${candSkills.slice(0, 3).join(', ')}.`,
          technologies: candSkills.slice(0, 3),
        }
      ],
      certifications: i % 2 === 0 ? ['AWS Certified Solutions Architect', 'CKA Kubernetes'] : ['Oracle Certified Java Developer'],
      resumeText,
      resumeFileName,
      parseConfidence,
      fieldConfidence: {
        name: isLowConfidence ? 60 : 95,
        email: 98,
        phone: 92,
        college: isLowConfidence ? 55 : 90,
        cgpa: isLowConfidence ? 50 : 94,
        skills: 88,
      },
      source: i % 4 === 0 ? 'LinkedIn' : i % 4 === 1 ? 'Career Page' : i % 4 === 2 ? 'Referral' : 'Naukri',
      createdAt: new Date(Date.now() - (65 - i) * 86400000).toISOString(),
      customFields: {
        'cf-ctc': roundedExp > 0 ? Math.round((roundedExp * 3.5 + 6) * 10) / 10 : 6,
        'cf-notice': i % 3 === 0 ? 'Immediate' : i % 3 === 1 ? '30 Days' : '15 Days',
        'cf-remote': i % 2 === 0 ? 'Hybrid' : 'Remote Only',
      },
      gender: i % 2 === 0 ? 'Male' : 'Female',
      tier: collegeObj.tier as 'Tier-1' | 'Tier-2' | 'Tier-3',
    }

    candidates.push(candidate)

    // Assign application to a job
    const targetJob = novaJobs[i % novaJobs.length]
    const match = matchScore(candidate, targetJob, novaCompany.settings.scoringWeights, novaCompany.settings.skillSynonyms)

    // Distribute stages realistically
    let stage = 'applied'
    if (match.score >= 85) stage = i % 4 === 0 ? 'offer' : 'interview'
    else if (match.score >= 70) stage = i % 3 === 0 ? 'interview' : 'shortlisted'
    else if (match.score < 50) stage = 'rejected'

    const appId = `app-nova-${i + 1}`
    const application: Application = {
      id: appId,
      companyId: novaCompany.id,
      jobId: targetJob.id,
      candidateId: candidate.id,
      stage,
      matchScore: match.score,
      breakdown: match.breakdown,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      explanation: match.explanation,
      evidenceSnippets: match.evidenceSnippets,
      notes: [
        {
          id: `note-${appId}`,
          authorName: 'Vikram Mehta',
          text: `Automated resume parsed. Match score: ${match.score}%. Verified skills: ${match.matchedSkills.slice(0, 3).join(', ')}.`,
          createdAt: candidate.createdAt,
        }
      ],
      createdAt: candidate.createdAt,
    }
    applications.push(application)

    stageHistories.push({
      id: `hist-${appId}`,
      applicationId: appId,
      from: 'applied',
      to: stage,
      byUserId: 'user-nova-admin',
      byUserName: 'Vikram Mehta',
      at: candidate.createdAt,
      reason: stage === 'rejected' ? 'Did not meet technical threshold' : undefined,
    })
  }

  // 3 Intentional Duplicate Pairs in Nova Labs
  // Pair 1: Same email and phone, slightly varied name
  const dup1a = candidates[2]
  const dup1b: Candidate = {
    ...dup1a,
    id: `cand-nova-${candCounter++}`,
    name: dup1a.name.split(' ')[0] + ' ' + dup1a.name.split(' ')[1].charAt(0) + '.',
    resumeFileName: `${dup1a.name.split(' ')[0]}_updated_cv.pdf`,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    experienceYears: dup1a.experienceYears + 0.5,
  }
  candidates.push(dup1b)
  duplicateGroups.push({
    id: 'dup-nova-1',
    companyId: novaCompany.id,
    candidateIds: [dup1a.id, dup1b.id],
    similarity: 95,
    matchingSignals: ['Identical email address', 'Identical phone number', 'Same college & graduation batch'],
    status: 'Pending',
  })

  // Pair 2: Similar name and same phone, different email (personal vs work)
  const dup2a = candidates[7]
  const dup2b: Candidate = {
    ...dup2a,
    id: `cand-nova-${candCounter++}`,
    email: `${dup2a.name.toLowerCase().replace(' ', '')}@gmail.com`,
    resumeFileName: `cv_latest_${dup2a.name.split(' ')[0]}.docx`,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  }
  candidates.push(dup2b)
  duplicateGroups.push({
    id: 'dup-nova-2',
    companyId: novaCompany.id,
    candidateIds: [dup2a.id, dup2b.id],
    similarity: 88,
    matchingSignals: ['Matching phone number', 'Similar candidate name', 'Matching education history'],
    status: 'Pending',
  })

  // Pair 3: Exact same candidate applying to two different jobs
  const dup3a = candidates[15]
  const dup3b: Candidate = {
    ...dup3a,
    id: `cand-nova-${candCounter++}`,
    resumeFileName: `resume_2026_${dup3a.name.split(' ')[0]}.pdf`,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  }
  candidates.push(dup3b)
  duplicateGroups.push({
    id: 'dup-nova-3',
    companyId: novaCompany.id,
    candidateIds: [dup3a.id, dup3b.id],
    similarity: 98,
    matchingSignals: ['Identical email address', 'Identical phone number', 'Exact name match'],
    status: 'Pending',
  })

  // Generate candidates for Campus Hire Co (65 candidates, fresher focused)
  const campusCompany = SEED_COMPANIES[1]
  const campusJobs = SEED_JOBS.filter((j) => j.companyId === campusCompany.id)

  for (let i = 0; i < 65; i++) {
    const firstName = INDIAN_FIRST_NAMES[(i + 15) % INDIAN_FIRST_NAMES.length]
    const lastName = INDIAN_LAST_NAMES[(i * 2 + 5) % INDIAN_LAST_NAMES.length]
    const name = `${firstName} ${lastName}`
    const collegeObj = INDIAN_COLLEGES[(i + 4) % INDIAN_COLLEGES.length]
    const location = INDIAN_CITIES[(i + 2) % INDIAN_CITIES.length]
    const id = `cand-campus-${candCounter++}`

    // Campus freshers (0 exp, gradYear 2024 or 2025)
    const expYears = 0
    const gradYear = 2025 - (i % 2)
    const cgpa = Math.round((7.0 + ((i * 9) % 29) / 10) * 10) / 10 // 7.0 to 9.8
    const tenth = 78 + ((i * 7) % 21) // 78 to 98
    const twelfth = 76 + ((i * 9) % 23) // 76 to 98

    // Skills for freshers
    const candSkills = ['Java', 'Data Structures', 'SQL']
    if (i % 2 === 0) candSkills.push('Python')
    if (i % 3 === 0) candSkills.push('C++')
    if (i % 4 === 0) candSkills.push('Spring Boot')
    if (i % 5 === 0) candSkills.push('Selenium')
    if (i % 2 !== 0) candSkills.push('Excel', 'PowerBI')

    const isLowConfidence = i === 10 || i === 33
    const parseConfidence = isLowConfidence ? 54 : Math.min(99, 85 + (i % 15))

    const resumeFileName = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_campus.pdf`
    const resumeText = `${name}
Email: ${firstName.toLowerCase()}.${lastName.toLowerCase()}@college.edu | Phone: +91 97${(20000000 + i * 1892).toString().slice(0, 8)}
Education: B.Tech Computer Science from ${collegeObj.name}, Graduating ${gradYear}.
Academic Performance: CGPA: ${cgpa}/10, Class 10th: ${tenth}%, Class 12th: ${twelfth}%.
Key Skills: ${candSkills.join(', ')}.
Academic Projects: Built College Portal and Attendance Automation using ${candSkills.slice(0, 2).join(' & ')}.
Competitive Programming: 300+ LeetCode problems solved.`

    const candidate: Candidate = {
      id,
      companyId: campusCompany.id,
      name,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@college.edu`,
      phone: `+91 97${(20000000 + i * 1892).toString().slice(0, 8)}`,
      location,
      college: collegeObj.name,
      degree: 'B.Tech',
      branch: 'Computer Science and Engineering',
      gradYear,
      tenthPercent: tenth,
      twelfthPercent: twelfth,
      cgpa,
      skills: candSkills,
      experienceYears: expYears,
      experience: [],
      projects: [
        {
          title: 'Algorithmic Problem Solving & Student DBMS',
          description: `Designed relational schema in MySQL and built optimization algorithms in Java/Python.`,
          technologies: candSkills.slice(0, 3),
        }
      ],
      certifications: ['HackerRank 5 Star Problem Solving', 'NPTEL Java Certification'],
      resumeText,
      resumeFileName,
      parseConfidence,
      fieldConfidence: {
        name: isLowConfidence ? 58 : 96,
        email: 98,
        phone: 94,
        college: isLowConfidence ? 52 : 92,
        cgpa: 95,
        skills: 89,
      },
      source: i % 3 === 0 ? 'Campus Drive' : i % 3 === 1 ? 'College Placement Cell' : 'Online Application',
      createdAt: new Date(Date.now() - (65 - i) * 72000000).toISOString(),
      customFields: {
        'cf-tier': collegeObj.tier,
        'cf-backlogs': i % 10 === 0 ? 1 : 0,
        'cf-relocate': true,
      },
      gender: i % 2 === 0 ? 'Male' : 'Female',
      tier: collegeObj.tier as 'Tier-1' | 'Tier-2' | 'Tier-3',
    }

    candidates.push(candidate)

    const targetJob = campusJobs[i % campusJobs.length]
    const match = matchScore(candidate, targetJob, campusCompany.settings.scoringWeights, campusCompany.settings.skillSynonyms)

    let stage = 'applied'
    if (match.score >= 82) stage = i % 3 === 0 ? 'offer' : 'interview'
    else if (match.score >= 68) stage = 'shortlisted'
    else if (match.score < 50) stage = 'rejected'

    const appId = `app-campus-${i + 1}`
    const application: Application = {
      id: appId,
      companyId: campusCompany.id,
      jobId: targetJob.id,
      candidateId: candidate.id,
      stage,
      matchScore: match.score,
      breakdown: match.breakdown,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      explanation: match.explanation,
      evidenceSnippets: match.evidenceSnippets,
      notes: [],
      createdAt: candidate.createdAt,
    }
    applications.push(application)

    stageHistories.push({
      id: `hist-${appId}`,
      applicationId: appId,
      from: 'applied',
      to: stage,
      byUserId: 'user-campus-admin',
      byUserName: 'Dr. Suresh Pillai',
      at: candidate.createdAt,
      reason: stage === 'rejected' ? 'Academic eligibility cut-off not met' : undefined,
    })
  }

  // 3 Intentional Duplicate Pairs in Campus Hire Co
  const dupC1a = candidates[70]
  const dupC1b: Candidate = {
    ...dupC1a,
    id: `cand-campus-${candCounter++}`,
    name: dupC1a.name + ' (Updated)',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  }
  candidates.push(dupC1b)
  duplicateGroups.push({
    id: 'dup-campus-1',
    companyId: campusCompany.id,
    candidateIds: [dupC1a.id, dupC1b.id],
    similarity: 96,
    matchingSignals: ['Identical college email', 'Matching phone', 'Same college & roll number'],
    status: 'Pending',
  })

  const dupC2a = candidates[75]
  const dupC2b: Candidate = {
    ...dupC2a,
    id: `cand-campus-${candCounter++}`,
    email: dupC2a.email.replace('@college.edu', '@gmail.com'),
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  }
  candidates.push(dupC2b)
  duplicateGroups.push({
    id: 'dup-campus-2',
    companyId: campusCompany.id,
    candidateIds: [dupC2a.id, dupC2b.id],
    similarity: 90,
    matchingSignals: ['Identical phone number', 'Same candidate name', 'Same 10th & 12th marks'],
    status: 'Pending',
  })

  const dupC3a = candidates[82]
  const dupC3b: Candidate = {
    ...dupC3a,
    id: `cand-campus-${candCounter++}`,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  }
  candidates.push(dupC3b)
  duplicateGroups.push({
    id: 'dup-campus-3',
    companyId: campusCompany.id,
    candidateIds: [dupC3a.id, dupC3b.id],
    similarity: 99,
    matchingSignals: ['Identical email', 'Identical phone', 'Identical resume text'],
    status: 'Pending',
  })

  return { candidates, applications, stageHistories, duplicateGroups }
}

export const SEED_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-1',
    companyId: 'company-nova',
    name: 'Shortlist Invitation',
    type: 'Shortlist',
    subject: 'Update on your application for {{job_title}} at {{company_name}}',
    body: `Hi {{candidate_name}},

Thank you for applying to {{company_name}}. We reviewed your profile and were impressed by your background.
We would love to invite you to the next round of our hiring process for {{job_title}}.

Our talent acquisition team will reach out shortly with scheduling details.

Best regards,
The {{company_name}} Talent Team`,
  },
  {
    id: 'tpl-2',
    companyId: 'company-nova',
    name: 'Technical Interview Invitation',
    type: 'Interview',
    subject: 'Interview Schedule: {{job_title}} with {{company_name}}',
    body: `Hi {{candidate_name}},

We are pleased to invite you to a technical interview for the {{job_title}} role on {{interview_date}}.
The session will last approximately 45 minutes and cover system design and architecture.

Please confirm if this time works for you.

Warm regards,
{{company_name}} Engineering`,
  },
  {
    id: 'tpl-3',
    companyId: 'company-nova',
    name: 'Rejection Notification (Empathetic)',
    type: 'Rejection',
    subject: 'Application status: {{job_title}} at {{company_name}}',
    body: `Dear {{candidate_name}},

Thank you for taking the time to speak with us about the {{job_title}} position at {{company_name}}.
After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.

We were genuinely impressed with your achievements and will keep your profile on file for future openings.

Sincerely,
{{company_name}} Recruitment`,
  },
  {
    id: 'tpl-4',
    companyId: 'company-campus',
    name: 'Online Assessment Link',
    type: 'Shortlist',
    subject: 'Campus Hiring Drive: Online Coding Assessment for {{candidate_name}}',
    body: `Dear {{candidate_name}},

Congratulations! Based on your academic record at {{company_name}} campus drive, you have been shortlisted for the Online Coding Assessment for {{job_title}}.
Please complete the test before {{interview_date}}.

Good luck!
Campus Recruitment Cell`,
  },
]

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    companyId: 'company-nova',
    title: '3 Potential Duplicates Detected',
    message: 'High similarity detected across recent applicant submissions. Review now in Duplicates.',
    type: 'warning',
    read: false,
    link: '/app/duplicates',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    companyId: 'company-nova',
    title: 'Low Confidence Resumes Flagged',
    message: '3 parsed candidates have confidence scores below 60%. Please review extracted fields.',
    type: 'info',
    read: false,
    link: '/app/upload',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'notif-3',
    companyId: 'company-campus',
    title: 'Batch Online Assessment Completed',
    message: '42 candidates completed the 2025 assessment round.',
    type: 'success',
    read: false,
    link: '/app/candidates',
    createdAt: new Date().toISOString(),
  },
]

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    companyId: 'company-nova',
    action: 'Changed Scoring Weights',
    actorName: 'Vikram Mehta (Admin)',
    details: 'Increased Skills weight to 45% and reduced Education weight to 10%',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'audit-2',
    companyId: 'company-nova',
    action: 'Bulk Stage Migration',
    actorName: 'Anjali Sharma (Recruiter)',
    details: 'Moved 8 candidates from Applied to Shortlisted',
    timestamp: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'audit-3',
    companyId: 'company-campus',
    action: 'Updated Hard Eligibility Filter',
    actorName: 'Dr. Suresh Pillai (Admin)',
    details: 'Set minimum CGPA cut-off to 7.5 for Graduate Engineer Trainee',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
]
