// "Export memorial (DOCX)": builds an editable Word file from the memorial sections. The library loads only on click.
const slug = 'moot-memorial';
export async function exportMemorial({ side, sections }) {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import('docx');
  const body = sections.flatMap((s) => [
    new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: s.title !== sections[0].title, children: [new TextRun(s.title)] }),
    ...(s.text || '').split('\n').map((line) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun(line)] })),
  ]);
  body.push(new Paragraph({ spacing: { before: 360 }, children: [new TextRun({ italics: true, color: '805B10', text: 'Authorities in the index come from the practice research board. Check each citation against the law report before you submit.' })] }));
  const doc = new Document({
    creator: 'Banthry Prep', title: `Memorial on behalf of the ${side === 'Res' ? 'Respondent' : 'Appellant'}`,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: [{ children: body }],
  });
  const { saveBlob } = await import('../drafting-lab/downloads');
  saveBlob(await Packer.toBlob(doc), `${slug}-${side === 'Res' ? 'respondent' : 'appellant'}.docx`);
}
