import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Box } from '@mui/material';

export interface RichTextEditorRef {
  getHTML: () => string;
  setHTML: (html: string) => void;
  clearContent: () => void;
  focus: () => void;
}

interface RichTextEditorProps {
  initialContent?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>((props, ref) => {
  const { initialContent = '', placeholder = 'Type a message...', onUpdate } = props;

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'rich-text-editor',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate?.(html);
    },
  });

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() || '',
    setHTML: (html: string) => editor?.commands.setContent(html),
    clearContent: () => editor?.commands.clearContent(),
    focus: () => editor?.commands.focus(),
  }));

  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  return (
    <Box
      sx={{
        '& .rich-text-editor': {
          minHeight: '40px',
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '8px 12px',
          '&:focus': {
            outline: 'none',
          },
        },
        '& .ProseMirror': {
          '> * + *': {
            marginTop: '0.75em',
          },
          'p.is-editor-empty:first-child::before': {
            content: `"${placeholder}"`,
            color: 'text.disabled',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
          },
          'pre': {
            background: '#0D0D0D',
            color: '#FFF',
            fontFamily: 'monospace',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            '& code': {
              color: 'inherit',
              padding: 0,
              background: 'none',
              fontSize: '0.8rem',
            },
          },
          'blockquote': {
            paddingLeft: '1rem',
            borderLeft: '2px solid rgba(13, 13, 13, 0.1)',
          },
          'ul, ol': {
            padding: '0 1rem',
          },
        }
      }}
    >
      <EditorContent editor={editor} />
    </Box>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;