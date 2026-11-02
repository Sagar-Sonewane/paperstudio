import { z } from "zod";

export const CURRENT_SCHEMA_VERSION = 1;

export const Id = z.string().min(1);
export type IdType = z.infer<typeof Id>;

export const RichText = z.object({
  html: z.string(), // sanitized subset: p, br, strong, em, sup, sub, ul, ol, li, img
  plain: z.string().optional()
});
export type RichTextType = z.infer<typeof RichText>;

export const Media = z.object({
  id: Id,
  filename: z.string(),
  mime: z.string(),
  blobKey: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  alt: z.string().default("")
});
export type MediaType = z.infer<typeof Media>;

export const AnswerOption = z.object({
  id: Id,
  label: z.string(),
  content: RichText,
  mediaId: Id.optional()
});
export type AnswerOptionType = z.infer<typeof AnswerOption>;

export const QuestionTypeEnum = z.enum(["mcq", "short", "long", "image"]);
export type QuestionType = z.infer<typeof QuestionTypeEnum>;

export const Question = z.object({
  kind: z.literal("question"),
  id: Id,
  type: QuestionTypeEnum,
  content: RichText,
  options: z.array(AnswerOption).default([]),
  marks: z.number().optional(),
  customNumber: z.string().optional(),
  mediaIds: z.array(Id).default([]),
  diagramId: Id.optional(),
  optionLayout: z.enum(["auto", "inline", "vertical", "two-column"]).default("auto"),
  review: z.object({
    confidence: z.number(),
    warnings: z.array(z.string())
  }).optional()
});
export type QuestionItem = z.infer<typeof Question>;

export const Heading = z.object({
  kind: z.literal("heading"),
  id: Id,
  content: RichText
});
export type HeadingItem = z.infer<typeof Heading>;

export const Instruction = z.object({
  kind: z.literal("instruction"),
  id: Id,
  content: RichText
});
export type InstructionItem = z.infer<typeof Instruction>;

export const Item = z.discriminatedUnion("kind", [Question, Heading, Instruction]);
export type PaperItem = z.infer<typeof Item>;

export const Section = z.object({
  id: Id,
  title: z.string(),
  instructions: RichText.optional(),
  items: z.array(Item) // explicit order
});
export type SectionType = z.infer<typeof Section>;

export const DiagramShape = z.object({
  id: Id,
  type: z.enum(["line", "arrow", "rect", "ellipse", "polygon", "text", "connector"]),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  stroke: z.string().default("#000000"),
  strokeWidth: z.number().default(1),
  fill: z.string().default("none"),
  label: z.string().optional(),
  // Generic properties dictionary for shape-specific data without using 'any'
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});
export type DiagramShapeType = z.infer<typeof DiagramShape>;

export const Diagram = z.object({
  id: Id,
  width: z.number(),
  height: z.number(),
  shapes: z.array(DiagramShape).default([]),
  svg: z.string(),
  questionId: Id.optional()
});
export type DiagramType = z.infer<typeof Diagram>;

export const LayoutSettings = z.object({
  page: z.object({
    size: z.enum(["A4", "Letter"]),
    orientation: z.enum(["portrait", "landscape"]),
    marginMm: z.object({
      t: z.number(),
      r: z.number(),
      b: z.number(),
      l: z.number()
    })
  }),
  columns: z.object({
    count: z.number().int().min(1).max(3),
    gapMm: z.number()
  }),
  typography: z.object({
    fontFamily: z.string(),
    questionPt: z.number(),
    optionPt: z.number(),
    headingPt: z.number(),
    lineHeight: z.number(),
    paragraphGapPt: z.number(),
    weight: z.number()
  }),
  questions: z.object({
    autoNumber: z.boolean(),
    numberFormat: z.string(),
    optionLabelStyle: z.string(),
    optionLayout: z.enum(["inline", "vertical", "two-column"]),
    optionGapPt: z.number(),
    questionGapPt: z.number(),
    showMarks: z.boolean()
  }),
  header: z.object({
    instituteName: z.string(),
    subtitle: z.string().optional(),
    logoMediaId: Id.optional(),
    fields: z.array(
      z.enum(["studentName", "guardianSignature", "date", "totalMarks", "marksObtained"])
    ),
    instructions: z.string().optional()
  }),
  footer: z.object({
    pageNumber: z.boolean(),
    pageCount: z.boolean()
  }),
  border: z.object({
    style: z.enum(["none", "single", "double"]),
    thicknessPt: z.number(),
    insetMm: z.number()
  }),
  bwMode: z.boolean()
});
export type LayoutSettingsType = z.infer<typeof LayoutSettings>;

export const Paper = z.object({
  id: Id,
  title: z.string(),
  meta: z.object({
    examName: z.string().optional(),
    date: z.string().optional(),
    totalMarks: z.number().optional(),
    durationMin: z.number().optional()
  }),
  sections: z.array(Section),
  templateId: z.string(),
  settings: LayoutSettings,
  schemaVersion: z.number(),
  createdAt: z.number(),
  updatedAt: z.number()
});
export type PaperType = z.infer<typeof Paper>;

export const SavedTemplate = z.object({
  id: Id,
  name: z.string(),
  description: z.string().optional(),
  baseTemplateId: z.string(),
  settings: LayoutSettings,
  createdAt: z.number()
});
export type SavedTemplateType = z.infer<typeof SavedTemplate>;
