import React from 'react';

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

const PageContent: React.FC<PageContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`page-content ${className}`}>
      {children}
    </div>
  );
};

export default PageContent;
