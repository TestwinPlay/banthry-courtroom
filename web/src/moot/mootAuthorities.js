// Canned authorities for the Moot Court problem, from the owner's reference build
// (docs/design/moot-2026-10-24/source/App Moot.dc.html), corrected per docs/reviews/2026-10-25-moot-citation-verification.md.
// `verified: false` makes the UI show "Citation being checked". `verified: true` means the citation AND the "use" lines
// were read against the judgment / bare act in that review (Indian Kanoon; official text and the oil_corpus SQL check are
// still the owner's step, see docs/moot/MOOT-V2.md). Sushila stays false: its SCC page is unconfirmed.
//   stance: which side the authority helps ('App' = Appellant, 'Res' = Respondent).
//   use:    how the Appellant uses it (reference text). useRes: how the Respondent uses it or meets it.
export const AUTHORITIES = [
  { id: 'arnesh', name: 'Arnesh Kumar v. State of Bihar', cite: '(2014) 8 SCC 273', stance: 'App', verified: true, // review A1-A3: ARN, B35
    use: 'For offences punishable up to seven years, the police must be satisfied that arrest is necessary, not merely that the offence was committed. Argue that, having joined the investigation twice, he gives no ground of necessity.',
    useRes: 'Expect the Appellant to rely on it for "arrest only when necessary". Answer that necessity is shown here by the risk to witnesses.' },
  { id: 'sushila', name: 'Sushila Aggarwal v. State (NCT of Delhi)', cite: '29 Jan 2020, Constitution Bench', stance: 'App', verified: false, // review A4: SCC cite (2020) 5 SCC 1 unconfirmed (only AIR 2020 SC 831 seen); add it once SCC Online or the corpus confirms. A5-A6 use lines verified (SUS).
    use: "Protection need not end with the charge-sheet. Answers the State's time-limit argument.",
    useRes: 'Expect the Appellant to rely on it against a time limit. Press for conditions if protection is granted.' },
  { id: 'sibbia', name: 'Gurbaksh Singh Sibbia v. State of Punjab', cite: '(1980) 2 SCC 565', stance: 'App', verified: true, // review A7-A9: SIB
    use: 'Wide discretion under the anticipatory bail provision; no rigid limits.',
    useRes: 'Expect the Appellant to rely on it for wide discretion. Say the discretion is judicial and is exercised on the facts.' },
  { id: 'antil', name: 'Satender Kumar Antil v. CBI', cite: '(2022) 10 SCC 51', stance: 'App', verified: true, // review A10-A12: ANT paras 66, 73(b)-(c); SC order of 29 Mar 2023 confirms the cite
    use: 'Bail is the rule. Investigating agencies must comply with ss. 41 and 41A CrPC (now s. 35 BNSS) and Arnesh Kumar, and courts must check compliance; non-compliance entitles the accused to bail.',
    useRes: 'Expect the Appellant to rely on it for "bail is the rule". Antil\'s category guidelines govern bail when an accused appears after the charge-sheet. At the investigation stage, meet it by showing the s. 35 BNSS necessity test is satisfied, here the risk to witnesses. Beware: Antil (para 66) says it is not advisable to group all economic offences together and deny bail on that basis.' },
  { id: 'chid', name: 'P. Chidambaram v. Directorate of Enforcement', cite: '(2019) 9 SCC 24', stance: 'Res', verified: true, // review A13-A15: CHI paras 72, 76, 79, 81-82 (arose under the PMLA)
    use: 'Economic offences may need custodial interrogation. Expect the State to rely on it; distinguish on facts. It arose under the PMLA.',
    useRes: 'Economic offences may need custodial interrogation. Lead with it, then show why custody adds something here.' },
  { id: 's482', name: 'Section 482, BNSS 2023', cite: 'Statute', stance: 'App', verified: true, // review A16-A17, A20: B482 (bare act on Indian Kanoon; s. 482(1) lists no factors, conditions are in s. 482(2))
    use: 'The provision itself: the High Court or Court of Session may direct that, in the event of arrest for a non-bailable offence, he be released on bail, subject to conditions under s. 482(2).',
    useRes: 'The provision itself. Read the conditions in s. 482(2), especially (ii) on inducement or threats to witnesses, and ask for them if protection is granted.' },
];

export const authorityById = (id) => AUTHORITIES.find((a) => a.id === id);
/** True when the authority helps the side the student argues. */
export const helpsSide = (a, side) => a.stance === side;
