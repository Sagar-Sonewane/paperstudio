import type { LayoutSettingsType } from "../model.ts";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: "coaching" | "assessment" | "competitive" | "school";
  defaults: LayoutSettingsType;
}

