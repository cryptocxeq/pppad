/** “Do this now” groups mapped to real checklist item IDs in requirements tasks. */

export type PracticalChecklistItem = {
  id: string;
  label: string;
  checklistIds: string[];
  /** Primary task to jump to from the milestone UI */
  taskId?: string;
};

export type PracticalChecklistGroup = {
  id: string;
  label: string;
  items: PracticalChecklistItem[];
};

export const practicalChecklistGroups: PracticalChecklistGroup[] = [
  {
    id: "urgent",
    label: "Urgent / immediate",
    items: [
      {
        id: "pc-aa-done",
        label: "Confirm Assessment A was already submitted in PebblePad Assets",
        checklistIds: ["aa-confirm-submitted"],
        taskId: "assessment-a-verify",
      },
      {
        id: "pc-aa-late",
        label: "If Assessment A not submitted — contact tutor/programme leader immediately",
        checklistIds: ["aa-late-contact"],
        taskId: "assessment-a-verify",
      },
      {
        id: "pc-b-docx",
        label: "Finish Assessment B as Word (.docx), not PDF",
        checklistIds: ["ab-docx"],
        taskId: "assessment-b-essay",
      },
      {
        id: "pc-b-deadline",
        label: "Submit Assessment B by 27 May 2026, 14:00 GMT",
        checklistIds: ["ab-upload"],
        taskId: "assessment-b-essay",
      },
      {
        id: "pc-b-shared",
        label: "Check PebblePad Assets — Assessment B shared with tutor",
        checklistIds: ["ab-shared"],
        taskId: "assessment-b-essay",
      },
      {
        id: "pc-log",
        label: "Complete, sign, scan Teaching Log as PDF; prove 60 days / 120 hrs / groups 8+",
        checklistIds: ["tel-signed", "tel-pdf", "tel-upload", "tel-days", "tel-hours", "tel-groups"],
        taskId: "teaching-log-complete",
      },
      {
        id: "pc-perm",
        label: "School permission form signed and sent to Juliet",
        checklistIds: ["sp-sent"],
        taskId: "school-permission",
      },
    ],
  },
  {
    id: "before-upload",
    label: "Before final upload (Assessment B)",
    items: [
      {
        id: "pc-words",
        label: "~3000 words in main body; title and references excluded",
        checklistIds: ["ab-words"],
        taskId: "assessment-b-essay",
      },
      {
        id: "pc-harvard",
        label: "One UWE Harvard reference list; no footnotes",
        checklistIds: ["ab-harvard", "ab-no-footnotes"],
        taskId: "assessment-b-essay",
      },
      {
        id: "pc-anon",
        label: "Essay and appendices anonymised (school, staff, pupils)",
        checklistIds: ["anon-school", "anon-staff", "anon-pupils", "anon-appendices"],
        taskId: "assessment-b-anonymise",
      },
      {
        id: "pc-ai",
        label: "AI use acknowledged if used",
        checklistIds: ["ai-ack"],
        taskId: "ai-acknowledgement",
      },
      {
        id: "pc-screenshot",
        label: "Screenshot of upload confirmation saved",
        checklistIds: ["ab-screenshot"],
        taskId: "assessment-b-essay",
      },
      {
        id: "pc-tutor-access",
        label: "Tutor can access uploaded files / video links",
        checklistIds: ["ab-tutor-access", "aa-tutor-access"],
        taskId: "assessment-a-verify",
      },
    ],
  },
  {
    id: "video",
    label: "If submitting / checking video (Assessment A)",
    items: [
      {
        id: "pc-panopto-link",
        label: "Panopto link works and tutor has access",
        checklistIds: ["aatr-shared", "aa-tutor-access"],
        taskId: "assessment-a-teaching-recording",
      },
      {
        id: "pc-audio",
        label: "Audio works (handbook: may go to retake if not)",
        checklistIds: ["aa-audio-works"],
        taskId: "assessment-a-teaching-recording",
      },
      {
        id: "pc-consent",
        label: "Recording consent/permissions handled",
        checklistIds: ["pan-school", "pan-consent", "pan-exclude"],
        taskId: "panopto-compliance",
      },
      {
        id: "pc-agreement",
        label: "Student recording agreement checkbox ticked",
        checklistIds: ["aa-agreement"],
        taskId: "assessment-a-verify",
      },
      {
        id: "pc-focus",
        label: "Recording focuses on you as the teacher",
        checklistIds: ["aatr-focus-teacher"],
        taskId: "assessment-a-teaching-recording",
      },
    ],
  },
];
