export const getToolLogo = ({
  filename,
  toolName,
  size = 'md',
  className = '',
}: LogoProps): JSX.Element => {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
  };

  const pixelSize = typeof size === 'string' ? sizeMap[size] : size;
  const cleanToolName = toolName.replace(/\.[^/.]+$/, '');
  const processedFilename = filename || `${cleanToolName.toLowerCase().replace(/\s+/g, '-')}.png`;

  // Cache buster : change cette valeur pour forcer un rechargement
  const version = '1';
  const logoPath = `/logos/${processedFilename}?v=${version}`;

  return (
    <img
      src={logoPath}
      alt={`${toolName} Logo`}
      height={pixelSize}
      width={pixelSize}
      className={`object-contain max-h-[${pixelSize}px] ${className}`}
      style={{ maxHeight: pixelSize }}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.onerror = null;

        // Fallback PNG
        const fallbackPng = `/logos/${cleanToolName.toLowerCase().replace(/\s+/g, '-')}.png?v=${version}`;
        target.src = fallbackPng;

        target.onerror = () => {
          target.onerror = null;
          target.src = `/logos/default.svg?v=${version}`;
        };
      }}
    />
  );
};