import type { CategoryMeta } from "@/types";

export const categories: CategoryMeta[] = [
  {
    id: "compliance",
    label: "Compliance",
    description: "School permission and induction requirements",
    icon: "shield",
  },
  {
    id: "assessment-a",
    label: "Assessment A",
    description: "25% — teaching recording + 12-min presentation",
    icon: "video",
  },
  {
    id: "assessment-b",
    label: "Assessment B",
    description: "75% — 3000-word philosophy essay (.docx)",
    icon: "file-text",
  },
  {
    id: "teaching-log",
    label: "Teaching Log",
    description: "60 days / 120 contact hours — required to complete",
    icon: "calendar",
  },
  {
    id: "panopto",
    label: "Panopto",
    description: "Recording, safeguarding, and sharing rules",
    icon: "mic",
  },
  {
    id: "ai-policy",
    label: "AI & Plagiarism",
    description: "Acknowledge assistive AI use in submissions",
    icon: "sparkles",
  },
  {
    id: "formative",
    label: "Formative",
    description: "Planning pages that support A/B (optional submission)",
    icon: "lightbulb",
  },
  {
    id: "reference",
    label: "Reference",
    description: "Deadlines, CE dates, handbook — not separate submissions",
    icon: "book",
  },
];
