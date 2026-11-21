import type { Transition } from 'motion/react';

/**
 * Constantes de física Quiet Luxury para TPV rápido a 60 FPS (160–220 ms).
 * Todas las animaciones operan exclusivamente sobre propiedades aceleradas por GPU
 * (transform y opacity) para mantener fluidez nativa en móvil.
 */
export const QL_SPRING_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 38,
  mass: 0.72,
};

export const QL_SPRING_TACTILE: Transition = {
  type: 'spring',
  stiffness: 640,
  damping: 38,
  mass: 0.65,
};

export const QL_EASE_OUT: Transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};
