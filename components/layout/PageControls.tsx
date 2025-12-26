import React from 'react';

interface PageControlsProps {
  children: React.ReactNode;
  className?: string;
}

const PageControls: React.FC<PageControlsProps> = ({ children, className = '' }) => {
  return (
    <div className={`page-controls ${className}`}>
      {children}
    </div>
  );
};

export default PageControls;
