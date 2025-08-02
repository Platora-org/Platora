import  { useState, useEffect, useRef } from 'react';

import carousel1 from '/images/carousel-1.jpg';
import carousel2 from '/images/carousel-2.jpg';
import carousel3 from '/images/carousel-3.jpg';
import carousel4 from '/images/carousel-4.jpg';
import carousel5 from '/images/carousel-5.jpg';

const images = [carousel1, carousel2, carousel3, carousel4, carousel5];

export default function ImageCarousel() {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef(null);

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    resetTimeout();
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => resetTimeout();
  }, [current]);

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full h-full aspect-w-16 aspect-h-9 overflow-hidden">
      <div
        className="whitespace-nowrap transition-transform duration-500 h-full"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`carousel-${idx}`}
            className="inline-block w-full h-full object-cover"
          />
        ))}
      </div>

      {/* Controls */}
      <button
        onClick={prevSlide}
        className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-300 hover:cursor-pointer text-black dark:bg-gray-950 transition-colors duration-300 bg-opacity-50 dark:text-white p-2 rounded-full focus:outline-none"
      >
        ‹
      </button>
      <button
        onClick={nextSlide}
        className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-300 hover:cursor-pointer text-black dark:bg-gray-950 transition-colors duration-300 bg-opacity-50 dark:text-white p-2 rounded-full focus:outline-none"
      >
        ›
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-3 h-3 rounded-full focus:outline-none ${
              idx === current ? 'bg-white' : 'bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
