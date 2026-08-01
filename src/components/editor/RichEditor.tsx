"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useRef, useState } from "react";
import { uploadImage } from "@/lib/uploads";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Strikethrough, Code, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Link2, Image as ImageIcon, Table as TableIcon,
  Rows3, Columns3, Trash2, Undo2, Redo2, SquareSplitVertical,
  Upload, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* The editor the old plain <textarea> should have been: bold, italic,
   headings, lists, real tables with row/column controls, links,
   images, and a [[page]] break button for the paginated reader. */

export default function RichEditor({
  name,
  initialHtml = "",
  placeholder = "Write the lesson…",
}: {
  name: string;
  initialHtml?: string;
  placeholder?: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          "nq-editor-body focus:outline-none min-h-[320px] px-4 py-3 text-[.95rem] leading-relaxed",
      },
    },
  });

  if (!editor) {
    return (
      <div className="rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.02)] p-4">
        <div className="h-64 animate-pulse rounded-md bg-[rgba(255,255,255,.04)]" />
      </div>
    );
  }

  const addLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("Image URL (https://…)");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  /* Upload straight from the toolbar; pasting a URL still works for
     images already hosted elsewhere. */
  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const data = new FormData();
    data.append("file", file);
    const res = await uploadImage(data);
    setUploading(false);
    if (res.error) {
      setUploadError(res.error);
      return;
    }
    if (res.url) editor.chain().focus().setImage({ src: res.url }).run();
  };

  const addPageBreak = () => {
    /* The reader splits lesson content on a paragraph containing
       exactly [[page]] — same convention as v1. */
    editor.chain().focus().insertContent("<p>[[page]]</p>").run();
  };

  const inTable = editor.isActive("table");

  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.02)] focus-within:border-[var(--color-signal)]">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-line)] bg-[var(--color-deep)] px-2 py-1.5">
        <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold"><Bold size={15} /></Btn>
        <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic"><Italic size={15} /></Btn>
        <Btn on={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label="Strikethrough"><Strikethrough size={15} /></Btn>
        <Btn on={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} label="Inline code"><Code size={15} /></Btn>

        <Sep />

        <Btn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="Heading"><Heading2 size={15} /></Btn>
        <Btn on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="Subheading"><Heading3 size={15} /></Btn>
        <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bullet list"><List size={15} /></Btn>
        <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Numbered list"><ListOrdered size={15} /></Btn>
        <Btn on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Quote"><Quote size={15} /></Btn>
        <Btn on={() => editor.chain().focus().setHorizontalRule().run()} label="Divider"><Minus size={15} /></Btn>

        <Sep />

        <Btn on={addLink} active={editor.isActive("link")} label="Link"><Link2 size={15} /></Btn>
        <Btn on={addImage} label="Image from URL"><ImageIcon size={15} /></Btn>
        <Btn
          on={() => fileInput.current?.click()}
          label={uploading ? "Uploading…" : "Upload an image"}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        </Btn>
        <Btn
          on={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          active={inTable}
          label="Insert table"
        >
          <TableIcon size={15} />
        </Btn>

        {inTable && (
          <>
            <Btn on={() => editor.chain().focus().addRowAfter().run()} label="Add row"><Rows3 size={15} /></Btn>
            <Btn on={() => editor.chain().focus().addColumnAfter().run()} label="Add column"><Columns3 size={15} /></Btn>
            <Btn on={() => editor.chain().focus().deleteTable().run()} label="Delete table"><Trash2 size={15} /></Btn>
          </>
        )}

        <Sep />

        <Btn on={addPageBreak} label="Page break — splits the lesson into reader pages">
          <SquareSplitVertical size={15} />
        </Btn>

        <div className="ml-auto flex items-center gap-0.5">
          <Btn on={() => editor.chain().focus().undo().run()} label="Undo"><Undo2 size={15} /></Btn>
          <Btn on={() => editor.chain().focus().redo().run()} label="Redo"><Redo2 size={15} /></Btn>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {uploadError && (
        <div className="border-b border-[var(--color-line)] bg-[rgba(255,77,109,.08)] px-4 py-2.5 text-sm text-[var(--color-alert)]">
          {uploadError}
        </div>
      )}

      <EditorContent editor={editor} />

      {/* the HTML travels with the form */}
      <HiddenSync name={name} editor={editor} />

      <div className="border-t border-[var(--color-line)] px-4 py-2 font-[family-name:var(--font-mono-src)] text-[.65rem] text-[var(--color-muted)]">
        tip: the page-break button splits this lesson into pages in the student reader
      </div>
    </div>
  );
}

/* Keeps a hidden input in sync so a plain <form action=…> submit
   carries the editor HTML without any extra JS. */
function HiddenSync({ name, editor }: { name: string; editor: ReturnType<typeof useEditor> }) {
  return (
    <input
      type="hidden"
      name={name}
      value={editor?.getHTML() ?? ""}
      readOnly
    />
  );
}

function Btn({
  on, active, label, children,
}: {
  on: () => void; active?: boolean; label: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={on}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-100",
        active
          ? "bg-[var(--color-signal-soft)] text-[var(--color-signal)]"
          : "text-[var(--color-muted)] hover:bg-[rgba(255,255,255,.05)] hover:text-[var(--color-text)]"
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-[var(--color-line)]" aria-hidden />;
}
