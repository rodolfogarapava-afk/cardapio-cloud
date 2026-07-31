import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function RatingStars({
  rating,
  maxRating = 5,
  size = 'sm',
  showValue = false,
  className,
}: RatingStarsProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: maxRating }, (_, i) => {
        const isFilled = i < fullStars;
        const isHalf = i === fullStars && hasHalfStar;

        return (
          <Star
            key={i}
            className={cn(
              sizeClasses[size],
              isFilled || isHalf
                ? 'text-warning fill-warning'
                : 'text-muted-foreground/30'
            )}
          />
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-foreground">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
