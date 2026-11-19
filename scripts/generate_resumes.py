import os
import csv

RESUMES_DIR = r"c:\Users\DELL\HireSwift\test-data\resumes"
os.makedirs(RESUMES_DIR, exist_ok=True)

# 55 Candidates data definitions
candidates_data = [
    # Top tier Full Stack Candidates (Format: Two-Column)
    {
        "file": "01_aditi_sharma.txt",
        "name": "Aditi Sharma",
        "email": "aditi.sharma@gmail.com",
        "phone": "+91 98765 43210",
        "city": "Bengaluru",
        "college": "IIT Delhi",
        "degree": "B.Tech Computer Science",
        "cgpa": "8.9 / 10.0 CGPA",
        "tenth": "94.2% (CBSE Class X)",
        "twelfth": "93.0% (CBSE Class XII - PCM)",
        "grad_year": "2021",
        "exp_years": "3.2 Years",
        "skills": "React, TypeScript, Node.js, PostgreSQL, Docker, Redis, Tailwind CSS, Git, REST APIs",
        "format": "two_column",
        "experience": "Senior Software Engineer at Razorpay (2022 - Present)\nBuilt micro-frontend checkout modules in React and TypeScript.\nSoftware Engineer at HackerRank (2021 - 2022)\nEngineered scalable REST APIs in Node.js and PostgreSQL."
    },
    {
        "file": "02_priya_patel.txt",
        "name": "Priya Patel",
        "email": "priya.patel@outlook.com",
        "phone": "+91 98220 12345",
        "city": "Pune",
        "college": "COEP Pune",
        "degree": "B.E. Information Technology",
        "cgpa": "8.4 / 10",
        "tenth": "89.5% (Maharashtra State Board SSC)",
        "twelfth": "88.0% (Maharashtra HSC Science)",
        "grad_year": "2022",
        "exp_years": "2.1 Years",
        "skills": "React, TypeScript, JavaScript, HTML5, CSS3, Redux, Jest, Git",
        "format": "table",
        "experience": "Frontend Developer at Persistent Systems (2022 - Present)\nDeveloped responsive customer portals with React and TypeScript."
    },
    {
        "file": "03_vikram_singh.txt",
        "name": "Vikram Singh",
        "email": "vikram.singh@devmail.io",
        "phone": "+91 99112 88442",
        "city": "Gurugram",
        "college": "DTU Delhi",
        "degree": "B.Tech Software Engineering",
        "cgpa": "7.9 CGPA",
        "tenth": "84% (CBSE)",
        "twelfth": "82% (CBSE)",
        "grad_year": "2020",
        "exp_years": "3.8 Years",
        "skills": "Docker, Kubernetes, AWS, Node.js, Express, PostgreSQL, MongoDB, CI/CD",
        "format": "standard",
        "experience": "DevOps & Backend Engineer at Zomato (2021 - Present)\nManaged Dockerized container fleets and Node microservices."
    },
    {
        "file": "04_rohan_verma.txt",
        "name": "Rohan Verma",
        "email": "rohan.verma@bitspilani.ac.in",
        "phone": "+91 97654 32109",
        "city": "Hyderabad",
        "college": "BITS Pilani",
        "degree": "B.E. Computer Science",
        "cgpa": "9.1 / 10.0",
        "tenth": "95.0% (ICSE 10th Standard)",
        "twelfth": "94.5% (ISC 12th Standard - PCM)",
        "grad_year": "2020",
        "exp_years": "4.0 Years",
        "skills": "Python, FastAPI, SQL, PostgreSQL, Apache Spark, Docker, Redis, Pandas, Airflow",
        "format": "two_column",
        "experience": "Senior Data Engineer at Swiggy (2022 - Present)\nEngineered high-throughput ETL pipelines with FastAPI and Spark."
    },
    {
        "file": "05_ananya_iyer.txt",
        "name": "Ananya Iyer",
        "email": "ananya.iyer@iitb.ac.in",
        "phone": "+91 98450 99887",
        "city": "Mumbai",
        "college": "IIT Bombay",
        "degree": "B.Tech Computer Science and Engineering",
        "cgpa": "9.35 / 10.0",
        "tenth": "96.8% (ICSE Class X)",
        "twelfth": "97.2% (ISC Class XII)",
        "grad_year": "2024",
        "exp_years": "0 Years (Fresher)",
        "skills": "C++, Python, Data Structures, Algorithms, SQL, Git, Linux, Problem Solving",
        "format": "table",
        "experience": "Software Engineering Intern at Google (Summer 2023)\nOptimized distributed graph traversal algorithms in C++."
    },
    {
        "file": "06_rahul_nair.txt",
        "name": "Rahul Nair",
        "email": "rahul.nair@vitstudent.ac.in",
        "phone": "+91 94471 22334",
        "city": "Chennai",
        "college": "VIT Vellore",
        "degree": "B.Tech Information Technology",
        "cgpa": "8.7 / 10",
        "tenth": "91.0% (Kerala State Board SSLC)",
        "twelfth": "89.5% (Kerala Higher Secondary Directorate)",
        "grad_year": "2024",
        "exp_years": "0 Years (Fresher)",
        "skills": "Java, Python, SQL, HTML, CSS, JavaScript, Object-Oriented Programming",
        "format": "standard",
        "experience": "Summer Intern at Cognizant (June 2023 - Aug 2023)\nDeveloped automated testing utilities and internal dashboard in Java."
    },
    # Senior Backend Architect Candidates
    {
        "file": "07_siddharth_menon.txt",
        "name": "Siddharth Menon",
        "email": "siddharth.menon@techlead.in",
        "phone": "+91 98801 44556",
        "city": "Bengaluru",
        "college": "NIT Trichy",
        "degree": "B.Tech Computer Science",
        "cgpa": "8.8 / 10",
        "tenth": "93% (CBSE)",
        "twelfth": "91% (CBSE)",
        "grad_year": "2017",
        "exp_years": "7.0 Years",
        "skills": "Go, Java, Microservices, Kafka, PostgreSQL, Docker, Kubernetes, Redis, gRPC, AWS, System Design",
        "format": "two_column",
        "experience": "Principal Backend Architect at PhonePe (2021 - Present)\nArchitected payment processing engine handling 35,000 TPS in Go and Kafka.\nStaff Software Engineer at Flipkart (2017 - 2021)\nDesigned inventory microservices in Java and Kubernetes."
    },
    {
        "file": "08_tanvi_deshmukh.txt",
        "name": "Tanvi Deshmukh",
        "email": "tanvi.deshmukh@architect.io",
        "phone": "+91 98230 77112",
        "city": "Hyderabad",
        "college": "IIIT Hyderabad",
        "degree": "B.Tech + M.Tech Dual Degree CSE",
        "cgpa": "9.05 / 10.0",
        "tenth": "95% (Maharashtra SSC)",
        "twelfth": "93% (Maharashtra HSC)",
        "grad_year": "2018",
        "exp_years": "6.2 Years",
        "skills": "Go, Java, Distributed Systems, Kafka, Docker, Kubernetes, PostgreSQL, System Design, Terraform",
        "format": "table",
        "experience": "Lead Architect at Uber India (2021 - Present)\nScaled geospatial dispatch engine using Go, Kafka, and Redis.\nSenior Backend Engineer at Amazon (2018 - 2021)\nBuilt distributed order tracking pipelines."
    },
    {
        "file": "09_arjun_nambiar.txt",
        "name": "Arjun Nambiar",
        "email": "arjun.nambiar@cloudcore.com",
        "phone": "+91 94960 33221",
        "city": "Bengaluru",
        "college": "NIT Calicut",
        "degree": "B.Tech CSE",
        "cgpa": "7.8 / 10",
        "tenth": "86% (CBSE)",
        "twelfth": "84% (CBSE)",
        "grad_year": "2018",
        "exp_years": "5.5 Years",
        "skills": "Java, Spring Boot, Microservices, PostgreSQL, Docker, Kafka, AWS, MySQL",
        "format": "standard",
        "experience": "Senior Backend Engineer at Zeta (2020 - Present)\nDesigned core banking microservices in Java and PostgreSQL.\nBackend Developer at Infosys (2018 - 2020)"
    },
    {
        "file": "10_kavita_reddy.txt",
        "name": "Kavita Reddy",
        "email": "kavita.reddy@hyderabadtech.org",
        "phone": "+91 99890 12344",
        "city": "Hyderabad",
        "college": "JNTU Hyderabad",
        "degree": "B.Tech Information Technology",
        "cgpa": "7.4 / 10",
        "tenth": "81% (AP State Board SSC)",
        "twelfth": "79% (AP Intermediate Board)",
        "grad_year": "2019",
        "exp_years": "4.8 Years",
        "skills": "Java, Spring Boot, REST APIs, MySQL, Docker, Git, JUnit",
        "format": "two_column",
        "experience": "Backend Developer at TCS (2019 - Present)\nDeveloped Java Spring REST services for enterprise banking clients."
    },
    # Senior Frontend React Lead Candidates
    {
        "file": "11_varun_kapoor.txt",
        "name": "Varun Kapoor",
        "email": "varun.kapoor@frontendlead.dev",
        "phone": "+91 98111 66554",
        "city": "Gurugram",
        "college": "IIT Roorkee",
        "degree": "B.Tech Computer Science",
        "cgpa": "8.75 / 10.0",
        "tenth": "92.5% (CBSE)",
        "twelfth": "91.0% (CBSE)",
        "grad_year": "2018",
        "exp_years": "6.0 Years",
        "skills": "React, TypeScript, Next.js, Tailwind CSS, Zustand, Redux, Web Performance, Micro-frontends, GraphQL, Playwright",
        "format": "two_column",
        "experience": "Staff Frontend Engineer at MakeMyTrip (2022 - Present)\nLed web performance overhaul improving LCP by 45% using Next.js and Tailwind.\nSenior Frontend Engineer at Cleartrip (2018 - 2022)\nArchitected design system primitives in React & TypeScript."
    },
    {
        "file": "12_neha_kulkarni.txt",
        "name": "Neha Kulkarni",
        "email": "neha.kulkarni@webstudio.co",
        "phone": "+91 97660 88223",
        "city": "Noida",
        "college": "BITS Pilani (Goa Campus)",
        "degree": "B.E. Computer Science",
        "cgpa": "8.5 / 10",
        "tenth": "90% (ICSE)",
        "twelfth": "88% (ISC)",
        "grad_year": "2019",
        "exp_years": "5.0 Years",
        "skills": "React, TypeScript, Next.js, Tailwind CSS, Redux, Web Performance, Radix UI, Jest, Vite",
        "format": "table",
        "experience": "Lead Frontend Engineer at Urban Company (2021 - Present)\nBuilt booking flow used by 5M+ monthly users with React, TypeScript, and Vite."
    },
    {
        "file": "13_deepak_joshi.txt",
        "name": "Deepak Joshi",
        "email": "deepak.joshi@reactdev.in",
        "phone": "+91 98712 34567",
        "city": "Delhi",
        "college": "NSUT Delhi",
        "degree": "B.Tech IT",
        "cgpa": "7.6 / 10",
        "tenth": "84% (CBSE)",
        "twelfth": "82% (CBSE)",
        "grad_year": "2020",
        "exp_years": "4.0 Years",
        "skills": "React, JavaScript, TypeScript, CSS3, HTML5, Redux, REST APIs",
        "format": "standard",
        "experience": "Frontend Developer at Paytm (2020 - Present)\nMaintained merchant portal UIs in React and TypeScript."
    },
    # More Campus / Early Career Candidates (Mixed CGPA formats & Boards)
    {
        "file": "14_divya_narasimhan.txt",
        "name": "Divya Narasimhan",
        "email": "divya.n@nitt.edu",
        "phone": "+91 94440 11992",
        "city": "Chennai",
        "college": "NIT Trichy",
        "degree": "B.Tech Electronics & Communication",
        "cgpa": "9.12 / 10.0",
        "tenth": "97.5% (Tamil Nadu State Board Matriculation)",
        "twelfth": "96.0% (Tamil Nadu Higher Secondary Examination)",
        "grad_year": "2024",
        "exp_years": "0 Years (Fresher)",
        "skills": "C++, Python, Data Structures, Algorithms, Linux, SQL, Embedded C",
        "format": "table",
        "experience": "Research Intern at Indian Institute of Science (IISc) (May 2023 - July 2023)"
    },
    {
        "file": "15_manish_gupta.txt",
        "name": "Manish Gupta",
        "email": "manish.gupta@dtu.ac.in",
        "phone": "+91 98109 44332",
        "city": "Noida",
        "college": "DTU Delhi",
        "degree": "B.Tech Computer Engineering",
        "cgpa": "8.6 / 10",
        "tenth": "91% (CBSE)",
        "twelfth": "89% (CBSE)",
        "grad_year": "2024",
        "exp_years": "0 Years (Fresher)",
        "skills": "Java, Python, C++, Data Structures, Algorithms, MySQL, Git",
        "format": "standard",
        "experience": "Teaching Assistant - Algorithms at DTU (2023 - 2024)"
    },
    # Additional Data Engineering Candidates
    {
        "file": "16_pooja_sen.txt",
        "name": "Pooja Sen",
        "email": "pooja.sen@dataflow.ai",
        "phone": "+91 98300 55441",
        "city": "Bengaluru",
        "college": "Jadavpur University",
        "degree": "B.E. Computer Science",
        "cgpa": "8.85 / 10.0",
        "tenth": "92.0% (West Bengal Secondary Board WBBSE)",
        "twelfth": "90.5% (WBCHSE Higher Secondary)",
        "grad_year": "2021",
        "exp_years": "3.2 Years",
        "skills": "Python, FastAPI, SQL, PostgreSQL, Docker, Apache Spark, Airflow, Snowflake",
        "format": "two_column",
        "experience": "Data Engineer II at InMobi (2021 - Present)\nBuilt streaming ad-telemetry pipelines in Python, Spark, and FastAPI."
    },
    {
        "file": "17_amitabh_bose.txt",
        "name": "Amitabh Bose",
        "email": "amitabh.bose@analyticslab.com",
        "phone": "+91 98311 22338",
        "city": "Kolkata",
        "college": "IIEST Shibpur",
        "degree": "B.Tech Information Technology",
        "cgpa": "7.9 / 10",
        "tenth": "85% (CBSE)",
        "twelfth": "83% (CBSE)",
        "grad_year": "2020",
        "exp_years": "3.9 Years",
        "skills": "Python, SQL, PostgreSQL, Docker, Pandas, NumPy, MySQL, Linux",
        "format": "standard",
        "experience": "Data Engineer at PwC India (2020 - Present)\nEngineered database workflows and automated reporting scripts."
    },
    # Candidates with US GPA & Percentage notations
    {
        "file": "18_karthik_sundaram.txt",
        "name": "Karthik Sundaram",
        "email": "karthik.sundaram@stanfordalumni.org",
        "phone": "+91 98401 77665",
        "city": "Bengaluru",
        "college": "IIT Madras",
        "degree": "B.Tech Electrical Engineering",
        "cgpa": "3.85 / 4.0 GPA (Equivalent to 9.2/10)",
        "tenth": "95.5% (CBSE)",
        "twelfth": "94.0% (CBSE)",
        "grad_year": "2019",
        "exp_years": "4.5 Years",
        "skills": "React, TypeScript, Node.js, PostgreSQL, Docker, Redis, Kubernetes, AWS",
        "format": "table",
        "experience": "Senior Full Stack Engineer at Postman (2021 - Present)\nBuilt developer workspace sync engine in React, TypeScript, and Node.js."
    },
    # DUPLICATES for testing duplicate detection bonus feature!
    # Duplicate 1: Exact email duplicate of Karthik Sundaram with slightly updated experience
    {
        "file": "19_karthik_sundaram_duplicate.txt",
        "name": "Karthik Sundaram",
        "email": "karthik.sundaram@stanfordalumni.org",
        "phone": "+91 98401 77665",
        "city": "Bengaluru",
        "college": "IIT Madras",
        "degree": "B.Tech Electrical Engineering",
        "cgpa": "9.2 / 10 CGPA",
        "tenth": "95.5% (CBSE)",
        "twelfth": "94.0% (CBSE)",
        "grad_year": "2019",
        "exp_years": "4.8 Years",
        "skills": "React, TypeScript, Node.js, PostgreSQL, Docker, Redis, Kubernetes, AWS, GraphQL",
        "format": "two_column",
        "experience": "Lead Full Stack Engineer at Postman (Updated Profile 2024)\nExpanded workspace collaboration microservices."
    },
    # Duplicate 2: Near-name / fuzzy match (Kartik Sundaram vs Karthik Sundaram)
    {
        "file": "20_kartik_sundaram_fuzzy.txt",
        "name": "Kartik Sundaram",
        "email": "kartik.sundaram.dev@gmail.com",
        "phone": "+91 98401 77665", # Same phone number!
        "city": "Bangalore",
        "college": "IIT Madras",
        "degree": "B.Tech EE",
        "cgpa": "9.2 / 10",
        "tenth": "95.5% (CBSE)",
        "twelfth": "94% (CBSE)",
        "grad_year": "2019",
        "exp_years": "4.5 Years",
        "skills": "React, TypeScript, Node.js, PostgreSQL, Docker, Redis",
        "format": "standard",
        "experience": "Full Stack Lead at Tech Ventures (2021 - Present)"
    },
    # Messy OCR / Unstructured Resumes (Style E)
    {
        "file": "21_messy_ocr_candidate.txt",
        "name": "RAKESH  KUMAR  YADAV",
        "email": "rakesh.yadav88@yahoo.co.in",
        "phone": "9818812345",
        "city": "NOIDA UP",
        "college": "UPTU / AKTU LUCKNOW",
        "degree": "B.TECH (IT)",
        "cgpa": "68.4% (AGGREGATE MARKS CONVERTED TO 6.84 CGPA)",
        "tenth": "71.2 % (UP BOARD ALLAHABAD)",
        "twelfth": "69.5 % (UP BOARD)",
        "grad_year": "2019",
        "exp_years": "4 YEARS 8 MONTHS",
        "skills": "Java, spring boot , REST API , Mysql, GIT , eclipse, linux command line",
        "format": "messy",
        "experience": "Worked as software engineer at webcraft solutions noida from 2019 to Present.\nHandling java backend modules."
    },
    {
        "file": "22_messy_resume_no_headers.txt",
        "name": "Sunil Nair",
        "email": "sunil.nair.dev@rediffmail.com",
        "phone": "+91-9447012399",
        "city": "Kochi",
        "college": "Cochin University of Science and Technology",
        "degree": "B.Tech Computer Science",
        "cgpa": "7.8 CGPA out of 10",
        "tenth": "82% (Kerala Board)",
        "twelfth": "80% (Kerala Board)",
        "grad_year": "2021",
        "exp_years": "2.8 yrs",
        "skills": "python , fastapi , postgresql , docker , git",
        "format": "messy",
        "experience": "backend developer at technopark trivandrum june 2021 - ongoing"
    }
]

# Add more candidates programmatically up to 55 to fulfill the full 50-60 resume suite!
names_and_profiles = [
    ("Nikhil Bansal", "nikhil.bansal@gmail.com", "Chandigarh", "PEC Chandigarh", "B.Tech CSE", "8.3 / 10", "90%", "88%", "2022", "2.0 Years", "React, TypeScript, Node.js, PostgreSQL, Docker", "fullstack"),
    ("Sneha Aggarwal", "sneha.aggarwal@hotmail.com", "Delhi", "IGDTUW Delhi", "B.Tech IT", "8.9 / 10", "93%", "92%", "2021", "3.0 Years", "React, TypeScript, Next.js, Tailwind CSS, Redux", "frontend"),
    ("Gautam Reddy", "gautam.reddy@gmail.com", "Hyderabad", "NIT Warangal", "B.Tech CSE", "8.4 / 10", "89%", "87%", "2020", "4.0 Years", "Go, Java, Microservices, Kafka, PostgreSQL, Docker", "backend"),
    ("Ishaan Mehta", "ishaan.mehta@yahoo.com", "Mumbai", "VJTI Mumbai", "B.Tech IT", "8.1 / 10", "87%", "85%", "2021", "2.5 Years", "Python, FastAPI, SQL, Spark, Docker", "data"),
    ("Meera Krishnan", "meera.krishnan@outlook.com", "Chennai", "Anna University", "B.E. CSE", "8.7 / 10", "92%", "90%", "2024", "0 Years", "C++, Python, Data Structures, Algorithms, SQL", "fresher"),
    ("Harsh Vardhan", "harsh.vardhan@gmail.com", "Patna", "NIT Patna", "B.Tech CSE", "7.9 / 10", "84%", "82%", "2023", "1.0 Years", "Java, Spring Boot, MySQL, Git", "backend"),
    ("Pallavi Rao", "pallavi.rao@gmail.com", "Bengaluru", "BMS College of Engineering", "B.E. ISE", "8.5 / 10", "89%", "88%", "2022", "2.2 Years", "React, TypeScript, Tailwind CSS, Node.js", "frontend"),
    ("Abhishek Tiwari", "abhishek.t@gmail.com", "Lucknow", "HBTI Kanpur", "B.Tech CSE", "8.0 / 10", "86%", "84%", "2021", "3.1 Years", "Python, FastAPI, PostgreSQL, Docker", "data"),
    ("Ritu Sharma", "ritu.sharma@gmail.com", "Jaipur", "MNIT Jaipur", "B.Tech ECE", "8.2 / 10", "88%", "86%", "2024", "0 Years", "Java, SQL, OOP, Algorithms", "fresher"),
    ("Sanjay Hegde", "sanjay.hegde@gmail.com", "Mangalore", "NITK Surathkal", "B.Tech Mechanical", "7.7 / 10", "85%", "83%", "2020", "3.5 Years", "Go, Docker, Kubernetes, AWS, Linux", "backend"),
    ("Deepa Chandran", "deepa.c@gmail.com", "Kochi", "Model Engineering College", "B.Tech CSE", "8.6 / 10", "91%", "89%", "2021", "3.0 Years", "React, TypeScript, Redux, PostgreSQL", "fullstack"),
    ("Anand Kulkarni", "anand.k@gmail.com", "Pune", "PICT Pune", "B.E. Computer Engineering", "8.3 / 10", "88%", "87%", "2022", "2.0 Years", "Python, FastAPI, Pandas, SQL", "data"),
    ("Shreya Saxena", "shreya.saxena@gmail.com", "Noida", "Amity University", "B.Tech CSE", "7.8 / 10", "82%", "80%", "2023", "1.2 Years", "React, JavaScript, HTML, CSS", "frontend"),
    ("Kunal Chopra", "kunal.chopra@gmail.com", "Gurugram", "Thapar Institute", "B.E. Computer Science", "8.4 / 10", "89%", "87%", "2020", "4.2 Years", "Java, Go, Microservices, Kafka, Docker", "backend"),
    ("Bhavna Das", "bhavna.das@gmail.com", "Bhubaneswar", "NIT Rourkela", "B.Tech CSE", "8.8 / 10", "93%", "91%", "2024", "0 Years", "C++, Python, SQL, Git", "fresher"),
    ("Tarun Bhatia", "tarun.bhatia@gmail.com", "Delhi", "MAIT Delhi", "B.Tech IT", "7.5 / 10", "80%", "78%", "2021", "3.0 Years", "Node.js, Express, MongoDB, React", "fullstack"),
    ("Swati Mishra", "swati.mishra@gmail.com", "Indore", "SGSITS Indore", "B.Tech CSE", "8.2 / 10", "87%", "85%", "2022", "2.1 Years", "Python, FastAPI, Docker, SQL", "data"),
    ("Vikas Pandey", "vikas.pandey@gmail.com", "Kanpur", "IIT Kanpur", "B.Tech Electrical", "8.6 / 10", "92%", "90%", "2019", "5.0 Years", "Go, Java, Kafka, Kubernetes, Distributed Systems", "backend"),
    ("Nandini Sen", "nandini.sen@gmail.com", "Kolkata", "St. Xavier's College", "B.Sc Computer Science", "8.5 / 10", "90%", "88%", "2023", "1.0 Years", "React, TypeScript, Tailwind CSS", "frontend"),
    ("Rajesh Murthy", "rajesh.murthy@gmail.com", "Bengaluru", "RV College of Engineering", "B.E. CSE", "8.9 / 10", "93%", "91%", "2024", "0 Years", "Java, Python, Data Structures, OOP", "fresher"),
    ("Geeta Pillai", "geeta.pillai@gmail.com", "Trivandrum", "College of Engineering Trivandrum", "B.Tech CSE", "8.4 / 10", "89%", "87%", "2021", "3.2 Years", "React, TypeScript, Node.js, PostgreSQL", "fullstack"),
    ("Pranav Jain", "pranav.jain@gmail.com", "Ahmedabad", "DA-IICT Gandhinagar", "B.Tech ICT", "8.7 / 10", "91%", "89%", "2020", "4.0 Years", "Python, FastAPI, Apache Spark, Airflow", "data"),
    ("Aarti Chauhan", "aarti.chauhan@gmail.com", "Dehradun", "IIT Roorkee", "B.Tech ECE", "8.5 / 10", "90%", "89%", "2018", "6.0 Years", "React, TypeScript, Next.js, Web Performance", "frontend"),
    ("Alok Nath", "alok.nath@gmail.com", "Varanasi", "IIT BHU Varanasi", "B.Tech CSE", "8.8 / 10", "93%", "92%", "2017", "7.0 Years", "Go, Java, Kafka, Kubernetes, System Design", "backend"),
    ("Simran Kaur", "simran.kaur@gmail.com", "Amritsar", "GNDU Amritsar", "B.Tech CSE", "8.0 / 10", "85%", "83%", "2024", "0 Years", "Java, SQL, HTML, CSS", "fresher"),
    ("Chirag Patel", "chirag.patel@gmail.com", "Vadodara", "MS University Baroda", "B.E. IT", "7.6 / 10", "81%", "79%", "2022", "2.0 Years", "React, JavaScript, Node.js, MongoDB", "fullstack"),
    ("Ankita Roy", "ankita.roy@gmail.com", "Guwahati", "IIT Guwahati", "B.Tech CSE", "9.0 / 10", "94%", "93%", "2021", "3.1 Years", "Python, FastAPI, Docker, Spark, SQL", "data"),
    ("Manoj Soni", "manoj.soni@gmail.com", "Bhopal", "MANIT Bhopal", "B.Tech CSE", "8.1 / 10", "86%", "84%", "2019", "5.2 Years", "Go, Microservices, Docker, PostgreSQL", "backend"),
    ("Pooja Nair", "pooja.nair@gmail.com", "Chennai", "SSN College of Engineering", "B.Tech IT", "8.6 / 10", "91%", "89%", "2020", "4.1 Years", "React, TypeScript, Next.js, Tailwind CSS", "frontend"),
    ("Kishore Varma", "kishore.varma@gmail.com", "Visakhapatnam", "Andhra University", "B.Tech CSE", "8.2 / 10", "87%", "85%", "2024", "0 Years", "Python, C++, SQL, Algorithms", "fresher"),
    ("Tanmay Bhat", "tanmay.bhat@gmail.com", "Mumbai", "IIT Bombay", "B.Tech Mechanical", "8.3 / 10", "89%", "87%", "2021", "3.0 Years", "React, TypeScript, Node.js, Docker, PostgreSQL", "fullstack"),
    ("Vidya Balan", "vidya.balan@gmail.com", "Palakkad", "IIT Palakkad", "B.Tech CSE", "8.8 / 10", "92%", "90%", "2022", "2.4 Years", "Python, FastAPI, Spark, Docker, SQL", "data"),
    ("Nitin Gadkari", "nitin.g@gmail.com", "Nagpur", "VNIT Nagpur", "B.Tech Civil", "7.3 / 10", "78%", "76%", "2020", "4.0 Years", "Java, Spring Boot, MySQL, Git", "backend")
]

counter = 23
for name, email, city, college, degree, cgpa, tenth, twelfth, grad_year, exp, skills, cat in names_and_profiles:
    fmt = "two_column" if counter % 3 == 0 else ("table" if counter % 3 == 1 else "standard")
    fname = f"{counter:02d}_{name.lower().replace(' ', '_')}.txt"
    candidates_data.append({
        "file": fname,
        "name": name,
        "email": email,
        "phone": f"+91 98{counter:02d}0 {counter:02d}123",
        "city": city,
        "college": college,
        "degree": degree,
        "cgpa": cgpa,
        "tenth": f"{tenth} (State / Central Board)",
        "twelfth": f"{twelfth} (Higher Secondary)",
        "grad_year": grad_year,
        "exp_years": exp,
        "skills": skills,
        "format": fmt,
        "experience": f"Software Engineer at Tech Org ({grad_year} - Present)\nWorking on {skills.split(',')[0]} and related cloud microservices."
    })
    counter += 1

print(f"Total resumes to generate: {len(candidates_data)}")

# Write all 55 resume files
for cand in candidates_data:
    filepath = os.path.join(RESUMES_DIR, cand["file"])
    if cand["format"] == "two_column":
        content = f"""================================================================================
                                {cand['name'].upper()}
                    Email: {cand['email']} | Phone: {cand['phone']}
                    Location: {cand['city']}, India
================================================================================
[SKILLS & COMPETENCIES]                 | [PROFESSIONAL EXPERIENCE]
----------------------------------------|---------------------------------------
Technical Skills:                       | Total Experience: {cand['exp_years']}
{cand['skills']}                        | 
                                        | {cand['experience']}
Tools & Infrastructure:                 |
Docker, Git, CI/CD, Linux               | [EDUCATION & ACADEMICS]
                                        | College: {cand['college']}
Languages: English, Hindi               | Degree: {cand['degree']} (Batch of {cand['grad_year']})
                                        | CGPA: {cand['cgpa']}
                                        | Class X: {cand['tenth']}
                                        | Class XII: {cand['twelfth']}
================================================================================
"""
    elif cand["format"] == "table":
        content = f"""Name: {cand['name']}
Email: {cand['email']}
Mobile: {cand['phone']}
Address: {cand['city']}, India

ACADEMIC RECORD:
+------------------------------------+--------------------------------+-------------------+------------+
| Degree / Standard                  | Institution / Board            | Score / Grade     | Year       |
+------------------------------------+--------------------------------+-------------------+------------+
| {cand['degree']:<34} | {cand['college']:<30} | {cand['cgpa']:<17} | {cand['grad_year']:<10} |
| Senior Secondary (Class XII)       | {cand['twelfth']:<30} | Pass with Honours | {int(cand['grad_year'])-2:<10} |
| Secondary School (Class X)         | {cand['tenth']:<30} | Distinction       | {int(cand['grad_year'])-4:<10} |
+------------------------------------+--------------------------------+-------------------+------------+

TECHNICAL PROFICIENCIES:
{cand['skills']}

WORK EXPERIENCE:
{cand['experience']}
"""
    elif cand["format"] == "messy":
        content = f"""RESUME CURRICULUM VITAE
candidate name:  {cand['name']}
contact info: {cand['email']}   tel:{cand['phone']}
residential town: {cand['city']}

EDUCATIONAL BACKGROUND:
college/univ: {cand['college']}
course: {cand['degree']}  graduating in {cand['grad_year']}
marks details: {cand['cgpa']}
10th: {cand['tenth']}
12th: {cand['twelfth']}

SKILLS AND TOOLS:
{cand['skills']}

WORK HISTORY:
{cand['experience']}
"""
    else: # standard
        content = f"""# {cand['name']}
{cand['city']}, India | {cand['email']} | {cand['phone']}

## Summary
Experienced engineering professional with strong track record of designing, building, and delivering mission-critical applications.

## Technical Skills
- Core Technologies: {cand['skills']}
- Tools: Docker, Git, Linux, RESTful Web Services

## Experience ({cand['exp_years']})
{cand['experience']}

## Education
- **{cand['degree']}**, {cand['college']}
  - Graduation Year: {cand['grad_year']}
  - Cumulative Score: {cand['cgpa']}
- **Senior Secondary (Class XII)**: {cand['twelfth']}
- **Secondary Examination (Class X)**: {cand['tenth']}
"""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("All 55 resumes written successfully.")

# Write verified 20-candidate answer_key.csv
ANSWER_KEY_PATH = r"c:\Users\DELL\HireSwift\test-data\answer_key.csv"
answer_key_rows = [
    # Full Stack Engineer JD (Required: React, TypeScript, Node.js, PostgreSQL, Docker)
    ("01_aditi_sharma", "Aditi Sharma", "Senior Full Stack Engineer", "1", "94-98%", "Matches 5/5 required skills (React TypeScript Node.js PostgreSQL Docker) + 3.2y exp + IIT Delhi degree"),
    ("18_karthik_sundaram", "Karthik Sundaram", "Senior Full Stack Engineer", "2", "92-96%", "Matches 5/5 required skills + 4.5y exp + Tier-1 IIT Madras + 3.85 GPA"),
    ("02_priya_patel", "Priya Patel", "Senior Full Stack Engineer", "3", "78-84%", "Matches React & TypeScript with 2.1y exp; missing backend Docker and Node.js depth"),
    ("03_vikram_singh", "Vikram Singh", "Senior Full Stack Engineer", "4", "72-76%", "Strong Docker and Node.js with 3.8y exp from DTU; lacks primary React frontend competency"),
    ("13_deepak_joshi", "Deepak Joshi", "Senior Full Stack Engineer", "5", "66-72%", "Solid React & TypeScript foundation with 4y exp; missing containerization (Docker) and PostgreSQL"),

    # Campus Graduate Trainee JD (Min 7.5 CGPA, Freshers 2024 batch, C++ / Java / Python / SQL)
    ("05_ananya_iyer", "Ananya Iyer", "Campus Graduate Trainee", "1", "95-99%", "Top tier 9.35 CGPA from IIT Bombay, 96%+ 10th/12th, exceptional C++ and algorithms proficiency"),
    ("14_divya_narasimhan", "Divya Narasimhan", "Campus Graduate Trainee", "2", "92-96%", "9.12 CGPA from NIT Trichy, 97% board distinction, strong C++ and Linux fundamentals"),
    ("06_rahul_nair", "Rahul Nair", "Campus Graduate Trainee", "3", "84-88%", "8.7 CGPA from VIT with good Java and SQL foundations, meets all academic cutoffs"),
    ("15_manish_gupta", "Manish Gupta", "Campus Graduate Trainee", "4", "82-86%", "8.6 CGPA from DTU Delhi, strong Java and algorithms TA background"),

    # Python Data Engineer JD (Python, FastAPI, SQL, PostgreSQL, Docker, Spark)
    ("04_rohan_verma", "Rohan Verma", "Python Data Engineer", "1", "95-99%", "Matches all core skills (Python FastAPI SQL Spark Docker) with 4y relevant data experience and Tier-1 BITS degree"),
    ("16_pooja_sen", "Pooja Sen", "Python Data Engineer", "2", "90-95%", "Matches Python, FastAPI, Spark, Docker with 3.2y data streaming background at InMobi"),
    ("17_amitabh_bose", "Amitabh Bose", "Python Data Engineer", "3", "78-83%", "Good Python, SQL, PostgreSQL, Docker skills; lacks high-throughput Spark framework"),
    ("22_messy_resume_no_headers", "Sunil Nair", "Python Data Engineer", "4", "70-75%", "Matches Python, FastAPI, PostgreSQL, Docker but messy formatting with 2.8y exp"),

    # Senior Backend Architect JD (Go, Java, Microservices, Kafka, PostgreSQL, Docker, Kubernetes, 5+ yrs)
    ("07_siddharth_menon", "Siddharth Menon", "Senior Backend Architect", "1", "95-99%", "Exceptional match: Go, Java, Kafka, Microservices, Kubernetes with 7y exp and Tier-1 NIT Trichy"),
    ("08_tanvi_deshmukh", "Tanvi Deshmukh", "Senior Backend Architect", "2", "94-98%", "Matches Go, Java, Kafka, Kubernetes with 6.2y exp and IIIT Hyderabad dual degree"),
    ("09_arjun_nambiar", "Arjun Nambiar", "Senior Backend Architect", "3", "80-85%", "Strong Java, Spring, Microservices, Kafka with 5.5y exp; lacks deep Go language exposure"),
    ("10_kavita_reddy", "Kavita Reddy", "Senior Backend Architect", "4", "65-70%", "Java Spring Boot with 4.8y exp; lacks Go, Kafka, and Kubernetes required for architectural role"),

    # Staff Frontend Engineer & React Lead JD (React, TypeScript, Next.js, Tailwind, Web Performance, 4+ yrs)
    ("11_varun_kapoor", "Varun Kapoor", "Staff Frontend Engineer & React Lead", "1", "95-99%", "Perfect match: React, TypeScript, Next.js, Tailwind, Web Performance with 6y exp and IIT Roorkee"),
    ("12_neha_kulkarni", "Neha Kulkarni", "Staff Frontend Engineer & React Lead", "2", "92-96%", "Matches React, TypeScript, Next.js, Tailwind CSS with 5y exp and BITS Pilani degree"),
    ("21_messy_ocr_candidate", "Rakesh Kumar Yadav", "Senior Full Stack Engineer", "6", "52-58%", "Below cutoff CGPA (6.84), non-standard OCR format, lacks React/TypeScript frontend required skills")
]

with open(ANSWER_KEY_PATH, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["candidate_id", "candidate_name", "job_target", "expected_rank", "expected_score_range", "why"])
    writer.writerows(answer_key_rows)

print(f"answer_key.csv updated with {len(answer_key_rows)} verified benchmark candidates.")
