// Skill names for autocomplete and suggestions, by Professional Profile category.
// Hand-curated for job seekers in the Philippines: tech and every other field (BPO, business,
// healthcare, education, hospitality, creative, trades…). Anything typed that isn't here still works.

const words = (s) => s.split('|').map((x) => x.trim()).filter(Boolean)

export const SKILL_GROUPS = {
  programming_languages: words(`
    JavaScript|TypeScript|Python|Java|PHP|C|C++|C#|Go|Rust|Kotlin|Swift|Dart|Ruby|Scala|R|MATLAB|Perl|Lua|
    Objective-C|Visual Basic|VBA|Bash|PowerShell|SQL|Solidity|Elixir|Haskell|Clojure|Groovy|COBOL|Assembly`),
  frontend: words(`
    HTML|HTML5|CSS|CSS3|Sass|Less|Responsive Design|Web Accessibility|Cross-Browser Compatibility|DOM Manipulation|
    Progressive Web Apps|Web Performance Optimization|Single Page Applications|State Management|UI Development|
    Component Libraries|Design Systems|Web Animations|SEO-Friendly Markup|AJAX|JSON|WebSockets|Browser DevTools`),
  backend: words(`
    REST APIs|GraphQL|API Integration|API Design|Microservices|Authentication|OAuth|JWT|Server-Side Rendering|
    Caching|Message Queues|Background Jobs|Payment Gateway Integration|Web Security|Unit Testing|Integration Testing|
    Test-Driven Development|System Design|Serverless|Cloud Computing|CI/CD|DevOps|Linux Administration|
    Networking|Data Structures|Algorithms|Object-Oriented Programming|Functional Programming|MVC Architecture|
    Webhooks|Scalability|Performance Tuning|Logging and Monitoring`),
  databases: words(`
    MySQL|PostgreSQL|SQLite|Microsoft SQL Server|Oracle Database|MariaDB|MongoDB|Redis|Firebase|Firestore|
    Supabase|DynamoDB|Cassandra|Elasticsearch|Neo4j|Database Design|Query Optimization|Data Modeling|
    Stored Procedures|Database Administration|Data Migration|ETL`),
  frameworks: words(`
    React|Next.js|Vue.js|Nuxt|Angular|Svelte|SvelteKit|Alpine.js|jQuery|Tailwind CSS|Bootstrap|Material UI|
    Chakra UI|shadcn/ui|Redux|Zustand|React Query|Vite|Webpack|Laravel|Livewire|Inertia.js|Symfony|CodeIgniter|
    Node.js|Express.js|NestJS|Django|Flask|FastAPI|Spring Boot|ASP.NET|.NET|Ruby on Rails|React Native|Flutter|
    Ionic|Electron|Jest|Vitest|Cypress|Playwright|Selenium|PHPUnit|Pest|TensorFlow|PyTorch|scikit-learn|Pandas|
    NumPy|WordPress|Shopify|Magento|Drupal|Unity|Unreal Engine|Three.js|D3.js|Socket.IO|Prisma|Sequelize|Eloquent`),
  tools: words(`
    Git|GitHub|GitLab|Bitbucket|Docker|Kubernetes|AWS|Microsoft Azure|Google Cloud|Vercel|Netlify|Heroku|
    DigitalOcean|cPanel|Nginx|Apache|Jenkins|GitHub Actions|Terraform|Ansible|Postman|Insomnia|VS Code|
    JetBrains IDEs|Android Studio|Xcode|Figma|Adobe XD|Sketch|Jira|Trello|Asana|ClickUp|Notion|Confluence|Slack|
    npm|Composer|Yarn|ESLint|Prettier|Sentry|Datadog|Grafana|Power BI|Tableau|Looker Studio|Google Analytics|
    Excel|Google Sheets|Zapier|Make|ChatGPT|Claude|GitHub Copilot|Cursor`),
  soft_skills: words(`
    Communication|Written Communication|Verbal Communication|Teamwork|Collaboration|Leadership|Problem Solving|
    Critical Thinking|Time Management|Adaptability|Attention to Detail|Creativity|Work Ethic|Self-Motivation|
    Organization|Multitasking|Decision Making|Conflict Resolution|Emotional Intelligence|Empathy|Active Listening|
    Negotiation|Persuasion|Public Speaking|Presentation Skills|Mentoring|Coaching|Interpersonal Skills|
    Customer Focus|Patience|Resilience|Accountability|Reliability|Flexibility|Stress Management|Initiative|
    Analytical Thinking|Strategic Thinking|Cultural Awareness|Professionalism|Learning Agility|Delegation|
    Remote Collaboration|Independent Work|Bilingual (English and Filipino)`),
  other: words(`
    Customer Service|Technical Support|Call Center Operations|Inbound Calls|Outbound Calls|Chat Support|
    Email Support|Ticketing Systems|Zendesk|Freshdesk|Salesforce|HubSpot|CRM Management|Upselling|
    Cross-Selling|Complaint Handling|Quality Assurance|Account Management|Back Office Support|Data Entry|
    Typing (60+ WPM)|Virtual Assistance|Calendar Management|Email Management|Appointment Setting|Lead Generation|
    Cold Calling|Transcription|Medical Transcription|Content Moderation|
    Sales|B2B Sales|Retail Sales|Sales Strategy|Business Development|Market Research|Digital Marketing|
    Social Media Marketing|Social Media Management|Content Marketing|Email Marketing|Search Engine Optimization|
    Search Engine Marketing|Google Ads|Facebook Ads|Copywriting|Content Writing|Technical Writing|Technical Documentation|
    Proofreading|Editing|Blogging|Brand Management|Public Relations|Event Planning|Community Management|
    Accounting|Bookkeeping|QuickBooks|Xero|Financial Analysis|Financial Reporting|Budgeting|Forecasting|
    Accounts Payable|Accounts Receivable|Payroll|Taxation|BIR Compliance|Auditing|Cost Accounting|
    Banking Operations|Credit Analysis|Collections|Invoicing|
    Human Resources|Recruitment|Talent Acquisition|Onboarding|Employee Relations|Training and Development|
    Performance Management|Compensation and Benefits|Labor Law Compliance|HR Information Systems|
    Office Administration|Administrative Support|Records Management|Document Control|Procurement|Purchasing|
    Inventory Management|Supply Chain Management|Logistics|Warehouse Operations|Shipping and Receiving|
    Vendor Management|Operations Management|Process Improvement|Lean Six Sigma|Project Management|
    Agile|Scrum|Kanban|Stakeholder Management|Risk Management|Business Analysis|Requirements Gathering|
    Data Analysis|Data Visualization|Statistics|Machine Learning|Artificial Intelligence|AI Agents|Prompt Engineering|
    Product Management|UI Design|UX Design|User Research|Wireframing|Prototyping|Usability Testing|
    Graphic Design|Adobe Photoshop|Adobe Illustrator|Adobe InDesign|Canva|Video Editing|Adobe Premiere Pro|
    Final Cut Pro|CapCut|Motion Graphics|Adobe After Effects|Photography|Videography|Illustration|3D Modeling|
    Blender|AutoCAD|SketchUp|Interior Design|Fashion Design|Animation|
    Teaching|Lesson Planning|Curriculum Development|Classroom Management|Tutoring|Online Teaching|ESL Teaching|
    Special Education|Student Assessment|Educational Technology|
    Patient Care|Nursing|Vital Signs Monitoring|Medication Administration|First Aid|CPR|Basic Life Support|
    Phlebotomy|Medical Coding|Medical Billing|Health Information Management|Pharmacy Operations|Caregiving|
    Elderly Care|Infection Control|Electronic Health Records|
    Food Preparation|Cooking|Baking|Food Safety|Barista|Bartending|Front Desk Operations|Housekeeping|
    Guest Relations|Hotel Management|Restaurant Management|Tour Coordination|Travel Booking|
    Cashiering|Point of Sale Systems|Merchandising|Visual Merchandising|Store Management|
    Driving|Delivery Operations|Forklift Operation|Machine Operation|Electrical Installation|Plumbing|Welding|
    Carpentry|HVAC|Automotive Repair|Preventive Maintenance|Construction Management|Quantity Surveying|
    Civil Engineering|Mechanical Engineering|Electrical Engineering|Electronics|Quality Control|
    Occupational Safety and Health|Manufacturing|Production Planning|
    Legal Research|Contract Drafting|Paralegal Support|Compliance|Real Estate|Property Management|Insurance|
    Translation|Interpretation|Japanese Language|Korean Language|Mandarin Chinese|Spanish Language|
    Microsoft Office|Microsoft Word|Microsoft PowerPoint|Microsoft Outlook|Google Workspace|Research`),
}

// What to suggest next after a skill you have.
export const RELATED = {
  React: ['Next.js', 'TypeScript', 'Redux', 'React Query', 'Tailwind CSS', 'Jest'],
  'Vue.js': ['Nuxt', 'TypeScript', 'Vite', 'Tailwind CSS'],
  Angular: ['TypeScript', 'Jest', 'State Management'],
  Laravel: ['PHP', 'Livewire', 'Eloquent', 'MySQL', 'PHPUnit', 'REST APIs'],
  PHP: ['Laravel', 'Composer', 'MySQL'],
  JavaScript: ['TypeScript', 'React', 'Node.js'],
  'Node.js': ['Express.js', 'NestJS', 'REST APIs', 'MongoDB'],
  Python: ['Django', 'FastAPI', 'Pandas', 'Data Analysis'],
  HTML: ['CSS', 'Responsive Design', 'Web Accessibility'],
  CSS: ['Sass', 'Tailwind CSS', 'Responsive Design'],
  'Tailwind CSS': ['Responsive Design', 'Design Systems'],
  MySQL: ['Database Design', 'Query Optimization'],
  Git: ['GitHub', 'CI/CD'],
  Docker: ['Kubernetes', 'CI/CD', 'Linux Administration'],
  Figma: ['UI Design', 'UX Design', 'Prototyping', 'Wireframing'],
  'Customer Service': ['Complaint Handling', 'Active Listening', 'CRM Management', 'Email Support', 'Chat Support'],
  'Virtual Assistance': ['Calendar Management', 'Email Management', 'Data Entry', 'Google Workspace'],
  Accounting: ['Bookkeeping', 'QuickBooks', 'Financial Reporting', 'Excel'],
  Teaching: ['Lesson Planning', 'Classroom Management', 'Student Assessment'],
  Nursing: ['Patient Care', 'Vital Signs Monitoring', 'Medication Administration', 'Basic Life Support'],
  Sales: ['Lead Generation', 'Negotiation', 'CRM Management', 'Upselling'],
  'Digital Marketing': ['Social Media Marketing', 'Search Engine Optimization', 'Google Ads', 'Content Marketing'],
  'Graphic Design': ['Adobe Photoshop', 'Adobe Illustrator', 'Canva'],
  'Project Management': ['Agile', 'Scrum', 'Stakeholder Management', 'Jira'],
  'Data Analysis': ['Excel', 'SQL', 'Power BI', 'Data Visualization'],
}

// Common skills by job title words, for when the profile has a title but little else.
export const ROLE_SKILLS = [
  [/front.?end|web dev|ui dev/i, ['HTML', 'CSS', 'JavaScript', 'React', 'Responsive Design', 'Git']],
  [/back.?end/i, ['REST APIs', 'SQL', 'Database Design', 'Authentication', 'Git']],
  [/full.?stack|software|developer|programmer|engineer/i, ['JavaScript', 'Git', 'REST APIs', 'SQL', 'Problem Solving']],
  [/design/i, ['Figma', 'UI Design', 'UX Design', 'Graphic Design', 'Canva']],
  [/customer|csr|call center|support|agent/i, ['Customer Service', 'Active Listening', 'Complaint Handling', 'CRM Management', 'Communication']],
  [/virtual assistant|admin|secretary|clerk/i, ['Virtual Assistance', 'Calendar Management', 'Data Entry', 'Microsoft Office', 'Organization']],
  [/account|bookkeep|finance|audit/i, ['Accounting', 'Bookkeeping', 'Excel', 'Financial Reporting', 'Attention to Detail']],
  [/nurse|caregiver|medical|health/i, ['Patient Care', 'Vital Signs Monitoring', 'Basic Life Support', 'Empathy']],
  [/teacher|tutor|instructor|educat/i, ['Teaching', 'Lesson Planning', 'Classroom Management', 'Communication']],
  [/sales|business develop/i, ['Sales', 'Lead Generation', 'Negotiation', 'CRM Management']],
  [/market|social media|content/i, ['Digital Marketing', 'Social Media Marketing', 'Content Writing', 'Canva']],
  [/hr|human resource|recruit/i, ['Recruitment', 'Onboarding', 'Employee Relations', 'Labor Law Compliance']],
  [/data|analyst/i, ['Data Analysis', 'Excel', 'SQL', 'Power BI']],
  [/project manager|scrum|product/i, ['Project Management', 'Agile', 'Stakeholder Management', 'Jira']],
]

export const SKILL_CATEGORY = new Map(
  Object.entries(SKILL_GROUPS).flatMap(([cat, list]) => list.map((name) => [name.toLowerCase(), cat])),
)
export const ALL_SKILLS = [...new Set(Object.values(SKILL_GROUPS).flat())]
