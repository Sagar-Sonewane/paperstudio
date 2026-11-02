import type { CSSProperties } from "react";
import type { LayoutSettingsType } from "../../domain/model.ts";

export function getPageBorderStyle(border: LayoutSettingsType["border"]): CSSProperties {
  if (border.style === "double") {
    return {
      border: `${border.thicknessPt || 3}px double #000000`,
      padding: `${border.insetMm || 5}mm`
    };
  }

  if (border.style === "single") {
    return {
      border: `${border.thicknessPt || 1}px solid #000000`,
      padding: `${border.insetMm || 4}mm`
    };
  }

  return {
    border: "none",
    padding: "0"
  };
}

