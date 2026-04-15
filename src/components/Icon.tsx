import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  fill?: boolean;
  'aria-hidden'?: boolean;
}

/**
 * Wraps Material Symbols Outlined icons.
 * Visibility is controlled globally by the `fonts-loaded` class on <body>
 * (set by the document.fonts.ready observer in App.jsx).
 * Use this component for all new icon usages to ensure consistent behaviour.
 */
export default function Icon({ name, className = '', fill = false, 'aria-hidden': ariaHidden = true }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined${fill ? ' fill' : ''}${className ? ' ' + className : ''}`}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  );
}
