import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import JSZip from "jszip";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  PageOrientation,
  BorderStyle,
  PageBorderOffsetFrom
} from "docx";

interface MCQ {
  num: number;
  stem: string;
  options: [string, string, string, string];
  isDevanagari: boolean;
}

const SAMPLE_QUESTIONS: MCQ[] = [
  {
    num: 1,
    stem: "वह कौन-सी संख्या है, जो पूर्ण संख्या है परन्तु प्राकृत संख्या नहीं है?",
    options: ["(A) 0", "(B) 1", "(C) -1", "(D) 2"],
    isDevanagari: true
  },
  {
    num: 2,
    stem: "What is the powerhouse of the cell? / कोशिका का ऊर्जा गृह (पावरहाउस) किसे कहा जाता है?",
    options: ["(A) Ribosome / राइबोसोम", "(B) Mitochondria / माइटोकॉन्ड्रिया", "(C) Golgi body / गॉल्जीकाय", "(D) Nucleus / केंद्रक"],
    isDevanagari: true
  },
  {
    num: 3,
    stem: "यदि 'WATER' को किसी कूट भाषा में 'XBUFS' लिखा जाता है, तो 'EARTH' को क्या लिखा जाएगा?",
    options: ["(A) FBSUI", "(B) FBUSI", "(C) FBSUJ", "(D) FCSTI"],
    isDevanagari: true
  },
  {
    num: 4,
    stem: "Which is the longest river in India? / भारत की सबसे लंबी नदी कौन-सी है?",
    options: ["(A) Yamuna / यमुना", "(B) Godavari / गोदावरी", "(C) Ganga / गंगा", "(D) Narmada / नर्मदा"],
    isDevanagari: true
  },
  {
    num: 5,
    stem: "'स्वराज मेरा जन्मसिद्ध अधिकार है और मैं इसे लेकर रहूंगा' यह प्रसिद्ध नारा किसने दिया था?",
    options: ["(A) बाल गंगाधर तिलक", "(B) महात्मा गांधी", "(C) सुभाष चंद्र बोस", "(D) भगत सिंह"],
    isDevanagari: true
  },
  {
    num: 6,
    stem: "If 15 workers can build a wall in 48 hours, how many workers will be required for the same work in 30 hours?",
    options: ["(A) 20 workers", "(B) 24 workers", "(C) 28 workers", "(D) 32 workers"],
    isDevanagari: false
  },
  {
    num: 7,
    stem: "'परोपकार' शब्द का सही संधि-विच्छेद क्या होगा?",
    options: ["(A) पर + उपकार", "(B) परो + पकार", "(C) पर + अपकार", "(D) परा + उपकार"],
    isDevanagari: true
  },
  {
    num: 8,
    stem: "When was the Constitution of India adopted? / भारतीय संविधान को किस दिन अंगीकृत किया गया था?",
    options: ["(A) 15 August 1947", "(B) 26 January 1950", "(C) 26 November 1949", "(D) 2 October 1948"],
    isDevanagari: true
  },
  {
    num: 9,
    stem: "प्रकाश संश्लेषण (Photosynthesis) की प्रक्रिया में पौधों द्वारा मुख्य रूप से कौन-सी गैस अवशोषित की जाती है?",
    options: ["(A) ऑक्सीजन (O2)", "(B) कार्बन डाइऑक्साइड (CO2)", "(C) नाइट्रोजन (N2)", "(D) हाइड्रोजन (H2)"],
    isDevanagari: true
  },
  {
    num: 10,
    stem: "Which keyboard shortcut is used to save a document in MS Word? / एमएस वर्ड में डॉक्यूमेंट सेव करने हेतु किस शॉर्टकट का प्रयोग किया जाता है?",
    options: ["(A) Ctrl + S", "(B) Ctrl + P", "(C) Ctrl + Z", "(D) Ctrl + C"],
    isDevanagari: true
  }
];

export async function runDocxSpike(): Promise<{
  docxPath: string;
  fileSizeBytes: number;
  xmlValidation: {
    hasA4Size: boolean;
    has2Columns: boolean;
    hasDoublePageBorder: boolean;
    hasHeader: boolean;
    hasFooter: boolean;
    hasHindiFontSlot: boolean;
    hasHindiText: boolean;
  };
  libreOfficeResult: {
    attempted: boolean;
    command: string;
    success: boolean;
    outputOrError: string;
    pdfGenerated: boolean;
  };
}> {
  const outDir = path.resolve("spikes/docx");
  fs.mkdirSync(outDir, { recursive: true });
  const docxPath = path.join(outDir, "bilingual-sample.docx");

  const children: Paragraph[] = [];

  // Section Heading
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 150 },
      children: [
        new TextRun({
          text: "खण्ड - अ : बहुविकल्पीय प्रश्न / SECTION - A : MULTIPLE CHOICE QUESTIONS",
          bold: true,
          size: 20, // 10pt
          font: { name: "Mangal", hint: "cs" }
        })
      ]
    })
  );

  // Add 10 questions with options
  for (const q of SAMPLE_QUESTIONS) {
    // Question stem
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({
            text: `प्र. ${q.num}. `,
            bold: true,
            size: 19, // 9.5pt
            font: { name: "Mangal", hint: "cs" }
          }),
          new TextRun({
            text: q.stem,
            bold: true,
            size: 19,
            font: { name: "Mangal", hint: "cs" }
          })
        ]
      })
    );

    // Options (2 per line or 4 inline)
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 100 },
        children: [
          new TextRun({
            text: `${q.options[0]}      ${q.options[1]}`,
            size: 18, // 9pt
            font: { name: "Mangal", hint: "cs" }
          })
        ]
      })
    );
    children.push(
      new Paragraph({
        spacing: { before: 0, after: 140 },
        children: [
          new TextRun({
            text: `${q.options[2]}      ${q.options[3]}`,
            size: 18, // 9pt
            font: { name: "Mangal", hint: "cs" }
          })
        ]
      })
    );
  }

  // Document Definition
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // 210mm (A4)
              height: 16838, // 297mm (A4)
              orientation: PageOrientation.PORTRAIT
            },
            margin: {
              top: 720, // 0.5 in / 12.7 mm
              right: 720,
              bottom: 720,
              left: 720,
              header: 500,
              footer: 500
            },
            borders: {
              pageBorders: {
                offsetFrom: PageBorderOffsetFrom.PAGE
              },
              pageBorderTop: { style: BorderStyle.DOUBLE, size: 4, space: 24, color: "000000" },
              pageBorderRight: { style: BorderStyle.DOUBLE, size: 4, space: 24, color: "000000" },
              pageBorderBottom: { style: BorderStyle.DOUBLE, size: 4, space: 24, color: "000000" },
              pageBorderLeft: { style: BorderStyle.DOUBLE, size: 4, space: 24, color: "000000" }
            }
          },
          column: {
            count: 2,
            space: 708 // ~1.25 cm gap between columns
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "PAPERSTUDIO COACHING ACADEMY",
                    bold: true,
                    size: 26, // 13pt
                    font: { name: "Times New Roman" }
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: "साप्ताहिक अभ्यास परीक्षा / Weekly Model Exam  |  कुल अंक: 50  |  समय: 60 मिनट",
                    size: 18, // 9pt
                    font: { name: "Mangal", hint: "cs" }
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "PaperStudio - Page ",
                    size: 16,
                    font: { name: "Times New Roman" }
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16
                  }),
                  new TextRun({
                    text: " of ",
                    size: 16,
                    font: { name: "Times New Roman" }
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16
                  })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docxPath, buffer);
  const fileSizeBytes = buffer.length;

  // Programmatic XML Validation via JSZip
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")!.async("string");
  const headerXml = zip.file("word/header1.xml") ? await zip.file("word/header1.xml")!.async("string") : "";
  const footerXml = zip.file("word/footer1.xml") ? await zip.file("word/footer1.xml")!.async("string") : "";

  const xmlValidation = {
    hasA4Size: docXml.includes('w:w="11906"') && docXml.includes('w:h="16838"'),
    has2Columns: docXml.includes('w:cols') && docXml.includes('w:num="2"'),
    hasDoublePageBorder: docXml.includes('w:pgBorders') && docXml.includes('w:val="double"'),
    hasHeader: headerXml.includes("PAPERSTUDIO COACHING ACADEMY"),
    hasFooter: footerXml.includes("w:fldSimple") || footerXml.includes("w:instrText"),
    hasHindiFontSlot: docXml.includes('w:cs="Mangal"') || docXml.includes('w:hint="cs"'),
    hasHindiText: docXml.includes("बहुविकल्पीय") && docXml.includes("माइटोकॉन्ड्रिया")
  };

  // Attempt LibreOffice headless conversion
  let libreOfficeResult = {
    attempted: true,
    command: `soffice --headless --convert-to pdf "${docxPath}" --outdir "${outDir}"`,
    success: false,
    outputOrError: "",
    pdfGenerated: false
  };

  try {
    const cmdOutput = execSync(libreOfficeResult.command, { stdio: "pipe", timeout: 15000 });
    libreOfficeResult.success = true;
    libreOfficeResult.outputOrError = cmdOutput.toString();
    const pdfPath = path.join(outDir, "bilingual-sample.pdf");
    libreOfficeResult.pdfGenerated = fs.existsSync(pdfPath);
  } catch (err: any) {
    libreOfficeResult.success = false;
    libreOfficeResult.outputOrError = err.message || String(err);
    libreOfficeResult.pdfGenerated = false;
  }

  return { docxPath, fileSizeBytes, xmlValidation, libreOfficeResult };
}

// CLI Execution
async function main() {
  console.log(`\n======================================================`);
  console.log(`   PAPERSTUDIO DOCX EXPORT SPIKE (docx package)`);
  console.log(`======================================================`);

  const result = await runDocxSpike();

  console.log(`DOCX Generated: ${result.docxPath}`);
  console.log(`File size:     ${result.fileSizeBytes} bytes`);

  console.log(`\n--- XML VALIDATION OF GENERATED DOCX ---`);
  console.log(`A4 Page Size (11906 x 16838 dxa):  ${result.xmlValidation.hasA4Size ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Two Columns (w:cols w:num="2"):    ${result.xmlValidation.has2Columns ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Double Page Border (w:pgBorders):   ${result.xmlValidation.hasDoublePageBorder ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Header with Institute Name:        ${result.xmlValidation.hasHeader ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Footer with Page Number fields:    ${result.xmlValidation.hasFooter ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Hindi Font Slots (w:cs, w:hint):   ${result.xmlValidation.hasHindiFontSlot ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Hindi Unicode Text Intact:         ${result.xmlValidation.hasHindiText ? "✅ PASS" : "❌ FAIL"}`);

  console.log(`\n--- LIBREOFFICE HEADLESS VERIFICATION ---`);
  console.log(`Command attempted: ${result.libreOfficeResult.command}`);
  if (result.libreOfficeResult.success) {
    console.log(`Status: ✅ SUCCESS (PDF generated: ${result.libreOfficeResult.pdfGenerated})`);
  } else {
    console.log(`Status: ⚠️  LibreOffice command failed or not installed:`);
    console.log(`   ${result.libreOfficeResult.outputOrError.split("\n")[0]}`);
    console.log(`   (Note: Per RULES.md, we document this limitation honestly; docx XML is verified directly).`);
  }

  const outDir = path.resolve("spikes/docx");
  const validationPath = path.join(outDir, "docx-validation.json");
  fs.writeFileSync(validationPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nValidation results written to: ${validationPath}`);
  console.log(`DOCX export spike completed.\n`);
}

main().catch((err) => {
  console.error("DOCX spike failed:", err);
  process.exit(1);
});
