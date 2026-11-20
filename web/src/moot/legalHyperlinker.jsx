import React from 'react';

// Landmark cases database mapping with direct IndianKanoon URLs
export const KNOWN_CASES = {
  'arnesh kumar': {
    title: 'Arnesh Kumar v. State of Bihar',
    citation: '(2014) 8 SCC 273',
    url: 'https://indiankanoon.org/doc/29826274/',
    ratio: 'Mandatory arrest guidelines under Section 41A CrPC (now Section 35(3) BNSS); routine arrest barred for offenses <= 7 years.',
  },
  'satender kumar antil': {
    title: 'Satender Kumar Antil v. CBI',
    citation: '(2022) 10 SCC 51',
    url: 'https://indiankanoon.org/doc/195155694/',
    ratio: 'Comprehensive bail categories & guidelines; personal liberty safeguards.',
  },
  'gurbaksh singh sibbia': {
    title: 'Gurbaksh Singh Sibbia v. State of Punjab',
    citation: '(1980) 2 SCC 565',
    url: 'https://indiankanoon.org/doc/1301824/',
    ratio: 'Constitution Bench on anticipatory bail: discretion cannot be fettered by judicially created strictures.',
  },
  'sushila aggarwal': {
    title: 'Sushila Aggarwal v. State (NCT of Delhi)',
    citation: '(2020) 5 SCC 1',
    url: 'https://indiankanoon.org/doc/171507914/',
    ratio: 'Constitution Bench: Anticipatory bail cannot be restricted to a fixed duration mechanically.',
  },
  'p. chidambaram': {
    title: 'P. Chidambaram v. Directorate of Enforcement',
    citation: '(2020) 13 SCC 791',
    url: 'https://indiankanoon.org/doc/118314152/',
    ratio: 'Economic offenses constitute a class apart; pre-arrest protection requires rigorous scrutiny of flight risk & tampering.',
  },
  'balchand': {
    title: 'State of Rajasthan v. Balchand',
    citation: '(1977) 4 SCC 308',
    url: 'https://indiankanoon.org/doc/81615/',
    ratio: 'Landmark holding: "The basic rule may perhaps be tersely put as bail, not jail."',
  },
  'sanjay chandra': {
    title: 'Sanjay Chandra v. CBI',
    citation: '(2012) 1 SCC 40',
    url: 'https://indiankanoon.org/doc/1749870/',
    ratio: 'Detention in custody pending completion of trial is not punitive; bail is the norm.',
  },
  'dataram singh': {
    title: 'Dataram Singh v. State of U.P.',
    citation: '(2018) 3 SCC 22',
    url: 'https://indiankanoon.org/doc/111494879/',
    ratio: 'Bail is a rule and jail is an exception; humane approach required.',
  },
};

// Known statutory sections with canonical links
export const KNOWN_STATUTES = {
  '482 bnss': {
    label: 'Section 482 BNSS',
    title: 'Direction for grant of bail to person apprehending arrest (formerly s. 438 CrPC)',
    url: 'https://indiankanoon.org/search/?formInput=Section+482+Bharatiya+Nagarik+Suraksha+Sanhita',
  },
  '35(3) bnss': {
    label: 'Section 35(3) BNSS',
    title: 'Notice of appearance before police officer (formerly s. 41A CrPC)',
    url: 'https://indiankanoon.org/search/?formInput=Section+35%283%29+Bharatiya+Nagarik+Suraksha+Sanhita',
  },
  '35(1) bnss': {
    label: 'Section 35(1) BNSS',
    title: 'When police may arrest without warrant (formerly s. 41(1) CrPC)',
    url: 'https://indiankanoon.org/search/?formInput=Section+35%281%29+Bharatiya+Nagarik+Suraksha+Sanhita',
  },
  '73 bnss': {
    label: 'Section 73 BNSS',
    title: 'Warrant of arrest directed to any person (formerly s. 73 CrPC)',
    url: 'https://indiankanoon.org/search/?formInput=Section+73+Bharatiya+Nagarik+Suraksha+Sanhita',
  },
  '318(4) bns': {
    label: 'Section 318(4) BNS',
    title: 'Cheating and dishonestly inducing delivery of property (formerly s. 420 IPC)',
    url: 'https://indiankanoon.org/search/?formInput=Section+318%284%29+Bharatiya+Nyaya+Sanhita',
  },
  '316(2) bns': {
    label: 'Section 316(2) BNS',
    title: 'Punishment for criminal breach of trust (formerly s. 406 IPC)',
    url: 'https://indiankanoon.org/search/?formInput=Section+316%282%29+Bharatiya+Nyaya+Sanhita',
  },
  'article 21': {
    label: 'Article 21',
    title: 'Protection of life and personal liberty, Constitution of India',
    url: 'https://indiankanoon.org/doc/1199182/',
  },
};

/**
 * Returns canonical link for a statute or section string.
 */
export function getStatuteLink(statuteStr) {
  const clean = statuteStr.toLowerCase().replace(/[s\.\s]+/g, ' ').trim();
  for (const [k, v] of Object.entries(KNOWN_STATUTES)) {
    if (clean.includes(k) || k.includes(clean)) return v.url;
  }
  return `https://indiankanoon.org/search/?formInput=${encodeURIComponent(statuteStr + ' law india')}`;
}

/**
 * Returns canonical link for a case name.
 */
export function getCaseLink(caseName) {
  const clean = caseName.toLowerCase();
  for (const [k, v] of Object.entries(KNOWN_CASES)) {
    if (clean.includes(k)) return v.url;
  }
  return `https://indiankanoon.org/search/?formInput=${encodeURIComponent(caseName)}`;
}

/**
 * Pill component for statutes/sections.
 */
export function StatutePill({ statute, customStyle = {} }) {
  const link = getStatuteLink(statute);
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={`Click to read and check ${statute} on official law reports (opens in new tab)`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: '#fff7ed',
        color: '#c2410c',
        border: '1px solid #fed7aa',
        borderRadius: 6,
        padding: '3px 8px',
        fontSize: 12,
        fontWeight: 600,
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        ...customStyle,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#ffedd5';
        e.currentTarget.style.borderColor = '#c2410c';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fff7ed';
        e.currentTarget.style.borderColor = '#fed7aa';
      }}
    >
      <span>📜 {statute}</span>
      <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
    </a>
  );
}

/**
 * Scans a text string and wraps mentions of known legal sections and cases in clickable learning links.
 */
export function renderLegalText(text) {
  if (!text || typeof text !== 'string') return text;

  // Regex for sections like: Section 482 BNSS, s. 482 BNSS, Section 35(3) BNSS, Section 318(4) BNS, Article 21, etc.
  // And landmark cases like Arnesh Kumar, Satender Kumar Antil, Sushila Aggarwal, Balchand, Sibbia, Chidambaram
  const regex = /(Section\s+\d+(\(\d+\))?\s+(?:BNSS|BNS|CrPC|IPC)|s\.\s*\d+(\(\d+\))?\s*(?:BNSS|BNS|CrPC|IPC)|Article\s+21|Arnesh Kumar(?: v\. State of Bihar)?|Satender Kumar Antil(?: v\. CBI)?|Sushila Aggarwal(?: v\. State)?|Gurbaksh Singh Sibbia(?: v\. State of Punjab)?|P\. Chidambaram(?: v\. Directorate of Enforcement)?|State of Rajasthan v\. Balchand|Balchand)/gi;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0];
    const startIndex = match.index;

    // Push text preceding match
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    const lower = matchedText.toLowerCase();
    const isCase = lower.includes('kumar') || lower.includes('antil') || lower.includes('aggarwal') || lower.includes('sibbia') || lower.includes('chidambaram') || lower.includes('balchand');
    const link = isCase ? getCaseLink(matchedText) : getStatuteLink(matchedText);

    parts.push(
      <a
        key={startIndex}
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        title={`Click to read & learn about ${matchedText} on IndianKanoon (opens in new tab)`}
        style={{
          color: isCase ? '#0284c7' : '#c2410c',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {matchedText} <span style={{ fontSize: 9 }}>↗</span>
      </a>
    );

    lastIndex = regex.lastIndex;
  }

  // Push remainder text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
