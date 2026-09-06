import GradualBlur from '../components/GradualBlur'

// The transition between two main sections.
//
// React Bits GradualBlur: a stack of divs with progressively stronger
// backdrop-filter, pinned to the parent's edge. Content passing the boundary
// softens into it instead of ending on a hard line, and because it is pure
// backdrop-filter with no animation state it reads identically scrolling up or
// down. That is what makes it reversible: there is no keyframe to replay.
//
// The star field behind the page is blurred by the same band, so the seam moves
// with the background rather than sitting on top of it.
//
// zIndex is deliberately low. GradualBlur defaults to 1000, which would blur
// the fixed nav (z 40) and the grain (z 45) as they passed underneath.

export default function SectionSeam({ position = 'bottom', height = '7rem', strength = 2 }) {
  return (
    <GradualBlur
      position={position}
      height={height}
      strength={strength}
      divCount={8}
      curve="bezier"
      exponential
      opacity={1}
      zIndex={3}
      target="parent"
      className="hu-seam"
    />
  )
}
