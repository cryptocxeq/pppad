import type { RequirementTask } from "@/types";

const WORKBOOK =
  "https://v3.pebblepad.co.uk/spa/#/workbook/gw56f9Zxhkttthh7x8rW7fn8fy";

export const requirements: RequirementTask[] = [
  {
    id: "ref-deadline-sources",
    category: "reference",
    title: "Deadline sources & conflicts (from full scrape)",
    summary:
      "Learning and Teaching workbook deadlines vs January schedule vs linked briefs. Treat each Assessment page as strongest source for this module.",
    priority: "medium",
    pebblePage: "Dates and live sessions",
    checklist: [
      { id: "ref-read-dates", label: "Reviewed which date applies to each assessment" },
    ],
    steps: [
      "Assessment A page: 25 March 2026, 14:00 GMT (strongest for this module).",
      "January course schedule: 18 March 2026 (conflicts with A page — prefer A page).",
      "Linked Assessment A brief: 18 December 2025 (September cohort — ignore for you).",
      "Assessment B page: 27 May 2026, 14:00 GMT — consistent with January schedule.",
      "Linked Assessment B brief: 11 February (old/September cohort — ignore).",
    ],
    warnings: [
      "All Assessment A dates are now past — only matters if disputing lateness.",
      "Use 27 May 2026, 14:00 GMT for Assessment B.",
    ],
  },
  {
    id: "ref-contextual-enquiry",
    category: "reference",
    title: "Contextual Enquiry (separate — not in this workbook)",
    summary:
      "January 2026 schedule shows later Contextual Enquiry assessments; detailed submission pages are not in this Learning and Teaching workbook.",
    priority: "low",
    pebblePage: "Dates and live sessions",
    checklist: [
      { id: "ref-ce-note", label: "Noted CE dates for later (not part of this tracker’s workbook scope)" },
    ],
    steps: [
      "Contextual Enquiry Assessment A: 30 September 2026 (schedule only).",
      "Contextual Enquiry Assessment B: 9 December 2026 (schedule only).",
      "February exam board: 11 January 2027 (schedule).",
      "Exact CE submission requirements are not in this scrape — track separately when that workbook is available.",
    ],
    warnings: [
      "This tracker focuses on Learning and Teaching module outputs only.",
    ],
  },
  {
    id: "school-permission",
    category: "compliance",
    title: "School permission agreement (required)",
    summary:
      "Information and Agreement for Students and Schools — signed by school, confirms teaching access and use of practice evidence; return to Juliet Edmonds.",
    priority: "critical",
    pebblePage: "School Permission form",
    contacts: [
      { label: "Return signed form to", value: "juliet.edmonds@uwe.ac.uk" },
    ],
    checklist: [
      { id: "sp-download", label: "Opened School Permission Form / Information and Agreement" },
      { id: "sp-details", label: "Student and school details completed" },
      { id: "sp-support", label: "School confirms support for your participation" },
      {
        id: "sp-access",
        label: "School confirms teaching access: 60 days, 120+ hours, groups 8+, direct teaching/support",
      },
      { id: "sp-evidence", label: "Form confirms school allows practice evidence (photos/video where consent met)" },
      { id: "sp-signed", label: "School/kindergarten representative has signed" },
      { id: "sp-sent", label: "Returned signed form to juliet.edmonds@uwe.ac.uk" },
    ],
    steps: [
      "Use the School Permission Form / Information and Agreement for Students and Schools.",
      "Fill student/school details and confirm the school supports participation.",
      "Confirm enough teaching access (typically 60 days, 120 hours, groups of 8+).",
      "Get the school/kindergarten representative to sign.",
      "Email the signed form to juliet.edmonds@uwe.ac.uk.",
    ],
    warnings: ["This is not optional — required for the course."],
  },
  {
    id: "assessment-a-verify",
    category: "assessment-a",
    title: "Verify Assessment A submission in PebblePad",
    summary:
      "Two linked parts (20-min teaching + 12-min presentation), agreement ticked, Assets shared — tutor must access recordings and audio must work.",
    weight: "25% of module mark",
    deadline: "2026-03-25T14:00:00+00:00",
    deadlineNote:
      "Assessment A page: 25 Mar 2026, 14:00 GMT (+48h no-penalty window, no IT support in window). January schedule shows 18 Mar — treat Assessment A page as source of truth. All dates are past; confirm submission or contact tutor immediately.",
    priority: "critical",
    pebblePage: "Assessment A",
    checklist: [
      { id: "aa-confirm-submitted", label: "Confirmed Assessment A already submitted in Assets" },
      { id: "aa-late-contact", label: "If not submitted — contacted tutor/programme leader" },
      { id: "aa-pres-upload", label: "12-min presentation in “Place holder for student presentation”" },
      {
        id: "aa-teach-link",
        label: "Teaching recording: title written, highlighted, Panopto link attached",
      },
      { id: "aa-agreement", label: "UWE recording guidelines agreement checkbox ticked" },
      { id: "aa-assets", label: "Checked PebblePad → Assets — submission visible" },
      { id: "aa-shared", label: "Shared/visible to tutor (use “i” → share if needed)" },
      { id: "aa-tutor-access", label: "Tutor can access both recording and presentation" },
      { id: "aa-audio-works", label: "Audio works on teaching recording (handbook: retake risk if not)" },
    ],
    steps: [
      "Go to Assessment A in PebblePad.",
      "Upload 12-min presentation to “Place holder for student presentation”.",
      "In “Link to my Teaching Recording”: type title, highlight, attach Panopto link (paperclip).",
      "Set Panopto share so tutor can view.",
      "Tick student agreement on recording guidelines.",
      "PebblePad → Assets → confirm visible and shared with tutor.",
    ],
    warnings: [
      "Handbook: your responsibility to ensure tutors can access recordings and sound works.",
      "Linked brief Dec 2025 is for another cohort — ignore for deadlines.",
    ],
  },
  {
    id: "assessment-a-teaching-recording",
    category: "assessment-a",
    title: "Part 1: 20-minute teaching recording (Panopto)",
    summary:
      "Record 20 minutes of class teaching on Panopto; secure link in PebblePad; tutor access and working audio are essential.",
    weight: "Part of Assessment A (25%)",
    priority: "critical",
    pebblePage: "Panopto Recording",
    checklist: [
      { id: "aatr-school-perm", label: "School/organisation permission before recording" },
      { id: "aatr-parent-consent", label: "Parent/carer consent if children may appear" },
      { id: "aatr-no-record-list", label: "Register of students who cannot be recorded checked each time" },
      { id: "aatr-trial", label: "Trial recording without children (if required)" },
      { id: "aatr-recorded", label: "~20 minutes of class teaching recorded" },
      { id: "aatr-focus-teacher", label: "Recording focuses on you as the teacher" },
      { id: "aatr-shared", label: "On Panopto with share settings allowing tutor access" },
      { id: "aatr-sound", label: "Sound checked and audible" },
    ],
    steps: [
      "Complete Panopto/safeguarding compliance first.",
      "Record ~20 minutes of your teaching; store on Panopto.",
      "Verify tutor can open the link and hear audio.",
      "Link from Assessment A with a clear title.",
    ],
    warnings: [
      "Non-consenting children must not appear; position them out of shot if needed.",
      "Audio is personal data — avoid pupil full names.",
    ],
  },
  {
    id: "assessment-a-presentation",
    category: "assessment-a",
    title: "Part 2: 12-minute recorded presentation",
    summary:
      "Reflect on teaching (behaviour management and/or effective teaching strategies); master’s-level critical analysis; max 12:00 — marking stops at 12 minutes.",
    weight: "Part of Assessment A (25%)",
    priority: "critical",
    pebblePage: "Assessment A",
    checklist: [
      {
        id: "aap-topic",
        label: "Focus: behaviour management and/or effective teaching strategies",
      },
      { id: "aap-reflect", label: "Reflection on your own teaching" },
      { id: "aap-link-session", label: "Links to the recorded teaching session" },
      {
        id: "aap-literature",
        label: "Readings: learning theories, behaviour theories, relevant literature",
      },
      {
        id: "aap-critical",
        label: "Critical analysis + alternative viewpoints from literature",
      },
      { id: "aap-level", label: "Theory/practice at master’s or level-6 expectations" },
      { id: "aap-length", label: "Does not exceed 12 minutes" },
      { id: "aap-uploaded", label: "Uploaded to presentation placeholder" },
    ],
    steps: [
      "Prepare presentation on required theme(s).",
      "Record (Panopto or PowerPoint → MP4 with audio).",
      "Upload to Assessment A; confirm Assets sharing.",
    ],
    warnings: ["Do not exceed 12 minutes — they stop marking at the 12-minute point."],
  },
  {
    id: "assessment-b-essay",
    category: "assessment-b",
    title: "Assessment B — philosophy essay (.docx)",
    summary:
      "“What is your philosophy on education?” — 3000 words, Word not PDF, UWE Harvard, critical theory–practice links, anonymised.",
    weight: "75% of module mark",
    deadline: "2026-05-27T14:00:00+00:00",
    deadlineNote:
      "27 May 2026, 14:00 GMT (+48h no-penalty window). Consistent with January schedule. Linked brief 11 Feb is old cohort — use 27 May. Word count: page excludes title/references; linked brief suggests tight body count — do not rely on hidden exclusions.",
    priority: "critical",
    pebblePage: "Assessment B",
    contacts: [{ label: "If sharing fails", value: "Siamak.alimi@uwe.ac.uk" }],
    checklist: [
      { id: "ab-front", label: "Front page: name, student number, subject/essay title" },
      {
        id: "ab-question",
        label: "Philosophy of education + literature + pedagogies + classroom practice",
      },
      { id: "ab-critical", label: "Critical analysis (not description); alternative viewpoints" },
      { id: "ab-words", label: "Main body tightly ~3000 words (title + refs excluded per page)" },
      { id: "ab-harvard", label: "One reference list, UWE Harvard, alphabetical" },
      { id: "ab-no-footnotes", label: "No footnotes" },
      { id: "ab-appendices", label: "Short appendices only if useful and cited in body" },
      { id: "ab-format", label: "Calibri 11, 1.15 spacing, left-aligned (per Assessment B page)" },
      { id: "ab-docx", label: "Saved and submitted as .docx — not PDF" },
      { id: "ab-anon", label: "School context anonymised in essay" },
      { id: "ab-upload", label: "Uploaded to “Place holder for student assignment”" },
      { id: "ab-shared", label: "Assets: shared/visible to tutor" },
      { id: "ab-screenshot", label: "Screenshot of upload confirmation saved" },
      { id: "ab-tutor-access", label: "Confirmed tutor can access the document" },
    ],
    steps: [
      "Structure: front page → essay (philosophy, literature, practice, pedagogies, critical discussion) → references → short appendices if needed.",
      "Discuss philosophy, theorists, beliefs in practice, pedagogies, critical analysis, anonymised context.",
      "Format per Assessment B page (Calibri 11 / 1.15) unless tutor directs otherwise.",
      "Upload .docx via “Upload new media or choose from existing assets”.",
      "Assets → share with tutor if not visible; contact Siamak if sharing fails.",
    ],
    warnings: [
      "Programme handbook generic style (Arial/TNR 12, 1.5) differs — prefer Assessment B page unless tutor says otherwise.",
      "Do not email tutor just to confirm upload; leaders check at deadline.",
    ],
  },
  {
    id: "assessment-b-anonymise",
    category: "assessment-b",
    title: "Anonymisation (essay + appendices)",
    summary:
      "No school name, teacher/pupil names, or distinguishable features — applies to main essay and all appendices.",
    priority: "high",
    checklist: [
      { id: "anon-school", label: "No school name" },
      { id: "anon-staff", label: "No teacher names" },
      { id: "anon-pupils", label: "No pupil names" },
      { id: "anon-class", label: "No distinguishable school/class identifiers" },
      { id: "anon-media", label: "No identifiable photos/screenshots" },
      { id: "anon-work", label: "No identifiable pupil work or location" },
      { id: "anon-appendices", label: "Appendices anonymised (feedback, observations, log excerpts)" },
    ],
  },
  {
    id: "teaching-log-complete",
    category: "teaching-log",
    title: "Teaching Experience Log (required to complete course)",
    summary:
      "60 days, 120 contact hours, groups >8, plan–teach–assess; weekly mentor sign-off; signed PDF uploaded and referenced with final assignment.",
    priority: "critical",
    pebblePage: "Teaching Experiences-Log",
    checklist: [
      { id: "tel-template", label: "Downloaded IPGCE Professional Practice Log template" },
      { id: "tel-days", label: "60 days of teaching/supporting learning evidenced" },
      { id: "tel-hours", label: "120 hours contact time evidenced" },
      { id: "tel-groups", label: "Groups larger than 8 learners" },
      { id: "tel-pta", label: "Sessions planned, taught, and assessed (you or with teacher support)" },
      {
        id: "tel-fields",
        label: "Fields complete: subject/age, duration, led/group/individual, targets, evaluation, IPGCE link",
      },
      { id: "tel-signed", label: "Regular school staff/mentor signatures (ideally weekly)" },
      { id: "tel-pdf", label: "Signed log scanned/exported as PDF" },
      { id: "tel-upload", label: "PDF uploaded to Teaching Experiences Log page" },
      {
        id: "tel-appendix-b",
        label: "Copy or reference included with Assessment B appendices if required",
      },
    ],
    steps: [
      "Fill log regularly during placement.",
      "Get mentor/teacher to sign (ideally weekly).",
      "Scan signed log to PDF.",
      "Upload to Teaching Log page when signed.",
      "Keep standalone PDF and include/reference as Assessment B appendix per page guidance.",
    ],
    warnings: [
      "Page states you cannot complete the course without this log.",
      "Assessment B main file must remain .docx; log stays separate PDF.",
    ],
  },
  {
    id: "panopto-compliance",
    category: "panopto",
    title: "Panopto & recording compliance (Assessment A)",
    summary:
      "Permissions, consent, safeguarding, trial recording, safe equipment, share only as agreed with UWE/tutor.",
    priority: "high",
    pebblePage: "Panopto Recording",
    checklist: [
      { id: "pan-school", label: "Organisation/school permission obtained" },
      { id: "pan-consent", label: "Parent/carer consent where children may appear" },
      { id: "pan-register", label: "Register of students who cannot be recorded — checked each use" },
      { id: "pan-exclude", label: "Non-consenting children not filmed / out of shot" },
      { id: "pan-privacy", label: "Minimal personal data; no pupil full names in audio" },
      { id: "pan-purpose", label: "Purpose agreed with mentor and/or university tutor" },
      { id: "pan-trial", label: "Trial recording without children where appropriate" },
      { id: "pan-safety", label: "Equipment visible, safe, not a trip hazard" },
      { id: "pan-share", label: "Shared only as agreed with UWE/tutor" },
      { id: "pan-uwe-purpose", label: "Understood: recordings for professional development per workbook" },
    ],
    steps: [
      "Complete all pre-recording checks before Assessment A filming.",
      "Use UWE Panopto; set tutor-accessible sharing.",
      "Link from Assessment A with titled Panopto URL.",
    ],
  },
  {
    id: "ai-acknowledgement",
    category: "ai-policy",
    title: "AI use — assistive only; acknowledge if used",
    summary:
      "AI may edit/structure/translate/feedback on your work — you must still find, read, and reference real literature; acknowledge AI use; inappropriate use has caused failures.",
    priority: "medium",
    pebblePage: "AI and Plagiarism",
    checklist: [
      { id: "ai-reviewed", label: "Reviewed whether AI assisted Assessment A or B" },
      { id: "ai-ack", label: "Acknowledged AI use in submission if applicable" },
      { id: "ai-literature", label: "Located and critically engaged with real sources yourself" },
      { id: "ai-references", label: "References proper; not AI-generated claims without sources" },
    ],
    steps: [
      "Allowed assistive uses: editing, structuring, translation support, clarity/feedback on your content.",
      "You must still locate and critically use real research/literature.",
      "Acknowledge AI if used to prepare or produce any part of the work.",
    ],
    warnings: ["Inappropriate AI use has caused students to fail assessments."],
  },
  {
    id: "ref-units-formative",
    category: "reference",
    title: "Unit pages — preparation only (no separate submission)",
    summary:
      "Most unit/step pages support learning and Assessment A/B preparation; they are not separate formal submissions for this module.",
    priority: "low",
    checklist: [
      {
        id: "ref-units",
        label: "Understood unit pages are formative unless tutor requests otherwise",
      },
    ],
    warnings: [
      "Real required outputs: Assessment A, Assessment B, signed Teaching Log, school permission, recording/AI compliance.",
    ],
  },
  {
    id: "formative-assessment-a-plan",
    category: "formative",
    title: "Unit 5 — Planning for assignment (Assessment A)",
    summary: "Formative planning for Assessment A; optional tutor feedback on drafts.",
    priority: "low",
    pebblePage: "Step 5 Planning for assignment",
    checklist: [
      { id: "f-a-plan", label: "Draft/plan for Assessment A prepared" },
      { id: "f-a-feedback", label: "Optional tutor feedback sought if offered" },
    ],
  },
  {
    id: "formative-assessment-b-plan",
    category: "formative",
    title: "Unit 8 — Planning for the Assignment (Assessment B)",
    summary: "Formative planning and tutorial prep for philosophy essay.",
    priority: "low",
    pebblePage: "Planning for the Assignment",
    checklist: [
      { id: "f-b-plan", label: "Planning notes for essay drafted" },
      { id: "f-b-tutorial", label: "Tutorial preparation done" },
    ],
  },
  {
    id: "ref-module-handbook",
    category: "reference",
    title: "Module / Programme Handbook",
    summary: "Policies, marking, recording responsibilities — reference, not a separate upload.",
    priority: "low",
    pebblePage: "Module Handbook",
    checklist: [{ id: "ref-mh", label: "Reviewed handbook policies relevant to A/B and recordings" }],
  },
];

/** Recommended “do this now” order (May 2026). */
export const workflowOrder = [
  "assessment-a-verify",
  "assessment-b-essay",
  "assessment-b-anonymise",
  "teaching-log-complete",
  "school-permission",
  "assessment-a-teaching-recording",
  "assessment-a-presentation",
  "panopto-compliance",
  "ai-acknowledgement",
  "ref-deadline-sources",
] as const;

export const pebbleWorkbookUrl = WORKBOOK;
