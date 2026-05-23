import React from 'react';

interface StackProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly direction?: 'vertical' | 'horizontal';
  readonly as?: keyof JSX.IntrinsicElements;
  readonly align?: 'start' | 'center' | 'end' | 'stretch';
}

const GAP_MAP = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
} as const;

const ALIGN_MAP = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const;

/**
 * Flexible stacking primitive for consistent element spacing.
 * Supports both vertical and horizontal layouts with standard gap tokens.
 */
const Stack: React.FC<StackProps> = ({
  children,
  className = '',
  gap = 'md',
  direction = 'vertical',
  as: Component = 'div',
  align = 'stretch',
}) => {
  const directionClass = direction === 'vertical' ? 'flex flex-col' : 'flex flex-row';
  return (
    <Component
      className={`${directionClass} ${GAP_MAP[gap]} ${ALIGN_MAP[align]} ${className}`}
    >
      {children}
    </Component>
  );
};

export default Stack;
