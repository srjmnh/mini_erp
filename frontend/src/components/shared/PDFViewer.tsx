import React from 'react';
import { Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PDFViewerProps {
  fileUrl: string;
  height?: string | number;
  width?: string | number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ 
  fileUrl,
  height = '100%',
  width = '100%'
}) => {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  return (
    <div style={{ height, width }}>
      <Viewer
        fileUrl={fileUrl}
        plugins={[defaultLayoutPluginInstance]}
      />
    </div>
  );
};

export default PDFViewer;
