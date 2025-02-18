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
  Send as SendIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';

interface RichTextEditorProps {
  onSubmit: (value: string) => void;
  onAttachmentClick?: () => void;
  value?: string;
  onChange?: (value: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  onSubmit, 
  onAttachmentClick,
  value,
  onChange 
}) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none w-full',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    }
  });

  const handleSubmit = useCallback(() => {
    if (!editor) return;
    const htmlContent = editor.getHTML();
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
        }
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
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Attach File">
            <IconButton 
              size="small"
              onClick={onAttachmentClick}
              sx={{ color: 'text.secondary' }}
            >
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Send">
            <IconButton 
              size="small" 
              color="primary"
              onClick={handleSubmit}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ 
        flex: 1,
        width: '100%',
      }}>
        <EditorContent 
          editor={editor} 
          onKeyDown={handleKeyDown}
        />
      </Box>
    </Paper>
  );
};

export default RichTextEditor;