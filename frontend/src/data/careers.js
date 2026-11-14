// Job titles and industries for Career preferences: autocomplete lists and "suggested for you".
// Hand-curated for the Philippine job market, every field. Typed titles/industries not listed still work.

const words = (s) => s.split('|').map((x) => x.trim()).filter(Boolean)

export const JOB_TITLES = words(`
  Software Engineer|Software Developer|Web Developer|Front-End Developer|Back-End Developer|Full-Stack Developer|
  React Developer|Vue.js Developer|Angular Developer|JavaScript Developer|TypeScript Developer|Node.js Developer|
  PHP Developer|Laravel Developer|WordPress Developer|Shopify Developer|Python Developer|Django Developer|
  Java Developer|.NET Developer|C# Developer|Go Developer|Ruby on Rails Developer|Mobile App Developer|
  Android Developer|iOS Developer|Flutter Developer|React Native Developer|Game Developer|Unity Developer|
  UI Developer|UI/UX Designer|UI Designer|UX Designer|Product Designer|Web Designer|Graphic Designer|
  Multimedia Artist|Motion Graphics Designer|Video Editor|3D Artist|Animator|Illustrator|
  QA Engineer|QA Tester|Automation Test Engineer|DevOps Engineer|Cloud Engineer|Site Reliability Engineer|
  Systems Administrator|Network Engineer|IT Support Specialist|Help Desk Technician|Technical Support Engineer|
  Cybersecurity Analyst|Database Administrator|Data Analyst|Data Engineer|Data Scientist|Machine Learning Engineer|
  AI Engineer|Business Intelligence Analyst|Business Analyst|Systems Analyst|Solutions Architect|Technical Lead|
  Engineering Manager|IT Project Manager|Scrum Master|Product Manager|Product Owner|Technical Writer|
  Customer Service Representative|Call Center Agent|Technical Support Representative|Chat Support Agent|
  Email Support Specialist|Customer Success Manager|Team Leader (BPO)|Quality Analyst (BPO)|Workforce Analyst|
  Trainer (BPO)|Operations Manager|Virtual Assistant|Executive Assistant|Administrative Assistant|
  Office Administrator|Secretary|Receptionist|Data Entry Specialist|Encoder|Document Controller|
  Sales Associate|Sales Representative|Sales Executive|Account Executive|Account Manager|Business Development Manager|
  Sales Manager|Real Estate Agent|Insurance Agent|Telemarketer|Lead Generation Specialist|Appointment Setter|
  Marketing Assistant|Marketing Specialist|Digital Marketing Specialist|Social Media Manager|Content Creator|
  Content Writer|Copywriter|SEO Specialist|Email Marketing Specialist|PPC Specialist|Brand Manager|
  Marketing Manager|Public Relations Officer|Events Coordinator|
  Accountant|Junior Accountant|Bookkeeper|Accounting Assistant|Accounts Payable Specialist|Accounts Receivable Specialist|
  Payroll Specialist|Auditor|Internal Auditor|Tax Specialist|Financial Analyst|Finance Manager|Credit Analyst|
  Bank Teller|Loan Officer|Collections Specialist|Treasury Assistant|
  HR Assistant|HR Generalist|HR Officer|Recruiter|Talent Acquisition Specialist|Training Officer|HR Manager|
  Compensation and Benefits Specialist|
  Registered Nurse|Nursing Assistant|Caregiver|Medical Technologist|Pharmacist|Pharmacy Assistant|
  Physical Therapist|Radiologic Technologist|Medical Coder|Medical Biller|Medical Virtual Assistant|
  Healthcare Virtual Assistant|Dentist|Dental Assistant|Midwife|Doctor|
  Teacher|Elementary Teacher|High School Teacher|Preschool Teacher|Special Education Teacher|Online English Teacher|
  ESL Teacher|Tutor|College Instructor|Academic Coordinator|Guidance Counselor|
  Chef|Cook|Kitchen Helper|Baker|Barista|Bartender|Waiter|Restaurant Manager|Food and Beverage Supervisor|
  Front Desk Officer|Hotel Receptionist|Housekeeping Attendant|Guest Relations Officer|Travel Consultant|
  Tour Coordinator|Flight Attendant|
  Cashier|Store Associate|Store Manager|Merchandiser|Promodiser|Inventory Clerk|Warehouse Staff|
  Warehouse Supervisor|Logistics Coordinator|Supply Chain Analyst|Purchasing Officer|Procurement Specialist|
  Delivery Rider|Driver|Dispatcher|Forklift Operator|
  Civil Engineer|Mechanical Engineer|Electrical Engineer|Electronics Engineer|Industrial Engineer|Chemical Engineer|
  Architect|Draftsman|AutoCAD Operator|Project Engineer|Site Engineer|Quantity Surveyor|Safety Officer|
  Electrician|Plumber|Welder|Carpenter|Technician|Maintenance Technician|Aircon Technician|Machine Operator|
  Production Operator|Production Supervisor|Quality Control Inspector|
  Lawyer|Paralegal|Legal Assistant|Compliance Officer|Government Employee|Research Assistant|Researcher|
  Translator|Interpreter|Japanese Translator|Security Guard|Property Manager|Community Manager|Intern`)

export const INDUSTRIES = words(`
  Information Technology|Software and SaaS|IT Services and Consulting|BPO and Outsourcing|Shared Services|
  Telecommunications|E-commerce|Fintech|Banking|Financial Services|Insurance|Accounting and Audit|
  Healthcare|Hospitals and Clinics|Pharmaceuticals|Health Tech|Education|EdTech|Online Teaching|
  Retail|Fast-Moving Consumer Goods (FMCG)|Food and Beverage|Restaurants|Hospitality|Hotels and Resorts|
  Travel and Tourism|Airlines and Aviation|Shipping and Maritime|Logistics and Supply Chain|Transportation|
  Manufacturing|Electronics and Semiconductors|Automotive|Construction|Engineering|Architecture|Real Estate|
  Property Development|Energy and Utilities|Renewable Energy|Mining|Agriculture|Agribusiness|
  Marketing and Advertising|Digital Agency|Media and Entertainment|Publishing|Gaming|Esports|
  Creative and Design|Fashion|Beauty and Wellness|Sports and Fitness|Legal Services|Government and Public Sector|
  Non-Profit and NGO|Human Resources and Staffing|Recruitment|Consulting|Research|Security Services|
  Cybersecurity|Data and Analytics|Artificial Intelligence|Blockchain and Web3|Startups`)

// Industries that usually hire for a kind of role (matched against job titles and skills).
export const ROLE_INDUSTRIES = [
  [/developer|engineer|programmer|software|devops|web|react|laravel|php|javascript/i, ['Information Technology', 'Software and SaaS', 'IT Services and Consulting', 'Fintech', 'E-commerce', 'Startups']],
  [/design|ui|ux|graphic|video|multimedia|animat/i, ['Creative and Design', 'Marketing and Advertising', 'Digital Agency', 'Software and SaaS']],
  [/customer|csr|call center|support|chat|bpo/i, ['BPO and Outsourcing', 'Shared Services', 'Telecommunications', 'E-commerce']],
  [/virtual assistant|admin|secretary|encoder|data entry/i, ['BPO and Outsourcing', 'Real Estate', 'E-commerce', 'Startups']],
  [/account|bookkeep|finance|audit|payroll|tax/i, ['Accounting and Audit', 'Banking', 'Financial Services', 'Shared Services']],
  [/nurse|caregiver|medical|pharma|health|dental|therap/i, ['Healthcare', 'Hospitals and Clinics', 'Pharmaceuticals', 'Health Tech']],
  [/teacher|tutor|instructor|educat|esl/i, ['Education', 'EdTech', 'Online Teaching']],
  [/sales|business develop|account exec/i, ['Real Estate', 'Insurance', 'Fast-Moving Consumer Goods (FMCG)', 'Software and SaaS']],
  [/market|seo|social media|content|copywrit/i, ['Marketing and Advertising', 'Digital Agency', 'E-commerce', 'Media and Entertainment']],
  [/hr|recruit|talent|training/i, ['Human Resources and Staffing', 'Recruitment', 'BPO and Outsourcing']],
  [/data|analyst|machine learning|ai /i, ['Data and Analytics', 'Artificial Intelligence', 'Fintech', 'Consulting']],
  [/chef|cook|barista|waiter|hotel|front desk|travel/i, ['Hospitality', 'Food and Beverage', 'Hotels and Resorts', 'Travel and Tourism']],
  [/civil|mechanical|electrical|architect|construction|site/i, ['Construction', 'Engineering', 'Property Development', 'Energy and Utilities']],
  [/warehouse|logistic|supply|driver|delivery/i, ['Logistics and Supply Chain', 'Transportation', 'E-commerce', 'Retail']],
]
