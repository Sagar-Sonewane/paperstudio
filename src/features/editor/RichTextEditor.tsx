import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Subscript as SubIcon,
  Superscript as SuperIcon,
  Image as ImageIcon,
  Sparkles
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button.tsx";
import { SymbolPalette } from "./SymbolPalette.tsx";
import { saveMediaBlob } from "../../services/storage/media.ts";

interface RichTextEditorProps {
  initialContent: string;
  onChange: (html: string, plain: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  initialContent,
  onChange,
  minHeight = "120px"
}: RichTextEditorProps) {
  const [showSymbols, setShowSymbols] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false
      }),
      Subscript,
      Superscript,
      Image.configure({
        inline: true,
        allowBase64: false
      })
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const plain = editor.getText();
      onChange(html, plain);
    }
  });

  // Sync content if initialContent changes externally
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [initialContent, editor]);

  const insertSymbol = (char: string) => {
    if (editor) {
      editor.chain().focus().insertContent(char).run();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      const mediaId = await saveMediaBlob(file.name, file.type, file);
      // Create local object URL for preview
      const objectUrl = URL.createObjectURL(file);
      editor.chain().focus().setImage({ src: objectUrl, alt: mediaId }).run();
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    }
  };

  if (!editor) return null;

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-400">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-slate-200 bg-slate-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive("bold") ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive("italic") ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-slate-300 mx-0.5" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive("superscript") ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          title="Superscript (e.g. x²)"
        >
          <SuperIcon className="h-3.5 w-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive("subscript") ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          title="Subscript (e.g. H₂O)"
        >
          <SubIcon className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-slate-300 mx-0.5" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive("bulletList") ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive("orderedList") ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-slate-300 mx-0.5" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-slate-600"
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <Button
          type="button"
          variant={showSymbols ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs text-slate-700 ml-auto flex items-center gap-1"
          onClick={() => setShowSymbols(!showSymbols)}
          title="Insert special symbols and characters"
        >
          <Sparkles className="h-3 w-3 text-amber-600" />
          <span>Symbols</span>
        </Button>
      </div>

      {/* Symbol Palette Popover */}
      {showSymbols && (
        <div className="p-2 border-b border-slate-200 bg-slate-50/50">
          <SymbolPalette onInsert={insertSymbol} />
        </div>
      )}

      {/* Editable Area */}
      <div className="p-3" style={{ minHeight }}>
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none focus:outline-none min-h-[80px]"
        />
      </div>
    </div>
  );
}
