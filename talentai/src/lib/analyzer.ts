import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type Candidate = {
  id: string;
  fileName: string;
  text: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  education: string[];
  experience: string[];
  years: number | null;
  score: number;
  skillScore: number;
  experienceScore: number;
  keywordScore: number;
  matched: string[];
  missing: string[];
  keywords: string[];
};

const SKILLS = [
  'JavaScript','TypeScript','React','Vue.js','Angular','Node.js','Python','Java','C#','C++','Go','Ruby','PHP','SQL','PostgreSQL','MySQL','MongoDB','AWS','Azure','GCP','Docker','Kubernetes','CI/CD','Git','Agile','Scrum','Project Management','Product Management','Product Strategy','Roadmapping','Data Analysis','Analytics','A/B Testing','Figma','UX Design','UI Design','HTML','CSS','Machine Learning','Generative AI','NLP','TensorFlow','PyTorch','Excel','Power BI','Tableau','Salesforce','Marketing','SEO','Content Strategy','Financial Analysis','Leadership','Communication','Customer Research','REST APIs','GraphQL','Linux','Terraform','Jira','PowerPoint',
];

const STOPWORDS = new Set('the and for with from this that have your will are was were into about their they our you all can job role work team across using including ability strong plus required requirements experience years'.split(' '));
const roleCatalog: { title: string; skills: string[]; color: string; query: string }[] = [
  { title:'Frontend Developer', skills:['JavaScript','TypeScript','React','HTML','CSS','Vue.js','Angular'], color:'bg-blue', query:'frontend developer' },
  { title:'Product Manager', skills:['Product Management','Product Strategy','Roadmapping','Analytics','A/B Testing','Agile','Leadership'], color:'bg-green', query:'product manager' },
  { title:'Data Analyst', skills:['SQL','Python','Data Analysis','Analytics','Tableau','Power BI','Excel'], color:'bg-orange', query:'data analyst' },
  { title:'Full-stack Engineer', skills:['JavaScript','TypeScript','React','Node.js','SQL','REST APIs','Docker'], color:'bg-purple', query:'full stack developer' },
  { title:'Cloud / DevOps Engineer', skills:['AWS','Azure','GCP','Docker','Kubernetes','CI/CD','Terraform','Linux'], color:'bg-cyan', query:'devops cloud engineer' },
  { title:'UX Designer', skills:['Figma','UX Design','UI Design','Customer Research','Product Strategy'], color:'bg-yellow', query:'ux designer' },
  { title:'Machine Learning Engineer', skills:['Python','Machine Learning','TensorFlow','PyTorch','NLP','Generative AI'], color:'bg-blue', query:'machine learning engineer' },
  { title:'Technical Project Manager', skills:['Project Management','Agile','Scrum','Jira','Communication','Leadership'], color:'bg-green', query:'technical project manager' },
];

export async function readResume(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return (await file.text()).trim();
  if (ext === 'pdf') {
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '));
    }
    return pages.join('\n').trim();
  }
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value.trim();
  }
  throw new Error('This file type is not supported. Choose a PDF, DOCX, or TXT resume.');
}

function cleanSkill(skill: string) {
  return skill.toLowerCase().replace(/[^a-z0-9+#.]/g, '');
}

function extractKeywords(source: string): string[] {
  const found = SKILLS.filter((skill) => {
    const safe = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#])${safe}($|[^a-z0-9+#])`, 'i').test(source);
  });
  const tokens = source.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) ?? [];
  const extras = [...new Set(tokens.filter((token) => !STOPWORDS.has(token) && token.length > 3))]
    .filter((word) => source.toLowerCase().split(word).length > 2)
    .slice(0, 18)
    .map((word) => word[0].toUpperCase() + word.slice(1));
  return [...new Set([...found, ...extras])];
}

function inferName(text: string, fileName: string): string {
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const contactLine = lines.findIndex((line) => /@|linkedin|github|portfolio|resume|curriculum/i.test(line));
  for (const line of lines.slice(0, Math.max(contactLine, 5))) {
    if (line.length > 55 || /@|https?:|linkedin|resume|curriculum/i.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && words.every((word) => /^[A-Z][a-zA-Z'-]+$/.test(word))) return line;
  }
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\bresume\b/i, '').trim() || 'Candidate';
}

function inferExperienceYears(text: string): number | null {
  const explicit = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)(?:\s+of)?\s+(?:professional\s+)?experience/gi)]
    .map((match) => Number(match[1])).filter((n) => n < 55);
  if (explicit.length) return Math.max(...explicit);
  const dates = [...text.matchAll(/\b(19\d{2}|20\d{2})\s*(?:-|–|to|through)\s*(present|current|20\d{2})\b/gi)]
    .map((match) => [Number(match[1]), match[2].toLowerCase().startsWith('p') ? new Date().getFullYear() : Number(match[2])] as const);
  const years = dates.reduce((sum, [start, end]) => sum + Math.max(0, Math.min(30, end - start)), 0);
  return years > 0 ? Math.min(40, years) : null;
}

function extractSections(text: string, pattern: RegExp): string[] {
  return text.split(/\n/).map((line) => line.trim()).filter((line) => line.length > 2 && pattern.test(line));
}

export function analyzeCandidate(text: string, fileName: string, target: string, description: string): Candidate {
  const skills = SKILLS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#])${escaped}($|[^a-z0-9+#])`, 'i').test(text);
  });
  const years = inferExperienceYears(text);
  const requirementText = `${target} ${description}`.trim();
  let requiredSkills = requirementText ? extractKeywords(requirementText).filter((skill) => SKILLS.includes(skill)) : [];
  if (!requiredSkills.length && target) {
    const role = roleCatalog.find((item) => item.title.toLowerCase().includes(target.toLowerCase()) || target.toLowerCase().includes(item.title.toLowerCase()));
    requiredSkills = role?.skills ?? [];
  }
  const matched = requiredSkills.filter((skill) => skills.some((candidateSkill) => cleanSkill(candidateSkill) === cleanSkill(skill)));
  const missing = requiredSkills.filter((skill) => !matched.includes(skill));
  const candidateKeywords = extractKeywords(text);
  const requirementsKeywords = requirementText ? extractKeywords(requirementText) : [];
  const overlap = requirementsKeywords.filter((keyword) => candidateKeywords.some((candidate) => cleanSkill(candidate) === cleanSkill(keyword)));
  const skillScore = requiredSkills.length ? Math.round(matched.length / requiredSkills.length * 100) : Math.min(100, Math.round(skills.length / 12 * 100));
  const requestedYears = requirementText.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
  const experienceScore = requestedYears
    ? years === null ? 0 : Math.min(100, Math.round(years / Number(requestedYears[1]) * 100))
    : years === null ? 50 : Math.min(100, Math.round(years / 8 * 100));
  const keywordScore = requirementsKeywords.length
    ? Math.round(overlap.length / requirementsKeywords.length * 100)
    : Math.min(100, Math.round(candidateKeywords.length / 15 * 100));
  const score = Math.round(skillScore * .55 + experienceScore * .2 + keywordScore * .25);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? '';
  const education = extractSections(text, /\b(university|college|bachelor|master|ph\.?d|b\.?s\.?|m\.?s\.?|education|degree|diploma)\b/i).slice(0, 6);
  const experience = extractSections(text, /\b(19\d{2}|20\d{2}|experience|engineer|manager|developer|analyst|designer|consultant|director|intern|lead)\b/i).slice(0, 8);
  return {
    id: `${fileName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fileName, text, name: inferName(text, fileName), email, phone, skills, education, experience,
    years, score, skillScore, experienceScore, keywordScore, matched, missing, keywords: overlap,
  };
}

export function recommendRoles(skills: string[]) {
  return roleCatalog.map((role) => {
    const matches = role.skills.filter((skill) => skills.some((item) => cleanSkill(item) === cleanSkill(skill)));
    return { ...role, matches, score: Math.round(matches.length / role.skills.length * 100) };
  }).filter((role) => role.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
}

export function jobSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} jobs`)}`;
}
