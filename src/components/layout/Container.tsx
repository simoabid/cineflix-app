import React from 'react';

interface ContainerProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly as?: keyof JSX.IntrinsicElements;
  readonly size?: 'default' | 'wide' | 'narrow' | 'full';
}

const SIZE_MAP = {
  default: 'max-w-7xl',
  wide: 'max-w-[1400px]',
  narrow: 'max-w-5xl',
  full: 'max-w-full',
} as const;

/**
 * Unified container primitive that standardizes horizontal padding
 * and max-width constraints across all pages. Replaces the scattered
 * `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` patterns.
 */
const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  as: Component = 'div',
  size = 'default',
}) => {
  return (
    <Component
      className={`${SIZE_MAP[size]} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </Component>
  );
};

export default Container;
