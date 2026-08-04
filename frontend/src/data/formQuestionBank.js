/** Catégories affichées dans la banque de questions. */
export const FORM_QUESTION_CATEGORIES = [
  { id: 'personal', label: '1. Personal Information' },
  { id: 'academic', label: '2. Academic / Professional Information' },
  { id: 'participation', label: '3. Event Participation' },
  { id: 'team', label: '4. Team Information' },
  { id: 'skills', label: '5. Skills' },
  { id: 'logistics', label: '6. Logistics' },
  { id: 'consent', label: '7. Media & Consent' },
  { id: 'additional', label: '8. Additional Questions' },
  { id: 'hackathon', label: 'Hackathon' },
  { id: 'workshop', label: 'Workshop' },
];

/** Banque de questions prêtes à cocher / intégrer dans les formulaires. */
export const FORM_QUESTION_BANK = [
  // 1. Personal Information
  {
    id: 'q_full_name',
    category: 'personal',
    label: 'Full Name',
    type: 'text',
    required: true,
  },
  {
    id: 'q_email',
    category: 'personal',
    label: 'Email Address',
    type: 'text',
    required: true,
  },
  {
    id: 'q_phone',
    category: 'personal',
    label: 'Phone Number',
    type: 'text',
    required: true,
  },
  {
    id: 'q_dob',
    category: 'personal',
    label: 'Date of Birth',
    type: 'date',
    required: false,
  },
  {
    id: 'q_gender',
    category: 'personal',
    label: 'Gender',
    type: 'select',
    required: false,
    options: ['Female', 'Male', 'Prefer not to say', 'Other'],
  },

  // 2. Academic / Professional
  {
    id: 'q_university',
    category: 'academic',
    label: 'University / School',
    type: 'text',
    required: false,
  },
  {
    id: 'q_faculty',
    category: 'academic',
    label: 'Faculty / Department',
    type: 'text',
    required: false,
  },
  {
    id: 'q_level_study',
    category: 'academic',
    label: 'Level of Study',
    type: 'select',
    required: false,
    options: [
      '1st Year',
      '2nd Year',
      '3rd Year',
      'Engineering',
      "Master's",
      'PhD',
      'Other',
    ],
  },
  {
    id: 'q_major',
    category: 'academic',
    label: 'Field of Study / Major',
    type: 'text',
    required: false,
  },
  {
    id: 'q_company',
    category: 'academic',
    label: 'Company (if professionals are invited)',
    type: 'text',
    required: false,
  },
  {
    id: 'q_job_title',
    category: 'academic',
    label: 'Job Title',
    type: 'text',
    required: false,
  },

  // 3. Event Participation
  {
    id: 'q_why_participate',
    category: 'participation',
    label: 'Why do you want to participate in this event?',
    type: 'textarea',
    required: false,
  },
  {
    id: 'q_attended_before',
    category: 'participation',
    label: 'Have you attended this event before?',
    type: 'select',
    required: false,
    options: ['Yes', 'No'],
  },
  {
    id: 'q_heard_about',
    category: 'participation',
    label: 'How did you hear about this event?',
    type: 'select',
    required: false,
    options: [
      'Facebook',
      'Instagram',
      'LinkedIn',
      'Friend',
      'University',
      'Website',
      'Other',
    ],
  },
  {
    id: 'q_sessions_interest',
    category: 'participation',
    label: 'Which sessions/workshops are you interested in?',
    type: 'textarea',
    required: false,
  },
  {
    id: 'q_full_event',
    category: 'participation',
    label: 'Will you attend the full event?',
    type: 'select',
    required: false,
    options: ['Yes', 'No'],
  },

  // 4. Team Information
  {
    id: 'q_participation_mode',
    category: 'team',
    label: 'Are you participating individually or as a team?',
    type: 'select',
    required: false,
    options: ['Individual', 'Team'],
  },
  {
    id: 'q_team_name',
    category: 'team',
    label: 'Team Name',
    type: 'text',
    required: false,
  },
  {
    id: 'q_team_leader',
    category: 'team',
    label: 'Team Leader Name',
    type: 'text',
    required: false,
  },
  {
    id: 'q_team_size',
    category: 'team',
    label: 'Number of Team Members',
    type: 'number',
    required: false,
  },
  {
    id: 'q_team_members',
    category: 'team',
    label: "Team Members' Names",
    type: 'textarea',
    required: false,
  },

  // 5. Skills
  {
    id: 'q_technical_skills',
    category: 'skills',
    label: 'What are your technical skills?',
    type: 'multiselect',
    required: false,
    options: [
      'Programming',
      'AI/ML',
      'Web Development',
      'Mobile Development',
      'UI/UX Design',
      'Embedded Systems',
      'Cybersecurity',
      'Data Science',
      'Cloud Computing',
      'Other',
    ],
  },
  {
    id: 'q_languages',
    category: 'skills',
    label: 'Programming Languages',
    type: 'multiselect',
    required: false,
    options: ['Python', 'Java', 'C', 'C++', 'JavaScript', 'PHP', 'Other'],
  },
  {
    id: 'q_cv_link',
    category: 'skills',
    label: 'CV / resume link (optional)',
    type: 'text',
    required: false,
  },

  // 6. Logistics
  {
    id: 'q_dietary',
    category: 'logistics',
    label: 'Do you have any dietary restrictions?',
    type: 'text',
    required: false,
  },
  {
    id: 'q_accessibility',
    category: 'logistics',
    label: 'Do you require any accessibility accommodations?',
    type: 'text',
    required: false,
  },
  {
    id: 'q_tshirt',
    category: 'logistics',
    label: 'T-shirt Size',
    type: 'select',
    required: false,
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    id: 'q_emergency_name',
    category: 'logistics',
    label: 'Emergency Contact Name',
    type: 'text',
    required: false,
  },
  {
    id: 'q_emergency_phone',
    category: 'logistics',
    label: 'Emergency Contact Phone Number',
    type: 'text',
    required: false,
  },

  // 7. Media & Consent
  {
    id: 'q_terms',
    category: 'consent',
    label: "I agree to the event's Terms and Conditions.",
    type: 'checkbox',
    required: true,
  },
  {
    id: 'q_photo_consent',
    category: 'consent',
    label:
      'I agree to the use of my photos/videos taken during the event for promotional purposes.',
    type: 'checkbox',
    required: false,
  },
  {
    id: 'q_email_updates',
    category: 'consent',
    label: 'I consent to receive future event updates via email.',
    type: 'checkbox',
    required: false,
  },

  // 8. Additional
  {
    id: 'q_expectations',
    category: 'additional',
    label: 'What are your expectations from this event?',
    type: 'textarea',
    required: false,
  },
  {
    id: 'q_comments',
    category: 'additional',
    label: 'Do you have any questions or comments?',
    type: 'textarea',
    required: false,
  },

  // Hackathon
  {
    id: 'q_github',
    category: 'hackathon',
    label: 'GitHub Profile',
    type: 'text',
    required: false,
  },
  {
    id: 'q_linkedin',
    category: 'hackathon',
    label: 'LinkedIn Profile',
    type: 'text',
    required: false,
  },
  {
    id: 'q_portfolio',
    category: 'hackathon',
    label: 'Portfolio Website',
    type: 'text',
    required: false,
  },
  {
    id: 'q_years_experience',
    category: 'hackathon',
    label: 'Years of Experience',
    type: 'number',
    required: false,
  },
  {
    id: 'q_hackathons_before',
    category: 'hackathon',
    label: 'Have you participated in hackathons before?',
    type: 'select',
    required: false,
    options: ['Yes', 'No'],
  },
  {
    id: 'q_team_role',
    category: 'hackathon',
    label: 'Preferred Team Role',
    type: 'select',
    required: false,
    options: ['Developer', 'Designer', 'Project Manager', 'AI Engineer', 'Business'],
  },
  {
    id: 'q_preferred_tech',
    category: 'hackathon',
    label: 'Preferred Technologies',
    type: 'textarea',
    required: false,
  },

  // Workshop
  {
    id: 'q_knowledge_level',
    category: 'workshop',
    label: 'Current knowledge level',
    type: 'select',
    required: false,
    options: ['Beginner', 'Intermediate', 'Advanced'],
  },
  {
    id: 'q_hope_to_learn',
    category: 'workshop',
    label: 'What do you hope to learn?',
    type: 'textarea',
    required: false,
  },
  {
    id: 'q_laptop',
    category: 'workshop',
    label: 'Do you have a laptop?',
    type: 'select',
    required: false,
    options: ['Yes', 'No'],
  },
];

const ALLOWED_TYPES = ['text', 'textarea', 'number', 'select', 'checkbox', 'multiselect', 'date'];

export function toAdminField(field) {
  return {
    id: field.id,
    label: field.label,
    type: ALLOWED_TYPES.includes(field.type) ? field.type : 'text',
    required: !!field.required,
    options: Array.isArray(field.options) ? field.options.join(', ') : field.options || '',
    category: field.category || null,
  };
}

export function toApiFields(fields) {
  return (fields || [])
    .filter((f) => f.label && String(f.label).trim())
    .map((f) => ({
      id: f.id,
      label: String(f.label).trim(),
      type: ALLOWED_TYPES.includes(f.type) ? f.type : 'text',
      required: !!f.required,
      options: f.type === 'select' || f.type === 'multiselect' ? f.options : undefined,
    }));
}
