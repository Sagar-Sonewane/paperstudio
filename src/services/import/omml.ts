/**
 * OMML (Office Math Markup Language) parser and converter.
 * Converts simple mathematical structures (fractions, powers, roots, sub/superscripts)
 * to readable rich text HTML; retains raw text representations for complex constructs.
 * Never invents missing values.
 */

export interface OmmlParseResult {
  html: string;
  plain: string;
  isSimple: boolean;
  warning?: string;
}

export function parseOmmlNode(ommlNode: any): OmmlParseResult {
  let isSimple = true;
  let hasComplexConstruct = false;

  function walk(node: any): { html: string; plain: string } {
    if (!node) return { html: "", plain: "" };

    if (typeof node === "string") {
      return { html: escapeHtml(node), plain: node };
    }

    if (Array.isArray(node)) {
      let combinedHtml = "";
      let combinedPlain = "";
      for (const item of node) {
        const res = walk(item);
        combinedHtml += res.html;
        combinedPlain += res.plain;
      }
      return { html: combinedHtml, plain: combinedPlain };
    }

    if (typeof node === "object") {
      let nodeHtml = "";
      let nodePlain = "";

      for (const [key, val] of Object.entries(node)) {
        if (key === ":@" || key === "#text") continue;

        // Text run
        if (key === "m:t") {
          const t = extractRawText(val);
          nodeHtml += escapeHtml(t);
          nodePlain += t;
        }

        // Fraction: m:f -> m:num / m:den
        else if (key === "m:f") {
          let num = { html: "", plain: "" };
          let den = { html: "", plain: "" };

          if (Array.isArray(val)) {
            for (const fChild of val) {
              if (fChild["m:num"]) num = walk(fChild["m:num"]);
              if (fChild["m:den"]) den = walk(fChild["m:den"]);
            }
          }

          if (num.html && den.html) {
            nodeHtml += `<span class="math-fraction"><sup>${num.html}</sup>/<sub>${den.html}</sub></span>`;
            nodePlain += `(${num.plain}/${den.plain})`;
          } else {
            hasComplexConstruct = true;
          }
        }

        // Superscript / Power: m:sSup -> m:e ^ m:sup
        else if (key === "m:sSup") {
          let base = { html: "", plain: "" };
          let sup = { html: "", plain: "" };

          if (Array.isArray(val)) {
            for (const sChild of val) {
              if (sChild["m:e"]) base = walk(sChild["m:e"]);
              if (sChild["m:sup"]) sup = walk(sChild["m:sup"]);
            }
          }

          if (base.html && sup.html) {
            nodeHtml += `${base.html}<sup>${sup.html}</sup>`;
            nodePlain += `${base.plain}^(${sup.plain})`;
          } else {
            hasComplexConstruct = true;
          }
        }

        // Subscript: m:sSub -> m:e _ m:sub
        else if (key === "m:sSub") {
          let base = { html: "", plain: "" };
          let sub = { html: "", plain: "" };

          if (Array.isArray(val)) {
            for (const sChild of val) {
              if (sChild["m:e"]) base = walk(sChild["m:e"]);
              if (sChild["m:sub"]) sub = walk(sChild["m:sub"]);
            }
          }

          if (base.html && sub.html) {
            nodeHtml += `${base.html}<sub>${sub.html}</sub>`;
            nodePlain += `${base.plain}_(${sub.plain})`;
          } else {
            hasComplexConstruct = true;
          }
        }

        // Sub-Superscript: m:sSubSup -> m:e _ m:sub ^ m:sup
        else if (key === "m:sSubSup") {
          let base = { html: "", plain: "" };
          let sub = { html: "", plain: "" };
          let sup = { html: "", plain: "" };

          if (Array.isArray(val)) {
            for (const sChild of val) {
              if (sChild["m:e"]) base = walk(sChild["m:e"]);
              if (sChild["m:sub"]) sub = walk(sChild["m:sub"]);
              if (sChild["m:sup"]) sup = walk(sChild["m:sup"]);
            }
          }

          if (base.html) {
            nodeHtml += `${base.html}<sub>${sub.html}</sub><sup>${sup.html}</sup>`;
            nodePlain += `${base.plain}_(${sub.plain})^(${sup.plain})`;
          } else {
            hasComplexConstruct = true;
          }
        }

        // Radical / Root: m:rad -> sqrt(m:e)
        else if (key === "m:rad") {
          let deg = { html: "", plain: "" };
          let base = { html: "", plain: "" };

          if (Array.isArray(val)) {
            for (const rChild of val) {
              if (rChild["m:deg"]) deg = walk(rChild["m:deg"]);
              if (rChild["m:e"]) base = walk(rChild["m:e"]);
            }
          }

          if (base.html) {
            if (deg.html) {
              nodeHtml += `<sup>${deg.html}</sup>&radic;(${base.html})`;
              nodePlain += `root[${deg.plain}](${base.plain})`;
            } else {
              nodeHtml += `&radic;(${base.html})`;
              nodePlain += `sqrt(${base.plain})`;
            }
          } else {
            hasComplexConstruct = true;
          }
        }

        // Delimiters (parentheses, brackets): m:d -> ( m:e )
        else if (key === "m:d") {
          let inner = { html: "", plain: "" };
          if (Array.isArray(val)) {
            for (const dChild of val) {
              if (dChild["m:e"]) inner = walk(dChild["m:e"]);
            }
          }
          nodeHtml += `(${inner.html})`;
          nodePlain += `(${inner.plain})`;
        }

        // Recursively traverse other math elements (e.g. m:oMath, m:r, etc.)
        else if (Array.isArray(val)) {
          const res = walk(val);
          nodeHtml += res.html;
          nodePlain += res.plain;
        }
      }

      return { html: nodeHtml, plain: nodePlain };
    }

    return { html: "", plain: "" };
  }

  const { html, plain } = walk(ommlNode);

  if (hasComplexConstruct) {
    isSimple = false;
  }

  return {
    html: html.trim(),
    plain: plain.trim(),
    isSimple,
    warning: hasComplexConstruct
      ? "Contains complex OMML equation retained as formatted text."
      : undefined
  };
}

function extractRawText(val: any): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    let t = "";
    for (const item of val) {
      if (typeof item === "string") t += item;
      else if (item && item["#text"]) t += item["#text"];
      else if (item) t += extractRawText(item);
    }
    return t;
  }
  if (val && typeof val === "object" && val["#text"]) {
    return val["#text"];
  }
  return "";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
