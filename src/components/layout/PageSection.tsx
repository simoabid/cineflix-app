import React from 'react';

interface PageSectionProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  readonly as?: keyof JSX.IntrinsicElements;
}

const SPACING_MAP = {
  none: '',
  sm: 'py-4 sm:py-6',
  md: 'py-6 sm:py-8 lg:py-12',
  lg: 'py-8 sm:py-12 lg:py-16',
  xl: 'py-12 sm:py-16 lg:py-24',
} as const;

/**
 * Vertical page section primitive that standardizes vertical spacing
 * between major content blocks. Ensures consistent rhythm across routes.
 */
const PageSection: React.FC<PageSectionProps> = ({
  children,
  className = '',
  spacing = 'md',
  as: Component = 'section',
}) => {
  return (
    <Component className={`${SPACING_MAP[spacing]} ${className}`}>
      {children}
    </Component>
  );
};

export default PageSection;
