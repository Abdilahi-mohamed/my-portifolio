"use client";

import { Mark, mergeAttributes } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

const FontSize = Mark.create({
  name: "fontSize",
  addOptions() {
    return { HTMLAttributes: {} };
  },
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) =>
          attributes.size ? { style: `font-size: ${attributes.size}` } : {},
      },
    };
  },
  parseHTML() {
    return [{ style: "font-size" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

export function stripRichTextHtml(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.textContent || "";
}

export function sanitizeRichTextHtml(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\s(?:on\w+|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, style, iframe, object, embed").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
      if (attribute.name === "href" && !/^https?:|^mailto:|^#|^\//i.test(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    }
  });
  return template.innerHTML;
}

export function countRichTextWords(html: string): number {
  const text = stripRichTextHtml(html).trim();
  return text ? text.split(/\s+/).length : 0;
}

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  wordLimit?: number;
  characterLimit?: number;
  label?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  wordLimit,
  characterLimit,
  label,
}: RichTextEditorProps) {
  const previousHtml = useRef(value);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "cms-rich-editor-content",
        "aria-label": label || "Rich text editor",
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      const html = activeEditor.getHTML();
      const wordCount = countRichTextWords(html);
      if (wordLimit && wordCount > wordLimit) {
        activeEditor.commands.setContent(previousHtml.current, false);
        return;
      }
      if (characterLimit && html.replace(/<[^>]*>/g, "").length > characterLimit) {
        activeEditor.commands.setContent(previousHtml.current, false);
        return;
      }
      previousHtml.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value, false);
  }, [editor, value]);

  if (!editor) return null;

  const applyFontSize = (size: string) => {
    editor.chain().focus().setMark("fontSize", { size }).run();
  };

  return (
    <div className="cms-rich-editor">
      <div className="cms-rich-toolbar" role="toolbar" aria-label={label || "Text formatting"}>
        <button type="button" title="Undo" onClick={() => editor.chain().focus().undo().run()}><span aria-hidden="true">↶</span></button>
        <button type="button" title="Redo" onClick={() => editor.chain().focus().redo().run()}><span aria-hidden="true">↷</span></button>
        <button type="button" title="Bold" className={editor.isActive("bold") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
        <button type="button" title="Italic" className={editor.isActive("italic") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
        <button type="button" title="Underline" className={editor.isActive("underline") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></button>
        <label title="Text color" className="cms-toolbar-color">
          <span>A</span>
          <input type="color" defaultValue="#56665c" onInput={(event) => editor.chain().focus().setColor(event.currentTarget.value).run()} />
        </label>
        <label title="Highlight color" className="cms-toolbar-color cms-toolbar-highlight">
          <span>H</span>
          <input type="color" defaultValue="#fff06a" onInput={(event) => editor.chain().focus().toggleHighlight({ color: event.currentTarget.value }).run()} />
        </label>
        <select aria-label="Font size" defaultValue="" onChange={(event) => { if (event.target.value) applyFontSize(event.target.value); }}>
          <option value="">Size</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
        </select>
        <button type="button" title="Align left" onClick={() => editor.chain().focus().setTextAlign("left").run()}>L</button>
        <button type="button" title="Align center" onClick={() => editor.chain().focus().setTextAlign("center").run()}>C</button>
        <button type="button" title="Align right" onClick={() => editor.chain().focus().setTextAlign("right").run()}>R</button>
        <button type="button" title="Justify" onClick={() => editor.chain().focus().setTextAlign("justify").run()}>J</button>
        <button type="button" title="Bulleted list" className={editor.isActive("bulletList") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</button>
        <button type="button" title="Numbered list" className={editor.isActive("orderedList") ? "is-active" : ""} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
