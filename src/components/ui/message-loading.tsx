import React from 'react';
import { Heart } from 'lucide-react';

export function MessageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center p-8">
        <Heart className="h-16 w-16 text-pink-500 fill-pink-500 animate-pulse mb-4" />
        
        <div className="relative mb-8">
          <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-pink-500"></div>
          <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-b-4 border-pink-300 animate-spin"></div>
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Loading...</h2>
        <p className="text-gray-600">Please wait while we prepare your healthcare experience</p>
      </div>
    </div>
  );
} 