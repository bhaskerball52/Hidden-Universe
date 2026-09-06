import { useRef } from 'react';
import './SpotlightCard.css';

// LOCAL EDIT (would be lost on re-install): forward the remaining props.
// Upstream drops `style`, which silently swallowed the per-simulation
// `--sim-accent` custom property and left every card with no accent colour.
const SpotlightCard = ({ children, className = '', spotlightColor = 'rgba(255, 255, 0.25)', ...rest }) => {
  const divRef = useRef(null);

  const handleMouseMove = e => {
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    divRef.current.style.setProperty('--mouse-x', `${x}px`);
    divRef.current.style.setProperty('--mouse-y', `${y}px`);
    divRef.current.style.setProperty('--spotlight-color', spotlightColor);
  };

  return (
    <div ref={divRef} onMouseMove={handleMouseMove} className={`card-spotlight ${className}`} {...rest}>
      {children}
    </div>
  );
};

export default SpotlightCard;
