interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = 'w-32 h-auto' }: BrandLogoProps) {
  return <img src="/remy-transparent.png" alt="Remy" className={`${className} object-contain object-left`} />;
}
