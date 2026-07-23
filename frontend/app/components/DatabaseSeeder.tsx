"use client";

import { useEffect } from 'react';

export function DatabaseSeeder() {
  useEffect(() => {
    import('@/lib/mock-data').then((m) => {
      if (m.seedDatabase) {
        m.seedDatabase().catch(console.error);
      }
    }).catch(console.error);
  }, []);

  return null;
}
