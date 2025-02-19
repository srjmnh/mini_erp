import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Box, IconButton, Tooltip, Paper } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Code,
  Send as SendIcon
} from '@mui/icons-material';

interface RichTextEditorProps {
  onSubmit: (value: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  sx?: any;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  onSubmit, 
  value,
  onChange,
  placeholder,
  sx = {} 
}) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none w-full',
        placeholder: placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    }
  });

  const handleSubmit = useCallback(() => {
    if (!editor) return;
    const htmlContent = editor.getHTML();
    if (htmlContent === '<p></p>') return; // Don't submit empty messages
    onSubmit(htmlContent);
    editor.commands.clearContent();
  }, [editor, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  if (!editor) {
    return null;
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        width: '100%',
        '& .ProseMirror': {
          padding: '8px 12px',
          minHeight: '24px',
          maxHeight: '150px',
          overflowY: 'auto',
          width: '100%',
          '&:focus': {
            outline: 'none',
          },
          '& p': {
            margin: 0,
          }
        },
        ...sx
      }}
    >
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: '4px 8px',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        borderRadius: '8px 8px 0 0',
        gap: 0.5,
      }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Bold">
            <IconButton 
              size="small"
              onClick={() => editor.chain().focus().toggleBold().run()}
              color={editor.isActive('bold') ? 'primary' : 'default'}
            >
              <FormatBold fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Italic">
            <IconButton 
              size="small"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              color={editor.isActive('italic') ? 'primary' : 'default'}
            >
              <FormatItalic fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bullet List">
            <IconButton 
              size="small"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              color={editor.isActive('bulletList') ? 'primary' : 'default'}
            >
              <FormatListBulleted fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Numbered List">
            <IconButton 
              size="small"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              color={editor.isActive('orderedList') ? 'primary' : 'default'}
            >
              <FormatListNumbered fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Quote">
            <IconButton 
              size="small"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              color={editor.isActive('blockquote') ? 'primary' : 'default'}
            >
              <FormatQuote fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Code">
            <IconButton 
              size="small"
              onClick={() => editor.chain().focus().toggleCode().run()}
              color={editor.isActive('code') ? 'primary' : 'default'}
            >
              <Code fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Tooltip title="Send (Enter)">
          <IconButton 
            size="small"
            onClick={handleSubmit}
            color="primary"
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box 
        sx={{ flex: 1 }}
        onKeyDown={handleKeyDown}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
};

export default RichTextEditor;