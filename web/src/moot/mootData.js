// Problem data, bench lines and memorial scaffolding for Moot Court. Ported 1:1 from the owner's reference build
// (docs/design/moot-2026-10-24/source/App Moot.dc.html). One problem is open; the other two are listed as not open.
export const PROBLEMS = [
  { id: 'p1', title: 'Arjun Mehra v. State of Rajasthan', open: true },
  { id: 'p2', title: 'Riya Sen v. Union of India', open: false },
  { id: 'p3', title: 'Kavya Textiles v. Om Exports', open: false },
];

export const FACTS = [
  'Arjun Mehra, 34, runs a payments start-up in Jaipur.',
  'In March 2026 an investor complains that ₹1.2 crore was diverted; an FIR is registered under s. 318(4) BNS (cheating and dishonestly inducing delivery of property).',
  'Arjun joins the investigation twice in April and hands over the company\'s bank statements.',
  'The police issue no notice of appearance and seek custodial interrogation, saying documents may be destroyed.',
  'The Sessions Court refuses anticipatory bail under s. 482 BNSS, calling the offence "economic and grave".',
  'Arjun applies to the High Court under s. 482 BNSS. He has no prior record and his passport is with the police.',
  'The complainant alleges Arjun contacted two employees who are witnesses.',
  'The State argues protection, if granted, must end when the charge-sheet is filed.',
];
export const KEY_FACTS = [2, 3, 4, 5, 6, 7]; // ground truth: paragraphs 3 to 8 (zero-based)

export const SUGGESTED_ISSUES = [
  'Whether the appellant is entitled to anticipatory bail under s. 482 BNSS.',
  'Whether the seriousness of an economic offence alone justifies refusing protection.',
  'Whether protection, if granted, should end on filing of the charge-sheet.',
  'What conditions are adequate to address the risk of contacting witnesses.',
  'Whether the FIR should be quashed.',
];
// The State's framing of the same five issues, in the same order, so a saved issue number means the same topic on either side.
// The Respondent opposes anticipatory bail: custody, the witness allegation, the time limit and, only if protection is granted, conditions.
export const SUGGESTED_ISSUES_RES = [
  'Whether the appellant is entitled to anticipatory bail under s. 482 BNSS.',
  'Whether the gravity of an economic offence of this size, and the need for custodial interrogation, justify refusing protection.',
  'Whether protection, if granted, should end on filing of the charge-sheet.',
  'What conditions under s. 482(2) BNSS should attach if protection is granted, given the allegation that he contacted witnesses.',
  'Whether the FIR should be quashed.',
];
export const suggestedIssues = (side) => (side === 'Res' ? SUGGESTED_ISSUES_RES : SUGGESTED_ISSUES);
export const CORE_ISSUES = [1, 2, 3];
export const QUASH_ISSUE = 4;
// Keywords that mark a suggested issue as covered by the student's spoken answers.
export const ISSUE_KEYWORDS = [
  ['bail', '482', 'anticipatory'],
  ['economic', 'custod', 'serious', 'grave', 'interrogat'],
  ['charge-sheet', 'charge sheet', 'time', 'limit', 'sushila'],
  ['condition', 'passport', 'witness', 'contact'],
  ['quash'],
];

export const SIDES = [['App', 'Appellant'], ['Res', 'Respondent']];
export const SIDE_NAME = { App: 'the appellant', Res: 'the State' };
export const SIDE_LABEL = { App: 'FOR THE APPELLANT', Res: 'FOR THE STATE' };

export const QUESTIONS = {
  App: [
    'Counsel, the offence is economic and the amount is large. Why should we not let the police interrogate him in custody?',
    'The State says he contacted two witnesses. How do you answer that?',
    'If we grant protection, why should it not end when the charge-sheet is filed?',
  ],
  Res: [
    'Counsel for the State, he joined the investigation twice. What will custody add?',
    'Is there any material, beyond the complaint, that he contacted witnesses?',
    'Sushila Aggarwal says protection need not be time-limited. Why should we limit it here?',
  ],
};
// The bench's first words. The Respondent has read the appellant's memorial and the State's reply to it.
export const openingLine = (side) => (side === 'Res'
  ? 'The court is in session. Counsel for the State, we have read the appellant\'s memorial and your memorial in reply.'
  : 'The court is in session. Counsel for the appellant, we have read your memorial.');
export const FOLLOW_UPS = [
  'Hmm. And what about P. Chidambaram, where anticipatory bail was refused in an economic offence?',
  'Would your client accept a condition on that?',
  'Very well. Conclude, counsel.',
];
export const ACKNOWLEDGEMENTS = ['Noted, counsel.', 'Yes. That is helpful.', 'Very well.'];

// Sample answers used only when the microphone is unavailable. Always labelled as samples on screen.
// Appellant samples are the reference build's. The Respondent samples are written for this build in the same register.
export const SAMPLE_ANSWERS = {
  App: [
    'My Lords, the appellant joined the investigation twice and produced every bank statement. In Arnesh Kumar, the existence of the power to arrest is one thing, the justification for its exercise is quite another, and the State has shown nothing that custody would add.',
    'My Lords, there is no material beyond the complaint that he contacted any witness. Even so, he will undertake not to contact any witness, and this court may make that a condition.',
    'No, My Lords. The Constitution Bench in Sushila Aggarwal held that protection need not end on filing of the charge-sheet. Conditions such as surrender of passport address any concern.',
  ],
  Res: [
    'My Lords, this is an economic offence of ₹1.2 crore. Under Chidambaram custodial interrogation may be needed, and the documents may be destroyed. First, joining twice does not show what remains in his hands.',
    'My Lords, the complainant alleges that he contacted two employees who are witnesses. The State asks the court to examine that material, and any protection must carry strict conditions under s. 482(2): no contact with witnesses, and no leaving India without permission.',
    'My Lords, Sushila Aggarwal permits this Court, where there are specific facts, to tie protection to an event. The allegation that he contacted two witnesses is such a fact, so protection should last until the charge-sheet is filed. In the alternative, the Court may impose conditions under s. 482(2).',
  ],
};
export const DICTATION_SAMPLE = 'My Lords, the appellant joined the investigation twice and produced every bank statement. In Arnesh Kumar, the existence of the power to arrest is one thing, the justification for its exercise is quite another, and the State has shown nothing custody would add. He will accept conditions, including surrender of passport.';

// Respondent version of JUDGE_COMMENTS[1][1] (review B14): the Appellant line is wrong-sided for the State.
export const JUDGE_COMMENT_AUTHORITY_RES = 'Good use of Chidambaram. Meet Arnesh Kumar and Sushila Aggarwal before we raise them.';
// Guidance shown to the Respondent only, per memorial section. No draft text: the Respondent writes the memorial.
export const MEMORIAL_GUIDE_RES = {
  cover: 'Memorial on behalf of the Respondent: the State of Rajasthan.',
  juris: 'Say the Respondent accepts the court hears the matter under s. 482 BNSS, or state any objection you can fairly raise.',
  facts: 'Neutral, in paragraphs, only from the proposition. Include what the State relies on: the amount, the refusal below and the witness allegation.',
  summary: 'One paragraph per issue, in answer to the appellant: why custody adds something, and why protection should be limited or conditioned.',
  args: 'Answer the appellant issue by issue. Lead with why custodial interrogation is needed, meet Arnesh Kumar and Sushila Aggarwal, and rely on s. 482(2) conditions in the alternative.',
  prayer: 'Ask the court to reject the application. In the alternative, ask for conditions under s. 482(2), for example no contact with witnesses.',
};
export const CRITERIA = ['Legal reasoning', 'Use of authority', 'Answers the question', 'Structure', 'Court manner'];
// One line per criterion: [when the average is below 7, when it is 7 or above].
export const JUDGE_COMMENTS = [
  ['Build the answer in steps: the rule, the facts, then your conclusion.', 'Your reasoning moves in clear steps.'],
  ['You did not cite any authority on custody. That is the first thing the bench wants.', 'Good use of Arnesh Kumar. Distinguish Chidambaram earlier, before we raise it.'],
  ['Answer the question asked first, counsel. Then make your point.', 'You answered the question put to you.'],
  ['Number your points: first, second, because, therefore. Slow down on your second point.', 'Your points were easy to follow.'],
  ['On witnesses, offer concrete conditions instead of denying the allegation.', 'Manner was courteous.'],
];

export const STAGES = [
  ['problem', 'Problem', 'Read and mark facts'],
  ['issues', 'Issues', 'Frame what to argue'],
  ['research', 'Research', 'Authorities board'],
  ['memorial', 'Memorial', 'Draft and format'],
  ['oral', 'Oral round', 'Text round with the bench'],
  ['live', 'Live audio hearing', 'Speak with the bench'],
  ['score', 'Scorecard', 'Feedback and ranking'],
];
export const JUDGES = [['J1', 'Presiding judge'], ['J2', 'Judge 2'], ['J3', 'Judge 3']];

export const MEMORIAL_SECTIONS = [
  ['cover', 'Cover page', 'Team code, court, case name, side.'],
  ['index', 'Index of authorities', 'Built from your research board.'],
  ['juris', 'Statement of jurisdiction', 'Under which provision the court hears this.'],
  ['facts', 'Statement of facts', 'Neutral, in paragraphs, only from the proposition.'],
  ['issues', 'Issues raised', 'From your issues list.'],
  ['summary', 'Summary of arguments', 'One paragraph per issue.'],
  ['args', 'Arguments advanced', 'Issue → rule → application, with citations.'],
  ['prayer', 'Prayer', 'Exactly what you ask the court to do.'],
];

export const COVER = {
  App: "TEAM CODE: 014\nBEFORE THE HON'BLE HIGH COURT OF RAJASTHAN\nArjun Mehra … Appellant\nv.\nState of Rajasthan … Respondent\nMEMORIAL ON BEHALF OF THE APPELLANT",
  Res: "TEAM CODE: 014\nBEFORE THE HON'BLE HIGH COURT OF RAJASTHAN\nArjun Mehra … Appellant\nv.\nState of Rajasthan … Respondent\nMEMORIAL ON BEHALF OF THE RESPONDENT",
};
export const JURISDICTION = "The Appellant has approached this Hon'ble Court under Section 482 of the Bharatiya Nagarik Suraksha Sanhita, 2023.";
// "Suggest a draft" text, from the reference. Written for the Appellant only; there is no Respondent draft.
export const DRAFTS = {
  facts: "1. The Appellant, Arjun Mehra, runs a payments company in Jaipur.\n2. In March 2026 an investor alleged that ₹1.2 crore had been diverted, and an FIR was registered under Section 318(4) of the Bharatiya Nyaya Sanhita, 2023 (cheating and dishonestly inducing delivery of property).\n3. The Appellant joined the investigation on two occasions in April 2026 and produced the company's bank statements.\n4. No notice of appearance was issued. The investigating agency sought custodial interrogation.\n5. The Sessions Court refused anticipatory bail. The Appellant has no prior record and his passport is with the police.",
  summary: 'The Appellant has cooperated with the investigation, and custody adds nothing to it (Arnesh Kumar). Protection under Section 482 need not end on filing of the charge-sheet (Sushila Aggarwal, on s. 438 CrPC, now s. 482 BNSS). Any risk to witnesses is met by conditions.',
  args: 'I. THE APPELLANT IS ENTITLED TO ANTICIPATORY BAIL.\nThe existence of the power to arrest is one thing, the justification for its exercise is quite another (Arnesh Kumar v. State of Bihar). The Appellant joined the investigation twice and produced documents. The State has not shown what custodial interrogation would achieve that documents cannot. P. Chidambaram is distinguishable: it arose under the PMLA, and the Court, having seen the material the Directorate had collected, found custodial interrogation necessary at that stage of a money-laundering investigation. Here the Appellant has already produced the bank statements and joined the investigation twice.\nII. PROTECTION NEED NOT BE TIME-LIMITED.\nThe Constitution Bench in Sushila Aggarwal held that protection need not end with the charge-sheet; courts may impose conditions instead.',
  prayer: "It is most humbly prayed that this Hon'ble Court may be pleased to direct that, in the event of arrest, the Appellant be released on bail, subject to such conditions as this Court deems fit, including surrender of passport, non-contact with witnesses, and appearance before the investigating officer when required.",
};
