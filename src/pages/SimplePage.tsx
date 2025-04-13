import React from 'react';
import { BaseLayout } from '../components/BaseLayout';

export function SimplePage() {
  return (
    <BaseLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Page Title</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p>
            This is an example page that uses the BaseLayout component.
            The BaseLayout handles:
          </p>
          <ul className="list-disc ml-6 mt-4">
            <li>Determining whether the user is a physician or member</li>
            <li>Loading the appropriate sidebar based on user role</li>
            <li>Displaying a consistent header across the application</li>
            <li>User authentication and redirection to login if needed</li>
          </ul>
          <p className="mt-4">
            By using this BaseLayout, all pages in the application will have a consistent
            structure with the sidebar always displayed.
          </p>
        </div>
      </div>
    </BaseLayout>
  );
} 