import React, { useState, useEffect } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallbackSrc = '/images/dashboard/fallback_banner.svg',
  alt,
  className,
  ...props
}) => {
  const [hasError, setHasError] = useState<boolean>(false);

  // Reset error state whenever the image src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <img
      src={hasError ? fallbackSrc : src}
      alt={alt || 'ConstructSafe Asset'}
      onError={() => {
        if (!hasError) {
          setHasError(true);
        }
      }}
      className={className}
      {...props}
    />
  );
};