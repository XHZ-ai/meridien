import React from 'react';
import { Session } from '@supabase/supabase-js';

interface HomeViewProps {
  session: Session;
}

export function HomeView({ session }: HomeViewProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl text-white">
        Welcome {session.user.email}!
      </h1>
    </div>
  );
}