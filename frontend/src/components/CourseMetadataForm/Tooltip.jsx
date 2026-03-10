import { useState } from 'react';
import { Info } from 'lucide-react';
import './Tooltip.css';

/**
 * A small inline tooltip icon that shows a hint on hover/focus.
 */
export function Tooltip({ text }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      role="tooltip"
      aria-label={text}
    >
      <Info size={15} className="tooltip-icon" aria-hidden="true" />
      {visible && (
        <span className="tooltip-bubble" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}


