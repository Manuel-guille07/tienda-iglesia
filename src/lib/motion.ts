import type { Transition } from 'motion/react';

/**
 * Constantes de física Quiet Luxury para TPV rápido (150–220 ms).
 * Respuesta inmediata, sin rebotes artificiales ni retardos.
 */
export const QL_SPRING_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 540,
  damping: 38,
  mass: 0.8,
};

export const QL_SPRING_TACTILE: Transition = {
  type: 'spring',
  stiffness: 620,
  damping: 36,
  mass: 0.7,
};

export const QL_EASE_OUT: Transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};
