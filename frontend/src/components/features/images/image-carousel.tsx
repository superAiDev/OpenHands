import React from "react";
import { ChevronLeft } from "#/assets/chevron-left";
import { ChevronRight } from "#/assets/chevron-right";
import { ImagePreview } from "./image-preview";
import { cn } from "#/utils/utils";

interface ImageCarouselProps {
  size: "small" | "large";
  images: string[];
  onRemove?: (index: number) => void;
}

export function ImageCarousel({
  size = "small",
  images,
  onRemove,
}: ImageCarouselProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);
  const [isAtStart, setIsAtStart] = React.useState(true);
  const [isAtEnd, setIsAtEnd] = React.useState(false);

  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (scrollContainer) {
      const hasScroll =
        scrollContainer.scrollWidth > scrollContainer.clientWidth;
      setIsScrollable(hasScroll);
    }
  }, [images]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const scrollContainer = event.currentTarget;
    setIsAtStart(scrollContainer.scrollLeft === 0);
    setIsAtEnd(
      scrollContainer.scrollLeft + scrollContainer.clientWidth ===
        scrollContainer.scrollWidth,
    );
  };

  return (
    <div data-testid="image-carousel" className="relative">
      {isScrollable && (
        <div className="absolute right-full transform top-1/2 -translate-y-1/2 pr-1"> {/* Added pr-1 for spacing */}
          <ChevronLeft active={!isAtStart} className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 hover:text-neutral-200" />
        </div>
      )}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "flex overflow-x-auto",
          size === "small" && "gap-2",
          size === "large" && "gap-4",
        )}
      >
        {images.map((src, index) => (
          <ImagePreview
            key={index}
            size={size}
            src={src}
            onRemove={onRemove && (() => onRemove(index))}
          />
        ))}
      </div>
      {isScrollable && (
        <div className="absolute left-full transform top-1/2 -translate-y-1/2 pl-1"> {/* Added pl-1 for spacing */}
          <ChevronRight active={!isAtEnd} className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 hover:text-neutral-200" />
        </div>
      )}
    </div>
  );
}
