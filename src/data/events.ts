import type { OfficeEvent } from "../types";
export const officeEvents: OfficeEvent[] = [
  {
    title: "The schedule is ready.",
    body: "Six departments. One spreadsheet. A fleeting sense of possibility. How shall we announce the examinations?",
    choices: [
      {
        label: "One clear email. Dates, rooms, and what changed.",
        outcome:
          "The printer sighs. It had prepared for a much longer evening.",
        effects: { clarity: 20, confusion: -10, authority: 5 },
        professional: true,
      },
      {
        label: "“Please find attached.”",
        outcome: "Succinct. Mysterious. Technically a complete sentence.",
        effects: { attachments: 1, confusion: 12, authority: 8 },
      },
      {
        label: "Send now. Revise after tea.",
        outcome: "A schedule with a shelf life shorter than your tea.",
        effects: { revision: 1, confusion: 10, threat: 3 },
      },
    ],
  },
  {
    title: "A student asks which version is current.",
    body: "There are now three files named FINAL. One of them is a lunch menu.",
    choices: [
      {
        label: "Pin the current version with a timestamp.",
        outcome:
          "Everyone understands. You briefly consider a career in communication.",
        effects: { clarity: 18, confusion: -12 },
        professional: true,
      },
      {
        label: "Reply: “Kindly read carefully.”",
        outcome:
          "The student reads carefully. The lunch menu remains excellent.",
        effects: { authority: 12, threat: 8, confusion: 7 },
      },
      {
        label: "Create FINAL_ACTUALLY_CURRENT.pdf",
        outcome: "A fourth final enters the historical record.",
        effects: { revision: 1, attachments: 1, confusion: 10 },
      },
    ],
  },
  {
    title: "Correct answer. Unfamiliar wording.",
    body: "A grading appeal arrives. The student explained the concept correctly, but did not reproduce the lecture slide. The rubric says “understanding.”",
    choices: [
      {
        label: "Send it for rechecking against the actual rubric.",
        outcome:
          "The answer survives without resembling the slide. A brief constitutional crisis.",
        effects: { clarity: 18, confusion: -10, threat: -5 },
        professional: true,
      },
      {
        label: "Only the exact slide wording deserves full marks.",
        outcome:
          "The learning outcome is now copy-paste. The brochure still says critical thinking.",
        effects: { authority: 12, clarity: -8, confusion: 12 },
      },
      {
        label: "Add “independent thinkers” to the prospectus.",
        outcome:
          "Independent thought has been approved for marketing purposes only.",
        effects: { authority: 8, attachments: 1, confusion: 5 },
      },
    ],
  },
  {
    title: "The bus is late. The student is absent.",
    body: "The university bus reaches campus at 08:20. Class begins at 08:00. Attendance below 75% blocks the exam. Both documents are official.",
    choices: [
      {
        label: "Fix the bus time. Excuse the affected arrivals.",
        outcome:
          "The timetable and the attendance policy meet for the first time.",
        effects: { clarity: 20, confusion: -15, authority: -3 },
        professional: true,
      },
      {
        label: "Advise students to arrive before their bus.",
        outcome:
          "The transport office adds time travel to the list of student responsibilities.",
        effects: { authority: 12, threat: 10, confusion: 12 },
      },
      {
        label: "Issue a circular defining 08:20 as “not late.”",
        outcome: "The clock disagrees. It is issued a show-cause notice.",
        effects: { revision: 1, attachments: 1, confusion: 8 },
      },
    ],
  },
  {
    title: "The lab report looks excellent.",
    body: "The lab equipment is out of order. Students are asked to submit screenshots of successful experiments. The submission portal works beautifully.",
    choices: [
      {
        label: "Offer working equipment or an honest simulation.",
        outcome:
          "Students perform an experiment. The report briefly reflects an event that occurred.",
        effects: { clarity: 20, confusion: -12, authority: 5 },
        professional: true,
      },
      {
        label: "Award marks for margins and spiral binding.",
        outcome:
          "The experiment failed. The formatting graduated with distinction.",
        effects: { authority: 10, clarity: -10, confusion: 10 },
      },
      {
        label: "Accept last year’s screenshots as “standard results.”",
        outcome:
          "Reproducibility reaches 100%. Nobody has touched the apparatus.",
        effects: { attachments: 2, confusion: 8, threat: 5 },
      },
    ],
  },
  {
    title: "Financial help has an entry fee.",
    body: "The need-based scholarship form costs ৳500 to submit. A student asks why proving a shortage of money requires a payment.",
    choices: [
      {
        label: "Waive the fee. Publish the eligibility criteria.",
        outcome:
          "Finance asks who approved removing a barrier. You attach the purpose of a scholarship.",
        effects: { clarity: 20, confusion: -10, authority: -5 },
        professional: true,
      },
      {
        label: "Create a waiver application for the application fee.",
        outcome:
          "The waiver requires a certified copy of the original fee receipt.",
        effects: { attachments: 2, revision: 1, confusion: 15 },
      },
      {
        label: "Describe the fee as a “commitment indicator.”",
        outcome:
          "A barrier has acquired a motivational name. Its height remains unchanged.",
        effects: { authority: 10, clarity: -10, confusion: 10 },
      },
    ],
  },
  {
    title: "The CGPA question.",
    body: "An employer asks what graduates can do. The transcript offers a decimal. Someone asks whether grades are everything.",
    choices: [
      {
        label: "Grades matter. So does helping students learn.",
        outcome:
          "A remarkably reasonable statement. The giant stamp nods in approval.",
        effects: { clarity: 20, authority: 10, confusion: -10 },
        professional: true,
      },
      {
        label: "Reach slowly for the giant stamp.",
        outcome:
          "“At UPR, CGPA matters.” The stamp lands. Even the stapler applauds.",
        effects: { authority: 20, threat: 10 },
      },
      {
        label: "Refer the question to an attachment.",
        outcome: "The attachment is a picture of another attachment.",
        effects: { attachments: 2, confusion: 10 },
      },
    ],
  },
  {
    title: "The day is almost over.",
    body: "One final email remains. You have the rare opportunity to make “final” mean something.",
    choices: [
      {
        label: "Summarize today. Pin one source of truth.",
        outcome:
          "A student closes their inbox and goes outside. You have done well.",
        effects: { clarity: 20, confusion: -20 },
        professional: true,
      },
      {
        label: "“Please disregard the previous disregard.”",
        outcome:
          "The record is corrected. The correction will be corrected tomorrow.",
        effects: { revision: 2, confusion: 15 },
      },
      {
        label: "Schedule one more email for 11:59 PM.",
        outcome: "The send button has been placed on administrative leave.",
        effects: { threat: 15, authority: 10 },
      },
    ],
  },
];
