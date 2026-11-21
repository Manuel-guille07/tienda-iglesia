import React from 'react';
import { SurfaceCard, type SurfaceCardProps } from './SurfaceCard';

export type CardProps = SurfaceCardProps;

export const Card = React.forwardRef<HTMLDivElement, CardProps>((props, ref) => (
  <SurfaceCard ref={ref} {...props} />
));

Card.displayName = 'Card';
