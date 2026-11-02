import type { LayoutSettingsType } from "../model.ts";

/**
 * Deeply merges a base set of template default settings with specific layout overrides.
 * Guarantees all required fields from the domain schema are preserved with fallback defaults.
 */
export function mergeTemplateSettings(
  base: LayoutSettingsType,
  overrides?: Partial<LayoutSettingsType>
): LayoutSettingsType {
  if (!overrides) return JSON.parse(JSON.stringify(base));

  return {
    page: {
      ...base.page,
      ...(overrides.page || {}),
      marginMm: {
        ...base.page.marginMm,
        ...(overrides.page?.marginMm || {})
      }
    },
    columns: {
      ...base.columns,
      ...(overrides.columns || {})
    },
    typography: {
      ...base.typography,
      ...(overrides.typography || {})
    },
    questions: {
      ...base.questions,
      ...(overrides.questions || {})
    },
    header: {
      ...base.header,
      ...(overrides.header || {}),
      fields: overrides.header?.fields ? [...overrides.header.fields] : [...base.header.fields]
    },
    footer: {
      ...base.footer,
      ...(overrides.footer || {})
    },
    border: {
      ...base.border,
      ...(overrides.border || {})
    },
    bwMode: overrides.bwMode ?? base.bwMode
  };
}

