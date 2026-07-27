'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'
import {
  FaBold, FaItalic, FaUnderline, FaStrikethrough,
  FaListUl, FaListOl, FaUndo, FaRedo, FaMinus
} from 'react-icons/fa'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded text-xs transition-colors cursor-pointer flex items-center justify-center ${
        active
          ? 'bg-brand-green text-white shadow-sm'
          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
}

export default function RichTextEditor({ value, onChange, disabled = false, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {},
        horizontalRule: {},
      }),
      Underline,
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200',
      },
    },
  })

  // Sync external value changes (e.g., when issue data loads for editing)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  // Sync disabled state
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  if (!editor) return null

  return (
    <div className={`border rounded-xl overflow-hidden bg-white dark:bg-zinc-900 transition-all ${
      disabled
        ? 'border-zinc-200 dark:border-zinc-800 opacity-70'
        : 'border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-brand-green focus-within:border-brand-green'
    }`}>
      {/* Toolbar */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50">
          {/* Text Style */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <FaBold size={11} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <FaItalic size={11} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
            <FaUnderline size={11} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <FaStrikethrough size={11} />
          </ToolbarButton>

          <Divider />

          {/* Headings */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <span className="font-black text-[11px] leading-none">H1</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <span className="font-black text-[11px] leading-none">H2</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <span className="font-black text-[11px] leading-none">H3</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph">
            <span className="font-semibold text-[11px] leading-none">¶</span>
          </ToolbarButton>

          <Divider />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <FaListUl size={11} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">
            <FaListOl size={11} />
          </ToolbarButton>

          <Divider />

          {/* HR */}
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <FaMinus size={11} />
          </ToolbarButton>

          <Divider />

          {/* Undo / Redo */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
            <FaUndo size={10} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
            <FaRedo size={10} />
          </ToolbarButton>
        </div>
      )}

      {/* Editor Area */}
      <div className="relative">
        {editor.isEmpty && placeholder && !disabled && (
          <div className="absolute top-2.5 left-3 text-sm text-zinc-400 dark:text-zinc-600 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Editor CSS for rendered HTML nodes */}
      <style>{`
        .tiptap h1 { font-size: 1.4rem; font-weight: 800; margin: 0.5rem 0 0.25rem; line-height: 1.3; color: inherit; }
        .tiptap h2 { font-size: 1.15rem; font-weight: 700; margin: 0.5rem 0 0.25rem; line-height: 1.4; color: inherit; }
        .tiptap h3 { font-size: 1rem; font-weight: 700; margin: 0.4rem 0 0.2rem; line-height: 1.4; color: inherit; }
        .tiptap p { margin: 0.2rem 0; }
        .tiptap ul { list-style-type: disc; padding-left: 1.4rem; margin: 0.3rem 0; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.4rem; margin: 0.3rem 0; }
        .tiptap li { margin: 0.1rem 0; }
        .tiptap hr { border: none; border-top: 1.5px solid #e4e4e7; margin: 0.6rem 0; }
        .tiptap strong { font-weight: 700; }
        .tiptap em { font-style: italic; }
        .tiptap u { text-decoration: underline; }
        .tiptap s { text-decoration: line-through; }
      `}</style>
    </div>
  )
}
