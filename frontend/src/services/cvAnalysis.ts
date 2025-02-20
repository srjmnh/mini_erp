import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for pdf.js to use local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';

export interface CVAnalysisResult {
  summary: {
    overview: string;
    insights: string[];
    strengths: string[];
    areasOfImprovement: string[];
  };
  verdict: {
    recommendation: "Strong Hire" | "Potential Hire" | "Consider with Reservations" | "Do Not Proceed";
    confidenceScore: number;
    reasonsToHire: string[];
    reasonsForCaution: string[];
    nextSteps: string[];
  };
  skills: {
    technical: { skill: string; proficiency: "Expert" | "Advanced" | "Intermediate" | "Beginner" }[];
    soft: { skill: string; evidence: string }[];
    relevanceScore: number;
    gapAnalysis: {
      missingCriticalSkills: string[];
      skillsNeedingImprovement: string[];
    };
  };
  experience: {
    years: number;
    relevantYears: number;
    companies: string[];
    roles: string[];
    details: {
      company: string;
      role: string;
      duration: string;
      achievements: string[];
      technologies: string[];
      impact: {
        description: string;
        metrics: string[];
      };
    }[];
    progressionAnalysis: {
      careerGrowth: "Strong" | "Moderate" | "Limited";
      observations: string[];
    };
  };
  education: {
    degree: string;
    field: string;
    institutions: string[];
    graduationYear: number;
    details: {
      institution: string;
      ranking: string;
      location: string;
      achievements: string[];
      researchWork?: string;
      relevanceToRole: "High" | "Medium" | "Low";
    }[];
  };
  jobMatch: {
    overallScore: number;
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    cultureFitScore: number;
    technicalAssessmentScore: number;
  };
}

// Common technical skills to look for (for local analysis)
const technicalSkills = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'react', 'angular', 'vue',
  'node.js', 'express', 'mongodb', 'sql', 'aws', 'docker', 'kubernetes', 'git',
  'html', 'css', 'rest api', 'graphql', 'agile', 'scrum', 'ci/cd', 'testing'
];

// Common soft skills to look for (for local analysis)
const softSkills = [
  'communication', 'leadership', 'teamwork', 'problem solving', 'time management',
  'adaptability', 'creativity', 'critical thinking', 'collaboration', 'organization',
  'presentation', 'analytical', 'project management', 'attention to detail'
];

const extractTextFromPDF = async (pdfUrl: string): Promise<string> => {
  try {
    // Fetch the PDF file as ArrayBuffer
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/pdf'
      }
    });

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: response.data });
    const pdf = await loadingTask.promise;

    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + ' ';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

const analyzeWithDeepseek = async (cvText: string, jobDescription: string): Promise<CVAnalysisResult> => {
  try {
    const prompt = `
You are an expert HR professional and CV analyst with very high standards. Please analyze this CV in detail and provide a comprehensive analysis with strict evaluation criteria.

Scoring Guidelines:
1. Technical Skills (40% of overall score)
   - Expert: 95-100%
   - Advanced: 80-94%
   - Intermediate: 60-79%
   - Beginner: <60%
   - Missing critical skills results in significant penalties

2. Experience (35% of overall score)
   - Relevant experience is weighted 3x more than non-relevant
   - Impact and metrics are crucial
   - Career progression must show clear growth
   - Leadership and project ownership are highly valued

3. Education (15% of overall score)
   - Top 50 Global University: 90-100%
   - Top 100 Global University: 80-89%
   - Top 200 Global University: 70-79%
   - Others: Based on reputation and program relevance
   - Recent graduates: Higher weight on education
   - Experienced candidates: Lower weight on education

4. Cultural Fit & Soft Skills (10% of overall score)
   - Evidence-based evaluation only
   - Must demonstrate with specific examples
   - Team collaboration and communication are critical

Verdict Guidelines:
- Strong Hire (90%+): Exceptional candidate exceeding in all areas
- Potential Hire (75-89%): Strong candidate with minor gaps
- Consider with Reservations (60-74%): Notable concerns but potential
- Do Not Proceed (<60%): Significant gaps or misalignment

Please analyze the CV and provide a detailed report in ONLY JSON format following this structure:
{
  "summary": {
    "overview": "Comprehensive profile analysis",
    "insights": ["unique aspects"],
    "strengths": ["key strengths with evidence"],
    "areasOfImprovement": ["specific areas needing development"]
  },
  "verdict": {
    "recommendation": "Strong Hire|Potential Hire|Consider with Reservations|Do Not Proceed",
    "confidenceScore": 0-100,
    "reasonsToHire": ["specific, evidence-based reasons"],
    "reasonsForCaution": ["specific concerns or risks"],
    "nextSteps": ["recommended next steps in hiring process"]
  },
  "skills": {
    "technical": [
      {
        "skill": "skill name",
        "proficiency": "Expert|Advanced|Intermediate|Beginner"
      }
    ],
    "soft": [
      {
        "skill": "skill name",
        "evidence": "specific example or evidence"
      }
    ],
    "relevanceScore": strict 0-100 score,
    "gapAnalysis": {
      "missingCriticalSkills": ["critical missing skills"],
      "skillsNeedingImprovement": ["skills needing development"]
    }
  },
  "experience": {
    "years": total years,
    "relevantYears": relevant years,
    "companies": ["company names"],
    "roles": ["role titles"],
    "details": [
      {
        "company": "company name",
        "role": "job title",
        "duration": "time period",
        "achievements": ["quantified achievements"],
        "technologies": ["specific tools used"],
        "impact": {
          "description": "impact description",
          "metrics": ["quantifiable metrics"]
        }
      }
    ],
    "progressionAnalysis": {
      "careerGrowth": "Strong|Moderate|Limited",
      "observations": ["specific observations"]
    }
  },
  "education": {
    "degree": "highest degree",
    "field": "field of study",
    "institutions": ["institution names"],
    "graduationYear": year,
    "details": [
      {
        "institution": "name",
        "ranking": "current ranking",
        "location": "city, country",
        "achievements": ["specific achievements"],
        "researchWork": "if applicable",
        "relevanceToRole": "High|Medium|Low"
      }
    ]
  },
  "jobMatch": {
    "overallScore": strict 0-100 score,
    "skillsMatch": strict 0-100 score,
    "experienceMatch": strict 0-100 score,
    "educationMatch": strict 0-100 score,
    "cultureFitScore": strict 0-100 score,
    "technicalAssessmentScore": strict 0-100 score
  }
}

CV Text:
${cvText}

Job Description:
${jobDescription}
`;

    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const analysisText = response.data.choices[0].message.content;
    console.log('Raw Deepseek response:', analysisText);

    // Clean up the response by removing any markdown or code block syntax
    const cleanJson = analysisText
      .replace(/```json\n?/g, '')  // Remove ```json
      .replace(/```\n?/g, '')      // Remove closing ```
      .trim();                     // Remove any extra whitespace

    console.log('Cleaned JSON:', cleanJson);
    
    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Failed to parse JSON:', cleanJson);
      throw parseError;
    }
  } catch (error) {
    console.error('Error in Deepseek analysis:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    throw error;
  }
};

const analyzeLocally = (text: string, jobDescription: string): CVAnalysisResult => {
  // Extract skills
  const words = text.toLowerCase().split(/\W+/);
  const wordSet = new Set(words);
  
  const technical = technicalSkills.filter(skill => 
    wordSet.has(skill.toLowerCase()) || text.toLowerCase().includes(skill.toLowerCase())
  );
  
  const soft = softSkills.filter(skill => 
    wordSet.has(skill.toLowerCase()) || text.toLowerCase().includes(skill.toLowerCase())
  );

  // Extract years
  const yearPattern = /(\d{4})|(\d+)\s*years?/gi;
  const yearMatches = text.match(yearPattern) || [];
  const years = yearMatches
    .map(y => parseInt(y.replace(/\D/g, '')))
    .filter(y => y > 1900 && y <= new Date().getFullYear());

  let experienceYears = 0;
  if (years.length >= 2) {
    const sortedYears = years.sort((a, b) => a - b);
    experienceYears = sortedYears[sortedYears.length - 1] - sortedYears[0];
  }

  // Calculate basic match score
  const skillMatchCount = technical.length + soft.length;
  const maxSkills = technicalSkills.length + softSkills.length;
  const matchScore = Math.round((skillMatchCount / maxSkills) * 100);

  return {
    summary: {
      overview: 'Not specified',
      insights: [],
      strengths: [],
      areasOfImprovement: []
    },
    verdict: {
      recommendation: 'Consider with Reservations',
      confidenceScore: 50,
      reasonsToHire: [],
      reasonsForCaution: [],
      nextSteps: []
    },
    skills: {
      technical: technical.map(skill => ({ skill, proficiency: 'Intermediate' })),
      soft: soft.map(skill => ({ skill, evidence: 'Not specified' })),
      relevanceScore: matchScore,
      gapAnalysis: {
        missingCriticalSkills: [],
        skillsNeedingImprovement: []
      }
    },
    experience: {
      years: Math.max(1, experienceYears),
      relevantYears: Math.max(1, Math.floor(experienceYears * 0.7)),
      companies: [],
      roles: [],
      details: [],
      progressionAnalysis: {
        careerGrowth: 'Moderate',
        observations: []
      }
    },
    education: {
      degree: 'Not specified',
      field: 'Not specified',
      institutions: [],
      graduationYear: new Date().getFullYear(),
      details: []
    },
    jobMatch: {
      overallScore: matchScore,
      skillsMatch: matchScore,
      experienceMatch: Math.min(100, experienceYears * 10),
      educationMatch: 50, // Default value
      cultureFitScore: 50, // Default value
      technicalAssessmentScore: 50 // Default value
    }
  };
};

export const analyzeCVWithAI = async (
  cvUrl: string,
  jobDescription: string
): Promise<CVAnalysisResult> => {
  try {
    // Extract text from PDF
    const cvText = await extractTextFromPDF(cvUrl);
    
    try {
      // First try Deepseek analysis
      return await analyzeWithDeepseek(cvText, jobDescription);
    } catch (deepseekError) {
      console.warn('Deepseek analysis failed, falling back to local analysis:', deepseekError);
      // Fall back to local analysis if Deepseek fails
      return analyzeLocally(cvText, jobDescription);
    }
  } catch (error) {
    console.error('Error analyzing CV:', error);
    throw error;
  }
};
