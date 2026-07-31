import logoAsset from '@/assets/use-livre-logo.svg.asset.json';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * Marca oficial "Use Livre" (lockup horizontal: símbolo + wordmark).
 * Use `className` para controlar tamanho via `h-*` (largura segue proporção 3:2).
 */
export function Logo({ className, alt = 'Use Livre' }: LogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      className={cn('h-8 w-auto select-none', className)}
      draggable={false}
    />
  );
}
