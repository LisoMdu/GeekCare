import React, { ReactNode } from 'react';

/**
 * Skeleton loading states for different components
 * These provide content-aware placeholders during loading
 */

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function SkeletonText({ className = '', ...props }: SkeletonProps) {
  return (
    <div 
      className={`h-4 bg-gray-200 rounded animate-pulse ${className}`}
      {...props}
    />
  );
}

export function SkeletonCircle({ className = '', ...props }: SkeletonProps) {
  return (
    <div 
      className={`h-10 w-10 bg-gray-200 rounded-full animate-pulse ${className}`}
      {...props}
    />
  );
}

export function SkeletonButton({ className = '', ...props }: SkeletonProps) {
  return (
    <div 
      className={`h-10 bg-gray-200 rounded-lg animate-pulse ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = '', children, ...props }: SkeletonProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm overflow-hidden animate-pulse ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SkeletonAvatar() {
  return <SkeletonCircle className="h-10 w-10" />;
}

export function SkeletonAppointmentCard() {
  return (
    <SkeletonCard className="p-4 mb-4">
      <div className="flex items-start">
        <SkeletonCircle className="h-12 w-12 mr-4" />
        <div className="flex-1">
          <SkeletonText className="w-1/3 mb-2" />
          <SkeletonText className="w-2/3 mb-2" />
          <SkeletonText className="w-1/2 mb-4" />
          <div className="flex justify-between">
            <SkeletonText className="w-1/4" />
            <SkeletonButton className="w-24 h-8" />
          </div>
        </div>
      </div>
    </SkeletonCard>
  );
}

export function SkeletonAppointmentList() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <SkeletonAppointmentCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonMessageBubble({ incoming = false }) {
  return (
    <div className={`flex ${incoming ? 'justify-start' : 'justify-end'} mb-4`}>
      <div 
        className={`max-w-[70%] rounded-lg p-3 ${
          incoming ? 'bg-gray-200' : 'bg-pink-200'
        } animate-pulse`}
        style={{ minWidth: '120px', minHeight: '40px' }}
      >
        <SkeletonText className="w-full mb-1" />
        <SkeletonText className="w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonChatMessages() {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <SkeletonText className="w-1/3 h-6" />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          <SkeletonMessageBubble incoming={true} />
          <SkeletonMessageBubble incoming={false} />
          <SkeletonMessageBubble incoming={true} />
          <SkeletonMessageBubble incoming={false} />
          <SkeletonMessageBubble incoming={true} />
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <SkeletonText className="flex-1 h-10 rounded-l-lg" />
          <SkeletonButton className="w-12 h-10 rounded-r-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChatList() {
  return (
    <div className="space-y-2 p-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center p-3 rounded-lg bg-gray-200 animate-pulse">
          <SkeletonCircle className="mr-3" />
          <div className="flex-1">
            <SkeletonText className="w-1/2 mb-1" />
            <SkeletonText className="w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfileCard() {
  return (
    <SkeletonCard className="p-6">
      <div className="flex flex-col items-center">
        <SkeletonCircle className="h-24 w-24 mb-4" />
        <SkeletonText className="w-1/3 mb-2" />
        <SkeletonText className="w-1/2 mb-4" />
        
        <div className="w-full space-y-4 mt-4">
          <SkeletonText className="w-full h-6" />
          <SkeletonText className="w-full h-6" />
          <SkeletonText className="w-full h-6" />
          <SkeletonText className="w-full h-6" />
        </div>
        
        <SkeletonButton className="w-full mt-6" />
      </div>
    </SkeletonCard>
  );
}

export function SkeletonPhysicianProfile() {
  return (
    <div className="animate-pulse">
      <div className="flex items-start">
        <SkeletonCircle className="h-24 w-24 mr-6" />
        <div className="flex-1">
          <SkeletonText className="h-6 w-1/3 mb-2" />
          <SkeletonText className="h-4 w-1/2 mb-4" />
          <div className="flex space-x-2 mb-4">
            <SkeletonText className="h-4 w-16 rounded-full" />
            <SkeletonText className="h-4 w-20 rounded-full" />
            <SkeletonText className="h-4 w-24 rounded-full" />
          </div>
          <SkeletonText className="h-4 w-3/4 mb-2" />
          <SkeletonText className="h-4 w-full mb-2" />
          <SkeletonText className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonBookingForm() {
  return (
    <div className="animate-pulse">
      <SkeletonText className="h-6 w-1/4 mb-6" />
      
      <div className="mb-6">
        <SkeletonText className="h-4 w-1/6 mb-2" />
        <SkeletonText className="h-10 w-full rounded-lg" />
      </div>
      
      <div className="mb-6">
        <SkeletonText className="h-4 w-1/6 mb-2" />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonText className="h-10 rounded-lg" />
          <SkeletonText className="h-10 rounded-lg" />
          <SkeletonText className="h-10 rounded-lg" />
        </div>
      </div>
      
      <div className="mb-6">
        <SkeletonText className="h-4 w-1/6 mb-2" />
        <SkeletonText className="h-32 w-full rounded-lg" />
      </div>
      
      <div className="flex justify-end">
        <SkeletonButton className="h-10 w-32" />
      </div>
    </div>
  );
}

export function SkeletonCalendar() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <SkeletonText className="h-6 w-32" />
        <div className="flex space-x-2">
          <SkeletonButton className="h-8 w-8 rounded-full" />
          <SkeletonButton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array(7).fill(0).map((_, i) => (
          <SkeletonText key={i} className="h-4 w-8 mx-auto" />
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {Array(35).fill(0).map((_, i) => (
          <div key={i} className="aspect-square">
            <SkeletonButton className="h-full w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 w-32 bg-gray-200 rounded-full mx-auto"></div>
      <div className="h-6 bg-gray-200 rounded w-48 mx-auto"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-56 mx-auto"></div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded mb-4"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded mb-2"></div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border p-4">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mt-4"></div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 bg-gray-200 rounded w-1/4"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-5 bg-gray-200 rounded w-1/4"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-5 bg-gray-200 rounded w-1/4"></div>
      <div className="h-24 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded w-1/4"></div>
    </div>
  );
}

export function MessageSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}
        >
          <div 
            className={`max-w-[70%] rounded-lg p-3 ${
              i % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'
            }`}
          >
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-4/5 mt-1"></div>
            {i % 3 === 0 && (
              <div className="h-4 bg-gray-300 rounded w-2/3 mt-1"></div>
            )}
            <div className="flex justify-end mt-2">
              <div className="h-3 bg-gray-300 rounded w-12"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function VoiceMessageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-gray-200"></div>
        <div className="flex-1">
          <div className="h-1.5 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="p-4 border-b border-gray-200">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      </div>
      
      <div className="flex-1 p-4">
        <MessageSkeleton count={3} />
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="h-10 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  );
} 