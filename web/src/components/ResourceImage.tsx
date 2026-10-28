import Image, { type ImageProps } from 'next/image';
import sources from '@/data/resourceImages.json';

// Static export has no image server. Serve small, prebuilt variants at each width.
export default function ResourceImage({ sizes = '(max-width: 768px) 100vw, 1120px', ...props }: ImageProps) {
  const srcSet = typeof props.src === 'string' ? (sources as Record<string, string>)[props.src] : undefined;
  return <picture>
    {srcSet ? <source type="image/webp" srcSet={srcSet} sizes={sizes} /> : null}
    {/* eslint-disable-next-line jsx-a11y/alt-text -- alt and dimensions come from ImageProps. */}
    <Image {...props} sizes={sizes} />
  </picture>;
}
