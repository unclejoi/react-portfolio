export const profile = {
  name: 'Joi Emmanuel U. Holgado',
  displayName: 'Joi Emmanuel Holgado',
  firstName: 'Joi',
  title: 'Senior Frontend Developer',
  email: 'joie.holgado08@gmail.com',
  phone: '+639999733598',
  phoneLabel: '+63 999 973 3598',
  location: 'Agoncillo, Batangas, Philippines',
  linkedin: 'https://www.linkedin.com/in/joiholgado/',
  resumeUrl: '/assets/joi-emmanuel-holgado-resume.pdf',
}

export interface Experience {
  company: string
  role: string
  period: string
  year: string
  tags: string[]
  description: string
  highlights: string[]
  current?: boolean
}

export const experiences: Experience[] = [
  {
    company: 'Cambridge University Press and Assessment',
    role: 'Senior Frontend Developer',
    period: 'January 2025 — Present',
    year: '2025',
    current: true,
    tags: ['React', 'TypeScript', 'Storybook'],
    description:
      'Building React applications and maintaining a documented design system, with a focus on testing and code quality.',
    highlights: [
      'Design and develop web applications using React and TypeScript.',
      'Build and maintain a design system, with component documentation in Storybook.',
      'Implement end-to-end and component testing using Jest and React Test Renderer.',
      'Maintain code quality through SonarQube analysis.',
      'Use GitHub Copilot and ElevenLabs to enhance development workflows.',
      'Assist backend development using Java, Spring Boot, and PostgreSQL.',
    ],
  },
  {
    company: 'Infor PSSC Inc.',
    role: 'Software Engineer',
    period: 'February 2022 — December 2024',
    year: '2022',
    tags: ['React', 'TypeScript', 'Cypress'],
    description:
      'Developed web applications and a React component library shared across teams, supported by automated end-to-end testing.',
    highlights: [
      'Designed and developed web applications using React and TypeScript.',
      'Developed a React component library for use by different teams.',
      'Performed end-to-end testing using Cypress and Selenium.',
    ],
  },
  {
    company: 'Accenture, Inc.',
    role: 'Software Engineer / Application Development Analyst',
    period: 'September 2021 — February 2022',
    year: '2021',
    tags: ['Frontend development', 'Jest', 'Enzyme'],
    description:
      'Created reusable frontend components and testable application code across different frontend technologies.',
    highlights: [
      'Designed and developed web applications using different frontend technologies.',
      'Wrote well-designed, testable code and reusable, modular components.',
      'Wrote unit test scripts using Jest and Enzyme.',
    ],
  },
  {
    company: 'Xurpas Enterprise Inc.',
    role: 'Junior Web Developer',
    period: 'November 2019 — September 2021',
    year: '2019',
    tags: ['HTML', 'CSS', 'Backend integration'],
    description:
      'Built website interfaces, integrated backend services and databases, and maintained software documentation.',
    highlights: [
      'Wrote well-designed, testable code using software development best practices.',
      'Created website layouts and interfaces using standard HTML and CSS practices.',
      'Integrated data from backend services and databases.',
      'Created and maintained software documentation.',
    ],
  },
  {
    company: 'Teravibe.com',
    role: 'Frontend Developer',
    period: 'January 2019 — October 2019',
    year: '2019',
    tags: ['Angular', 'TypeScript', 'Backend integration'],
    description:
      'Developed Angular applications and collaborated with clients and teammates to define software requirements.',
    highlights: [
      'Designed and developed web applications using Angular and TypeScript.',
      'Integrated data from backend services.',
      'Collaborated with the team and client to define software specifications and requirements.',
    ],
  },
]

export const skillGroups: {
  name: string
  description: string
  skills: string[]
}[] = [
  {
    name: 'Frontend',
    description: 'Web applications and reusable interface components.',
    skills: ['React', 'Redux', 'Angular', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'SCSS'],
  },
  {
    name: 'Testing & quality',
    description: 'Unit, component, and end-to-end testing, alongside code analysis.',
    skills: ['Jest', 'React Test Renderer', 'Cypress', 'Selenium', 'Enzyme', 'SonarQube'],
  },
  {
    name: 'Design & collaboration',
    description: 'Design system documentation, design tools, and team workflows.',
    skills: ['Storybook', 'Figma', 'Jira', 'Agile Scrum'],
  },
  {
    name: 'Cloud & workflow',
    description: 'Cloud platforms, development tools, and supporting backend technologies.',
    skills: [
      'Microsoft Azure',
      'AWS S3',
      'AWS CloudFront',
      'AWS EC2',
      'Git',
      'Postman',
      'GitHub Copilot',
      'ElevenLabs',
      'Java',
      'Spring Boot',
      'PostgreSQL',
    ],
  },
]

export const education = {
  degree: 'Bachelor’s Degree — Information Technology',
  school: 'Batangas State University',
  location: 'Brgy. Alangilan, Batangas City',
}
