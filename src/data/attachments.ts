export interface AttachmentCase {
  category: string;
  preview: string;
  hint: string;
  reveal: string;
}
export const attachmentCases: AttachmentCase[] = [
  {
    category: "Exam Schedule",
    preview: "Course / Date / Start time / Room",
    hint: "It tells you when and where each examination happens.",
    reveal:
      "Two exams were initially scheduled at once. Students declined to become parallel processors.",
  },
  {
    category: "Seat Plan",
    preview: "Hall B / Row C / Desk 12 / Leave one seat empty",
    hint: "It assigns a desk inside an examination hall.",
    reveal:
      "Your chair has been planned in more detail than your learning outcomes.",
  },
  {
    category: "Holiday Notice",
    preview: "Classes suspended Thursday. Makeup classes: Thursday.",
    hint: "The heading announces a day off. The footnote has other ambitions.",
    reveal:
      "A holiday, with compulsory attendance. The calendar has requested clarification.",
  },
  {
    category: "Course Registration",
    preview: "Credits: 3 / Prerequisite: passed / Available seats: 0",
    hint: "It handles enrollment in courses for the next semester.",
    reveal:
      "The course is mandatory. Enrollment is impossible. Graduation remains your responsibility.",
  },
  {
    category: "Scholarship",
    preview: "Merit award / Income declaration / Application fee: ৳500",
    hint: "It offers financial support, after an unusually expensive application.",
    reveal:
      "The fee for requesting financial help has been waived. Finance calls this a radical interpretation of “help.”",
  },
  {
    category: "Campus Transport",
    preview: "Route 03 / Departure 07:30 / Campus arrival 08:20",
    hint: "It lists the university bus routes and departure times.",
    reveal:
      "First class: 08:00. Bus arrival: 08:20. The attendance policy blames neither document.",
  },
  {
    category: "Exam Warning",
    preview: "Phones prohibited. Admit card available only by QR code.",
    hint: "It lists examination rules and prohibited items.",
    reveal:
      "A printed admit card is now accepted. The contradiction has been escorted out of the hall.",
  },
  {
    category: "Cafeteria Menu",
    preview: "Rice / Dal / Egg / Tea / Prices in taka",
    hint: "It tells you what lunch costs. No academic credits involved.",
    reveal:
      "One document states what is available, when, and at what cost. It has been referred for best-practice review.",
  },
];
export const obsoleteJokes = [
  "Accurate yesterday. A respectable achievement.",
  "The word “final” has tenure. This file does not.",
  "An older version archived. Useful, technically.",
  "Historically correct. Currently superseded.",
];
export const inboxReceipts = [
  "One source of truth. An unusually ambitious campus initiative.",
  "The destination is clear. The purpose of three earlier emails remains unclear.",
  "You compared evidence instead of memorizing the filename. Full marks.",
  "A newer timestamp beats a louder subject line. Even in ALL CAPS.",
  "The obsolete copies are archived. History has not been erased; only unpinned.",
  "Six clear answers. No bonus marks for unnecessary suffering.",
];
